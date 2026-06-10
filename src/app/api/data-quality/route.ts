// ─────────────────────────────────────────────────────────────────────────────
// API /api/data-quality — Data Source Quality Assessment
// GET ?iso=USA — returns data quality report for a country
// РБП-Стратег 2.0
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import {
  getAllDataSources,
  getDataSourceProfile,
  getSourcesForField,
  assessDataQuality,
  type DataQualityReport,
  type DataSourceType,
} from "@/lib/data-quality";
import { getMissingCriticalFields, normalizeIsoCode, toCountryRawData } from "@/lib/db/country-row-mapper";

function inferAvailableSources(row: Record<string, unknown>): DataSourceType[] {
  const country = toCountryRawData(row);
  const sources = new Set<DataSourceType>();

  if (country.activePersonnel > 0 || country.totalTanks > 0 || country.totalAircraft > 0) sources.add("gfp");
  if (country.gdpPppBn > 0 || country.populationM > 0) sources.add("worldbank");
  if (country.nuclearWarheads > 0) sources.add("fas");
  if (country.militaryBudgetBn > 0 || country.defensePctGdp > 0) sources.add("sipri");
  if (country.areaKm2 > 0 || country.coastlineKm >= 0 || country.airfields > 0 || country.ports > 0) sources.add("cia");

  return [...sources];
}

function buildDatasetSummary(rows: Record<string, unknown>[]) {
  const reports: DataQualityReport[] = rows.map((row) => {
    const country = toCountryRawData(row);
    return assessDataQuality(country.isoCode, inferAvailableSources(row), getMissingCriticalFields(row));
  });

  const averageQuality = reports.reduce((sum, report) => sum + report.overallQuality, 0) / Math.max(reports.length, 1);
  const lowQualityCountries = reports
    .filter((report) => report.overallQuality < 0.55 || report.warnings.length > 0)
    .sort((a, b) => a.overallQuality - b.overallQuality)
    .slice(0, 12);

  const missingFieldCounts = new Map<string, number>();
  for (const report of reports) {
    for (const field of report.missingFields) {
      missingFieldCounts.set(field, (missingFieldCounts.get(field) ?? 0) + 1);
    }
  }

  return {
    countriesAudited: rows.length,
    averageQuality: Number(averageQuality.toFixed(2)),
    lowQualityCountries,
    missingFieldCounts: [...missingFieldCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([field, count]) => ({ field, count })),
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const iso = normalizeIsoCode(searchParams.get("iso"));
    const source = searchParams.get("source") ?? undefined;
    const field = searchParams.get("field") ?? undefined;

    if (iso) {
      // Determine available sources and missing fields for this country
      const Database = (await import("better-sqlite3")).default;
      const db = new Database("sqlite.db", { readonly: true });
      const row = db.prepare("SELECT * FROM countries WHERE iso_code = ?").get(iso) as Record<string, unknown> | undefined;
      db.close();

      if (!row) {
        return NextResponse.json({ error: "Country not found" }, { status: 404 });
      }

      const report = assessDataQuality(iso, inferAvailableSources(row), getMissingCriticalFields(row));
      return NextResponse.json(report);
    }

    if (source) {
      const profile = getDataSourceProfile(source as DataSourceType);
      if (!profile) {
        return NextResponse.json({ error: "Source not found" }, { status: 404 });
      }
      return NextResponse.json(profile);
    }

    if (field) {
      const sources = getSourcesForField(field);
      return NextResponse.json({
        field,
        sourceCount: sources.length,
        sources: sources.map((s) => ({
          id: s.id,
          nameRu: s.nameRu,
          accuracyScore: s.accuracyScore,
          reliabilityScore: s.reliabilityScore,
        })),
      });
    }

    const all = getAllDataSources();
    const Database = (await import("better-sqlite3")).default;
    const db = new Database("sqlite.db", { readonly: true });
    const rows = db.prepare("SELECT * FROM countries ORDER BY bp_total DESC").all() as Record<string, unknown>[];
    db.close();

    return NextResponse.json({
      count: all.length,
      sources: all.map((s) => ({
        id: s.id,
        nameRu: s.nameRu,
        coverageScore: s.coverageScore,
        accuracyScore: s.accuracyScore,
        timelinessScore: s.timelinessScore,
        reliabilityScore: s.reliabilityScore,
        fields: s.fields,
        lastUpdated: s.lastUpdated,
      })),
      dataset: buildDatasetSummary(rows),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
