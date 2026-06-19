/**
 * Server-side PDF generation for the Assessment Wizard (@react-pdf/renderer).
 *
 * This is a LIB FUNCTION, not an API route — it's called inside
 * /api/submit-assessment, not exposed publicly on its own.
 *
 * v1 is TEXT-ONLY by design (photos come in a later pass) which also keeps the
 * serverless function light: no custom fonts (built-in Helvetica only), so no
 * font-fetch cold-start or extra memory on Vercel.
 *
 * Branding (name, NAP) is pulled from content/site.ts — never hardcoded here.
 */
import "server-only";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import { SITE } from "@/content/site";
import type { AssessmentData } from "@/lib/validation/assessment";

const NAVY = "#0f2438";
const TEAL = "#1f8a7e";
const ORANGE = "#d96d1f";
const RED = "#dc2626";
const GREY = "#6b7280";

const RATING_COLOR: Record<string, string> = {
  GOOD: TEAL,
  MONITOR: ORANGE,
  ATTENTION: RED,
  "N/A": GREY,
};

const s = StyleSheet.create({
  page: { padding: 36, fontSize: 10, color: NAVY, lineHeight: 1.4 },
  headerBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderBottomWidth: 2,
    borderBottomColor: TEAL,
    paddingBottom: 8,
    marginBottom: 14,
  },
  brand: { fontSize: 20, fontWeight: "bold", color: NAVY },
  brandSub: { fontSize: 9, color: GREY },
  docTitle: { fontSize: 12, fontWeight: "bold", color: TEAL },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: NAVY,
    marginTop: 14,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingBottom: 3,
  },
  row: { flexDirection: "row", marginBottom: 2 },
  label: { width: 130, color: GREY },
  value: { flex: 1 },
  sectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: "#eee",
  },
  badge: { fontWeight: "bold" },
  note: { color: GREY, fontStyle: "italic", marginTop: 1 },
  recItem: { marginBottom: 4 },
  overallBox: {
    backgroundColor: NAVY,
    color: "#fff",
    padding: 10,
    borderRadius: 4,
    marginBottom: 6,
  },
  overallLabel: { fontSize: 16, fontWeight: "bold", color: "#fff" },
  certBox: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 4,
    padding: 10,
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 36,
    right: 36,
    fontSize: 8,
    color: GREY,
    textAlign: "center",
    borderTopWidth: 0.5,
    borderTopColor: "#e5e7eb",
    paddingTop: 6,
  },
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

function AssessmentReport({ data }: { data: AssessmentData }) {
  const { property, details, config, sections, chemistry, recommendations, overall, certification } =
    data;

  return (
    <Document title={`${SITE.shortName} Pool Assessment — ${property.customerName}`}>
      <Page size="A4" style={s.page}>
        <View style={s.headerBar}>
          <View>
            <Text style={s.brand}>{SITE.name}</Text>
            <Text style={s.brandSub}>
              {SITE.address.city}, {SITE.address.state} · {SITE.phone} · {SITE.domain}
            </Text>
          </View>
          <Text style={s.docTitle}>Pool Condition Assessment</Text>
        </View>

        <View style={s.overallBox}>
          <Text style={{ fontSize: 8, color: "#cbd5e1" }}>OVERALL CONDITION</Text>
          <Text style={s.overallLabel}>{overall.label}</Text>
          <Text style={{ fontSize: 9, color: "#cbd5e1" }}>
            {overall.counts.GOOD} good · {overall.counts.MONITOR} monitor ·{" "}
            {overall.counts.ATTENTION} attention · {overall.counts["N/A"]} n/a
          </Text>
        </View>

        <Text style={s.sectionTitle}>Property</Text>
        <Info label="Customer" value={property.customerName} />
        <Info label="Service Address" value={property.serviceAddress} />
        <Info
          label="City / ZIP"
          value={[property.city, property.zip].filter(Boolean).join(" ") || undefined}
        />
        <Info label="Primary Pool Type" value={property.poolType} />
        <Info label="Approx. Size" value={property.poolSize} />
        <Info
          label="Last Water Change"
          value={property.lastWaterChangeUnknown ? "Unknown" : property.lastWaterChange}
        />
        {property.additionalBodies.map((b, i) => (
          <Info
            key={i}
            label={`Add'l Body #${i + 1}`}
            value={[b.poolType, b.size].filter(Boolean).join(" · ") || "—"}
          />
        ))}

        <Text style={s.sectionTitle}>Inspection Details</Text>
        <Info label="Session" value={details.session} />
        <Info
          label="Date / Time"
          value={[details.date, details.time].filter(Boolean).join(" ") || undefined}
        />
        <Info label="Inspector" value={details.inspectorName} />

        <Text style={s.sectionTitle}>Configuration</Text>
        <Info label="Surface" value={config.surfaces.join(", ") || "—"} />
        <Info label="Sanitization" value={config.sanitization.join(", ") || "—"} />
        <Info label="Features" value={config.features.join(", ") || "—"} />

        <Text style={s.sectionTitle}>Inspection Sections</Text>
        {sections.map((sec) => (
          <View key={sec.id} wrap={false}>
            <View style={s.sectionRow}>
              <Text>{sec.title}</Text>
              <Text style={[s.badge, { color: RATING_COLOR[sec.rating ?? "N/A"] }]}>
                {sec.rating ?? "—"}
              </Text>
            </View>
            {sec.notes ? <Text style={s.note}>{sec.notes}</Text> : null}
          </View>
        ))}

        <Text style={s.sectionTitle}>Water Chemistry</Text>
        {chemistry.map((c) => (
          <View key={c.key} style={s.sectionRow}>
            <Text style={{ flex: 2 }}>{c.label}</Text>
            <Text style={{ flex: 1 }}>{c.reading || "—"}</Text>
            <Text style={{ flex: 1, color: GREY }}>Ideal {c.ideal}</Text>
            <Text style={[s.badge, { width: 60, textAlign: "right", color: RATING_COLOR[c.rating ?? "N/A"] }]}>
              {c.rating ?? "—"}
            </Text>
          </View>
        ))}

        <Text style={s.sectionTitle}>Recommendations</Text>
        <Text style={{ fontWeight: "bold", color: RED, marginBottom: 3 }}>
          Priority 1 — Recommend Promptly
        </Text>
        {recommendations.p1.length === 0 ? (
          <Text style={s.note}>None.</Text>
        ) : (
          recommendations.p1.map((r, i) => (
            <Text key={i} style={s.recItem}>
              • {r.item || "—"}
              {r.investment ? `  (${r.investment})` : ""}
              {r.timeframe ? `  — ${r.timeframe}` : ""}
            </Text>
          ))
        )}
        <Text style={{ fontWeight: "bold", color: ORANGE, marginTop: 6, marginBottom: 3 }}>
          Priority 2 — Monitor / Within 90 Days
        </Text>
        {recommendations.p2.length === 0 ? (
          <Text style={s.note}>None.</Text>
        ) : (
          recommendations.p2.map((r, i) => (
            <Text key={i} style={s.recItem}>
              • {r.item || "—"}
              {r.investment ? `  (${r.investment})` : ""}
              {r.timeframe ? `  — ${r.timeframe}` : ""}
            </Text>
          ))
        )}
        {recommendations.overallNotes ? (
          <>
            <Text style={{ fontWeight: "bold", marginTop: 6 }}>Overall Assessment Notes</Text>
            <Text>{recommendations.overallNotes}</Text>
          </>
        ) : null}

        <View style={s.certBox}>
          <Text style={{ fontWeight: "bold", marginBottom: 3 }}>Inspector Certification</Text>
          <Text>
            I certify that this report represents my honest assessment of the pool and equipment at
            the time of inspection.
          </Text>
          <Text style={{ marginTop: 6 }}>
            {certification.inspectorName}
            {certification.date ? `  ·  ${certification.date}` : ""}
          </Text>
        </View>

        <Text style={s.footer} fixed>
          {SITE.name} · {SITE.phone} · {SITE.email} — Generated for {property.customerName}
        </Text>
      </Page>
    </Document>
  );
}

export async function generateAssessmentPdf(data: AssessmentData): Promise<Buffer> {
  return renderToBuffer(<AssessmentReport data={data} />);
}
