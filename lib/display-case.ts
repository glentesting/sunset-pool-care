/**
 * DISPLAY-ONLY capitalization for the customer-facing report viewer.
 *
 * The wizard stores exactly what the tech typed, and a tech typing on a phone in
 * a backyard often types all lowercase — "dale whitaker", "1420 e ocotillo rd".
 * The PDF already renders names properly; the viewer page did not.
 *
 * This is presentation only. It never touches the stored assessment, the
 * archived JSON, the Make payload, or anything that reaches HubSpot — those all
 * keep the value as entered.
 *
 * Rules:
 *   - A word is capitalized ONLY when it carries no uppercase letter already.
 *     Anything the tech capitalized on purpose survives untouched, so "McDonald"
 *     stays "McDonald" and "O'Brien" stays "O'Brien" rather than being flattened
 *     to "Mcdonald" / "O'brien".
 *   - Hyphens and apostrophes (straight or curly) start a new word:
 *     "mary-anne o'brien" -> "Mary-Anne O'Brien".
 *   - Only a leading LETTER is upper-cased, so "3rd" stays "3rd" rather than
 *     becoming "3Rd", and "1420" / "85249" are left alone.
 *   - Every separator, space and other character is preserved verbatim.
 *
 * Deliberately NOT handled: SHOUTED input ("DALE WHITAKER") is passed through as
 * typed. Down-casing it would equally wreck legitimate all-caps — a "III"
 * suffix, an "NW" directional — and the two can't be told apart without a
 * dictionary. Say the word if you'd rather it were normalized too.
 */

/**
 * Word boundaries for title-casing: whitespace, hyphens (ASCII and the unicode
 * dashes a phone keyboard can produce), and apostrophes (straight and curly).
 */
const SEPARATORS = "\\s\\-\\u2010-\\u2015'\\u2018\\u2019";
const WORDS = new RegExp(`[^${SEPARATORS}]+`, "g");

/** Title-case a name or address for display. Returns "" for empty input. */
export function toDisplayCase(value: string | null | undefined): string {
  if (!value) return "";
  return value.replace(WORDS, capitalizeWord);
}

function capitalizeWord(word: string): string {
  // Already carries deliberate case — leave the tech's capitalization alone.
  if (/\p{Lu}/u.test(word)) return word;
  const first = word[0];
  if (!first) return word;
  const upper = first.toUpperCase();
  // Unchanged for digits and punctuation, so "3rd" and "1420" pass through.
  return upper === first ? word : upper + word.slice(1);
}
