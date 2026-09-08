import type { Metadata } from "next";
import { Suspense } from "react";
import ServiceRating from "@/components/feedback/ServiceRating";

export const metadata: Metadata = {
  title: "How did we do?",
  description: "Rate your recent Sunset Pool Care service visit.",
  robots: { index: false, follow: false }, // personalized email landing, keep out of search
};

/**
 * /review — post-service star rating landing (?r=1..5&c=<HubSpot contact id>),
 * reached from the five one-click links in the follow-up email. Standalone like
 * /assessment: no marketing nav/footer. Query params are read client-side, so
 * this stays a thin server shell (Suspense is required around useSearchParams).
 */
export default function ReviewPage() {
  return (
    <Suspense>
      <ServiceRating />
    </Suspense>
  );
}
