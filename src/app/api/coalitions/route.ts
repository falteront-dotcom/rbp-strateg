import { NextResponse } from "next/server";
import {
  PREDEFINED_COALITIONS,
  COALITION_BP_COMPONENTS,
  aggregateCoalitionBP,
  type CoalitionBP,
  type CoalitionMember,
  type CoalitionBPComponent,
} from "@/lib/coalitions";

/** Map a raw DB row (snake_case) to a CoalitionMember (camelCase) */
function rowToMember(row: Record<string, unknown>): CoalitionMember {
  return {
    isoCode: row.iso_code as string,
    nameRu: row.name_ru as string,
    side: row.side as string,
    bpTotal: (row.bp_total as number) ?? 0,
    bpWeapon: (row.bp_weapon as number) ?? 0,
    bpManpower: (row.bp_manpower as number) ?? 0,
    bpLogistics: (row.bp_logistics as number) ?? 0,
    bpC2: (row.bp_c2 as number) ?? 0,
    bpEconomy: (row.bp_economy as number) ?? 0,
    bpDoctrine: (row.bp_doctrine as number) ?? 0,
    bpReadiness: (row.bp_readiness as number) ?? 0,
    bpTerrain: (row.bp_terrain as number) ?? 0,
  };
}

/** GET /api/coalitions — Returns all predefined coalitions with aggregated BP */
export async function GET(): Promise<NextResponse> {
  try {
    const Database = (await import("better-sqlite3")).default;
    const path = (await import("path")).default;
    const DB_PATH = path.resolve(process.cwd(), "sqlite.db");
    const sqlite = new Database(DB_PATH);
    sqlite.pragma("journal_mode = WAL");

    const rows = sqlite.prepare("SELECT * FROM countries").all() as Record<string, unknown>[];
    sqlite.close();

    const allMembers: CoalitionMember[] = rows.map(rowToMember);

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

    const Database = (await import("better-sqlite3")).default;
    const path = (await import("path")).default;
    const DB_PATH = path.resolve(process.cwd(), "sqlite.db");
    const sqlite = new Database(DB_PATH);
    sqlite.pragma("journal_mode = WAL");

    const rows = sqlite.prepare("SELECT * FROM countries").all() as Record<string, unknown>[];
    sqlite.close();

    const allMembers: CoalitionMember[] = rows.map(rowToMember);
    const aggregated = aggregateCoalitionBP(name, isoCodes, allMembers);

    return NextResponse.json(aggregated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
