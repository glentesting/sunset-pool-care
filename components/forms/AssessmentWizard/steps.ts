/**
 * The 16 wizard steps as DATA. ~12 are identical-shape inspection items that
 * all render the shared <RatingStep>; the rest are bespoke components.
 *
 * This is Option B in practice: build the rating screen once, feed it the
 * twelve labels. To add/reorder an inspection item you edit this list, not
 * twelve hand-built files.
 *
 * TODO: confirm the real 16 items + order with field side (Kevin/techs).
 */

export type StepKind = "welcome" | "rating" | "chemistry" | "equipment" | "recommendations" | "summary";

export type WizardStep =
  | { kind: "welcome" }
  | { kind: "rating"; key: string; label: string; requirePhotoOnFlag?: boolean }
  | { kind: "chemistry" }
  | { kind: "equipment" }
  | { kind: "recommendations" }
  | { kind: "summary" };

export const WIZARD_STEPS: WizardStep[] = [
  { kind: "welcome" },
  { kind: "rating", key: "water_clarity", label: "Water Clarity", requirePhotoOnFlag: true },
  { kind: "rating", key: "skimmer_baskets", label: "Skimmer Baskets", requirePhotoOnFlag: true },
  { kind: "rating", key: "pump_basket", label: "Pump Basket", requirePhotoOnFlag: true },
  { kind: "rating", key: "filter", label: "Filter", requirePhotoOnFlag: true },
  { kind: "rating", key: "tile_line", label: "Tile Line", requirePhotoOnFlag: true },
  { kind: "rating", key: "surface", label: "Pool Surface", requirePhotoOnFlag: true },
  { kind: "rating", key: "deck", label: "Deck", requirePhotoOnFlag: true },
  { kind: "rating", key: "automation", label: "Automation / Timer", requirePhotoOnFlag: true },
  { kind: "rating", key: "heater", label: "Heater", requirePhotoOnFlag: true },
  { kind: "rating", key: "salt_system", label: "Salt System", requirePhotoOnFlag: true },
  { kind: "rating", key: "lights", label: "Lights", requirePhotoOnFlag: true },
  { kind: "rating", key: "valves_plumbing", label: "Valves & Plumbing", requirePhotoOnFlag: true },
  { kind: "chemistry" },
  { kind: "equipment" },
  { kind: "recommendations" },
  { kind: "summary" },
];
