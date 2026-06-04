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
  type DataSourceType,
} from "@/lib/data-quality";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const iso = searchParams.get("iso") ?? undefined;
    const source = searchParams.get("source") ?? undefined;
    const field = searchParams.get("field") ?? undefined;

    if (iso) {
      // Determine available sources and missing fields for this country
      const Database = (await import("better-sqlite3")).default;
      const db = new Database("sqlite.db", { readonly: true });
      const row = db.prepare("SELECT * FROM countries WHERE isoCode = ?").get(iso) as Record<string, unknown> | undefined;
      db.close();

      if (!row) {
        return NextResponse.json({ error: "Country not found" }, { status: 404 });
      }

      const availableSources: DataSourceType[] = [];
      if (row.activePersonnel) availableSources.push("gfp");
      if (row.gdpPppBn) availableSources.push("worldbank");
      if (row.nuclearWarheads) availableSources.push("fas");
      if (row.militaryBudgetBn) availableSources.push("sipri");
      availableSources.push("cia"); // always available

      const missingFields = Object.entries(row)
        .filter(([_, v]) => v === null || v === undefined || v === 0)
        .map(([k]) => k);

      const report = assessDataQuality(iso, availableSources, missingFields);
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
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
