// lib/portability/profile-matcher.ts
// Core matching logic: compares existing employee data against new onboarding checklist items

import { PORTABILITY_CONFIG, type PortabilityType } from './categories';

// ── Types ──────────────────────────────────────────────────────────────────

export interface EmployeeProfileData {
  id: string;
  full_name: string | null;
  email: string | null;
  date_of_birth: string | null;
  address: string | null;
  phone: string | null;
  ni_number_encrypted: string | null;
  bank_sort_code_encrypted: string | null;
  bank_account_number_encrypted: string | null;
  bank_account_holder_name: string | null;
  emergency_contacts: any[] | null; // JSONB
  right_to_work_status: string | null;
  right_to_work_expiry: string | null;
}

export interface ExistingDocument {
  id: string;
  document_type: string;
  data_category: string;
  file_path: string;
  verification_status: string;
  expiry_date: string | null;
  created_at: string;
  document_name?: string;
}

export interface ChecklistItem {
  id: string;
  item_name: string;
  item_type: string; // 'document_upload' | 'form_entry' | 'acknowledgement'
  data_category: string;
  form_field_key: string | null;
  status: string;
}

export interface MatchResult {
  checklistItemId: string;
  checklistItemName: string;
  itemType: string;
  dataCategory: string;
  portabilityType: PortabilityType;
  /** Whether existing data was found for this item */
  hasExistingData: boolean;
  /** Whether this item can be carried forward (portable + data exists) */
  canPrePopulate: boolean;
  /** Whether the item is auto-selected for carry-forward */
  defaultSelected: boolean;
  /** Human-readable summary of what existing data was found */
  existingDataSummary: string | null;
  /** For time-sensitive items: the expiry date */
  expiryDate: string | null;
  /** Whether the existing data has expired */
  isExpired: boolean;
  /** Warning message (e.g. "Document expired on...") */
  warning: string | null;
  /** The document_upload ID to link, if applicable */
  existingDocumentId: string | null;
  /** The form_field_key for form items */
  formFieldKey: string | null;
}

export interface ProfileMatchResult {
  /** True if the employee has ANY existing portable data */
  hasPortableData: boolean;
  /** Count of items that can be pre-populated */
  prePopulatableCount: number;
  /** Total checklist items */
  totalItems: number;
  /** Detailed match result per checklist item */
  items: MatchResult[];
  /** Grouped by portability type for the review UI */
  grouped: Record<PortabilityType, MatchResult[]>;
}

// ── Matching Logic ─────────────────────────────────────────────────────────

/**
 * Matches an employee's existing profile data and documents against
 * a new onboarding's checklist items. Returns a structured result
 * that drives the review/confirmation UI.
 */
export function matchProfileToChecklist(
  profile: EmployeeProfileData,
  existingDocuments: ExistingDocument[],
  checklistItems: ChecklistItem[]
): ProfileMatchResult {
  const items: MatchResult[] = checklistItems.map((item) => {
    const config = PORTABILITY_CONFIG[item.data_category];
    const portabilityType: PortabilityType = config?.type ?? 'employer_specific';
    const isPortable = config?.isPortable ?? false;

    // Determine if existing data exists and build the match result
    let hasExistingData = false;
    let existingDataSummary: string | null = null;
    let expiryDate: string | null = null;
    let isExpired = false;
    let warning: string | null = null;
    let existingDocumentId: string | null = null;

    if (item.item_type === 'form_entry' && item.form_field_key) {
      // Match form items by form_field_key
      const formMatch = matchFormField(profile, item.form_field_key);
      hasExistingData = formMatch.hasData;
      existingDataSummary = formMatch.summary;
    } else if (item.item_type === 'document_upload' && isPortable) {
      // Match document items by data_category (only for portable categories)
      const docMatch = matchDocument(existingDocuments, item.data_category);
      hasExistingData = docMatch.hasData;
      existingDataSummary = docMatch.summary;
      existingDocumentId = docMatch.documentId;
      expiryDate = docMatch.expiryDate;
      isExpired = docMatch.isExpired;
      if (isExpired) {
        warning = `This document expired on ${formatDate(expiryDate!)}. You will need to upload a new one.`;
      }
    }
    // acknowledgement items: never portable, hasExistingData stays false

    const canPrePopulate = isPortable && hasExistingData && !isExpired;

    return {
      checklistItemId: item.id,
      checklistItemName: item.item_name,
      itemType: item.item_type,
      dataCategory: item.data_category,
      portabilityType,
      hasExistingData,
      canPrePopulate,
      defaultSelected: canPrePopulate && (config?.defaultSelected ?? false),
      existingDataSummary,
      expiryDate,
      isExpired,
      warning,
      existingDocumentId,
      formFieldKey: item.form_field_key,
    };
  });

  // Group by portability type
  const grouped: Record<PortabilityType, MatchResult[]> = {
    universal: [],
    likely_stable: [],
    time_sensitive: [],
    employer_specific: [],
  };
  for (const item of items) {
    grouped[item.portabilityType].push(item);
  }

  const prePopulatableCount = items.filter((i) => i.canPrePopulate).length;

  return {
    hasPortableData: prePopulatableCount > 0,
    prePopulatableCount,
    totalItems: items.length,
    items,
    grouped,
  };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function matchFormField(
  profile: EmployeeProfileData,
  formFieldKey: string
): { hasData: boolean; summary: string | null } {
  switch (formFieldKey) {
    case 'ni_number':
      if (profile.ni_number_encrypted) {
        return {
          hasData: true,
          summary: 'NI number on file',
        };
      }
      return { hasData: false, summary: null };

    case 'bank_details':
      if (profile.bank_sort_code_encrypted && profile.bank_account_number_encrypted) {
        const holderName = profile.bank_account_holder_name || 'Account holder';
        return {
          hasData: true,
          summary: `Bank details on file for ${holderName}`,
        };
      }
      return { hasData: false, summary: null };

    case 'emergency_contacts':
      if (
        profile.emergency_contacts &&
        Array.isArray(profile.emergency_contacts) &&
        profile.emergency_contacts.length > 0
      ) {
        const count = profile.emergency_contacts.length;
        const firstName = profile.emergency_contacts[0]?.name || 'Contact';
        return {
          hasData: true,
          summary: `${count} emergency contact${count > 1 ? 's' : ''} on file (${firstName}${count > 1 ? ' + others' : ''})`,
        };
      }
      return { hasData: false, summary: null };

    default:
      return { hasData: false, summary: null };
  }
}

function matchDocument(
  existingDocuments: ExistingDocument[],
  dataCategory: string
): {
  hasData: boolean;
  summary: string | null;
  documentId: string | null;
  expiryDate: string | null;
  isExpired: boolean;
} {
  // Find the most recent document matching this data_category
  const matching = existingDocuments
    .filter((doc) => doc.data_category === dataCategory)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  if (matching.length === 0) {
    return { hasData: false, summary: null, documentId: null, expiryDate: null, isExpired: false };
  }

  const doc = matching[0]; // most recent
  const expiryDate = doc.expiry_date || null;
  const isExpired = expiryDate ? new Date(expiryDate) < new Date() : false;
  const docName = doc.document_name || doc.document_type || 'Document';

  return {
    hasData: true,
    summary: isExpired
      ? `${docName} on file (EXPIRED ${formatDate(expiryDate!)})`
      : expiryDate
        ? `${docName} on file (valid until ${formatDate(expiryDate)})`
        : `${docName} on file`,
    documentId: doc.id,
    expiryDate,
    isExpired,
  };
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}