/**
 * Soft SVG wave divider for organic section transitions (instead of straight
 * edges). The curve is filled with `currentColor`, so set the fill via a text
 * color class and let the wrapper/previous surface show through the top.
 *
 *   <div className="bg-sand"><Wave className="text-navy" /></div>
 *
 * Used sparingly — only at the page's bigger surface changes.
 */
export default function Wave({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1440 64"
      preserveAspectRatio="none"
      aria-hidden
      className={`block h-10 w-full sm:h-14 ${className}`}
    >
      <path
        d="M0 30 C240 62 480 62 720 36 C960 10 1200 10 1440 34 L1440 64 L0 64 Z"
        fill="currentColor"
      />
    </svg>
  );
}
