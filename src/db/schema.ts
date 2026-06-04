import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const countries = sqliteTable("countries", {
  isoCode: text("iso_code").primaryKey(),
  name: text("name").notNull(),
  nameRu: text("name_ru").notNull(),
  side: text("side", { enum: ["NATO", "RUS", "CHINA", "UKR", "NEUTRAL"] }).notNull(),
  coalition: text("coalition", { enum: ["NATO", "CSTO", "AUKUS", "BRICS"] }),

  // Geography
  areaKm2: integer("area_km2").notNull(),
  coastlineKm: integer("coastline_km").notNull(),
  climateZone: text("climate_zone").notNull(),

  // Economy
  gdpPppBn: real("gdp_ppp_bn").notNull(),
  militaryBudgetBn: real("military_budget_bn").notNull(),
  defensePctGdp: real("defense_pct_gdp").notNull(),

  // Manpower
  populationM: real("population_m").notNull(),
  activePersonnel: integer("active_personnel").notNull(),
  reservePersonnel: integer("reserve_personnel").notNull(),
  fitForServiceM: real("fit_for_service_m").notNull(),

  // Weapons
  totalTanks: integer("total_tanks").notNull(),
  totalAfv: integer("total_afv").notNull(),
  totalArtillery: integer("total_artillery").notNull(),
  totalMlrs: integer("total_mlrs").notNull(),
  totalAircraft: integer("total_aircraft").notNull(),
  totalHelicopters: integer("total_helicopters").notNull(),
  totalNavy: integer("total_navy").notNull(),
  submarines: integer("submarines").notNull(),
  aircraftCarriers: integer("aircraft_carriers").notNull(),
  nuclearWarheads: integer("nuclear_warheads").default(0),

  // Logistics
  ports: integer("ports").notNull(),
  airfields: integer("airfields").notNull(),
  oilProductionKbd: integer("oil_production_kbd").notNull(),
  merchantFleet: integer("merchant_fleet").notNull(),

  // Qualitative scores (1–10)
  techLevel: integer("tech_level").notNull(),
  moraleIndex: integer("morale_index").notNull(),
  combatExperience: integer("combat_experience").notNull(),
  c2Capability: integer("c2_capability").notNull(),
  ewCapability: integer("ew_capability").notNull(),

  // Computed BP scores
  bpTotal: real("bp_total").default(0),
  bpWeapon: real("bp_weapon").default(0),
  bpManpower: real("bp_manpower").default(0),
  bpLogistics: real("bp_logistics").default(0),
  bpC2: real("bp_c2").default(0),
  bpEconomy: real("bp_economy").default(0),
  bpDoctrine: real("bp_doctrine").default(0),
  bpReadiness: real("bp_readiness").default(0),
  bpTerrain: real("bp_terrain").default(0),

  updatedAt: text("updated_at").notNull(),
});

export type Country = typeof countries.$inferSelect;
export type NewCountry = typeof countries.$inferInsert;
