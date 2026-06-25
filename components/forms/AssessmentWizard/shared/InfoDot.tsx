"use client";
import { useEffect, useRef, useState } from "react";

/**
 * A small, tasteful "i" marker. Tap to toggle a one-line popover; tap outside to
 * close. Uses the wizard's own wiz-* tokens. Used in exactly two places (water
 * chemistry readings, recommendations) — keep it that way; don't clutter.
 */
export default function InfoDot({ text, label = "More info" }: { text: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <span ref={ref} className="relative inline-flex align-middle">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex h-4 w-4 items-center justify-center rounded-full border border-wiz-accent/50 font-serif text-[10px] font-bold italic leading-none text-wiz-accent-dark transition-colors hover:bg-wiz-accent/10"
      >
        i
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute left-0 top-6 z-20 w-60 rounded-lg border border-wiz-line bg-white p-3 text-[12px] leading-snug text-wiz-ink/80 shadow-card"
        >
          {text}
        </span>
      )}
    </span>
  );
}
