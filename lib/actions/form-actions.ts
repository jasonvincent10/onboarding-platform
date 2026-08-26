'use server';

import { createClient } from '@/lib/supabase/server';
import { encryptField, safeDecryptField } from '@/lib/encryption';
import { validateNINumber, normaliseNINumber } from '@/lib/validation/ni-number';
import { validateBankDetails } from '@/lib/validation/bank-details';
import {
  validateEmergencyContacts,
  normaliseContacts,
  type EmergencyContact,
} from '@/lib/validation/emergency-contacts';
import { validateAddress, normalisePostcode, type AddressInput } from '@/lib/validation/address';

// ============================================================================
// Form Submission Server Actions
// ============================================================================
// These actions are called from client form components. They:
//   1. Validate the input (server-side — never trust the client)
//   2. Encrypt sensitive fields using AES-256-GCM
//   3. Update the employee_profiles row
//   4. Update the checklist_items status to 'submitted'
//   5. Write an audit log entry
// ============================================================================

interface FormActionResult {
  success: boolean;
  error?: string;
}

// ---- NI Number ----

export async function submitNINumber(
  onboardingId: string,
  checklistItemId: string,
  niNumber: string
): Promise<FormActionResult> {
  try {
    const supabase = await createClient();

    // 1. Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // 2. Validate
    const validation = validateNINumber(niNumber);
    if (!validation.valid) {
      return { success: false, error: validation.error ?? 'Invalid NI number' };
    }

    // 3. Encrypt
    const normalised = normaliseNINumber(niNumber);
    const encrypted = encryptField(normalised);

    // 4. Update employee_profiles
    const { error: profileError } = await supabase
      .from('employee_profiles')
      .update({ ni_number_encrypted: encrypted })
      .eq('user_id', user.id);

    if (profileError) {
      console.error('Failed to update NI number:', profileError);
      return { success: false, error: 'Failed to save NI number' };
    }

    // 5. Update checklist item status to 'submitted'
    const { error: checklistError } = await supabase
      .from('checklist_items')
      .update({ status: 'submitted' })
      .eq('id', checklistItemId);

    if (checklistError) {
      console.error('Failed to update checklist item:', checklistError);
      // Non-fatal — the data is saved even if status update fails
    }

    // 6. Audit log
    await supabase.from('audit_log').insert({
      actor_id: user.id,
      actor_type: 'employee',
      action: 'form_submitted',
      resource_type: 'checklist_item',
      resource_id: checklistItemId,
      employee_id: user.id,
      metadata: { field: 'ni_number', onboarding_id: onboardingId },
    });

    return { success: true };
  } catch (error) {
    console.error('submitNINumber error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// ---- Bank Details ----

export async function submitBankDetails(
  onboardingId: string,
  checklistItemId: string,
  sortCode: string,
  accountNumber: string,
  accountHolderName: string
): Promise<FormActionResult> {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // 1. Validate
    const validation = validateBankDetails(sortCode, accountNumber);
    if (!validation.valid) {
      const errors: string[] = [];
      if (validation.sortCode.error) errors.push(validation.sortCode.error);
      if (validation.accountNumber.error) errors.push(validation.accountNumber.error);
      return { success: false, error: errors.join('. ') };
    }

    if (!accountHolderName || accountHolderName.trim().length < 2) {
      return { success: false, error: 'Account holder name is required' };
    }

    // 2. Encrypt sort code and account number separately
    const encryptedSortCode = encryptField(validation.sortCode.normalised!);
    const encryptedAccountNumber = encryptField(validation.accountNumber.normalised!);

    // 3. Update employee_profiles
    // Account holder name is NOT encrypted — it's needed for payroll display
    // and is not as sensitive as the account numbers themselves
    const { error: profileError } = await supabase
      .from('employee_profiles')
      .update({
        bank_sort_code_encrypted: encryptedSortCode,
        bank_account_number_encrypted: encryptedAccountNumber,
        bank_account_holder_name: accountHolderName.trim(),
      })
      .eq('user_id', user.id);

    if (profileError) {
      console.error('Failed to update bank details:', profileError);
      return { success: false, error: 'Failed to save bank details' };
    }

    // 4. Update checklist item status
    const { error: checklistError } = await supabase
      .from('checklist_items')
      .update({ status: 'submitted' })
      .eq('id', checklistItemId);

    if (checklistError) {
      console.error('Failed to update checklist item:', checklistError);
    }

    // 5. Audit log
    await supabase.from('audit_log').insert({
      actor_id: user.id,
      actor_type: 'employee',
      action: 'form_submitted',
      resource_type: 'checklist_item',
      resource_id: checklistItemId,
      employee_id: user.id,
      metadata: { field: 'bank_details', onboarding_id: onboardingId },
    });

    return { success: true };
  } catch (error) {
    console.error('submitBankDetails error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// ---- Emergency Contacts ----

export async function submitEmergencyContacts(
  onboardingId: string,
  checklistItemId: string,
  contacts: EmergencyContact[]
): Promise<FormActionResult> {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // 1. Validate
    const validation = validateEmergencyContacts(contacts);
    if (!validation.valid) {
      return { success: false, error: validation.error ?? 'Invalid emergency contacts' };
    }

    // 2. Normalise (not encrypted — stored as JSONB)
    const normalised = normaliseContacts(contacts);

    // 3. Update employee_profiles
    const { error: profileError } = await supabase
      .from('employee_profiles')
      .update({ emergency_contacts: normalised })
      .eq('user_id', user.id);

    if (profileError) {
      console.error('Failed to update emergency contacts:', profileError);
      return { success: false, error: 'Failed to save emergency contacts' };
    }

    // 4. Update checklist item status
    const { error: checklistError } = await supabase
      .from('checklist_items')
      .update({ status: 'submitted' })
      .eq('id', checklistItemId);

    if (checklistError) {
      console.error('Failed to update checklist item:', checklistError);
    }

    // 5. Audit log
    await supabase.from('audit_log').insert({
      actor_id: user.id,
      actor_type: 'employee',
      action: 'form_submitted',
      resource_type: 'checklist_item',
      resource_id: checklistItemId,
      employee_id: user.id,
      metadata: {
        field: 'emergency_contacts',
        contact_count: normalised.length,
        onboarding_id: onboardingId,
      },
    });

    return { success: true };
  } catch (error) {
    console.error('submitEmergencyContacts error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// ---- Proof of address (address form + supporting document, combined) ----
//
// Unlike the other form_entry items, this one also carries a document
// upload (utility bill, bank statement, etc.) submitted in the same step.
// The file itself is uploaded to Storage client-side first (see
// lib/storage/upload.ts) -- this action just records the address fields and
// the already-uploaded file's metadata together.

export interface AddressProofInput {
  address: AddressInput;
  filePath: string;
  documentType: string;
}

export async function submitAddressProof(
  onboardingId: string,
  checklistItemId: string,
  input: AddressProofInput
): Promise<FormActionResult> {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    const validation = validateAddress(input.address);
    if (!validation.valid) {
      const firstError = Object.values(validation.errors)[0];
      return { success: false, error: firstError ?? 'Invalid address' };
    }

    const { data: profile, error: profileLookupError } = await supabase
      .from('employee_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (profileLookupError || !profile) {
      return { success: false, error: 'Employee profile not found' };
    }

    const { data: onboarding, error: onboardingError } = await supabase
      .from('onboarding_instances')
      .select('id, employer_id')
      .eq('id', onboardingId)
      .eq('employee_id', profile.id)
      .single();

    if (onboardingError || !onboarding) {
      return { success: false, error: 'Onboarding not found' };
    }

    // 1. Update address fields on the profile
    const { error: profileError } = await supabase
      .from('employee_profiles')
      .update({
        address_line_1: input.address.line1.trim(),
        address_line_2: input.address.line2.trim() || null,
        city: input.address.city.trim(),
        postcode: normalisePostcode(input.address.postcode),
      })
      .eq('user_id', user.id);

    if (profileError) {
      console.error('Failed to update address:', profileError);
      return { success: false, error: 'Failed to save address' };
    }

    // 2. Record the uploaded proof document
    const { data: docUpload, error: uploadError } = await supabase
      .from('document_uploads')
      .insert({
        employee_id: profile.id,
        document_type: input.documentType,
        document_name: input.documentType,
        file_path: input.filePath,
        data_category: 'personal_info',
        verification_status: 'pending',
      })
      .select('id')
      .single();

    if (uploadError || !docUpload) {
      return { success: false, error: uploadError?.message ?? 'Failed to record document' };
    }

    // 3. Link the document and mark the checklist item submitted
    const { error: checklistError } = await supabase
      .from('checklist_items')
      .update({ status: 'submitted', document_upload_id: docUpload.id })
      .eq('id', checklistItemId)
      .eq('onboarding_id', onboardingId);

    if (checklistError) {
      console.error('Failed to update checklist item:', checklistError);
    }

    // 4. Audit log
    await supabase.from('audit_log').insert({
      actor_id: user.id,
      actor_type: 'employee',
      action: 'form_submitted',
      resource_type: 'checklist_item',
      resource_id: checklistItemId,
      employer_id: onboarding.employer_id,
      employee_id: profile.id,
      metadata: { field: 'address', onboarding_id: onboardingId, document_upload_id: docUpload.id },
    });

    return { success: true };
  } catch (error) {
    console.error('submitAddressProof error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// ---- Read existing profile data (for pre-filling forms) ----

export interface ExistingProfileData {
  niNumber: string | null;
  sortCode: string | null;
  accountNumber: string | null;
  accountHolderName: string | null;
  emergencyContacts: EmergencyContact[] | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  postcode: string | null;
}

/**
 * Load existing profile data for form pre-population.
 * Decrypts sensitive fields server-side before sending to client.
 *
 * IMPORTANT: This only returns the employee's own data (RLS enforced).
 * The decrypted values are sent over HTTPS to the authenticated client
 * for display in the form. This is safe because:
 *   - The employee owns this data
 *   - They're viewing their own profile
 *   - The connection is encrypted (HTTPS)
 */
export async function getExistingProfileData(): Promise<ExistingProfileData | null> {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return null;

    const { data: profile, error } = await supabase
      .from('employee_profiles')
      .select(
        'ni_number_encrypted, bank_sort_code_encrypted, bank_account_number_encrypted, bank_account_holder_name, emergency_contacts, address_line_1, address_line_2, city, postcode'
      )
      .eq('user_id', user.id)
      .single();

    if (error || !profile) return null;

    return {
      niNumber: safeDecryptField(profile.ni_number_encrypted),
      sortCode: safeDecryptField(profile.bank_sort_code_encrypted),
      accountNumber: safeDecryptField(profile.bank_account_number_encrypted),
      accountHolderName: profile.bank_account_holder_name ?? null,
      emergencyContacts: profile.emergency_contacts as EmergencyContact[] | null,
      addressLine1: profile.address_line_1 ?? null,
      addressLine2: profile.address_line_2 ?? null,
      city: profile.city ?? null,
      postcode: profile.postcode ?? null,
    };
  } catch (error) {
    console.error('getExistingProfileData error:', error);
    return null;
  }
}
