// ─────────────────────────────────────────────────────────────────────────────
// Правила алертов мониторинга: пороги, движок оценки, уровни и объяснения
// РБП-Стратег 3.0 · Волна 5 «Мониторинг и аналитический продукт» (ROADMAP-3.0)
// ─────────────────────────────────────────────────────────────────────────────
//
// Алерт — не «красная лампочка», а гипотеза для аналитика: каждое правило
// обязано объяснить, что сработало, на каких числах и что проверить дальше.
// Пороги подобраны выше шума открытых данных: годовые ряды SIPRI/IISS
// пересматриваются задним числом на единицы процентов, поэтому алерты
// на изменения <5% мониторинг не поднимает принципиально.

import {
  compareSnapshots,
  seriesDeltas,
  type MetricDelta,
} from "./delta";
import {
  productionTotal,
  type CountrySnapshot,
  type ProductionKind,
} from "./snapshots";

/** Уровень алерта. */
export type AlertLevel = "watch" | "warning" | "critical";

/** Подписи уровней алерта. */
export const ALERT_LEVEL_LABELS_RU: Record<AlertLevel, string> = {
  watch: "Наблюдение",
  warning: "Предупреждение",
  critical: "Критический",
};

/** Числовой ранг уровня для сортировки. */
export const ALERT_LEVEL_RANK: Record<AlertLevel, number> = {
  watch: 1,
  warning: 2,
  critical: 3,
};

/** Сработавший алерт. */
export interface Alert {
  /** Идентификатор правила. */
  ruleId: string;
  /** Страна. */
  iso3: string;
  /** Название страны. */
  nameRu: string;
  /** Уровень. */
  level: AlertLevel;
  /** Заголовок одной строкой. */
  titleRu: string;
  /** Объяснение: числа, порог, контекст. */
  explanationRu: string;
  /** Что проверить аналитику дальше (следующий шаг сбора/проверки). */
  followUpRu: string;
  /** Дельта, породившая алерт (для алертов по снапшоту — null). */
  delta: MetricDelta | null;
  /** Период, к которому относится алерт. */
  fromYear: number;
  toYear: number;
}

/** Правило, оцениваемое по дельте одной метрики. */
export interface DeltaAlertRule {
  /** Идентификатор правила. */
  id: string;
  /** Название. */
  nameRu: string;
  /** Описание порога и его смысла. */
  descriptionRu: string;
  /** Метрика правила (или префикс семейства метрик). */
  metric: string;
  /** Минимальный уровень при срабатывании. */
  baseLevel: AlertLevel;
  /** Проверка дельты: true — правило сработало. */
  test: (delta: MetricDelta) => boolean;
  /** Уровень по конкретной дельте (может повышать baseLevel). */
  levelFor: (delta: MetricDelta) => AlertLevel;
  /** Заголовок алерта. */
  titleFor: (delta: MetricDelta) => string;
  /** Объяснение алерта. */
  explanationFor: (delta: MetricDelta) => string;
  /** Следующий шаг аналитика. */
  followUpRu: string;
}

/** Правило, оцениваемое по абсолютному состоянию снапшота (не по дельте). */
export interface SnapshotAlertRule {
  id: string;
  nameRu: string;
  descriptionRu: string;
  baseLevel: AlertLevel;
  test: (snapshot: CountrySnapshot) => boolean;
  titleFor: (snapshot: CountrySnapshot) => string;
  explanationFor: (snapshot: CountrySnapshot) => string;
  followUpRu: string;
}

function rel(delta: MetricDelta): number {
  return delta.relativePct === null ? 0 : delta.relativePct;
}

// ─────────────────────────────────────────────────────────────────────────────
// Каталог правил по дельтам
// ─────────────────────────────────────────────────────────────────────────────

export const DELTA_ALERT_RULES: DeltaAlertRule[] = [
  {
    id: "budget-surge",
    nameRu: "Резкий рост военного бюджета",
    descriptionRu:
      "Рост бюджета более чем на 10% за год: выше инфляции и обычного планового роста, обычно означает новую программу перевооружения или подготовку к войне.",
    metric: "budgetBnUsd",
    baseLevel: "warning",
    test: (d) => d.metric === "budgetBnUsd" && rel(d) > 10,
    levelFor: (d) => (rel(d) > 25 ? "critical" : "warning"),
    titleFor: (d) =>
      `${d.nameRu}: военный бюджет вырос на ${rel(d).toFixed(1)}% за год`,
    explanationFor: (d) =>
      `Бюджет ${d.fromYear} → ${d.toYear}: ${d.fromValue.toFixed(1)} → ${d.toValue.toFixed(1)} млрд $. ` +
      "Порог 10%/год выбран выше пересмотров SIPRI задним числом: такое изменение — не статистический шум.",
    followUpRu:
      "Найти программную разбивку прироста: какая статья (закупки, НИОКР, содержание) выросла; сверить с принятыми законами о бюджете, а не только с оценкой SIPRI.",
  },
  {
    id: "budget-collapse",
    nameRu: "Обвал военного бюджета",
    descriptionRu:
      "Падение бюджета более чем на 15% за год: экономический кризис, смена приоритетов или свёртывание программы.",
    metric: "budgetBnUsd",
    baseLevel: "warning",
    test: (d) => d.metric === "budgetBnUsd" && rel(d) < -15,
    levelFor: (d) => (rel(d) < -30 ? "critical" : "warning"),
    titleFor: (d) =>
      `${d.nameRu}: военный бюджет упал на ${Math.abs(rel(d)).toFixed(1)}% за год`,
    explanationFor: (d) =>
      `Бюджет ${d.fromYear} → ${d.toYear}: ${d.fromValue.toFixed(1)} → ${d.toValue.toFixed(1)} млрд $. ` +
      "Проверьте валютный эффект: падение в долларах при стабильном бюджете в национальной валюте — артефакт курса, а не политики.",
    followUpRu:
      "Пересчитать в национальной валюте и в % ВВП; только если падение подтверждается в обеих метриках — трактовать как смену приоритетов.",
  },
  {
    id: "budget-share-jump",
    nameRu: "Скачок военной нагрузки на экономику",
    descriptionRu:
      "Доля военных расходов в ВВП выросла на 1 п.п. и более за год: признак милитаризации экономики или военного времени.",
    metric: "defenseShareGdpPct",
    baseLevel: "warning",
    test: (d) => d.metric === "defenseShareGdpPct" && d.absolute >= 1,
    levelFor: (d) => (d.absolute >= 2 ? "critical" : "warning"),
    titleFor: (d) =>
      `${d.nameRu}: доля военных расходов в ВВП +${d.absolute.toFixed(1)} п.п.`,
    explanationFor: (d) =>
      `Доля ${d.fromYear} → ${d.toYear}: ${d.fromValue.toFixed(1)}% → ${d.toValue.toFixed(1)}% ВВП. ` +
      "Для мирной экономики рост на 1 п.п. за год — экстраординарное событие; для воюющей страны — ожидаемая траектория.",
    followUpRu:
      "Сопоставить с мобилизационными мерами и дефицитом бюджета: рост доли при падающем ВВП и рост при растущем — разные режимы.",
  },
  {
    id: "production-doubling",
    nameRu: "Удвоение производства",
    descriptionRu:
      "Годовой выпуск вида продукции вырос вдвое и более: перевод промышленности на военные рельсы или ввод новых мощностей.",
    metric: "production:",
    baseLevel: "critical",
    test: (d) =>
      d.metric.startsWith("production:") &&
      d.fromValue > 0 &&
      d.toValue >= d.fromValue * 2,
    levelFor: () => "critical",
    titleFor: (d) =>
      `${d.nameRu}: производство (${d.metric.slice("production:".length)}) выросло вдвое и более`,
    explanationFor: (d) =>
      `Выпуск ${d.fromYear} → ${d.toYear}: ${d.fromValue} → ${d.toValue}. ` +
      "Удвоение за год физически невозможно без заблаговременной подготовки мощностей: ищите решение о расширении за 12–24 месяца до факта.",
    followUpRu:
      "Проверить устойчивость: это разовый ввод мощности или новый темп; оценить узкие места (станки, взрывчатка, электроника) по смежным линиям.",
  },
  {
    id: "production-collapse",
    nameRu: "Обвал производства",
    descriptionRu:
      "Годовой выпуск вида продукции упал более чем наполовину: удары по промышленности, санкции, исчерпание компонентов или потеря мощностей.",
    metric: "production:",
    baseLevel: "warning",
    test: (d) =>
      d.metric.startsWith("production:") && rel(d) < -50 && d.fromValue > 0,
    levelFor: (d) => (rel(d) < -75 ? "critical" : "warning"),
    titleFor: (d) =>
      `${d.nameRu}: производство (${d.metric.slice("production:".length)}) упало более чем наполовину`,
    explanationFor: (d) =>
      `Выпуск ${d.fromYear} → ${d.toYear}: ${d.fromValue} → ${d.toValue} (${rel(d).toFixed(1)}%).`,
    followUpRu:
      "Различить причины: физические потери мощностей, компонентный голод или статистический перенос поставок на следующий год.",
  },
  {
    id: "personnel-surge",
    nameRu: "Резкий рост численности ВС",
    descriptionRu:
      "Активный личный состав вырос более чем на 10% за год: мобилизация, расширение контрактной армии или легализация ранее неучтённых формирований.",
    metric: "activePersonnel",
    baseLevel: "warning",
    test: (d) => d.metric === "activePersonnel" && rel(d) > 10,
    levelFor: (d) => (rel(d) > 25 ? "critical" : "warning"),
    titleFor: (d) =>
      `${d.nameRu}: численность ВС выросла на ${rel(d).toFixed(1)}% за год`,
    explanationFor: (d) =>
      `Личный состав ${d.fromYear} → ${d.toYear}: ${d.fromValue} → ${d.toValue}. ` +
      "Численность без техники и подготовки — не боеспособность: смотрите связку с производством и боеготовностью.",
    followUpRu:
      "Проверить источники прироста (контракт/мобилизация/переучёт) и сроки подготовки новых формирований до боеготовности.",
  },
  {
    id: "reserve-mobilization",
    nameRu: "Мобилизационный всплеск резерва",
    descriptionRu:
      "Учитываемый резерв вырос более чем на 25% за год: признак приведения мобилизационной системы в готовность.",
    metric: "reservePersonnel",
    baseLevel: "warning",
    test: (d) => d.metric === "reservePersonnel" && rel(d) > 25,
    levelFor: () => "warning",
    titleFor: (d) =>
      `${d.nameRu}: резерв вырос на ${rel(d).toFixed(1)}% за год`,
    explanationFor: (d) =>
      `Резерв ${d.fromYear} → ${d.toYear}: ${d.fromValue} → ${d.toValue}. ` +
      "Часто это бумажное расширение категорий учёта; ценность сигнала — в сочетании с учениями и логистическими индикаторами I&W.",
    followUpRu:
      "Сверить с каталогом I&W: сборы резервистов, развёртывание полевых госпиталей и запасов крови подтверждают реальность мобилизации.",
  },
  {
    id: "endurance-drop",
    nameRu: "Падение выносливости",
    descriptionRu:
      "Выносливость сократилась более чем на 25% за год: запасы расходуются быстрее, чем восполняются производством и импортом.",
    metric: "enduranceMonths",
    baseLevel: "warning",
    test: (d) => d.metric === "enduranceMonths" && rel(d) < -25,
    levelFor: (d) => (rel(d) < -50 ? "critical" : "warning"),
    titleFor: (d) =>
      `${d.nameRu}: выносливость упала на ${Math.abs(rel(d)).toFixed(1)}%`,
    explanationFor: (d) =>
      `Выносливость ${d.fromYear} → ${d.toYear}: ${d.fromValue.toFixed(1)} → ${d.toValue.toFixed(1)} мес. ` +
      "Падающая выносливость при растущем бюджете — классический признак того, что расход войны опережает мобилизацию промышленности.",
    followUpRu:
      "Разложить по видам запасов: снаряды, ракеты, бронетехника, личный состав; найти, какой именно запас стал лимитирующим.",
  },
  {
    id: "bp-jump",
    nameRu: "Скачок боевого потенциала",
    descriptionRu:
      "Итоговый БП изменился на 5 баллов и более за шаг: модель фиксирует перестройку, а не плавную эволюцию.",
    metric: "bpTotal",
    baseLevel: "watch",
    test: (d) => d.metric === "bpTotal" && Math.abs(d.absolute) >= 5,
    levelFor: (d) => (Math.abs(d.absolute) >= 8 ? "warning" : "watch"),
    titleFor: (d) =>
      `${d.nameRu}: БП изменился на ${d.absolute >= 0 ? "+" : ""}${d.absolute.toFixed(1)} балла`,
    explanationFor: (d) =>
      `БП ${d.fromYear} → ${d.toYear}: ${d.fromValue.toFixed(1)} → ${d.toValue.toFixed(1)}. ` +
      "Скачок итога обязан раскладываться на компоненты: если драйвер один — это точечная программа, если широким фронтом — системная перестройка.",
    followUpRu:
      "Разложить скачок по компонентам БП и сверить каждый драйвер с физическими индикаторами (производство, численность, бюджет).",
  },
  {
    id: "component-break",
    nameRu: "Разрыв компонента БП",
    descriptionRu:
      "Компонент БП изменился на 12 баллов и более: локальный перелом (технологический скачок, коллапс логистики, доктринальный сдвиг).",
    metric: "component:",
    baseLevel: "watch",
    test: (d) =>
      d.metric.startsWith("component:") && Math.abs(d.absolute) >= 12,
    levelFor: (d) => (Math.abs(d.absolute) >= 18 ? "warning" : "watch"),
    titleFor: (d) =>
      `${d.nameRu}: компонент ${d.metric.slice("component:".length)} изменился на ${d.absolute.toFixed(1)} балла`,
    explanationFor: (d) =>
      `Компонент ${d.fromYear} → ${d.toYear}: ${d.fromValue.toFixed(1)} → ${d.toValue.toFixed(1)}. ` +
      "Компонентные разрывы часто опережают итог: модель замечает перестройку раньше, чем она видна в суммарном рейтинге.",
    followUpRu:
      "Найти физическое событие за разрывом компонента; если события нет — подозревать смену методики оценки, а не мира.",
  },
  {
    id: "production-surge",
    nameRu: "Форсирование производства",
    descriptionRu:
      "Выпуск вида продукции вырос на 50–100%: ещё не удвоение, но уже темп, требующий заблаговременных инвестиций и решений.",
    metric: "production:",
    baseLevel: "watch",
    test: (d) =>
      d.metric.startsWith("production:") &&
      rel(d) >= 50 &&
      d.fromValue > 0 &&
      d.toValue < d.fromValue * 2,
    levelFor: () => "watch",
    titleFor: (d) =>
      `${d.nameRu}: производство (${d.metric.slice("production:".length)}) выросло на ${rel(d).toFixed(1)}%`,
    explanationFor: (d) =>
      `Выпуск ${d.fromYear} → ${d.toYear}: ${d.fromValue} → ${d.toValue}. ` +
      "Темп выше отраслевой нормы мирного времени: ищите контракты и ввод мощностей за предыдущие 12–24 месяца.",
    followUpRu:
      "Проверить, обеспечен ли темп контрактами на следующие годы или это разовый пик под один заказ.",
  },
  {
    id: "uav-explosion",
    nameRu: "Взрывной рост БПЛА",
    descriptionRu:
      "Выпуск БПЛА вырос более чем на 100% за год: доктринальный сдвиг к расходуемым беспилотным средствам как основному инструменту.",
    metric: "production:uav",
    baseLevel: "warning",
    test: (d) => d.metric === "production:uav" && rel(d) > 100 && d.fromValue > 0,
    levelFor: (d) => (rel(d) > 300 ? "critical" : "warning"),
    titleFor: (d) =>
      `${d.nameRu}: выпуск БПЛА вырос на ${rel(d).toFixed(1)}% за год`,
    explanationFor: (d) =>
      `Выпуск БПЛА ${d.fromYear} → ${d.toYear}: ${d.fromValue} → ${d.toValue} (тыс. шт.). ` +
      "Кратный рост БПЛА меняет экономику войны страны: дешёвая масса против дорогих платформ.",
    followUpRu:
      "Оценить цепочки комплектующих (моторы, оптика, связь): они, а не финальная сборка, определяют устойчивость темпа.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Каталог правил по абсолютному состоянию снапшота
// ─────────────────────────────────────────────────────────────────────────────

export const SNAPSHOT_ALERT_RULES: SnapshotAlertRule[] = [
  {
    id: "endurance-below-threshold",
    nameRu: "Выносливость ниже порога автономной войны",
    descriptionRu:
      "Менее 3 месяцев выносливости: страна не может вести интенсивную войну без экстренных внешних поставок.",
    baseLevel: "warning",
    test: (s) => s.enduranceMonths.value < 3,
    titleFor: (s) =>
      `${s.nameRu}: выносливость ${s.enduranceMonths.value.toFixed(1)} мес. — ниже порога 3 мес.`,
    explanationFor: (s) =>
      `По снапшоту ${s.year} года страна исчерпает лимитирующий запас примерно за ` +
      `${s.enduranceMonths.value.toFixed(1)} месяца интенсивных боевых действий. Дальше — зависимость от союзников и импорта.`,
    followUpRu:
      "Определить лимитирующий вид запасов и наличие гарантированных внешних каналов его восполнения.",
  },
  {
    id: "wartime-burden",
    nameRu: "Военная нагрузка уровня военного времени",
    descriptionRu:
      "Доля военных расходов выше 6% ВВП: режим военной экономики или существования под экзистенциальной угрозой.",
    baseLevel: "watch",
    test: (s) => s.defenseShareGdpPct.value > 6,
    titleFor: (s) =>
      `${s.nameRu}: военные расходы ${s.defenseShareGdpPct.value.toFixed(1)}% ВВП`,
    explanationFor: (s) =>
      `Снапшот ${s.year} года: нагрузка выше 6% ВВП устойчиво переносится только экономикой военного времени ` +
      "или государством, считающим угрозу экзистенциальной.",
    followUpRu:
      "Оценить устойчивость: дефицит, инфляция, конкуренция военных расходов с социальными обязательствами.",
  },
  {
    id: "shell-hunger",
    nameRu: "Снарядный голод относительно масштаба армии",
    descriptionRu:
      "Выпуск снарядов крупного калибра ниже 300 тыс./год при армии свыше 300 тыс. человек: производство не покрывает интенсивный расход.",
    baseLevel: "watch",
    test: (s) =>
      s.activePersonnel.value > 300_000 &&
      productionTotal(s, "shells_155") > 0 &&
      productionTotal(s, "shells_155") < 300,
    titleFor: (s) =>
      `${s.nameRu}: выпуск снарядов ${productionTotal(s, "shells_155")} тыс./год при армии ${s.activePersonnel.value} чел.`,
    explanationFor: (s) =>
      `Снапшот ${s.year} года: при интенсивном расходе 5–10 тыс. снарядов в сутки такой выпуск покрывает ` +
      "считанные недели огня; остальное — запасы и импорт.",
    followUpRu:
      "Оценить запасы на складах и контракты импорта снарядов и порохов; проверить планы расширения мощностей.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Движок оценки правил
// ─────────────────────────────────────────────────────────────────────────────

/** Оценка правил по готовому списку дельт. */
export function evaluateDeltaRules(deltas: MetricDelta[]): Alert[] {
  const alerts: Alert[] = [];
  for (const delta of deltas) {
    for (const rule of DELTA_ALERT_RULES) {
      if (rule.test(delta)) {
        alerts.push({
          ruleId: rule.id,
          iso3: delta.iso3,
          nameRu: delta.nameRu,
          level: rule.levelFor(delta),
          titleRu: rule.titleFor(delta),
          explanationRu: rule.explanationFor(delta),
          followUpRu: rule.followUpRu,
          delta: delta,
          fromYear: delta.fromYear,
          toYear: delta.toYear,
        });
      }
    }
  }
  return sortAlerts(alerts);
}

/** Оценка правил по паре снапшотов одной страны. */
export function evaluatePair(
  from: CountrySnapshot,
  to: CountrySnapshot,
): Alert[] {
  return evaluateDeltaRules(compareSnapshots(from, to));
}

/** Оценка правил по всему ряду страны (все соседние шаги). */
export function evaluateSeries(series: CountrySnapshot[]): Alert[] {
  return evaluateDeltaRules(seriesDeltas(series));
}

/** Оценка абсолютных правил по одному снапшоту. */
export function evaluateSnapshotRules(snapshot: CountrySnapshot): Alert[] {
  const alerts: Alert[] = [];
  for (const rule of SNAPSHOT_ALERT_RULES) {
    if (rule.test(snapshot)) {
      alerts.push({
        ruleId: rule.id,
        iso3: snapshot.iso3,
        nameRu: snapshot.nameRu,
        level: rule.baseLevel,
        titleRu: rule.titleFor(snapshot),
        explanationRu: rule.explanationFor(snapshot),
        followUpRu: rule.followUpRu,
        delta: null,
        fromYear: snapshot.year,
        toYear: snapshot.year,
      });
    }
  }
  return sortAlerts(alerts);
}

/** Полная оценка: ряды всех стран + последние снапшоты. */
export function evaluateAll(
  seriesByCountry: Map<string, CountrySnapshot[]>,
): Alert[] {
  const all: Alert[] = [];
  for (const series of seriesByCountry.values()) {
    all.push(...evaluateSeries(series));
    const sorted = [...series].sort((a, b) => a.year - b.year);
    if (sorted.length > 0) {
      all.push(...evaluateSnapshotRules(sorted[sorted.length - 1]));
    }
  }
  return sortAlerts(all);
}

/** Сортировка алертов: уровень ↓, затем страна. */
export function sortAlerts(alerts: Alert[]): Alert[] {
  return [...alerts].sort((a, b) => {
    const diff = ALERT_LEVEL_RANK[b.level] - ALERT_LEVEL_RANK[a.level];
    if (diff !== 0) {
      return diff;
    }
    return a.iso3.localeCompare(b.iso3);
  });
}

/** Алерты не ниже заданного уровня. */
export function alertsAtLeast(alerts: Alert[], level: AlertLevel): Alert[] {
  return alerts.filter((a) => ALERT_LEVEL_RANK[a.level] >= ALERT_LEVEL_RANK[level]);
}

/** Вид продукции из метрики production:* (для отчётов). */
export function productionKindOf(delta: MetricDelta): ProductionKind | null {
  if (!delta.metric.startsWith("production:")) {
    return null;
  }
  return delta.metric.slice("production:".length) as ProductionKind;
}
