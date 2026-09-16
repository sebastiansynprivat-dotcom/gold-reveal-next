/**
 * Telegram IDs are numeric only. Helpers to keep every input path consistent.
 */

/** Strip everything that is not a digit (removes spaces, "@", pasted text). */
export const sanitizeTelegramId = (value: string): string =>
  (value || "").replace(/\D+/g, "");

/** A valid Telegram ID is digits only and long enough to be real. */
export const isValidTelegramId = (value: string): boolean =>
  /^\d{5,}$/.test(sanitizeTelegramId(value));
