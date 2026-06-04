// ─────────────────────────────────────────────────────────────────────────────
// API /api/tactical-doctrines — Tactical Doctrine Reference
// GET ?type=deep_operation — returns doctrine profiles
// РБП-Стратег 2.0
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { getDoctrineByType, getAllDoctrines, getDoctrinesByCountry, getCounterDoctrine } from "@/lib/tactical-doctrines";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") ?? undefined;
    const iso = searchParams.get("iso") ?? undefined;
    const counter = searchParams.get("counter") ?? undefined;

    if (type && counter === "true") {
      const counterDoctrines = getCounterDoctrine(type as any);
      return NextResponse.json({
        doctrine: type,
        counterDoctrines: counterDoctrines.map((d) => ({
          type: d.type,
          nameRu: d.nameRu,
          strengthsVs: d.strengthsVs,
        })),
      });
    }

    if (type) {
      const doctrine = getDoctrineByType(type as any);
      if (!doctrine) {
        return NextResponse.json({ error: "Doctrine not found" }, { status: 404 });
      }
      return NextResponse.json(doctrine);
    }

    if (iso) {
      const doctrines = getDoctrinesByCountry(iso);
      return NextResponse.json({
        isoCode: iso,
        doctrines: doctrines.map((d) => ({
          type: d.type,
          nameRu: d.nameRu,
          originPeriod: d.originPeriod,
        })),
      });
    }

    const all = getAllDoctrines();
    return NextResponse.json({
      count: all.length,
      doctrines: all.map((d) => ({
        type: d.type,
        nameRu: d.nameRu,
        originCountry: d.originCountry,
        originPeriod: d.originPeriod,
        combinedArmsRatio: d.combinedArmsRatio,
        terrainPreference: d.terrainPreference,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
