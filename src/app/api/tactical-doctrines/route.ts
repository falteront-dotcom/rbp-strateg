// ─────────────────────────────────────────────────────────────────────────────
// API /api/tactical-doctrines — Tactical Doctrine Reference
// GET ?type=deep_operation — returns doctrine profiles
// РБП-Стратег 2.0
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { getDoctrineByType, getAllDoctrines, getDoctrinesByCountry, getCounterDoctrine, type DoctrineType } from "@/lib/tactical-doctrines";

const DOCTRINE_TYPES = ["deep_operation", "airland_battle", "maneuver_warfare", "attrition_warfare", "hybrid_warfare", "area_denial", "insurgency", "maritime_power", "nuclear_deterrence", "network_centric"] as const;

function isDoctrineType(value: string): value is DoctrineType {
  return DOCTRINE_TYPES.includes(value as DoctrineType);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") ?? undefined;
    const iso = searchParams.get("iso") ?? undefined;
    const counter = searchParams.get("counter") ?? undefined;

    if (type && counter === "true") {
      if (!isDoctrineType(type)) {
        return NextResponse.json({ error: "Invalid doctrine type", validTypes: DOCTRINE_TYPES }, { status: 400 });
      }
      const counterDoctrines = getCounterDoctrine(type);
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
      if (!isDoctrineType(type)) {
        return NextResponse.json({ error: "Invalid doctrine type", validTypes: DOCTRINE_TYPES }, { status: 400 });
      }
      const doctrine = getDoctrineByType(type);
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
