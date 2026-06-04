/**
 * World Bank Open Data API fetcher
 * Gets GDP, population, military expenditure for all countries
 * 
 * Indicators:
 *   NY.GDP.MKTP.PP.CD  — GDP PPP (current intl$)
 *   SP.POP.TOTL        — Population total
 *   MS.MIL.XPND.GD.ZS  — Military expenditure (% of GDP)
 *   MS.MIL.XPND.CD     — Military expenditure (current USD)
 *   AG.LND.TOTL.K2     — Land area (km²)
 *   SE.ADT.LITR.ZS     — Literacy rate
 */

const WB_BASE = "https://api.worldbank.org/v2/country";
const PER_PAGE = 300; // max per page
const FORMAT = "json";
const YEAR = "2023"; // latest reliable year

interface WBRecord {
  country: { id: string; value: string };
  countryiso3code: string;
  date: string;
  value: number | null;
  indicator: { id: string; value: string };
}

interface WBCountryData {
  iso3: string;
  name: string;
  gdpPppBn: number | null;
  populationM: number | null;
  militaryBudgetBn: number | null;
  defensePctGdp: number | null;
  areaKm2: number | null;
}

const INDICATORS: Record<string, keyof WBCountryData> = {
  "NY.GDP.MKTP.PP.CD": "gdpPppBn",
  "SP.POP.TOTL": "populationM",
  "MS.MIL.XPND.CD": "militaryBudgetBn",
  "MS.MIL.XPND.GD.ZS": "defensePctGdp",
  "AG.LND.TOTL.K2": "areaKm2",
};

async function fetchIndicator(indicator: string): Promise<WBRecord[]> {
  const url = `${WB_BASE}/all/indicator/${indicator}?format=${FORMAT}&per_page=${PER_PAGE}&date=${YEAR}`;
  console.log(`  Fetching ${indicator}...`);
  
  const res = await fetch(url);
  if (!res.ok) throw new Error(`WB API error ${res.status} for ${indicator}`);
  
  const data = await res.json() as [unknown, WBRecord[]];
  // WB returns [metadata, records]
  if (!Array.isArray(data) || data.length < 2) return [];
  return data[1] || [];
}

function convertValue(key: keyof WBCountryData, raw: number | null): number | null {
  if (raw === null || raw === undefined) return null;
  switch (key) {
    case "gdpPppBn": return Math.round(raw / 1e9 * 100) / 100;       // current intl$ → billions
    case "populationM": return Math.round(raw / 1e6 * 100) / 100;     // → millions
    case "militaryBudgetBn": return Math.round(raw / 1e9 * 100) / 100; // current USD → billions
    case "defensePctGdp": return Math.round(raw * 100) / 100;          // already %
    case "areaKm2": return Math.round(raw);                            // km²
    default: return raw;
  }
}

export async function fetchWorldBankData(): Promise<Map<string, WBCountryData>> {
  console.log("🌍 Fetching World Bank data...");
  const countryMap = new Map<string, WBCountryData>();

  for (const [indicator, field] of Object.entries(INDICATORS)) {
    const records = await fetchIndicator(indicator);
    console.log(`  Got ${records.length} records for ${indicator}`);
    
    for (const rec of records) {
      const iso = rec.countryiso3code;
      if (!iso || iso === "") continue;
      
      if (!countryMap.has(iso)) {
        countryMap.set(iso, {
          iso3: iso,
          name: rec.country.value,
          gdpPppBn: null,
          populationM: null,
          militaryBudgetBn: null,
          defensePctGdp: null,
          areaKm2: null,
        });
      }
      
      const entry = countryMap.get(iso)!;
      const converted = convertValue(field, rec.value);
      if (converted !== null) {
        (entry as unknown as Record<string, unknown>)[field] = converted;
      }
    }
  }

  console.log(`  ✓ World Bank: ${countryMap.size} countries`);
  return countryMap;
}

// Direct execution
if (typeof require !== "undefined" && require.main === module) {
  fetchWorldBankData()
    .then((map) => {
      const usa = map.get("USA");
      console.log("\n🇺🇸 USA sample:", JSON.stringify(usa, null, 2));
      const rus = map.get("RUS");
      console.log("🇷🇺 RUS sample:", JSON.stringify(rus, null, 2));
      process.exit(0);
    })
    .catch((err) => {
      console.error("Failed:", err);
      process.exit(1);
    });
}
