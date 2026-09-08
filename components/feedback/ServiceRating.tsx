"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Button, { buttonClasses } from "@/components/ui/Button";

/**
 * Post-service star rating (/review). NOT components/review/ — that's the
 * office *report* review screen; this is the customer-facing rating landing.
 *
 * The follow-up email carries five links (?r=1..5&c=<HubSpot contact id>).
 * Landing records the click via the Make webhook, then:
 *   4–5 stars → thank-you + steer to Google
 *   1–3 stars → make-it-right form, which posts the webhook again with comments
 *   bad/bare link → neutral star picker so the page still works without params
 */
const WEBHOOK_URL = "https://hook.us2.make.com/afngz72eqt983g6lan37tpxwxn91qlyz";

function parseRating(raw: string | null): number | null {
  return raw !== null && /^[1-5]$/.test(raw) ? Number(raw) : null;
}

function Stars({ filled }: { filled: number }) {
  return (
    <div
      className="flex gap-1.5 text-4xl leading-none"
      role="img"
      aria-label={`${filled} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} aria-hidden className={n <= filled ? "text-gold" : "text-navy/15"}>
          ★
        </span>
      ))}
    </div>
  );
}

export default function ServiceRating() {
  const params = useSearchParams();
  const rating = parseRating(params.get("r"));
  const contactId = (params.get("c") ?? "").trim();

  // Record the click the moment we know who and how many stars. Fire-and-forget
  // by design: the customer never waits on it or hears about it. The ref guards
  // against double-fire (StrictMode re-running the effect, or re-renders).
  const recorded = useRef(false);
  useEffect(() => {
    if (recorded.current || rating === null || !contactId) return;
    recorded.current = true;
    fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating: String(rating), contact_id: contactId }),
    }).catch(() => {});
  }, [rating, contactId]);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 py-16">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-dark">
        Sunset Pool Care
      </p>
      <div className="mt-6">
        {rating === null ? (
          <StarPicker contactId={contactId} />
        ) : rating >= 4 ? (
          <ThankYou rating={rating} />
        ) : (
          <MakeItRight rating={rating} contactId={contactId} />
        )}
      </div>
    </main>
  );
}

/** 4–5 stars: gratitude + steer to Google. */
function ThankYou({ rating }: { rating: number }) {
  const googleUrl = process.env.NEXT_PUBLIC_GOOGLE_REVIEW_URL;
  return (
    <>
      <Stars filled={rating} />
      <h1 className="mt-6 text-3xl font-semibold leading-tight text-navy sm:text-4xl">
        Thank you — that means a lot.
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-navy/75">
        We&apos;d be grateful if you&apos;d share that with other pool owners in the
        Valley. It takes about thirty seconds and it genuinely helps.
      </p>
      {googleUrl && (
        <div className="mt-8">
          <a
            href={googleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClasses({ variant: "primary", size: "lg", className: "w-full sm:w-auto" })}
          >
            Leave a Google Review
          </a>
        </div>
      )}
    </>
  );
}

/** 1–3 stars: recovery form. Deliberately no Google link on this path. */
function MakeItRight({ rating, contactId }: { rating: number; contactId: string }) {
  const [comments, setComments] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: String(rating), contact_id: contactId, comments }),
      });
      if (!res.ok) throw new Error();
      setDone(true);
    } catch {
      setError("Couldn't send that just now. Please try again.");
      setBusy(false);
    }
  }

  if (done) {
    return (
      <>
        <Stars filled={rating} />
        <h1 className="mt-6 text-3xl font-semibold leading-tight text-navy sm:text-4xl">
          Thank you. Someone will be in touch shortly.
        </h1>
      </>
    );
  }

  return (
    <>
      <Stars filled={rating} />
      <h1 className="mt-6 text-3xl font-semibold leading-tight text-navy sm:text-4xl">
        We&apos;re sorry we missed the mark.
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-navy/75">
        Tell us what happened and we&apos;ll make it right. A manager will reach out
        personally.
      </p>
      <form onSubmit={submit} className="mt-8 space-y-4">
        <textarea
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          rows={5}
          aria-label="Tell us what happened"
          placeholder="Tell us what happened…"
          className="w-full rounded-lg border border-field p-3 text-base text-navy focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
        />
        {error && <p className="text-[13px] font-medium text-attention-dark">{error}</p>}
        <Button
          type="submit"
          size="lg"
          className="w-full disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
          disabled={busy || !comments.trim()}
        >
          {busy ? "Sending…" : "Submit"}
        </Button>
      </form>
    </>
  );
}

/**
 * Bare/invalid link: let them pick a rating right here. Carries c through when
 * present so the chosen rating still lands on the contact's record.
 */
function StarPicker({ contactId }: { contactId: string }) {
  const suffix = contactId ? `&c=${encodeURIComponent(contactId)}` : "";
  return (
    <>
      <h1 className="text-3xl font-semibold leading-tight text-navy sm:text-4xl">
        How did we do?
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-navy/75">
        Tap a star to rate your most recent service visit.
      </p>
      <div className="mt-8 flex gap-2" role="group" aria-label="Rate your service from 1 to 5 stars">
        {[1, 2, 3, 4, 5].map((n) => (
          <Link
            key={n}
            href={`/review?r=${n}${suffix}`}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            className="text-5xl leading-none text-navy/20 transition-colors hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2"
          >
            <span aria-hidden>★</span>
          </Link>
        ))}
      </div>
    </>
  );
}
