// ============================================================================
// UK Bank Details Validation
// ============================================================================
// Sort code: 6 digits, displayed as XX-XX-XX
// Account number: 7-8 digits, left-padded to 8 digits
//
// NOTE ON MODULUS CHECKING:
// The full UK bank account modulus check (Vocalink/Pay.UK) requires:
//   1. The published weight table from Pay.UK (updated periodically)
//   2. Three check algorithms: standard mod-10, mod-11, double-alternate
//   3. Exception rules for specific sort code ranges
//
// For MVP, we validate format and structure. Full modulus checking can be
// added in Task 4.4 (security hardening) using either:
//   - The Pay.UK weight table + custom implementation
//   - A third-party API (Modulr, TrueLayer, or similar)
//   - The npm package 'uk-modulus-checking' (uses bundled weight tables)
//
// This is a deliberate scope decision, not an oversight.
// ============================================================================

export interface SortCodeValidationResult {
  valid: boolean;
  formatted: string | null;   // Formatted as "XX-XX-XX" if valid
  normalised: string | null;  // Just digits: "XXXXXX" if valid
  error: string | null;
}

export interface AccountNumberValidationResult {
  valid: boolean;
  normalised: string | null;  // Left-padded to 8 digits if valid
  error: string | null;
}

export interface BankDetailsValidationResult {
  valid: boolean;
  sortCode: SortCodeValidationResult;
  accountNumber: AccountNumberValidationResult;
}

/**
 * Validate and format a UK bank sort code.
 * Accepts: "123456", "12-34-56", "12 34 56"
 */
export function validateSortCode(input: string): SortCodeValidationResult {
  if (!input || input.trim() === '') {
    return { valid: false, formatted: null, normalised: null, error: 'Sort code is required' };
  }

  // Strip hyphens, spaces, and any other non-digit characters
  const digits = input.replace(/[^0-9]/g, '');

  if (digits.length !== 6) {
    return {
      valid: false,
      formatted: null,
      normalised: null,
      error: 'Sort code must be exactly 6 digits',
    };
  }

  // Basic sanity: sort code shouldn't be all zeros
  if (digits === '000000') {
    return {
      valid: false,
      formatted: null,
      normalised: null,
      error: 'Invalid sort code',
    };
  }

  const formatted = `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4, 6)}`;

  return {
    valid: true,
    formatted,
    normalised: digits,
    error: null,
  };
}

/**
 * Validate a UK bank account number.
 * Must be 7-8 digits. 7-digit numbers are left-padded to 8.
 */
export function validateAccountNumber(input: string): AccountNumberValidationResult {
  if (!input || input.trim() === '') {
    return { valid: false, normalised: null, error: 'Account number is required' };
  }

  // Strip any spaces or hyphens
  const digits = input.replace(/[^0-9]/g, '');

  if (digits.length < 7 || digits.length > 8) {
    return {
      valid: false,
      normalised: null,
      error: 'Account number must be 7 or 8 digits',
    };
  }

  // All zeros is invalid
  if (/^0+$/.test(digits)) {
    return {
      valid: false,
      normalised: null,
      error: 'Invalid account number',
    };
  }

  // Left-pad 7-digit numbers to 8
  const normalised = digits.padStart(8, '0');

  return {
    valid: true,
    normalised,
    error: null,
  };
}

/**
 * Validate both sort code and account number together.
 */
export function validateBankDetails(
  sortCode: string,
  accountNumber: string
): BankDetailsValidationResult {
  const sortCodeResult = validateSortCode(sortCode);
  const accountNumberResult = validateAccountNumber(accountNumber);

  return {
    valid: sortCodeResult.valid && accountNumberResult.valid,
    sortCode: sortCodeResult,
    accountNumber: accountNumberResult,
  };
}

/**
 * Format sort code for display: "12-34-56"
 */
export function formatSortCode(digits: string): string {
  const clean = digits.replace(/[^0-9]/g, '');
  if (clean.length !== 6) return digits;
  return `${clean.slice(0, 2)}-${clean.slice(2, 4)}-${clean.slice(4, 6)}`;
}
