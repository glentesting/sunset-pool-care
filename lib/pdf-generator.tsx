/**
 * Server-side PDF generation for the Assessment Wizard (@react-pdf/renderer).
 *
 * This is a LIB FUNCTION, not an API route — it's called inside
 * /api/submit-assessment, not exposed publicly on its own.
 *
 * Premium customer-facing report, restrained re-skin: clean white surfaces,
 * navy + minimal accent, generous whitespace, hairline rules, color used only
 * as small dots / quiet text (no filled "candy" chips). Section photos embedded.
 *
 * Fonts: built-in Helvetica only (no font registration) for serverless
 * reliability + light cold-start. So the PDF face differs from the on-screen
 * Bricolage/Inter by design.
 *
 * Colors below MIRROR the CSS tokens in app/globals.css — @react-pdf can't read
 * CSS variables, so keep these in sync if the brand palette changes.
 *
 * Branding (name, NAP) is pulled from content/site.ts — never hardcoded here.
 */
import "server-only";
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

const s = StyleSheet.create({
  page: { paddingTop: 40, paddingBottom: 52, paddingHorizontal: 44, fontSize: 10, color: NAVY, fontFamily: "Helvetica", lineHeight: 1.5 },

  // Header
  header: { borderBottomWidth: 1.5, borderBottomColor: TEAL, paddingBottom: 10, marginBottom: 18 },
  brand: { fontSize: 19, fontFamily: "Helvetica-Bold", color: NAVY },
  brandSub: { fontSize: 8, color: GREY, marginTop: 3 },
  docTitle: { fontSize: 8, fontFamily: "Helvetica-Bold", color: TEAL, letterSpacing: 1.5, marginTop: 8 },

  // Dashboard
  dash: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", borderWidth: 1, borderColor: LINE, borderRadius: 6, padding: 14, marginBottom: 8 },
  kicker: { fontSize: 7.5, color: GREY, textTransform: "uppercase", letterSpacing: 1 },
  overallLabel: { fontSize: 17, fontFamily: "Helvetica-Bold", marginTop: 2 },
  counts: { flexDirection: "row" },
  countCell: { alignItems: "center", width: 50 },
  countNum: { fontSize: 15, fontFamily: "Helvetica-Bold", color: NAVY },
  countRow: { flexDirection: "row", alignItems: "center", marginTop: 2 },
  dot: { width: 4, height: 4, borderRadius: 2, marginRight: 3 },
  countLabel: { fontSize: 7, color: GREY },

  sectionTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", color: GREY, textTransform: "uppercase", letterSpacing: 1, marginTop: 22, marginBottom: 8 },

  row: { flexDirection: "row", marginBottom: 3 },
  label: { width: 120, color: GREY },
  value: { flex: 1 },

  secRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: LINE },
  ratingTag: { flexDirection: "row", alignItems: "center" },
  ratingText: { fontSize: 9, fontFamily: "Helvetica-Bold" },
  note: { color: GREY, marginTop: 2, marginBottom: 2 },

  photoWrap: { flexDirection: "row", flexWrap: "wrap", marginTop: 6, marginBottom: 4 },
  photoBox: { width: 148, marginRight: 9, marginBottom: 9 },
  photo: { width: 148, height: 108, objectFit: "cover", borderRadius: 4, borderWidth: 0.5, borderColor: LINE },
  photoCaption: { fontSize: 7, color: GREY, marginTop: 3 },

  tHead: { flexDirection: "row", paddingBottom: 5, borderBottomWidth: 1, borderBottomColor: LINE },
  tHeadCell: { fontSize: 7.5, color: GREY, textTransform: "uppercase", letterSpacing: 0.5 },
  tRow: { flexDirection: "row", paddingVertical: 5, borderBottomWidth: 0.5, borderBottomColor: LINE, alignItems: "center" },

  recBlockTitle: { fontSize: 10, fontFamily: "Helvetica-Bold", marginTop: 10, marginBottom: 5 },
  recItem: { flexDirection: "row", marginBottom: 5 },
  recAccent: { width: 2, borderRadius: 1, marginRight: 8 },
  recText: { flex: 1 },
  recMeta: { fontSize: 8, color: GREY, marginTop: 1 },

  certBox: { marginTop: 22, borderTopWidth: 1, borderTopColor: LINE, paddingTop: 10 },

  footer: { position: "absolute", bottom: 26, left: 44, right: 44, fontSize: 7.5, color: GREY, textAlign: "center", borderTopWidth: 0.5, borderTopColor: LINE, paddingTop: 7 },
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

function RatingTag({ rating }: { rating?: AssessmentData["sections"][number]["rating"] }) {
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

function Photos({ photos }: { photos: { label: string; dataUrl: string }[] }) {
  if (!photos.length) return null;
  return (
    <View style={s.photoWrap}>
      {photos.map((p, i) => (
        <View key={i} style={s.photoBox} wrap={false}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src={p.dataUrl} style={s.photo} />
          <Text style={s.photoCaption}>{p.label}</Text>
        </View>
      ))}
    </View>
  );
}

function AssessmentReport({ data }: { data: AssessmentData }) {
  const { property, details, config, configPhotos, sections, chemistry, recommendations, overall, certification } = data;
  const order: ("GOOD" | "MONITOR" | "ATTENTION" | "N/A")[] = ["GOOD", "MONITOR", "ATTENTION", "N/A"];

  return (
    <Document title={`${SITE.shortName} Pool Assessment — ${property.customerName}`}>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.brand}>{SITE.name}</Text>
          <Text style={s.brandSub}>
            {SITE.address.street}, {SITE.address.city}, {SITE.address.state} {SITE.address.zip} · {SITE.phone} · {SITE.domain}
          </Text>
          <Text style={s.docTitle}>POOL CONDITION ASSESSMENT</Text>
        </View>

        {/* Condition dashboard — calm */}
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

        {/* Property */}
        <Text style={s.sectionTitle}>Property</Text>
        <Info label="Customer" value={property.customerName} />
        <Info label="Service Address" value={property.serviceAddress} />
        <Info label="City / ZIP" value={[property.city, property.zip].filter(Boolean).join(" ") || undefined} />
        <Info label="Primary Pool Type" value={property.poolType} />
        <Info label="Approx. Size" value={property.poolSize} />
        <Info label="Last Water Change" value={property.lastWaterChangeUnknown ? "Unknown" : property.lastWaterChange} />
        {property.additionalBodies.map((b, i) => (
          <Info key={i} label={`Add'l Body #${i + 1}`} value={[b.poolType, b.size].filter(Boolean).join(" · ") || "—"} />
        ))}

        {/* Inspection details */}
        <Text style={s.sectionTitle}>Inspection Details</Text>
        <Info label="Session" value={details.session} />
        <Info label="Date / Time" value={[details.date, details.time].filter(Boolean).join(" ") || undefined} />
        <Info label="Inspector" value={details.inspectorName} />

        {/* Configuration */}
        <Text style={s.sectionTitle}>Configuration</Text>
        <Info label="Surface" value={config.surfaces.join(", ") || "—"} />
        <Info label="Sanitization" value={config.sanitization.join(", ") || "—"} />
        <Info label="Features" value={config.features.join(", ") || "—"} />
        <Photos photos={configPhotos} />

        {/* Inspection sections */}
        <Text style={s.sectionTitle}>Inspection Sections</Text>
        {sections.map((sec) => (
          <View key={sec.id} wrap={false}>
            <View style={s.secRow}>
              <Text style={{ fontFamily: "Helvetica-Bold" }}>{sec.title}</Text>
              <RatingTag rating={sec.rating} />
            </View>
            {sec.notes ? <Text style={s.note}>{sec.notes}</Text> : null}
            <Photos photos={sec.photos} />
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
          <Text style={{ fontFamily: "Helvetica-Bold", marginBottom: 3 }}>Inspector Certification</Text>
          <Text style={{ color: GREY }}>
            I certify that this report represents my honest assessment of the pool and equipment at the time
            of inspection.
          </Text>
          <Text style={{ marginTop: 6, fontFamily: "Helvetica-Bold" }}>
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
