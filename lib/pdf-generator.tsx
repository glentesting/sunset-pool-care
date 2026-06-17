/**
 * Server-side PDF generation for the Assessment Wizard (@react-pdf/renderer).
 *
 * This is a LIB FUNCTION, not an API route — it's called inside
 * /api/submit-assessment, not exposed publicly on its own.
 *
 * Heads up for Phase 3: @react-pdf/renderer can be heavy in serverless (fonts,
 * cold starts). Watch Vercel function memory/timeout when we wire this up.
 */
import "server-only";
import type { AssessmentData } from "@/lib/validation/assessment";

export async function generateAssessmentPdf(_data: AssessmentData): Promise<Buffer> {
  // TODO: build <Document> with @react-pdf/renderer, renderToBuffer
  throw new Error("pdf-generator.generateAssessmentPdf not implemented yet");
}
