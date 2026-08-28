/**
 * Proves the archive-side re-scoring reproduces what the wizard already stored.
 *
 * The office review screen re-scores an edited assessment from the ARCHIVE shape
 * (labels + resolved statuses) using lib/archive-scoring.ts, while the wizard
 * scores live state through summary.ts + payload.ts. Those are different code
 * paths over different shapes, and a report whose headline disagrees with its
 * own contents is worse than one that was never edited — so the equivalence is
 * proven here rather than asserted.
 *
 * Run over UNEDITED archives: every recomputed value must equal the stored one.
 * Checks all three, because they are three separate tallies that can drift
 * independently:
 *   - each section's rating
 *   - itemCounts   (the per-ITEM count band)
 *   - overall      (the headline, from a per-SECTION tally)
 *
 *   node scripts/verify-archive-scoring.mjs <dir-of-archive-json-files>
 */
import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
execSync("npx tsc -p " + join(here, "tsconfig.verify.json"), { stdio: "inherit" });
const { rescoreAssessment } = createRequire(import.meta.url)("/tmp/spc-scoring/archive-scoring.js");

const dir = process.argv[2];
if (!dir) {
  console.error("usage: node scripts/verify-archive-scoring.mjs <dir-of-archive-json-files>");
  process.exit(2);
}
const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
if (!files.length) {
  console.error(`no archive JSON found in ${dir}`);
  process.exit(2);
}

const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
let failures = 0;
let sectionChecks = 0;
const seen = { headline: new Set(), sectionRatings: new Set() };

for (const file of files) {
  const a = JSON.parse(readFileSync(join(dir, file), "utf8"));
  const got = rescoreAssessment(a);
  const problems = [];

  for (const section of a.sections) {
    sectionChecks++;
    seen.sectionRatings.add(String(section.rating));
    if (got.sectionRatings[section.id] !== section.rating) {
      problems.push(
        `section "${section.id}": stored ${JSON.stringify(section.rating)}, recomputed ${JSON.stringify(got.sectionRatings[section.id])}`
      );
    }
  }
  if (!eq(got.itemCounts, a.itemCounts)) {
    problems.push(`itemCounts: stored ${JSON.stringify(a.itemCounts)}, recomputed ${JSON.stringify(got.itemCounts)}`);
  }
  if (!eq(got.overall, a.overall)) {
    problems.push(`overall: stored ${JSON.stringify(a.overall)}, recomputed ${JSON.stringify(got.overall)}`);
  }
  seen.headline.add(a.overall.label);

  if (problems.length) {
    failures++;
    console.log(`FAIL ${file}`);
    for (const p of problems) console.log(`       ${p}`);
  } else {
    console.log(
      `PASS ${file}  ${a.overall.label.padEnd(19)} band ${JSON.stringify(a.itemCounts)}`
    );
  }
}

console.log(
  `\n${files.length} archives, ${sectionChecks} section ratings, ${files.length * 2} tallies checked.`
);
console.log(`headlines covered      : ${[...seen.headline].sort().join(", ")}`);
console.log(`section ratings covered: ${[...seen.sectionRatings].sort().join(", ")}`);
if (failures) {
  console.log(`\n${failures} ARCHIVE(S) FAILED`);
  process.exit(1);
}
console.log("\nall archives reproduce their stored ratings, itemCounts and overall.");
