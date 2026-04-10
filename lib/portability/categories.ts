// lib/portability/categories.ts
// Defines how each data_category behaves in the portable profile system

export type PortabilityType = 'universal' | 'likely_stable' | 'time_sensitive' | 'employer_specific';

export interface PortabilityCategoryConfig {
  type: PortabilityType;
  label: string;
  description: string;
  /** Whether to auto-select this category for carry-forward on the review page */
  defaultSelected: boolean;
  /** Whether this category can ever be carried forward */
  isPortable: boolean;
}

/**
 * Maps each data_category enum value to its portability behaviour.
 * 
 * Universal: Data that almost never changes between employers (NI number).
 * Likely stable: Data that usually stays the same but the employee should confirm.
 * Time-sensitive: Documents that expire — carry forward only if still valid.
 * Employer-specific: Policies and acknowledgements unique to each employer — never portable.
 */
export const PORTABILITY_CONFIG: Record<string, PortabilityCategoryConfig> = {
  ni_number: {
    type: 'universal',
    label: 'National Insurance Number',
    description: 'Your NI number never changes between employers.',
    defaultSelected: true,
    isPortable: true,
  },
  personal_info: {
    type: 'likely_stable',
    label: 'Personal Information',
    description: 'Your name, address, and contact details. Please confirm these are still correct.',
    defaultSelected: true,
    isPortable: true,
  },
  bank_details: {
    type: 'likely_stable',
    label: 'Bank Details',
    description: 'Your bank account details for salary payments. These may have changed since your last role.',
    defaultSelected: true,
    isPortable: true,
  },
  emergency_contacts: {
    type: 'likely_stable',
    label: 'Emergency Contacts',
    description: 'Your emergency contact details. Please check these are still up to date.',
    defaultSelected: true,
    isPortable: true,
  },
  right_to_work: {
    type: 'time_sensitive',
    label: 'Right to Work',
    description: 'Your right to work documents. These will be checked for expiry.',
    defaultSelected: true,
    isPortable: true,
  },
  documents: {
    type: 'employer_specific',
    label: 'Other Documents',
    description: 'Documents like P45s are specific to each employment and need to be provided fresh.',
    defaultSelected: false,
    isPortable: false,
  },
  policy_acknowledgements: {
    type: 'employer_specific',
    label: 'Policy Acknowledgements',
    description: 'Each employer has their own policies. You will need to review and acknowledge these.',
    defaultSelected: false,
    isPortable: false,
  },
};

/**
 * Returns true if a data_category can ever be carried forward between employers.
 */
export function isCategoryPortable(dataCategory: string): boolean {
  return PORTABILITY_CONFIG[dataCategory]?.isPortable ?? false;
}

/**
 * Returns the portability type for a data_category.
 */
export function getCategoryType(dataCategory: string): PortabilityType {
  return PORTABILITY_CONFIG[dataCategory]?.type ?? 'employer_specific';
}