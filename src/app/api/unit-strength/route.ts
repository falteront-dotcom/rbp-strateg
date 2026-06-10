// ─────────────────────────────────────────────────────────────────────────────
// API /api/unit-strength — Unit Strength Ratings & Formation Templates
// GET ?branch=armor&echelon=battalion — returns unit effectiveness data
// РБП-Стратег 2.0
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import {
  getStrengthRating,
  getFormationTemplate,
  getFormationsByBranch,
  getAllFormationTemplates,
  calculateUnitEffectiveness,
  type UnitBranch,
  type UnitEchelon,
} from "@/lib/unit-strength";

const UNIT_BRANCHES = ["infantry", "armor", "artillery", "air_defense", "aviation", "naval", "special_ops", "logistics", "engineer", "ew"] as const;
const UNIT_ECHELONS = ["squad", "platoon", "company", "battalion", "brigade", "division", "corps", "army"] as const;

function isUnitBranch(value: string): value is UnitBranch {
  return UNIT_BRANCHES.includes(value as UnitBranch);
}

function isUnitEchelon(value: string): value is UnitEchelon {
  return UNIT_ECHELONS.includes(value as UnitEchelon);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const branchParam = searchParams.get("branch") ?? undefined;
    const echelonParam = searchParams.get("echelon") ?? undefined;
    const terrain = searchParams.get("terrain") ?? undefined;
    const formation = searchParams.get("formation") ?? undefined;

    let branch: UnitBranch | undefined;
    if (branchParam) {
      if (!isUnitBranch(branchParam)) {
        return NextResponse.json({ error: "Invalid unit branch", validBranches: UNIT_BRANCHES }, { status: 400 });
      }
      branch = branchParam;
    }

    let echelon: UnitEchelon | undefined;
    if (echelonParam) {
      if (!isUnitEchelon(echelonParam)) {
        return NextResponse.json({ error: "Invalid unit echelon", validEchelons: UNIT_ECHELONS }, { status: 400 });
      }
      echelon = echelonParam;
    }

    // Calculate effectiveness for branch + echelon + terrain
    if (branch && echelon && terrain) {
      const effectiveness = calculateUnitEffectiveness(branch, echelon, terrain);
      const rating = getStrengthRating(branch, echelon);
      return NextResponse.json({
        branch,
        echelon,
        terrain,
        effectiveness,
        rating: rating ? {
          combatPowerIndex: rating.combatPowerIndex,
          firePower: rating.firePower,
          survivability: rating.survivability,
          mobility: rating.mobility,
          terrainEffectiveness: rating.terrainEffectiveness,
        } : null,
      });
    }

    // Get specific strength rating
    if (branch && echelon) {
      const rating = getStrengthRating(branch, echelon);
      if (!rating) {
        return NextResponse.json({ error: "Rating not found" }, { status: 404 });
      }
      return NextResponse.json(rating);
    }

    // Get formation template
    if (formation) {
      const template = getFormationTemplate(formation);
      if (!template) {
        return NextResponse.json({ error: "Formation not found" }, { status: 404 });
      }
      return NextResponse.json(template);
    }

    // Get formations by branch
    if (branch) {
      const formations = getFormationsByBranch(branch);
      return NextResponse.json({
        branch,
        count: formations.length,
        formations: formations.map((f) => ({
          name: f.name,
          nameRu: f.nameRu,
          echelon: f.echelon,
          totalPersonnel: f.totalPersonnel,
          combatPowerIndex: f.combatPowerIndex,
          equipment: f.equipment,
        })),
      });
    }

    // All templates
    const all = getAllFormationTemplates();
    return NextResponse.json({
      count: all.length,
      formations: all.map((f) => ({
        name: f.name,
        nameRu: f.nameRu,
        echelon: f.echelon,
        branch: f.branch,
        totalPersonnel: f.totalPersonnel,
        combatPowerIndex: f.combatPowerIndex,
        subUnits: f.subUnits.length,
        equipment: f.equipment.length,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
