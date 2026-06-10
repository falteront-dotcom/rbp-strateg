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
  type ScenarioCategory,
} from "@/lib/strategic-scenarios";

const SCENARIO_CATEGORIES = ["regional_conflict", "nuclear_exchange", "coalition_shift", "technology_shock", "economic_collapse", "civil_war", "coup_detat", "arms_race"] as const;

function isScenarioCategory(value: string): value is ScenarioCategory {
  return SCENARIO_CATEGORIES.includes(value as ScenarioCategory);
}

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
      if (!isScenarioCategory(category)) {
        return NextResponse.json({ error: "Invalid scenario category", validCategories: SCENARIO_CATEGORIES }, { status: 400 });
      }
      const scenarios = getScenariosByCategory(category);
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
