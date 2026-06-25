/**
 * Server-side PDF generation for the Assessment Wizard (@react-pdf/renderer).
 *
 * This is a LIB FUNCTION, not an API route — it's called inside
 * /api/submit-assessment, not exposed publicly on its own.
 *
 * Premium customer-facing report — DENSE ~2-page layout: compact condition band,
 * two-column property/inspection meta, a SINGLE pass over sections (plain
 * Good/N-A systems list compactly; only flagged-or-noted sections get an
 * expanded block), and small photo thumbnails placed INLINE beside the section
 * text rather than as full-width blocks. Clean, legible dark-on-white kept.
 *
 * Fonts: built-in Helvetica only (no font registration) for serverless
 * reliability + light cold-start.
 *
 * Colors below MIRROR the CSS tokens in app/globals.css — @react-pdf can't read
 * CSS variables, so keep these in sync if the brand palette changes.
 *
 * Branding (name, NAP) is pulled from content/site.ts — never hardcoded here.
 */
import "server-only";
import fs from "node:fs";
import path from "node:path";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import { SITE } from "@/content/site";
import type { AssessmentData } from "@/lib/validation/assessment";

// Load a logo from public/ once as a data URL (most reliable src across
// react-pdf versions / serverless). Returns null if unreadable so the report
// still generates with zero deps.
function loadLogo(filename: string): string | null {
  try {
    const file = path.join(process.cwd(), "public", filename);
    return `data:image/png;base64,${fs.readFileSync(file).toString("base64")}`;
  } catch {
    return null;
  }
}
// Visible header = the real current colorful badge (square, 600×600).
const HEADER_LOGO = loadLogo("spc-logo-color.png");
// Watermark = the simple navy line-art mark (2400×2000, ratio 1.2) — a plain
// outline reads far cleaner as a faint background than the detailed badge.
const WATERMARK_LOGO = loadLogo("spc-logo-navy.png");
const WATERMARK_RATIO = 1.2;

// Mirror of globals.css @theme tokens.
const NAVY = "#0f2438";
const TEAL = "#1f8a7e";
const GOOD = "#1f9d57";
const MONITOR = "#a8730a";
const ATTENTION = "#b91c1c";
const STONE = "#586573"; // darkened for legible "N/A" + secondary text on white
const GREY = "#44505f"; // labels / notes / captions — strong dark-on-white, not faint
const LINE = "#cdd2d8"; // table + section rules, clearly visible

const RATING_COLOR: Record<string, string> = { GOOD, MONITOR, ATTENTION, "N/A": STONE };
const RATING_LABEL: Record<string, string> = {
  GOOD: "Good",
  MONITOR: "Monitor",
  ATTENTION: "Attn",
  "N/A": "N/A",
};
const OVERALL_COLOR: Record<string, string> = {
  "not-rated": STONE,
  good: GOOD,
  monitor: MONITOR,
  attention: ATTENTION,
};

type Section = AssessmentData["sections"][number];

const s = StyleSheet.create({
  page: { paddingTop: 34, paddingBottom: 42, paddingHorizontal: 40, fontSize: 9.5, color: NAVY, fontFamily: "Helvetica", lineHeight: 1.32 },

  // Header
  header: { borderBottomWidth: 1.5, borderBottomColor: TEAL, paddingBottom: 8, marginBottom: 10 },
  logo: { height: 80, width: 80, objectFit: "contain", marginBottom: 6 },
  brand: { fontSize: 18, fontFamily: "Helvetica-Bold", color: NAVY, marginBottom: 4 },
  brandSub: { fontSize: 7.5, color: GREY, lineHeight: 1.3 },
  docTitle: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: TEAL, letterSpacing: 1.5, marginTop: 6 },

  // Faint full-page watermark (behind all content, repeated via `fixed`)
  watermark: { position: "absolute", top: 268, left: (595 - 360) / 2, width: 360, height: 360 / WATERMARK_RATIO, opacity: 0.05 },
  watermarkImg: { width: 360, height: 360 / WATERMARK_RATIO, objectFit: "contain" },

  // Compact condition band
  dash: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: LINE, borderRadius: 5, paddingVertical: 7, paddingHorizontal: 11, marginBottom: 12 },
  kicker: { fontSize: 7, color: GREY, textTransform: "uppercase", letterSpacing: 1 },
  overallLabel: { fontSize: 14, fontFamily: "Helvetica-Bold", marginTop: 1 },
  counts: { flexDirection: "row" },
  countCell: { alignItems: "center", width: 46 },
  countNum: { fontSize: 13, fontFamily: "Helvetica-Bold", color: NAVY },
  countRow: { flexDirection: "row", alignItems: "center", marginTop: 1 },
  dot: { width: 4, height: 4, borderRadius: 2, marginRight: 3 },
  countLabel: { fontSize: 6.5, color: GREY },

  // Two-column meta
  metaRow: { flexDirection: "row" },
  metaCol: { flex: 1 },
  metaColGap: { width: 18 },

  sectionTitle: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: GREY, textTransform: "uppercase", letterSpacing: 1, marginTop: 13, marginBottom: 4 },
  colTitle: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: GREY, textTransform: "uppercase", letterSpacing: 1, marginBottom: 3 },

  row: { flexDirection: "row", marginBottom: 1 },
  label: { width: 74, color: GREY },
  value: { flex: 1 },

  // Compact "all good" systems grid (2 columns)
  compactWrap: { flexDirection: "row", flexWrap: "wrap", marginTop: 1 },
  compactItem: { width: "50%", flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingRight: 14, paddingVertical: 1.5 },
  subLabel: { fontSize: 7, color: GREY, marginTop: 6, marginBottom: 1 },

  // Detailed (flagged/noted) section blocks
  detail: { marginTop: 6, paddingBottom: 5, borderBottomWidth: 0.5, borderBottomColor: LINE },
  detailRow: { flexDirection: "row", alignItems: "flex-start" },
  detailMain: { flex: 1, paddingRight: 8 },
  detailHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  detailThumbs: { flexDirection: "row", flexWrap: "wrap", width: 200, justifyContent: "flex-end" },

  ratingTag: { flexDirection: "row", alignItems: "center" },
  ratingText: { fontSize: 8.5, fontFamily: "Helvetica-Bold" },
  note: { color: GREY, marginTop: 2 },

  thumbBox: { width: 92, marginLeft: 6, marginBottom: 4 },
  thumb: { width: 92, height: 68, objectFit: "cover", borderRadius: 3, borderWidth: 0.5, borderColor: LINE },
  thumbCap: { fontSize: 6, color: GREY, marginTop: 1 },

  // Chemistry table
  tHead: { flexDirection: "row", paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: LINE },
  tHeadCell: { fontSize: 7, color: GREY, textTransform: "uppercase", letterSpacing: 0.5 },
  tRow: { flexDirection: "row", paddingVertical: 3.5, borderBottomWidth: 0.5, borderBottomColor: LINE, alignItems: "center" },

  recBlockTitle: { fontSize: 9.5, fontFamily: "Helvetica-Bold", marginTop: 7, marginBottom: 3 },
  recItem: { flexDirection: "row", marginBottom: 3 },
  recAccent: { width: 2, borderRadius: 1, marginRight: 7 },
  recText: { flex: 1 },
  recMeta: { fontSize: 7.5, color: GREY, marginTop: 1 },

  certBox: { marginTop: 13, borderTopWidth: 1, borderTopColor: LINE, paddingTop: 8 },

  footer: { position: "absolute", bottom: 22, left: 40, right: 40, fontSize: 7, color: GREY, textAlign: "center", borderTopWidth: 0.5, borderTopColor: LINE, paddingTop: 6 },
});

function Info({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <View style={s.row}>
      <Text style={s.label}>{label}</Text>
      <Text style={s.value}>{value}</Text>
    </View>
  );
}

function RatingTag({ rating }: { rating?: Section["rating"] }) {
  const color = RATING_COLOR[rating ?? "N/A"];
  return (
    <View style={s.ratingTag}>
      {rating ? <View style={[s.dot, { backgroundColor: color }]} /> : null}
      <Text style={[s.ratingText, { color: rating ? color : STONE }]}>
        {rating ? RATING_LABEL[rating] : "—"}
      </Text>
    </View>
  );
}

function Thumbs({ photos }: { photos: Section["photos"] }) {
  if (!photos.length) return null;
  return (
    <View style={s.detailThumbs}>
      {photos.map((p, i) => (
        <View key={i} style={s.thumbBox} wrap={false}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src={p.dataUrl} style={s.thumb} />
          <Text style={s.thumbCap}>{p.label}</Text>
        </View>
      ))}
    </View>
  );
}

/** A section is "notable" (gets an expanded block) if flagged, noted, or has a photo. */
function isNotable(sec: Section): boolean {
  return sec.rating === "MONITOR" || sec.rating === "ATTENTION" || !!sec.notes || sec.photos.length > 0;
}

function AssessmentReport({ data }: { data: AssessmentData }) {
  const { property, details, config, configPhotos, sections, chemistry, recommendations, overall, certification } = data;
  const order: ("GOOD" | "MONITOR" | "ATTENTION" | "N/A")[] = ["GOOD", "MONITOR", "ATTENTION", "N/A"];

  const notable = sections.filter(isNotable);
  const plain = sections.filter((sec) => !isNotable(sec));

  return (
    <Document title={`${SITE.shortName} Pool Assessment — ${property.customerName}`}>
      <Page size="A4" style={s.page}>
        {/* Faint branding watermark (navy line-art) — first child so it paints
            behind content, `fixed` so it repeats on every page. */}
        {WATERMARK_LOGO && (
          <View style={s.watermark} fixed>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={WATERMARK_LOGO} style={s.watermarkImg} />
          </View>
        )}

        {/* Header — real current logo (the badge already contains the name) */}
        <View style={s.header}>
          {HEADER_LOGO ? (
            /* eslint-disable-next-line jsx-a11y/alt-text */
            <Image src={HEADER_LOGO} style={s.logo} />
          ) : (
            <Text style={s.brand}>{SITE.name}</Text>
          )}
          <Text style={s.brandSub}>
            {SITE.address.street}, {SITE.address.city}, {SITE.address.state} {SITE.address.zip} · {SITE.phone} · {SITE.domain}
          </Text>
          <Text style={s.docTitle}>POOL CONDITION ASSESSMENT</Text>
        </View>

        {/* Compact condition band */}
        <View style={s.dash}>
          <View>
            <Text style={s.kicker}>Overall Condition</Text>
            <Text style={[s.overallLabel, { color: OVERALL_COLOR[overall.key] }]}>{overall.label}</Text>
          </View>
          <View style={s.counts}>
            {order.map((r) => (
              <View key={r} style={s.countCell}>
                <Text style={s.countNum}>{overall.counts[r]}</Text>
                <View style={s.countRow}>
                  <View style={[s.dot, { backgroundColor: RATING_COLOR[r] }]} />
                  <Text style={s.countLabel}>{RATING_LABEL[r]}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Two-column meta: Property | Inspection + Configuration */}
        <View style={s.metaRow}>
          <View style={s.metaCol}>
            <Text style={s.colTitle}>Property</Text>
            <Info label="Customer" value={property.customerName} />
            <Info label="Address" value={property.serviceAddress} />
            <Info label="City / ZIP" value={[property.city, property.zip].filter(Boolean).join(" ") || undefined} />
            <Info label="Pool Type" value={property.poolType} />
            <Info label="Approx. Size" value={property.poolSize} />
            <Info label="Last Change" value={property.lastWaterChangeUnknown ? "Unknown" : property.lastWaterChange} />
            {property.additionalBodies.map((b, i) => (
              <Info key={i} label={`Body #${i + 1}`} value={[b.poolType, b.size].filter(Boolean).join(" · ") || "—"} />
            ))}
          </View>
          <View style={s.metaColGap} />
          <View style={s.metaCol}>
            <Text style={s.colTitle}>Inspection</Text>
            <Info label="Session" value={details.session} />
            <Info label="Date / Time" value={[details.date, details.time].filter(Boolean).join(" ") || undefined} />
            <Info label="Inspector" value={details.inspectorName} />

            <Text style={[s.colTitle, { marginTop: 8 }]}>Configuration</Text>
            <Info label="Surface" value={config.surfaces.join(", ") || "—"} />
            <Info label="Sanitization" value={config.sanitization.join(", ") || "—"} />
            <Info label="Features" value={config.features.join(", ") || "—"} />
          </View>
        </View>

        {configPhotos.length > 0 && (
          <View style={{ marginTop: 6 }}>
            <Thumbs photos={configPhotos} />
          </View>
        )}

        {/* Inspection sections — single pass */}
        <Text style={s.sectionTitle}>Inspection Sections</Text>

        {/* Plain Good/N-A systems: compact 2-column list */}
        {plain.length > 0 && (
          <View style={s.compactWrap}>
            {plain.map((sec) => (
              <View key={sec.id} style={s.compactItem}>
                <Text>{sec.title}</Text>
                <RatingTag rating={sec.rating} />
              </View>
            ))}
          </View>
        )}

        {/* Notable sections: expanded block with inline thumbnails */}
        {notable.length > 0 && plain.length > 0 && (
          <Text style={s.subLabel}>Items needing attention or with notes</Text>
        )}
        {notable.map((sec) => (
          <View key={sec.id} style={s.detail} wrap={false}>
            <View style={s.detailRow}>
              <View style={s.detailMain}>
                <View style={s.detailHead}>
                  <Text style={{ fontFamily: "Helvetica-Bold" }}>{sec.title}</Text>
                  <RatingTag rating={sec.rating} />
                </View>
                {sec.notes ? <Text style={s.note}>{sec.notes}</Text> : null}
              </View>
              <Thumbs photos={sec.photos} />
            </View>
          </View>
        ))}

        {/* Chemistry table */}
        <Text style={s.sectionTitle}>Water Chemistry</Text>
        <View style={s.tHead}>
          <Text style={[s.tHeadCell, { flex: 2 }]}>Parameter</Text>
          <Text style={[s.tHeadCell, { flex: 1 }]}>Reading</Text>
          <Text style={[s.tHeadCell, { flex: 1 }]}>Ideal</Text>
          <Text style={[s.tHeadCell, { width: 52, textAlign: "right" }]}>Status</Text>
        </View>
        {chemistry.map((c) => (
          <View key={c.key} style={s.tRow}>
            <Text style={{ flex: 2 }}>{c.label}</Text>
            <Text style={{ flex: 1, fontFamily: "Helvetica-Bold" }}>{c.reading || "—"}</Text>
            <Text style={{ flex: 1, color: GREY }}>{c.ideal}</Text>
            <Text style={{ width: 52, textAlign: "right", fontFamily: "Helvetica-Bold", color: c.rating ? RATING_COLOR[c.rating] : STONE }}>
              {c.rating ? RATING_LABEL[c.rating] : "—"}
            </Text>
          </View>
        ))}

        {/* Recommendations */}
        <Text style={s.sectionTitle}>Recommendations</Text>
        <Text style={[s.recBlockTitle, { color: ATTENTION, marginTop: 2 }]}>Priority 1 — Recommend Promptly</Text>
        {recommendations.p1.length === 0 ? (
          <Text style={s.note}>None.</Text>
        ) : (
          recommendations.p1.map((r, i) => (
            <View key={i} style={s.recItem}>
              <View style={[s.recAccent, { backgroundColor: ATTENTION }]} />
              <View style={s.recText}>
                <Text style={{ fontFamily: "Helvetica-Bold" }}>{r.item || "—"}</Text>
                <Text style={s.recMeta}>{[r.investment && `Est. ${r.investment}`, r.timeframe].filter(Boolean).join("   ·   ")}</Text>
              </View>
            </View>
          ))
        )}
        <Text style={[s.recBlockTitle, { color: MONITOR }]}>Priority 2 — Monitor / Within 90 Days</Text>
        {recommendations.p2.length === 0 ? (
          <Text style={s.note}>None.</Text>
        ) : (
          recommendations.p2.map((r, i) => (
            <View key={i} style={s.recItem}>
              <View style={[s.recAccent, { backgroundColor: MONITOR }]} />
              <View style={s.recText}>
                <Text style={{ fontFamily: "Helvetica-Bold" }}>{r.item || "—"}</Text>
                <Text style={s.recMeta}>{[r.investment && `Est. ${r.investment}`, r.timeframe].filter(Boolean).join("   ·   ")}</Text>
              </View>
            </View>
          ))
        )}
        {recommendations.overallNotes ? (
          <>
            <Text style={[s.recBlockTitle, { color: NAVY }]}>Overall Assessment Notes</Text>
            <Text>{recommendations.overallNotes}</Text>
          </>
        ) : null}

        {/* Certification */}
        <View style={s.certBox} wrap={false}>
          <Text style={{ fontFamily: "Helvetica-Bold", marginBottom: 2 }}>Inspector Certification</Text>
          <Text style={{ color: GREY }}>
            I certify that this report represents my honest assessment of the pool and equipment at the time
            of inspection.
          </Text>
          <Text style={{ marginTop: 5, fontFamily: "Helvetica-Bold" }}>
            {certification.inspectorName}
            {certification.date ? `   ·   ${certification.date}` : ""}
          </Text>
        </View>

        <Text style={s.footer} fixed>
          {SITE.name} · {SITE.phone} · {SITE.email} — Prepared for {property.customerName}
        </Text>
      </Page>
    </Document>
  );
}

export async function generateAssessmentPdf(data: AssessmentData): Promise<Buffer> {
  return renderToBuffer(<AssessmentReport data={data} />);
}
