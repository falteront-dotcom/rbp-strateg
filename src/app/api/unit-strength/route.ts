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
} from "@/lib/unit-strength";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const branch = searchParams.get("branch") ?? undefined;
    const echelon = searchParams.get("echelon") ?? undefined;
    const terrain = searchParams.get("terrain") ?? undefined;
    const formation = searchParams.get("formation") ?? undefined;

    // Calculate effectiveness for branch + echelon + terrain
    if (branch && echelon && terrain) {
      const effectiveness = calculateUnitEffectiveness(branch as any, echelon as any, terrain);
      const rating = getStrengthRating(branch as any, echelon as any);
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
      const rating = getStrengthRating(branch as any, echelon as any);
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
      const formations = getFormationsByBranch(branch as any);
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
