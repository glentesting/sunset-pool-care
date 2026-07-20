"use client";
import SectionShell from "../../shared/SectionShell";

/**
 * Secondary Equipment — new section (spec 1.5), taking Safety Equipment's slot
 * in the order. Heater and Heat Pump moved here from Automation; Equipment Pads
 * and the "+ Add Additional Equipment" repeatable line arrive in Pass 2.
 */
export default function SectionSecondary() {
  return <SectionShell sectionId="secondary" />;
}
