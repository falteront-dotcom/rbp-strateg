// ─────────────────────────────────────────────────────────────────────────────
// API /api/equipment — Military Equipment Reference
// GET ?iso=USA&type=mbt — returns equipment specs for a country
// РБП-Стратег 2.0
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { getEquipmentByCountry, getEquipmentByCategory, getAllEquipment, type EquipmentSpec } from "@/lib/equipment-reference";

const EQUIPMENT_CATEGORIES = ["mbt", "ifv", "artillery", "mlrs", "sam", "fighter", "bomber", "attack_heli", "transport", "carrier", "destroyer", "frigate", "corvette", "submarine_ssk", "submarine_ssn", "submarine_ssbn", "icbm", "slbm", "cruise_missile"] as const;

function isEquipmentCategory(value: string): value is EquipmentSpec["category"] {
  return EQUIPMENT_CATEGORIES.includes(value as EquipmentSpec["category"]);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const iso = searchParams.get("iso") ?? undefined;
    const type = searchParams.get("type") ?? undefined;

    let data;

    if (iso) {
      data = getEquipmentByCountry(iso);
      if (data.length === 0) {
        return NextResponse.json({
          iso,
          equipment: [],
          note: "No detailed equipment specs available for this country. Data available for: USA, RUS, CHN, DEU, GBR, FRA, IND, ISR, KOR.",
        });
      }
    } else if (type) {
      if (!isEquipmentCategory(type)) {
        return NextResponse.json({ error: "Invalid equipment category", validCategories: EQUIPMENT_CATEGORIES }, { status: 400 });
      }
      data = getEquipmentByCategory(type);
    } else {
      data = getAllEquipment();
    }

    return NextResponse.json({
      count: data.length,
      equipment: data.map((e) => ({
        name: e.name,
        nameRu: e.nameRu,
        category: e.category,
        country: e.country,
        generation: e.generation,
        crew: e.crew,
        weight_tons: e.weight_tons,
        range_km: e.range_km,
        speed_kmh: e.speed_kmh,
        caliber_mm: e.caliber_mm,
        warheads: e.warheads,
        isActive: e.isActive,
        natoReportingName: e.natoReportingName,
        description: e.description,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
