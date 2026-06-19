import type { Metadata } from "next";
import AssessmentWizard from "@/components/forms/AssessmentWizard";

export const metadata: Metadata = {
  title: "Pool Condition Assessment",
  description: "On-site pool condition assessment and customer report.",
  robots: { index: false, follow: false }, // internal tech tool, keep out of search
};

/**
 * /assessment — the tech-facing wizard. Query-param prefill
 * (?customer=&address=&city=&zip=&pool=&job=) is read client-side inside the
 * provider, so this stays a thin server shell.
 */
export default function AssessmentPage() {
  return <AssessmentWizard />;
}
