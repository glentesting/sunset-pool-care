"use client";
import { useEffect, useRef, useState } from "react";

/**
 * Notes textarea with BEST-EFFORT voice-to-text (Web Speech API). The mic
 * button only renders when the API exists; everything degrades cleanly to
 * typing if it doesn't (iOS Safari is unreliable, so we never block on it).
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

export default function NotesField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recRef = useRef<RecognitionLike | null>(null);
  const baseRef = useRef(""); // field text before this dictation session
  const finalRef = useRef(""); // finalized dictation text — persists across auto-restarts
  const activeRef = useRef(false); // tech is actively dictating (drives the auto-restart)

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

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label className="text-[13px] font-medium text-wiz-ink">{label}</label>
        {supported && (
          <button
            type="button"
            onClick={toggle}
            aria-pressed={listening}
            className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
              listening ? "text-attention" : "text-wiz-accent-dark hover:bg-wiz-accent/10"
            }`}
          >
            {listening ? "● Stop" : "Dictate"}
          </button>
        )}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "Type or dictate notes…"}
        rows={3}
        className="w-full rounded-lg border border-wiz-field p-3 text-base text-wiz-ink placeholder:text-wiz-ink/50 focus:border-wiz-accent focus:outline-none focus:ring-2 focus:ring-wiz-accent/30"
      />
    </div>
  );
}
