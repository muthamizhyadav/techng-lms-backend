/**
 * Contact-field normalization helpers.
 *
 * Duplicate checks must compare "the same" email/phone even when it was typed
 * with different casing or formatting ("John@Doe.com" vs "john@doe.com",
 * "+91 98765-43210" vs "9876543210"), otherwise accounts slip through the
 * checks and only the DB unique index (or nothing at all) stops them.
 */

/** Normalizes an email address for storage and duplicate checks. */
export const normalizeEmail = (email?: string): string =>
  (email ?? '').trim().toLowerCase();

/**
 * Compacts a phone number for storage: removes spaces, dashes, brackets and
 * dots while keeping an optional leading `+`.
 *
 * "+91 98765-43210" -> "+919876543210", "98765 43210" -> "9876543210"
 */
export const compactPhone = (phone?: string): string | undefined => {
  if (!phone) return undefined;
  const trimmed = phone.trim();
  if (!trimmed) return undefined;
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return undefined;
  return hasPlus ? `+${digits}` : digits;
};

/**
 * Reduces a phone number to comparable digits, treating the Indian trunk
 * prefix ("09876543210") and country code ("+91 9876543210") as equal to the
 * bare 10-digit number. The project targets Indian users (INR pricing,
 * "+91" examples, default country "India"), and no other country code
 * starts with "91", so this is unambiguous.
 */
export const canonicalPhoneDigits = (phone?: string): string => {
  const compact = compactPhone(phone);
  if (!compact) return '';

  let digits = compact.replace(/^\+/, '');
  if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  }
  return digits;
};

/**
 * Builds a regex matching any stored phone number whose canonical digits
 * equal the given phone's, ignoring separators, an optional leading "+",
 * and an optional "0"/"91" prefix. This lets duplicate checks catch legacy
 * records stored with different formatting.
 */
export const phoneDuplicateRegex = (phone: string): RegExp => {
  const digits = canonicalPhoneDigits(phone);
  if (!digits) {
    return /^$/;
  }
  const digitPattern = digits.split('').join('\\D*');
  return new RegExp(`^\\D*(?:91|0)?\\D*${digitPattern}\\D*$`);
};
