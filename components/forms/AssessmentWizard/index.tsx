"use client";
import { AssessmentProvider, useAssessment } from "./state";
import { WIZARD_STEPS } from "./steps";
import RatingStep from "./RatingStep";
import StepWelcome from "./StepWelcome";
import StepChemistry from "./StepChemistry";
import StepEquipment from "./StepEquipment";
import StepRecommendations from "./StepRecommendations";
import StepSummary from "./StepSummary";

function CurrentStep() {
  const { state } = useAssessment();
  const step = WIZARD_STEPS[state.step];
  if (!step) return <StepSummary />;
  switch (step.kind) {
    case "welcome": return <StepWelcome />;
    case "rating": return <RatingStep itemKey={step.key} label={step.label} />;
    case "chemistry": return <StepChemistry />;
    case "equipment": return <StepEquipment />;
    case "recommendations": return <StepRecommendations />;
    case "summary": return <StepSummary />;
  }
}

export default function AssessmentWizard() {
  return (
    <AssessmentProvider>
      <CurrentStep />
    </AssessmentProvider>
  );
}
