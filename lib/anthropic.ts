/**
 * Claude API client for the assessment report — PRESENTATION ONLY.
 *
 * Two jobs, both server-side, both on the submit/PDF path:
 *   - polishNote(): rewrite one tech note into one clean homeowner sentence.
 *   - summarize(): a 2-3 sentence overview from the structured findings.
 *
 * HARD RULES (baked into the system prompts):
 *   1. NEVER change a finding. The AI only rewrites WORDING. Ratings, priorities,
 *      flags, chemistry statuses and recommendations are computed deterministically
 *      elsewhere and passed in as fixed facts to describe — never to decide. It must
 *      not invent a problem, cause, or fix that wasn't in the note / structured data.
 *   2. MUST NOT sound like AI. Plain spoken English, short, contractions fine, no
 *      corporate/formal phrasing, no marketing fluff, don't alarm.
 *
 * Every function returns null on ANY failure (missing key, timeout, error, empty)
 * so callers can fall back. Nothing here ever throws to the caller.
 */
import "server-only";

const API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = "claude-sonnet-4-6";
const ENDPOINT = "https://api.anthropic.com/v1/messages";
const TIMEOUT_MS = 8000;

const VOICE_RULES = `Write like an experienced local pool tech talking to the homeowner. Plain, spoken English. Short sentences. Contractions are fine. Do NOT use corporate or formal phrasing (no "upon inspection", "it was observed", "we are pleased to", "please be advised", "exhibited", "apparatus", "optimal"). No marketing fluff, no overselling. Don't alarm the customer. If it sounds polished or corporate, it's wrong — it should sound like a real person who knows pools.`;

const POLISH_SYSTEM = `You clean up a pool technician's raw inspection note into ONE short sentence for the homeowner's report.

${VOICE_RULES}

CRITICAL RULES:
- Only restate what's in the tech's note and the facts you're given (section, rating, timeframe). Never add a cause, a fix, a severity, or a part the tech didn't write. Never invent anything.
- Preserve the detail and the tech's plain, vivid words — if they wrote "growling", keep "growling"; don't formalize it into "operating abnormally". Fix spelling and make it readable, nothing more.
- Do not change the finding. The rating is fixed; you're only cleaning up the wording.
- TIMEFRAME: you may be given a "Recommended timeframe" — a computed fact, not your judgment. If one is given, you MAY work it in naturally, in plain words (e.g. "Within 30 days" → "in the next month or so"; "Immediate" → "should be handled right away"; "Within 90 days" → "in the next few months"; "Monitor" → "worth keeping an eye on"). If NO timeframe is given, do NOT mention, guess, or imply any timeframe.
- Keep it to ONE sentence. Stay close to the original length — don't pad a few words into a paragraph.
- Output only the sentence — no labels, no quotes, no preamble.`;

const SUMMARY_SYSTEM = `You write a short overview (2-3 sentences) for the top of a pool inspection report, for the homeowner.

${VOICE_RULES}

CRITICAL RULES:
- Use ONLY the facts you're given. Never invent a problem, cause, fix, or number that isn't in the facts. Don't add anything.
- State the overall shape of the pool, name the main thing(s) to take care of, and give honest, reassuring context — without overselling or alarming.
- 2 to 3 sentences total. Output only the paragraph — no labels or preamble.`;

const POLISH_TEXT_SYSTEM = `You clean up a pool technician's text for the homeowner's report — fix typos and clumsy wording so it reads like a real person wrote it.

${VOICE_RULES}

CRITICAL RULES:
- Only clean up the wording. Keep the EXACT meaning and roughly the same length — don't add, expand, explain, or invent anything, and don't turn a short line into a long one.
- Never change a finding, a fix, a part, a number, a price, or a recommendation. Fix spelling (e.g. "guage" → "gauge", "stabelizer" → "stabilizer", "chagned" → "changed") and grammar only.
- Output only the cleaned text — no labels, no quotes, no preamble.`;

async function callClaude(system: string, user: string, maxTokens: number): Promise<string | null> {
  if (!API_KEY) return null;
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "x-api-key": API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: user }],
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { content?: { text?: string }[] };
    const text = json?.content?.[0]?.text?.trim();
    return text || null;
  } catch {
    // missing key already handled; this covers timeout / network / parse errors.
    return null;
  }
}

/** One clean homeowner sentence for a flagged section's note. null → caller uses raw note. */
export async function polishNote(args: {
  sectionTitle: string;
  rating: string;
  rawNote: string;
  /** Computed recommendation timeframe for this section, if any (a fixed fact). */
  timeframe?: string;
}): Promise<string | null> {
  const timeframeLine = args.timeframe?.trim()
    ? `\nRecommended timeframe: ${args.timeframe.trim()}`
    : "";
  const user = `Section: ${args.sectionTitle}
Rating: ${args.rating}
Tech's note: "${args.rawNote}"${timeframeLine}

Rewrite the tech's note as one clear sentence for the homeowner.`;
  const out = await callClaude(POLISH_SYSTEM, user, 160);
  // Guard against the model returning multiple sentences / stray quotes.
  return out ? out.replace(/^["']|["']$/g, "").trim() : null;
}

/**
 * General wording cleanup for free-form text (recommendation item text, overall
 * notes) — fixes typos/grammar, keeps meaning + length. null → caller uses raw.
 */
export async function polishText(rawText: string): Promise<string | null> {
  const t = rawText.trim();
  if (!t) return null;
  const out = await callClaude(
    POLISH_TEXT_SYSTEM,
    `Clean up this text for the homeowner's report:\n\n"${t}"`,
    220
  );
  return out ? out.replace(/^["']|["']$/g, "").trim() : null;
}

const POLISH_REC_SYSTEM = `You clean up a pool technician's recommendation for the homeowner's report — fix typos and clumsy wording so it reads like a real person wrote it.

${VOICE_RULES}

CRITICAL RULES:
- Use ONLY the words the tech gave you. Fix spelling and expand obvious shorthand, nothing more. Never add a synonym, an alternative descriptor, a symptom, an adjective, a cause, or any detail the tech didn't write — if they wrote "growling", the report says "growling", NOT "grinding/growling". Don't enrich, don't offer alternatives, don't formalize. This is wording cleanup, not improvement.
- Keep the EXACT meaning and roughly the same length. Don't add, expand, explain, or invent anything.
- Never change a finding, a fix, a part, a number, a price, or the recommendation itself.
- DO NOT state any timeframe, timing, or urgency — no "within 30 days", "in the next month or so", "soon", "right away", "immediately", "within 90 days", "monitor", "keep an eye on", etc. The recommendation's timeframe is printed on its own line, so repeating it inside the sentence is redundant. Leave timing out entirely.
- Output only the cleaned recommendation — no labels, no quotes, no preamble.`;

/**
 * Polish a recommendation item — same cleanup as polishText, but the timeframe
 * is printed on its own line, so the model must NOT restate any timing inside
 * the sentence. null → caller uses the raw item text.
 */
export async function polishRecItem(rawText: string): Promise<string | null> {
  const t = rawText.trim();
  if (!t) return null;
  const out = await callClaude(
    POLISH_REC_SYSTEM,
    `Clean up this recommendation for the homeowner's report:\n\n"${t}"`,
    200
  );
  return out ? out.replace(/^["']|["']$/g, "").trim() : null;
}

// ── PHOTO LABELS — the lightest touch of any surface. Fenced off on purpose:
// labels are TAGS, not sentences. The failure mode to guard against is the model
// treating a label like a note and expanding it into prose. ──────────────────
const POLISH_LABEL_SYSTEM = `You clean up a SHORT PHOTO LABEL (a tag, not a sentence) for a pool inspection report. This is the lightest touch of any text on the report — do almost nothing.

THE ONLY JOB:
- Fix spelling and expand obvious shorthand. Examples: "pump mtr rust" → "pump motor rust"; "guage" → "gauge" (but "gauge" stays "gauge"); "crackng nr coping" → "cracking near coping".

HARD LIMITS — a label is a TAG, never a sentence:
- NEVER reword a label into a sentence. "pump motor rust" must NOT become "The pump motor is showing signs of rust." No added words, no verbs, no framing, no extra punctuation.
- NEVER change what the label refers to. Don't infer, don't elaborate, don't add a part name that isn't there.
- Keep the length: a 3-word label leaves as 3 words, just spelled right.
- If you can't fix a spelling issue without rewriting, leave the label EXACTLY as-is.
- Output only the cleaned label — no quotes, no preamble, nothing else.`;

/** Tag-level cleanup for a photo label (spelling/shorthand only). null → caller uses raw. */
export async function polishLabel(rawLabel: string): Promise<string | null> {
  const t = rawLabel.trim();
  if (!t) return null;
  const out = await callClaude(POLISH_LABEL_SYSTEM, `Clean up this photo label:\n\n"${t}"`, 40);
  return out ? out.replace(/^["']|["']$/g, "").trim() : null;
}

/** 2-3 sentence overview from structured findings. null → caller omits the summary. */
export async function summarize(args: {
  overall: string;
  goodCount: number;
  priority1: string[];
  priority2: string[];
}): Promise<string | null> {
  const fmt = (items: string[]) => (items.length ? items.map((i) => `  - ${i}`).join("\n") : "  - none");
  const user = `Overall condition: ${args.overall}
Systems rated good: ${args.goodCount}
Needs attention now (Priority 1):
${fmt(args.priority1)}
Keep an eye on (Priority 2):
${fmt(args.priority2)}

Write the homeowner overview.`;
  return callClaude(SUMMARY_SYSTEM, user, 256);
}
