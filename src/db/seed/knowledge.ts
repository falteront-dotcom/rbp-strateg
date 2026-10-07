import { db, sqlite } from "@/db/index";
import {
  equipmentModels,
  historicalConflicts,
  defenseCompanies,
  treaties as treatiesTable,
  doctrineCards,
  armsTransfers,
  militaryExercises,
  peacekeepingMissions,
  missileSystems,
  airDefenseSystems,
  navyShipClasses,
  spaceCyberProfiles,
  budgetSeries,
  forceStructures,
  militaryInfra,
  chokepoints as chokepointsTable,
  countryDossiers as countryDossiersTable,
  weaponSpecs,
  orderOfBattle,
  battles,
  campaigns,
} from "@/db/schema-knowledge";
import { EQUIPMENT_BY_COUNTRY } from "@/lib/data/equipment.generated";
import { HISTORICAL_CONFLICTS } from "@/lib/data/conflict-history.generated";
import { DEFENSE_COMPANIES } from "@/lib/data/defense-industry.generated";
import { TREATIES } from "@/lib/data/treaties.generated";
import { DOCTRINES } from "@/lib/data/doctrines.generated";
import { ARMS_TRANSFERS } from "@/lib/data/transfers.generated";
import {
  MILITARY_EXERCISES,
  PEACEKEEPING_MISSIONS,
} from "@/lib/data/exercises.generated";
import { MISSILE_SYSTEMS } from "@/lib/data/missiles.generated";
import { AIR_DEFENSE_NETWORKS } from "@/lib/data/airdefense.generated";
import { NAVY_FLEETS } from "@/lib/data/navy.generated";
import { SPACE_CYBER_PROFILES } from "@/lib/data/space-cyber.generated";
import { BUDGET_SERIES } from "@/lib/data/budgets.generated";
import { FORCE_STRUCTURES } from "@/lib/data/personnel.generated";
import { MILITARY_INFRA } from "@/lib/data/infrastructure.generated";
import { CHOKEPOINTS } from "@/lib/data/chokepoints.generated";
import { COUNTRY_DOSSIERS } from "@/lib/data/dossiers.generated";
import { WEAPON_SPECS } from "@/lib/data/weapons.generated";
import { ORDER_OF_BATTLE } from "@/lib/data/order-of-battle.generated";
import { HISTORICAL_BATTLES } from "@/lib/data/battles.generated";
import { MILITARY_CAMPAIGNS } from "@/lib/data/campaigns.generated";

/**
 * Seed the knowledge-pack tables from the generated TS data modules.
 *
 * Источник — `src/lib/data/*.generated.ts` (сборка `scripts/build-knowledge-data.py`
 * из research-JSON волн). Сид идемпотентен: каждая таблица очищается и
 * засевается целиком в одной транзакции. Пустые домены (данные ещё не собраны)
 * дают пустую таблицу — честно, без выдуманных строк.
 */

export interface KnowledgeSeedResult {
  equipmentModels: number;
  historicalConflicts: number;
  defenseCompanies: number;
  treaties: number;
  doctrineCards: number;
  armsTransfers: number;
  militaryExercises: number;
  peacekeepingMissions: number;
}

/**
 * Идемпотентный DDL — зеркалит `schema-knowledge.ts` (источник истины по типам).
 * Вызывается перед сидом, чтобы таблицы существовали до вставки.
 */
export const CREATE_KNOWLEDGE_TABLES_SQL = `
  CREATE TABLE IF NOT EXISTS equipment_models (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    iso TEXT NOT NULL,
    cat TEXT NOT NULL,
    model TEXT NOT NULL,
    count INTEGER NOT NULL,
    note TEXT
  );
  CREATE TABLE IF NOT EXISTS historical_conflicts (
    id TEXT PRIMARY KEY,
    name_ru TEXT NOT NULL,
    start_year INTEGER NOT NULL,
    end_year INTEGER NOT NULL,
    region TEXT NOT NULL,
    type TEXT NOT NULL,
    belligerents TEXT NOT NULL,
    iso_codes TEXT NOT NULL,
    fatalities INTEGER,
    outcome_ru TEXT NOT NULL,
    summary_ru TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS defense_companies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    name_ru TEXT NOT NULL,
    iso TEXT NOT NULL,
    hq TEXT NOT NULL,
    founded INTEGER,
    revenue_usd_bn REAL,
    products_ru TEXT NOT NULL,
    note_ru TEXT
  );
  CREATE TABLE IF NOT EXISTS treaties (
    id TEXT PRIMARY KEY,
    name_ru TEXT NOT NULL,
    name_en TEXT NOT NULL,
    signed_year INTEGER NOT NULL,
    in_force INTEGER NOT NULL,
    type TEXT NOT NULL,
    members_iso TEXT NOT NULL,
    note_ru TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS doctrine_cards (
    iso TEXT PRIMARY KEY,
    posture_ru TEXT NOT NULL,
    nuclear_ru TEXT NOT NULL,
    summary_ru TEXT NOT NULL,
    principles_ru TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS arms_transfers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_iso TEXT NOT NULL,
    to_iso TEXT NOT NULL,
    item_ru TEXT NOT NULL,
    qty INTEGER,
    year INTEGER NOT NULL,
    status TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS military_exercises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name_ru TEXT NOT NULL,
    name_en TEXT NOT NULL,
    year INTEGER NOT NULL,
    host_iso TEXT NOT NULL,
    participants_iso TEXT NOT NULL,
    scale_ru TEXT NOT NULL,
    note_ru TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS peacekeeping_missions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name_ru TEXT NOT NULL,
    org TEXT NOT NULL,
    region TEXT NOT NULL,
    since_year INTEGER NOT NULL,
    personnel INTEGER,
    note_ru TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS missile_systems (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    iso TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    range_km INTEGER,
    warhead_ru TEXT,
    count INTEGER,
    status TEXT NOT NULL,
    note_ru TEXT
  );
  CREATE TABLE IF NOT EXISTS air_defense_systems (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    iso TEXT NOT NULL,
    name TEXT NOT NULL,
    tier TEXT NOT NULL,
    range_km INTEGER,
    count INTEGER,
    note_ru TEXT
  );
  CREATE TABLE IF NOT EXISTS navy_ship_classes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    iso TEXT NOT NULL,
    name TEXT NOT NULL,
    type_ru TEXT NOT NULL,
    type TEXT NOT NULL,
    units INTEGER NOT NULL,
    displacement_t INTEGER,
    commissioned INTEGER,
    note_ru TEXT
  );
  CREATE TABLE IF NOT EXISTS space_cyber_profiles (
    iso TEXT PRIMARY KEY,
    space_agency_ru TEXT,
    mil_satellites INTEGER,
    launchers_ru TEXT,
    space_capabilities_ru TEXT,
    space_note_ru TEXT,
    cyber_unit_ru TEXT,
    cyber_tier INTEGER,
    cyber_capabilities_ru TEXT,
    cyber_note_ru TEXT
  );
  CREATE TABLE IF NOT EXISTS budget_series (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    iso TEXT NOT NULL,
    year INTEGER NOT NULL,
    usd_bn REAL,
    pct_gdp REAL
  );
  CREATE TABLE IF NOT EXISTS force_structures (
    iso TEXT PRIMARY KEY,
    branches TEXT NOT NULL,
    conscription_ru TEXT NOT NULL,
    reserves_ru TEXT NOT NULL,
    command_ru TEXT NOT NULL,
    note_ru TEXT
  );
  CREATE TABLE IF NOT EXISTS military_infra (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    iso TEXT NOT NULL,
    name_ru TEXT NOT NULL,
    kind TEXT NOT NULL,
    capacity_ru TEXT NOT NULL,
    lat REAL,
    lng REAL,
    note_ru TEXT
  );
  CREATE TABLE IF NOT EXISTS chokepoints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name_ru TEXT NOT NULL,
    name_en TEXT NOT NULL,
    region TEXT NOT NULL,
    lat REAL,
    lng REAL,
    traffic_ru TEXT NOT NULL,
    strategic_value INTEGER NOT NULL,
    controlled_by_iso TEXT NOT NULL,
    risk_ru TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS country_dossiers (
    iso TEXT PRIMARY KEY,
    overview_ru TEXT NOT NULL,
    geography_ru TEXT NOT NULL,
    economy_ru TEXT NOT NULL,
    military_structure_ru TEXT NOT NULL,
    strategic_role_ru TEXT NOT NULL,
    key_facts_ru TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS weapon_specs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    name_ru TEXT NOT NULL,
    category TEXT NOT NULL,
    origin_iso TEXT NOT NULL,
    crew INTEGER,
    weight_tons REAL,
    range_km INTEGER,
    speed_kmh INTEGER,
    armament_ru TEXT,
    caliber_mm INTEGER,
    warheads TEXT,
    year_in_service INTEGER,
    status TEXT NOT NULL,
    note_ru TEXT
  );
  CREATE TABLE IF NOT EXISTS order_of_battle (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    iso TEXT NOT NULL,
    name_ru TEXT NOT NULL,
    type_ru TEXT NOT NULL,
    branch_ru TEXT NOT NULL,
    strength_ru TEXT NOT NULL,
    location_ru TEXT NOT NULL,
    note_ru TEXT
  );
  CREATE TABLE IF NOT EXISTS battles (
    id TEXT PRIMARY KEY,
    name_ru TEXT NOT NULL,
    name_en TEXT NOT NULL,
    year INTEGER NOT NULL,
    date_ru TEXT NOT NULL,
    location_ru TEXT NOT NULL,
    lat REAL,
    lng REAL,
    combatants_ru TEXT NOT NULL,
    outcome_ru TEXT NOT NULL,
    casualties_ru TEXT NOT NULL,
    significance_ru TEXT NOT NULL,
    iso_codes TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS campaigns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name_ru TEXT NOT NULL,
    name_en TEXT NOT NULL,
    start_year INTEGER NOT NULL,
    end_year INTEGER NOT NULL,
    region_ru TEXT NOT NULL,
    theatre_ru TEXT NOT NULL,
    objective_ru TEXT NOT NULL,
    outcome_ru TEXT NOT NULL,
    forces_ru TEXT NOT NULL,
    significance_ru TEXT NOT NULL,
    iso_codes TEXT NOT NULL
  );
`;

export function ensureKnowledgeTables(): void {
  sqlite.exec(CREATE_KNOWLEDGE_TABLES_SQL);
}

export function seedKnowledge(): KnowledgeSeedResult {
  ensureKnowledgeTables();
  const eqRows = EQUIPMENT_BY_COUNTRY.flatMap((c) =>
    c.entries.map((e) => ({
      iso: c.iso,
      cat: e.cat,
      model: e.model,
      count: e.count,
      note: e.note ?? null,
    })),
  );

  const conflictRows = HISTORICAL_CONFLICTS.map((c) => ({
    id: c.id,
    nameRu: c.nameRu,
    startYear: c.startYear,
    endYear: c.endYear,
    region: c.region,
    type: c.type,
    belligerents: JSON.stringify(c.belligerents),
    isoCodes: JSON.stringify(c.isoCodes),
    fatalities: c.fatalities,
    outcomeRu: c.outcomeRu,
    summaryRu: c.summaryRu,
  }));

  const companyRows = DEFENSE_COMPANIES.map((c) => ({
    id: c.id,
    name: c.name,
    nameRu: c.nameRu,
    iso: c.iso,
    hq: c.hq,
    founded: c.founded,
    revenueUsdBn: c.revenueUsdBn,
    productsRu: JSON.stringify(c.productsRu),
    noteRu: c.noteRu,
  }));

  const treatyRows = TREATIES.map((t) => ({
    id: t.id,
    nameRu: t.nameRu,
    nameEn: t.nameEn,
    signedYear: t.signedYear,
    inForce: t.inForce,
    type: t.type,
    membersIso: JSON.stringify(t.membersIso),
    noteRu: t.noteRu,
  }));

  const doctrineRows = DOCTRINES.map((d) => ({
    iso: d.iso,
    postureRu: d.postureRu,
    nuclearRu: d.nuclearRu,
    summaryRu: d.summaryRu,
    principlesRu: JSON.stringify(d.principlesRu),
  }));

  const transferRows = ARMS_TRANSFERS.map((t) => ({
    fromIso: t.fromIso,
    toIso: t.toIso,
    itemRu: t.itemRu,
    qty: t.qty,
    year: t.year,
    status: t.status,
  }));

  const exerciseRows = MILITARY_EXERCISES.map((e) => ({
    nameRu: e.nameRu,
    nameEn: e.nameEn,
    year: e.year,
    hostIso: e.hostIso,
    participantsIso: JSON.stringify(e.participantsIso),
    scaleRu: e.scaleRu,
    noteRu: e.noteRu,
  }));

  const pkRows = PEACEKEEPING_MISSIONS.map((m) => ({
    nameRu: m.nameRu,
    org: m.org,
    region: m.region,
    sinceYear: m.sinceYear,
    personnel: m.personnel,
    noteRu: m.noteRu,
  }));

  sqlite.exec("BEGIN");
  try {
    db.delete(equipmentModels).run();
    db.delete(historicalConflicts).run();
    db.delete(defenseCompanies).run();
    db.delete(treatiesTable).run();
    db.delete(doctrineCards).run();
    db.delete(armsTransfers).run();
    db.delete(militaryExercises).run();
    db.delete(peacekeepingMissions).run();

    if (eqRows.length) db.insert(equipmentModels).values(eqRows).run();
    if (conflictRows.length) db.insert(historicalConflicts).values(conflictRows).run();
    if (companyRows.length) db.insert(defenseCompanies).values(companyRows).run();
    if (treatyRows.length) db.insert(treatiesTable).values(treatyRows).run();
    if (doctrineRows.length) db.insert(doctrineCards).values(doctrineRows).run();
    if (transferRows.length) db.insert(armsTransfers).values(transferRows).run();
    if (exerciseRows.length) db.insert(militaryExercises).values(exerciseRows).run();
    if (pkRows.length) db.insert(peacekeepingMissions).values(pkRows).run();

    sqlite.exec("COMMIT");
  } catch (err) {
    sqlite.exec("ROLLBACK");
    throw err;
  }

  return {
    equipmentModels: eqRows.length,
    historicalConflicts: conflictRows.length,
    defenseCompanies: companyRows.length,
    treaties: treatyRows.length,
    doctrineCards: doctrineRows.length,
    armsTransfers: transferRows.length,
    militaryExercises: exerciseRows.length,
    peacekeepingMissions: pkRows.length,
  };
}

if (typeof require !== "undefined" && require.main === module) {
  const result = seedKnowledge();
  console.log("Knowledge seeded:", result);
}

/**
 * Засев доменов волны-8 (ракеты, ПВО, флот, космо/кибер, бюджеты,
 * структура ВС, инфраструктура, узкие места, досье). Идемпотентно.
 */
export function seedKnowledgeExtra(): Record<string, number> {
  ensureKnowledgeTables();

  const missileRows = MISSILE_SYSTEMS.map((m) => ({
    iso: m.iso, name: m.name, type: m.type, rangeKm: m.rangeKm,
    warheadRu: m.warheadRu, count: m.count, status: m.status, noteRu: m.noteRu,
  }));
  const adRows = AIR_DEFENSE_NETWORKS.flatMap((n) => n.systems.map((s) => ({
    iso: s.iso, name: s.name, tier: s.tier, rangeKm: s.rangeKm, count: s.count, noteRu: s.noteRu,
  })));
  const navyRows = NAVY_FLEETS.flatMap((f) => f.classes.map((c) => ({
    iso: c.iso, name: c.name, typeRu: c.typeRu, type: c.type, units: c.units,
    displacementT: c.displacementT, commissioned: c.commissioned, noteRu: c.noteRu,
  })));
  const scRows = SPACE_CYBER_PROFILES.map((p) => ({
    iso: p.iso, spaceAgencyRu: p.spaceAgencyRu, milSatellites: p.milSatellites,
    launchersRu: JSON.stringify(p.launchersRu), spaceCapabilitiesRu: JSON.stringify(p.spaceCapabilitiesRu),
    spaceNoteRu: p.spaceNoteRu, cyberUnitRu: p.cyberUnitRu, cyberTier: p.cyberTier,
    cyberCapabilitiesRu: JSON.stringify(p.cyberCapabilitiesRu), cyberNoteRu: p.cyberNoteRu,
  }));
  const budgetRows = BUDGET_SERIES.flatMap((s) => s.points.map((p) => ({
    iso: s.iso, year: p.year, usdBn: p.usdBn, pctGdp: p.pctGdp,
  })));
  const forceRows = FORCE_STRUCTURES.map((f) => ({
    iso: f.iso, branches: JSON.stringify(f.branches), conscriptionRu: f.conscriptionRu,
    reservesRu: f.reservesRu, commandRu: f.commandRu, noteRu: f.noteRu,
  }));
  const infraRows = MILITARY_INFRA.map((i) => ({
    iso: i.iso, nameRu: i.nameRu, kind: i.kind, capacityRu: i.capacityRu,
    lat: i.lat, lng: i.lng, noteRu: i.noteRu,
  }));
  const ckRows = CHOKEPOINTS.map((c) => ({
    nameRu: c.nameRu, nameEn: c.nameEn, region: c.region, lat: c.lat, lng: c.lng,
    trafficRu: c.trafficRu, strategicValue: c.strategicValue,
    controlledByIso: JSON.stringify(c.controlledByIso), riskRu: c.riskRu,
  }));
  const dossierRows = COUNTRY_DOSSIERS.map((d) => ({
    iso: d.iso, overviewRu: d.overviewRu, geographyRu: d.geographyRu, economyRu: d.economyRu,
    militaryStructureRu: d.militaryStructureRu, strategicRoleRu: d.strategicRoleRu,
    keyFactsRu: JSON.stringify(d.keyFactsRu),
  }));
  const weaponRows = WEAPON_SPECS.map((w) => ({
    id: w.id, name: w.name, nameRu: w.nameRu, category: w.category, originIso: w.originIso,
    crew: w.crew, weightTons: w.weightTons, rangeKm: w.rangeKm, speedKmh: w.speedKmh,
    armamentRu: w.armamentRu, caliberMm: w.caliberMm, warheads: w.warheads,
    yearInService: w.yearInService, status: w.status, noteRu: w.noteRu,
  }));
  const orderRows = ORDER_OF_BATTLE.map((f, i) => ({
    id: i + 1, iso: f.iso, nameRu: f.nameRu, typeRu: f.typeRu, branchRu: f.branchRu,
    strengthRu: f.strengthRu, locationRu: f.locationRu, noteRu: f.noteRu,
  }));
  const battleRows = HISTORICAL_BATTLES.map((b, i) => ({
    id: `battle-${i}`, nameRu: b.nameRu, nameEn: b.nameEn, year: b.year, dateRu: b.dateRu,
    locationRu: b.locationRu, lat: b.lat, lng: b.lng, combatantsRu: b.combatantsRu,
    outcomeRu: b.outcomeRu, casualtiesRu: b.casualtiesRu, significanceRu: b.significanceRu,
    isoCodes: JSON.stringify(b.isoCodes),
  }));
  const campaignRows = MILITARY_CAMPAIGNS.map((c, i) => ({
    id: i + 1, nameRu: c.nameRu, nameEn: c.nameEn, startYear: c.startYear, endYear: c.endYear,
    regionRu: c.regionRu, theatreRu: c.theatreRu, objectiveRu: c.objectiveRu,
    outcomeRu: c.outcomeRu, forcesRu: c.forcesRu, significanceRu: c.significanceRu,
    isoCodes: JSON.stringify(c.isoCodes),
  }));

  sqlite.exec("BEGIN");
  try {
    db.delete(missileSystems).run();
    db.delete(airDefenseSystems).run();
    db.delete(navyShipClasses).run();
    db.delete(spaceCyberProfiles).run();
    db.delete(budgetSeries).run();
    db.delete(forceStructures).run();
    db.delete(militaryInfra).run();
    db.delete(chokepointsTable).run();
    db.delete(countryDossiersTable).run();
    db.delete(weaponSpecs).run();
    db.delete(orderOfBattle).run();
    db.delete(battles).run();
    db.delete(campaigns).run();

    if (missileRows.length) db.insert(missileSystems).values(missileRows).run();
    if (adRows.length) db.insert(airDefenseSystems).values(adRows).run();
    if (navyRows.length) db.insert(navyShipClasses).values(navyRows).run();
    if (scRows.length) db.insert(spaceCyberProfiles).values(scRows).run();
    if (budgetRows.length) db.insert(budgetSeries).values(budgetRows).run();
    if (forceRows.length) db.insert(forceStructures).values(forceRows).run();
    if (infraRows.length) db.insert(militaryInfra).values(infraRows).run();
    if (ckRows.length) db.insert(chokepointsTable).values(ckRows).run();
    if (dossierRows.length) db.insert(countryDossiersTable).values(dossierRows).run();
    if (weaponRows.length) db.insert(weaponSpecs).values(weaponRows).run();
    if (orderRows.length) db.insert(orderOfBattle).values(orderRows).run();
    if (battleRows.length) db.insert(battles).values(battleRows).run();
    if (campaignRows.length) db.insert(campaigns).values(campaignRows).run();

    sqlite.exec("COMMIT");
  } catch (err) {
    sqlite.exec("ROLLBACK");
    throw err;
  }

  return {
    missileSystems: missileRows.length,
    airDefenseSystems: adRows.length,
    navyShipClasses: navyRows.length,
    spaceCyberProfiles: scRows.length,
    budgetPoints: budgetRows.length,
    forceStructures: forceRows.length,
    militaryInfra: infraRows.length,
    chokepoints: ckRows.length,
    countryDossiers: dossierRows.length,
    weaponSpecs: weaponRows.length,
    orderOfBattle: orderRows.length,
    battles: battleRows.length,
    campaigns: campaignRows.length,
  };
}
