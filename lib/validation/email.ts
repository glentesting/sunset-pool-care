/**
 * Shared customer-email validator — used by the wizard UI, the submit gate, and
 * the server schema so all three agree on what "valid" means. Trims first, then
 * requires a reasonable email shape (local@domain.tld, no whitespace).
 */
export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
