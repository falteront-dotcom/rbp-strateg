import { NextResponse } from "next/server";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { countries } from "@/db/schema";
import { top20Countries } from "@/db/seed/top20-countries";
import { extendedCountries } from "@/db/seed/extended-countries";
import { additionalCountries } from "@/db/seed/additional-countries";
import { calculateAllCountriesBP } from "@/lib/bp";
import type { CountryRawData } from "@/lib/bp/types";
import type { NewCountry } from "@/db/schema";
import { openDatabase, isAuthorizedAdminRequest } from "@/db/runtime";
import { ensureCountriesTable } from "@/db/countries-ddl";
import { ensureDatasetSchema } from "@/db/dataset-schema";
import { ensureWorkspaceSchema } from "@/db/workspace-schema";
import { recordPublishedDataset } from "@/db/dataset-repository";
import { validateCountryDataset } from "@/lib/dataset/validation";
import type { RawCountryRow } from "@/db/country-mapper";

const UPDATE_BP_SQL = `
  UPDATE countries SET
    bp_total = ?, bp_weapon = ?, bp_manpower = ?, bp_logistics = ?,
    bp_c2 = ?, bp_economy = ?, bp_doctrine = ?, bp_readiness = ?, bp_terrain = ?
  WHERE iso_code = ?
`;

/** Map a seed row to the BP engine input shape, preserving legitimate zeros. */
function seedRowToRawData(c: NewCountry): CountryRawData {
  return {
    isoCode: c.isoCode,
    name: c.name,
    nameRu: c.nameRu,
    side: c.side as CountryRawData["side"],
    coalition: (c.coalition ?? null) as CountryRawData["coalition"],
    areaKm2: c.areaKm2,
    coastlineKm: c.coastlineKm,
    climateZone: c.climateZone,
    gdpPppBn: c.gdpPppBn,
    militaryBudgetBn: c.militaryBudgetBn,
    defensePctGdp: c.defensePctGdp,
    populationM: c.populationM,
    activePersonnel: c.activePersonnel,
    reservePersonnel: c.reservePersonnel,
    fitForServiceM: c.fitForServiceM,
    totalTanks: c.totalTanks,
    totalAfv: c.totalAfv,
    totalArtillery: c.totalArtillery,
    totalMlrs: c.totalMlrs,
    totalAircraft: c.totalAircraft,
    totalHelicopters: c.totalHelicopters,
    totalNavy: c.totalNavy,
    submarines: c.submarines,
    aircraftCarriers: c.aircraftCarriers,
    nuclearWarheads: c.nuclearWarheads ?? 0,
    ports: c.ports,
    airfields: c.airfields,
    oilProductionKbd: c.oilProductionKbd,
    merchantFleet: c.merchantFleet,
    techLevel: c.techLevel,
    moraleIndex: c.moraleIndex,
    combatExperience: c.combatExperience,
    c2Capability: c.c2Capability,
    ewCapability: c.ewCapability,
    updatedAt: c.updatedAt,
  };
}

/**
 * POST /api/init-db — Initialize database (create table, seed, calculate BP).
 *
 * Authenticated: requires `x-admin-token` equal to the server-side
 * `RBP_ADMIN_TOKEN`. The token is read only on the server; a missing or
 * mismatched token returns 401 BEFORE any database handle is opened, so
 * unauthorized requests can never mutate the DB.
 *
 * Atomic: the delete + seed insert + BP update run in a single write
 * transaction; on any failure the DB rolls back to its prior state.
 * Finally-safe: the connection is closed even on failure paths. GET is not
 * exported, so non-POST requests get 405 Method Not Allowed.
 */
export async function POST(request: Request): Promise<NextResponse> {
  if (!isAuthorizedAdminRequest(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let sqlite: ReturnType<typeof openDatabase> | undefined;
  try {
    const allData: NewCountry[] = [
      ...top20Countries,
      ...extendedCountries,
      ...additionalCountries,
    ];

    // Compute BP up front (pure, no DB access) so the write transaction only
    // touches the rows and is a single atomic unit.
    const rawData: CountryRawData[] = allData.map(seedRowToRawData);
    const bpResults = calculateAllCountriesBP(rawData);

    sqlite = openDatabase();
    const database = sqlite;
    const db = drizzle(database, { schema: { countries } });
    ensureCountriesTable(database);
    ensureDatasetSchema(database);
    ensureWorkspaceSchema(database);

    const updateStmt = database.prepare(UPDATE_BP_SQL);

    // One write transaction: clear, re-seed, and write BP scores atomically.
    database.transaction(() => {
      db.delete(countries).run();
      db.insert(countries).values(allData).run();
      for (const bp of bpResults) {
        updateStmt.run(
          bp.totalBP,
          bp.components.weapon.normalizedValue,
          bp.components.manpower.normalizedValue,
          bp.components.logistics.normalizedValue,
          bp.components.c2.normalizedValue,
          bp.components.economy.normalizedValue,
          bp.components.doctrine.normalizedValue,
          bp.components.readiness.normalizedValue,
          bp.components.terrain.normalizedValue,
          bp.isoCode,
        );
      }

      const seededRows = database.prepare("SELECT * FROM countries").all() as RawCountryRow[];
      const validation = validateCountryDataset(seededRows);
      if (!validation.ok) throw new Error(`Seed validation failed: ${validation.errors.map((issue) => issue.message).join('; ')}`);
      const version = `seed-${allData.map((country) => country.updatedAt).sort().at(-1) ?? 'unknown'}`;
      recordPublishedDataset(database, version, validation, { source: 'local-seed', countryCount: allData.length });
    })();

    const top10 = bpResults.slice(0, 10).map((bp) => ({
      rank: bp.rank,
      iso: bp.isoCode,
      name: bp.name,
      totalBP: Number(bp.totalBP.toFixed(1)),
    }));

    return NextResponse.json({
      ok: true,
      countriesSeeded: allData.length,
      bpCalculated: bpResults.length,
      top10,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  } finally {
    sqlite?.close();
  }
}