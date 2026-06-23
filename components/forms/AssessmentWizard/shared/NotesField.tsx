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
type RecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
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
  const baseRef = useRef("");

  useEffect(() => {
    // Client-only feature detection: window/SpeechRecognition aren't available
    // during SSR, so this has to run post-mount (not in a lazy initializer).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(getRecognitionCtor() !== null);
    return () => recRef.current?.stop();
  }, []);

  function toggle() {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = "en-US";
    rec.continuous = true;
    rec.interimResults = true;
    baseRef.current = value ? value.trimEnd() + " " : "";
    rec.onresult = (e) => {
      let transcript = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        transcript += e.results[i][0].transcript;
      }
      onChange(baseRef.current + transcript);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label className="text-[13px] font-medium text-navy/65">{label}</label>
        {supported && (
          <button
            type="button"
            onClick={toggle}
            aria-pressed={listening}
            className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
              listening ? "text-attention" : "text-teal-dark hover:bg-teal/10"
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
        className="w-full rounded-lg border border-line p-3 text-base text-navy placeholder:text-navy/30 focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal/30"
      />
    </div>
  );
}
