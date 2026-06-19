/**
 * Assessment Wizard schema. The client builds this shape from wizard state and
 * the server RE-VALIDATES it (never trust the client) before generating the PDF.
 *
 * NOTE: photo image data is intentionally NOT part of this payload for v1.
 * The PDF is text-only this pass and Drive upload is stubbed, so we send photo
 * COUNTS for reporting and keep the actual images client-side in the draft.
 * (Flagged as a judgment call — see build summary.)
 */
import { z } from "zod";

export const ratingSchema = z.enum(["GOOD", "MONITOR", "ATTENTION", "N/A"]);

const bodyOfWaterSchema = z.object({
  poolType: z.string(),
  size: z.string(),
  lastWaterChange: z.string(),
  lastWaterChangeUnknown: z.boolean(),
});

const sectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  rating: ratingSchema.optional(),
  notes: z.string(),
  photoCount: z.number().int().nonnegative(),
});

const chemistryRowSchema = z.object({
  key: z.string(),
  label: z.string(),
  reading: z.string(),
  rating: ratingSchema.optional(),
  ideal: z.string(),
});

const recItemSchema = z.object({
  item: z.string(),
  investment: z.string(),
  timeframe: z.string(),
});

export const assessmentSchema = z.object({
  jobId: z.string().optional(),
  property: z.object({
    customerName: z.string().min(1, "Customer name is required"),
    serviceAddress: z.string(),
    city: z.string(),
    zip: z.string(),
    poolType: z.string(),
    poolSize: z.string(),
    lastWaterChange: z.string(),
    lastWaterChangeUnknown: z.boolean(),
    additionalBodies: z.array(bodyOfWaterSchema),
  }),
  details: z.object({
    session: z.string(),
    date: z.string(),
    time: z.string(),
    inspectorName: z.string(),
  }),
  config: z.object({
    surfaces: z.array(z.string()),
    sanitization: z.array(z.string()),
    features: z.array(z.string()),
  }),
  sections: z.array(sectionSchema),
  chemistry: z.array(chemistryRowSchema),
  lights: z.array(z.string()),
  filters: z.array(z.string()),
  pumps: z.array(z.string()),
  spaType: z.string(),
  recommendations: z.object({
    p1: z.array(recItemSchema),
    p2: z.array(recItemSchema),
    overallNotes: z.string(),
  }),
  overall: z.object({
    label: z.string(),
    counts: z.object({
      GOOD: z.number(),
      MONITOR: z.number(),
      ATTENTION: z.number(),
      "N/A": z.number(),
    }),
  }),
  certification: z.object({
    inspectorName: z.string().min(1, "Inspector name is required"),
    date: z.string(),
    certified: z.literal(true, { message: "Inspector must certify the report" }),
  }),
});

export type AssessmentData = z.infer<typeof assessmentSchema>;
