/**
 * FAS Nuclear Notebook — Nuclear warhead counts by country
 * Source: Federation of American Scientists, "Status of World Nuclear Forces" 
 * Updated annually. Data as of early 2025.
 * 
 * Categories: deployed strategic, deployed tactical, reserve/stockpiled, retired
 * We count: total inventory (deployed + reserve)
 */

export interface NuclearData {
  iso3: string;
  country: string;
  warheads: number;
  deployed: number;
  reserve: number;
  retired: number;
  isNuclearState: boolean; // NPT nuclear weapon state or de facto
  source: string;
  year: number;
}

/**
 * Nuclear warhead inventory — FAS Nuclear Notebook 2025
 * https://fas.org/initiative/status-world-nuclear-forces/
 */
const NUCLEAR_INVENTORY: NuclearData[] = [
  // NPT Nuclear Weapon States
  { iso3: "USA", country: "United States", warheads: 5244, deployed: 1770, reserve: 3474, retired: 0, isNuclearState: true, source: "FAS-2025", year: 2025 },
  { iso3: "RUS", country: "Russia", warheads: 5580, deployed: 1710, reserve: 3870, retired: 0, isNuclearState: true, source: "FAS-2025", year: 2025 },
  { iso3: "CHN", country: "China", warheads: 500, deployed: 24, reserve: 476, retired: 0, isNuclearState: true, source: "FAS-2025", year: 2025 },
  { iso3: "GBR", country: "United Kingdom", warheads: 225, deployed: 120, reserve: 105, retired: 0, isNuclearState: true, source: "FAS-2025", year: 2025 },
  { iso3: "FRA", country: "France", warheads: 290, deployed: 280, reserve: 10, retired: 0, isNuclearState: true, source: "FAS-2025", year: 2025 },
  
  // De facto nuclear states
  { iso3: "IND", country: "India", warheads: 172, deployed: 0, reserve: 172, retired: 0, isNuclearState: false, source: "FAS-2025", year: 2025 },
  { iso3: "PAK", country: "Pakistan", warheads: 170, deployed: 0, reserve: 170, retired: 0, isNuclearState: false, source: "FAS-2025", year: 2025 },
  { iso3: "ISR", country: "Israel", warheads: 90, deployed: 0, reserve: 90, retired: 0, isNuclearState: false, source: "FAS-2025", year: 2025 },
  { iso3: "PRK", country: "North Korea", warheads: 50, deployed: 0, reserve: 50, retired: 0, isNuclearState: false, source: "FAS-2025", year: 2025 },
];

export function getNuclearData(): Map<string, NuclearData> {
  const map = new Map<string, NuclearData>();
  for (const entry of NUCLEAR_INVENTORY) {
    map.set(entry.iso3, entry);
  }
  return map;
}

export function getWarheadCount(iso3: string): number {
  const data = NUCLEAR_INVENTORY.find(n => n.iso3 === iso3);
  return data?.warheads ?? 0;
}
