// ─────────────────────────────────────────────────────────────────────────────
// Самопроверки Волны 4 «Данные и верификация» (data3)
// Запуск: npx tsx verify_data3.ts (или скомпилировать tsc и выполнить node)
// Каждая проверка печатает PASS/FAIL; итоговая строка — сводка,
// код выхода 1 при любом FAIL.
// РБП-Стратег 3.0
// ─────────────────────────────────────────────────────────────────────────────

import {
  countIndependentSources,
  findDuplicateObservations,
  verifyDataset,
  verifyFieldGroup,
} from "./src/lib/data3/verify-engine.js";
import type {
  Data3Observation,
  Data3Provenance,
} from "./src/lib/data3/verify-engine.js";
import {
  SIPRI_SPENDING_2025,
  WORLD_MILITARY_SPENDING_2025,
  sipriEntryByIso3,
  sipriTopN,
  sipriTopSharePct,
} from "./src/lib/data3/sipri-2025.js";
import {
  FACILITIES_EXPANSION,
  facilityExpansionTypeCounts,
} from "./src/lib/data3/facilities-expansion.js";
import {
  COUNTRY_PROFILES_60,
  profile60ByIso3,
} from "./src/lib/data3/country-profiles-60.js";
import {
  SNAPSHOT_2024,
  SNAPSHOT_2025,
  SNAPSHOT_REGISTRY,
  diffSnapshots,
  registryDiffChain,
} from "./src/lib/data3/snapshots.js";

// ─────────────────────────────────────────────────────────────────────────────
// Мини-каркас проверок
// ─────────────────────────────────────────────────────────────────────────────

let passedCount: number = 0;
let failedCount: number = 0;

function check(name: string, ok: boolean, detail: string): void {
  if (ok) {
    passedCount += 1;
    console.log(`PASS  ${name} — ${detail}`);
  } else {
    failedCount += 1;
    console.log(`FAIL  ${name} — ${detail}`);
  }
}

/** Строитель провенанса для тестовых наблюдений. */
function prov(input: {
  sourceId: Data3Provenance["sourceId"];
  method: Data3Provenance["method"];
  estimated: boolean;
  reliability: Data3Provenance["grade"]["source"];
  info: Data3Provenance["grade"]["info"];
}): Data3Provenance {
  return {
    sourceId: input.sourceId,
    sourceNameRu: `Тестовый источник ${input.sourceId}`,
    dataYear: 2025,
    method: input.method,
    grade: {
      source: input.reliability,
      info: input.info,
    },
    estimated: input.estimated,
    noteRu: "Сформировано самопроверкой verify_data3",
  };
}

/** Строитель наблюдения о военном бюджете страны. */
function budgetObs(
  iso3: string,
  value: number,
  provenance: Data3Provenance,
): Data3Observation {
  return {
    iso3,
    field: "militaryBudgetBn",
    value,
    unit: "млрд долл.",
    provenance,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Верификационный контур: правило ±20% и карантин
// ─────────────────────────────────────────────────────────────────────────────

// SIPRI публикует значение как факт своей базы — estimated: false;
// без хотя бы одного факта группа по правилам контура не поднимется
// выше estimated-only, что и проверяют тесты ниже.
const sipriProv = prov({
  sourceId: "sipri",
  method: "official-statistics",
  estimated: false,
  reliability: "B",
  info: 2,
});
const iissProv = prov({
  sourceId: "iiss",
  method: "expert-estimate",
  estimated: true,
  reliability: "B",
  info: 2,
});
const llmProv = prov({
  sourceId: "custom",
  method: "llm-generated",
  estimated: true,
  reliability: "C",
  info: 4,
});

// Расхождение SIPRI (921) против LLM-значения (1400): отклонение от медианы
// больше допуска 20% — группа обязана уйти в карантин, а не в среднее.
const divergent = verifyFieldGroup([
  budgetObs("USA", 921, sipriProv),
  budgetObs("USA", 1400, llmProv),
]);
check(
  "Карантин: расхождение >20% не усредняется",
  divergent.status === "quarantine" &&
    divergent.flags.includes("divergence-over-tolerance"),
  `status=${divergent.status}, maxDeviation=${divergent.maxDeviationPct.toFixed(1)}%`,
);

// Три независимых источника в пределах допуска — статус verified.
const agreed = verifyFieldGroup([
  budgetObs("USA", 921, sipriProv),
  budgetObs("USA", 905, iissProv),
  budgetObs(
    "USA",
    935,
    prov({
      sourceId: "csis",
      method: "expert-estimate",
      estimated: true,
      reliability: "B",
      info: 3,
    }),
  ),
]);
check(
  "Кросс-чек: три источника в допуске дают verified",
  agreed.status === "verified" && agreed.independentSources === 3,
  `status=${agreed.status}, sources=${agreed.independentSources}, median=${agreed.medianValue}`,
);

// Один источник — только single-source, выше подняться нельзя.
const single = verifyFieldGroup([budgetObs("RUS", 190, sipriProv)]);
check(
  "Один источник даёт не выше single-source",
  single.status === "single-source" && single.independentSources === 1,
  `status=${single.status}`,
);

// Значение вне физического диапазона поля отклоняется жёстко.
const outOfRange = verifyFieldGroup([budgetObs("USA", 50000, sipriProv)]);
check(
  "Вне диапазона: бюджет $50 трлн отклонён",
  outOfRange.status === "rejected" && outOfRange.flags.includes("out-of-range"),
  `status=${outOfRange.status}`,
);

// Дубль одного источника — не второй источник: независимость считается
// по различным sourceId, дубли помечаются флагом.
const dupObs = budgetObs("USA", 921, sipriProv);
const dupGroup = [dupObs, { ...dupObs }, budgetObs("USA", 910, iissProv)];
check(
  "Дубликаты наблюдений находятся и не накручивают источники",
  findDuplicateObservations(dupGroup).length === 1 &&
    countIndependentSources(dupGroup) === 2,
  `duplicates=${findDuplicateObservations(dupGroup).length}, independent=${countIndependentSources(dupGroup)}`,
);

// Датасет целиком: карантин виден в сводном отчёте контура.
const datasetReport = verifyDataset([
  budgetObs("USA", 921, sipriProv),
  budgetObs("USA", 1400, llmProv),
  budgetObs("RUS", 190, sipriProv),
  budgetObs("RUS", 186, iissProv),
]);
check(
  "Отчёт по датасету: поля посчитаны, карантин не потерян",
  datasetReport.totalFields === 2 && datasetReport.quarantine.length === 1,
  `fields=${datasetReport.totalFields}, quarantine=${datasetReport.quarantine.length}`,
);

// ─────────────────────────────────────────────────────────────────────────────
// 2. SIPRI-2025: порядок, итоги, дубликаты
// ─────────────────────────────────────────────────────────────────────────────

const descending = SIPRI_SPENDING_2025.every(
  (entry, idx) =>
    idx === 0 || SIPRI_SPENDING_2025[idx - 1].spendingBn >= entry.spendingBn,
);
check(
  "SIPRI: рейтинг упорядочен по убыванию расходов",
  descending,
  `top1=${SIPRI_SPENDING_2025[0].iso3} $${SIPRI_SPENDING_2025[0].spendingBn} млрд`,
);

const ranksOk = SIPRI_SPENDING_2025.every(
  (entry, idx) => entry.rank === idx + 1,
);
check(
  "SIPRI: ранги соответствуют позициям ряда",
  ranksOk,
  `записей=${SIPRI_SPENDING_2025.length}`,
);

check(
  "SIPRI: мировой итог 2025 — $2 887 млрд, +2,9%",
  WORLD_MILITARY_SPENDING_2025.spendingBn === 2887 &&
    WORLD_MILITARY_SPENDING_2025.changePct === 2.9 &&
    WORLD_MILITARY_SPENDING_2025.estimated === false,
  `world=${WORLD_MILITARY_SPENDING_2025.spendingBn}`,
);

const usaEntry = sipriEntryByIso3("USA");
check(
  "SIPRI: США — $921 млрд и первое место",
  usaEntry !== undefined && usaEntry.spendingBn === 921 && usaEntry.rank === 1,
  `usa=${usaEntry?.spendingBn}`,
);

const sipriIsoSet = new Set(SIPRI_SPENDING_2025.map((e) => e.iso3));
check(
  "SIPRI: дубликаты iso3 отсутствуют",
  sipriIsoSet.size === SIPRI_SPENDING_2025.length,
  `unique=${sipriIsoSet.size} из ${SIPRI_SPENDING_2025.length}`,
);

check(
  "SIPRI: все записи — данные 2025 года",
  SIPRI_SPENDING_2025.every((e) => e.year === 2025),
  "year=2025 у всех строк",
);

const top5Share = sipriTopSharePct(5);
check(
  "SIPRI: топ-5 дают больше половины мировых расходов",
  top5Share > 50 && top5Share < 80 && sipriTopN(3).length === 3,
  `top5Share=${top5Share.toFixed(1)}%`,
);

// ─────────────────────────────────────────────────────────────────────────────
// 3. Расширение каталога объектов: объём, дубли, координаты
// ─────────────────────────────────────────────────────────────────────────────

check(
  "Объекты: расширение не меньше +400 сверх исходных 329",
  FACILITIES_EXPANSION.length >= 400,
  `записей=${FACILITIES_EXPANSION.length}`,
);

const facilityIds = new Set(FACILITIES_EXPANSION.map((f) => f.id));
check(
  "Объекты: идентификаторы уникальны",
  facilityIds.size === FACILITIES_EXPANSION.length,
  `unique=${facilityIds.size}`,
);

const facilityNameKeys = new Set(
  FACILITIES_EXPANSION.map((f) => `${f.hostIso}|${f.name.toLowerCase()}`),
);
check(
  "Объекты: пары (страна, название) не дублируются",
  facilityNameKeys.size === FACILITIES_EXPANSION.length,
  `unique=${facilityNameKeys.size}`,
);

const coordsOk = FACILITIES_EXPANSION.every(
  (f) => f.lat >= -90 && f.lat <= 90 && f.lng >= -180 && f.lng <= 180,
);
check(
  "Объекты: координаты в допустимых диапазонах",
  coordsOk,
  "lat ∈ [-90, 90], lng ∈ [-180, 180] у всех записей",
);

const honestyOk = FACILITIES_EXPANSION.every(
  (f) =>
    f.coordinateEstimated === true &&
    f.strategicValue >= 1 &&
    f.strategicValue <= 10 &&
    f.source.length > 0,
);
check(
  "Объекты: координаты честно помечены приблизительными, значимость 1–10",
  honestyOk,
  "coordinateEstimated=true у всех записей",
);

const typeCounts = facilityExpansionTypeCounts();
check(
  "Объекты: представлено не меньше 10 типов объектов",
  Object.keys(typeCounts).length >= 10,
  `типов=${Object.keys(typeCounts).length}`,
);

// ─────────────────────────────────────────────────────────────────────────────
// 4. Профили-60: состав, дубли, полнота провенанса
// ─────────────────────────────────────────────────────────────────────────────

check(
  "Профили: ровно 60 стран",
  COUNTRY_PROFILES_60.length === 60,
  `профилей=${COUNTRY_PROFILES_60.length}`,
);

const profileIsoSet = new Set(COUNTRY_PROFILES_60.map((p) => p.iso3));
check(
  "Профили: дубликаты iso3 отсутствуют",
  profileIsoSet.size === COUNTRY_PROFILES_60.length,
  `unique=${profileIsoSet.size}`,
);

// Топ-30 волн bp3/warfare3 в профили-60 входить не должны.
const TOP30_UNION: readonly string[] = [
  "ARE", "AUS", "BRA", "CAN", "CHN", "DEU", "DZA", "EGY", "ESP", "FIN",
  "FRA", "GBR", "GRC", "IDN", "IND", "IRN", "ISR", "ITA", "JPN", "KOR",
  "MEX", "PAK", "POL", "PRK", "RUS", "SAU", "SWE", "THA", "TUR", "TWN",
  "UKR", "USA", "VNM", "ZAF",
];
const overlap = COUNTRY_PROFILES_60.filter((p) => TOP30_UNION.includes(p.iso3));
check(
  "Профили: пересечения с топ-30 волн 1–3 нет",
  overlap.length === 0,
  `пересечений=${overlap.length}`,
);

const provenanceComplete = COUNTRY_PROFILES_60.every(
  (p) =>
    p.defenseIndustry.provenance.source.length > 0 &&
    p.stockpilesAndProduction.entries.length >= 3 &&
    p.stockpilesAndProduction.entries.every(
      (e) => e.provenance.estimated === true,
    ) &&
    p.uav.systems.length >= 1 &&
    p.importDependence.mainSuppliers.length >= 2 &&
    p.vulnerabilities.itemsRu.length >= 4,
);
check(
  "Профили: секции полны, запасы честно помечены estimated",
  provenanceComplete,
  "источник/год/estimated присутствуют, запасы — оценочные у всех 60",
);

check(
  "Профили: поиск по iso3 работает",
  profile60ByIso3("NLD")?.nameRu === "Нидерланды" &&
    profile60ByIso3("XXX") === undefined,
  "NLD найден, XXX — undefined",
);

// ─────────────────────────────────────────────────────────────────────────────
// 5. Снапшоты: реестр и диффы
// ─────────────────────────────────────────────────────────────────────────────

check(
  "Снапшоты: реестр содержит 2024, 2025 и план-2026",
  SNAPSHOT_REGISTRY.length === 3 &&
    SNAPSHOT_REGISTRY[0].id === SNAPSHOT_2024.id &&
    SNAPSHOT_REGISTRY[1].id === SNAPSHOT_2025.id,
  `реестр=${SNAPSHOT_REGISTRY.map((s) => s.id).join(", ")}`,
);

const selfDiff = diffSnapshots(SNAPSHOT_2024, SNAPSHOT_2024);
check(
  "Снапшоты: дифф снапшота с самим собой пуст",
  selfDiff.addedSources.length === 0 &&
    selfDiff.removedSources.length === 0 &&
    selfDiff.coverageDelta.facilities === 0 &&
    selfDiff.coverageDelta.countries === 0,
  "дельты нулевые",
);

const waveDiff = diffSnapshots(SNAPSHOT_2024, SNAPSHOT_2025);
check(
  "Снапшоты: дифф 2024→2025 фиксирует рост каталога объектов",
  waveDiff.coverageDelta.facilities > 0 &&
    waveDiff.coverageDelta.provenanceFields > 0,
  `facilities Δ=${waveDiff.coverageDelta.facilities}, provenance Δ=${waveDiff.coverageDelta.provenanceFields}`,
);

check(
  "Снапшоты: цепочка диффов реестра непрерывна",
  registryDiffChain().length === SNAPSHOT_REGISTRY.length - 1,
  `диффов=${registryDiffChain().length}`,
);

// ─────────────────────────────────────────────────────────────────────────────
// Сводка
// ─────────────────────────────────────────────────────────────────────────────

console.log("");
console.log(
  `ИТОГ: ${passedCount} PASS, ${failedCount} FAIL из ${passedCount + failedCount} проверок Волны 4`,
);
if (failedCount > 0) {
  process.exit(1);
}
