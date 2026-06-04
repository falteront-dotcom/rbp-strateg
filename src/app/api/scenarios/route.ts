// ─────────────────────────────────────────────────────────────────────────────
// API /api/scenarios — Strategic Scenarios Reference
// GET ?id=taiwan_strait_2027 — returns scenario data
// РБП-Стратег 2.0
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import {
  getScenarioById,
  getScenariosByCategory,
  getScenariosForCountry,
  getScenariosByImpact,
  getAllScenarios,
} from "@/lib/strategic-scenarios";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id") ?? undefined;
    const category = searchParams.get("category") ?? undefined;
    const iso = searchParams.get("iso") ?? undefined;
    const minImpact = searchParams.get("minImpact") ? parseInt(searchParams.get("minImpact")!) : undefined;

    if (id) {
      const scenario = getScenarioById(id);
      if (!scenario) {
        return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
      }
      return NextResponse.json(scenario);
    }

    if (category) {
      const scenarios = getScenariosByCategory(category as any);
      return NextResponse.json({ count: scenarios.length, scenarios });
    }

    if (iso) {
      const scenarios = getScenariosForCountry(iso);
      return NextResponse.json({
        isoCode: iso,
        count: scenarios.length,
        scenarios: scenarios.map((s) => ({
          id: s.id,
          nameRu: s.nameRu,
          category: s.category,
          probability: s.probability,
          impact: s.impact,
          modifiers: s.modifiers[iso] ?? [],
        })),
      });
    }

    if (minImpact) {
      const scenarios = getScenariosByImpact(minImpact);
      return NextResponse.json({ count: scenarios.length, scenarios });
    }

    const all = getAllScenarios();
    return NextResponse.json({
      count: all.length,
      scenarios: all.map((s) => ({
        id: s.id,
        name: s.name,
        nameRu: s.nameRu,
        category: s.category,
        probability: s.probability,
        impact: s.impact,
        affectedCountries: s.affectedCountries,
      })),
      categories: [...new Set(all.map((s) => s.category))],
      highestImpact: all.filter((s) => s.impact >= 9).map((s) => s.id),
      mostProbable: [...all].sort((a, b) => b.probability - a.probability).slice(0, 3).map((s) => s.id),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
