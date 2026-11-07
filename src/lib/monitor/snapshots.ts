// ─────────────────────────────────────────────────────────────────────────────
// Временные ряды и снапшоты показателей страны
// Версионирование данных БП: состояние страны на год → диффы между годами
// РБП-Стратег 3.0 · Волна 5 «Мониторинг и аналитический продукт» (ROADMAP-3.0)
// ─────────────────────────────────────────────────────────────────────────────
//
// Зачем снапшоты, а не «текущие значения»:
// — рейтинг без истории не отвечает на главный вопрос мониторинга:
//   «что изменилось и насколько быстро»;
// — снапшот фиксирует не только число, но и его провенанс: источник, год
//   публикации и признак оценочности. Дельта между снапшотами разных
//   источников — не изменение мира, а артефакт методологии, и потребитель
//   обязан это видеть;
// — снапшоты неизменяемы: исправление данных — это новый снапшот с пометкой
//   ревизии, а не перезапись истории (иначе диффы теряют смысл).

/** Компоненты БП 3.0, отслеживаемые мониторингом (баллы 0–100). */
export type BpComponentKey =
  | "weapon"
  | "manpower"
  | "logistics"
  | "c2"
  | "economy"
  | "doctrine"
  | "readiness"
  | "terrain";

/** Человекочитаемые названия компонентов. */
export const BP_COMPONENT_LABELS_RU: Record<BpComponentKey, string> = {
  weapon: "Оружие",
  manpower: "Люди",
  logistics: "Логистика",
  c2: "Управление (C2)",
  economy: "Экономика",
  doctrine: "Доктрина",
  readiness: "Боеготовность",
  terrain: "География",
};

/** Все ключи компонентов в каноническом порядке модели. */
export const BP_COMPONENT_KEYS: BpComponentKey[] = [
  "weapon",
  "manpower",
  "logistics",
  "c2",
  "economy",
  "doctrine",
  "readiness",
  "terrain",
];

/**
 * Число с провенансом. Мониторинг не хранит «голых» чисел: каждое значение
 * обязано знать, откуда оно взялось и насколько оно оценочно.
 */
export interface ProvenancedValue {
  /** Само значение. */
  value: number;
  /** Источник: издание/база и, где уместно, выпуск. */
  source: string;
  /** Год данных источника (не год снапшота). */
  sourceYear: number;
  /** true — значение оценочное/расчётное, а не опубликованная статистика. */
  estimated: boolean;
}

/** Одна производственная линия страны (годовой выпуск). */
export interface ProductionLine {
  /** Вид продукции: снаряды, танки, БМП, самолёты, вертолёты, корабли, ракеты, БПЛА. */
  kind: ProductionKind;
  /** Годовой выпуск в единицах вида (для снарядов — тысяч штук). */
  annualUnits: ProvenancedValue;
  /** Пояснение: мощности, ограничения, динамика внутри года. */
  noteRu: string;
}

/** Виды военной продукции, отслеживаемые мониторингом производства. */
export type ProductionKind =
  | "shells_155"
  | "tanks"
  | "ifv"
  | "aircraft"
  | "helicopters"
  | "ships"
  | "missiles"
  | "uav";

/** Подписи видов продукции. */
export const PRODUCTION_KIND_LABELS_RU: Record<ProductionKind, string> = {
  shells_155: "Снаряды 155/152 мм (тыс./год)",
  tanks: "Танки (шт./год)",
  ifv: "БМП/БТР (шт./год)",
  aircraft: "Боевые самолёты (шт./год)",
  helicopters: "Вертолёты (шт./год)",
  ships: "Боевые корабли (шт./год)",
  missiles: "Ракеты оперативно-тактические и крылатые (шт./год)",
  uav: "БПЛА ударные и барражирующие (тыс./год)",
};

/** Все виды продукции в каноническом порядке. */
export const PRODUCTION_KINDS: ProductionKind[] = [
  "shells_155",
  "tanks",
  "ifv",
  "aircraft",
  "helicopters",
  "ships",
  "missiles",
  "uav",
];

/**
 * Снапшот страны на календарный год: входы модели БП и наблюдаемые
 * физические показатели, по которым считаются дельты.
 */
export interface CountrySnapshot {
  /** ISO 3166-1 alpha-3. */
  iso3: string;
  /** Название страны по-русски. */
  nameRu: string;
  /** Регион для агрегации дельт (см. REGION_LABELS_RU). */
  region: RegionKey;
  /** Календарный год снапшота. */
  year: number;
  /** Баллы компонентов БП 0–100 на этот год. */
  components: Record<BpComponentKey, number>;
  /** Итоговый БП (взвешенная сумма компонентов) 0–100. */
  bpTotal: number;
  /** Военный бюджет, млрд долл. США в текущих ценах. */
  budgetBnUsd: ProvenancedValue;
  /** Доля военных расходов в ВВП, %. */
  defenseShareGdpPct: ProvenancedValue;
  /** Активный личный состав, человек. */
  activePersonnel: ProvenancedValue;
  /** Резерв, человек. */
  reservePersonnel: ProvenancedValue;
  /** Выносливость: месяцы интенсивной войны до исчерпания ключевых запасов. */
  enduranceMonths: ProvenancedValue;
  /** Производственные линии года (может быть пустым — данных нет). */
  production: ProductionLine[];
  /** Свободная аналитическая пометка о годе: что определяло динамику. */
  noteRu: string;
}

/** Регионы агрегации мониторинга. */
export type RegionKey =
  | "north_america"
  | "europe_nato"
  | "europe_east"
  | "middle_east"
  | "asia_pacific"
  | "south_asia"
  | "latin_america";

/** Подписи регионов. */
export const REGION_LABELS_RU: Record<RegionKey, string> = {
  north_america: "Северная Америка",
  europe_nato: "Европа (НАТО и союзники)",
  europe_east: "Восточная Европа и Евразия",
  middle_east: "Ближний Восток",
  asia_pacific: "Азиатско-Тихоокеанский регион",
  south_asia: "Южная Азия",
  latin_america: "Латинская Америка",
};

// ─────────────────────────────────────────────────────────────────────────────
// Реестр снапшотов
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Реестр снапшотов в памяти процесса. Снапшоты добавляются пакетами
 * (исторические ряды, ревизии), поиск — по стране и году.
 */
export class SnapshotRegistry {
  private readonly byCountry: Map<string, CountrySnapshot[]> = new Map();

  /** Добавить снапшот; дубликат (страна+год) заменяется ревизией. */
  add(snapshot: CountrySnapshot): void {
    const list = this.byCountry.get(snapshot.iso3) ?? [];
    const existing = list.findIndex((s) => s.year === snapshot.year);
    if (existing >= 0) {
      list[existing] = snapshot;
    } else {
      list.push(snapshot);
    }
    list.sort((a, b) => a.year - b.year);
    this.byCountry.set(snapshot.iso3, list);
  }

  /** Добавить пакет снапшотов. */
  addMany(snapshots: CountrySnapshot[]): void {
    for (const snapshot of snapshots) {
      this.add(snapshot);
    }
  }

  /** Ряд страны по возрастанию года (пустой массив, если страны нет). */
  series(iso3: string): CountrySnapshot[] {
    return [...(this.byCountry.get(iso3) ?? [])];
  }

  /** Снапшот страны за конкретный год или null. */
  at(iso3: string, year: number): CountrySnapshot | null {
    return this.series(iso3).find((s) => s.year === year) ?? null;
  }

  /** Все страны реестра (ISO3). */
  countries(): string[] {
    return [...this.byCountry.keys()].sort();
  }

  /** Все снапшоты указанного года по всем странам. */
  yearSlice(year: number): CountrySnapshot[] {
    const out: CountrySnapshot[] = [];
    for (const list of this.byCountry.values()) {
      for (const snapshot of list) {
        if (snapshot.year === year) {
          out.push(snapshot);
        }
      }
    }
    return out.sort((a, b) => a.iso3.localeCompare(b.iso3));
  }

  /** Снапшоты региона за год. */
  regionSlice(region: RegionKey, year: number): CountrySnapshot[] {
    return this.yearSlice(year).filter((s) => s.region === region);
  }

  /** Доступные годы реестра. */
  years(): number[] {
    const set = new Set<number>();
    for (const list of this.byCountry.values()) {
      for (const snapshot of list) {
        set.add(snapshot.year);
      }
    }
    return [...set].sort((a, b) => a - b);
  }

  /** Общее число снапшотов. */
  size(): number {
    let total = 0;
    for (const list of this.byCountry.values()) {
      total += list.length;
    }
    return total;
  }
}

/** Суммарный годовой выпуск по виду продукции из снапшота (0, если линии нет). */
export function productionTotal(
  snapshot: CountrySnapshot,
  kind: ProductionKind,
): number {
  const line = snapshot.production.find((p) => p.kind === kind);
  return line ? line.annualUnits.value : 0;
}

/** Есть ли у снапшота производственная линия указанного вида. */
export function hasProduction(
  snapshot: CountrySnapshot,
  kind: ProductionKind,
): boolean {
  return snapshot.production.some((p) => p.kind === kind);
}

/** Короткое описание снапшота одной строкой для логов и дайджестов. */
export function describeSnapshot(snapshot: CountrySnapshot): string {
  const productionKinds = snapshot.production
    .map((line) => line.kind)
    .join(", ");
  return (
    `${snapshot.nameRu} (${snapshot.iso3}), ${snapshot.year}: ` +
    `БП ${snapshot.bpTotal.toFixed(1)}, ` +
    `бюджет ${snapshot.budgetBnUsd.value.toFixed(1)} млрд $, ` +
    `личный состав ${snapshot.activePersonnel.value}, ` +
    `выносливость ${snapshot.enduranceMonths.value.toFixed(1)} мес., ` +
    `производство: ${productionKinds || "нет данных"}`
  );
}

/** Проверка полноты снапшота: все компоненты в диапазоне 0–100, год sane. */
export function validateSnapshot(snapshot: CountrySnapshot): string[] {
  const problems: string[] = [];
  for (const key of BP_COMPONENT_KEYS) {
    const value = snapshot.components[key];
    if (!(value >= 0 && value <= 100)) {
      problems.push(`Компонент ${key} вне диапазона 0–100: ${value}`);
    }
  }
  if (snapshot.bpTotal < 0 || snapshot.bpTotal > 100) {
    problems.push(`Итоговый БП вне диапазона 0–100: ${snapshot.bpTotal}`);
  }
  if (snapshot.year < 1990 || snapshot.year > 2100) {
    problems.push(`Подозрительный год снапшота: ${snapshot.year}`);
  }
  if (snapshot.budgetBnUsd.value < 0) {
    problems.push("Отрицательный бюджет");
  }
  if (snapshot.activePersonnel.value < 0) {
    problems.push("Отрицательная численность личного состава");
  }
  for (const line of snapshot.production) {
    if (line.annualUnits.value < 0) {
      problems.push(`Отрицательный выпуск: ${line.kind}`);
    }
  }
  return problems;
}

/** Удобный конструктор оценочного значения с провенансом. */
export function estimatedValue(
  value: number,
  source: string,
  sourceYear: number,
): ProvenancedValue {
  return {
    value: value,
    source: source,
    sourceYear: sourceYear,
    estimated: true,
  };
}

/** Удобный конструктор опубликованного (не оценочного) значения. */
export function reportedValue(
  value: number,
  source: string,
  sourceYear: number,
): ProvenancedValue {
  return {
    value: value,
    source: source,
    sourceYear: sourceYear,
    estimated: false,
  };
}
