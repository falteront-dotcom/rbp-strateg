/**
 * index.ts — barrel export модуля data4 (Волна 6: глубокая база
 * систем вооружений).
 *
 * Состав:
 *  - equipment-systems.ts — данные: 220 профилей систем по 10 классам;
 *  - systems-analysis.ts — аналитика: сравнения, рейтинги, сводки
 *    по странам-операторам, поиск по характеристикам.
 */

export {
  COUNTRY_RU,
  SPEC_PARAMETER_DEFS,
  WEAPON_CLASS_RU,
  WEAPON_SYSTEMS,
  WEAPON_SYSTEM_COUNT,
} from "./equipment-systems.js";
export type {
  CombatUseEntry,
  OperatorEntry,
  SpecParameterDef,
  SpecValue,
  SystemAssessment,
  SystemProvenance,
  WeaponClassId,
  WeaponSystemProfile,
} from "./equipment-systems.js";

export {
  ASSESSMENT_AXES,
  ASSESSMENT_AXIS_RU,
  ASSESSMENT_WEIGHTS,
  CLASS_KEY_PARAMETERS,
  LOWER_IS_BETTER,
  allSystems,
  classRanking,
  classStats,
  combatProvenSystems,
  compareSystems,
  countryPortfolio,
  databaseStats,
  duelScore,
  exportIndex,
  exportLeaders,
  findSystem,
  generationTier,
  keyParametersAreDefined,
  mostWidespread,
  operatorCountries,
  operatorLeaderboard,
  overallScore,
  requireSystem,
  searchBySpec,
  sharedOperators,
  specEntry,
  specOf,
  systemsByClass,
  systemsByDeveloper,
  systemsOfGeneration,
  topBySpec,
} from "./systems-analysis.js";
export type {
  AssessmentAxis,
  AxisDelta,
  ClassCount,
  ClassStats,
  CountryPortfolio,
  DatabaseStats,
  DuelResult,
  GenerationTier,
  OperatorLeaderboardEntry,
  RankedSystem,
  SpecComparison,
  SpecSearchQuery,
  SystemComparison,
} from "./systems-analysis.js";
