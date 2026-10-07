import { NextResponse } from "next/server";
import { openReadonlyDatabase } from "@/db/runtime";
import { mapCountryRow, type RawCountryRow } from "@/db/country-mapper";
import { STRATEGIC_FACILITIES } from "@/lib/facilities/strategic-facilities.generated";

/**
 * GET /api/countries/[iso] — full profile of one state: BP data plus the
 * strategic facilities it hosts and operates.
 *
 * Response 200: { country, hostedFacilities, operatedFacilities }
 * Response 404: { error } when the ISO is unknown.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ iso: string }> },
): Promise<NextResponse> {
  const { iso } = await params;
  const code = (iso ?? "").trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) {
    return NextResponse.json({ error: "Invalid ISO code" }, { status: 400 });
  }
  // PHI and PHL are the same state; the DB keeps the legacy PHI key while
  // geometry and facilities use canonical PHL. Accept both, query both.
  const aliases = code === "PHI" ? ["PHI", "PHL"] : code === "PHL" ? ["PHL", "PHI"] : [code];

  const db = openReadonlyDatabase();
  try {
    const row = db
      .prepare(`SELECT * FROM countries WHERE iso_code IN (${aliases.map(() => "?").join(",")})`)
      .get(...aliases) as RawCountryRow | undefined;
    if (!row) {
      return NextResponse.json({ error: `Unknown country: ${code}` }, { status: 404 });
    }

    const hostedFacilities = STRATEGIC_FACILITIES.filter((f) => aliases.includes(f.hostIso));
    const operatedFacilities = STRATEGIC_FACILITIES.filter((f) => aliases.includes(f.operator));

    return NextResponse.json({
      country: mapCountryRow(row),
      hostedFacilities,
      operatedFacilities,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    db.close();
  }
}
