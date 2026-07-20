"use client";
import { useEffect, useRef, useState } from "react";

/**
 * A date field with an "Unknown" toggle (spec 1.3).
 *
 * Marking the date Unknown pops a dialog pre-filled with a recommendation the
 * inspector CAN EDIT before saving. The saved text rides in state and prints on
 * the report. Clearing Unknown drops the recommendation.
 *
 * Two instances, exact copy — see UNKNOWN_DATE_RECOMMENDATION in config.ts:
 *   Last Water Change              → "...water change..."
 *   Last Full Clean / Replacement  → "...filter clean..."
 */
export default function UnknownDateField({
  label,
  date,
  unknown,
  note,
  recommendation,
  onChange,
}: {
  label: string;
  date: string;
  unknown: boolean;
  note: string;
  /** Pre-filled (editable) copy for this instance. */
  recommendation: string;
  onChange: (patch: { date?: string; unknown?: boolean; note?: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(recommendation);
  const textRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (open) textRef.current?.focus();
  }, [open]);

  function toggleUnknown(next: boolean) {
    if (next) {
      // Marking Unknown: clear the date and open the editable recommendation.
      setDraft(note.trim() || recommendation);
      onChange({ unknown: true, date: "" });
      setOpen(true);
    } else {
      onChange({ unknown: false, note: "" });
    }
  }

  return (
    <div>
      <label className="mb-1 block text-[13px] font-medium text-wiz-ink">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={date}
          disabled={unknown}
          onChange={(e) => onChange({ date: e.target.value })}
          className="flex-1 rounded-lg border border-wiz-field px-3 py-2 text-base text-wiz-ink disabled:bg-wiz-surface disabled:text-wiz-ink/50 focus:border-wiz-accent focus:outline-none focus:ring-2 focus:ring-wiz-accent/30"
        />
        <button
          type="button"
          aria-pressed={unknown}
          onClick={() => toggleUnknown(!unknown)}
          className={`rounded-lg border px-3 py-2 text-[13px] font-semibold transition-colors ${
            unknown
              ? "border-monitor-dark bg-monitor-dark text-white"
              : "border-wiz-field bg-white text-wiz-ink/75 hover:bg-wiz-surface"
          }`}
        >
          Unknown
        </button>
      </div>

      {/* Saved recommendation — visible and re-editable without re-toggling. */}
      {unknown && note.trim() && (
        <button
          type="button"
          onClick={() => {
            setDraft(note);
            setOpen(true);
          }}
          className="mt-2 block w-full rounded-lg border border-monitor-dark/40 bg-monitor/10 p-2.5 text-left text-[13px] text-wiz-ink"
        >
          {note}
          <span className="ml-1 font-semibold text-wiz-accent-dark">Edit</span>
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`${label} — unknown date recommendation`}
            className="w-full max-w-md rounded-xl border border-wiz-field bg-white p-4 shadow-xl"
          >
            <p className="text-[15px] font-semibold text-wiz-ink">Date unknown</p>
            <p className="mt-1 text-[13px] text-wiz-ink/70">
              This goes on the report. Edit it if you need to.
            </p>
            <textarea
              ref={textRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
              className="mt-3 w-full rounded-lg border border-wiz-field p-3 text-base text-wiz-ink focus:border-wiz-accent focus:outline-none focus:ring-2 focus:ring-wiz-accent/30"
            />
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  // Backing out of the dialog also backs out of "Unknown" unless
                  // a recommendation was already saved.
                  if (!note.trim()) onChange({ unknown: false });
                  setOpen(false);
                }}
                className="flex-1 rounded-lg border border-wiz-field bg-white py-2.5 text-[14px] font-semibold text-wiz-ink"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onChange({ unknown: true, date: "", note: draft.trim() });
                  setOpen(false);
                }}
                className="flex-1 rounded-lg bg-wiz-accent-dark py-2.5 text-[14px] font-semibold text-white"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
