"use client";
import { createContext, useContext, useReducer, type ReactNode } from "react";

type Rating = "GOOD" | "MONITOR" | "ATTENTION" | "N/A";
export type AssessmentState = {
  step: number;
  ratings: Record<string, { rating?: Rating; note?: string; photoUrl?: string }>;
  // chemistry, equipment, recommendations added as those steps get built
};

type Action =
  | { type: "rate"; key: string; patch: Partial<AssessmentState["ratings"][string]> }
  | { type: "goto"; step: number }
  | { type: "next" }
  | { type: "back" };

function reducer(s: AssessmentState, a: Action): AssessmentState {
  switch (a.type) {
    case "rate":
      return { ...s, ratings: { ...s.ratings, [a.key]: { ...s.ratings[a.key], ...a.patch } } };
    case "goto": return { ...s, step: a.step };
    case "next": return { ...s, step: s.step + 1 };
    case "back": return { ...s, step: Math.max(0, s.step - 1) };
  }
}

const Ctx = createContext<{ state: AssessmentState; dispatch: React.Dispatch<Action> } | null>(null);

export function AssessmentProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { step: 0, ratings: {} });
  return <Ctx.Provider value={{ state, dispatch }}>{children}</Ctx.Provider>;
}

export function useAssessment() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAssessment must be used inside AssessmentProvider");
  return c;
}
