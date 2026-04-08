// ============================================================================
// UK National Insurance Number Validation
// ============================================================================
// Format: XX 99 99 99 X
//   - 2 prefix letters + 6 digits + 1 suffix letter
//   - Specific prefix combinations are invalid (HMRC rules)
//   - Suffix must be A, B, C, or D
//
// This validates FORMAT only — it does not verify the number exists with HMRC.
// ============================================================================

/** Invalid prefix combinations per HMRC rules */
const INVALID_PREFIXES = ['BG', 'GB', 'NK', 'KN', 'TN', 'NT', 'ZZ'];

/** Letters not allowed as the first character */
const INVALID_FIRST_LETTERS = ['D', 'F', 'I', 'Q', 'U', 'V'];

/** Letters not allowed as the second character */
const INVALID_SECOND_LETTERS = ['D', 'F', 'I', 'O', 'Q', 'U', 'V'];

/** Valid suffix letters */
const VALID_SUFFIXES = ['A', 'B', 'C', 'D'];

export interface NIValidationResult {
  valid: boolean;
  formatted: string | null;   // Formatted as "AB 12 34 56 C" if valid
  error: string | null;
}

/**
 * Validate and format a UK National Insurance number.
 *
 * Accepts input with or without spaces (e.g., "AB123456C" or "AB 12 34 56 C").
 * Returns the formatted version with spaces if valid.
 */
export function validateNINumber(input: string): NIValidationResult {
  if (!input || input.trim() === '') {
    return { valid: false, formatted: null, error: 'National Insurance number is required' };
  }

  // Strip spaces and convert to uppercase
  const cleaned = input.replace(/\s/g, '').toUpperCase();

  // Must be exactly 9 characters after stripping spaces
  if (cleaned.length !== 9) {
    return {
      valid: false,
      formatted: null,
      error: 'Must be 9 characters (2 letters, 6 digits, 1 letter)',
    };
  }

  // Check overall pattern: 2 letters + 6 digits + 1 letter
  const pattern = /^[A-Z]{2}\d{6}[A-Z]$/;
  if (!pattern.test(cleaned)) {
    return {
      valid: false,
      formatted: null,
      error: 'Must be 2 letters, followed by 6 digits, followed by 1 letter',
    };
  }

  const firstLetter = cleaned[0];
  const secondLetter = cleaned[1];
  const prefix = cleaned.substring(0, 2);
  const suffix = cleaned[8];

  // Check first letter restrictions
  if (INVALID_FIRST_LETTERS.includes(firstLetter)) {
    return {
      valid: false,
      formatted: null,
      error: `First letter cannot be ${firstLetter}`,
    };
  }

  // Check second letter restrictions
  if (INVALID_SECOND_LETTERS.includes(secondLetter)) {
    return {
      valid: false,
      formatted: null,
      error: `Second letter cannot be ${secondLetter}`,
    };
  }

  // Check invalid prefix combinations
  if (INVALID_PREFIXES.includes(prefix)) {
    return {
      valid: false,
      formatted: null,
      error: `Prefix "${prefix}" is not a valid NI number prefix`,
    };
  }

  // Check suffix
  if (!VALID_SUFFIXES.includes(suffix)) {
    return {
      valid: false,
      formatted: null,
      error: `Last letter must be A, B, C, or D (got "${suffix}")`,
    };
  }

  // Format as "AB 12 34 56 C"
  const formatted = `${cleaned.slice(0, 2)} ${cleaned.slice(2, 4)} ${cleaned.slice(4, 6)} ${cleaned.slice(6, 8)} ${cleaned.slice(8)}`;

  return { valid: true, formatted, error: null };
}

/**
 * Strip formatting from an NI number for storage.
 * Returns uppercase, no spaces: "AB123456C"
 */
export function normaliseNINumber(input: string): string {
  return input.replace(/\s/g, '').toUpperCase();
}
