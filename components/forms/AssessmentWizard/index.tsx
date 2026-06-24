"use client";
import { AssessmentProvider, useAssessment } from "./state";
import { getActiveSteps } from "./summary";
import WizardChrome from "./WizardChrome";

import StepWelcome from "./steps/StepWelcome";
import StepProperty from "./steps/StepProperty";
import StepConfiguration from "./steps/StepConfiguration";
import StepRecommendations from "./steps/StepRecommendations";
import StepReview from "./steps/StepReview";

import SectionPoolSurface from "./steps/sections/SectionPoolSurface";
import SectionChemistry from "./steps/sections/SectionChemistry";
import SectionFiltration from "./steps/sections/SectionFiltration";
import SectionPump from "./steps/sections/SectionPump";
import SectionPlumbing from "./steps/sections/SectionPlumbing";
import SectionAutomation from "./steps/sections/SectionAutomation";
import SectionCleaning from "./steps/sections/SectionCleaning";
import SectionSafety from "./steps/sections/SectionSafety";
import SectionDecking from "./steps/sections/SectionDecking";
import SectionSpa from "./steps/sections/SectionSpa";

/** Section id (from config) -> its component. */
const SECTION_COMPONENTS: Record<string, React.ComponentType> = {
  surface: SectionPoolSurface,
  chemistry: SectionChemistry,
  filtration: SectionFiltration,
  pump: SectionPump,
  plumbing: SectionPlumbing,
  automation: SectionAutomation,
  cleaning: SectionCleaning,
  safety: SectionSafety,
  decking: SectionDecking,
  spa: SectionSpa,
};

/** Non-section step id -> its component. */
const STEP_COMPONENTS: Record<string, React.ComponentType> = {
  welcome: StepWelcome,
  property: StepProperty,
  config: StepConfiguration,
  recommendations: StepRecommendations,
  review: StepReview,
};

function CurrentStep() {
  const { state } = useAssessment();
  const steps = getActiveSteps(state);
  const step = steps[state.step] ?? steps[steps.length - 1];
  const Component = step.sectionId
    ? SECTION_COMPONENTS[step.sectionId]
    : STEP_COMPONENTS[step.id];
  return Component ? <Component /> : null;
}

export default function AssessmentWizard() {
  return (
    <AssessmentProvider>
      <WizardChrome>
        <CurrentStep />
      </WizardChrome>
    </AssessmentProvider>
  );
}
