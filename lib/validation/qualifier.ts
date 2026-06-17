/**
 * Qualifier Form schema. Used on the client for validation AND re-run on the
 * server inside /api/submit-qualifier before anything touches HubSpot.
 * Never trust the client payload — the server re-validates with this same schema.
 */
import { z } from "zod";

export const qualifierSchema = z.object({
  poolType: z.string().min(1),
  reason: z.string().min(1),
  zip: z.string().min(5),
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(7),
  path: z.enum(["callback", "pricing", "nurture"]),
  // expand: add-ons, preferred callback time, etc.
});

export type QualifierData = z.infer<typeof qualifierSchema>;
