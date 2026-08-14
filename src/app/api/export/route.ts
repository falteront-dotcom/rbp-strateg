// ─────────────────────────────────────────────────────────────────────────────
// API /api/export — Export all or single country data
// GET ?format=csv|json&iso=XXX
// РБП-Стратег 2.0
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { openReadonlyDatabase } from "@/db/runtime";
import { mapCountryRows, mapCountryRow, type RawCountryRow } from "@/db/country-mapper";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") ?? "csv";
    const iso = searchParams.get("iso") ?? undefined;
    const components = searchParams.get("components") === "true"; // Include BP component details

    const db = openReadonlyDatabase();
    let exportRows: Record<string, unknown>[];
    try {
      let rows: RawCountryRow[];
      if (iso) {
        const row = db
          .prepare("SELECT * FROM countries WHERE iso_code = ?")
          .get(iso) as RawCountryRow | undefined;
        rows = row ? [row] : [];
      } else {
        rows = db
          .prepare("SELECT * FROM countries ORDER BY bp_total DESC")
          .all() as RawCountryRow[];
      }

      if (rows.length === 0) {
        return NextResponse.json({ error: "No data found" }, { status: 404 });
      }

      // Map snake_case SQLite rows to the public camelCase shape. `region` is
      // derived by the mapper (it is not a stored column).
      const mapped = iso
        ? rows.map((r) => mapCountryRow(r))
        : mapCountryRows(rows);

      // Filter columns if not requesting full component details
      exportRows = components
        ? (mapped as unknown as Record<string, unknown>[])
        : mapped.map((row) => ({
            isoCode: row.isoCode,
            name: row.name,
            nameRu: row.nameRu,
            side: row.side,
            coalition: row.coalition,
            region: row.region,
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
    } finally {
      db.close();
    }

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
