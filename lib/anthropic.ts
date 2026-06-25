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
- Only restate what's in the tech's note. Never add a cause, a fix, a severity, a part, or any detail the tech didn't write. Never invent anything.
- Do not change the finding. The rating is fixed; you're only cleaning up the wording.
- Keep it to ONE sentence, roughly the length of the original. Don't pad a few words into a paragraph.
- Output only the sentence — no labels, no quotes, no preamble.`;

const SUMMARY_SYSTEM = `You write a short overview (2-3 sentences) for the top of a pool inspection report, for the homeowner.

${VOICE_RULES}

CRITICAL RULES:
- Use ONLY the facts you're given. Never invent a problem, cause, fix, or number that isn't in the facts. Don't add anything.
- State the overall shape of the pool, name the main thing(s) to take care of, and give honest, reassuring context — without overselling or alarming.
- 2 to 3 sentences total. Output only the paragraph — no labels or preamble.`;

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
}): Promise<string | null> {
  const user = `Section: ${args.sectionTitle}
Rating: ${args.rating}
Tech's note: "${args.rawNote}"

Rewrite the tech's note as one clear sentence for the homeowner.`;
  const out = await callClaude(POLISH_SYSTEM, user, 160);
  // Guard against the model returning multiple sentences / stray quotes.
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
