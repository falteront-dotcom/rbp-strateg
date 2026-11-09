/**
 * Offline smoke test for the data pipeline's side/coalition derivation
 * (Wave 0, ROADMAP-3.0 — closes the invisible HIGH bug from audit §1).
 *
 * Why this exists: the pipeline e2e path is opt-in (RBP_PIPELINE_E2E) and
 * never runs in CI, so deriveSide() silently demoted 9 seed-marked NATO
 * allies (JPN, KOR, ISR, AUS, TWN, SGP, PHI, NZL, UKR) to NEUTRAL and
 * nobody noticed. This test exercises the derivation logic directly
 * against the committed 59-country seed fixture — no network, no DB,
 * no World Bank fetch (runPipeline itself is NOT called).
 *
 * Run:  npx tsx scripts/pipeline-smoke.ts
 * Exit: 0 = all checks pass, 1 = at least one check failed.
 */

import { top20Countries } from "../src/db/seed/top20-countries";
import { extendedCountries } from "../src/db/seed/extended-countries";
import { additionalCountries } from "../src/db/seed/additional-countries";
import {
  deriveSide,
  deriveCoalition,
  assertUniqueIso3,
  assertNoSeedAllyIsNeutral,
} from "../src/scripts/data-pipeline/merge-validate";
import { GFP_RANKINGS_2026 } from "../src/scripts/data-pipeline/scrape-gfp";

const failures: string[] = [];

function check(condition: boolean, message: string): void {
  if (condition) {
    console.log(`  ✓ ${message}`);
  } else {
    failures.push(message);
    console.error(`  ✗ ${message}`);
  }
}

// ─── Fixture: the curated 59-country seed (20 + 31 + 8) ─────────────────────
const fixture = [...top20Countries, ...extendedCountries, ...additionalCountries];

console.log("Pipeline smoke test (offline, seed fixture)");
check(fixture.length === 59, `fixture has 59 countries (got ${fixture.length})`);

try {
  assertUniqueIso3(
    fixture.map((c) => ({ iso3: c.isoCode })),
    "seed fixture",
  );
  check(true, "seed fixture iso3 codes are unique");
} catch (err) {
  check(false, `seed fixture iso3 codes are unique (${(err as Error).message})`);
}

// ─── GFP source data: no duplicate iso3 rows (AUS-dup regression) ───────────
try {
  assertUniqueIso3(GFP_RANKINGS_2026, "GFP_RANKINGS_2026");
  check(true, "GFP_RANKINGS_2026 iso3 codes are unique");
} catch (err) {
  check(false, `GFP_RANKINGS_2026 iso3 codes are unique (${(err as Error).message})`);
}

// ─── deriveSide spot checks (audit §1 sample) ───────────────────────────────
const expectedSides: Record<string, string> = {
  AUS: "NATO", // seed-marked ally — was NEUTRAL before the Wave 0 fix
  JPN: "NATO",
  KOR: "NATO",
  ISR: "NATO",
  TWN: "NATO",
  SGP: "NATO",
  PHI: "NATO",
  NZL: "NATO",
  CHN: "CHINA",
  RUS: "RUS",
  UKR: "UKR", // allied, but keeps its dedicated side
  USA: "NATO",
  IND: "NEUTRAL",
};
for (const [iso3, expected] of Object.entries(expectedSides)) {
  const actual = deriveSide(iso3);
  check(actual === expected, `deriveSide(${iso3}) === ${expected} (got ${actual})`);
}

// ─── Fail-loud assert over the whole fixture ────────────────────────────────
// Every country the seed marks side:"NATO" must derive to the NATO side
// ("NATO", or "UKR" for Ukraine) — never NEUTRAL.
const derived = fixture.map((c) => ({ isoCode: c.isoCode, side: deriveSide(c.isoCode) }));
try {
  assertNoSeedAllyIsNeutral(derived);
  check(true, "no seed-marked member/ally derives to NEUTRAL");
} catch (err) {
  check(false, `no seed-marked member/ally derives to NEUTRAL (${(err as Error).message})`);
}

for (const seedCountry of fixture) {
  if (seedCountry.side !== "NATO") continue;
  const actual = deriveSide(seedCountry.isoCode);
  check(
    actual === "NATO" || actual === "UKR",
    `seed NATO-side ${seedCountry.isoCode} derives to NATO-side (got ${actual})`,
  );
}

// ─── deriveCoalition spot checks (AUKUS wired, BRICS aligned with seed) ────
const expectedCoalitions: Record<string, string | null> = {
  AUS: "AUKUS", // seed coalition — AUKUS was dead code before Wave 0
  USA: "NATO", // NATO wins over AUKUS for members, as in the seed
  RUS: "CSTO", // CSTO wins over BRICS, as in the seed
  CHN: "BRICS",
  IND: "BRICS",
  BRA: "BRICS",
  ZAF: "BRICS",
  ETH: "BRICS",
  ARE: "BRICS", // UAE — old set used the non-ISO3 code "UAE" and missed it
  SAU: null, // seed coalition: null — old BRICS set silently assigned BRICS
  EGY: null,
  IRN: null,
};
for (const [iso3, expected] of Object.entries(expectedCoalitions)) {
  const actual = deriveCoalition(iso3);
  check(
    actual === expected,
    `deriveCoalition(${iso3}) === ${expected ?? "null"} (got ${actual ?? "null"})`,
  );
}

// ─── Verdict ────────────────────────────────────────────────────────────────
if (failures.length > 0) {
  console.error(`\n❌ Pipeline smoke FAILED: ${failures.length} check(s)`);
  process.exit(1);
}
console.log("\n✅ Pipeline smoke PASSED");
process.exit(0);
