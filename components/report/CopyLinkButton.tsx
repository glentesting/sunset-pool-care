"use client";
import { useEffect, useState } from "react";

/**
 * "Copy link" for the public report viewer — puts the /r/<reportId> URL on the
 * clipboard so the office can paste it straight into a customer email.
 *
 * By default the URL is read from the address bar rather than passed in, so it
 * is correct on whatever host the page is actually being served from (preview
 * deploy, localhost, the production domain after cutover) with no env var
 * involved. Query and hash are dropped — only the shareable address is copied.
 *
 * Pass `url` to copy a different address — the office review screen does, to
 * hand over the CUSTOMER's link rather than its own.
 */
type State = "idle" | "copied" | "failed";

export default function CopyLinkButton({
  className = "",
  url: fixedUrl,
  copiedLabel = "Link copied",
}: {
  className?: string;
  /** Copy this address instead of the current page's. */
  url?: string;
  /** What the button says for a moment after a successful copy. */
  copiedLabel?: string;
}) {
  const [state, setState] = useState<State>("idle");

  // Reset the confirmation after a beat so the button doesn't read "Copied!"
  // forever on a page nobody navigates away from.
  useEffect(() => {
    if (state === "idle") return;
    const t = setTimeout(() => setState("idle"), 2500);
    return () => clearTimeout(t);
  }, [state]);

  async function copy() {
    const url = fixedUrl ?? `${window.location.origin}${window.location.pathname}`;
    // navigator.clipboard needs a secure context, which an office iPad on an
    // http preview won't always have — fall back to the old selection trick.
    try {
      await navigator.clipboard.writeText(url);
      setState("copied");
      return;
    } catch {
      /* fall through */
    }
    setState(legacyCopy(url) ? "copied" : "failed");
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-live="polite"
      className={className}
    >
      {state === "copied" ? copiedLabel : state === "failed" ? "Press Ctrl/⌘ + C" : "Copy link"}
    </button>
  );
}

function legacyCopy(text: string): boolean {
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}
