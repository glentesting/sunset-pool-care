import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary";
export default function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const base = "rounded-lg px-5 py-3 font-semibold transition-colors";
  const styles =
    variant === "primary"
      ? "bg-orange text-white hover:bg-orange-dark"
      : "bg-navy text-white hover:bg-navy-light";
  return <button className={`${base} ${styles} ${className}`} {...props} />;
}
