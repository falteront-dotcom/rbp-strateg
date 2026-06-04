// ─────────────────────────────────────────────────────────────────────────────
// API /api/benchmarks — BP Validation Benchmarks
// GET ?iso=USA — returns benchmark data for validation
// РБП-Стратег 2.0
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { getAllBenchmarks, getBenchmark, validateBPRank, crossValidateGFP } from "@/lib/bp/benchmarks";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const iso = searchParams.get("iso") ?? undefined;
    const rank = searchParams.get("rank") ? parseInt(searchParams.get("rank")!) : undefined;

    if (iso && rank) {
      const validation = validateBPRank(iso, rank);
      const gfp = crossValidateGFP(iso, rank);
      return NextResponse.json({
        iso,
        calculatedRank: rank,
        validation,
        gfpCrossCheck: gfp,
      });
    }

    if (iso) {
      const benchmark = getBenchmark(iso);
      if (!benchmark) {
        return NextResponse.json({
          iso,
          benchmark: null,
          note: "No benchmark data available for this country",
        });
      }
      return NextResponse.json(benchmark);
    }

    const all = getAllBenchmarks();
    return NextResponse.json({
      count: all.length,
      benchmarks: all.map((b) => ({
        isoCode: b.isoCode,
        name: b.name,
        expectedBPRank: b.expectedBPRank,
        expectedTier: b.expectedTier,
        gfpRank2025: b.gfpRank2025,
        nuclearTriad: b.nuclearTriad,
        powerProjection: b.powerProjection,
        knownStrengths: b.knownStrengths,
        knownWeaknesses: b.knownWeaknesses,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
