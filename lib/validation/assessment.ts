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

// A single rated/annotated checklist row on the report (Pass 3).
const reportItemSchema = z.object({
  label: z.string(),
  /** effective rating for the badge (binary items resolve to GOOD / ATTENTION) */
  status: ratingSchema.optional(),
  answer: z.enum(["yes", "no"]).optional(),
  reading: z.string().optional(),
  readingUnit: z.string().optional(),
  note: z.string().default(""),
});

// A repeatable unit (filter / pump / light / extra) with its own rated rows.
const reportUnitSchema = z.object({
  heading: z.string(),
  note: z.string().default(""),
  items: z.array(reportItemSchema).default([]),
});

const sectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  rating: ratingSchema.optional(),
  notes: z.string(),
  photoCount: z.number().int().nonnegative(),
  photos: z.array(photoSchema).default([]),
  items: z.array(reportItemSchema).default([]),
  units: z.array(reportUnitSchema).default([]),
});

const configOptionSchema = z.object({
  label: z.string(),
  status: ratingSchema.optional(),
  note: z.string().default(""),
});

const chemistryRowSchema = z.object({
  key: z.string(),
  label: z.string(),
  reading: z.string(),
  rating: ratingSchema.optional(),
  ideal: z.string(),
});

export const assessmentSchema = z.object({
  jobId: z.string().optional(),
  property: z.object({
    customerName: z.string().min(1, "Customer name is required"),
    // Optional to submit (a tech may not have it) but always present. HubSpot
    // match key + how the office reaches the customer.
    customerEmail: z.string().default(""),
    serviceAddress: z.string(),
    city: z.string(),
    zip: z.string(),
    poolType: z.string(),
    poolSize: z.string(),
    lastWaterChange: z.string(),
    lastWaterChangeUnknown: z.boolean(),
    // Editable recommendation captured when the date is marked Unknown.
    lastWaterChangeNote: z.string().default(""),
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
  configOptions: z.array(configOptionSchema).default([]),
  sections: z.array(sectionSchema),
  chemistry: z.array(chemistryRowSchema),
  // Report-wide count band: "N need attention · N to monitor · N good".
  itemCounts: z.object({
    attention: z.number().int().nonnegative(),
    monitor: z.number().int().nonnegative(),
    good: z.number().int().nonnegative(),
  }),
  lights: z.array(z.string()),
  filters: z.array(z.string()),
  pumps: z.array(z.string()),
  spaType: z.string(),
  // The recommendations/pricing engine is gone (spec 1.6) — pricing lives in the
  // client's Skimmer quote. The final step is overall notes -> certification.
  overallNotes: z.string().default(""),
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
      recBySourceKey: z.record(z.string(), z.string()).optional(),
      overallNotes: z.string().optional(),
      // raw photo label -> cleaned tag (demo passthrough so ?demo=1 previews it)
      photoLabels: z.record(z.string(), z.string()).optional(),
    })
    .optional(),
});

export type AssessmentData = z.infer<typeof assessmentSchema>;
export type ReportItem = z.infer<typeof reportItemSchema>;
export type ReportUnit = z.infer<typeof reportUnitSchema>;
