// ─────────────────────────────────────────────────────────────────────────────
// API /api/strategic-culture — Strategic Culture Profiles
// GET ?iso=RUS — returns strategic culture profile for a country
// РБП-Стратег 2.0
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { getStrategicCulture, compareStrategicCultures, getAllCultureProfiles } from "@/lib/strategic-culture";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const iso = searchParams.get("iso") ?? undefined;
    const compareWith = searchParams.get("compare") ?? undefined;

    if (iso && compareWith) {
      const comparison = compareStrategicCultures(iso, compareWith);
      return NextResponse.json({
        isoA: iso,
        isoB: compareWith,
        similarity: comparison.similarity,
        differences: comparison.differences,
        implications: comparison.implications,
      });
    }

    if (iso) {
      const profile = getStrategicCulture(iso);
      return NextResponse.json({
        isoCode: profile.isoCode,
        cultureType: profile.cultureType,
        doctrineEmphasis: profile.doctrineEmphasis,
        militaryTradition: profile.militaryTradition,
        keyStrengths: profile.keyStrengths,
        keyWeaknesses: profile.keyWeaknesses,
        riskTolerance: profile.riskTolerance,
        innovationRate: profile.innovationRate,
        adaptability: profile.adaptability,
        allianceReliance: profile.allianceReliance,
        nuclearDoctrine: profile.nuclearDoctrine,
        civilMilitaryRelation: profile.civilMilitaryRelation,
        historicalPatterns: profile.historicalPatterns,
      });
    }

    const all = getAllCultureProfiles();
    return NextResponse.json({
      count: Object.keys(all).length,
      profiles: Object.entries(all).map(([iso, profile]) => ({
        isoCode: iso,
        cultureType: profile.cultureType,
        doctrineEmphasis: profile.doctrineEmphasis,
        riskTolerance: profile.riskTolerance,
        innovationRate: profile.innovationRate,
        adaptability: profile.adaptability,
        nuclearDoctrine: profile.nuclearDoctrine,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
