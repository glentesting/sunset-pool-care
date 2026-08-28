"use client";
import { useState } from "react";

/**
 * The office code prompt. Deliberately says nothing about whether the report
 * exists — the gate is checked before anything is looked up, so a wrong code and
 * a wrong link are indistinguishable from here.
 */
export default function ReviewUnlock({ configured }: { configured: boolean }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/review/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (res.ok) {
        window.location.reload();
        return;
      }
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(json?.error ?? "That code isn't right.");
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    }
    setBusy(false);
  }

  return (
    <div className="mx-auto max-w-sm px-6 py-24">
      <h1 className="font-display text-xl font-semibold text-wiz-ink">Office report review</h1>
      <p className="mt-2 text-sm text-wiz-ink/70">
        {configured
          ? "Enter the office code to continue."
          : "Report review isn't set up yet. Ask whoever manages the site."}
      </p>
      {configured && (
        <form onSubmit={submit} className="mt-5 space-y-3">
          <input
            type="password"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoFocus
            aria-label="Office code"
            className="w-full rounded-lg border border-wiz-field p-3 text-base text-wiz-ink focus:border-wiz-accent focus:outline-none focus:ring-2 focus:ring-wiz-accent/30"
          />
          {error && <p className="text-[13px] font-medium text-attention-dark">{error}</p>}
          <button
            type="submit"
            disabled={busy || !code.trim()}
            className="w-full rounded-lg bg-wiz-action py-3 text-sm font-semibold text-white transition-colors hover:bg-wiz-action-dark disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "Checking…" : "Continue"}
          </button>
        </form>
      )}
    </div>
  );
}
