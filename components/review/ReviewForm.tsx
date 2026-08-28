"use client";
import { useMemo, useReducer, useState } from "react";
import type { SerializedField } from "@/lib/revision-log";
import type { RevisionEntry } from "@/lib/revision-log";

/**
 * The office review form.
 *
 * All edits live in ONE draft here: a flat path -> value map seeded from the
 * server's field list. The client computes nothing authoritative — on save it
 * posts the whole map and the server re-reads the stored archive to work out
 * what actually changed, so the log can't be skipped and read-only fields can't
 * be reached whatever this component sends.
 *
 * The layout is driven entirely by the field list's own group/row metadata, so
 * the form follows the report's structure without a second description of it
 * that could drift.
 */

const RATINGS = [
  { value: "", label: "—" },
  { value: "GOOD", label: "Good" },
  { value: "MONITOR", label: "Monitor" },
  { value: "ATTENTION", label: "Attn" },
  { value: "N/A", label: "N/A" },
];

export type ReadOnlyBits = {
  chemistry: { label: string; reading: string; ideal: string; rating?: string }[];
  inspectorName: string;
  certificationDate: string;
  photoCount: number;
};

type Draft = Record<string, string>;
type Action = { type: "set"; path: string; value: string };

function reducer(state: Draft, action: Action): Draft {
  if (state[action.path] === action.value) return state;
  return { ...state, [action.path]: action.value };
}

type SaveState =
  | { phase: "idle" }
  | { phase: "saving" }
  | { phase: "done"; ok: boolean; message: string; customerFieldsChanged?: string[]; findingsChanged?: boolean; photosDropped?: string[] };

export default function ReviewForm({
  reportId,
  fields,
  readOnly,
  revisions,
  loadedAt,
  viewerUrl,
}: {
  reportId: string;
  fields: SerializedField[];
  readOnly: ReadOnlyBits;
  revisions: RevisionEntry[];
  loadedAt: string;
  viewerUrl: string;
}) {
  const initial = useMemo(() => Object.fromEntries(fields.map((f) => [f.path, f.value])), [fields]);
  const [draft, dispatch] = useReducer(reducer, initial);
  const [editor, setEditor] = useState("");
  const [save, setSave] = useState<SaveState>({ phase: "idle" });

  const changed = useMemo(
    () => fields.filter((f) => draft[f.path] !== f.value).length,
    [draft, fields]
  );

  // Group -> row -> the fields on that row, in the order the server emitted them.
  const groups = useMemo(() => {
    const out: { name: string; rows: { row: string; fields: SerializedField[] }[] }[] = [];
    for (const f of fields) {
      let group = out.at(-1);
      if (!group || group.name !== f.group) {
        group = { name: f.group, rows: [] };
        out.push(group);
      }
      let row = group.rows.at(-1);
      if (!row || row.row !== f.row) {
        row = { row: f.row, fields: [] };
        group.rows.push(row);
      }
      row.fields.push(f);
    }
    return out;
  }, [fields]);

  async function submit() {
    if (!editor.trim() || !changed || save.phase === "saving") return;
    setSave({ phase: "saving" });
    try {
      const res = await fetch("/api/review/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId, editor, loadedAt, fields: draft }),
      });
      const json = await res.json();
      setSave({
        phase: "done",
        ok: Boolean(json.ok) && json.status === "saved",
        message: json.message ?? json.error ?? "Something went wrong.",
        customerFieldsChanged: json.customerFieldsChanged,
        findingsChanged: json.findingsChanged,
        photosDropped: json.photosDropped,
      });
    } catch {
      setSave({ phase: "done", ok: false, message: "Couldn't reach the server. Nothing was changed." });
    }
  }

  const done = save.phase === "done" ? save : null;

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <header className="mb-6 border-b border-wiz-line pb-5">
        <h1 className="font-display text-2xl font-semibold text-wiz-ink">Report review</h1>
        <p className="mt-1 text-[13px] text-wiz-ink/70">
          Correct the report, then regenerate it. The customer&apos;s link stays the same —{" "}
          <a href={viewerUrl} target="_blank" rel="noopener noreferrer" className="underline">
            {viewerUrl}
          </a>
        </p>
      </header>

      {/* Read-only context: measured values and the tech's certification. */}
      <section className="mb-7 rounded-lg border border-wiz-line bg-wiz-surface p-4">
        <h2 className="text-[12px] font-semibold uppercase tracking-wide text-wiz-ink/60">
          Not editable
        </h2>
        <p className="mt-1 text-[12px] leading-relaxed text-wiz-ink/60">
          Chemistry readings are measurements, not judgements — if one is wrong the pool needs
          re-testing, not retyping. The inspector and their certification stay as filed, and the
          photos themselves can&apos;t be swapped (captions below can).
        </p>
        <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-[13px] sm:grid-cols-3">
          <div>
            <dt className="text-wiz-ink/55">Inspector</dt>
            <dd className="font-medium text-wiz-ink">{readOnly.inspectorName || "—"}</dd>
          </div>
          <div>
            <dt className="text-wiz-ink/55">Certified</dt>
            <dd className="font-medium text-wiz-ink">{readOnly.certificationDate || "—"}</dd>
          </div>
          <div>
            <dt className="text-wiz-ink/55">Photos on file</dt>
            <dd className="font-medium text-wiz-ink">{readOnly.photoCount}</dd>
          </div>
        </dl>
        {readOnly.chemistry.length > 0 && (
          <table className="mt-4 w-full text-left text-[13px]">
            <thead className="text-[11px] uppercase tracking-wide text-wiz-ink/55">
              <tr>
                <th className="py-1 font-semibold">Chemistry</th>
                <th className="py-1 font-semibold">Reading</th>
                <th className="py-1 font-semibold">Ideal</th>
                <th className="py-1 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="text-wiz-ink/80">
              {readOnly.chemistry.map((c) => (
                <tr key={c.label} className="border-t border-wiz-line">
                  <td className="py-1.5">{c.label}</td>
                  <td className="py-1.5 font-medium text-wiz-ink">{c.reading}</td>
                  <td className="py-1.5">{c.ideal}</td>
                  <td className="py-1.5">{c.rating ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Editable form, in report order. */}
      {groups.map((group) => (
        <section key={group.name} className="mb-6">
          <h2 className="mb-2 border-b border-wiz-line pb-1 font-display text-[15px] font-semibold text-wiz-ink">
            {group.name}
          </h2>
          <div className="divide-y divide-wiz-line/70">
            {group.rows.map((row) => (
              <div
                key={row.row || "__group"}
                className="grid grid-cols-1 items-start gap-2 py-2 sm:grid-cols-[220px_110px_1fr]"
              >
                <div className="pt-1.5 text-[13px] text-wiz-ink/80">
                  {row.row || <span className="italic text-wiz-ink/50">whole section</span>}
                </div>
                <RowCell fields={row.fields} slot="rating" draft={draft} dispatch={dispatch} />
                <RowCell fields={row.fields} slot="any" draft={draft} dispatch={dispatch} />
              </div>
            ))}
          </div>
        </section>
      ))}

      {/* Save */}
      <section className="sticky bottom-0 mt-8 border-t border-wiz-line bg-white/95 py-4 backdrop-blur">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-[13px] text-wiz-ink">
            <span className="mb-1 block font-medium">Your name</span>
            <input
              value={editor}
              onChange={(e) => setEditor(e.target.value)}
              placeholder="Who's making these changes"
              className="w-56 rounded-lg border border-wiz-field p-2 text-sm text-wiz-ink focus:border-wiz-accent focus:outline-none"
            />
          </label>
          <button
            type="button"
            onClick={submit}
            disabled={!editor.trim() || !changed || save.phase === "saving"}
            className="rounded-lg bg-wiz-action px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-wiz-action-dark disabled:cursor-not-allowed disabled:opacity-40"
          >
            {save.phase === "saving" ? "Regenerating…" : "Regenerate report"}
          </button>
          <span className="text-[13px] text-wiz-ink/60">
            {changed === 0
              ? "No changes yet"
              : `${changed} change${changed === 1 ? "" : "s"} ready — every one is recorded against your name`}
          </span>
        </div>

        {done && (
          <div
            className={`mt-3 rounded-lg border p-3 text-[13px] leading-relaxed ${
              done.ok
                ? "border-good/25 bg-good/5 text-good-dark"
                : "border-attention/25 bg-attention/5 text-attention-dark"
            }`}
          >
            <p className="font-semibold">{done.message}</p>
            {done.ok && (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-wiz-ink/80">
                {done.customerFieldsChanged && done.customerFieldsChanged.length > 0 && (
                  <li>
                    You changed the customer&apos;s {done.customerFieldsChanged.join(", ")}. The
                    report is updated, but HubSpot still has the old details — nothing here writes
                    back to it, so fix the contact record there too.
                  </li>
                )}
                {done.findingsChanged && (
                  <li>
                    The summary text on the job ticket still shows the original findings. The report
                    behind the link is the current one.
                  </li>
                )}
                {done.photosDropped && done.photosDropped.length > 0 && (
                  <li>
                    {done.photosDropped.length} photo(s) never finished uploading when this
                    assessment was filed and aren&apos;t in the rebuilt report:{" "}
                    {done.photosDropped.join(", ")}.
                  </li>
                )}
                <li>Reload the page to keep editing — this copy is now out of date.</li>
              </ul>
            )}
          </div>
        )}
      </section>

      {/* Revision log — newest first, append-only, internal. */}
      <section className="mt-10">
        <h2 className="font-display text-[15px] font-semibold text-wiz-ink">Change history</h2>
        <p className="mt-1 text-[12px] text-wiz-ink/60">
          Every edit ever made to this report. Nothing here can be changed or removed, and none of
          it appears on the customer&apos;s copy.
        </p>
        {revisions.length === 0 ? (
          <p className="mt-3 text-[13px] text-wiz-ink/55">No changes yet — this is as filed.</p>
        ) : (
          <table className="mt-3 w-full text-left text-[12px]">
            <thead className="text-[11px] uppercase tracking-wide text-wiz-ink/55">
              <tr>
                <th className="py-1 font-semibold">When</th>
                <th className="py-1 font-semibold">Who</th>
                <th className="py-1 font-semibold">Field</th>
                <th className="py-1 font-semibold">From</th>
                <th className="py-1 font-semibold">To</th>
              </tr>
            </thead>
            <tbody className="align-top text-wiz-ink/80">
              {[...revisions].reverse().map((r, i) => (
                <tr key={i} className="border-t border-wiz-line">
                  <td className="py-1.5 whitespace-nowrap">{r.at.replace("T", " ").slice(0, 16)}</td>
                  <td className="py-1.5 whitespace-nowrap font-medium text-wiz-ink">{r.editor}</td>
                  <td className="py-1.5">{r.field}</td>
                  <td className="py-1.5 text-wiz-ink/60">{r.from || "—"}</td>
                  <td className="py-1.5 font-medium text-wiz-ink">{r.to || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

/** One cell: the rating select, or everything else (notes, captions, values). */
function RowCell({
  fields,
  slot,
  draft,
  dispatch,
}: {
  fields: SerializedField[];
  slot: "rating" | "any";
  draft: Draft;
  dispatch: React.Dispatch<Action>;
}) {
  const mine = fields.filter((f) => (slot === "rating" ? f.slot === "rating" : f.slot !== "rating"));
  if (!mine.length) return <div />;
  return (
    <div className="space-y-1.5">
      {mine.map((f) => {
        const value = draft[f.path] ?? "";
        const dirty = value !== f.value;
        const ring = dirty ? "border-wiz-accent bg-wiz-accent/5" : "border-wiz-field";
        if (f.kind === "rating") {
          return (
            <select
              key={f.path}
              value={value}
              aria-label={f.label}
              onChange={(e) => dispatch({ type: "set", path: f.path, value: e.target.value })}
              className={`w-full rounded border p-1.5 text-[13px] text-wiz-ink ${ring}`}
            >
              {RATINGS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          );
        }
        return (
          <input
            key={f.path}
            value={value}
            aria-label={f.label}
            placeholder={f.slot === "caption" ? "photo caption" : f.slot === "note" ? "note" : ""}
            onChange={(e) => dispatch({ type: "set", path: f.path, value: e.target.value })}
            className={`w-full rounded border p-1.5 text-[13px] text-wiz-ink ${ring}`}
          />
        );
      })}
    </div>
  );
}
