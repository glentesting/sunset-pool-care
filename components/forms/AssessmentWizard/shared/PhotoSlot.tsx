"use client";
import { useId, useRef, useState } from "react";
import { compressImage } from "@/lib/image-compress";
import type { Photo } from "../state";

const MAX_LABEL = 60;

/**
 * A single photo slot: opens the phone camera (capture attribute), compresses
 * the shot client-side, and shows a thumbnail with a remove button. `required`
 * slots show a quiet attention outline until filled.
 */
function CameraGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 8.5A1.5 1.5 0 0 1 5.5 7h1.8l.9-1.5h7.6L16.7 7h1.8A1.5 1.5 0 0 1 20 8.5v9A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5v-9Z"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <circle cx="12" cy="13" r="3.2" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

export default function PhotoSlot({
  label,
  photo,
  onChange,
  onLabelChange,
  required = false,
}: {
  label: string;
  photo?: Photo;
  onChange: (dataUrl: string | null) => void;
  /** when provided, a single-line label input renders under the thumbnail */
  onLabelChange?: (label: string) => void;
  required?: boolean;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      onChange(await compressImage(file));
    } catch {
      onChange(null);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const value = photo?.dataUrl;
  const missing = required && !value;

  return (
    <div>
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={handleFile}
      />
      {value ? (
        <>
          <div className="relative overflow-hidden rounded-lg border border-wiz-line">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt={label} className="h-28 w-full object-cover" />
            <span className="absolute inset-x-0 bottom-0 bg-wiz-ink/70 px-2 py-1 text-[11px] font-medium text-white">
              {label}
            </span>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="absolute right-1.5 top-1.5 rounded-full bg-white/95 px-2 py-0.5 text-[11px] font-medium text-wiz-ink/70 shadow-card"
            >
              Remove
            </button>
          </div>
          {onLabelChange && (
            <input
              type="text"
              value={photo?.label ?? ""}
              maxLength={MAX_LABEL}
              onChange={(e) => onLabelChange(e.target.value.slice(0, MAX_LABEL))}
              placeholder="Label (optional)"
              aria-label={`Label for ${label} photo`}
              className="mt-1.5 w-full rounded-md border border-wiz-field bg-white px-2 py-1.5 text-[13px] text-wiz-ink placeholder:text-wiz-ink/55 focus:border-wiz-accent focus:outline-none focus:ring-1 focus:ring-wiz-accent/30"
            />
          )}
        </>
      ) : (
        <label
          htmlFor={inputId}
          className={`flex h-28 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-center text-[13px] font-medium transition-colors ${
            missing
              ? "border-attention bg-attention/5 text-attention-dark"
              : "border-wiz-field bg-wiz-surface/60 text-wiz-ink/70 hover:border-wiz-ink/40"
          }`}
        >
          {busy ? (
            <span>Processing…</span>
          ) : (
            <>
              <CameraGlyph />
              <span className="px-2">{label}</span>
              {required && <span className="text-[11px] text-wiz-ink/60">Required</span>}
            </>
          )}
        </label>
      )}
    </div>
  );
}
