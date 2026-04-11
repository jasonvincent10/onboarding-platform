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

export interface PortableReviewData {
  onboardingId: string;
  employerName: string;
  roleTitle: string;
  startDate: string;
  matchResult: ProfileMatchResult;
  maskedData: {
    niNumber: string | null;
    bankSortCode: string | null;
    bankAccountNumber: string | null;
    bankHolderName: string | null;
    emergencyContacts: { name: string; relationship: string }[];
  };
}

export interface ConfirmationSelection {
  selectedItemIds: string[];
  consentCategories: string[];
}

async function getProfileIdForUser(userId: string): Promise<string | null> {
  const adminClient = createAdminClient();
  const { data: profile } = await adminClient
    .from('employee_profiles')
    .select('id')
    .eq('user_id', userId)
    .single();
  return profile?.id || null;
}

export async function getPortableReviewData(
  onboardingId: string
): Promise<{ data: PortableReviewData | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { data: null, error: 'Not authenticated' };
    }

    const profileId = await getProfileIdForUser(user.id);
    if (!profileId) {
      return { data: null, error: 'Employee profile not found' };
    }

    // Fetch onboarding instance with admin client (RLS bypass)
    const { data: onboarding, error: onbError } = await adminClient
      .from('onboarding_instances')
      .select('id, employer_id, employee_id, role_title, start_date, status')
      .eq('id', onboardingId)
      .eq('employee_id', profileId)
      .single();

    if (onbError || !onboarding) {
      return { data: null, error: 'Onboarding not found or access denied' };
    }

    // Fetch employer name separately to avoid join issues
    const { data: employer } = await adminClient
      .from('employer_accounts')
      .select('company_name')
      .eq('id', onboarding.employer_id)
      .single();

    // Fetch employee profile
    const { data: profile, error: profileError } = await adminClient
      .from('employee_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return { data: null, error: 'Employee profile not found' };
    }

    // Fetch existing documents
    const { data: documents } = await adminClient
      .from('document_uploads')
      .select('*')
      .eq('employee_id', profileId)
      .order('updated_at', { ascending: false });

    // Fetch checklist items
    const { data: checklistItems } = await adminClient
      .from('checklist_items')
      .select('id, item_name, item_type, data_category, form_field_key, status')
      .eq('onboarding_id', onboardingId);

    if (!checklistItems) {
      return { data: null, error: 'Failed to load checklist items' };
    }

    const matchResult = matchProfileToChecklist(
      profile as EmployeeProfileData,
      (documents || []) as ExistingDocument[],
      checklistItems as ChecklistItem[]
    );

    if (!matchResult.hasPortableData) {
      return { data: null, error: null };
    }

    const maskedData = buildMaskedData(profile);

    return {
      data: {
        onboardingId,
        employerName: employer?.company_name || 'Unknown Company',
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

export async function confirmPortableItems(
  onboardingId: string,
  selection: ConfirmationSelection
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    const profileId = await getProfileIdForUser(user.id);
    if (!profileId) {
      return { success: false, error: 'Employee profile not found' };
    }

    const { data: onboarding, error: onbError } = await adminClient
      .from('onboarding_instances')
      .select('id, employer_id, employee_id')
      .eq('id', onboardingId)
      .eq('employee_id', profileId)
      .single();

    if (onbError || !onboarding) {
      return { success: false, error: 'Onboarding not found or access denied' };
    }

    const { data: profile } = await adminClient
      .from('employee_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    const { data: documents } = await adminClient
      .from('document_uploads')
      .select('*')
      .eq('employee_id', profileId)
      .order('updated_at', { ascending: false });

    const { data: checklistItems } = await adminClient
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

    const uniqueCategories = [...new Set(selection.consentCategories)];
    for (const category of uniqueCategories) {
      if (!isCategoryPortable(category)) continue;

      await adminClient.from('consent_records').insert({
        employee_id: profileId,
        employer_id: onboarding.employer_id,
        data_category: category,
        action: 'granted',
        onboarding_id: onboardingId,
      });
    }

    for (const itemId of selection.selectedItemIds) {
      const matchItem = matchResult.items.find((m) => m.checklistItemId === itemId);
      if (!matchItem || !matchItem.canPrePopulate) continue;

      const updateData: Record<string, any> = {
        status: 'submitted',
        was_pre_populated: true,
      };

      if (matchItem.existingDocumentId) {
        updateData.document_upload_id = matchItem.existingDocumentId;
      }

      await adminClient.from('checklist_items').update(updateData).eq('id', itemId);
    }

    await adminClient.from('audit_log').insert({
      actor_id: user.id,
      actor_type: 'employee',
      action: 'profile_data_carried_forward',
      resource_type: 'onboarding_instance',
      resource_id: onboardingId,
      employer_id: onboarding.employer_id,
      employee_id: profileId,
      metadata: {
        items_pre_populated: selection.selectedItemIds.length,
        consent_categories: uniqueCategories,
      },
    });

    return { success: true, error: null };
  } catch (err) {
    console.error('confirmPortableItems error:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function hasPortableData(userId: string): Promise<boolean> {
  try {
    const adminClient = createAdminClient();

    const { data: profile } = await adminClient
      .from('employee_profiles')
      .select('id, ni_number_encrypted, bank_sort_code_encrypted, bank_account_number_encrypted, emergency_contacts')
      .eq('user_id', userId)
      .single();

    if (!profile) return false;

    const hasFormData =
      !!profile.ni_number_encrypted ||
      !!profile.bank_sort_code_encrypted ||
      !!profile.bank_account_number_encrypted ||
      (Array.isArray(profile.emergency_contacts) && profile.emergency_contacts.length > 0);

    if (hasFormData) return true;

    const { data: docs } = await adminClient
      .from('document_uploads')
      .select('id')
      .eq('employee_id', profile.id)
      .eq('data_category', 'right_to_work')
      .limit(1);

    return !!(docs && docs.length > 0);
  } catch {
    return false;
  }
}

function buildMaskedData(profile: any): PortableReviewData['maskedData'] {
  let niNumber: string | null = null;
  let bankSortCode: string | null = null;
  let bankAccountNumber: string | null = null;
  const bankHolderName: string | null = profile.bank_account_holder_name || null;
  const emergencyContacts: { name: string; relationship: string }[] = [];

  if (profile.ni_number_encrypted) {
    try {
      const decrypted = decryptField(profile.ni_number_encrypted);
      niNumber = decrypted.length >= 9
        ? `${decrypted.slice(0, 2)} ** ** ** ${decrypted.slice(-1)}`
        : '** *** on file';
    } catch {
      niNumber = 'NI number on file';
    }
  }

  if (profile.bank_sort_code_encrypted) {
    try {
      const decrypted = decryptField(profile.bank_sort_code_encrypted);
      const digits = decrypted.replace(/\D/g, '');
      bankSortCode = digits.length >= 6 ? `**-**-${digits.slice(-2)}` : 'Sort code on file';
    } catch {
      bankSortCode = 'Sort code on file';
    }
  }

  if (profile.bank_account_number_encrypted) {
    try {
      const decrypted = decryptField(profile.bank_account_number_encrypted);
      bankAccountNumber = decrypted.length >= 4 ? `****${decrypted.slice(-4)}` : 'Account on file';
    } catch {
      bankAccountNumber = 'Account on file';
    }
  }

  if (Array.isArray(profile.emergency_contacts)) {
    for (const contact of profile.emergency_contacts) {
      emergencyContacts.push({
        name: contact.name || 'Unknown',
        relationship: contact.relationship || '',
      });
    }
  }

  return { niNumber, bankSortCode, bankAccountNumber, bankHolderName, emergencyContacts };
}