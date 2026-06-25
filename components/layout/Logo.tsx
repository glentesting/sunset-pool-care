/**
 * SPC sunset wordmark — a lightweight inline SVG mark used in page chrome
 * (navbar + footer). A bold gradient half-sun (coral → gold) over two aqua water
 * lines, beside the "SUNSET POOL CARE" wordmark. Scales crisply at any size.
 *
 * `tone="navy"` → dark wordmark for light surfaces (navbar).
 * `tone="white"` → white wordmark for the navy footer.
 *
 * The detailed badge (emblem.png) is reserved for favicon / OG only.
 */
export default function Logo({
  tone = "navy",
  className = "h-11 w-auto",
}: {
  tone?: "navy" | "white";
  className?: string;
}) {
  const word = tone === "white" ? "fill-white" : "fill-navy";
  const sub = tone === "white" ? "fill-white/75" : "fill-teal-dark";

  return (
    <svg
      viewBox="0 0 168 60"
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

      {/* mark — a bold half-sun over two water lines */}
      <path d="M5 33 A21 21 0 0 1 47 33 Z" fill="url(#spcSun)" />
      <path d="M5 40h44" className="stroke-teal" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M14 47h26" className="stroke-teal" strokeWidth="4.5" strokeLinecap="round" />

      {/* wordmark */}
      <text x="60" y="32" className={`font-display ${word}`} fontSize="21" fontWeight="700" letterSpacing="1.5">
        SUNSET
      </text>
      <text x="61" y="48" className={`font-display ${sub}`} fontSize="11" fontWeight="600" letterSpacing="3.6">
        POOL CARE
      </text>
    </svg>
  );
}
