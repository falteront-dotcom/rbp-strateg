import { NextRequest, NextResponse } from "next/server";
import { STRATEGIC_FACILITIES } from "@/lib/facilities/strategic-facilities.generated";
import { isFacilityType } from "@/lib/facilities/types";

/**
 * GET /api/facilities — strategic facilities & military bases worldwide.
 *
 * Query params (all optional, combinable):
 *   ?type=air_base|naval_base|...   one or more comma-separated facility types
 *   ?iso=AAA                        facilities hosted by country ISO3
 *   ?operator=AAA                   facilities operated by country ISO3
 *   ?minValue=1-10                  minimum strategic value
 *
 * Response: { count, facilities: StrategicFacility[] } sorted by strategic value.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const typeParam = searchParams.get("type");
    const iso = searchParams.get("iso")?.trim().toUpperCase();
    const operator = searchParams.get("operator")?.trim().toUpperCase();
    const minValueRaw = searchParams.get("minValue");

    let facilities = STRATEGIC_FACILITIES;

    if (typeParam) {
      const types = typeParam.split(",").map((t) => t.trim()).filter(isFacilityType);
      if (types.length > 0) {
        facilities = facilities.filter((f) => types.includes(f.type));
      }
    }
    if (iso) {
      const normalized = iso === "PHI" ? "PHL" : iso;
      facilities = facilities.filter((f) => f.hostIso === normalized);
    }
    if (operator) {
      const normalized = operator === "PHI" ? "PHL" : operator;
      facilities = facilities.filter((f) => f.operator === normalized);
    }
    if (minValueRaw) {
      const minValue = Number(minValueRaw);
      if (Number.isFinite(minValue)) {
        facilities = facilities.filter((f) => f.strategicValue >= minValue);
      }
    }

    return NextResponse.json({ count: facilities.length, facilities });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
