/**
 * Волна 4 «Данные и верификация» («РБП-Стратег 3.0»): barrel-экспорт.
 *
 * Состав волны:
 * - verify-engine — верификационный контур (кросс-чек ≥2 источников,
 *   правило ±20%, карантин, флаги качества, отчёты по полю и стране);
 * - sipri-2025 — военные расходы 2025 года по SIPRI (факт-лист, апрель 2026);
 * - facilities-expansion — расширение каталога стратегических объектов (+803);
 * - country-profiles-60 — расширенные профили 60 стран сверх топ-30;
 * - snapshots — версионирование данных и диффы реестров.
 */
export * from "./verify-engine.js";
export * from "./sipri-2025.js";
export * from "./facilities-expansion.js";
export * from "./country-profiles-60.js";
export * from "./snapshots.js";
