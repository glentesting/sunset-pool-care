/**
 * SPC sunset wordmark — a lightweight inline SVG mark used in page chrome
 * (navbar + footer). A gradient half-sun (coral → gold) over two aqua water
 * lines, beside the "SUNSET POOL CARE" wordmark. Scales crisply at any size.
 *
 * `tone="navy"` → dark wordmark for light surfaces (navbar).
 * `tone="white"` → white wordmark for the navy footer.
 *
 * The detailed badge (emblem.png) is reserved for favicon / OG only.
 */
export default function Logo({
  tone = "navy",
  className = "h-9 w-auto",
}: {
  tone?: "navy" | "white";
  className?: string;
}) {
  const word = tone === "white" ? "fill-white" : "fill-navy";
  const sub = tone === "white" ? "fill-white/75" : "fill-teal-dark";

  return (
    <svg
      viewBox="0 0 250 56"
      className={className}
      role="img"
      aria-label="Sunset Pool Care"
    >
      {/* coral → gold half-sun gradient (hex mirrors --color-orange / --color-gold) */}
      <defs>
        <linearGradient id="spcSun" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ec6a45" />
          <stop offset="1" stopColor="#f3a838" />
        </linearGradient>
      </defs>

      {/* mark */}
      <path d="M9 30 A15 15 0 0 1 39 30 Z" fill="url(#spcSun)" />
      <path d="M7 36h34" className="stroke-teal" strokeWidth="3.4" strokeLinecap="round" />
      <path d="M13 42h22" className="stroke-teal" strokeWidth="3.4" strokeLinecap="round" />

      {/* wordmark */}
      <text x="56" y="27" className={`font-display ${word}`} fontSize="19" fontWeight="700" letterSpacing="1.5">
        SUNSET
      </text>
      <text x="57" y="44" className={`font-display ${sub}`} fontSize="10.5" fontWeight="600" letterSpacing="4">
        POOL CARE
      </text>
    </svg>
  );
}
