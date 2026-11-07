/**
 * verify_data4.ts — верификация Волны 6 (data4): глубокая база
 * систем вооружений.
 *
 * Проверки:
 *  1. В базе не менее 220 систем; покрыты все 10 классов.
 *  2. Id уникальны; у каждой системы есть операторы и источник.
 *  3. Таблица ТТХ каждой системы полна и соответствует справочнику
 *     параметров класса (ключи и порядок).
 *  4. Значения ТТХ лежат в физических диапазонах по классу
 *     (скорость/дальность/масса > 0 и в разумных пределах).
 *  5. Оценки по осям — в шкале 0–10; годы данных — в разумном винтаже.
 *  6. Аналитический слой: ключевые параметры определены, сравнения,
 *     рейтинги и сводки по странам работают.
 *
 * Запуск: esbuild-бандл в память/файл и node, либо tsx.
 */

import {
  SPEC_PARAMETER_DEFS,
  WEAPON_CLASS_RU,
  WEAPON_SYSTEMS,
} from "./src/lib/data4/equipment-systems.js";
import type {
  WeaponClassId,
  WeaponSystemProfile,
} from "./src/lib/data4/equipment-systems.js";
import {
  classRanking,
  classStats,
  compareSystems,
  countryPortfolio,
  databaseStats,
  duelScore,
  keyParametersAreDefined,
  mostWidespread,
  searchBySpec,
} from "./src/lib/data4/systems-analysis.js";

// ── Каркас проверок ─────────────────────────────────────────────────

interface CheckResult {
  readonly name: string;
  readonly ok: boolean;
  readonly details: string;
}

const results: CheckResult[] = [];

function check(name: string, ok: boolean, details: string): void {
  results.push({ name, ok, details });
}

// ── Физические диапазоны по классам ─────────────────────────────────

/** Диапазоны [min, max] ключевых ТТХ по классам (выборочная физика). */
const CLASS_RANGES: Record<
  WeaponClassId,
  Readonly<Record<string, readonly [number, number]>>
> = {
  mbt: {
    weightT: [20, 100],
    gunMm: [75, 155],
    speedKmh: [40, 90],
    rangeKm: [300, 700],
    lengthM: [6, 13],
    crew: [3, 4],
  },
  ifv: {
    weightT: [7, 60],
    gunMm: [0, 100],
    speedKmh: [50, 110],
    troops: [0, 12],
    lengthM: [5, 11],
  },
  artillery: {
    caliberMm: [80, 920],
    maxRangeKm: [10, 320],
    weightT: [3, 80],
    cepM: [1, 300],
  },
  fighter: {
    maxSpeedMach: [0.8, 3.2],
    combatRadiusKm: [200, 2500],
    ferryRangeKm: [1000, 15000],
    ceilingM: [10000, 26000],
    thrustKg: [3000, 45000],
    mtowKg: [8000, 50000],
    payloadKg: [1000, 15000],
    radarRangeKm: [50, 400],
    lengthM: [10, 25],
    wingspanM: [6, 20],
  },
  heli: {
    mtowKg: [1500, 25000],
    speedKmh: [150, 400],
    rangeKm: [300, 1500],
    ceilingM: [3000, 8000],
    payloadKg: [500, 6000],
    lengthM: [8, 20],
  },
  uav: {
    speedKmh: [50, 1100],
    enduranceH: [0.3, 60],
    ceilingM: [1000, 20000],
    mtowKg: [3, 30000],
    lengthM: [1, 20],
    wingspanM: [1, 45],
    combatRadiusKm: [20, 9000],
  },
  submarine: {
    displacementT: [1000, 26000],
    lengthM: [50, 180],
    depthM: [200, 700],
    speedSubKn: [10, 40],
    enduranceDays: [20, 120],
    torpedoTubes: [0, 12],
    missileLaunchers: [0, 36],
    propulsionCode: [1, 3],
  },
  ship: {
    crew: [20, 4000],
    displacementT: [500, 110000],
    lengthM: [50, 350],
    beamM: [8, 85],
    speedKn: [15, 40],
    rangeNm: [1000, 25000],
    enduranceDays: [5, 120],
    vlsCells: [0, 130],
    gunMm: [0, 160],
    helicopters: [0, 40],
    aircraftCapacity: [0, 90],
  },
  airdef: {
    maxRangeKm: [5, 2500],
    maxAltKm: [3, 600],
    simTargets: [1, 100],
    channels: [1, 200],
    readyMissiles: [1, 64],
    radarRangeKm: [10, 2500],
    reactionSec: [3, 60],
    speedKmh: [0, 100],
    deployMin: [3, 120],
  },
  missile: {
    launchWeightKg: [100, 25000],
    lengthM: [3, 16],
    diameterM: [0.3, 1.6],
    maxRangeKm: [50, 6000],
    minRangeKm: [1, 300],
    warheadKg: [50, 2000],
    speedMach: [0.7, 15],
    cepM: [1, 50],
    basingCode: [1, 5],
    stages: [1, 3],
  },
};

/** Параметры, где 0 допустим (нет пушки, нет ВПУ, флаг канала и т.п.). */
const ZERO_ALLOWED: ReadonlySet<string> = new Set<string>([
  "gunMm",
  "gunCaliberMm",
  "vlsCells",
  "helicopters",
  "aircraftCapacity",
  "torpedoTubes",
  "missileLaunchers",
  "satLink",
  "hardpoints",
  "payloadKg",
  "troops",
]);

const CLASS_IDS: readonly WeaponClassId[] = [
  "mbt",
  "ifv",
  "artillery",
  "fighter",
  "heli",
  "uav",
  "submarine",
  "ship",
  "airdef",
  "missile",
];

function specValue(
  system: WeaponSystemProfile,
  parameterKey: string,
): number | null {
  for (const spec of system.specs) {
    if (spec.parameterKey === parameterKey) {
      return spec.value;
    }
  }
  return null;
}

// ── 1. Объём и покрытие классов ─────────────────────────────────────

check(
  "В базе не менее 220 систем",
  WEAPON_SYSTEMS.length >= 220,
  `фактически: ${WEAPON_SYSTEMS.length}`,
);

for (const classId of CLASS_IDS) {
  const count: number = WEAPON_SYSTEMS.filter(
    (system: WeaponSystemProfile): boolean => system.classId === classId,
  ).length;
  check(
    `Класс ${WEAPON_CLASS_RU[classId]} покрыт минимум 15 системами`,
    count >= 15,
    `фактически: ${count}`,
  );
}

// ── 2. Уникальность id, операторы, источники ────────────────────────

const seenIds: Set<string> = new Set<string>();
let duplicateIds = 0;
let missingOperators = 0;
let missingSource = 0;
let missingDeveloper = 0;
for (const system of WEAPON_SYSTEMS) {
  if (seenIds.has(system.id)) {
    duplicateIds += 1;
  }
  seenIds.add(system.id);
  if (system.operators.length === 0) {
    missingOperators += 1;
  }
  if (system.provenance.sourceRu.trim().length === 0) {
    missingSource += 1;
  }
  if (system.developerIso.trim().length === 0) {
    missingDeveloper += 1;
  }
}
check("Id систем уникальны", duplicateIds === 0, `дублей: ${duplicateIds}`);
check(
  "У каждой системы есть операторы",
  missingOperators === 0,
  `без операторов: ${missingOperators}`,
);
check(
  "У каждой системы указан источник",
  missingSource === 0,
  `без источника: ${missingSource}`,
);
check(
  "У каждой системы указана страна-разработчик",
  missingDeveloper === 0,
  `без разработчика: ${missingDeveloper}`,
);

// ── 3. Полнота таблиц ТТХ против справочника параметров ─────────────

let incompleteSpecs = 0;
let wrongOrder = 0;
for (const system of WEAPON_SYSTEMS) {
  const defs = SPEC_PARAMETER_DEFS[system.classId];
  if (system.specs.length !== defs.length) {
    incompleteSpecs += 1;
    continue;
  }
  for (let i = 0; i < defs.length; i += 1) {
    if (system.specs[i].parameterKey !== defs[i].key) {
      wrongOrder += 1;
      break;
    }
  }
}
check(
  "Таблицы ТТХ полны (число полей = справочнику класса)",
  incompleteSpecs === 0,
  `неполных: ${incompleteSpecs}`,
);
check(
  "Порядок и ключи ТТХ соответствуют справочнику",
  wrongOrder === 0,
  `с расхождениями: ${wrongOrder}`,
);

// ── 4. Физические диапазоны ─────────────────────────────────────────

let nonFinite = 0;
let negativeValues = 0;
const rangeViolations: string[] = [];
for (const system of WEAPON_SYSTEMS) {
  for (const spec of system.specs) {
    if (!Number.isFinite(spec.value)) {
      nonFinite += 1;
    }
    if (spec.value < 0) {
      negativeValues += 1;
    }
    // Нулевая скорость марша допустима у стационарных ЗРК (Aegis Ashore).
    const stationaryAirdef: boolean =
      system.classId === "airdef" && spec.parameterKey === "speedKmh";
    if (
      spec.value === 0 &&
      !ZERO_ALLOWED.has(spec.parameterKey) &&
      !stationaryAirdef
    ) {
      rangeViolations.push(`${system.id}:${spec.parameterKey}=0`);
    }
  }
  const ranges: Readonly<Record<string, readonly [number, number]>> =
    CLASS_RANGES[system.classId];
  for (const key of Object.keys(ranges)) {
    const value: number | null = specValue(system, key);
    const range: readonly [number, number] = ranges[key];
    if (value === null || value < range[0] || value > range[1]) {
      rangeViolations.push(
        `${system.id}:${key}=${value} вне [${range[0]}; ${range[1]}]`,
      );
    }
  }
}
check(
  "Все значения ТТХ конечны",
  nonFinite === 0,
  `неконечных: ${nonFinite}`,
);
check(
  "Нет отрицательных значений ТТХ",
  negativeValues === 0,
  `отрицательных: ${negativeValues}`,
);
check(
  "ТТХ в физических диапазонах по классу",
  rangeViolations.length === 0,
  rangeViolations.length === 0
    ? "нарушений нет"
    : `нарушений: ${rangeViolations.length}; первые: ${rangeViolations
        .slice(0, 8)
        .join("; ")}`,
);

// ── 5. Оценки и винтаж данных ───────────────────────────────────────

let badScores = 0;
let badYears = 0;
for (const system of WEAPON_SYSTEMS) {
  const scores: readonly number[] = [
    system.assessment.firepower,
    system.assessment.protection,
    system.assessment.mobility,
    system.assessment.awareness,
    system.assessment.reliability,
    system.assessment.exportPotential,
  ];
  for (const score of scores) {
    if (score < 0 || score > 10) {
      badScores += 1;
    }
  }
  if (system.provenance.dataYear < 2015 || system.provenance.dataYear > 2026) {
    badYears += 1;
  }
  if (system.yearEntered < 1950 || system.yearEntered > 2035) {
    badYears += 1;
  }
}
check("Оценки по осям в шкале 0–10", badScores === 0, `вне шкалы: ${badScores}`);
check(
  "Годы данных и принятия в разумном винтаже",
  badYears === 0,
  `подозрительных: ${badYears}`,
);

// ── 6. Аналитический слой ───────────────────────────────────────────

check(
  "Ключевые параметры аналитики определены в справочнике",
  keyParametersAreDefined(),
  "CLASS_KEY_PARAMETERS ⊆ SPEC_PARAMETER_DEFS",
);

const comparison = compareSystems("t-90m", "m1a2-sepv3");
check(
  "Парное сравнение работает (Т-90М vs M1A2)",
  comparison !== null &&
    comparison.sameClass &&
    comparison.axisDeltas.length === 6 &&
    comparison.specComparisons.length > 0,
  comparison === null ? "null" : comparison.verdictRu,
);

const duel = duelScore("s-400", "patriot-pac3");
check(
  "Дуэльный счёт работает (С-400 vs Patriot)",
  duel !== null && duel.scoreA > 0 && duel.scoreB > 0,
  duel === null ? "null" : `${duel.scoreA} : ${duel.scoreB}`,
);

const ranking = classRanking("fighter", "overall");
check(
  "Рейтинг класса истребителей строится",
  ranking.length >= 15 && ranking[0].rank === 1,
  `позиций: ${ranking.length}, лидер: ${ranking[0]?.system.id ?? "—"}`,
);

const portfolio = countryPortfolio("RUS");
check(
  "Сводка по стране-оператору строится (Россия)",
  portfolio !== null && portfolio.totalSystems >= 30,
  portfolio === null
    ? "null"
    : `систем: ${portfolio.totalSystems}, классов: ${portfolio.byClass.length}`,
);

const fastFighters = searchBySpec({
  classId: "fighter",
  parameterKey: "maxSpeedMach",
  minValue: 2,
});
check(
  "Поиск по характеристике работает (истребители ≥ 2 М)",
  fastFighters.length >= 5,
  `найдено: ${fastFighters.length}`,
);

const stats = databaseStats();
check(
  "Статистика базы согласована",
  stats.totalSystems === WEAPON_SYSTEMS.length &&
    stats.classesCovered === 10 &&
    stats.specFieldCount >= 2400,
  `систем: ${stats.totalSystems}, полей ТТХ: ${stats.specFieldCount}, связей с операторами: ${stats.operatorLinks}`,
);

const airdefStats = classStats("airdef");
check(
  "Статистика класса ЗРК строится",
  airdefStats !== null && airdefStats.count === 22,
  airdefStats === null
    ? "null"
    : `лидер: ${airdefStats.leader.id}, медианный год: ${airdefStats.medianYear}`,
);

const widespread = mostWidespread(5);
check(
  "Самые распространённые системы определяются",
  widespread.length === 5 && widespread[0].score >= 15,
  `топ: ${widespread[0]?.system.id ?? "—"} (${widespread[0]?.score ?? 0} операторов)`,
);

// ── Итог ────────────────────────────────────────────────────────────

let failed = 0;
for (const result of results) {
  if (!result.ok) {
    failed += 1;
  }
  console.log(
    `${result.ok ? "PASS" : "FAIL"}  ${result.name} — ${result.details}`,
  );
}
console.log(
  failed === 0
    ? `\nИТОГ: PASS (${results.length}/${results.length} проверок)`
    : `\nИТОГ: FAIL (${results.length - failed}/${results.length} проверок пройдено)`,
);
if (failed > 0) {
  process.exit(1);
}
