/**
 * The 16 wizard steps as ordered DATA.
 *
 * Four phases (shown on Welcome): Property & Inspection → Configuration →
 * 10 Inspection Sections → Recommendations & Submit. The 10 section steps are
 * derived from SECTIONS in config.ts so the two never drift apart.
 *
 * index.tsx maps each step id to a component. To reorder, edit this list.
 */
import { SECTIONS } from "./config";

export type Phase =
  | "Property & Inspection"
  | "Configuration"
  | "Inspection Sections"
  | "Recommendations & Submit";

export type WizardStep = {
  /** stable id used by the component switch and for section lookup */
  id: string;
  /** short title shown in the wizard header */
  title: string;
  phase: Phase;
  /** for the 10 inspection sections, the SECTIONS config id */
  sectionId?: string;
};

const sectionSteps: WizardStep[] = SECTIONS.map((s) => ({
  id: `section:${s.id}`,
  title: s.title,
  phase: "Inspection Sections",
  sectionId: s.id,
}));

// Property + Inspection Details are one merged step now. The Spa section is
// dropped at runtime when no spa is present, so the real total is dynamic —
// compute it from getActiveSteps(state) in summary.ts, never hardcode it.
export const WIZARD_STEPS: WizardStep[] = [
  { id: "welcome", title: "Welcome", phase: "Property & Inspection" },
  { id: "property", title: "Property & Inspection", phase: "Property & Inspection" },
  { id: "config", title: "Pool Configuration", phase: "Configuration" },
  ...sectionSteps,
  { id: "recommendations", title: "Recommendations", phase: "Recommendations & Submit" },
  { id: "review", title: "Review & Submit", phase: "Recommendations & Submit" },
];

export const PHASES: Phase[] = [
  "Property & Inspection",
  "Configuration",
  "Inspection Sections",
  "Recommendations & Submit",
];
