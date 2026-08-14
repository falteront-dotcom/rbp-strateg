// ─────────────────────────────────────────────────────────────────────────────
// /api/compare — Multi-country comparison API
// Accepts 2–4 ISO codes, returns full comparison with deltas & summary
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { openReadonlyDatabase } from "@/db/runtime";
import { mapCountryRows, type RawCountryRow } from "@/db/country-mapper";
import {
  COMPARISON_BP_COMPONENTS,
  type CountryCompareData,
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

    const sqlite = openReadonlyDatabase();
    let allCountries: CountryCompareData[];
    try {
      const rows = sqlite.prepare("SELECT * FROM countries").all() as RawCountryRow[];
      allCountries = mapCountryRows(rows) as CountryCompareData[];
    } finally {
      sqlite.close();
    }

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
