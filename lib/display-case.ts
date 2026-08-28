/**
 * DISPLAY-ONLY capitalization for customer-facing output — the report PDF and
 * the /r/<reportId> viewer.
 *
 * The wizard stores exactly what the tech typed, and a tech typing on a phone in
 * a backyard types all lowercase ("dale whitaker", "1420 e ocotillo rd") or, with
 * caps lock on, all uppercase ("DALE WHITAKER"). Both reached the customer as
 * typed.
 *
 * This is presentation only. It never touches the stored assessment, the
 * archived JSON, the Make payload, or anything that reaches HubSpot — those all
 * keep the value as entered.
 *
 * Rules, per word:
 *   - No uppercase at all -> capitalize the first letter. "dale" -> "Dale".
 *   - Entirely uppercase and longer than one character -> title-cased.
 *     "DALE" -> "Dale", "OCOTILLO" -> "Ocotillo".
 *   - Mixed case is left exactly as typed, so deliberate capitalization survives:
 *     "McDonald" stays "McDonald", "O'Brien" stays "O'Brien".
 *   - A single uppercase character is left alone, which keeps the "E" of
 *     "1420 E Ocotillo Rd" and the "O" of "O'BRIEN" intact.
 *   - KEEP_UPPER tokens (suffixes and directionals) survive shouting.
 *   - Hyphens and apostrophes (straight or curly) start a new word:
 *     "mary-anne o'brien" -> "Mary-Anne O'Brien".
 *   - Only a leading LETTER is touched, so "3rd" stays "3rd" rather than becoming
 *     "3Rd", and "1420" / "85249" are left alone.
 *   - Every separator, space and other character is preserved verbatim.
 *
 * Known gap: a state abbreviation typed into the city or address field ("AZ")
 * is not in KEEP_UPPER and comes out "Az". There is no state field in the
 * assessment — city and zip are separate — so it only shows up when a tech types
 * one into a field that isn't for it. Add it to KEEP_UPPER if that turns out to
 * happen in practice.
 */

/**
 * Word boundaries for title-casing: whitespace, hyphens (ASCII and the unicode
 * dashes a phone keyboard can produce), and apostrophes (straight and curly).
 */
const SEPARATORS = "\\s\\-\\u2010-\\u2015'\\u2018\\u2019";
const WORDS = new RegExp(`[^${SEPARATORS}]+`, "g");

/**
 * All-caps tokens that are CORRECT in caps, so shouting can't be told from
 * intent by shape alone. Generational suffixes and compass directionals — both
 * of which turn up in real names and Arizona street addresses.
 */
const KEEP_UPPER = new Set(["II", "III", "IV", "JR", "SR", "NE", "NW", "SE", "SW"]);

/** Title-case a name or address for display. Returns "" for empty input. */
export function toDisplayCase(value: string | null | undefined): string {
  if (!value) return "";
  return value.replace(WORDS, capitalizeWord);
}

function capitalizeWord(word: string): string {
  const hasUpper = /\p{Lu}/u.test(word);
  const hasLower = /\p{Ll}/u.test(word);

  if (hasUpper) {
    // Mixed case is deliberate — "McDonald" is never flattened to "Mcdonald".
    if (hasLower) return word;
    // A lone capital carries no shouting signal and is usually right as it is:
    // the "E" of a street directional, the "O" of "O'BRIEN".
    if (word.length < 2) return word;
    if (KEEP_UPPER.has(word)) return word;
    // Genuinely shouted — fold it down and re-capitalize below.
    return capitalizeFirstLetter(word.toLowerCase());
  }

  return capitalizeFirstLetter(word);
}

/** Upper-case the leading character when it is a letter; otherwise untouched. */
function capitalizeFirstLetter(word: string): string {
  const first = word[0];
  if (!first) return word;
  const upper = first.toUpperCase();
  // Unchanged for digits and punctuation, so "3rd" and "1420" pass through.
  return upper === first ? word : upper + word.slice(1);
}
