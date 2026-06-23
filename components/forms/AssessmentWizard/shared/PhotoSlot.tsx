"use client";
import { useId, useRef, useState } from "react";
import { compressImage } from "@/lib/image-compress";

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
  value,
  onChange,
  required = false,
}: {
  label: string;
  value?: string;
  onChange: (dataUrl: string | null) => void;
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
        <div className="relative overflow-hidden rounded-lg border border-line">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt={label} className="h-28 w-full object-cover" />
          <span className="absolute inset-x-0 bottom-0 bg-navy/70 px-2 py-1 text-[11px] font-medium text-white">
            {label}
          </span>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute right-1.5 top-1.5 rounded-full bg-white/95 px-2 py-0.5 text-[11px] font-medium text-navy/70 shadow-card"
          >
            Remove
          </button>
        </div>
      ) : (
        <label
          htmlFor={inputId}
          className={`flex h-28 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-center text-[13px] font-medium transition-colors ${
            missing
              ? "border-attention/40 text-attention"
              : "border-line bg-sand/60 text-navy/45 hover:border-navy/25"
          }`}
        >
          {busy ? (
            <span>Processing…</span>
          ) : (
            <>
              <CameraGlyph />
              <span className="px-2">{label}</span>
              {required && <span className="text-[11px] text-navy/35">Required</span>}
            </>
          )}
        </label>
      )}
    </div>
  );
}
