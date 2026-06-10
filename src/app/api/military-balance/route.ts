// ─────────────────────────────────────────────────────────────────────────────
// API /api/military-balance — Global Military Balance Summary
// GET ?region=Europe — returns regional or global military balance data
// РБП-Стратег 2.0
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";import { getGlobalMilitaryBalance, getRegionalBalance, getHighestConflictRisk, getDominantPowers } from "@/lib/military-balance";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const region = searchParams.get("region") ?? undefined;
    const risk = searchParams.get("risk") === "true";
    const powers = searchParams.get("powers") === "true";

    if (region) {
      const regional = getRegionalBalance(region);
      if (!regional) {
        return NextResponse.json({ error: "Region not found" }, { status: 404 });
      }
      return NextResponse.json(regional);
    }

    if (risk) {
      const riskOrdered = getHighestConflictRisk();
      return NextResponse.json({
        byRisk: riskOrdered.map((r) => ({
          region: r.region,
          regionRu: r.regionRu,
          conflictRisk: r.conflictRisk,
          dominantPower: r.dominantPower,
          nuclearStates: r.nuclearStates,
        })),
      });
    }

    if (powers) {
      const dominant = getDominantPowers();
      return NextResponse.json({ dominantPowers: dominant });
    }

    const global = getGlobalMilitaryBalance();
    return NextResponse.json(global);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
