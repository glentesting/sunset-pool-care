"use client";
import { useId } from "react";

/**
 * Small labeled form primitives shared across the bespoke steps. Mobile-first:
 * 16px text (prevents iOS zoom-on-focus), big tap targets, consistent styling
 * so the step files stay about content, not class soup.
 */

const inputCls =
  "w-full rounded-xl border-2 border-navy/15 p-3 text-base text-navy focus:border-teal focus:outline-none";

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  inputMode?: "text" | "numeric" | "decimal" | "tel" | "email";
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-semibold text-navy">
        {label}
      </label>
      <input
        id={id}
        type={type}
        inputMode={inputMode}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls}
      />
    </div>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder = "Select…",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
  placeholder?: string;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-semibold text-navy">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

/** A toggleable chip for "select all that apply" groups. */
export function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-full border-2 px-4 py-2 text-sm font-semibold transition-colors ${
        active
          ? "border-teal bg-teal text-white"
          : "border-navy/20 bg-white text-navy/70"
      }`}
    >
      {label}
    </button>
  );
}

export { inputCls };
