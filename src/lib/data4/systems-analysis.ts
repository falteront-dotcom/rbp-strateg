/**
 * systems-analysis.ts — аналитический слой над базой систем вооружений
 * (Волна 6, data4).
 *
 * Функции модуля:
 *  - доступ и поиск: системы по классу, по id, по характеристикам;
 *  - сравнения: парное сравнение по осям оценки и ключевым ТТХ,
 *    рейтинги внутри класса, «дуэльный» интегральный счёт;
 *  - поколение/уровень: эвристическая классификация технологического
 *    уровня из текстового поля поколения и года принятия;
 *  - экспортный потенциал: индекс на основе числа операторов и оценки;
 *  - сводки по странам: портфели операторов и разработчиков, лидерборды;
 *  - статистика классов и всей базы.
 *
 * Все функции чистые и детерминированные: они не мутируют базу
 * WEAPON_SYSTEMS и возвращают новые объекты.
 */

import {
  SPEC_PARAMETER_DEFS,
  WEAPON_SYSTEMS,
} from "./equipment-systems.js";
import type {
  SpecValue,
  SystemAssessment,
  WeaponClassId,
  WeaponSystemProfile,
} from "./equipment-systems.js";

// ════════════════════════════════════════════════════════════════════
// Базовые типы аналитики
// ════════════════════════════════════════════════════════════════════

/** Ось экспертной оценки системы. */
export type AssessmentAxis = keyof SystemAssessment;

/** Все оси оценки в фиксированном порядке. */
export const ASSESSMENT_AXES: readonly AssessmentAxis[] = [
  "firepower",
  "protection",
  "mobility",
  "awareness",
  "reliability",
  "exportPotential",
];

/** Русские названия осей оценки. */
export const ASSESSMENT_AXIS_RU: Record<AssessmentAxis, string> = {
  firepower: "Огневая мощь",
  protection: "Защищённость",
  mobility: "Подвижность",
  awareness: "Осведомлённость (сенсоры и СУО)",
  reliability: "Надёжность и зрелость",
  exportPotential: "Экспортный потенциал",
};

/**
 * Веса осей в интегральной оценке. Огневая мощь и защищённость —
 * ядро боевой ценности; осведомлённость — мультипликатор современных
 * систем; экспортный потенциал в интеграл боевой ценности не входит
 * напрямую и учитывается малым весом как признак зрелости программы.
 */
export const ASSESSMENT_WEIGHTS: Record<AssessmentAxis, number> = {
  firepower: 0.26,
  protection: 0.22,
  mobility: 0.14,
  awareness: 0.2,
  reliability: 0.13,
  exportPotential: 0.05,
};

/** Ключевые параметры ТТХ для парных сравнений внутри каждого класса. */
export const CLASS_KEY_PARAMETERS: Record<WeaponClassId, readonly string[]> = {
  mbt: ["weightT", "gunMm", "engineHp", "speedKmh", "armorMm", "produced"],
  ifv: ["weightT", "gunMm", "troops", "speedKmh", "armorMm", "produced"],
  artillery: ["caliberMm", "maxRangeKm", "rateOfFire", "weightT", "cepM", "produced"],
  fighter: ["maxSpeedMach", "combatRadiusKm", "ceilingM", "payloadKg", "radarRangeKm", "produced"],
  heli: ["mtowKg", "speedKmh", "combatRadiusKm", "payloadKg", "ceilingM", "produced"],
  uav: ["speedKmh", "enduranceH", "ceilingM", "payloadKg", "combatRadiusKm", "produced"],
  submarine: ["displacementT", "depthM", "speedSubKn", "torpedoTubes", "missileLaunchers", "produced"],
  ship: ["displacementT", "speedKn", "rangeNm", "vlsCells", "helicopters", "produced"],
  airdef: ["maxRangeKm", "maxAltKm", "simTargets", "channels", "radarRangeKm", "produced"],
  missile: ["maxRangeKm", "warheadKg", "speedMach", "cepM", "launchWeightKg", "produced"],
};

/** Параметры, у которых меньшее значение лучше (для сравнений и поиска). */
export const LOWER_IS_BETTER: ReadonlySet<string> = new Set<string>([
  "cepM",
  "weightT",
  "reactionSec",
  "deployMin",
]);

// ════════════════════════════════════════════════════════════════════
// Доступ к базе и поиск
// ════════════════════════════════════════════════════════════════════

/** Все системы базы (ссылка на неизменяемый массив). */
export function allSystems(): readonly WeaponSystemProfile[] {
  return WEAPON_SYSTEMS;
}

/** Системы одного класса в порядке следования в базе. */
export function systemsByClass(
  classId: WeaponClassId,
): readonly WeaponSystemProfile[] {
  return WEAPON_SYSTEMS.filter(
    (system: WeaponSystemProfile): boolean => system.classId === classId,
  );
}

/** Поиск системы по id; null, если такой системы нет. */
export function findSystem(id: string): WeaponSystemProfile | null {
  for (const system of WEAPON_SYSTEMS) {
    if (system.id === id) {
      return system;
    }
  }
  return null;
}

/** Поиск системы по id с исключением при отсутствии (для тестов и UI). */
export function requireSystem(id: string): WeaponSystemProfile {
  const found: WeaponSystemProfile | null = findSystem(id);
  if (found === null) {
    throw new Error(`Система не найдена в базе data4: ${id}`);
  }
  return found;
}

/** Запись ТТХ по ключу параметра; null, если параметр не применим. */
export function specEntry(
  system: WeaponSystemProfile,
  parameterKey: string,
): SpecValue | null {
  for (const spec of system.specs) {
    if (spec.parameterKey === parameterKey) {
      return spec;
    }
  }
  return null;
}

/** Числовое значение ТТХ по ключу; null, если параметра нет. */
export function specOf(
  system: WeaponSystemProfile,
  parameterKey: string,
): number | null {
  const entry: SpecValue | null = specEntry(system, parameterKey);
  return entry === null ? null : entry.value;
}

/** Запрос поиска по числовой характеристике. */
export interface SpecSearchQuery {
  /** Ограничение по классу; undefined — все классы. */
  readonly classId?: WeaponClassId;
  /** Ключ параметра ТТХ. */
  readonly parameterKey: string;
  /** Нижняя граница (включительно), если задана. */
  readonly minValue?: number;
  /** Верхняя граница (включительно), если задана. */
  readonly maxValue?: number;
}

/**
 * Поиск систем по диапазону числовой характеристики. Результат
 * отсортирован по значению параметра по убыванию (для параметров
 * «меньше — лучше» — по возрастанию).
 */
export function searchBySpec(
  query: SpecSearchQuery,
): readonly WeaponSystemProfile[] {
  const matched: WeaponSystemProfile[] = [];
  for (const system of WEAPON_SYSTEMS) {
    if (query.classId !== undefined && system.classId !== query.classId) {
      continue;
    }
    const value: number | null = specOf(system, query.parameterKey);
    if (value === null) {
      continue;
    }
    if (query.minValue !== undefined && value < query.minValue) {
      continue;
    }
    if (query.maxValue !== undefined && value > query.maxValue) {
      continue;
    }
    matched.push(system);
  }
  const ascending: boolean = LOWER_IS_BETTER.has(query.parameterKey);
  matched.sort(
    (a: WeaponSystemProfile, b: WeaponSystemProfile): number => {
      const va: number = specOf(a, query.parameterKey) ?? 0;
      const vb: number = specOf(b, query.parameterKey) ?? 0;
      return ascending ? va - vb : vb - va;
    },
  );
  return matched;
}

/** Системы с боевым опытом (хотя бы один эпизод), по убыванию числа эпизодов. */
export function combatProvenSystems(
  minEpisodes: number,
): readonly WeaponSystemProfile[] {
  return WEAPON_SYSTEMS.filter(
    (system: WeaponSystemProfile): boolean =>
      system.combatUse.length >= minEpisodes,
  )
    .slice()
    .sort(
      (a: WeaponSystemProfile, b: WeaponSystemProfile): number =>
        b.combatUse.length - a.combatUse.length,
    );
}

// ════════════════════════════════════════════════════════════════════
// Оценки, рейтинги и сравнения
// ════════════════════════════════════════════════════════════════════

/** Интегральная оценка системы (0–10) по взвешенным осям. */
export function overallScore(system: WeaponSystemProfile): number {
  let sum = 0;
  for (const axis of ASSESSMENT_AXES) {
    sum += system.assessment[axis] * ASSESSMENT_WEIGHTS[axis];
  }
  return Math.round(sum * 100) / 100;
}

/** Одна строка рейтинга. */
export interface RankedSystem {
  /** Позиция в рейтинге (с 1). */
  readonly rank: number;
  /** Система. */
  readonly system: WeaponSystemProfile;
  /** Значение критерия рейтинга. */
  readonly score: number;
}

/** Рейтинг систем класса по оси оценки или по интегральному баллу. */
export function classRanking(
  classId: WeaponClassId,
  criterion: AssessmentAxis | "overall",
): readonly RankedSystem[] {
  const sorted: WeaponSystemProfile[] = systemsByClass(classId)
    .slice()
    .sort(
      (a: WeaponSystemProfile, b: WeaponSystemProfile): number => {
        const va: number =
          criterion === "overall" ? overallScore(a) : a.assessment[criterion];
        const vb: number =
          criterion === "overall" ? overallScore(b) : b.assessment[criterion];
        return vb - va;
      },
    );
  return sorted.map(
    (system: WeaponSystemProfile, index: number): RankedSystem => ({
      rank: index + 1,
      system,
      score:
        criterion === "overall"
          ? overallScore(system)
          : system.assessment[criterion],
    }),
  );
}

/** Лидеры класса по числовой характеристике ТТХ. */
export function topBySpec(
  classId: WeaponClassId,
  parameterKey: string,
  limit: number,
): readonly RankedSystem[] {
  const found: readonly WeaponSystemProfile[] = searchBySpec({
    classId,
    parameterKey,
  });
  return found
    .slice(0, limit)
    .map(
      (system: WeaponSystemProfile, index: number): RankedSystem => ({
        rank: index + 1,
        system,
        score: specOf(system, parameterKey) ?? 0,
      }),
    );
}

/** Разница по одной оси оценки в парном сравнении. */
export interface AxisDelta {
  /** Ось оценки. */
  readonly axis: AssessmentAxis;
  /** Русское название оси. */
  readonly axisRu: string;
  /** Значение у системы A. */
  readonly valueA: number;
  /** Значение у системы B. */
  readonly valueB: number;
  /** Разница A − B. */
  readonly delta: number;
}

/** Сравнение одного параметра ТТХ в парном сравнении. */
export interface SpecComparison {
  /** Ключ параметра. */
  readonly parameterKey: string;
  /** Русское название параметра. */
  readonly labelRu: string;
  /** Единица измерения. */
  readonly unit: string;
  /** Значение у системы A (null — параметра нет). */
  readonly valueA: number | null;
  /** Значение у системы B (null — параметра нет). */
  readonly valueB: number | null;
  /** Кто лучше по параметру: "a", "b" или "tie". */
  readonly leader: "a" | "b" | "tie";
}

/** Результат парного сравнения двух систем. */
export interface SystemComparison {
  /** Система A. */
  readonly a: WeaponSystemProfile;
  /** Система B. */
  readonly b: WeaponSystemProfile;
  /** true, если обе системы одного класса (сравнение корректно по ТТХ). */
  readonly sameClass: boolean;
  /** Интегральный балл A. */
  readonly overallA: number;
  /** Интегральный балл B. */
  readonly overallB: number;
  /** Дельты по всем шести осям. */
  readonly axisDeltas: readonly AxisDelta[];
  /** Число осей, где A сильнее. */
  readonly axesWonByA: number;
  /** Число осей, где B сильнее. */
  readonly axesWonByB: number;
  /** Сравнение ключевых ТТХ (только для одного класса). */
  readonly specComparisons: readonly SpecComparison[];
  /** Итоговый текстовый вердикт. */
  readonly verdictRu: string;
}

/** Парное сравнение двух систем по id. */
export function compareSystems(
  idA: string,
  idB: string,
): SystemComparison | null {
  const a: WeaponSystemProfile | null = findSystem(idA);
  const b: WeaponSystemProfile | null = findSystem(idB);
  if (a === null || b === null) {
    return null;
  }
  const axisDeltas: AxisDelta[] = ASSESSMENT_AXES.map(
    (axis: AssessmentAxis): AxisDelta => ({
      axis,
      axisRu: ASSESSMENT_AXIS_RU[axis],
      valueA: a.assessment[axis],
      valueB: b.assessment[axis],
      delta: a.assessment[axis] - b.assessment[axis],
    }),
  );
  let wonA = 0;
  let wonB = 0;
  for (const delta of axisDeltas) {
    if (delta.delta > 0) {
      wonA += 1;
    } else if (delta.delta < 0) {
      wonB += 1;
    }
  }
  const specComparisons: SpecComparison[] = [];
  if (a.classId === b.classId) {
    for (const key of CLASS_KEY_PARAMETERS[a.classId]) {
      const entryA: SpecValue | null = specEntry(a, key);
      const entryB: SpecValue | null = specEntry(b, key);
      if (entryA === null && entryB === null) {
        continue;
      }
      let leader: "a" | "b" | "tie" = "tie";
      if (entryA !== null && entryB !== null) {
        if (entryA.value !== entryB.value) {
          const aBetter: boolean = LOWER_IS_BETTER.has(key)
            ? entryA.value < entryB.value
            : entryA.value > entryB.value;
          leader = aBetter ? "a" : "b";
        }
      }
      specComparisons.push({
        parameterKey: key,
        labelRu: entryA?.labelRu ?? entryB?.labelRu ?? key,
        unit: entryA?.unit ?? entryB?.unit ?? "",
        valueA: entryA === null ? null : entryA.value,
        valueB: entryB === null ? null : entryB.value,
        leader,
      });
    }
  }
  const overallA: number = overallScore(a);
  const overallB: number = overallScore(b);
  const verdictRu: string =
    overallA === overallB
      ? `Системы сопоставимы по интегральной оценке (${overallA}).`
      : overallA > overallB
        ? `${a.nameRu} опережает ${b.nameRu} по интегральной оценке (${overallA} против ${overallB}), выиграв ${wonA} из 6 осей.`
        : `${b.nameRu} опережает ${a.nameRu} по интегральной оценке (${overallB} против ${overallA}), выиграв ${wonB} из 6 осей.`;
  return {
    a,
    b,
    sameClass: a.classId === b.classId,
    overallA,
    overallB,
    axisDeltas,
    axesWonByA: wonA,
    axesWonByB: wonB,
    specComparisons,
    verdictRu,
  };
}

/** Результат упрощённой «дуэли» двух систем. */
export interface DuelResult {
  /** Система A. */
  readonly a: WeaponSystemProfile;
  /** Система B. */
  readonly b: WeaponSystemProfile;
  /** Дуэльный счёт A (0–100). */
  readonly scoreA: number;
  /** Дуэльный счёт B (0–100). */
  readonly scoreB: number;
  /** Текстовый вывод о преимуществе. */
  readonly edgeRu: string;
}

/**
 * Дуэльный счёт: интегральная оценка (70%) + «проверка боем» (15%,
 * до трёх эпизодов) + широта распространения (15%, до 15 операторов).
 * Эвристика для быстрых сопоставлений, а не модель боя.
 */
export function duelScore(idA: string, idB: string): DuelResult | null {
  const a: WeaponSystemProfile | null = findSystem(idA);
  const b: WeaponSystemProfile | null = findSystem(idB);
  if (a === null || b === null) {
    return null;
  }
  const duelOf = (system: WeaponSystemProfile): number => {
    const combatBonus: number = Math.min(system.combatUse.length, 3) / 3;
    const spreadBonus: number = Math.min(system.operators.length, 15) / 15;
    const raw: number =
      overallScore(system) * 7 + combatBonus * 15 + spreadBonus * 15;
    return Math.round(raw * 10) / 10;
  };
  const scoreA: number = duelOf(a);
  const scoreB: number = duelOf(b);
  const edgeRu: string =
    Math.abs(scoreA - scoreB) < 3
      ? "Преимущество в пределах погрешности эвристики: системы одного уровня."
      : scoreA > scoreB
        ? `${a.nameRu} имеет заметное преимущество по совокупности оценки, боевого опыта и распространённости.`
        : `${b.nameRu} имеет заметное преимущество по совокупности оценки, боевого опыта и распространённости.`;
  return { a, b, scoreA, scoreB, edgeRu };
}

// ════════════════════════════════════════════════════════════════════
// Поколение и технологический уровень
// ════════════════════════════════════════════════════════════════════

/** Классификация технологического уровня системы. */
export interface GenerationTier {
  /** Числовой уровень поколения (1–5), если удалось определить. */
  readonly tier: number | null;
  /** Модернизированная система существующей платформы. */
  readonly modernized: boolean;
  /** Текстовая характеристика уровня. */
  readonly labelRu: string;
}

/**
 * Эвристика поколения: извлекает порядковое поколение из текстового
 * поля generationRu («четвёртое», «пятое» и т.д.) и флаг глубокой
 * модернизации. Поколения между классами не сопоставимы напрямую:
 * «четвёртое поколение» ПЛ и истребителя — разные шкалы внутри
 * своих классов, что отражено в labelRu.
 */
export function generationTier(
  system: WeaponSystemProfile,
): GenerationTier {
  const text: string = system.generationRu.toLowerCase();
  let tier: number | null = null;
  if (text.includes("пят")) {
    tier = 5;
  } else if (text.includes("четв")) {
    tier = 4;
  } else if (text.includes("треть") || text.includes("треть") ) {
    tier = 3;
  } else if (text.includes("втор")) {
    tier = 2;
  } else if (text.includes("перв")) {
    tier = 1;
  }
  const modernized: boolean =
    text.includes("модернизир") || text.includes("модернизация");
  const labelRu: string =
    tier === null
      ? `Поколение не классифицировано по шкале класса (${system.classRu}); статус: ${system.statusRu}.`
      : `${tier}-е поколение по внутриклассовой шкале` +
        (modernized ? ", глубокая модернизация существующей платформы." : ".");
  return { tier, modernized, labelRu };
}

/** Системы класса не ниже заданного поколения. */
export function systemsOfGeneration(
  classId: WeaponClassId,
  minTier: number,
): readonly WeaponSystemProfile[] {
  return systemsByClass(classId).filter(
    (system: WeaponSystemProfile): boolean => {
      const tier: GenerationTier = generationTier(system);
      return tier.tier !== null && tier.tier >= minTier;
    },
  );
}

// ════════════════════════════════════════════════════════════════════
// Экспортный потенциал и распространение
// ════════════════════════════════════════════════════════════════════

/**
 * Индекс экспортного успеха: оценка экспортного потенциала,
 * взвешенная фактической широтой распространения (операторы).
 * Максимум шкалы — 10 при 20+ операторах.
 */
export function exportIndex(system: WeaponSystemProfile): number {
  const spread: number = Math.min(system.operators.length, 20) / 20;
  const raw: number =
    system.assessment.exportPotential * 0.7 +
    system.assessment.exportPotential * spread * 0.3 +
    spread * 2;
  return Math.round(Math.min(raw, 12) * 100) / 100;
}

/** Самые экспортно успешные системы базы (по индексу). */
export function exportLeaders(limit: number): readonly RankedSystem[] {
  return WEAPON_SYSTEMS.slice()
    .sort(
      (a: WeaponSystemProfile, b: WeaponSystemProfile): number =>
        exportIndex(b) - exportIndex(a),
    )
    .slice(0, limit)
    .map(
      (system: WeaponSystemProfile, index: number): RankedSystem => ({
        rank: index + 1,
        system,
        score: exportIndex(system),
      }),
    );
}

/** Системы с наибольшим числом стран-операторов. */
export function mostWidespread(limit: number): readonly RankedSystem[] {
  return WEAPON_SYSTEMS.slice()
    .sort(
      (a: WeaponSystemProfile, b: WeaponSystemProfile): number =>
        b.operators.length - a.operators.length,
    )
    .slice(0, limit)
    .map(
      (system: WeaponSystemProfile, index: number): RankedSystem => ({
        rank: index + 1,
        system,
        score: system.operators.length,
      }),
    );
}

/** Все страны-операторы системы (ISO-коды). */
export function operatorCountries(
  system: WeaponSystemProfile,
): readonly string[] {
  return system.operators.map(
    (operator: WeaponSystemProfile["operators"][number]): string =>
      operator.countryIso,
  );
}

/** Эксплуатируют ли две системы в одной стране (совместимость парков). */
export function sharedOperators(
  idA: string,
  idB: string,
): readonly string[] {
  const a: WeaponSystemProfile | null = findSystem(idA);
  const b: WeaponSystemProfile | null = findSystem(idB);
  if (a === null || b === null) {
    return [];
  }
  const inB: ReadonlySet<string> = new Set<string>(operatorCountries(b));
  return operatorCountries(a).filter((iso: string): boolean => inB.has(iso));
}

// ════════════════════════════════════════════════════════════════════
// Сводки по странам
// ════════════════════════════════════════════════════════════════════

/** Счётчик систем страны внутри одного класса. */
export interface ClassCount {
  /** Класс вооружения. */
  readonly classId: WeaponClassId;
  /** Русское название класса. */
  readonly classRu: string;
  /** Число систем. */
  readonly count: number;
  /** Id систем. */
  readonly systemIds: readonly string[];
}

/** Портфель страны-оператора по базе data4. */
export interface CountryPortfolio {
  /** ISO-код страны. */
  readonly countryIso: string;
  /** Русское название страны (из первой встречной записи). */
  readonly countryRu: string;
  /** Всего систем, эксплуатируемых страной. */
  readonly totalSystems: number;
  /** Разбивка по классам (только непустые классы). */
  readonly byClass: readonly ClassCount[];
  /** Средний интегральный балл парка. */
  readonly averageOverall: number;
  /** Число систем с боевым опытом. */
  readonly combatProvenCount: number;
  /** Пять систем с высшим интегральным баллом. */
  readonly topSystems: readonly WeaponSystemProfile[];
}

/** Сводка по стране-оператору; null, если страна не встречается в базе. */
export function countryPortfolio(
  countryIso: string,
): CountryPortfolio | null {
  const operated: WeaponSystemProfile[] = WEAPON_SYSTEMS.filter(
    (system: WeaponSystemProfile): boolean =>
      system.operators.some(
        (operator: WeaponSystemProfile["operators"][number]): boolean =>
          operator.countryIso === countryIso,
      ),
  );
  if (operated.length === 0) {
    return null;
  }
  let countryRu = countryIso;
  for (const system of operated) {
    for (const operator of system.operators) {
      if (operator.countryIso === countryIso) {
        countryRu = operator.countryRu;
        break;
      }
    }
    if (countryRu !== countryIso) {
      break;
    }
  }
  const classIds: readonly WeaponClassId[] = [
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
  const byClass: ClassCount[] = [];
  for (const classId of classIds) {
    const inClass: WeaponSystemProfile[] = operated.filter(
      (system: WeaponSystemProfile): boolean => system.classId === classId,
    );
    if (inClass.length > 0) {
      byClass.push({
        classId,
        classRu: inClass[0].classRu,
        count: inClass.length,
        systemIds: inClass.map(
          (system: WeaponSystemProfile): string => system.id,
        ),
      });
    }
  }
  const averageOverall: number =
    Math.round(
      (operated.reduce(
        (acc: number, system: WeaponSystemProfile): number =>
          acc + overallScore(system),
        0,
      ) /
        operated.length) *
        100,
    ) / 100;
  const topSystems: WeaponSystemProfile[] = operated
    .slice()
    .sort(
      (a: WeaponSystemProfile, b: WeaponSystemProfile): number =>
        overallScore(b) - overallScore(a),
    )
    .slice(0, 5);
  return {
    countryIso,
    countryRu,
    totalSystems: operated.length,
    byClass,
    averageOverall,
    combatProvenCount: operated.filter(
      (system: WeaponSystemProfile): boolean => system.combatUse.length > 0,
    ).length,
    topSystems,
  };
}

/** Строка лидерборда стран-операторов. */
export interface OperatorLeaderboardEntry {
  /** ISO-код страны. */
  readonly countryIso: string;
  /** Число различных систем в эксплуатации. */
  readonly systemsOperated: number;
  /** Число классов, покрытых парком страны. */
  readonly classesCovered: number;
}

/** Страны с самыми разнообразными парками вооружений по базе. */
export function operatorLeaderboard(
  limit: number,
): readonly OperatorLeaderboardEntry[] {
  const byCountry: Map<string, Set<string>> = new Map<string, Set<string>>();
  const classesByCountry: Map<string, Set<WeaponClassId>> = new Map<
    string,
    Set<WeaponClassId>
  >();
  for (const system of WEAPON_SYSTEMS) {
    for (const operator of system.operators) {
      let systems: Set<string> | undefined = byCountry.get(operator.countryIso);
      if (systems === undefined) {
        systems = new Set<string>();
        byCountry.set(operator.countryIso, systems);
      }
      systems.add(system.id);
      let classes: Set<WeaponClassId> | undefined = classesByCountry.get(
        operator.countryIso,
      );
      if (classes === undefined) {
        classes = new Set<WeaponClassId>();
        classesByCountry.set(operator.countryIso, classes);
      }
      classes.add(system.classId);
    }
  }
  const entries: OperatorLeaderboardEntry[] = [];
  for (const [iso, systems] of byCountry) {
    const classes: Set<WeaponClassId> | undefined = classesByCountry.get(iso);
    entries.push({
      countryIso: iso,
      systemsOperated: systems.size,
      classesCovered: classes === undefined ? 0 : classes.size,
    });
  }
  entries.sort(
    (a: OperatorLeaderboardEntry, b: OperatorLeaderboardEntry): number =>
      b.systemsOperated - a.systemsOperated,
  );
  return entries.slice(0, limit);
}

/** Системы, разработанные в заданной стране. */
export function systemsByDeveloper(
  developerIso: string,
): readonly WeaponSystemProfile[] {
  return WEAPON_SYSTEMS.filter(
    (system: WeaponSystemProfile): boolean =>
      system.developerIso === developerIso,
  );
}

// ════════════════════════════════════════════════════════════════════
// Статистика классов и базы
// ════════════════════════════════════════════════════════════════════

/** Статистика одного класса вооружений. */
export interface ClassStats {
  /** Класс. */
  readonly classId: WeaponClassId;
  /** Русское название класса. */
  readonly classRu: string;
  /** Число систем в классе. */
  readonly count: number;
  /** Средние значения по осям оценки. */
  readonly averageByAxis: Record<AssessmentAxis, number>;
  /** Медианный год принятия на вооружение. */
  readonly medianYear: number;
  /** Самая новая система класса. */
  readonly newest: WeaponSystemProfile;
  /** Самая возрастная система класса. */
  readonly oldest: WeaponSystemProfile;
  /** Лидер класса по интегральной оценке. */
  readonly leader: WeaponSystemProfile;
  /** Система с наибольшим числом операторов. */
  readonly mostWidespread: WeaponSystemProfile;
  /** Доля систем с боевым опытом (0–1). */
  readonly combatProvenShare: number;
}

/** Полная статистика класса. */
export function classStats(classId: WeaponClassId): ClassStats | null {
  const systems: readonly WeaponSystemProfile[] = systemsByClass(classId);
  if (systems.length === 0) {
    return null;
  }
  const averageByAxis = {} as Record<AssessmentAxis, number>;
  for (const axis of ASSESSMENT_AXES) {
    const mean: number =
      systems.reduce(
        (acc: number, system: WeaponSystemProfile): number =>
          acc + system.assessment[axis],
        0,
      ) / systems.length;
    averageByAxis[axis] = Math.round(mean * 100) / 100;
  }
  const years: number[] = systems
    .map((system: WeaponSystemProfile): number => system.yearEntered)
    .slice()
    .sort((a: number, b: number): number => a - b);
  const medianYear: number = years[Math.floor(years.length / 2)];
  const byOverall: WeaponSystemProfile[] = systems
    .slice()
    .sort(
      (a: WeaponSystemProfile, b: WeaponSystemProfile): number =>
        overallScore(b) - overallScore(a),
    );
  const byOperators: WeaponSystemProfile[] = systems
    .slice()
    .sort(
      (a: WeaponSystemProfile, b: WeaponSystemProfile): number =>
        b.operators.length - a.operators.length,
    );
  const byYear: WeaponSystemProfile[] = systems
    .slice()
    .sort(
      (a: WeaponSystemProfile, b: WeaponSystemProfile): number =>
        a.yearEntered - b.yearEntered,
    );
  return {
    classId,
    classRu: systems[0].classRu,
    count: systems.length,
    averageByAxis,
    medianYear,
    newest: byYear[byYear.length - 1],
    oldest: byYear[0],
    leader: byOverall[0],
    mostWidespread: byOperators[0],
    combatProvenShare:
      Math.round(
        (systems.filter(
          (system: WeaponSystemProfile): boolean =>
            system.combatUse.length > 0,
        ).length /
          systems.length) *
          100,
      ) / 100,
  };
}

/** Сводная статистика всей базы data4. */
export interface DatabaseStats {
  /** Всего систем. */
  readonly totalSystems: number;
  /** Покрыто классов. */
  readonly classesCovered: number;
  /** Уникальных стран-операторов. */
  readonly operatorCountries: number;
  /** Уникальных стран-разработчиков. */
  readonly developerCountries: number;
  /** Систем с боевым опытом. */
  readonly combatProvenSystems: number;
  /** Доля записей с оценочными (estimated) данными (0–1). */
  readonly estimatedShare: number;
  /** Суммарное число связей «система — оператор». */
  readonly operatorLinks: number;
  /** Суммарное число полей ТТХ в базе. */
  readonly specFieldCount: number;
}

/** Сводная статистика базы для витрин и отчётов. */
export function databaseStats(): DatabaseStats {
  const operators: Set<string> = new Set<string>();
  const developers: Set<string> = new Set<string>();
  const classes: Set<WeaponClassId> = new Set<WeaponClassId>();
  let operatorLinks = 0;
  let specFieldCount = 0;
  let combat = 0;
  let estimated = 0;
  for (const system of WEAPON_SYSTEMS) {
    classes.add(system.classId);
    developers.add(system.developerIso);
    operatorLinks += system.operators.length;
    specFieldCount += system.specs.length;
    if (system.combatUse.length > 0) {
      combat += 1;
    }
    if (system.provenance.estimated) {
      estimated += 1;
    }
    for (const operator of system.operators) {
      operators.add(operator.countryIso);
    }
  }
  return {
    totalSystems: WEAPON_SYSTEMS.length,
    classesCovered: classes.size,
    operatorCountries: operators.size,
    developerCountries: developers.size,
    combatProvenSystems: combat,
    estimatedShare:
      Math.round((estimated / WEAPON_SYSTEMS.length) * 100) / 100,
    operatorLinks,
    specFieldCount,
  };
}

/** Проверка справочника параметров: все ключи ключевых параметров существуют. */
export function keyParametersAreDefined(): boolean {
  const classIds: readonly WeaponClassId[] = [
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
  for (const classId of classIds) {
    const defined: ReadonlySet<string> = new Set<string>(
      SPEC_PARAMETER_DEFS[classId].map(
        (def: { readonly key: string }): string => def.key,
      ),
    );
    for (const key of CLASS_KEY_PARAMETERS[classId]) {
      if (!defined.has(key)) {
        return false;
      }
    }
  }
  return true;
}
