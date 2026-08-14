/**
 * Data Pipeline — Multi-source merge with cross-validation
 * 
 * Sources:
 *   1. Global Firepower (GFP) — military hardware, personnel, geography
 *   2. World Bank API — GDP, population, military budget, area
 *   3. FAS Nuclear Notebook — nuclear warhead counts
 *   4. Existing seed data — fallback for missing fields
 * 
 * Strategy:
 *   - GFP is the PRIMARY source for military-specific data
 *   - World Bank OVERRIDES GFP for economic data (more accurate)
 *   - FAS OVERRIDES all other sources for nuclear warheads
 *   - Cross-validate: flag if GFP budget ≠ WB budget (±20%)
 *   - Missing fields: fill from existing seed data or mark as unknown
 */

import { getGFPData } from "./scrape-gfp";
import { getNuclearData } from "./nuclear-data";
import { COUNTRY_NAMES_RU } from "@/lib/geo/country-names-ru";
import type { NewCountry } from "@/db/schema";

interface ConflictRecord {
  iso3: string;
  field: string;
  gfpValue: number;
  wbValue: number;
  delta: number;
  deltaPct: number;
  resolution: "gfp" | "wb" | "fas" | "average";
}

interface MergedCountry {
  isoCode: string;
  name: string;
  nameRu: string;
  side: "NATO" | "RUS" | "CHINA" | "UKR" | "NEUTRAL";
  coalition: "NATO" | "CSTO" | "AUKUS" | "BRICS" | null;

  areaKm2: number;
  coastlineKm: number;
  climateZone: string;

  gdpPppBn: number;
  militaryBudgetBn: number;
  defensePctGdp: number;

  populationM: number;
  activePersonnel: number;
  reservePersonnel: number;
  fitForServiceM: number;

  totalTanks: number;
  totalAfv: number;
  totalArtillery: number;
  totalMlrs: number;
  totalAircraft: number;
  totalHelicopters: number;
  totalNavy: number;
  submarines: number;
  aircraftCarriers: number;
  nuclearWarheads: number;

  ports: number;
  airfields: number;
  oilProductionKbd: number;
  merchantFleet: number;

  techLevel: number;
  moraleIndex: number;
  combatExperience: number;
  c2Capability: number;
  ewCapability: number;

  bpTotal: number;
  bpWeapon: number;
  bpManpower: number;
  bpLogistics: number;
  bpC2: number;
  bpEconomy: number;
  bpDoctrine: number;
  bpReadiness: number;
  bpTerrain: number;

  updatedAt: string;
}

/** NATO members by ISO3 */
const NATO_MEMBERS = new Set([
  "USA","GBR","FRA","DEU","ITA","ESP","POL","NLD","BEL","CAN",
  "NOR","DNK","PRT","GRC","TUR","CZE","HUN","ROU","BGR","HRV",
  "SVK","SVN","LTU","LVA","EST","ALB","MNE","MKD","ISL","LUX",
  "FIN","SWE","BIH"
]);

/** CSTO members */
const CSTO_MEMBERS = new Set(["RUS","BLR","ARM","KAZ","KGZ","TJK"]);

/** AUKUS members */
const AUKUS_MEMBERS = new Set(["USA","AUS","GBR"]);

/** BRICS members */
const BRICS_MEMBERS = new Set(["CHN","RUS","IND","BRA","ZAF","SAU","IRN","UAE","EGY","ETH"]);

/** Derive side from coalition membership */
function deriveSide(iso3: string): "NATO" | "RUS" | "CHINA" | "UKR" | "NEUTRAL" {
  if (iso3 === "UKR") return "UKR";
  if (NATO_MEMBERS.has(iso3)) return "NATO";
  if (CSTO_MEMBERS.has(iso3)) return "RUS";
  if (iso3 === "CHN" || iso3 === "PRK") return "CHINA";
  return "NEUTRAL";
}

function deriveCoalition(iso3: string): "NATO" | "CSTO" | "AUKUS" | "BRICS" | null {
  if (NATO_MEMBERS.has(iso3)) return "NATO";
  if (CSTO_MEMBERS.has(iso3)) return "CSTO";
  if (BRICS_MEMBERS.has(iso3)) return "BRICS";
  return null;
}

/** Estimate tech level (1-10) based on GDP per capita and side */
function estimateTechLevel(gdpPppBn: number, populationM: number, side: string): number {
  if (populationM <= 0 || gdpPppBn <= 0) return 3;
  const gdpPerCapita = gdpPppBn * 1e9 / (populationM * 1e6);
  if (gdpPerCapita > 50000) return side === "NATO" ? 10 : 8;
  if (gdpPerCapita > 30000) return 8;
  if (gdpPerCapita > 15000) return 7;
  if (gdpPerCapita > 8000) return 6;
  if (gdpPerCapita > 4000) return 5;
  if (gdpPerCapita > 2000) return 4;
  return 3;
}

/** Estimate morale (1-10) based on side and combat experience */
function estimateMorale(side: string, combatExperience: number): number {
  if (side === "UKR") return 9; // High morale from defensive war
  if (side === "RUS" && combatExperience >= 7) return 8;
  if (side === "NATO" && combatExperience >= 6) return 7;
  if (combatExperience >= 5) return 6;
  if (combatExperience >= 3) return 5;
  return 4;
}

/** Estimate combat experience (1-10) — based on recent conflicts */
function estimateCombatExperience(iso3: string): number {
  // Active conflicts or recent major engagements
  const highExp = new Set(["USA","RUS","UKR","ISR","TUR","IRN","IRQ","SYR","EGY","IND","PAK","ETH","SAU"]);
  const medExp = new Set(["GBR","FRA","CHN","AUS","CAN","DEU","ITA","NLD","POL","JPN","KOR","THA","PHL","COL","MEX","NGA","SOM","KEN"]);
  if (highExp.has(iso3)) return 8;
  if (medExp.has(iso3)) return 6;
  return 3;
}

/** Estimate C2 capability */
function estimateC2(techLevel: number, side: string): number {
  if (side === "UKR") return 8; // Getting NATO C2 support
  if (side === "NATO" && techLevel >= 8) return 10;
  if (side === "NATO" && techLevel >= 6) return 8;
  if (side === "RUS" && techLevel >= 7) return 8;
  if (side === "CHINA" && techLevel >= 7) return 7;
  if (techLevel >= 6) return 6;
  if (techLevel >= 4) return 5;
  return 3;
}

/** Estimate EW capability */
function estimateEW(techLevel: number, side: string): number {
  if (side === "UKR") return 7; // NATO EW support + combat experience
  if (side === "NATO" && techLevel >= 9) return 10;
  if (side === "RUS" && techLevel >= 7) return 9;
  if (side === "CHINA" && techLevel >= 7) return 7;
  if (side === "ISR") return 10;
  if (techLevel >= 7) return 6;
  if (techLevel >= 5) return 4;
  return 2;
}

/** Derive climate zone from country */
function deriveClimate(iso3: string): string {
  const tropical = new Set(["BRA","IDN","THA","VNM","PHL","MYS","SGP","MMR","KHM","LAO","PNG","LKA","BDG","CUB","ECU","COL","PER","VEN","GHA","CIV","CMR","NGA","KEN","TZA","MOZ","MDG","AGO"]);
  const arid = new Set(["SAU","ARE","QAT","KWT","BHR","OMN","IRN","IRQ","EGY","LBY","DZA","MAR","JOR","SYR","SDN","MNG","KAZ","UZB","TKM","KGZ","TJK","AFG","NPL"]);
  const cold = new Set(["RUS","FIN","SWE","NOR","ISL","CAN"]);
  if (tropical.has(iso3)) return "Tropical";
  if (arid.has(iso3)) return "Arid";
  if (cold.has(iso3)) return "Cold/Continental";
  return "Temperate";
}

/**
 * Run the full data pipeline:
 * 1. Fetch World Bank data (async)
 * 2. Load GFP data (static)
 * 3. Load FAS nuclear data (static)
 * 4. Merge with cross-validation
 * 5. Return merged countries + conflicts
 */
export async function runPipeline(): Promise<{
  countries: MergedCountry[];
  conflicts: ConflictRecord[];
  stats: { total: number; fromGFP: number; fromWB: number; fromFAS: number };
}> {
  console.log("🚀 Starting data pipeline...");

  const conflicts: ConflictRecord[] = [];
  const stats = { total: 0, fromGFP: 0, fromWB: 0, fromFAS: 0 };

  // 1. World Bank
  let wbData: Map<string, { gdpPppBn: number | null; populationM: number | null; militaryBudgetBn: number | null; defensePctGdp: number | null; areaKm2: number | null }> = new Map();
  try {
    const { fetchWorldBankData } = await import("./fetch-worldbank");
    wbData = await fetchWorldBankData();
    stats.fromWB = wbData.size;
    console.log(`  ✓ World Bank: ${wbData.size} countries`);
  } catch (err) {
    console.warn("  ⚠ World Bank fetch failed, using GFP-only:", err);
  }

  // 2. GFP
  const gfpData = getGFPData();
  stats.fromGFP = gfpData.size;
  console.log(`  ✓ GFP: ${gfpData.size} countries`);

  // 3. Nuclear
  const nukeData = getNuclearData();
  stats.fromFAS = nukeData.size;
  console.log(`  ✓ FAS Nuclear: ${nukeData.size} countries`);

  // 4. Merge — GFP is the backbone, WB overrides economics, FAS overrides nukes
  const allISOs = new Set<string>();
  for (const iso of gfpData.keys()) allISOs.add(iso);
  for (const iso of wbData.keys()) allISOs.add(iso);
  for (const iso of nukeData.keys()) allISOs.add(iso);

  const mergedCountries: MergedCountry[] = [];

  for (const iso3 of allISOs) {
    const gfp = gfpData.get(iso3);
    const wb = wbData.get(iso3);
    const nuke = nukeData.get(iso3);

    const side = deriveSide(iso3);
    const coalition = deriveCoalition(iso3);
    const combatExp = estimateCombatExperience(iso3);

    // Economic data: prefer World Bank, fallback to GFP ranking data
    const gfpBudget = (gfp as unknown as Record<string, unknown>)?.defenseBudgetBn as number | undefined;
    const gfpArea = (gfp as unknown as Record<string, unknown>)?.areaKm2 as number | undefined;
    const gfpCoast = (gfp as unknown as Record<string, unknown>)?.coastlineKm as number | undefined;
    
    const gdpPppBn = wb?.gdpPppBn ?? 0;
    let militaryBudgetBn = wb?.militaryBudgetBn ?? gfpBudget ?? 0;
    let defensePctGdp = wb?.defensePctGdp ?? 0;
    const populationM = wb?.populationM ?? 0;
    const areaKm2 = wb?.areaKm2 ?? gfpArea ?? 0;

    // Cross-validate budget between GFP and WB
    if (gfpBudget && wb?.militaryBudgetBn) {
      const delta = Math.abs(gfpBudget - wb.militaryBudgetBn);
      const deltaPct = (delta / Math.max(gfpBudget, wb.militaryBudgetBn)) * 100;
      if (deltaPct > 20) {
        conflicts.push({
          iso3,
          field: "militaryBudgetBn",
          gfpValue: gfpBudget,
          wbValue: wb.militaryBudgetBn,
          delta,
          deltaPct: Math.round(deltaPct),
          resolution: "wb",
        });
      }
      militaryBudgetBn = wb.militaryBudgetBn;
    }

    // Calculate defensePctGdp if missing
    if (!defensePctGdp && gdpPppBn > 0 && militaryBudgetBn > 0) {
      defensePctGdp = Math.round((militaryBudgetBn / gdpPppBn) * 10000) / 100;
    }

    const techLevel = estimateTechLevel(gdpPppBn, populationM, side);
    const moraleIndex = estimateMorale(side, combatExp);
    const c2Capability = estimateC2(techLevel, side);
    const ewCapability = estimateEW(techLevel, side);

    const country: MergedCountry = {
      isoCode: iso3,
      name: (gfp as unknown as Record<string, string>)?.name ?? (wb as unknown as Record<string, string>)?.name ?? iso3,
      nameRu: COUNTRY_NAMES_RU[iso3] ?? iso3,
      side,
      coalition,
      areaKm2: Math.round(areaKm2),
      coastlineKm: gfpCoast ?? 0,
      climateZone: deriveClimate(iso3),
      gdpPppBn: Math.round(gdpPppBn * 100) / 100,
      militaryBudgetBn: Math.round(militaryBudgetBn * 100) / 100,
      defensePctGdp,
      populationM: Math.round(populationM * 100) / 100,
      activePersonnel: (gfp as unknown as Record<string, unknown>)?.activePersonnel as number ?? 0,
      reservePersonnel: (gfp as unknown as Record<string, unknown>)?.reservePersonnel as number ?? 0,
      fitForServiceM: Math.round(populationM * 0.015 * 100) / 100, // ~1.5% reaching military age
      totalTanks: (gfp as unknown as Record<string, unknown>)?.totalTanks as number ?? 0,
      totalAfv: (gfp as unknown as Record<string, unknown>)?.afv as number ?? 0,
      totalArtillery: (gfp as unknown as Record<string, unknown>)?.artillery as number ?? 0,
      totalMlrs: (gfp as unknown as Record<string, unknown>)?.mlrs as number ?? 0,
      totalAircraft: (gfp as unknown as Record<string, unknown>)?.totalAircraft as number ?? 0,
      totalHelicopters: (gfp as unknown as Record<string, unknown>)?.helicopters as number ?? 0,
      totalNavy: (gfp as unknown as Record<string, unknown>)?.totalNavy as number ?? 0,
      submarines: (gfp as unknown as Record<string, unknown>)?.submarines as number ?? 0,
      aircraftCarriers: (gfp as unknown as Record<string, unknown>)?.aircraftCarriers as number ?? 0,
      nuclearWarheads: nuke?.warheads ?? 0,
      ports: (gfp as unknown as Record<string, unknown>)?.ports as number ?? 0,
      airfields: (gfp as unknown as Record<string, unknown>)?.airfields as number ?? 0,
      oilProductionKbd: (gfp as unknown as Record<string, unknown>)?.oilProductionKbd as number ?? 0,
      merchantFleet: (gfp as unknown as Record<string, unknown>)?.merchantFleet as number ?? 0,
      techLevel,
      moraleIndex,
      combatExperience: combatExp,
      c2Capability,
      ewCapability,
      bpTotal: 0,
      bpWeapon: 0,
      bpManpower: 0,
      bpLogistics: 0,
      bpC2: 0,
      bpEconomy: 0,
      bpDoctrine: 0,
      bpReadiness: 0,
      bpTerrain: 0,
      updatedAt: "2025-06-01",
    };

    mergedCountries.push(country);
  }

  stats.total = mergedCountries.length;
  console.log(`\n✅ Pipeline complete: ${stats.total} countries merged`);
  console.log(`   Conflicts: ${conflicts.length}`);
  for (const c of conflicts.slice(0, 5)) {
    console.log(`   ⚠ ${c.iso3} ${c.field}: GFP=${c.gfpValue} WB=${c.wbValue} Δ=${c.deltaPct}% → ${c.resolution}`);
  }

  return { countries: mergedCountries, conflicts, stats };
}

// Direct execution
if (typeof require !== "undefined" && require.main === module) {
  runPipeline()
    .then(({ countries, conflicts, stats }) => {
      console.log("\n📊 Results:");
      console.log(JSON.stringify(stats, null, 2));
      console.log(`\nTop 5:`);
      countries.slice(0, 5).forEach(c => {
        console.log(`  ${c.isoCode} ${c.name} tanks=${c.totalTanks} budget=$${c.militaryBudgetBn}B nukes=${c.nuclearWarheads}`);
      });
      process.exit(0);
    })
    .catch(err => {
      console.error("Pipeline failed:", err);
      process.exit(1);
    });
}
