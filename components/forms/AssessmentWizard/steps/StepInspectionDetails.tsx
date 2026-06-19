"use client";
import { useAssessment } from "../state";
import { TextField } from "../shared/Field";

/** Auto-filled on load (state bootstraps date/time/session) but fully editable. */
export default function StepInspectionDetails() {
  const { state, dispatch } = useAssessment();
  const d = state.details;
  const set = (patch: Partial<typeof d>) => dispatch({ type: "setDetails", patch });

  return (
    <div className="space-y-4">
      <p className="text-sm text-navy/60">Auto-filled from this device — edit if needed.</p>
      <TextField label="Session" value={d.session} onChange={(v) => set({ session: v })} />
      <div className="grid grid-cols-2 gap-3">
        <TextField label="Date" type="date" value={d.date} onChange={(v) => set({ date: v })} />
        <TextField label="Time" type="time" value={d.time} onChange={(v) => set({ time: v })} />
      </div>
      <TextField
        label="Inspector Name"
        value={d.inspectorName}
        onChange={(v) => set({ inspectorName: v })}
      />
    </div>
  );
}
