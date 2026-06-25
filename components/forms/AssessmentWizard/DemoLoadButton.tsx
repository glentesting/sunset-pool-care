"use client";
import { useEffect, useState } from "react";
import { useAssessment } from "./state";
import { buildDemoState, isDemoMode } from "./demo";

/**
 * "Load sample data" button — only rendered when the URL has ?demo=1. One tap
 * fills the whole wizard with representative sample data and jumps to Review &
 * Submit. Without ?demo=1 this renders nothing, so techs never see it.
 *
 * `floating` renders a small fixed pill (for use mid-flow); otherwise it's an
 * inline button (used on Welcome).
 */

// 1×1 JPEG fallback if <canvas> is unavailable, so a photo still embeds.
const FALLBACK_JPEG =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAAAv/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8An4B//9k=";

/** A small labeled placeholder "photo" so the demo PDF shows embedded images. */
function makePhoto(label: string): string {
  try {
    const c = document.createElement("canvas");
    c.width = 400;
    c.height = 300;
    const ctx = c.getContext("2d");
    if (!ctx) return FALLBACK_JPEG;
    const g = ctx.createLinearGradient(0, 0, 400, 300);
    g.addColorStop(0, "#1c3a57");
    g.addColorStop(1, "#2bb3a3");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 400, 300);
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.textAlign = "center";
    ctx.font = "bold 30px sans-serif";
    ctx.fillText("SAMPLE", 200, 140);
    ctx.font = "22px sans-serif";
    ctx.fillText(label, 200, 178);
    return c.toDataURL("image/jpeg", 0.6);
  } catch {
    return FALLBACK_JPEG;
  }
}

export default function DemoLoadButton({ floating = false }: { floating?: boolean }) {
  const { dispatch } = useAssessment();
  // Resolve the ?demo=1 gate after mount so SSR and client markup match (window
  // isn't available during SSR, so this can't run in a lazy initializer).
  const [show, setShow] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShow(isDemoMode());
  }, []);
  if (!show) return null;

  const load = () => dispatch({ type: "hydrate", state: buildDemoState(makePhoto) });

  if (floating) {
    return (
      <button
        type="button"
        onClick={load}
        className="fixed bottom-20 left-1/2 z-20 -translate-x-1/2 rounded-full border border-field bg-white/95 px-4 py-2 text-xs font-semibold text-navy shadow-card backdrop-blur transition-colors hover:bg-sand"
      >
        Load sample data
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={load}
      className="w-full rounded-lg border border-dashed border-field py-2.5 text-sm font-semibold text-navy/70 transition-colors hover:bg-sand"
    >
      Load sample data (demo)
    </button>
  );
}
