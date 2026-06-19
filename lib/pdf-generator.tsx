/**
 * Server-side PDF generation for the Assessment Wizard (@react-pdf/renderer).
 *
 * This is a LIB FUNCTION, not an API route — it's called inside
 * /api/submit-assessment, not exposed publicly on its own.
 *
 * v2 — premium customer-facing report: branded header, color-coded condition
 * dashboard, per-section ratings in color, chemistry pass/fail table, priority-
 * styled recommendations, certification block, and EMBEDDED section photos.
 *
 * Fonts: built-in Helvetica only (no next/font here, no font registration) to
 * keep the serverless function light — @react-pdf font fetching adds cold-start
 * weight. So the PDF face differs from the on-screen Bricolage/Inter by design.
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
const MONITOR = "#b9760a";
const ATTENTION = "#dc2626";
const STONE = "#8a94a0";
const SAND = "#f6f4ef";
const GREY = "#6b7280";

const RATING_COLOR: Record<string, string> = {
  GOOD,
  MONITOR,
  ATTENTION,
  "N/A": STONE,
};
const RATING_SHORT: Record<string, string> = {
  GOOD: "GOOD",
  MONITOR: "MONITOR",
  ATTENTION: "ATTN",
  "N/A": "N/A",
};
const OVERALL_COLOR: Record<string, string> = {
  "not-rated": STONE,
  good: GOOD,
  monitor: MONITOR,
  attention: ATTENTION,
};

const s = StyleSheet.create({
  page: { paddingTop: 0, paddingBottom: 48, paddingHorizontal: 0, fontSize: 10, color: NAVY, fontFamily: "Helvetica" },
  body: { paddingHorizontal: 36 },

  // Header band
  header: { backgroundColor: NAVY, color: "#fff", paddingHorizontal: 36, paddingVertical: 22 },
  brand: { fontSize: 22, fontFamily: "Helvetica-Bold", color: "#fff" },
  brandSub: { fontSize: 8, color: "#9fb2c4", marginTop: 2 },
  docTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", color: TEAL, marginTop: 10 },

  // Dashboard
  dash: { flexDirection: "row", marginTop: 16, gap: 10 },
  overallCard: { flex: 1, borderRadius: 6, borderWidth: 1, borderColor: "#e5e7eb", padding: 12, justifyContent: "center" },
  overallKicker: { fontSize: 8, color: GREY, textTransform: "uppercase", letterSpacing: 1 },
  overallLabel: { fontSize: 18, fontFamily: "Helvetica-Bold", marginTop: 2 },
  chips: { flexDirection: "row", gap: 6 },
  chip: { borderRadius: 6, paddingVertical: 8, paddingHorizontal: 4, alignItems: "center", width: 58 },
  chipNum: { fontSize: 18, fontFamily: "Helvetica-Bold", color: "#fff" },
  chipLabel: { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#fff", marginTop: 1 },

  sectionTitle: { fontSize: 12, fontFamily: "Helvetica-Bold", color: NAVY, marginTop: 18, marginBottom: 6, borderBottomWidth: 2, borderBottomColor: TEAL, paddingBottom: 3 },

  row: { flexDirection: "row", marginBottom: 2 },
  label: { width: 130, color: GREY },
  value: { flex: 1 },

  secRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 5, borderBottomWidth: 0.5, borderBottomColor: "#eee" },
  pill: { color: "#fff", fontSize: 8, fontFamily: "Helvetica-Bold", paddingVertical: 2, paddingHorizontal: 6, borderRadius: 8 },
  note: { color: GREY, fontStyle: "italic", marginTop: 2, marginBottom: 2 },

  photoWrap: { flexDirection: "row", flexWrap: "wrap", marginTop: 4, marginBottom: 4 },
  photoBox: { width: 150, marginRight: 8, marginBottom: 8 },
  photo: { width: 150, height: 110, objectFit: "cover", borderRadius: 4, borderWidth: 1, borderColor: "#e5e7eb" },
  photoCaption: { fontSize: 7, color: GREY, marginTop: 2 },

  // chemistry table
  tHead: { flexDirection: "row", backgroundColor: SAND, paddingVertical: 4, paddingHorizontal: 6, borderRadius: 4 },
  tHeadCell: { fontSize: 8, fontFamily: "Helvetica-Bold", color: NAVY },
  tRow: { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 6, borderBottomWidth: 0.5, borderBottomColor: "#eee", alignItems: "center" },

  recCard: { borderLeftWidth: 3, borderRadius: 4, backgroundColor: SAND, padding: 8, marginBottom: 5 },
  recTitle: { fontFamily: "Helvetica-Bold", fontSize: 11, marginTop: 8, marginBottom: 4 },
  recMeta: { fontSize: 8, color: GREY, marginTop: 2 },

  certBox: { marginTop: 16, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 4, padding: 10 },

  footer: { position: "absolute", bottom: 22, left: 36, right: 36, fontSize: 8, color: GREY, textAlign: "center", borderTopWidth: 0.5, borderTopColor: "#e5e7eb", paddingTop: 6 },
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
        {/* Branded header */}
        <View style={s.header} fixed={false}>
          <Text style={s.brand}>{SITE.name}</Text>
          <Text style={s.brandSub}>
            {SITE.address.street}, {SITE.address.city}, {SITE.address.state} {SITE.address.zip} · {SITE.phone} · {SITE.domain}
          </Text>
          <Text style={s.docTitle}>POOL CONDITION ASSESSMENT</Text>
        </View>

        <View style={s.body}>
          {/* Condition dashboard */}
          <View style={s.dash}>
            <View style={s.overallCard}>
              <Text style={s.overallKicker}>Overall Condition</Text>
              <Text style={[s.overallLabel, { color: OVERALL_COLOR[overall.key] }]}>{overall.label}</Text>
            </View>
            <View style={s.chips}>
              {order.map((r) => (
                <View key={r} style={[s.chip, { backgroundColor: RATING_COLOR[r] }]}>
                  <Text style={s.chipNum}>{overall.counts[r]}</Text>
                  <Text style={s.chipLabel}>{RATING_SHORT[r]}</Text>
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
                <Text style={[s.pill, { backgroundColor: RATING_COLOR[sec.rating ?? "N/A"] }]}>
                  {sec.rating ? RATING_SHORT[sec.rating] : "—"}
                </Text>
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
            <Text style={[s.tHeadCell, { width: 56, textAlign: "right" }]}>Status</Text>
          </View>
          {chemistry.map((c) => (
            <View key={c.key} style={s.tRow}>
              <Text style={{ flex: 2 }}>{c.label}</Text>
              <Text style={{ flex: 1, fontFamily: "Helvetica-Bold", color: c.rating ? RATING_COLOR[c.rating] : NAVY }}>
                {c.reading || "—"}
              </Text>
              <Text style={{ flex: 1, color: GREY }}>{c.ideal}</Text>
              <Text style={{ width: 56, textAlign: "right", fontFamily: "Helvetica-Bold", color: c.rating ? RATING_COLOR[c.rating] : STONE }}>
                {c.rating ? RATING_SHORT[c.rating] : "—"}
              </Text>
            </View>
          ))}

          {/* Recommendations */}
          <Text style={s.sectionTitle}>Recommendations</Text>
          <Text style={[s.recTitle, { color: ATTENTION, marginTop: 2 }]}>Priority 1 — Recommend Promptly</Text>
          {recommendations.p1.length === 0 ? (
            <Text style={s.note}>None.</Text>
          ) : (
            recommendations.p1.map((r, i) => (
              <View key={i} style={[s.recCard, { borderLeftColor: ATTENTION }]}>
                <Text style={{ fontFamily: "Helvetica-Bold" }}>{r.item || "—"}</Text>
                <Text style={s.recMeta}>
                  {[r.investment && `Est. ${r.investment}`, r.timeframe].filter(Boolean).join("  ·  ")}
                </Text>
              </View>
            ))
          )}
          <Text style={[s.recTitle, { color: MONITOR }]}>Priority 2 — Monitor / Within 90 Days</Text>
          {recommendations.p2.length === 0 ? (
            <Text style={s.note}>None.</Text>
          ) : (
            recommendations.p2.map((r, i) => (
              <View key={i} style={[s.recCard, { borderLeftColor: MONITOR }]}>
                <Text style={{ fontFamily: "Helvetica-Bold" }}>{r.item || "—"}</Text>
                <Text style={s.recMeta}>
                  {[r.investment && `Est. ${r.investment}`, r.timeframe].filter(Boolean).join("  ·  ")}
                </Text>
              </View>
            ))
          )}
          {recommendations.overallNotes ? (
            <>
              <Text style={[s.recTitle, { color: NAVY }]}>Overall Assessment Notes</Text>
              <Text>{recommendations.overallNotes}</Text>
            </>
          ) : null}

          {/* Certification */}
          <View style={s.certBox} wrap={false}>
            <Text style={{ fontFamily: "Helvetica-Bold", marginBottom: 3 }}>Inspector Certification</Text>
            <Text>
              I certify that this report represents my honest assessment of the pool and equipment at the time
              of inspection.
            </Text>
            <Text style={{ marginTop: 6, fontFamily: "Helvetica-Bold" }}>
              {certification.inspectorName}
              {certification.date ? `   ·   ${certification.date}` : ""}
            </Text>
          </View>
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
