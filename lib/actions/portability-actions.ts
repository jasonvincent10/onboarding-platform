// lib/actions/portability-actions.ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { decryptField } from '@/lib/encryption';
import {
  matchProfileToChecklist,
  type ProfileMatchResult,
  type EmployeeProfileData,
  type ExistingDocument,
  type ChecklistItem,
} from '@/lib/portability/profile-matcher';
import { isCategoryPortable } from '@/lib/portability/categories';

// ── Types ──────────────────────────────────────────────────────────────────

export interface PortableReviewData {
  onboardingId: string;
  employerName: string;
  roleTitle: string;
  startDate: string;
  matchResult: ProfileMatchResult;
  /** Masked versions of sensitive data for display */
  maskedData: {
    niNumber: string | null;
    bankSortCode: string | null;
    bankAccountNumber: string | null;
    bankHolderName: string | null;
    emergencyContacts: { name: string; relationship: string }[];
  };
}

export interface ConfirmationSelection {
  /** checklist_item IDs the employee chose to carry forward */
  selectedItemIds: string[];
  /** data_categories the employee is granting consent for */
  consentCategories: string[];
}

// ── Get Portable Review Data ───────────────────────────────────────────────

/**
 * Fetches everything needed for the portable profile review page:
 * - Employee's existing profile (with masked sensitive fields)
 * - Their existing documents
 * - The new onboarding's checklist items
 * - The matching result
 * 
 * Returns null if the employee has no portable data (shouldn't reach this page).
 */
export async function getPortableReviewData(
  onboardingId: string
): Promise<{ data: PortableReviewData | null; error: string | null }> {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { data: null, error: 'Not authenticated' };
    }

    // Get the onboarding instance with employer info
    const { data: onboarding, error: onbError } = await supabase
      .from('onboarding_instances')
      .select(`
        id,
        employer_id,
        employee_id,
        role_title,
        start_date,
        status,
        employer_accounts!inner ( company_name )
      `)
      .eq('id', onboardingId)
      .eq('employee_id', user.id)
      .single();

    if (onbError || !onboarding) {
      return { data: null, error: 'Onboarding not found or access denied' };
    }

    // Get employee profile
    const { data: profile, error: profileError } = await supabase
      .from('employee_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return { data: null, error: 'Employee profile not found' };
    }

    // Get existing documents for this employee
    const { data: documents, error: docError } = await supabase
      .from('document_uploads')
      .select('*')
      .eq('employee_id', user.id)
      .order('created_at', { ascending: false });

    if (docError) {
      return { data: null, error: 'Failed to load documents' };
    }

    // Get checklist items for this onboarding
    const { data: checklistItems, error: clError } = await supabase
      .from('checklist_items')
      .select('id, item_name, item_type, data_category, form_field_key, status')
      .eq('onboarding_id', onboardingId)
      .order('sort_order', { ascending: true });

    if (clError) {
      return { data: null, error: 'Failed to load checklist items' };
    }

    // Run the matcher
    const matchResult = matchProfileToChecklist(
      profile as EmployeeProfileData,
      (documents || []) as ExistingDocument[],
      (checklistItems || []) as ChecklistItem[]
    );

    // If no portable data, return null (caller will redirect to checklist)
    if (!matchResult.hasPortableData) {
      return { data: null, error: null };
    }

    // Build masked data for display
    const maskedData = buildMaskedData(profile);

    // Extract employer name safely
    const employerAccounts = onboarding.employer_accounts as any;
    const employerName = employerAccounts?.company_name || 'Unknown Company';

    return {
      data: {
        onboardingId,
        employerName,
        roleTitle: onboarding.role_title || '',
        startDate: onboarding.start_date || '',
        matchResult,
        maskedData,
      },
      error: null,
    };
  } catch (err) {
    console.error('getPortableReviewData error:', err);
    return { data: null, error: 'An unexpected error occurred' };
  }
}

// ── Confirm Portable Items ─────────────────────────────────────────────────

/**
 * Applies the employee's confirmation choices:
 * 1. Creates consent records for each data category being shared
 * 2. Updates selected checklist items to status='submitted', was_pre_populated=true
 * 3. Links document_upload IDs where applicable
 * 4. Writes audit log entries
 */
export async function confirmPortableItems(
  onboardingId: string,
  selection: ConfirmationSelection
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Verify this onboarding belongs to the user
    const { data: onboarding, error: onbError } = await supabase
      .from('onboarding_instances')
      .select('id, employer_id, employee_id')
      .eq('id', onboardingId)
      .eq('employee_id', user.id)
      .single();

    if (onbError || !onboarding) {
      return { success: false, error: 'Onboarding not found or access denied' };
    }

    // Re-run the matcher to get document IDs and validate selections
    const { data: profile } = await supabase
      .from('employee_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    const { data: documents } = await supabase
      .from('document_uploads')
      .select('*')
      .eq('employee_id', user.id)
      .order('created_at', { ascending: false });

    const { data: checklistItems } = await supabase
      .from('checklist_items')
      .select('id, item_name, item_type, data_category, form_field_key, status')
      .eq('onboarding_id', onboardingId);

    if (!profile || !checklistItems) {
      return { success: false, error: 'Failed to load data for confirmation' };
    }

    const matchResult = matchProfileToChecklist(
      profile as EmployeeProfileData,
      (documents || []) as ExistingDocument[],
      checklistItems as ChecklistItem[]
    );

    // 1. Create consent records for each selected data category
    const uniqueCategories = [...new Set(selection.consentCategories)];
    for (const category of uniqueCategories) {
      if (!isCategoryPortable(category)) continue;

      const { error: consentError } = await supabase
        .from('consent_records')
        .insert({
          employee_id: user.id,
          employer_id: onboarding.employer_id,
          data_category: category,
          action: 'granted',
          onboarding_id: onboardingId,
        });

      if (consentError) {
        console.error('Consent insert error:', consentError);
        // Continue — don't fail the whole operation for one consent record
      }
    }

    // 2. Update selected checklist items
    for (const itemId of selection.selectedItemIds) {
      const matchItem = matchResult.items.find((m) => m.checklistItemId === itemId);
      if (!matchItem || !matchItem.canPrePopulate) continue;

      const updateData: Record<string, any> = {
        status: 'submitted',
        was_pre_populated: true,
      };

      // If this is a document item, link the existing document
      if (matchItem.existingDocumentId) {
        updateData.document_upload_id = matchItem.existingDocumentId;
      }

      // Use adminClient to bypass RLS for checklist_items UPDATE
      const { error: updateError } = await adminClient
        .from('checklist_items')
        .update(updateData)
        .eq('id', itemId);

      if (updateError) {
        console.error('Checklist item update error:', updateError);
      }
    }

    // 3. Write audit log
    const { error: auditError } = await supabase
      .from('audit_log')
      .insert({
        actor_id: user.id,
        actor_type: 'employee',
        action: 'profile_data_carried_forward',
        resource_type: 'onboarding_instance',
        resource_id: onboardingId,
        employer_id: onboarding.employer_id,
        employee_id: user.id,
        metadata: {
          items_pre_populated: selection.selectedItemIds.length,
          consent_categories: uniqueCategories,
        },
      });

    if (auditError) {
      console.error('Audit log error:', auditError);
    }

    return { success: true, error: null };
  } catch (err) {
    console.error('confirmPortableItems error:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// ── Check if Employee Has Portable Data ────────────────────────────────────

/**
 * Quick check used by acceptInvitation() to decide whether to redirect
 * to the review page or straight to the checklist.
 * 
 * Returns true if the employee has any pre-existing data that could
 * be carried forward (encrypted fields, documents, etc.)
 */
export async function hasPortableData(userId: string): Promise<boolean> {
  try {
    const supabase = await createClient();

    // Check profile for any filled portable fields
    const { data: profile } = await supabase
      .from('employee_profiles')
      .select(
        'ni_number_encrypted, bank_sort_code_encrypted, bank_account_number_encrypted, emergency_contacts'
      )
      .eq('user_id', userId)
      .single();

    if (!profile) return false;

    const hasFormData =
      !!profile.ni_number_encrypted ||
      !!profile.bank_sort_code_encrypted ||
      !!profile.bank_account_number_encrypted ||
      (Array.isArray(profile.emergency_contacts) && profile.emergency_contacts.length > 0);

    if (hasFormData) return true;

    // Check for existing right-to-work documents (the only portable document category)
    const { data: docs, error } = await supabase
      .from('document_uploads')
      .select('id')
      .eq('employee_id', userId)
      .eq('data_category', 'right_to_work')
      .limit(1);

    if (docs && docs.length > 0) return true;

    return false;
  } catch {
    return false;
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Builds masked versions of sensitive data for safe display on the review page.
 * NI: "AB ** ** ** C"
 * Sort code: "**-**-34"
 * Account number: "****5678"
 */
function buildMaskedData(profile: any): PortableReviewData['maskedData'] {
  let niNumber: string | null = null;
  let bankSortCode: string | null = null;
  let bankAccountNumber: string | null = null;
  const bankHolderName: string | null = profile.bank_account_holder_name || null;
  const emergencyContacts: { name: string; relationship: string }[] = [];

  // Mask NI number
  if (profile.ni_number_encrypted) {
    try {
      const decrypted = decryptField(profile.ni_number_encrypted);
      // NI format: AB123456C → show first 2 and last 1
      if (decrypted.length >= 9) {
        niNumber = `${decrypted.slice(0, 2)} ** ** ** ${decrypted.slice(-1)}`;
      } else {
        niNumber = '** *** on file';
      }
    } catch {
      niNumber = 'NI number on file (encrypted)';
    }
  }

  // Mask bank sort code
  if (profile.bank_sort_code_encrypted) {
    try {
      const decrypted = decryptField(profile.bank_sort_code_encrypted);
      // Sort code: 123456 or 12-34-56 → show last 2 digits
      const digits = decrypted.replace(/\D/g, '');
      if (digits.length >= 6) {
        bankSortCode = `**-**-${digits.slice(-2)}`;
      } else {
        bankSortCode = 'Sort code on file';
      }
    } catch {
      bankSortCode = 'Sort code on file (encrypted)';
    }
  }

  // Mask bank account number
  if (profile.bank_account_number_encrypted) {
    try {
      const decrypted = decryptField(profile.bank_account_number_encrypted);
      // Account: 12345678 → show last 4
      if (decrypted.length >= 4) {
        bankAccountNumber = `****${decrypted.slice(-4)}`;
      } else {
        bankAccountNumber = 'Account on file';
      }
    } catch {
      bankAccountNumber = 'Account on file (encrypted)';
    }
  }

  // Extract emergency contact names (not encrypted)
  if (Array.isArray(profile.emergency_contacts)) {
    for (const contact of profile.emergency_contacts) {
      emergencyContacts.push({
        name: contact.name || 'Unknown',
        relationship: contact.relationship || '',
      });
    }
  }

  return {
    niNumber,
    bankSortCode,
    bankAccountNumber,
    bankHolderName,
    emergencyContacts,
  };
}