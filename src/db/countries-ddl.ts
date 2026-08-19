import type Database from 'better-sqlite3';

export const COUNTRIES_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS countries (
  iso_code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_ru TEXT NOT NULL,
  side TEXT NOT NULL,
  coalition TEXT,
  area_km2 INTEGER NOT NULL DEFAULT 0,
  coastline_km INTEGER NOT NULL DEFAULT 0,
  climate_zone TEXT NOT NULL DEFAULT '',
  gdp_ppp_bn REAL NOT NULL DEFAULT 0,
  military_budget_bn REAL NOT NULL DEFAULT 0,
  defense_pct_gdp REAL NOT NULL DEFAULT 0,
  population_m REAL NOT NULL DEFAULT 0,
  active_personnel INTEGER NOT NULL DEFAULT 0,
  reserve_personnel INTEGER NOT NULL DEFAULT 0,
  fit_for_service_m REAL NOT NULL DEFAULT 0,
  total_tanks INTEGER NOT NULL DEFAULT 0,
  total_afv INTEGER NOT NULL DEFAULT 0,
  total_artillery INTEGER NOT NULL DEFAULT 0,
  total_mlrs INTEGER NOT NULL DEFAULT 0,
  total_aircraft INTEGER NOT NULL DEFAULT 0,
  total_helicopters INTEGER NOT NULL DEFAULT 0,
  total_navy INTEGER NOT NULL DEFAULT 0,
  submarines INTEGER NOT NULL DEFAULT 0,
  aircraft_carriers INTEGER NOT NULL DEFAULT 0,
  nuclear_warheads INTEGER DEFAULT 0,
  ports INTEGER NOT NULL DEFAULT 0,
  airfields INTEGER NOT NULL DEFAULT 0,
  oil_production_kbd INTEGER NOT NULL DEFAULT 0,
  merchant_fleet INTEGER NOT NULL DEFAULT 0,
  tech_level INTEGER NOT NULL DEFAULT 5,
  morale_index INTEGER NOT NULL DEFAULT 5,
  combat_experience INTEGER NOT NULL DEFAULT 3,
  c2_capability INTEGER NOT NULL DEFAULT 5,
  ew_capability INTEGER NOT NULL DEFAULT 5,
  bp_total REAL DEFAULT 0,
  bp_weapon REAL DEFAULT 0,
  bp_manpower REAL DEFAULT 0,
  bp_logistics REAL DEFAULT 0,
  bp_c2 REAL DEFAULT 0,
  bp_economy REAL DEFAULT 0,
  bp_doctrine REAL DEFAULT 0,
  bp_readiness REAL DEFAULT 0,
  bp_terrain REAL DEFAULT 0,
  updated_at TEXT NOT NULL
);
`;

export function ensureCountriesTable(db: Database.Database): void {
  db.exec(COUNTRIES_TABLE_SQL);
}
