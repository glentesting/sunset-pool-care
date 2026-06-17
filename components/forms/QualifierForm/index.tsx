"use client";
import { QualifierProvider, useQualifier } from "./state";
import StepPoolType from "./StepPoolType";
import StepReason from "./StepReason";
import StepContact from "./StepContact";
import StepQuote from "./StepQuote";

const STEPS = [StepPoolType, StepReason, StepContact, StepQuote];

function Steps() {
  const { state } = useQualifier();
  const Current = STEPS[state.step] ?? StepQuote;
  return <Current />;
}

export default function QualifierForm() {
  return (
    <QualifierProvider>
      <Steps />
    </QualifierProvider>
  );
}
