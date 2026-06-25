/**
 * Assessment Wizard schema. The client builds this shape from wizard state and
 * the server RE-VALIDATES it (never trust the client) before generating the PDF.
 *
 * v2: section + config photos (compressed JPEG data URLs) ARE included so the
 * PDF can embed them. This makes the payload large — see payload.ts.
 */
import { z } from "zod";

export const ratingSchema = z.enum(["GOOD", "MONITOR", "ATTENTION", "N/A"]);

const photoSchema = z.object({ label: z.string(), dataUrl: z.string() });

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
  photos: z.array(photoSchema).default([]),
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
  // ties an auto-generated rec back to its source (e.g. "section:pump") so the
  // server can pass that section's timeframe to the note-polish step.
  sourceKey: z.string().optional(),
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
  configPhotos: z.array(photoSchema).default([]),
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
    key: z.enum(["not-rated", "good", "monitor", "attention"]),
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
  // Presentation-only WORDING (never findings). Normally filled server-side by
  // the Claude step; the ?demo=1 path pre-fills it so the sample report shows
  // the AI features with no API key. Optional — absence triggers AI/fallback.
  presentation: z
    .object({
      summary: z.string().optional(),
      polishedNotes: z.record(z.string(), z.string()).optional(),
    })
    .optional(),
});

export type AssessmentData = z.infer<typeof assessmentSchema>;
