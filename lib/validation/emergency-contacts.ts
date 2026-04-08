// ============================================================================
// Emergency Contacts Validation
// ============================================================================
// Stored as JSONB in employee_profiles.emergency_contacts
// Not encrypted — emergency contacts are not in the same sensitivity tier
// as NI numbers or bank details.
//
// Structure: Array of 1-3 contacts, each with name, relationship, phone.
// ============================================================================

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
}

export interface ContactValidationResult {
  valid: boolean;
  errors: { [field: string]: string };
}

export interface EmergencyContactsValidationResult {
  valid: boolean;
  contacts: ContactValidationResult[];
  error: string | null;
}

/** Common relationship types for the dropdown */
export const RELATIONSHIP_OPTIONS = [
  'Spouse',
  'Partner',
  'Parent',
  'Child',
  'Sibling',
  'Friend',
  'Other',
] as const;

/**
 * Validate a UK phone number (basic format check).
 * Accepts: 07xxx, +447xxx, 01xxx, 02xxx, 03xxx formats.
 * Not a full telecoms validation — just enough to catch typos.
 */
function validateUKPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-()]/g, '');

  // UK mobile: 07 + 9 digits, or +447 + 9 digits
  // UK landline: 01/02/03 + 9-10 digits
  // International: +44 followed by digits
  const ukPattern = /^(\+44|0)[1-9]\d{8,10}$/;
  return ukPattern.test(cleaned);
}

/**
 * Validate a single emergency contact entry.
 */
export function validateContact(contact: Partial<EmergencyContact>): ContactValidationResult {
  const errors: { [field: string]: string } = {};

  // Name
  if (!contact.name || contact.name.trim().length < 2) {
    errors.name = 'Full name is required (at least 2 characters)';
  } else if (contact.name.trim().length > 100) {
    errors.name = 'Name must be under 100 characters';
  }

  // Relationship
  if (!contact.relationship || contact.relationship.trim() === '') {
    errors.relationship = 'Relationship is required';
  }

  // Phone
  if (!contact.phone || contact.phone.trim() === '') {
    errors.phone = 'Phone number is required';
  } else if (!validateUKPhone(contact.phone)) {
    errors.phone = 'Please enter a valid UK phone number';
  }

  // Email (optional but validate format if provided)
  if (contact.email && contact.email.trim() !== '') {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(contact.email)) {
      errors.email = 'Please enter a valid email address';
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validate the full emergency contacts array.
 * Requires at least 1 contact, maximum 3.
 */
export function validateEmergencyContacts(
  contacts: Partial<EmergencyContact>[]
): EmergencyContactsValidationResult {
  if (!contacts || contacts.length === 0) {
    return {
      valid: false,
      contacts: [],
      error: 'At least one emergency contact is required',
    };
  }

  if (contacts.length > 3) {
    return {
      valid: false,
      contacts: [],
      error: 'Maximum of 3 emergency contacts allowed',
    };
  }

  const results = contacts.map(validateContact);
  const allValid = results.every((r) => r.valid);

  return {
    valid: allValid,
    contacts: results,
    error: allValid ? null : 'Please fix the errors below',
  };
}

/**
 * Normalise a phone number for storage.
 * Strips spaces and formatting but keeps the number intact.
 */
export function normalisePhone(phone: string): string {
  return phone.replace(/[\s\-()]/g, '');
}

/**
 * Prepare contacts for storage in JSONB column.
 * Trims whitespace, normalises phone numbers.
 */
export function normaliseContacts(contacts: EmergencyContact[]): EmergencyContact[] {
  return contacts.map((c) => ({
    name: c.name.trim(),
    relationship: c.relationship.trim(),
    phone: normalisePhone(c.phone),
    ...(c.email && c.email.trim() ? { email: c.email.trim() } : {}),
  }));
}
