import { NextResponse } from "next/server";
import { calculateAdvancedCombatPotentialBatch } from "@/lib/bp/advanced-combat-potential";
import { toCountryApiData, toCountryRawData } from "@/lib/db/country-row-mapper";

/** Derive a region label from side/coalition */
function deriveRegion(side: string, coalition: string | null): string {
  if (coalition === "NATO") return "NATO";
  if (coalition === "CSTO") return "CSTO";
  if (coalition === "AUKUS") return "AUKUS";
  if (coalition === "BRICS") return "BRICS";
  if (side === "NATO") return "Western";
  if (side === "RUS") return "Eurasian";
  if (side === "CHINA") return "Asia-Pacific";
  return "Non-Aligned";
}

/** GET /api/countries — Returns all countries with BP data, ranked */
export async function GET(): Promise<NextResponse> {
  try {
    // Dynamic import to avoid bundling the entire BP calculation tree
    const Database = (await import("better-sqlite3")).default;
    const path = (await import("path")).default;
    const DB_PATH = path.resolve(process.cwd(), "sqlite.db");
    const sqlite = new Database(DB_PATH, { readonly: true });
    sqlite.pragma("journal_mode = WAL");

    const rows = sqlite.prepare(`
      SELECT * FROM countries ORDER BY bp_total DESC
    `).all() as Record<string, unknown>[];

    sqlite.close();

    const rawCountries = rows.map(toCountryRawData);
    const advancedProfiles = calculateAdvancedCombatPotentialBatch(rawCountries);
    const advancedByIso = new Map(advancedProfiles.map((profile) => [profile.isoCode, profile]));

    const enriched = rows.map((row, index) => {
      const country = toCountryApiData(row);
      const advanced = advancedByIso.get(country.isoCode);

      return {
        ...country,
        region: deriveRegion(country.side, country.coalition),
        bpAdvanced: advanced?.advancedBP ?? country.bpTotal,
        bpAdvancedConfidence: advanced?.confidence ?? 0,
        bpAdvancedSummary: advanced?.summary ?? "",
        bpAdvancedDomains: advanced?.domains.map((domain) => ({
          key: domain.key,
          name: domain.name,
          score: domain.score,
          weight: domain.weight,
          confidence: domain.confidence,
        })) ?? [],
        bpAdvancedModifiers: advanced?.modifiers ?? [],
        bpAdvancedRisks: advanced?.riskFlags ?? [],
        bpAdvancedStrengths: advanced?.strengths ?? [],
        bpAdvancedWeaknesses: advanced?.weaknesses ?? [],
        bpRank: index + 1,
      };
    });

    return NextResponse.json(enriched);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
