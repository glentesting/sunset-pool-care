/**
 * SITE CONSTANTS — SINGLE SOURCE OF TRUTH
 *
 * Anything that shows up in more than one place lives here and ONLY here.
 * Price, service areas, phone, address. If you change it here, it changes
 * everywhere. Do not hardcode any of these values anywhere else in the app.
 *
 * NOTE: Weekly service price is $135/month. It is NOT $125. Old material had
 * $125 floating around — that number is wrong and should never appear.
 */

export const WEEKLY_SERVICE_PRICE = 135; // dollars / month — canonical

export const SITE = {
  name: "Sunset Pool Care",
  shortName: "SPC",
  phone: "(480) 682-7986",
  email: "service@sunsetpoolcare.com",
  address: {
    street: "19015 S. Arizona Ave",
    city: "Chandler",
    state: "AZ",
    zip: "85286",
  },
  domain: "sunsetpoolcare.com",
} as const;

export const SERVICE_AREAS = [
  "Chandler",
  "Gilbert",
  "Queen Creek",
  "San Tan Valley",
  "Ahwatukee",
] as const;

export type ServiceArea = (typeof SERVICE_AREAS)[number];
