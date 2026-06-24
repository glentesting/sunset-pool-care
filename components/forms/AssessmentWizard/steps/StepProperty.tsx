"use client";
import { useAssessment, type BodyOfWater } from "../state";
import { POOL_TYPES } from "../config";
import { TextField, SelectField } from "../shared/Field";

export default function StepProperty() {
  const { state, dispatch } = useAssessment();
  const p = state.property;
  const d = state.details;

  return (
    <div className="space-y-4">
      <TextField
        label="Customer Name"
        value={p.customerName}
        onChange={(v) => dispatch({ type: "setProperty", patch: { customerName: v } })}
      />
      <TextField
        label="Service Address"
        value={p.serviceAddress}
        onChange={(v) => dispatch({ type: "setProperty", patch: { serviceAddress: v } })}
      />
      <div className="grid grid-cols-2 gap-3">
        <TextField
          label="City"
          value={p.city}
          onChange={(v) => dispatch({ type: "setProperty", patch: { city: v } })}
        />
        <TextField
          label="ZIP"
          value={p.zip}
          inputMode="numeric"
          onChange={(v) => dispatch({ type: "setProperty", patch: { zip: v } })}
        />
      </div>

      <SelectField
        label="Primary Pool Type"
        value={p.poolType}
        options={POOL_TYPES}
        onChange={(v) => dispatch({ type: "setProperty", patch: { poolType: v } })}
      />
      <TextField
        label="Approximate Pool Size"
        value={p.poolSize}
        placeholder="e.g. 15,000 gal"
        onChange={(v) => dispatch({ type: "setProperty", patch: { poolSize: v } })}
      />

      <div>
        <TextField
          label="Last Water Change — Primary Pool"
          value={p.lastWaterChange}
          placeholder="e.g. Spring 2024"
          onChange={(v) => dispatch({ type: "setProperty", patch: { lastWaterChange: v } })}
        />
        <label className="mt-2 flex items-center gap-2 text-[13px] text-navy/60">
          <input
            type="checkbox"
            checked={p.lastWaterChangeUnknown}
            onChange={(e) =>
              dispatch({ type: "setProperty", patch: { lastWaterChangeUnknown: e.target.checked } })
            }
            className="h-4 w-4 accent-teal"
          />
          Unknown
        </label>
      </div>

      {p.additionalBodies.map((b, i) => (
        <AdditionalBody key={b.id} body={b} index={i} />
      ))}

      <button
        type="button"
        onClick={() => dispatch({ type: "addBody" })}
        className="w-full rounded-lg border border-dashed border-line py-2.5 text-sm font-medium text-teal-dark transition-colors hover:bg-sand"
      >
        + Add Additional Body of Water
      </button>

      {/* Inspection — inspector entered once here, reused on the certification */}
      <div className="border-t border-line pt-5">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-navy/40">
          Inspection
        </p>
        <TextField
          label="Inspector Name"
          value={d.inspectorName}
          onChange={(v) => dispatch({ type: "setDetails", patch: { inspectorName: v } })}
        />
        <dl className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-sand/70 p-3 text-center">
          <Meta label="Session" value={d.session} />
          <Meta label="Date" value={d.date} />
          <Meta label="Time" value={d.time} />
        </dl>
        <p className="mt-1.5 text-[11px] text-navy/35">Auto-filled from this device.</p>
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-medium uppercase tracking-wide text-navy/40">{label}</dt>
      <dd className="mt-0.5 truncate text-[13px] font-medium text-navy" title={value}>
        {value || "—"}
      </dd>
    </div>
  );
}

function AdditionalBody({ body, index }: { body: BodyOfWater; index: number }) {
  const { dispatch } = useAssessment();
  const update = (patch: Partial<BodyOfWater>) =>
    dispatch({ type: "updateBody", id: body.id, patch });

  return (
    <div className="space-y-3 rounded-xl border border-line p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-navy">Additional Body #{index + 1}</h3>
        <button
          type="button"
          onClick={() => dispatch({ type: "removeBody", id: body.id })}
          className="text-[13px] font-medium text-navy/45 transition-colors hover:text-attention"
        >
          Remove
        </button>
      </div>
      <SelectField
        label="Pool Type"
        value={body.poolType}
        options={POOL_TYPES}
        onChange={(v) => update({ poolType: v })}
      />
      <TextField
        label="Approximate Size"
        value={body.size}
        onChange={(v) => update({ size: v })}
      />
      <TextField
        label="Last Water Change"
        value={body.lastWaterChange}
        onChange={(v) => update({ lastWaterChange: v })}
      />
      <label className="flex items-center gap-2 text-[13px] text-navy/60">
        <input
          type="checkbox"
          checked={body.lastWaterChangeUnknown}
          onChange={(e) => update({ lastWaterChangeUnknown: e.target.checked })}
          className="h-4 w-4 accent-teal"
        />
        Unknown
      </label>
    </div>
  );
}
