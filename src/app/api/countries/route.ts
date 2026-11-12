import { NextResponse } from "next/server";
import { openReadonlyDatabase } from "@/db/runtime";
import { mapCountryRows, type RawCountryRow } from "@/db/country-mapper";
import { ensureDatasetRefreshScheduler } from "@/lib/dataset/server-refresh";

/** GET /api/countries — Returns all countries with BP data, ranked by bp_total. */
export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  ensureDatasetRefreshScheduler();
  const db = openReadonlyDatabase();
  try {
    const rows = db
      .prepare("SELECT * FROM countries ORDER BY bp_total DESC")
      .all() as RawCountryRow[];

    // Shared mapper converts snake_case SQLite rows to the public camelCase
    // shape and derives `region`. The API ranking is added on top of that.
    const countries = mapCountryRows(rows).map((country, index) => ({
      ...country,
      bpRank: index + 1,
    }));

    return NextResponse.json(countries);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    db.close();
  }
}
