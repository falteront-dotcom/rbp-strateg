// ─────────────────────────────────────────────────────────────────────────────
// API /api/analytics — Analytics data endpoints
// GET ?type=ranking|distribution|anomalies|correlation|trend&iso=XXX
// РБП-Стратег 2.0
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import {
  getBPRanking,
  getBPDistribution,
  getAnomalies,
  getCorrelationMatrix,
  getTrendData,
  type CountryData,
} from "@/lib/analytics";
import { toCountryApiData } from "@/lib/db/country-row-mapper";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") ?? "ranking";
    const iso = searchParams.get("iso") ?? undefined;

    // Dynamic import for better-sqlite3
    const Database = (await import("better-sqlite3")).default;
    const db = new Database("sqlite.db", { readonly: true });
    const allRows = db.prepare("SELECT * FROM countries").all() as Record<string, unknown>[];
    db.close();

    // Convert DB snake_case rows to analytics-compatible camelCase data.
    const countries: CountryData[] = allRows.map((row, index) => {
      const api = toCountryApiData(row);
      return {
        isoCode: api.isoCode,
        name: api.name,
        nameRu: api.nameRu,
        side: api.side,
        coalition: api.coalition,
        region: "global",
        areaKm2: api.areaKm2,
        coastlineKm: api.coastlineKm,
        gdpPppBn: api.gdpPppBn,
        militaryBudgetBn: api.militaryBudgetBn,
        defensePctGdp: api.defensePctGdp,
        populationM: api.populationM,
        activePersonnel: api.activePersonnel,
        reservePersonnel: api.reservePersonnel,
        totalTanks: api.totalTanks,
        totalAfv: api.totalAfv,
        totalArtillery: api.totalArtillery,
        totalAircraft: api.totalAircraft,
        totalHelicopters: api.totalHelicopters,
        totalNavy: api.totalNavy,
        submarines: api.submarines,
        nuclearWarheads: api.nuclearWarheads,
        ports: api.ports,
        airfields: api.airfields,
        oilProductionKbd: api.oilProductionKbd,
        merchantFleet: api.merchantFleet,
        techLevel: api.techLevel,
        moraleIndex: api.moraleIndex,
        combatExperience: api.combatExperience,
        c2Capability: api.c2Capability,
        ewCapability: api.ewCapability,
        bpTotal: api.bpTotal,
        bpWeapon: api.bpWeapon,
        bpManpower: api.bpManpower,
        bpLogistics: api.bpLogistics,
        bpC2: api.bpC2,
        bpEconomy: api.bpEconomy,
        bpDoctrine: api.bpDoctrine,
        bpReadiness: api.bpReadiness,
        bpTerrain: api.bpTerrain,
        bpRank: index + 1,
      };
    });

    let data: unknown;

    switch (type) {
      case "ranking": {
        data = getBPRanking(countries);
        break;
      }
      case "distribution": {
        data = getBPDistribution(countries);
        break;
      }
      case "anomalies": {
        data = getAnomalies(countries);
        break;
      }
      case "correlation": {
        data = getCorrelationMatrix(countries);
        break;
      }
      case "trend": {
        if (!iso) {
          return NextResponse.json({ error: "Missing iso parameter for trend" }, { status: 400 });
        }
        data = getTrendData(iso, countries);
        break;
      }
      default:
        return NextResponse.json({ error: "Invalid type parameter" }, { status: 400 });
    }

    return NextResponse.json({ type, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
