// ─────────────────────────────────────────────────────────────────────────────
// Global Military Balance Summary
// Aggregated statistics for the world military balance
// Used in strategic dashboard overview
// РБП-Стратег 2.0
// ─────────────────────────────────────────────────────────────────────────────

export interface GlobalMilitaryBalance {
  totalCountries: number;
  totalActivePersonnel: number;
  totalReservePersonnel: number;
  totalTanks: number;
  totalAircraft: number;
  totalNavyShips: number;
  totalNuclearWarheads: number;
  totalMilitaryBudget: number;        // $B
  totalGlobalGdp: number;             // $B PPP
  averageDefensePct: number;           // %
  // Coalition aggregates
  natoTotalBudget: number;
  bricsTotalBudget: number;
  cstoTotalBudget: number;
  // Top spenders
  topSpenders: Array<{ iso: string; nameRu: string; budget: number }>;
  // Regional breakdown
  regionalPersonnel: Record<string, number>;
  regionalBudget: Record<string, number>;
  // Nuclear summary
  nuclearStates: number;
  completeTriadStates: number;
  totalDeployedWarheads: number;
  // Key metrics
  militaryPersonnelPerThousand: number;  // per 1000 global population
  averageBudgetPerSoldier: number;       // $K
  tankCountPerCountry: number;           // average
  aircraftPerCountry: number;            // average
}

export interface RegionalBalance {
  region: string;
  regionRu: string;
  countries: number;
  totalPersonnel: number;
  totalTanks: number;
  totalAircraft: number;
  totalNavy: number;
  totalBudget: number;            // $B
  totalGdp: number;               // $B PPP
  dominantPower: string;           // ISO3
  nuclearStates: number;
  conflictRisk: number;            // 1-10
}

// ─── Regional Balance Data ────────────────────────────────────────────────────
export const REGIONAL_BALANCE: RegionalBalance[] = [
  {
    region: "Europe",
    regionRu: "Европа",
    countries: 44,
    totalPersonnel: 2100000,
    totalTanks: 8500,
    totalAircraft: 4200,
    totalNavy: 850,
    totalBudget: 420,
    totalGdp: 28000,
    dominantPower: "GBR",
    nuclearStates: 3,     // UK, France, Russia
    conflictRisk: 8,       // СВО → высокая
  },
  {
    region: "East Asia",
    regionRu: "Восточная Азия",
    countries: 12,
    totalPersonnel: 4800000,
    totalTanks: 18000,
    totalAircraft: 8500,
    totalNavy: 1400,
    totalBudget: 580,
    totalGdp: 35000,
    dominantPower: "CHN",
    nuclearStates: 3,     // China, NK, Russia (Pacific)
    conflictRisk: 7,       // Тайвань, Корея
  },
  {
    region: "South Asia",
    regionRu: "Южная Азия",
    countries: 8,
    totalPersonnel: 4200000,
    totalTanks: 8500,
    totalAircraft: 3200,
    totalNavy: 380,
    totalBudget: 140,
    totalGdp: 14000,
    dominantPower: "IND",
    nuclearStates: 2,     // India, Pakistan
    conflictRisk: 8,       // Кашмир, ядерное
  },
  {
    region: "Middle East",
    regionRu: "Ближний Восток",
    countries: 16,
    totalPersonnel: 1800000,
    totalTanks: 11000,
    totalAircraft: 3500,
    totalNavy: 600,
    totalBudget: 220,
    totalGdp: 6500,
    dominantPower: "ISR",
    nuclearStates: 1,     // Israel (unconfirmed)
    conflictRisk: 9,       // Вечно
  },
  {
    region: "North America",
    regionRu: "Северная Америка",
    countries: 3,
    totalPersonnel: 1600000,
    totalTanks: 6500,
    totalAircraft: 5800,
    totalNavy: 470,
    totalBudget: 890,
    totalGdp: 28000,
    dominantPower: "USA",
    nuclearStates: 1,
    conflictRisk: 2,
  },
  {
    region: "Africa",
    regionRu: "Африка",
    countries: 54,
    totalPersonnel: 2200000,
    totalTanks: 5500,
    totalAircraft: 1200,
    totalNavy: 300,
    totalBudget: 50,
    totalGdp: 7500,
    dominantPower: "EGY",
    nuclearStates: 1,     // South Africa (former)
    conflictRisk: 7,       // Много горячих точек
  },
  {
    region: "South America",
    regionRu: "Южная Америка",
    countries: 12,
    totalPersonnel: 1200000,
    totalTanks: 2500,
    totalAircraft: 900,
    totalNavy: 350,
    totalBudget: 65,
    totalGdp: 7000,
    dominantPower: "BRA",
    nuclearStates: 0,
    conflictRisk: 3,
  },
  {
    region: "Central Asia",
    regionRu: "Центральная Азия",
    countries: 5,
    totalPersonnel: 350000,
    totalTanks: 1500,
    totalAircraft: 400,
    totalNavy: 30,
    totalBudget: 15,
    totalGdp: 1200,
    dominantPower: "KAZ",
    nuclearStates: 0,
    conflictRisk: 4,
  },
];

// ─── Computed Global Summary ─────────────────────────────────────────────────
export function getGlobalMilitaryBalance(): GlobalMilitaryBalance {
  const regions = REGIONAL_BALANCE;
  const totalActive = regions.reduce((s, r) => s + r.totalPersonnel, 0);
  const totalTanks = regions.reduce((s, r) => s + r.totalTanks, 0);
  const totalAircraft = regions.reduce((s, r) => s + r.totalAircraft, 0);
  const totalNavy = regions.reduce((s, r) => s + r.totalNavy, 0);
  const totalBudget = regions.reduce((s, r) => s + r.totalBudget, 0);
  const totalGdp = regions.reduce((s, r) => s + r.totalGdp, 0);
  const totalCountries = regions.reduce((s, r) => s + r.countries, 0);

  return {
    totalCountries,
    totalActivePersonnel: totalActive,
    totalReservePersonnel: Math.round(totalActive * 0.8),
    totalTanks,
    totalAircraft,
    totalNavyShips: totalNavy,
    totalNuclearWarheads: 12100,     // SIPRI 2024 estimate
    totalMilitaryBudget: totalBudget,
    totalGlobalGdp: totalGdp,
    averageDefensePct: Math.round((totalBudget / totalGdp) * 1000) / 10,
    natoTotalBudget: 1200,           // $B (32 members combined)
    bricsTotalBudget: 550,
    cstoTotalBudget: 85,
    topSpenders: [
      { iso: "USA", nameRu: "США", budget: 886 },
      { iso: "CHN", nameRu: "Китай", budget: 296 },
      { iso: "RUS", nameRu: "Россия", budget: 109 },
      { iso: "IND", nameRu: "Индия", budget: 84 },
      { iso: "SAU", nameRu: "Саудовская Аравия", budget: 75 },
      { iso: "GBR", nameRu: "Великобритания", budget: 68 },
      { iso: "DEU", nameRu: "Германия", budget: 66 },
      { iso: "FRA", nameRu: "Франция", budget: 61 },
      { iso: "KOR", nameRu: "Южная Корея", budget: 51 },
      { iso: "JPN", nameRu: "Япония", budget: 51 },
    ],
    regionalPersonnel: Object.fromEntries(regions.map((r) => [r.region, r.totalPersonnel])),
    regionalBudget: Object.fromEntries(regions.map((r) => [r.region, r.totalBudget])),
    nuclearStates: 9,
    completeTriadStates: 3,          // USA, RUS, CHN
    totalDeployedWarheads: 9585,
    militaryPersonnelPerThousand: Math.round((totalActive / 8000000) * 100) / 100,
    averageBudgetPerSoldier: Math.round((totalBudget * 1000 / totalActive) * 100) / 100,
    tankCountPerCountry: Math.round(totalTanks / totalCountries),
    aircraftPerCountry: Math.round(totalAircraft / totalCountries),
  };
}

export function getRegionalBalance(region: string): RegionalBalance | undefined {
  return REGIONAL_BALANCE.find((r) => r.region === region || r.regionRu === region);
}

export function getAllRegionalBalances(): RegionalBalance[] {
  return REGIONAL_BALANCE;
}

export function getHighestConflictRisk(): RegionalBalance[] {
  return [...REGIONAL_BALANCE].sort((a, b) => b.conflictRisk - a.conflictRisk);
}

export function getDominantPowers(): Array<{ iso: string; regionRu: string }> {
  return REGIONAL_BALANCE.map((r) => ({ iso: r.dominantPower, regionRu: r.regionRu }));
}
