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

  // AI overview paragraph under the condition band — its own zone (breathing
  // room above; the hairline rule below separates it from the meta block).
  // Subtle hairline divider (wiz-line tone) for premium separation.
  rule: { borderBottomWidth: 0.5, borderBottomColor: LINE, marginTop: 12, marginBottom: 12 },

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
  // Optional caption = the tech's photo label. One line, ellipsized; omitted
  // entirely when empty so it never adds a blank line or shifts spacing.
  thumbCap: { fontSize: 6, color: GREY, marginTop: 2, width: 92, maxLines: 1, textOverflow: "ellipsis" },

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

// Per-item report styles (Pass 3).
const r = StyleSheet.create({
  secBlock: { marginBottom: 7 },
  secHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: LINE,
    paddingBottom: 2,
    marginTop: 11,
    marginBottom: 3,
  },
  secTitle: { fontSize: 10, fontFamily: "Helvetica-Bold", color: NAVY },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 1.6,
    borderBottomWidth: 0.25,
    borderBottomColor: LINE,
  },
  itemMain: { flex: 1, paddingRight: 10 },
  itemLabel: { fontSize: 9 },
  itemNote: { fontSize: 8, color: GREY, marginTop: 0.5 },
  unitHead: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: TEAL, marginTop: 5, marginBottom: 1 },
  unitNote: { fontSize: 8, color: GREY, marginBottom: 1 },
  secNote: { fontSize: 8.5, color: GREY, marginTop: 3, lineHeight: 1.4 },
  badge: { fontSize: 8.5, fontFamily: "Helvetica-Bold", minWidth: 34, textAlign: "right" },
  photoStrip: { flexDirection: "row", flexWrap: "wrap", marginTop: 4 },
  bandCaption: { fontSize: 6, color: GREY, textAlign: "center", marginTop: 1 },
});

/** Item badge: binary items show YES/NO; condition items show the rating word. */
function ItemBadge({ status, answer }: { status?: string; answer?: "yes" | "no" }) {
  const color = status ? RATING_COLOR[status] : STONE;
  const text = answer ? answer.toUpperCase() : status ? RATING_LABEL[status] : "—";
  return <Text style={[r.badge, { color }]}>{text}</Text>;
}

type Item = Section["items"][number];

function ItemRows({ items }: { items: Item[] }) {
  return (
    <>
      {items.map((it, i) => {
        const label = it.reading
          ? `${it.label} — ${it.reading}${it.readingUnit ? ` ${it.readingUnit}` : ""}`
          : it.label;
        return (
          <View key={i} style={r.itemRow} wrap={false}>
            <View style={r.itemMain}>
              <Text style={r.itemLabel}>{label}</Text>
              {it.note?.trim() ? <Text style={r.itemNote}>{it.note.trim()}</Text> : null}
            </View>
            <ItemBadge status={it.status} answer={it.answer} />
          </View>
        );
      })}
    </>
  );
}

function PhotoStrip({ photos }: { photos: Section["photos"] }) {
  if (!photos.length) return null;
  return (
    <View style={r.photoStrip}>
      {photos.map((p, i) => (
        <View key={i} style={s.thumbBox} wrap={false}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src={p.dataUrl} style={s.thumb} />
          {p.label?.trim() ? <Text style={s.thumbCap}>{p.label.trim()}</Text> : null}
        </View>
      ))}
    </View>
  );
}

/** One inspection section as per-item rows (Pass 3). Renders nothing when the
 *  section has no rated items, units, note or photos. */
function SectionBlock({ sec, note }: { sec: Section; note: string }) {
  const hasContent =
    sec.items.length > 0 ||
    sec.units.some((u) => u.items.length > 0 || u.note?.trim()) ||
    note.trim() ||
    sec.photos.length > 0;
  if (!hasContent) return null;

  return (
    <View style={r.secBlock}>
      <View style={r.secHead} wrap={false}>
        <Text style={r.secTitle}>{sec.title}</Text>
        <RatingTag rating={sec.rating} />
      </View>

      {sec.items.length > 0 && <ItemRows items={sec.items} />}

      {sec.units.map((u, i) => (
        <View key={i}>
          <Text style={r.unitHead}>{u.heading}</Text>
          {u.note?.trim() ? <Text style={r.unitNote}>{u.note.trim()}</Text> : null}
          <ItemRows items={u.items} />
        </View>
      ))}

      {note.trim() ? <Text style={r.secNote}>{note.trim()}</Text> : null}
      <PhotoStrip photos={sec.photos} />
    </View>
  );
}

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
          {p.label?.trim() ? <Text style={s.thumbCap}>{p.label.trim()}</Text> : null}
        </View>
      ))}
    </View>
  );
}

function AssessmentReport({ data }: { data: AssessmentData }) {
  const { property, details, config, configPhotos, configOptions, sections, chemistry, itemCounts, overallNotes, overall, certification } = data;
  // Defense in depth: only chemistry params WITH a reading are shown (the payload
  // already drops reading-less ones — a status with no measurement is a false
  // claim). If none were tested, the whole chemistry section is omitted below.
  const chemRows = chemistry.filter((c) => (c.reading ?? "").trim() !== "");

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
            {(
              [
                ["Need Attn", itemCounts.attention, ATTENTION],
                ["Monitor", itemCounts.monitor, MONITOR],
                ["Good", itemCounts.good, GOOD],
              ] as const
            ).map(([label, n, color]) => (
              <View key={label} style={s.countCell}>
                <Text style={s.countNum}>{n}</Text>
                <View style={s.countRow}>
                  <View style={[s.dot, { backgroundColor: color }]} />
                  <Text style={s.countLabel}>{label}</Text>
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
            {/* Session id intentionally omitted from the customer PDF — it's an
                internal identifier and the only header field with a date baked in,
                so it can contradict the rest of the header. Still generated + stored. */}
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

        {/* Separate the meta block from the inspection findings */}
        <View style={s.rule} />

        {/* Configuration ratings — selected sanitation / feature options the tech
            rated (spec Pass 2). Small block; only shown when present. */}
        {configOptions.length > 0 && (
          <View style={r.secBlock}>
            <View style={r.secHead} wrap={false}>
              <Text style={r.secTitle}>Sanitation &amp; Features</Text>
            </View>
            <ItemRows items={configOptions.map((o) => ({ label: o.label, status: o.status, note: o.note }))} />
          </View>
        )}

        {/* Inspection sections — per-item rows (unrated items render nothing). */}
        {sections.map((sec) => (
          <SectionBlock
            key={sec.id}
            sec={sec}
            note={sec.notes}
          />
        ))}

        {/* Chemistry table — only params WITH a reading reach here (payload drops
            reading-less ones). If none were tested, the whole section is omitted. */}
        {chemRows.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Water Chemistry</Text>
            <View style={s.tHead}>
              <Text style={[s.tHeadCell, { flex: 2 }]}>Parameter</Text>
              <Text style={[s.tHeadCell, { flex: 1 }]}>Reading</Text>
              <Text style={[s.tHeadCell, { flex: 1 }]}>Ideal</Text>
              <Text style={[s.tHeadCell, { width: 52, textAlign: "right" }]}>Status</Text>
            </View>
            {chemRows.map((c) => (
              <View key={c.key} style={s.tRow}>
                <Text style={{ flex: 2 }}>{c.label}</Text>
                <Text style={{ flex: 1, fontFamily: "Helvetica-Bold" }}>{c.reading || "—"}</Text>
                <Text style={{ flex: 1, color: GREY }}>{c.ideal}</Text>
                <Text style={{ width: 52, textAlign: "right", fontFamily: "Helvetica-Bold", color: c.rating ? RATING_COLOR[c.rating] : STONE }}>
                  {c.rating ? RATING_LABEL[c.rating] : "—"}
                </Text>
              </View>
            ))}
          </>
        )}

        {/* The Recommendations block is gone (spec 1.6) — pricing lives in the
            client's Skimmer quote, not the report. */}
        {overallNotes ? (
          <>
            <Text style={s.sectionTitle}>Overall Assessment Notes</Text>
            <Text>{overallNotes}</Text>
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
