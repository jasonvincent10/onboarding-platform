// ============================================================================
// UK Address Validation
// ============================================================================
// Line 1, city and postcode are required; line 2 is optional. Postcode
// format follows the standard UK pattern (not a full deliverability check —
// that would require a paid lookup API, out of scope here).
// ============================================================================

export interface AddressInput {
  line1: string;
  line2: string;
  city: string;
  postcode: string;
}

export interface AddressValidationResult {
  valid: boolean;
  errors: Partial<Record<keyof AddressInput, string>>;
}

const UK_POSTCODE_PATTERN =
  /^[A-Z]{1,2}[0-9][A-Z0-9]?\s?[0-9][A-Z]{2}$/i;

export function normalisePostcode(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, ' ');
}

export function validateAddress(input: AddressInput): AddressValidationResult {
  const errors: Partial<Record<keyof AddressInput, string>> = {};

  if (!input.line1 || input.line1.trim().length < 2) {
    errors.line1 = 'Address line 1 is required';
  }

  if (!input.city || input.city.trim().length < 2) {
    errors.city = 'Town or city is required';
  }

  const postcode = normalisePostcode(input.postcode || '');
  if (!postcode) {
    errors.postcode = 'Postcode is required';
  } else if (!UK_POSTCODE_PATTERN.test(postcode)) {
    errors.postcode = 'Enter a valid UK postcode';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}
