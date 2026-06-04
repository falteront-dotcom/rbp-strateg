// ─────────────────────────────────────────────────────────────────────────────
// API /api/conflicts — Conflict History Database
// GET ?iso=RUS — returns conflict history for a country
// РБП-Стратег 2.0
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import {
  getConflictsByCountry,
  getConflictStats,
  getOngoingConflicts,
  getAllConflicts,
  calculateConflictExperience,
} from "@/lib/conflict-history";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const iso = searchParams.get("iso") ?? undefined;
    const ongoing = searchParams.get("ongoing") === "true";

    if (ongoing) {
      const conflicts = getOngoingConflicts();
      return NextResponse.json({
        count: conflicts.length,
        conflicts: conflicts.map((c) => ({
          id: c.id,
          name: c.name,
          nameRu: c.nameRu,
          startDate: c.startDate,
          type: c.type,
          location: c.locationRu,
          intensity: c.intensity,
          significance: c.significance,
          participants: c.participants.map((p) => ({
            isoCode: p.isoCode,
            side: p.side,
            role: p.role,
            outcome: p.outcome,
          })),
        })),
      });
    }

    if (!iso) {
      const all = getAllConflicts();
      return NextResponse.json({
        count: all.length,
        conflicts: all.map((c) => ({
          id: c.id,
          name: c.name,
          nameRu: c.nameRu,
          startDate: c.startDate,
          endDate: c.endDate,
          type: c.type,
          intensity: c.intensity,
          significance: c.significance,
          outcome: c.outcome,
        })),
      });
    }

    const conflicts = getConflictsByCountry(iso);
    const stats = getConflictStats(iso);
    const experienceScore = calculateConflictExperience(iso);

    return NextResponse.json({
      iso,
      experienceScore,
      stats: {
        totalConflicts: stats.totalConflicts,
        wins: stats.wins,
        losses: stats.losses,
        draws: stats.draws,
        ongoing: stats.ongoing,
        winRate: Math.round(stats.winRate * 100),
        avgIntensity: Math.round(stats.avgIntensity * 10) / 10,
        totalCasualties: stats.totalCasualties,
        dominantType: stats.dominantType,
      },
      conflicts: conflicts.map((c) => ({
        id: c.id,
        name: c.name,
        nameRu: c.nameRu,
        startDate: c.startDate,
        endDate: c.endDate,
        type: c.type,
        intensity: c.intensity,
        significance: c.significance,
        outcome: c.outcome,
        role: c.participants.find((p) => p.isoCode === iso)?.side,
        casualties: c.participants.find((p) => p.isoCode === iso)?.casualties,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
