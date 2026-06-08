// ─────────────────────────────────────────────────────────────────────────────
// API /api/export — Export all or single country data
// GET ?format=csv|json&iso=XXX
// РБП-Стратег 2.0
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";

function rowToExportRow(row: Record<string, unknown>) {
  return {
    isoCode: row.iso_code,
    name: row.name,
    nameRu: row.name_ru,
    side: row.side,
    coalition: row.coalition,
    areaKm2: row.area_km2,
    coastlineKm: row.coastline_km,
    climateZone: row.climate_zone,
    gdpPppBn: row.gdp_ppp_bn,
    militaryBudgetBn: row.military_budget_bn,
    defensePctGdp: row.defense_pct_gdp,
    populationM: row.population_m,
    activePersonnel: row.active_personnel,
    reservePersonnel: row.reserve_personnel,
    fitForServiceM: row.fit_for_service_m,
    totalTanks: row.total_tanks,
    totalAfv: row.total_afv,
    totalArtillery: row.total_artillery,
    totalMlrs: row.total_mlrs,
    totalAircraft: row.total_aircraft,
    totalHelicopters: row.total_helicopters,
    totalNavy: row.total_navy,
    submarines: row.submarines,
    aircraftCarriers: row.aircraft_carriers,
    nuclearWarheads: row.nuclear_warheads ?? 0,
    ports: row.ports,
    airfields: row.airfields,
    oilProductionKbd: row.oil_production_kbd,
    merchantFleet: row.merchant_fleet,
    techLevel: row.tech_level,
    moraleIndex: row.morale_index,
    combatExperience: row.combat_experience,
    c2Capability: row.c2_capability,
    ewCapability: row.ew_capability,
    bpTotal: row.bp_total ?? 0,
    bpWeapon: row.bp_weapon ?? 0,
    bpManpower: row.bp_manpower ?? 0,
    bpLogistics: row.bp_logistics ?? 0,
    bpC2: row.bp_c2 ?? 0,
    bpEconomy: row.bp_economy ?? 0,
    bpDoctrine: row.bp_doctrine ?? 0,
    bpReadiness: row.bp_readiness ?? 0,
    bpTerrain: row.bp_terrain ?? 0,
    updatedAt: row.updated_at,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") ?? "csv";
    const iso = searchParams.get("iso") ?? undefined;
    const components = searchParams.get("components") === "true"; // Include BP component details

    const Database = (await import("better-sqlite3")).default;
    const db = new Database("sqlite.db", { readonly: true });

    let rows: Record<string, unknown>[];
    if (iso) {
      rows = db.prepare("SELECT * FROM countries WHERE iso_code = ?").all(iso) as Record<string, unknown>[];
    } else {
      rows = db.prepare("SELECT * FROM countries ORDER BY bp_total DESC").all() as Record<string, unknown>[];
    }
    db.close();

    if (rows.length === 0) {
      return NextResponse.json({ error: "No data found" }, { status: 404 });
    }

    const mappedRows = rows.map(rowToExportRow);

    // Filter columns if not requesting full component details
    const exportRows = components ? mappedRows : mappedRows.map((row) => ({
      isoCode: row.isoCode,
      name: row.name,
      nameRu: row.nameRu,
      side: row.side,
      coalition: row.coalition,
      bpTotal: row.bpTotal,
      bpWeapon: row.bpWeapon,
      bpManpower: row.bpManpower,
      bpLogistics: row.bpLogistics,
      bpC2: row.bpC2,
      bpEconomy: row.bpEconomy,
      bpDoctrine: row.bpDoctrine,
      bpReadiness: row.bpReadiness,
      bpTerrain: row.bpTerrain,
      gdpPppBn: row.gdpPppBn,
      militaryBudgetBn: row.militaryBudgetBn,
      defensePctGdp: row.defensePctGdp,
      populationM: row.populationM,
      activePersonnel: row.activePersonnel,
      totalTanks: row.totalTanks,
      totalAircraft: row.totalAircraft,
      totalNavy: row.totalNavy,
      nuclearWarheads: row.nuclearWarheads,
    }));

    if (format === "json") {
      return NextResponse.json(exportRows, {
        headers: {
          "Content-Disposition": `attachment; filename="rbp-strateg${iso ? `-${iso}` : "-all"}.json"`,
        },
      });
    }

    // CSV generation
    const headers = Object.keys(exportRows[0] as Record<string, unknown>);
    const csvLines: string[] = [headers.join(",")];

    for (const row of exportRows) {
      const typedRow = row as Record<string, unknown>;
      const line = headers.map((h) => {
        const val = typedRow[h];
        if (val === null || val === undefined) return "";
        const str = String(val);
        // Escape CSV values containing commas, quotes, or newlines
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(",");
      csvLines.push(line);
    }

    const csv = "\uFEFF" + csvLines.join("\n"); // BOM for Excel UTF-8 support

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="rbp-strateg${iso ? `-${iso}` : "-all"}.csv"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
