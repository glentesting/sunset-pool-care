"use client";
import { useId } from "react";

/**
 * Small labeled form primitives shared across the bespoke steps. Mobile-first:
 * 16px text (prevents iOS zoom-on-focus), hairline borders, generous padding,
 * quiet teal focus — so step files stay about content, not class soup.
 */

const inputCls =
  "w-full rounded-lg border border-field bg-white p-3 text-base text-navy placeholder:text-navy/50 focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30";

const labelCls = "mb-1 block text-[13px] font-medium text-navy";

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
      <label htmlFor={id} className={labelCls}>
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
      <label htmlFor={id} className={labelCls}>
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
      className={`rounded-full border px-3.5 py-2 text-sm font-medium transition-colors ${
        active
          ? "border-teal bg-teal/15 text-teal-dark"
          : "border-field bg-white text-navy/80 hover:border-navy/40"
      }`}
    >
      {label}
    </button>
  );
}

export { inputCls };
