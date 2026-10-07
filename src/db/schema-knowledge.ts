import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

/**
 * Knowledge-pack schema — расширение боевой модели данными открытых источников.
 *
 * Массивы (belligerents, isoCodes, productsRu…) хранятся как JSON-строки:
 * SQLite не имеет нативных массивов, а читается/пишется это одним drizzle-полем.
 * Каждая таблица засевается из соответствующего `*.generated.ts`, который
 * генерирует `scripts/build-knowledge-data.py` из research-JSON волн.
 *
 * Единственный источник истины по DDL — CREATE_TABLE_SQL в
 * `src/app/api/init-db/route.ts` (зеркалит эти таблицы).
 */

// ─── Модельный состав вооружений (открытые оценки IISS/GFP) ─────────────────
export const equipmentModels = sqliteTable("equipment_models", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  iso: text("iso").notNull(),
  cat: text("cat").notNull(), // tank|ifv|apc|...|icbm|slbm
  model: text("model").notNull(),
  count: integer("count").notNull(),
  note: text("note"),
});

export type EquipmentModel = typeof equipmentModels.$inferSelect;
export type NewEquipmentModel = typeof equipmentModels.$inferInsert;

// ─── История вооружённых конфликтов 1945–2025 ──────────────────────────────
export const historicalConflicts = sqliteTable("historical_conflicts", {
  id: text("id").primaryKey(),
  nameRu: text("name_ru").notNull(),
  startYear: integer("start_year").notNull(),
  endYear: integer("end_year").notNull(),
  region: text("region").notNull(),
  type: text("type", {
    enum: ["interstate", "civil", "colonial", "border", "insurgency", "proxy", "world"],
  }).notNull(),
  belligerents: text("belligerents").notNull(), // JSON string[]
  isoCodes: text("iso_codes").notNull(), // JSON string[]
  fatalities: integer("fatalities"),
  outcomeRu: text("outcome_ru").notNull(),
  summaryRu: text("summary_ru").notNull(),
});

export type HistoricalConflict = typeof historicalConflicts.$inferSelect;
export type NewHistoricalConflict = typeof historicalConflicts.$inferInsert;

// ─── Компании оборонно-промышленного комплекса ──────────────────────────────
export const defenseCompanies = sqliteTable("defense_companies", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  nameRu: text("name_ru").notNull(),
  iso: text("iso").notNull(),
  hq: text("hq").notNull(),
  founded: integer("founded"),
  revenueUsdBn: real("revenue_usd_bn"),
  productsRu: text("products_ru").notNull(), // JSON string[]
  noteRu: text("note_ru"),
});

export type DefenseCompany = typeof defenseCompanies.$inferSelect;
export type NewDefenseCompany = typeof defenseCompanies.$inferInsert;

// ─── Договоры и союзы ──────────────────────────────────────────────────────
export const treaties = sqliteTable("treaties", {
  id: text("id").primaryKey(),
  nameRu: text("name_ru").notNull(),
  nameEn: text("name_en").notNull(),
  signedYear: integer("signed_year").notNull(),
  inForce: integer("in_force", { mode: "boolean" }).notNull(),
  type: text("type", {
    enum: ["defense", "nonprolif", "arms_control", "security", "neutrality"],
  }).notNull(),
  membersIso: text("members_iso").notNull(), // JSON string[]
  noteRu: text("note_ru").notNull(),
});

export type Treaty = typeof treaties.$inferSelect;
export type NewTreaty = typeof treaties.$inferInsert;

// ─── Доктринальные карточки государств ──────────────────────────────────────
export const doctrineCards = sqliteTable("doctrine_cards", {
  iso: text("iso").primaryKey(),
  postureRu: text("posture_ru").notNull(),
  nuclearRu: text("nuclear_ru").notNull(),
  summaryRu: text("summary_ru").notNull(),
  principlesRu: text("principles_ru").notNull(), // JSON string[]
});

export type DoctrineCard = typeof doctrineCards.$inferSelect;
export type NewDoctrineCard = typeof doctrineCards.$inferInsert;

// ─── Поставки вооружений (SIPRI-уровень оценок) ─────────────────────────────
export const armsTransfers = sqliteTable("arms_transfers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  fromIso: text("from_iso").notNull(),
  toIso: text("to_iso").notNull(),
  itemRu: text("item_ru").notNull(),
  qty: integer("qty"),
  year: integer("year").notNull(),
  status: text("status", { enum: ["delivered", "contracted", "cancelled"] }).notNull(),
});

export type ArmsTransfer = typeof armsTransfers.$inferSelect;
export type NewArmsTransfer = typeof armsTransfers.$inferInsert;

// ─── Военные учения ────────────────────────────────────────────────────────
export const militaryExercises = sqliteTable("military_exercises", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nameRu: text("name_ru").notNull(),
  nameEn: text("name_en").notNull(),
  year: integer("year").notNull(),
  hostIso: text("host_iso").notNull(),
  participantsIso: text("participants_iso").notNull(), // JSON string[]
  scaleRu: text("scale_ru").notNull(),
  noteRu: text("note_ru").notNull(),
});

export type MilitaryExercise = typeof militaryExercises.$inferSelect;
export type NewMilitaryExercise = typeof militaryExercises.$inferInsert;

// ─── Миротворческие миссии ─────────────────────────────────────────────────
export const peacekeepingMissions = sqliteTable("peacekeeping_missions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nameRu: text("name_ru").notNull(),
  org: text("org").notNull(),
  region: text("region").notNull(),
  sinceYear: integer("since_year").notNull(),
  personnel: integer("personnel"),
  noteRu: text("note_ru").notNull(),
});

export type PeacekeepingMission = typeof peacekeepingMissions.$inferSelect;
export type NewPeacekeepingMission = typeof peacekeepingMissions.$inferInsert;

// ─── Ракетные арсеналы (волна 8) ───────────────────────────────────────────
export const missileSystems = sqliteTable("missile_systems", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  iso: text("iso").notNull(),
  name: text("name").notNull(),
  type: text("type", {
    enum: ["icbm", "irbm", "mrbm", "srbm", "slbm", "cruise", "hypersonic", "abm"],
  }).notNull(),
  rangeKm: integer("range_km"),
  warheadRu: text("warhead_ru"),
  count: integer("count"),
  status: text("status").notNull(),
  noteRu: text("note_ru"),
});

export type MissileSystem = typeof missileSystems.$inferSelect;
export type NewMissileSystem = typeof missileSystems.$inferInsert;

// ─── Системы ПВО/ПРО (волна 8) ─────────────────────────────────────────────
export const airDefenseSystems = sqliteTable("air_defense_systems", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  iso: text("iso").notNull(),
  name: text("name").notNull(),
  tier: text("tier", {
    enum: ["long", "medium", "short", "manpads", "abm", "counter_uas"],
  }).notNull(),
  rangeKm: integer("range_km"),
  count: integer("count"),
  noteRu: text("note_ru"),
});

export type AirDefenseSystem = typeof airDefenseSystems.$inferSelect;
export type NewAirDefenseSystem = typeof airDefenseSystems.$inferInsert;

// ─── Классы кораблей флотов (волна 8) ──────────────────────────────────────
export const navyShipClasses = sqliteTable("navy_ship_classes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  iso: text("iso").notNull(),
  name: text("name").notNull(),
  typeRu: text("type_ru").notNull(),
  type: text("type").notNull(),
  units: integer("units").notNull(),
  displacementT: integer("displacement_t"),
  commissioned: integer("commissioned"),
  noteRu: text("note_ru"),
});

export type NavyShipClass = typeof navyShipClasses.$inferSelect;
export type NewNavyShipClass = typeof navyShipClasses.$inferInsert;

// ─── Военная инфраструктура (волна 8) ──────────────────────────────────────
export const militaryInfra = sqliteTable("military_infra", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  iso: text("iso").notNull(),
  nameRu: text("name_ru").notNull(),
  kind: text("kind", {
    enum: ["airfield", "naval_port", "rail_hub", "pipeline", "arsenal", "range", "space_launch", "c2_bunker"],
  }).notNull(),
  capacityRu: text("capacity_ru").notNull(),
  lat: real("lat"),
  lng: real("lng"),
  noteRu: text("note_ru"),
});

export type MilitaryInfra = typeof militaryInfra.$inferSelect;
export type NewMilitaryInfra = typeof militaryInfra.$inferInsert;

// ─── Узкие места и коридоры мировой логистики (волна 8) ────────────────────
export const chokepoints = sqliteTable("chokepoints", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nameRu: text("name_ru").notNull(),
  nameEn: text("name_en").notNull(),
  region: text("region").notNull(),
  lat: real("lat"),
  lng: real("lng"),
  trafficRu: text("traffic_ru").notNull(),
  strategicValue: integer("strategic_value").notNull(),
  controlledByIso: text("controlled_by_iso").notNull(), // JSON string[]
  riskRu: text("risk_ru").notNull(),
});

export type Chokepoint = typeof chokepoints.$inferSelect;
export type NewChokepoint = typeof chokepoints.$inferInsert;

// ─── Страновые досье (волна 8) ─────────────────────────────────────────────
export const countryDossiers = sqliteTable("country_dossiers", {
  iso: text("iso").primaryKey(),
  overviewRu: text("overview_ru").notNull(),
  geographyRu: text("geography_ru").notNull(),
  economyRu: text("economy_ru").notNull(),
  militaryStructureRu: text("military_structure_ru").notNull(),
  strategicRoleRu: text("strategic_role_ru").notNull(),
  keyFactsRu: text("key_facts_ru").notNull(), // JSON string[]
});

export type CountryDossier = typeof countryDossiers.$inferSelect;
export type NewCountryDossier = typeof countryDossiers.$inferInsert;

// ─── Космические и кибервойска (волна 8) ───────────────────────────────────
export const spaceCyberProfiles = sqliteTable("space_cyber_profiles", {
  iso: text("iso").primaryKey(),
  spaceAgencyRu: text("space_agency_ru"),
  milSatellites: integer("mil_satellites"),
  launchersRu: text("launchers_ru"), // JSON string[]
  spaceCapabilitiesRu: text("space_capabilities_ru"), // JSON string[]
  spaceNoteRu: text("space_note_ru"),
  cyberUnitRu: text("cyber_unit_ru"),
  cyberTier: integer("cyber_tier"),
  cyberCapabilitiesRu: text("cyber_capabilities_ru"), // JSON string[]
  cyberNoteRu: text("cyber_note_ru"),
});

export type SpaceCyberProfile = typeof spaceCyberProfiles.$inferSelect;
export type NewSpaceCyberProfile = typeof spaceCyberProfiles.$inferInsert;

// ─── Структура и комплектование ВС (волна 8) ───────────────────────────────
export const forceStructures = sqliteTable("force_structures", {
  iso: text("iso").primaryKey(),
  branches: text("branches").notNull(), // JSON: [{nameRu, personnel, noteRu}]
  conscriptionRu: text("conscription_ru").notNull(),
  reservesRu: text("reserves_ru").notNull(),
  commandRu: text("command_ru").notNull(),
  noteRu: text("note_ru"),
});

export type ForceStructure = typeof forceStructures.$inferSelect;
export type NewForceStructure = typeof forceStructures.$inferInsert;

// ─── Динамика военных бюджетов (волна 8) ───────────────────────────────────
export const budgetSeries = sqliteTable("budget_series", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  iso: text("iso").notNull(),
  year: integer("year").notNull(),
  usdBn: real("usd_bn"),
  pctGdp: real("pct_gdp"),
});

export type BudgetPoint = typeof budgetSeries.$inferSelect;
export type NewBudgetPoint = typeof budgetSeries.$inferInsert;

// ─── Образцы вооружений: детальные ТТХ (волна 10) ─────────────────────────
export const weaponSpecs = sqliteTable("weapon_specs", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  nameRu: text("name_ru").notNull(),
  category: text("category").notNull(),
  originIso: text("origin_iso").notNull(),
  crew: integer("crew"),
  weightTons: real("weight_tons"),
  rangeKm: integer("range_km"),
  speedKmh: integer("speed_kmh"),
  armamentRu: text("armament_ru"),
  caliberMm: integer("caliber_mm"),
  warheads: text("warheads"),
  yearInService: integer("year_in_service"),
  status: text("status").notNull(),
  noteRu: text("note_ru"),
});

export type WeaponSpec = typeof weaponSpecs.$inferSelect;
export type NewWeaponSpec = typeof weaponSpecs.$inferInsert;

// ─── Боевой порядок / оргструктура ВС (волна 13) ──────────────────────────
export const orderOfBattle = sqliteTable("order_of_battle", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  iso: text("iso").notNull(),
  nameRu: text("name_ru").notNull(),
  typeRu: text("type_ru").notNull(),
  branchRu: text("branch_ru").notNull(),
  strengthRu: text("strength_ru").notNull(),
  locationRu: text("location_ru").notNull(),
  noteRu: text("note_ru"),
});

export type OrderOfBattle = typeof orderOfBattle.$inferSelect;
export type NewOrderOfBattle = typeof orderOfBattle.$inferInsert;

// ─── Исторические сражения (волна 13) ─────────────────────────────────────
export const battles = sqliteTable("battles", {
  id: text("id").primaryKey(),
  nameRu: text("name_ru").notNull(),
  nameEn: text("name_en").notNull(),
  year: integer("year").notNull(),
  dateRu: text("date_ru").notNull(),
  locationRu: text("location_ru").notNull(),
  lat: real("lat"),
  lng: real("lng"),
  combatantsRu: text("combatants_ru").notNull(),
  outcomeRu: text("outcome_ru").notNull(),
  casualtiesRu: text("casualties_ru").notNull(),
  significanceRu: text("significance_ru").notNull(),
  isoCodes: text("iso_codes").notNull(),
});

export type Battle = typeof battles.$inferSelect;
export type NewBattle = typeof battles.$inferInsert;

// ─── Военные кампании и операции (волна 14) ───────────────────────────────
export const campaigns = sqliteTable("campaigns", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nameRu: text("name_ru").notNull(),
  nameEn: text("name_en").notNull(),
  startYear: integer("start_year").notNull(),
  endYear: integer("end_year").notNull(),
  regionRu: text("region_ru").notNull(),
  theatreRu: text("theatre_ru").notNull(),
  objectiveRu: text("objective_ru").notNull(),
  outcomeRu: text("outcome_ru").notNull(),
  forcesRu: text("forces_ru").notNull(),
  significanceRu: text("significance_ru").notNull(),
  isoCodes: text("iso_codes").notNull(),
});

export type Campaign = typeof campaigns.$inferSelect;
export type NewCampaign = typeof campaigns.$inferInsert;
