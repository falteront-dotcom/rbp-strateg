/**
 * Re-validation of the v2 BP model against Global Firepower 2026
 * (P3 of the 2026-11 data audit — replaces the old circular check
 * against GFP 2025 in src/lib/bp/benchmarks.ts).
 *
 * What it does:
 *   1. Loads the committed seed cohort (195 countries, same arrays the
 *      DB seed uses) and computes v2 BP ranks with the production
 *      calculator (calculateAllCountriesBP, default weights).
 *   2. Loads GFP_RANKINGS_2026 (src/scripts/data-pipeline/scrape-gfp.ts).
 *   3. On the intersection of the two sets computes:
 *        - Spearman rank correlation (v2 rank vs GFP 2026 rank)
 *        - mean / median absolute rank difference
 *        - share of countries within ±5 and ±10 ranks
 *        - the 10 largest divergences (with the v2 component profile,
 *          so the reason for each divergence is inspectable)
 *   4. Writes the machine-readable result to docs/validation-gfp-2026.json
 *      and prints a human summary. The narrative report lives in
 *      docs/validation-gfp-2026.md.
 *
 * Methodological caveat (unchanged from the audit): GFP is both a data
 * source of this project and the benchmark here, so a high correlation
 * is a consistency check, not independent validation. GFP also excludes
 * nuclear weapons from its index while the v2 model scores them, which
 * structurally explains part of the divergence for nuclear states.
 *
 * Run:  npx tsx scripts/validate-gfp-2026.ts
 * Exit: 0 = validation computed and written (regardless of the value),
 *       1 = hard failure (empty intersection, duplicate iso3, ...).
 */

import { writeFileSync } from "node:fs";
import { top20Countries } from "../src/db/seed/top20-countries";
import { extendedCountries } from "../src/db/seed/extended-countries";
import { additionalCountries } from "../src/db/seed/additional-countries";
import { worldCountries } from "../src/db/seed/world-countries";
import { calculateAllCountriesBP } from "../src/lib/bp/index";
import type { CountryRawData } from "../src/lib/bp/types";
import { GFP_RANKINGS_2026 } from "../src/scripts/data-pipeline/scrape-gfp";
import { assertUniqueIso3 } from "../src/scripts/data-pipeline/merge-validate";

// ─── Cohort ──────────────────────────────────────────────────────────────

const seedAll = [
  ...top20Countries,
  ...extendedCountries,
  ...additionalCountries,
  ...worldCountries,
] as unknown as CountryRawData[];

assertUniqueIso3(
  seedAll.map((c) => ({ iso3: c.isoCode })),
  "seed cohort",
);
assertUniqueIso3(GFP_RANKINGS_2026, "GFP_RANKINGS_2026");

const results = calculateAllCountriesBP(seedAll);
const v2Rank = new Map<string, number>();
const v2Total = new Map<string, number>();
const v2Components = new Map<string, Record<string, number>>();
for (const r of results) {
  if (r.rank == null) throw new Error(`No rank assigned for ${r.isoCode}`);
  v2Rank.set(r.isoCode, r.rank);
  v2Total.set(r.isoCode, Math.round(r.totalBP * 100) / 100);
  const comp: Record<string, number> = {};
  for (const [k, v] of Object.entries(r.components)) {
    comp[k] = Math.round(v.weightedScore * 100) / 100;
  }
  v2Components.set(r.isoCode, comp);
}

// ─── Intersection & rank statistics ──────────────────────────────────────

interface PairRow {
  iso3: string;
  name: string;
  /** Rank inside the full 195-country seed cohort (published model rank). */
  v2Rank: number;
  /** Rank re-based inside the intersection — used for all statistics. */
  v2RankLocal: number;
  v2TotalBP: number;
  /** Published GFP 2026 rank (1..145). */
  gfpRank: number;
  /** Rank re-based inside the intersection — used for all statistics. */
  gfpRankLocal: number;
  gfpPowerIndex: number;
  /** v2RankLocal - gfpRankLocal (negative = model ranks the country higher). */
  delta: number;
  components: Record<string, number>;
}

const gfpByIso = new Map(GFP_RANKINGS_2026.map((g) => [g.iso3, g]));
const pairs: PairRow[] = [];
for (const [iso3, rank] of v2Rank) {
  const g = gfpByIso.get(iso3);
  if (!g) continue;
  pairs.push({
    iso3,
    name: g.name,
    v2Rank: rank,
    v2RankLocal: 0,
    v2TotalBP: v2Total.get(iso3) ?? 0,
    gfpRank: g.rank,
    gfpRankLocal: 0,
    gfpPowerIndex: g.powerIndex,
    delta: 0,
    components: v2Components.get(iso3) ?? {},
  });
}
if (pairs.length === 0) throw new Error("Empty v2 ∩ GFP-2026 intersection");

// Spearman requires both rankings to be permutations of the same 1..n set,
// so all statistics use ranks re-based inside the intersection (the two
// source lists have different lengths: 195 vs 145).
[...pairs]
  .sort((a, b) => a.v2TotalBP - b.v2TotalBP)
  .forEach((r, i) => { r.v2RankLocal = pairs.length - i; });
[...pairs]
  .sort((a, b) => b.gfpPowerIndex - a.gfpPowerIndex)
  .forEach((r, i) => { r.gfpRankLocal = pairs.length - i; });
for (const r of pairs) r.delta = r.v2RankLocal - r.gfpRankLocal;

function spearman(rows: PairRow[]): number {
  // Re-base inside the subset as well (e.g. the GFP top-60 slice).
  const byV2 = [...rows].sort((a, b) => a.v2TotalBP - b.v2TotalBP);
  const byGfp = [...rows].sort((a, b) => b.gfpPowerIndex - a.gfpPowerIndex);
  const lv = new Map(byV2.map((r, i) => [r.iso3, rows.length - i]));
  const lg = new Map(byGfp.map((r, i) => [r.iso3, rows.length - i]));
  const n = rows.length;
  const d2 = rows.reduce(
    (sum, r) => sum + ((lv.get(r.iso3) ?? 0) - (lg.get(r.iso3) ?? 0)) ** 2,
    0,
  );
  return 1 - (6 * d2) / (n * (n * n - 1));
}

function stats(rows: PairRow[]) {
  const abs = rows.map((r) => Math.abs(r.delta)).sort((a, b) => a - b);
  const mean = abs.reduce((s, v) => s + v, 0) / abs.length;
  const median = abs[Math.floor(abs.length / 2)];
  return {
    n: rows.length,
    spearman: Math.round(spearman(rows) * 10000) / 10000,
    meanAbsRankDelta: Math.round(mean * 100) / 100,
    medianAbsRankDelta: median,
    within5: rows.filter((r) => Math.abs(r.delta) <= 5).length,
    within10: rows.filter((r) => Math.abs(r.delta) <= 10).length,
  };
}

const overall = stats(pairs);
const top60 = stats(pairs.filter((r) => r.gfpRank <= 60));

const divergences = [...pairs]
  .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
  .slice(0, 10);

const output = {
  generatedAt: "2026-11-07",
  model: "RBP v2 (8-component BP, default weights, seed cohort)",
  benchmark: {
    source: "Global Firepower 2026",
    releaseDate: "2026-01-23",
    url: "https://www.globalfirepower.com/countries-listing.php",
    countries: GFP_RANKINGS_2026.length,
  },
  cohort: {
    seedCountries: seedAll.length,
    intersection: pairs.length,
    seedOnly: seedAll.length - pairs.length,
    gfpOnly: GFP_RANKINGS_2026.length - pairs.length,
  },
  overall,
  top60ByGfp: top60,
  topDivergences: divergences,
  pairs: [...pairs].sort((a, b) => a.gfpRank - b.gfpRank),
};

writeFileSync(
  new URL("../docs/validation-gfp-2026.json", import.meta.url),
  JSON.stringify(output, null, 1) + "\n",
);

console.log("─".repeat(72));
console.log("v2 BP model vs GFP 2026 — re-validation");
console.log("─".repeat(72));
console.log(`Seed cohort: ${seedAll.length} | GFP 2026: ${GFP_RANKINGS_2026.length} | intersection: ${pairs.length}`);
console.log(`Spearman ρ (all):        ${overall.spearman}`);
console.log(`Spearman ρ (GFP top-60): ${top60.spearman}`);
console.log(`Mean |Δrank|: ${overall.meanAbsRankDelta} | median |Δrank|: ${overall.medianAbsRankDelta}`);
console.log(`Within ±5: ${overall.within5}/${overall.n} | within ±10: ${overall.within10}/${overall.n}`);
console.log("\nTop divergences (Δ on intersection-local ranks):");
for (const d of divergences) {
  console.log(
    `  ${d.iso3.padEnd(4)} v2 #${String(d.v2Rank).padStart(3)} (local ${String(d.v2RankLocal).padStart(3)}) vs GFP #${String(d.gfpRank).padStart(3)} (local ${String(d.gfpRankLocal).padStart(3)})  Δ=${d.delta > 0 ? "+" : ""}${d.delta}`,
  );
}
console.log("\nWrote docs/validation-gfp-2026.json");
