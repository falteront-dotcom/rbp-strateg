import { eq, desc, sql, like, or } from "drizzle-orm";
import { db } from "./index";
import {
  equipmentModels,
  historicalConflicts,
  defenseCompanies,
  treaties,
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
  chokepoints,
  countryDossiers,
  weaponSpecs,
  orderOfBattle,
  battles,
  campaigns,
  type EquipmentModel,
  type HistoricalConflict,
  type DefenseCompany,
  type Treaty,
  type DoctrineCard,
  type ArmsTransfer,
  type MilitaryExercise,
  type PeacekeepingMission,
  type MissileSystem,
  type AirDefenseSystem,
  type NavyShipClass,
  type SpaceCyberProfile,
  type BudgetPoint,
  type ForceStructure,
  type MilitaryInfra,
  type Chokepoint,
  type CountryDossier,
  type WeaponSpec,
  type OrderOfBattle,
  type Battle,
  type Campaign,
} from "./schema-knowledge";

/** Парсит JSON-строку массива из текстового поля (безопасно к отсутствию). */
function parseArray(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// ─── Модельный состав ──────────────────────────────────────────────────────
export function getEquipmentByIso(iso: string): EquipmentModel[] {
  return db
    .select()
    .from(equipmentModels)
    .where(eq(equipmentModels.iso, iso))
    .orderBy(desc(equipmentModels.count))
    .all();
}

export function getEquipmentAll(limit = 5000): EquipmentModel[] {
  return db.select().from(equipmentModels).limit(limit).all();
}

export function getEquipmentSummary(): { iso: string; models: number; units: number }[] {
  return db
    .select({
      iso: equipmentModels.iso,
      models: sql<number>`count(*)`,
      units: sql<number>`sum(${equipmentModels.count})`,
    })
    .from(equipmentModels)
    .groupBy(equipmentModels.iso)
    .orderBy(desc(sql`sum(${equipmentModels.count})`))
    .all();
}

// ─── История конфликтов ────────────────────────────────────────────────────
export function getConflictsInvolving(iso: string): HistoricalConflict[] {
  // isoCodes — JSON-строка; ищем подстроку ISO-кода в ней (точное совпадение по кавычкам).
  return db
    .select()
    .from(historicalConflicts)
    .where(like(historicalConflicts.isoCodes, `%"${iso}"%`))
    .orderBy(desc(historicalConflicts.startYear))
    .all();
}

export function getConflictsAll(limit = 500): HistoricalConflict[] {
  return db
    .select()
    .from(historicalConflicts)
    .orderBy(desc(historicalConflicts.startYear))
    .limit(limit)
    .all();
}

export function getConflictById(id: string): HistoricalConflict | undefined {
  return db
    .select()
    .from(historicalConflicts)
    .where(eq(historicalConflicts.id, id))
    .get();
}

// ─── ОПК ───────────────────────────────────────────────────────────────────
export function getCompaniesByIso(iso: string): DefenseCompany[] {
  return db
    .select()
    .from(defenseCompanies)
    .where(eq(defenseCompanies.iso, iso))
    .orderBy(desc(defenseCompanies.revenueUsdBn))
    .all();
}

export function getCompaniesAll(limit = 1000): DefenseCompany[] {
  return db
    .select()
    .from(defenseCompanies)
    .orderBy(desc(defenseCompanies.revenueUsdBn))
    .limit(limit)
    .all();
}

// ─── Договоры ──────────────────────────────────────────────────────────────
export function getTreatiesFor(iso: string): Treaty[] {
  return db
    .select()
    .from(treaties)
    .where(like(treaties.membersIso, `%"${iso}"%`))
    .orderBy(desc(treaties.signedYear))
    .all();
}

export function getTreatiesAll(limit = 500): Treaty[] {
  return db.select().from(treaties).orderBy(desc(treaties.signedYear)).limit(limit).all();
}

// ─── Доктрины ──────────────────────────────────────────────────────────────
export function getDoctrine(iso: string): DoctrineCard | undefined {
  return db.select().from(doctrineCards).where(eq(doctrineCards.iso, iso)).get();
}

export function getDoctrinesAll(limit = 300): DoctrineCard[] {
  return db.select().from(doctrineCards).limit(limit).all();
}

// ─── Поставки вооружений ───────────────────────────────────────────────────
export function getTransfersInvolving(iso: string, limit = 500): ArmsTransfer[] {
  return db
    .select()
    .from(armsTransfers)
    .where(or(eq(armsTransfers.fromIso, iso), eq(armsTransfers.toIso, iso)))
    .orderBy(desc(armsTransfers.year))
    .limit(limit)
    .all();
}

export function getTransfersAll(limit = 1000): ArmsTransfer[] {
  return db.select().from(armsTransfers).orderBy(desc(armsTransfers.year)).limit(limit).all();
}

export function getTopExporters(limit = 10): { iso: string; deals: number }[] {
  return db
    .select({ iso: armsTransfers.fromIso, deals: sql<number>`count(*)` })
    .from(armsTransfers)
    .groupBy(armsTransfers.fromIso)
    .orderBy(desc(sql`count(*)`))
    .limit(limit)
    .all();
}

// ─── Учения ────────────────────────────────────────────────────────────────
export function getExercisesInvolving(iso: string, limit = 300): MilitaryExercise[] {
  return db
    .select()
    .from(militaryExercises)
    .where(
      or(
        eq(militaryExercises.hostIso, iso),
        like(militaryExercises.participantsIso, `%"${iso}"%`),
      ),
    )
    .orderBy(desc(militaryExercises.year))
    .limit(limit)
    .all();
}

export function getExercisesAll(limit = 500): MilitaryExercise[] {
  return db.select().from(militaryExercises).orderBy(desc(militaryExercises.year)).limit(limit).all();
}

// ─── Миротворчество ────────────────────────────────────────────────────────
export function getPeacekeepingAll(limit = 300): PeacekeepingMission[] {
  return db
    .select()
    .from(peacekeepingMissions)
    .orderBy(desc(peacekeepingMissions.personnel))
    .limit(limit)
    .all();
}

// Re-export parse helper for route handlers that deserialize array columns.
export { parseArray };

// ─── Ракетные системы ──────────────────────────────────────────────────────
export function getMissilesByIso(iso: string): MissileSystem[] {
  return db.select().from(missileSystems).where(eq(missileSystems.iso, iso)).all();
}
export function getMissilesAll(limit = 3000): MissileSystem[] {
  return db.select().from(missileSystems).limit(limit).all();
}

// ─── ПВО/ПРО ───────────────────────────────────────────────────────────────
export function getAirDefenseByIso(iso: string): AirDefenseSystem[] {
  return db.select().from(airDefenseSystems).where(eq(airDefenseSystems.iso, iso)).all();
}
export function getAirDefenseAll(limit = 3000): AirDefenseSystem[] {
  return db.select().from(airDefenseSystems).limit(limit).all();
}

// ─── Флоты ─────────────────────────────────────────────────────────────────
export function getNavyByIso(iso: string): NavyShipClass[] {
  return db.select().from(navyShipClasses).where(eq(navyShipClasses.iso, iso)).orderBy(desc(navyShipClasses.units)).all();
}
export function getNavyAll(limit = 3000): NavyShipClass[] {
  return db.select().from(navyShipClasses).orderBy(desc(navyShipClasses.units)).limit(limit).all();
}

// ─── Космо/кибер ───────────────────────────────────────────────────────────
export function getSpaceCyber(iso: string): SpaceCyberProfile | undefined {
  return db.select().from(spaceCyberProfiles).where(eq(spaceCyberProfiles.iso, iso)).get();
}
export function getSpaceCyberAll(limit = 300): SpaceCyberProfile[] {
  return db.select().from(spaceCyberProfiles).limit(limit).all();
}

// ─── Бюджеты ───────────────────────────────────────────────────────────────
export function getBudgetByIso(iso: string): BudgetPoint[] {
  return db.select().from(budgetSeries).where(eq(budgetSeries.iso, iso)).orderBy(budgetSeries.year).all();
}

// ─── Структура ВС ──────────────────────────────────────────────────────────
export function getForceStructure(iso: string): ForceStructure | undefined {
  return db.select().from(forceStructures).where(eq(forceStructures.iso, iso)).get();
}
export function getForceStructuresAll(limit = 300): ForceStructure[] {
  return db.select().from(forceStructures).limit(limit).all();
}

// ─── Инфраструктура ────────────────────────────────────────────────────────
export function getInfraByIso(iso: string): MilitaryInfra[] {
  return db.select().from(militaryInfra).where(eq(militaryInfra.iso, iso)).all();
}
export function getInfraAll(limit = 3000): MilitaryInfra[] {
  return db.select().from(militaryInfra).limit(limit).all();
}

// ─── Узкие места ───────────────────────────────────────────────────────────
export function getChokepointsAll(limit = 200): Chokepoint[] {
  return db.select().from(chokepoints).orderBy(desc(chokepoints.strategicValue)).limit(limit).all();
}

// ─── Досье ─────────────────────────────────────────────────────────────────
export function getDossier(iso: string): CountryDossier | undefined {
  return db.select().from(countryDossiers).where(eq(countryDossiers.iso, iso)).get();
}
export function getDossiersAll(limit = 300): CountryDossier[] {
  return db.select().from(countryDossiers).limit(limit).all();
}

// ─── Образцы вооружений (детальные ТТХ) ────────────────────────────────────
export function getWeaponsByCategory(category: string): WeaponSpec[] {
  return db.select().from(weaponSpecs).where(eq(weaponSpecs.category, category)).all();
}
export function getWeaponsByOrigin(iso: string): WeaponSpec[] {
  return db.select().from(weaponSpecs).where(eq(weaponSpecs.originIso, iso)).all();
}
export function getWeaponsAll(limit = 2000): WeaponSpec[] {
  return db.select().from(weaponSpecs).limit(limit).all();
}

// ─── Боевой порядок ────────────────────────────────────────────────────────
export function getOrderByIso(iso: string): OrderOfBattle[] {
  return db.select().from(orderOfBattle).where(eq(orderOfBattle.iso, iso)).all();
}
export function getOrderAll(limit = 3000): OrderOfBattle[] {
  return db.select().from(orderOfBattle).limit(limit).all();
}

// ─── Исторические сражения ────────────────────────────────────────────────
export function getBattlesInvolving(iso: string, limit = 200): Battle[] {
  return db.select().from(battles).where(like(battles.isoCodes, `%"${iso}"%`)).orderBy(battles.year).limit(limit).all();
}
export function getBattlesAll(limit = 300): Battle[] {
  return db.select().from(battles).orderBy(battles.year).limit(limit).all();
}

// ─── Военные кампании ─────────────────────────────────────────────────────
export function getCampaignsInvolving(iso: string, limit = 200): Campaign[] {
  return db.select().from(campaigns).where(like(campaigns.isoCodes, `%"${iso}"%`)).orderBy(campaigns.startYear).limit(limit).all();
}
export function getCampaignsAll(limit = 300): Campaign[] {
  return db.select().from(campaigns).orderBy(campaigns.startYear).limit(limit).all();
}
