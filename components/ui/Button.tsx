import type { ButtonHTMLAttributes } from "react";

/**
 * Single button system for the whole site. Render an actual <button> with the
 * default export, or style a <Link>/<a> by spreading `buttonClasses(...)` onto
 * it — do NOT fork a second button. Variants/sizes live here only.
 *
 *   primary   → the one orange action per view
 *   secondary → solid navy
 *   ghost     → outlined, for use on navy/dark surfaces (white hairline)
 */
type Variant = "primary" | "secondary" | "ghost";
type Size = "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-orange text-white hover:bg-orange-dark",
  secondary: "bg-navy text-white hover:bg-navy-light",
  ghost: "border border-white/40 text-white hover:bg-white/10",
};

const SIZES: Record<Size, string> = {
  md: "px-5 py-3 text-sm",
  lg: "px-7 py-4 text-base",
};

export function buttonClasses({
  variant = "primary",
  size = "md",
  className = "",
}: { variant?: Variant; size?: Size; className?: string } = {}) {
  const base =
    "inline-flex items-center justify-center rounded-lg font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2";
  return `${base} ${SIZES[size]} ${VARIANTS[variant]} ${className}`.trim();
}

export default function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClasses({ variant, size, className })} {...props} />;
}
