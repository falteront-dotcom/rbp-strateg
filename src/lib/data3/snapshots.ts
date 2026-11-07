// ─────────────────────────────────────────────────────────────────────────────
// Версионирование данных: снапшоты, реестр, диффы (Волна 4)
// Данные проекта — отдельный актив с собственной историей: снапшот
// фиксирует состав источников и охват на дату, дифф показывает, что
// изменилось между снапшотами, без пересборки кода.
// РБП-Стратег 3.0
// ─────────────────────────────────────────────────────────────────────────────
//
// ЗАЧЕМ.
// В винтаже 2.0 данные лежали generated-TS файлами внутри бандла и
// менялись молча вместе с кодом: нельзя было ответить «чем ряд марта
// отличается от ряда января» и нельзя было откатить данные отдельно
// от кода. Снапшот — это именованный, датируемый слепок: какие
// источники, каких лет, с каким охватом стран и объектов. Дифф
// снапшотов — основа мониторинга Волны 5 («что изменилось»).

import type { Data3SourceId } from "./verify-engine.js";

/** Статус снапшота в жизненном цикле данных проекта */
export type SnapshotStatus =
  | "frozen"
  | "current"
  | "planned"
  | "superseded";

/** Один источник в составе снапшота */
export interface SnapshotSourceEntry {
  /** Идентификатор источника */
  sourceId: Data3SourceId;
  /** Имя источника для отчётов */
  nameRu: string;
  /** Год данных этого источника в снапшоте */
  dataYear: number;
  /** Роль источника в снапшоте */
  roleRu: string;
}

/** Охват снапшота: сколько сущностей и полей он фиксирует */
export interface SnapshotCoverage {
  /** Стран в расчётной базе */
  countries: number;
  /** Стран с расширенными профилями (ВПК, запасы, БПЛА) */
  profiledCountries: number;
  /** Стратегических объектов в каталоге */
  facilities: number;
  /** Полей модели с провенансом до значения */
  provenanceFields: number;
}

/** Снапшот данных: именованный слепок состава источников и охвата */
export interface DataSnapshot {
  /** Стабильный идентификатор снапшота */
  id: string;
  /** Человекочитаемое имя */
  labelRu: string;
  /** Дата среза данных (ISO, день) */
  dataDate: string;
  /** Статус снапшота */
  status: SnapshotStatus;
  /** Состав источников среза */
  sources: SnapshotSourceEntry[];
  /** Охват среза */
  coverage: SnapshotCoverage;
  /** Описание среза и его ограничений */
  noteRu: string;
  /** Известные дефекты среза (честный журнал, не реклама) */
  knownIssuesRu: string[];
}

/** Дифф двух снапшотов: что изменилось в составе и охвате */
export interface SnapshotDiff {
  /** Идентификатор базового снапшота */
  fromId: string;
  /** Идентификатор нового снапшота */
  toId: string;
  /** Источники, добавленные в новом снапшоте */
  addedSources: SnapshotSourceEntry[];
  /** Источники, убранные из нового снапшота */
  removedSources: SnapshotSourceEntry[];
  /** Источники с изменившимся годом данных */
  yearChanges: Array<{
    /** Источник */
    sourceId: Data3SourceId;
    /** Год данных в базовом снапшоте */
    fromYear: number;
    /** Год данных в новом снапшоте */
    toYear: number;
  }>;
  /** Дельты охвата по метрикам */
  coverageDelta: Record<keyof SnapshotCoverage, number>;
  /** Человекочитаемая сводка диффа */
  summaryRu: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Реестр снапшотов проекта
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Снапшот винтажа 2.0: данные, с которыми проект жил до дорожной карты.
 * Заморожен как исторический базис для диффов: его дефекты зафиксированы
 * в knownIssuesRu и не переписываются задним числом.
 */
export const SNAPSHOT_2024: DataSnapshot = {
  id: "snapshot-2024-vintage",
  labelRu: "Винтаж 2.0 (данные 2024–2025, срез проекта до Волны 4)",
  dataDate: "2025-06-01",
  status: "superseded",
  sources: [
    {
      sourceId: "gfp",
      nameRu: "Global Firepower 2025",
      dataYear: 2025,
      roleRu: "Каркас полей техники и ресурсов; ручная кураторская выборка из рейтинга января 2025 года.",
    },
    {
      sourceId: "worldbank",
      nameRu: "Всемирный банк",
      dataYear: 2024,
      roleRu: "ВВП, население, инфраструктура; релиз июля 2024 года.",
    },
    {
      sourceId: "sipri",
      nameRu: "SIPRI",
      dataYear: 2024,
      roleRu: "Военные расходы и поставки; факт-лист апреля 2024 года по данным 2023–2024 годов.",
    },
    {
      sourceId: "fas",
      nameRu: "FAS Nuclear Notebook",
      dataYear: 2025,
      roleRu: "Ядерные арсеналы 9 держав, оценки начала 2025 года.",
    },
    {
      sourceId: "cia",
      nameRu: "CIA World Factbook",
      dataYear: 2025,
      roleRu: "География, инфраструктура, справочные поля.",
    },
    {
      sourceId: "custom",
      nameRu: "LLM-генерация агентов GLM",
      dataYear: 2025,
      roleRu: "Страны и 329 стратегических объектов сгенерированы LLM-агентами без построчного провенанса.",
    },
  ],
  coverage: {
    countries: 195,
    profiledCountries: 30,
    facilities: 329,
    provenanceFields: 0,
  },
  noteRu:
    "Исторический базис. Расхождение охвата (263 в описании репозитория / 195 в БД / 59 в seed) — дефект этого винтажа, зафиксированный критическим анализом 3.0.",
  knownIssuesRu: [
    "LLM-сгенерированные данные без провенанса до значения и без верификационного контура.",
    "Дубль Австралии в GFP-выборке пайплайна (rank 17 и rank 29, идентичные значения).",
    "Бюджет США в бенчмарках — $886 млрд (2024), ряд SIPRI-2025 отсутствует.",
    "Союзники НАТО при свежем прогоне пайплайна молча понижались до NEUTRAL (баг merge-validate).",
    "Данные менялись вместе с кодом: отдельных снапшотов и диффов не существовало.",
  ],
};

/**
 * Снапшот Волн 0–3: модель БП 3.0 и разведывательный инструментарий
 * поверх винтажных данных. Данные ещё не обновлены на SIPRI-2025 —
 * это делает Волна 4; снапшот фиксирует промежуточное состояние.
 */
export const SNAPSHOT_2025: DataSnapshot = {
  id: "snapshot-2025-waves0-3",
  labelRu: "Волны 0–3 (модель 3.0, провенанс, устойчивость в войне)",
  dataDate: "2026-11-07",
  status: "superseded",
  sources: [
    {
      sourceId: "gfp",
      nameRu: "Global Firepower 2025 (после дедупликации)",
      dataYear: 2025,
      roleRu: "Каркас полей техники; дубли устранены в Волне 0, выборка — 133 записи пайплайна.",
    },
    {
      sourceId: "worldbank",
      nameRu: "Всемирный банк",
      dataYear: 2024,
      roleRu: "Макроэкономические ряды без изменений относительно винтажа.",
    },
    {
      sourceId: "sipri",
      nameRu: "SIPRI",
      dataYear: 2024,
      roleRu: "Расходы и поставки; обновление на релиз 2025 года запланировано Волной 4.",
    },
    {
      sourceId: "fas",
      nameRu: "FAS Nuclear Notebook",
      dataYear: 2025,
      roleRu: "Ядерные арсеналы; провенанс до значения введён реестром intel/provenance.",
    },
    {
      sourceId: "iiss",
      nameRu: "IISS Military Balance",
      dataYear: 2025,
      roleRu: "Состав ВС как источник по умолчанию для полей численности и техники в реестре провенанса.",
    },
    {
      sourceId: "csis",
      nameRu: "CSIS",
      dataYear: 2025,
      roleRu: "Оценки запасов ракет и боеприпасов для слоя устойчивости (Волна 3).",
    },
    {
      sourceId: "rusi",
      nameRu: "RUSI",
      dataYear: 2025,
      roleRu: "Полевые оценки расхода и производства по войне в Украине для endurance-модели.",
    },
    {
      sourceId: "custom",
      nameRu: "Экспертные рубрики проекта",
      dataYear: 2025,
      roleRu: "Субъективные шкалы C4ISR/РЭБ/мораль переведены на анкерные рубрики Волны 1; LLM-значения помечены методом llm-generated.",
    },
  ],
  coverage: {
    countries: 195,
    profiledCountries: 30,
    facilities: 788,
    provenanceFields: 71,
  },
  noteRu:
    "Каталог объектов фактически вырос до 788 записей generated-файла (в планах винтажа значилось 329): расхождение планов и файла зафиксировано, сверка каталога — часть Волны 4.",
  knownIssuesRu: [
    "Ряды военных расходов всё ещё винтажа SIPRI-2024: SIPRI-2025 (апрель 2026) не подтянут.",
    "Расширенные профили есть только у топ-30 стран; остальные 165 — базовые поля.",
    "Верификационный контур ±20% существует как требование методологии, но не как работающий код.",
  ],
};

/**
 * Плановый снапшот Волны 4: данные 2026 года.
 * Статус planned до завершения верификации всех рядов; после прогона
 * verify_data3 статус переводится в current, а snapshot-2025 — в frozen.
 */
export const SNAPSHOT_2026_PLAN: DataSnapshot = {
  id: "snapshot-2026-wave4-plan",
  labelRu: "Волна 4 (данные 2026: SIPRI-2025, верификация, расширение)",
  dataDate: "2026-11-07",
  status: "planned",
  sources: [
    {
      sourceId: "sipri",
      nameRu: "SIPRI Military Expenditure Database",
      dataYear: 2025,
      roleRu: "Военные расходы 2025 года: факт-лист апреля 2026, мировой итог $2 887 млрд; ряд sipri-2025 в модуле data3.",
    },
    {
      sourceId: "iiss",
      nameRu: "IISS Military Balance 2026",
      dataYear: 2026,
      roleRu: "Состав ВС и техника для сверки кросс-чека верификационного контура.",
    },
    {
      sourceId: "fas",
      nameRu: "FAS Nuclear Notebook",
      dataYear: 2026,
      roleRu: "Обновлённые оценки арсеналов 2026 года для ядерного слоя.",
    },
    {
      sourceId: "worldbank",
      nameRu: "Всемирный банк",
      dataYear: 2025,
      roleRu: "Ревизии макроэкономических рядов 2025 года.",
    },
    {
      sourceId: "cia",
      nameRu: "CIA World Factbook",
      dataYear: 2026,
      roleRu: "География и инфраструктура текущего среза.",
    },
    {
      sourceId: "un",
      nameRu: "ООН (демография)",
      dataYear: 2025,
      roleRu: "Возрастные когорты для мобилизационных расчётов.",
    },
    {
      sourceId: "osint",
      nameRu: "OSINT-сверка каталога объектов",
      dataYear: 2026,
      roleRu: "Координатная спот-проверка и расширение каталога объектов (+400) по открытым источникам.",
    },
    {
      sourceId: "industry-press",
      nameRu: "Отраслевая пресса и отчётность ВПК",
      dataYear: 2026,
      roleRu: "Производство, запасы и БПЛА для расширенных профилей 60 стран: только с флагом estimated.",
    },
  ],
  coverage: {
    countries: 195,
    profiledCountries: 90,
    facilities: 1188,
    provenanceFields: 71,
  },
  noteRu:
    "Целевой охват: профили 30 + 60 = 90 стран; объекты 788 + 400 = 1 188 (плановая веха роадмапа — 1 200). Все новые значения проходят верификационный контур data3.",
  knownIssuesRu: [
    "Часть значений SIPRI-2025 ниже топ-5 восстановлена по открытым пересказам факт-листа и помечена estimated до построчной сверки с базой.",
    "IISS Military Balance 2026 — платный источник: кросс-чек по нему ограничен полями, доступными в открытых публикациях института.",
  ],
};

/** Реестр снапшотов проекта в хронологическом порядке */
export const SNAPSHOT_REGISTRY: DataSnapshot[] = [
  SNAPSHOT_2024,
  SNAPSHOT_2025,
  SNAPSHOT_2026_PLAN,
];

// ─────────────────────────────────────────────────────────────────────────────
// Функции реестра и диффов
// ─────────────────────────────────────────────────────────────────────────────

/** Снапшот по идентификатору. */
export function snapshotById(id: string): DataSnapshot | undefined {
  return SNAPSHOT_REGISTRY.find((snapshot) => snapshot.id === id);
}

/** Последний по дате среза снапшот реестра. */
export function latestSnapshot(): DataSnapshot {
  let latest = SNAPSHOT_REGISTRY[0];
  for (const snapshot of SNAPSHOT_REGISTRY) {
    if (snapshot.dataDate > latest.dataDate) {
      latest = snapshot;
    }
  }
  return latest;
}

/** Источник снапшота по идентификатору источника. */
export function snapshotSource(
  snapshot: DataSnapshot,
  sourceId: Data3SourceId,
): SnapshotSourceEntry | undefined {
  return snapshot.sources.find((source) => source.sourceId === sourceId);
}

/**
 * Дифф двух снапшотов: состав источников и охват.
 * Сравнение идёт по sourceId; смена года данных одного источника —
 * yearChanges, а не «убрали + добавили».
 */
export function diffSnapshots(from: DataSnapshot, to: DataSnapshot): SnapshotDiff {
  const fromIds = new Set(from.sources.map((s) => s.sourceId));
  const toIds = new Set(to.sources.map((s) => s.sourceId));
  const addedSources = to.sources.filter((s) => !fromIds.has(s.sourceId));
  const removedSources = from.sources.filter((s) => !toIds.has(s.sourceId));
  const yearChanges: SnapshotDiff["yearChanges"] = [];
  for (const toSource of to.sources) {
    const fromSource = snapshotSource(from, toSource.sourceId);
    if (fromSource && fromSource.dataYear !== toSource.dataYear) {
      yearChanges.push({
        sourceId: toSource.sourceId,
        fromYear: fromSource.dataYear,
        toYear: toSource.dataYear,
      });
    }
  }
  const coverageDelta: Record<keyof SnapshotCoverage, number> = {
    countries: to.coverage.countries - from.coverage.countries,
    profiledCountries: to.coverage.profiledCountries - from.coverage.profiledCountries,
    facilities: to.coverage.facilities - from.coverage.facilities,
    provenanceFields: to.coverage.provenanceFields - from.coverage.provenanceFields,
  };
  const summaryRu = formatSnapshotDiffRu({
    from,
    to,
    addedCount: addedSources.length,
    removedCount: removedSources.length,
    yearChanges,
    coverageDelta,
  });
  return {
    fromId: from.id,
    toId: to.id,
    addedSources,
    removedSources,
    yearChanges,
    coverageDelta,
    summaryRu,
  };
}

/** Человекочитаемая сводка диффа снапшотов. */
export function formatSnapshotDiffRu(input: {
  from: DataSnapshot;
  to: DataSnapshot;
  addedCount: number;
  removedCount: number;
  yearChanges: SnapshotDiff["yearChanges"];
  coverageDelta: Record<keyof SnapshotCoverage, number>;
}): string {
  const yearPart =
    input.yearChanges.length > 0
      ? input.yearChanges
          .map((change) => `${change.sourceId}: ${change.fromYear} → ${change.toYear}`)
          .join("; ")
      : "годы данных источников не менялись";
  const delta = input.coverageDelta;
  return (
    `${input.from.id} → ${input.to.id}: добавлено источников ${input.addedCount}, ` +
    `убрано ${input.removedCount}; обновлены годы (${yearPart}); охват: ` +
    `страны ${delta.countries >= 0 ? "+" : ""}${delta.countries}, ` +
    `профили ${delta.profiledCountries >= 0 ? "+" : ""}${delta.profiledCountries}, ` +
    `объекты ${delta.facilities >= 0 ? "+" : ""}${delta.facilities}, ` +
    `поля с провенансом ${delta.provenanceFields >= 0 ? "+" : ""}${delta.provenanceFields}.`
  );
}

/** Все парные диффы соседних снапшотов реестра (история изменений данных). */
export function registryDiffChain(): SnapshotDiff[] {
  const diffs: SnapshotDiff[] = [];
  for (let i = 1; i < SNAPSHOT_REGISTRY.length; i += 1) {
    diffs.push(diffSnapshots(SNAPSHOT_REGISTRY[i - 1], SNAPSHOT_REGISTRY[i]));
  }
  return diffs;
}

/** Правила версионирования данных — публичная формулировка. */
export const SNAPSHOT_RULES_RU: string[] = [
  "Данные версионируются отдельно от кода: снапшот можно откатить, не откатывая приложение.",
  "Снапшот неизменяем после заморозки: исправления оформляются новым снапшотом, а не правкой старого.",
  "Известные дефекты снапшота фиксируются в нём самом и не замалчиваются при переходе на следующий.",
  "Дифф снапшотов — обязательное приложение к любому обновлению рядов: что изменилось, видно до публикации.",
];
