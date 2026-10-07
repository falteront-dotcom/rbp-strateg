import { WORLD_ISO3_TO_ISO2 } from "@/lib/geo/world-registry.generated";

// ISO 3166-1 alpha-3 to alpha-2 for countries represented by the RBP datasets.
// Flag emoji are encoded from alpha-2; using the first two alpha-3 letters is wrong
// (for example USA would become CH, the Swiss flag).
const ISO3_TO_ISO2: Readonly<Record<string, string>> = {
  AFG: "AF", ARE: "AE", ARG: "AR", ARM: "AM", AUS: "AU", AUT: "AT",
  BEL: "BE", BGR: "BG", BLR: "BY", BRA: "BR", CAN: "CA", CHE: "CH",
  CHN: "CN", CZE: "CZ", DEU: "DE", EGY: "EG", ESP: "ES", EST: "EE",
  ETH: "ET", FIN: "FI", FRA: "FR", GBR: "GB", GEO: "GE", GRC: "GR",
  HRV: "HR", HUN: "HU", IDN: "ID", IND: "IN", IRN: "IR", IRQ: "IQ",
  ISR: "IL", ITA: "IT", JPN: "JP", KAZ: "KZ", KGZ: "KG", KOR: "KR",
  LTU: "LT", LVA: "LV", MYS: "MY", NLD: "NL", NOR: "NO", NZL: "NZ",
  PAK: "PK", PHL: "PH", PHI: "PH", POL: "PL", PRK: "KP", PRT: "PT",
  ROU: "RO", RUS: "RU", SAU: "SA", SGP: "SG", SRB: "RS", SVK: "SK",
  SVN: "SI", SWE: "SE", SYR: "SY", THA: "TH", TJK: "TJ", TUR: "TR",
  TWN: "TW", UKR: "UA", USA: "US", VNM: "VN", ZAF: "ZA",
};

export function isoToFlag(iso: string): string {
  const code = iso.trim().toUpperCase();
  const alpha2 = ISO3_TO_ISO2[code] ?? WORLD_ISO3_TO_ISO2[code];
  if (!alpha2) return "";
  return String.fromCodePoint(...[...alpha2].map(letter => 0x1f1e6 + letter.charCodeAt(0) - 65));
}

/** ISO2-код для SVG-флага (flag-icons). Windows не рендерит флаги-эмодзи,
 *  поэтому в интерфейсе используются растровые/SVG-флаги по этому коду. */
export function isoToAlpha2(iso: string): string | null {
  const code = iso.trim().toUpperCase();
  const alpha2 = ISO3_TO_ISO2[code] ?? WORLD_ISO3_TO_ISO2[code];
  return alpha2 ? alpha2.toLowerCase() : null;
}
