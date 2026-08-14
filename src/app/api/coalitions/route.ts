import { NextResponse } from "next/server";
import { openReadonlyDatabase } from "@/db/runtime";
import { mapCountryRows, type RawCountryRow } from "@/db/country-mapper";
import {
  PREDEFINED_COALITIONS,
  aggregateCoalitionBP,
  type CoalitionBP,
  type CoalitionMember,
} from "@/lib/coalitions";

/** Load every country mapped through the shared mapper. */
function loadMembers(db: ReturnType<typeof openReadonlyDatabase>): CoalitionMember[] {
  const rows = db.prepare("SELECT * FROM countries").all() as RawCountryRow[];
  return mapCountryRows(rows) as unknown as CoalitionMember[];
}

/** GET /api/coalitions — Returns all predefined coalitions with aggregated BP */
export async function GET(): Promise<NextResponse> {
  try {
    const sqlite = openReadonlyDatabase();
    let allMembers: CoalitionMember[];
    try {
      allMembers = loadMembers(sqlite);
    } finally {
      sqlite.close();
    }

    const results: CoalitionBP[] = [];
    for (const [name, isoCodes] of PREDEFINED_COALITIONS) {
      const aggregated = aggregateCoalitionBP(name, isoCodes, allMembers);
      results.push(aggregated);
    }

    return NextResponse.json(results);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** POST /api/coalitions — Build a custom coalition from name + isoCodes */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as {
      name?: string;
      isoCodes?: string[];
    };

    const name = body.name ?? "Custom";
    const isoCodes = body.isoCodes ?? [];

    if (isoCodes.length === 0) {
      return NextResponse.json(
        { error: "isoCodes array must not be empty" },
        { status: 400 },
      );
    }

    if (!Array.isArray(isoCodes) || isoCodes.some((c) => typeof c !== "string" || c.length !== 3)) {
      return NextResponse.json(
        { error: "isoCodes must be an array of ISO 3166-1 alpha-3 strings" },
        { status: 400 },
      );
    }

    const sqlite = openReadonlyDatabase();
    let allMembers: CoalitionMember[];
    try {
      allMembers = loadMembers(sqlite);
    } finally {
      sqlite.close();
    }

    const aggregated = aggregateCoalitionBP(name, isoCodes, allMembers);

    return NextResponse.json(aggregated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
