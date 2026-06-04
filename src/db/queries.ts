import { eq, sql, desc } from "drizzle-orm";
import { db } from "./index";
import { countries, type Country } from "./schema";

/** Get a single country by ISO 3166-1 alpha-3 code */
export function getCountryByISO(isoCode: string): Country | undefined {
  return db
    .select()
    .from(countries)
    .where(eq(countries.isoCode, isoCode))
    .get();
}

/** Get all countries sorted by bp_total descending (Battle Potential ranking) */
export function getAllCountriesBP(): Country[] {
  return db
    .select()
    .from(countries)
    .orderBy(desc(countries.bpTotal))
    .all();
}

/** Get countries filtered by coalition (NATO, CSTO, AUKUS, BRICS) */
export function getCountriesByCoalition(
  coalition: "NATO" | "CSTO" | "AUKUS" | "BRICS",
): Country[] {
  return db
    .select()
    .from(countries)
    .where(eq(countries.coalition, coalition))
    .orderBy(desc(countries.bpTotal))
    .all();
}

/** Get countries filtered by side (NATO, RUS, CHINA, NEUTRAL) */
export function getCountriesBySide(
  side: "NATO" | "RUS" | "CHINA" | "NEUTRAL",
): Country[] {
  return db
    .select()
    .from(countries)
    .where(eq(countries.side, side))
    .orderBy(desc(countries.bpTotal))
    .all();
}
