/**
 * Customer-name splitting, shared by the wizard's payload builder and the office
 * review save path (which re-derives first/last when a name is corrected).
 */
/**
 * Split the customer's full name into first + last for the webhook payload
 * (HubSpot wants them separate). `customerName` itself is left untouched.
 *   - trim + collapse internal whitespace to single spaces
 *   - ""        -> { first: "", last: "" }
 *   - one token -> { first: token, last: "" }
 *   - else      -> first token / everything after the first space, as-is
 *     ("Mary Anne Van Der Berg" -> "Mary" / "Anne Van Der Berg")
 */
export function splitCustomerName(fullName: string): {
  customerFirstName: string;
  customerLastName: string;
} {
  const normalized = fullName.trim().replace(/\s+/g, " ");
  if (!normalized) return { customerFirstName: "", customerLastName: "" };
  const gap = normalized.indexOf(" ");
  if (gap === -1) return { customerFirstName: normalized, customerLastName: "" };
  return {
    customerFirstName: normalized.slice(0, gap),
    customerLastName: normalized.slice(gap + 1),
  };
}
