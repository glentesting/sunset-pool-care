"use client";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
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
  const [viewing, setViewing] = useState(false);

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
            {/* Tap to check the shot full size. The thumbnail did nothing on tap
                before, so this takes no gesture away from the tech: Remove is its
                own button on top, and retaking still goes through Remove. */}
            <button
              type="button"
              onClick={() => setViewing(true)}
              aria-label={`View ${label} photo full size`}
              className="block w-full"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={value} alt={label} className="h-20 w-full object-cover" />
            </button>
            <span className="absolute inset-x-0 bottom-0 bg-wiz-ink/70 px-2 py-0.5 text-[11px] font-medium text-white">
              {label}
            </span>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="absolute right-1.5 top-1.5 rounded-wiz bg-white/95 px-2 py-0.5 text-[11px] font-medium text-wiz-ink/70 shadow-card"
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
          {viewing && (
            <PhotoViewer src={value} label={photo?.label?.trim() || label} onClose={() => setViewing(false)} />
          )}
        </>
      ) : (
        <label
          htmlFor={inputId}
          className={`flex h-20 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg border border-dashed px-2 text-center text-[12px] font-medium leading-tight transition-colors ${
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
              <span>{label}</span>
              {required && <span className="text-[10px] text-wiz-ink/60">Required</span>}
            </>
          )}
        </label>
      )}
    </div>
  );
}

/**
 * Full-screen look at one captured photo. Any tap closes it (as does Escape),
 * so checking a shot costs two taps and can never strand the tech in a dialog.
 *
 * Portalled to <body>: the step body animates with a transform, and a fixed
 * element inside a transformed ancestor is positioned against that ancestor,
 * not the screen — it ended up under the wizard's sticky header and Next bar,
 * with its own Close button hidden behind them.
 */
function PhotoViewer({ src, label, onClose }: { src: string; label: string; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${label} — full size`}
      onClick={onClose}
      className="fixed inset-0 z-50 flex flex-col bg-black/90 p-3"
    >
      <div className="flex items-center justify-between gap-3 pb-2">
        <span className="truncate text-[13px] font-medium text-white/85">{label}</span>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="rounded-wiz bg-white/95 px-3 py-1.5 text-[13px] font-semibold text-wiz-ink"
        >
          Close
        </button>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={label} className="min-h-0 flex-1 object-contain" />
    </div>,
    document.body
  );
}
