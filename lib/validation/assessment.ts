/**
 * Assessment Wizard schema. Client-validated, then re-validated server-side in
 * /api/submit-assessment before the four outputs fire.
 */
import { z } from "zod";

export const ratingSchema = z.enum(["GOOD", "MONITOR", "ATTENTION", "N/A"]);

export const inspectionItemSchema = z.object({
  key: z.string(),
  rating: ratingSchema,
  note: z.string().optional(),
  photoUrl: z.string().optional(),
});

export const assessmentSchema = z.object({
  jobId: z.string().optional(),
  customerName: z.string().min(1),
  customerEmail: z.string().email(),
  inspectionItems: z.array(inspectionItemSchema),
  // expand: chemistry readings, equipment specs, recommendations
});

export type AssessmentData = z.infer<typeof assessmentSchema>;
