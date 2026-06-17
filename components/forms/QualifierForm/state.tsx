"use client";
import { createContext, useContext, useReducer, type ReactNode } from "react";

/** Shared state for the multi-step qualifier so steps don't prop-drill answers. */
export type QualifierState = {
  step: number;
  poolType?: string;
  reason?: string;
  zip?: string;
  name?: string;
  email?: string;
  phone?: string;
  path?: "callback" | "pricing" | "nurture";
};

type Action =
  | { type: "set"; patch: Partial<QualifierState> }
  | { type: "next" }
  | { type: "back" };

function reducer(s: QualifierState, a: Action): QualifierState {
  switch (a.type) {
    case "set": return { ...s, ...a.patch };
    case "next": return { ...s, step: s.step + 1 };
    case "back": return { ...s, step: Math.max(0, s.step - 1) };
  }
}

const Ctx = createContext<{ state: QualifierState; dispatch: React.Dispatch<Action> } | null>(null);

export function QualifierProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { step: 0 });
  return <Ctx.Provider value={{ state, dispatch }}>{children}</Ctx.Provider>;
}

export function useQualifier() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useQualifier must be used inside QualifierProvider");
  return c;
}
