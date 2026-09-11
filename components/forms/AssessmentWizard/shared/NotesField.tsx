"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * THE note field — used for every note in the wizard: item notes, section notes,
 * unit-item notes, config-option notes and the "What We Found" box on Review.
 *
 * Two behaviours every note gets:
 *  - AUTO-GROW: slim (one line) at rest, grows with the content up to a cap
 *    (~7 lines) then scrolls internally, so a tech can read back a long note
 *    without it pushing the rest of the form off screen. Resizing runs before
 *    paint on every change (typing AND dictation) so the field never flashes at
 *    the wrong height and the page never jumps under the tech's thumb.
 *  - DICTATE: best-effort voice-to-text (Web Speech API). The mic button only
 *    renders when the API exists; everything degrades cleanly to typing if it
 *    doesn't (iOS Safari is unreliable, so we never block on it). Dictated text
 *    APPENDS to whatever's already in the field.
 *
 * `label` is optional: section/overall notes pass one; compact item and
 * config-option notes pass none (and `ariaLabel` instead, so the control is
 * still named for screen readers).
 */

// Minimal shapes for the non-standard, vendor-prefixed Speech Recognition API.
type SpeechRecognitionResultLike = { 0: { transcript: string }; isFinal: boolean };
type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
};
type SpeechRecognitionErrorLike = { error?: string };
type RecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: SpeechRecognitionErrorLike) => void) | null;
  start: () => void;
  stop: () => void;
};

function getRecognitionCtor(): (new () => RecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => RecognitionLike;
    webkitSpeechRecognition?: new () => RecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

// Runs before paint on the client, falls back to useEffect during SSR so it
// doesn't warn — the field must be sized before the browser shows it.
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

// Auto-grow ceiling. Past this many lines the field scrolls internally instead
// of growing without bound and shoving the form down.
const MAX_LINES = 7;

export default function NotesField({
  label,
  value,
  onChange,
  placeholder,
  ariaLabel,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  /** Accessible name when there's no visible label (compact item/option notes). */
  ariaLabel?: string;
}) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recRef = useRef<RecognitionLike | null>(null);
  const baseRef = useRef(""); // field text before this dictation session
  const finalRef = useRef(""); // finalized dictation text — persists across auto-restarts
  const activeRef = useRef(false); // tech is actively dictating (drives the auto-restart)
  const taRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow: collapse to measure, then grow to fit up to the cap. Because this
  // runs in a layout effect (before paint) the transient collapse is never
  // visible, so there's no flicker and no scroll jump.
  useIsoLayoutEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    const cs = getComputedStyle(el);
    const lineH = parseFloat(cs.lineHeight) || 20;
    const padding = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom) || 0;
    const border = parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth) || 0;
    const max = lineH * MAX_LINES + padding + border;
    const next = Math.min(el.scrollHeight, max);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > max ? "auto" : "hidden";
  }, [value]);

  useEffect(() => {
    // Client-only feature detection: window/SpeechRecognition aren't available
    // during SSR, so this has to run post-mount (not in a lazy initializer).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(getRecognitionCtor() !== null);
    // On unmount, make sure the auto-restart can't fire after we're gone.
    return () => {
      activeRef.current = false;
      recRef.current?.stop();
    };
  }, []);

  function toggle() {
    if (listening) {
      activeRef.current = false; // tech tapped off — don't auto-restart
      recRef.current?.stop();
      setListening(false);
      return;
    }
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = "en-US";
    rec.continuous = true; // keep capturing across pauses
    rec.interimResults = true; // still show text as they talk
    baseRef.current = value ? value.trimEnd() + " " : "";
    finalRef.current = "";
    activeRef.current = true;

    rec.onresult = (e) => {
      // Accumulate finalized chunks into finalRef (persists across restarts and
      // across the session's growing results); show base + final + live interim.
      let interim = "";
      let finalAddition = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) finalAddition += res[0].transcript;
        else interim += res[0].transcript;
      }
      if (finalAddition) finalRef.current += finalAddition;
      onChange(baseRef.current + finalRef.current + interim);
    };

    // The browser still ends the session on a silence gap even with
    // continuous=true (especially on mobile). While the tech is still dictating,
    // restart to bridge the pause — finalRef carries the captured text over, so
    // nothing is lost. Stops cleanly once they tap off (activeRef = false).
    rec.onend = () => {
      if (activeRef.current) {
        try {
          rec.start();
          return;
        } catch {
          /* couldn't restart — fall through and stop cleanly */
        }
      }
      activeRef.current = false;
      setListening(false);
    };

    rec.onerror = (ev) => {
      // Permission / mic errors are fatal — stop for good (no restart). Transient
      // ones (no-speech during a pause, aborted, network) just end the session,
      // and onend restarts to keep listening.
      if (
        ev?.error === "not-allowed" ||
        ev?.error === "service-not-allowed" ||
        ev?.error === "audio-capture"
      ) {
        activeRef.current = false;
      }
    };

    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      activeRef.current = false;
      setListening(false);
    }
  }

  // The header row only exists if there's something to put in it — a visible
  // label, or the Dictate control. Compact notes with neither render just the
  // field, keeping them slim (matters when repeated across ~90 items).
  const showHeader = Boolean(label) || supported;

  return (
    <div>
      {showHeader && (
        <div className="mb-1 flex items-center justify-between gap-2">
          {label ? (
            <label className="text-[13px] font-medium text-wiz-ink">{label}</label>
          ) : (
            <span aria-hidden />
          )}
          {supported && (
            <button
              type="button"
              onClick={toggle}
              aria-pressed={listening}
              className={`shrink-0 rounded-wiz px-2.5 py-1 text-[11px] font-medium transition-colors ${
                listening ? "text-attention" : "text-wiz-accent-dark hover:bg-wiz-accent/10"
              }`}
            >
              {listening ? "● Stop" : "Dictate"}
            </button>
          )}
        </div>
      )}
      <textarea
        ref={taRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "Type or dictate notes…"}
        aria-label={!label && ariaLabel ? ariaLabel : undefined}
        rows={1}
        className="block w-full resize-none rounded-wiz border border-wiz-field bg-white px-3 py-2 text-base text-wiz-ink placeholder:text-wiz-ink/50 focus:border-wiz-accent focus:outline-none focus:ring-2 focus:ring-wiz-accent/30"
      />
    </div>
  );
}
