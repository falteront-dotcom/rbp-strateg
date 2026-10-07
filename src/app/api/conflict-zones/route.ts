import { NextRequest, NextResponse } from "next/server";
import { CONFLICT_ZONES } from "@/lib/facilities/conflict-zones.generated";

/**
 * GET /api/conflict-zones — live conflict & tension zones worldwide.
 *
 * Query params (all optional, combinable):
 *   ?type=war|insurgency|tension|frozen|maritime_dispute  comma-separated
 *   ?iso=AAA     zones whose parties include this ISO3
 *   ?minIntensity=1-10
 *
 * Response: { count, zones: ConflictZone[] } sorted by intensity desc.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const typeParam = searchParams.get("type");
    const iso = searchParams.get("iso")?.trim().toUpperCase();
    const minIntensityRaw = searchParams.get("minIntensity");

    let zones = CONFLICT_ZONES;

    if (typeParam) {
      const types = new Set(typeParam.split(",").map((t) => t.trim()));
      zones = zones.filter((z) => types.has(z.type));
    }
    if (iso) {
      const normalized = iso === "PHI" ? "PHL" : iso;
      zones = zones.filter((z) => z.parties.includes(normalized));
    }
    if (minIntensityRaw) {
      const minIntensity = Number(minIntensityRaw);
      if (Number.isFinite(minIntensity)) {
        zones = zones.filter((z) => z.intensity >= minIntensity);
      }
    }

    return NextResponse.json({ count: zones.length, zones });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
