// ─────────────────────────────────────────────────────────────────────────────
// /api/compare — Multi-country comparison API
// Accepts 2–4 ISO codes, returns full comparison with deltas & summary
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import {
  compareCountriesList,
  COMPARISON_BP_COMPONENTS,
  COMPARISON_BP_LABELS,
  type CountryCompareData,
  type ComparisonBPComponent,
} from "@/lib/comparison";

// ─────────────────────────────────────────────────────────────────────────────
// Enhanced response types
// ─────────────────────────────────────────────────────────────────────────────

/** Per-component delta with value, delta, and rank among selected countries */
interface ComponentDelta {
  component: string;
  value: number;
  delta: number;
  rank: number;
}

/** Strongest/weakest country ISO per component */
interface ComparisonSummary {
  strongest: Record<string, string>;
  weakest: Record<string, string>;
}

/** Full API response shape */
interface CompareResponse {
  countries: CountryCompareData[];
  deltas: ComponentDelta[][];
  summary: ComparisonSummary;
}

/** Map a raw DB row (snake_case) to CountryCompareData (camelCase) */
function rowToCountryData(row: Record<string, unknown>): CountryCompareData {
  return {
    isoCode: row.iso_code as string,
    name: row.name as string,
    nameRu: row.name_ru as string,
    side: row.side as string,
    coalition: (row.coalition as string) ?? null,
    areaKm2: row.area_km2 as number,
    coastlineKm: row.coastline_km as number,
    gdpPppBn: row.gdp_ppp_bn as number,
    militaryBudgetBn: row.military_budget_bn as number,
    defensePctGdp: row.defense_pct_gdp as number,
    populationM: row.population_m as number,
    activePersonnel: row.active_personnel as number,
    reservePersonnel: row.reserve_personnel as number,
    totalTanks: row.total_tanks as number,
    totalAfv: row.total_afv as number,
    totalArtillery: row.total_artillery as number,
    totalMlrs: (row.total_mlrs as number) ?? 0,
    totalAircraft: row.total_aircraft as number,
    totalHelicopters: row.total_helicopters as number,
    totalNavy: row.total_navy as number,
    aircraftCarriers: (row.aircraft_carriers as number) ?? 0,
    submarines: row.submarines as number,
    nuclearWarheads: (row.nuclear_warheads as number) ?? 0,
    ports: row.ports as number,
    airfields: row.airfields as number,
    oilProductionKbd: row.oil_production_kbd as number,
    merchantFleet: (row.merchant_fleet as number) ?? 0,
    fitForServiceM: (row.fit_for_service_m as number) ?? (row.population_m as number * 0.3),
    techLevel: row.tech_level as number,
    moraleIndex: row.morale_index as number,
    combatExperience: row.combat_experience as number,
    c2Capability: row.c2_capability as number,
    ewCapability: row.ew_capability as number,
    bpTotal: (row.bp_total as number) ?? 0,
    bpWeapon: (row.bp_weapon as number) ?? 0,
    bpManpower: (row.bp_manpower as number) ?? 0,
    bpLogistics: (row.bp_logistics as number) ?? 0,
    bpC2: (row.bp_c2 as number) ?? 0,
    bpEconomy: (row.bp_economy as number) ?? 0,
    bpDoctrine: (row.bp_doctrine as number) ?? 0,
    bpReadiness: (row.bp_readiness as number) ?? 0,
    bpTerrain: (row.bp_terrain as number) ?? 0,
  };
}

/**
 * Build ComponentDelta[][] for each country across all BP components.
 * For country[i], component[j]: value = that component score,
 * delta = difference from the average of others, rank among selected.
 */
function buildComponentDeltas(
  countries: CountryCompareData[],
): ComponentDelta[][] {
  const result: ComponentDelta[][] = [];

  for (let ci = 0; ci < countries.length; ci++) {
    const countryDeltas: ComponentDelta[] = [];

    for (const comp of COMPARISON_BP_COMPONENTS) {
      const value = countries[ci][comp] as number;

      // Delta from average of OTHER countries
      const othersAvg =
        countries.reduce(
          (sum, c, idx) => (idx === ci ? sum : sum + (c[comp] as number)),
          0,
        ) / Math.max(1, countries.length - 1);
      const delta = Number((value - othersAvg).toFixed(2));

      // Rank among all selected countries for this component (1 = highest)
      const allValues = countries.map((c) => c[comp] as number);
      const sorted = [...allValues].sort((a, b) => b - a);
      const rank = sorted.indexOf(value) + 1;

      countryDeltas.push({
        component: comp,
        value: Number(value.toFixed(2)),
        delta,
        rank,
      });
    }

    result.push(countryDeltas);
  }

  return result;
}

/**
 * Build ComparisonSummary: strongest and weakest ISO per component.
 */
function buildSummary(
  countries: CountryCompareData[],
): ComparisonSummary {
  const strongest: Record<string, string> = {};
  const weakest: Record<string, string> = {};

  for (const comp of COMPARISON_BP_COMPONENTS) {
    let maxVal = -Infinity;
    let minVal = Infinity;
    let maxISO = "";
    let minISO = "";

    for (const c of countries) {
      const val = c[comp] as number;
      if (val > maxVal) { maxVal = val; maxISO = c.isoCode; }
      if (val < minVal) { minVal = val; minISO = c.isoCode; }
    }

    strongest[comp] = maxISO;
    weakest[comp] = minISO;
  }

  // Also include bpTotal
  let maxTotal = -Infinity;
  let minTotal = Infinity;
  let maxTotalISO = "";
  let minTotalISO = "";
  for (const c of countries) {
    if (c.bpTotal > maxTotal) { maxTotal = c.bpTotal; maxTotalISO = c.isoCode; }
    if (c.bpTotal < minTotal) { minTotal = c.bpTotal; minTotalISO = c.isoCode; }
  }
  strongest["bpTotal"] = maxTotalISO;
  weakest["bpTotal"] = minTotalISO;

  return { strongest, weakest };
}

// ─────────────────────────────────────────────────────────────────────────────
// Route handler
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/compare?iso=USA&iso=RUS&iso=CHN
 *
 * Accepts 2–4 ISO 3166-1 alpha-3 codes as repeated `iso` query params.
 * Returns countries, per-country component deltas, and strongest/weakest summary.
 */
export async function GET(request: Request): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const isoCodes = searchParams.getAll("iso");

    if (isoCodes.length < 2) {
      return NextResponse.json(
        { error: "Provide at least 2 ISO codes via ?iso=A&iso=B" },
        { status: 400 },
      );
    }

    if (isoCodes.length > 4) {
      return NextResponse.json(
        { error: "Maximum 4 countries can be compared at once" },
        { status: 400 },
      );
    }

    // Dynamic import for better-sqlite3
    const Database = (await import("better-sqlite3")).default;
    const path = (await import("path")).default;
    const DB_PATH = path.resolve(process.cwd(), "sqlite.db");
    const sqlite = new Database(DB_PATH);
    sqlite.pragma("journal_mode = WAL");

    const rows = sqlite.prepare("SELECT * FROM countries").all() as Record<string, unknown>[];
    sqlite.close();

    const allCountries = rows.map(rowToCountryData);

    // Filter to the requested ISO codes, preserving request order
    const requestedCountries: CountryCompareData[] = [];
    for (const iso of isoCodes) {
      const found = allCountries.find((c) => c.isoCode === iso.toUpperCase());
      if (found) {
        requestedCountries.push(found);
      }
    }

    if (requestedCountries.length < 2) {
      return NextResponse.json(
        { error: "At least 2 valid ISO codes must resolve to countries in the database" },
        { status: 400 },
      );
    }

    // Build enhanced response
    const deltas = buildComponentDeltas(requestedCountries);
    const summary = buildSummary(requestedCountries);

    const response: CompareResponse = {
      countries: requestedCountries,
      deltas,
      summary,
    };

    return NextResponse.json(response);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
