"use client";
import { useId, useRef, useState } from "react";
import { compressImage } from "@/lib/image-compress";

/**
 * A single photo slot: opens the phone camera (capture attribute), compresses
 * the shot client-side, and shows a thumbnail with a remove button. `required`
 * slots show a red outline until filled so the tech sees what's outstanding.
 */
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
        <div className="relative overflow-hidden rounded-xl border-2 border-teal/40">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt={label} className="h-32 w-full object-cover" />
          <span className="absolute left-0 top-0 bg-navy/80 px-2 py-1 text-xs font-medium text-white">
            {label}
          </span>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute right-1 top-1 rounded-full bg-white/90 px-2 py-1 text-xs font-bold text-red-600"
          >
            Remove
          </button>
        </div>
      ) : (
        <label
          htmlFor={inputId}
          className={`flex h-32 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed text-center text-sm font-medium ${
            missing
              ? "border-red-400 bg-red-50 text-red-600"
              : "border-navy/25 bg-sand text-navy/60"
          }`}
        >
          {busy ? (
            <span>Processing…</span>
          ) : (
            <>
              <span className="text-2xl leading-none">📷</span>
              <span className="mt-1 px-2">{label}</span>
              {required && <span className="mt-0.5 text-xs">Required</span>}
            </>
          )}
        </label>
      )}
    </div>
  );
}
