// ─────────────────────────────────────────────────────────────────────────────
// Аттриционный симулятор: уравнения Ланчестера (Волна 3)
// Линейный и квадратичный законы, модификаторы качества, террейна,
// превосходства в РЭБ и в воздухе; пошаговая симуляция по дням,
// обменное соотношение потерь и условия победы/истощения.
// РБП-Стратег 3.0
// ─────────────────────────────────────────────────────────────────────────────
//
// Теоретическая база.
// Ф. У. Ланчестер (1916) описал два предельных режима боя:
//   Квадратичный закон (современный бой, прицельный огонь по площади целей):
//       dA/dt = -β·B,   dB/dt = -α·A
//     Сила стороны пропорциональна КВАДРАТУ численности, умноженному на
//     качество (уравнение состояния: α·(A0² - A²) = β·(B0² - B²)).
//     Отсюда классический вывод: концентрация сил даёт нелинейное
//     преимущество, а превосходство 3:1 при равном качестве — решающее.
//   Линейный закон (неприцельный огонь, партизанская война, дуэли один на один):
//       dA/dt = -β·A·B/S,   dB/dt = -α·A·B/S
//     Потери пропорциональны произведению численностей; уравнение состояния
//     линейно: A - A0 = (β/α)·(B - B0), численность и качество равнозначны.
//
// Модификаторы движка поверх классики:
//   качество (обученность, техника, управление) — базовый коэффициент α/β;
//   террейн — обороняющийся получает множитель к летальности и скидку к потерям;
//   РЭБ — сторона с превосходством в радиоэлектронной борьбе подавляет
//     целеуказание противника (множитель к своей летальности, штраф к чужой);
//   воздух — господство в воздухе добавляет летальность наземным силам.
//
// Условия окончания боя:
//   annihilation    — противник уничтожен (остаток ниже абсолютного нуля боя);
//   collapse        — остаток ниже порога морального распада доли от старта;
//   exhaustion      — остаток ниже порога боевого истощения (по умолчанию 10%);
//   stalemate       — лимит дней исчерпан, обе стороны боеспособны;
//   mutualCollapse  — обе стороны распались/истощились в один день.

// ─────────────────────────────────────────────────────────────────────────────
// Типы
// ─────────────────────────────────────────────────────────────────────────────

/** Какой закон Ланчестера применяется */
export type LanchesterLaw = "square" | "linear";

/** Сторона боя */
export type LanchesterSide = "a" | "b";

/** Тип местности театра боя */
export type LanchesterTerrain =
  | "plains"
  | "steppe"
  | "forest"
  | "mountains"
  | "urban"
  | "desert"
  | "swamp"
  | "coastal";

/** Уровень превосходства одной из сторон в домене (РЭБ или воздух) */
export type SuperiorityLevel = "none" | "contested" | "advantage" | "dominance";

/** Превосходство в одном домене: кто и насколько */
export interface DomainSuperiority {
  /** Сторона, обладающая превосходством; null — паритет не задан явно */
  side: LanchesterSide | null;
  /** Уровень превосходства */
  level: SuperiorityLevel;
}

/** Описание одной воюющей стороны на входе симуляции */
export interface LanchesterForce {
  /** Название стороны для отчётов */
  name: string;
  /** Начальная численность (условные боевые единицы: люди, машины или сводный эквивалент) */
  initialStrength: number;
  /**
   * Базовое качество: летальность одной единицы в сутки при паритете условий.
   * Для квадратичного закона типичный диапазон 0.005–0.05.
   * Качество 0.02 означает: каждая единица в сутки выводит из строя
   * в среднем 0.02 единицы противника при прицельном огне.
   */
  quality: number;
  /** Доля от начальной численности, ниже которой сторона считается распавшейся (мораль), 0–1 */
  moraleBreakFraction: number;
  /** Подкрепления в единицах в сутки (0 — нет) */
  reinforcementsPerDay: number;
}

/** Полный ввод сценария боя */
export interface LanchesterScenario {
  /** Сторона A */
  forceA: LanchesterForce;
  /** Сторона B */
  forceB: LanchesterForce;
  /** Закон боя */
  law: LanchesterLaw;
  /** Местность */
  terrain: LanchesterTerrain;
  /** Какая сторона обороняется (получает террейн-модификаторы); null — встречный бой */
  defender: LanchesterSide | null;
  /** Превосходство в РЭБ */
  ewSuperiority: DomainSuperiority;
  /** Превосходство в воздухе */
  airSuperiority: DomainSuperiority;
  /** Максимальная длительность моделирования, суток */
  maxDays: number;
  /**
   * Шаг интегрирования в сутках (меньше — точнее, медленнее).
   * Для суточного журнала допустим 1; по умолчанию используется 0.25.
   */
  stepDays: number;
  /**
   * Порог боевого истощения: доля начальной численности, ниже которой
   * сторона признаётся небоеспособной даже без морального распада.
   */
  exhaustionFraction: number;
  /**
   * Нормировочная шкала S линейного закона (по умолчанию — сумма начальных
   * численностей). Влияет только на темп линейного боя, не на исход.
   */
  linearScale: number | null;
}

/** Снимок состояния на конец суток */
export interface LanchesterDayRecord {
  /** Номер суток от начала (1-based) */
  day: number;
  /** Остаток стороны A на конец суток */
  strengthA: number;
  /** Остаток стороны B на конец суток */
  strengthB: number;
  /** Потери A за эти сутки */
  dailyLossesA: number;
  /** Потери B за эти сутки */
  dailyLossesB: number;
  /** Накопленные потери A */
  cumulativeLossesA: number;
  /** Накопленные потери B */
  cumulativeLossesB: number;
  /**
   * Обменное соотношение накопленных потерь: потери B / потери A.
   * Больше 1 — обмен в пользу A.
   */
  exchangeRatio: number;
  /** Остаток A в процентах от начальной численности */
  remainingPctA: number;
  /** Остаток B в процентах от начальной численности */
  remainingPctB: number;
}

/** Причина завершения боя */
export type LanchesterOutcomeKind =
  | "annihilation"
  | "collapse"
  | "exhaustion"
  | "stalemate"
  | "mutualCollapse";

/** Итог симуляции */
export interface LanchesterResult {
  /** Победитель; null — ничья/тупик */
  winner: LanchesterSide | null;
  /** Причина завершения */
  outcome: LanchesterOutcomeKind;
  /** Длительность боя, суток */
  durationDays: number;
  /** Финальный остаток A */
  finalStrengthA: number;
  /** Финальный остаток B */
  finalStrengthB: number;
  /** Суммарные потери A */
  totalLossesA: number;
  /** Суммарные потери B */
  totalLossesB: number;
  /** Итоговое обменное соотношение (потери B / потери A) */
  exchangeRatio: number;
  /** Потери победителя в процентах от его начальной численности */
  winnerLossPct: number | null;
  /** Эффективная летальность A с учётом всех модификаторов */
  effectiveAlpha: number;
  /** Эффективная летальность B с учётом всех модификаторов */
  effectiveBeta: number;
  /** Журнал по суткам */
  dailyLog: LanchesterDayRecord[];
  /** Человекочитаемый вердикт на русском */
  verdictRu: string;
}

/** Аналитический прогноз по уравнению состояния (без интегрирования) */
export interface LanchesterAnalyticPrediction {
  /** Прогнозируемый победитель; null — точный паритет инварианта */
  winner: LanchesterSide | null;
  /** Остаток победителя по уравнению состояния (для проигравшего — 0) */
  winnerRemaining: number;
  /** Значение боевой силы A по закону: quality·N² (квадр.) или quality·N (лин.) */
  combatPowerA: number;
  /** Значение боевой силы B */
  combatPowerB: number;
  /** Отношение боевых сил A/B */
  powerRatio: number;
}

/** Сравнение двух законов на одном сценарии */
export interface LanchesterLawComparison {
  /** Результат по квадратичному закону */
  square: LanchesterResult;
  /** Результат по линейному закону */
  linear: LanchesterResult;
  /** Совпадают ли победители */
  sameWinner: boolean;
  /** Пояснение расхождения на русском */
  explanationRu: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Таблицы модификаторов
// ─────────────────────────────────────────────────────────────────────────────

/** Модификаторы местности для обороняющегося и атакующего */
export interface TerrainModifier {
  /** Множитель летальности обороняющегося */
  defenderLethality: number;
  /** Множитель летальности атакующего */
  attackerLethality: number;
  /** Описание эффекта на русском */
  descriptionRu: string;
}

/**
 * Террейн-модификаторы.
 * Логика: укрытия и подготовленные позиции повышают летальность обороны
 * (она ведёт огонь из укрытий по открытым целям) и снижают летальность
 * атакующего. Город — экстремум эффекта, открытая степь — почти паритет.
 */
export const LANCHESTER_TERRAIN_MODIFIERS: Record<LanchesterTerrain, TerrainModifier> = {
  plains: {
    defenderLethality: 1.1,
    attackerLethality: 0.95,
    descriptionRu: "Равнина: лёгкое преимущество подготовленной обороны.",
  },
  steppe: {
    defenderLethality: 1.05,
    attackerLethality: 1.0,
    descriptionRu: "Степь: почти встречный бой, решают манёвр и дальнобойность.",
  },
  forest: {
    defenderLethality: 1.3,
    attackerLethality: 0.8,
    descriptionRu: "Лес: маскировка и короткие дистанции боя усиливают оборону.",
  },
  mountains: {
    defenderLethality: 1.5,
    attackerLethality: 0.65,
    descriptionRu: "Горы: господствующие высоты и узкие проходы, сильная оборона.",
  },
  urban: {
    defenderLethality: 1.7,
    attackerLethality: 0.55,
    descriptionRu: "Город: максимальная цена атаки, оборона в зданиях и руинах.",
  },
  desert: {
    defenderLethality: 1.0,
    attackerLethality: 1.05,
    descriptionRu: "Пустыня: открытые дальности, преимущество у кого лучше разведка и авиация.",
  },
  swamp: {
    defenderLethality: 1.35,
    attackerLethality: 0.7,
    descriptionRu: "Болота и поймы: техника атакующего вязнет, оборона на дамбах и высотах.",
  },
  coastal: {
    defenderLethality: 1.2,
    attackerLethality: 0.85,
    descriptionRu: "Побережье: десантирующийся атакующий уязвим на урезе воды.",
  },
};

/** Множители превосходства в домене (РЭБ) */
export const EW_SUPERIORITY_MULTIPLIERS: Record<SuperiorityLevel, { own: number; enemy: number }> = {
  none: {
    own: 1.0,
    enemy: 1.0,
  },
  contested: {
    own: 1.05,
    enemy: 0.97,
  },
  advantage: {
    own: 1.18,
    enemy: 0.85,
  },
  dominance: {
    own: 1.35,
    enemy: 0.68,
  },
};

/** Множители превосходства в воздухе */
export const AIR_SUPERIORITY_MULTIPLIERS: Record<SuperiorityLevel, { own: number; enemy: number }> = {
  none: {
    own: 1.0,
    enemy: 1.0,
  },
  contested: {
    own: 1.07,
    enemy: 0.96,
  },
  advantage: {
    own: 1.25,
    enemy: 0.88,
  },
  dominance: {
    own: 1.5,
    enemy: 0.78,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Эффективная летальность
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Применить доменное превосходство к паре летальностей.
 * Возвращает скорректированные [alpha, beta].
 */
function applyDomainSuperiority(
  alpha: number,
  beta: number,
  superiority: DomainSuperiority,
  table: Record<SuperiorityLevel, { own: number; enemy: number }>,
): [number, number] {
  if (superiority.side === null || superiority.level === "none") {
    return [alpha, beta];
  }
  const mult: { own: number; enemy: number } = table[superiority.level];
  if (superiority.side === "a") {
    return [alpha * mult.own, beta * mult.enemy];
  }
  return [alpha * mult.enemy, beta * mult.own];
}

/**
 * Эффективные коэффициенты летальности сторон с учётом террейна, РЭБ и воздуха.
 * alpha — летальность A (сколько единиц B выводит из строя одна единица A в сутки),
 * beta — летальность B.
 */
export function effectiveLethality(scenario: LanchesterScenario): {
  alpha: number;
  beta: number;
} {
  let alpha: number = scenario.forceA.quality;
  let beta: number = scenario.forceB.quality;

  // Террейн: модификаторы достаются обороняющемуся и атакующему.
  if (scenario.defender !== null) {
    const terrain: TerrainModifier = LANCHESTER_TERRAIN_MODIFIERS[scenario.terrain];
    if (scenario.defender === "a") {
      alpha *= terrain.defenderLethality;
      beta *= terrain.attackerLethality;
    } else {
      beta *= terrain.defenderLethality;
      alpha *= terrain.attackerLethality;
    }
  }

  // РЭБ и воздух применяются последовательно и независимо.
  const afterEw: [number, number] = applyDomainSuperiority(
    alpha,
    beta,
    scenario.ewSuperiority,
    EW_SUPERIORITY_MULTIPLIERS,
  );
  const afterAir: [number, number] = applyDomainSuperiority(
    afterEw[0],
    afterEw[1],
    scenario.airSuperiority,
    AIR_SUPERIORITY_MULTIPLIERS,
  );

  return { alpha: afterAir[0], beta: afterAir[1] };
}

// ─────────────────────────────────────────────────────────────────────────────
// Аналитика: уравнения состояния
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Инвариант квадратичного закона: alpha·A² - beta·B² сохраняется во времени.
 * Положительное значение — перевес A по уравнению состояния.
 */
export function squareLawInvariant(
  alpha: number,
  beta: number,
  strengthA: number,
  strengthB: number,
): number {
  return alpha * strengthA * strengthA - beta * strengthB * strengthB;
}

/**
 * Инвариант линейного закона: A - (beta/alpha)·B сохраняется во времени.
 * Положительное значение — перевес A.
 */
export function linearLawInvariant(
  alpha: number,
  beta: number,
  strengthA: number,
  strengthB: number,
): number {
  if (alpha <= 0) {
    return -strengthB;
  }
  return strengthA - (beta / alpha) * strengthB;
}

/**
 * Аналитический исход боя без интегрирования, по уравнению состояния.
 * Для квадратичного закона остаток победителя: sqrt(A0² - (beta/alpha)·B0²).
 * Для линейного: A0 - (beta/alpha)·B0.
 */
export function analyticOutcome(scenario: LanchesterScenario): LanchesterAnalyticPrediction {
  const { alpha, beta }: { alpha: number; beta: number } = effectiveLethality(scenario);
  const a0: number = scenario.forceA.initialStrength;
  const b0: number = scenario.forceB.initialStrength;

  if (scenario.law === "square") {
    const powerA: number = alpha * a0 * a0;
    const powerB: number = beta * b0 * b0;
    if (Math.abs(powerA - powerB) < 1e-9) {
      return {
        winner: null,
        winnerRemaining: 0,
        combatPowerA: powerA,
        combatPowerB: powerB,
        powerRatio: 1,
      };
    }
    if (powerA > powerB) {
      return {
        winner: "a",
        winnerRemaining: Math.sqrt(a0 * a0 - (beta / alpha) * b0 * b0),
        combatPowerA: powerA,
        combatPowerB: powerB,
        powerRatio: powerA / powerB,
      };
    }
    return {
      winner: "b",
      winnerRemaining: Math.sqrt(b0 * b0 - (alpha / beta) * a0 * a0),
      combatPowerA: powerA,
      combatPowerB: powerB,
      powerRatio: powerA / powerB,
    };
  }

  // Линейный закон.
  const powerA: number = alpha * a0;
  const powerB: number = beta * b0;
  const invariant: number = linearLawInvariant(alpha, beta, a0, b0);
  if (Math.abs(invariant) < 1e-9) {
    return {
      winner: null,
      winnerRemaining: 0,
      combatPowerA: powerA,
      combatPowerB: powerB,
      powerRatio: powerB === 0 ? 1 : powerA / powerB,
    };
  }
  if (invariant > 0) {
    return {
      winner: "a",
      winnerRemaining: invariant,
      combatPowerA: powerA,
      combatPowerB: powerB,
      powerRatio: powerB === 0 ? Number.POSITIVE_INFINITY : powerA / powerB,
    };
  }
  return {
    winner: "b",
    winnerRemaining: b0 - (alpha / beta) * a0,
    combatPowerA: powerA,
    combatPowerB: powerB,
    powerRatio: powerB === 0 ? Number.POSITIVE_INFINITY : powerA / powerB,
  };
}

/**
 * Какая начальная численность нужна стороне A, чтобы по квадратичному закону
 * свести бой вничью против B (точка равенства инварианта).
 * Классический ответ на вопрос «сколько нужно для паритета».
 */
export function parityStrengthSquare(
  alpha: number,
  beta: number,
  enemyStrength: number,
): number {
  if (alpha <= 0) {
    return Number.POSITIVE_INFINITY;
  }
  return Math.sqrt(beta / alpha) * enemyStrength;
}

/**
 * Требуемое численное превосходство A над B для победы по квадратичному
 * закону при заданном соотношении качеств. При равном качестве — 1.0
 * (паритет достигается при равенстве, победа — при любом превышении;
 * историческое «правило 3:1» закладывает запас на террейн и неопределённость).
 */
export function requiredNumericalRatioSquare(alpha: number, beta: number): number {
  if (alpha <= 0) {
    return Number.POSITIVE_INFINITY;
  }
  return Math.sqrt(beta / alpha);
}

// ─────────────────────────────────────────────────────────────────────────────
// Пошаговая симуляция по дням
// ─────────────────────────────────────────────────────────────────────────────

/** Проверка стороны на условие окончания боя в конце суток */
function checkTermination(
  strength: number,
  initial: number,
  moraleBreakFraction: number,
  exhaustionFraction: number,
): LanchesterOutcomeKind | null {
  if (strength <= 0.5) {
    return "annihilation";
  }
  const fraction: number = initial > 0 ? strength / initial : 0;
  if (fraction <= moraleBreakFraction) {
    return "collapse";
  }
  if (fraction <= exhaustionFraction) {
    return "exhaustion";
  }
  return null;
}

/** Вердикт на русском по итогам симуляции */
function buildVerdictRu(
  scenario: LanchesterScenario,
  winner: LanchesterSide | null,
  outcome: LanchesterOutcomeKind,
  durationDays: number,
): string {
  const nameA: string = scenario.forceA.name;
  const nameB: string = scenario.forceB.name;
  if (outcome === "stalemate") {
    return (
      `За ${durationDays} суток ни ${nameA}, ни ${nameB} не достигли решающего ` +
      `превосходства: бой переходит в позиционное истощение, исход определит ` +
      `не тактика, а запасы и производство (см. движок endurance).`
    );
  }
  if (outcome === "mutualCollapse") {
    return (
      `Обе стороны — ${nameA} и ${nameB} — потеряли боеспособность практически ` +
      `одновременно на ${durationDays}-е сутки: пиррова ничья, театр остаётся ` +
      `за тем, кто первым введёт свежие резервы.`
    );
  }
  const winnerName: string = winner === "a" ? nameA : nameB;
  const loserName: string = winner === "a" ? nameB : nameA;
  const reason: string =
    outcome === "annihilation"
      ? "полностью уничтожена как организованная сила"
      : outcome === "collapse"
        ? "потеряла моральную устойчивость и распалась"
        : "истощила боеспособный остаток ниже порога ведения боя";
  return (
    `${winnerName} побеждает за ${durationDays} суток: ${loserName} ${reason}. ` +
    `Обмен потерями и цена победы — в журнале по суткам.`
  );
}

/**
 * Пошаговая симуляция боя по дням.
 * Интегрирование — явный Эйлер с шагом scenario.stepDays и суточным журналом.
 * Потери не могут увести численность ниже нуля; подкрепления добавляются
 * в конце суток и не участвуют в потерях тех же суток.
 */
export function simulateLanchester(scenario: LanchesterScenario): LanchesterResult {
  const { alpha, beta }: { alpha: number; beta: number } = effectiveLethality(scenario);
  const a0: number = scenario.forceA.initialStrength;
  const b0: number = scenario.forceB.initialStrength;
  const scale: number =
    scenario.linearScale !== null ? scenario.linearScale : Math.max(1, a0 + b0);
  const step: number = Math.max(0.01, Math.min(1, scenario.stepDays));

  let strengthA: number = a0;
  let strengthB: number = b0;
  let cumulativeLossesA: number = 0;
  let cumulativeLossesB: number = 0;

  const dailyLog: LanchesterDayRecord[] = [];
  let outcome: LanchesterOutcomeKind = "stalemate";
  let winner: LanchesterSide | null = null;
  let durationDays: number = scenario.maxDays;

  // Суточный цикл: внутри суток — подшаги интегрирования.
  for (let day: number = 1; day <= scenario.maxDays; day += 1) {
    let dayLossesA: number = 0;
    let dayLossesB: number = 0;
    let elapsed: number = 0;

    while (elapsed < 1 - 1e-9) {
      const dt: number = Math.min(step, 1 - elapsed);
      let lossA: number;
      let lossB: number;
      if (scenario.law === "square") {
        // Квадратичный закон: потери стороны пропорциональны численности врага.
        lossA = beta * strengthB * dt;
        lossB = alpha * strengthA * dt;
      } else {
        // Линейный закон: потери пропорциональны произведению численностей.
        lossA = (beta * strengthA * strengthB * dt) / scale;
        lossB = (alpha * strengthA * strengthB * dt) / scale;
      }
      // Защита от отрицательной численности на большом шаге.
      lossA = Math.min(lossA, strengthA);
      lossB = Math.min(lossB, strengthB);
      strengthA -= lossA;
      strengthB -= lossB;
      dayLossesA += lossA;
      dayLossesB += lossB;
      elapsed += dt;
      if (strengthA <= 0 && strengthB <= 0) {
        break;
      }
    }

    // Подкрепления прибывают в конце суток.
    strengthA += scenario.forceA.reinforcementsPerDay;
    strengthB += scenario.forceB.reinforcementsPerDay;
    cumulativeLossesA += dayLossesA;
    cumulativeLossesB += dayLossesB;

    dailyLog.push({
      day,
      strengthA: Math.max(0, strengthA),
      strengthB: Math.max(0, strengthB),
      dailyLossesA: dayLossesA,
      dailyLossesB: dayLossesB,
      cumulativeLossesA,
      cumulativeLossesB,
      exchangeRatio:
        cumulativeLossesA > 0 ? cumulativeLossesB / cumulativeLossesA : Number.POSITIVE_INFINITY,
      remainingPctA: a0 > 0 ? (Math.max(0, strengthA) / a0) * 100 : 0,
      remainingPctB: b0 > 0 ? (Math.max(0, strengthB) / b0) * 100 : 0,
    });

    const termA: LanchesterOutcomeKind | null = checkTermination(
      strengthA,
      a0,
      scenario.forceA.moraleBreakFraction,
      scenario.exhaustionFraction,
    );
    const termB: LanchesterOutcomeKind | null = checkTermination(
      strengthB,
      b0,
      scenario.forceB.moraleBreakFraction,
      scenario.exhaustionFraction,
    );

    if (termA !== null && termB !== null) {
      outcome = "mutualCollapse";
      winner = null;
      durationDays = day;
      break;
    }
    if (termB !== null) {
      outcome = termB;
      winner = "a";
      durationDays = day;
      break;
    }
    if (termA !== null) {
      outcome = termA;
      winner = "b";
      durationDays = day;
      break;
    }
  }

  const totalLossesA: number = cumulativeLossesA;
  const totalLossesB: number = cumulativeLossesB;
  const winnerInitial: number | null =
    winner === "a" ? a0 : winner === "b" ? b0 : null;
  const winnerLosses: number | null =
    winner === "a" ? totalLossesA : winner === "b" ? totalLossesB : null;

  return {
    winner,
    outcome,
    durationDays,
    finalStrengthA: Math.max(0, strengthA),
    finalStrengthB: Math.max(0, strengthB),
    totalLossesA,
    totalLossesB,
    exchangeRatio:
      totalLossesA > 0 ? totalLossesB / totalLossesA : Number.POSITIVE_INFINITY,
    winnerLossPct:
      winnerInitial !== null && winnerLosses !== null && winnerInitial > 0
        ? (winnerLosses / winnerInitial) * 100
        : null,
    effectiveAlpha: alpha,
    effectiveBeta: beta,
    dailyLog,
    verdictRu: buildVerdictRu(scenario, winner, outcome, durationDays),
  };
}

/**
 * Сравнение законов на одном и том же сценарии.
 * Классический учебный эффект: при численном перевесе квадратичный закон
 * даёт быстрой и дешёвой победе сильного, линейный — затяжной бой,
 * где качество важнее массы.
 */
export function compareLaws(
  base: Omit<LanchesterScenario, "law">,
): LanchesterLawComparison {
  const square: LanchesterResult = simulateLanchester({ ...base, law: "square" });
  const linear: LanchesterResult = simulateLanchester({ ...base, law: "linear" });
  const sameWinner: boolean = square.winner === linear.winner;
  const explanationRu: string = sameWinner
    ? "Оба закона дают одного победителя: перевес стороны достаточно велик, " +
      "чтобы режим боя (прицельный/неприцельный огонь) не менял исход, " +
      "различаются только темп и цена победы."
    : "Законы расходятся в победителе: в квадратичном режиме решает масса " +
      "(концентрация сил), в линейном — удельное качество. Такой сценарий " +
      "критически чувствителен к характеру боя: разведка реального режима " +
      "огня важнее точности исходных численностей.";
  return { square, linear, sameWinner, explanationRu };
}

// ─────────────────────────────────────────────────────────────────────────────
// Пресеты сценариев
// ─────────────────────────────────────────────────────────────────────────────

/** Готовый сценарий с описанием для UI и тестов */
export interface LanchesterPreset {
  /** Идентификатор пресета */
  id: string;
  /** Название на русском */
  nameRu: string;
  /** Что демонстрирует пресет */
  descriptionRu: string;
  /** Сценарий */
  scenario: LanchesterScenario;
}

/** Базовые значения по умолчанию для сборки пресетов */
function defaultScenario(partial: Partial<LanchesterScenario>): LanchesterScenario {
  const force: LanchesterForce = {
    name: "Сторона",
    initialStrength: 1000,
    quality: 0.02,
    moraleBreakFraction: 0.25,
    reinforcementsPerDay: 0,
  };
  const base: LanchesterScenario = {
    forceA: { ...force, name: "Сторона A" },
    forceB: { ...force, name: "Сторона B" },
    law: "square",
    terrain: "plains",
    defender: null,
    ewSuperiority: { side: null, level: "none" },
    airSuperiority: { side: null, level: "none" },
    maxDays: 365,
    stepDays: 0.25,
    exhaustionFraction: 0.1,
    linearScale: null,
  };
  return { ...base, ...partial };
}

/** Каталог учебных и аналитических пресетов */
export const LANCHESTER_PRESETS: LanchesterPreset[] = [
  {
    id: "attack_3_to_1",
    nameRu: "Классика 3:1 — наступление на подготовленную оборону",
    descriptionRu:
      "Трёхкратный численный перевес атакующего при равном качестве против " +
      "обороны на равнине. Квадратичный закон показывает, почему доктрины " +
      "требуют 3:1 именно на направлении главного удара.",
    scenario: defaultScenario({
      forceA: {
        name: "Атакующий",
        initialStrength: 3000,
        quality: 0.02,
        moraleBreakFraction: 0.3,
        reinforcementsPerDay: 0,
      },
      forceB: {
        name: "Обороняющийся",
        initialStrength: 1000,
        quality: 0.02,
        moraleBreakFraction: 0.2,
        reinforcementsPerDay: 0,
      },
      defender: "b",
      terrain: "plains",
    }),
  },
  {
    id: "equal_quality_edge",
    nameRu: "Паритет массы — решает качество",
    descriptionRu:
      "Равные численности, качество стороны A выше на 40% за счёт обучения " +
      "и управления. Демонстрирует цену качества при массе 1:1.",
    scenario: defaultScenario({
      forceA: {
        name: "Качественная армия",
        initialStrength: 1500,
        quality: 0.028,
        moraleBreakFraction: 0.25,
        reinforcementsPerDay: 0,
      },
      forceB: {
        name: "Массовая армия",
        initialStrength: 1500,
        quality: 0.02,
        moraleBreakFraction: 0.25,
        reinforcementsPerDay: 0,
      },
    }),
  },
  {
    id: "urban_defense",
    nameRu: "Городская оборона — масса не работает",
    descriptionRu:
      "Атакующий с перевесом 2:1 штурмует город. Террейн-модификаторы " +
      "съедают численное преимущество: иллюстрация цены городской войны.",
    scenario: defaultScenario({
      forceA: {
        name: "Штурмующие",
        initialStrength: 2000,
        quality: 0.02,
        moraleBreakFraction: 0.35,
        reinforcementsPerDay: 0,
      },
      forceB: {
        name: "Гарнизон",
        initialStrength: 1000,
        quality: 0.02,
        moraleBreakFraction: 0.15,
        reinforcementsPerDay: 0,
      },
      defender: "b",
      terrain: "urban",
    }),
  },
  {
    id: "ew_air_dominance",
    nameRu: "Превосходство в РЭБ и воздухе против массы",
    descriptionRu:
      "Меньшая, но технологичная сторона с доминированием в РЭБ и воздухе " +
      "против полуторного численного перевеса. Проверка гипотезы о том, " +
      "что доменное превосходство компенсирует массу.",
    scenario: defaultScenario({
      forceA: {
        name: "Технологичная сторона",
        initialStrength: 1200,
        quality: 0.024,
        moraleBreakFraction: 0.25,
        reinforcementsPerDay: 0,
      },
      forceB: {
        name: "Массовая сторона",
        initialStrength: 1800,
        quality: 0.02,
        moraleBreakFraction: 0.25,
        reinforcementsPerDay: 0,
      },
      ewSuperiority: { side: "a", level: "dominance" },
      airSuperiority: { side: "a", level: "advantage" },
    }),
  },
  {
    id: "attrition_with_reinforcement",
    nameRu: "Истощение с подпиткой резервами",
    descriptionRu:
      "Обе стороны получают подкрепления: бой выигрывает не стартовая масса, " +
      "а темп восполнения потерь — мост между Ланчестером и движком endurance.",
    scenario: defaultScenario({
      forceA: {
        name: "Сторона с глубоким резервом",
        initialStrength: 1800,
        quality: 0.02,
        moraleBreakFraction: 0.2,
        reinforcementsPerDay: 12,
      },
      forceB: {
        name: "Сторона с неглубоким резервом",
        initialStrength: 2200,
        quality: 0.02,
        moraleBreakFraction: 0.2,
        reinforcementsPerDay: 4,
      },
      maxDays: 720,
    }),
  },
  {
    id: "guerrilla_linear",
    nameRu: "Партизанский режим — линейный закон",
    descriptionRu:
      "Неприцельный огонь и рассредоточение: линейный закон, при котором " +
      "численное превосходство регулярной армии работает слабо.",
    scenario: defaultScenario({
      forceA: {
        name: "Регулярная армия",
        initialStrength: 2500,
        quality: 0.02,
        moraleBreakFraction: 0.3,
        reinforcementsPerDay: 0,
      },
      forceB: {
        name: "Партизанское движение",
        initialStrength: 900,
        quality: 0.026,
        moraleBreakFraction: 0.1,
        reinforcementsPerDay: 0,
      },
      law: "linear",
      terrain: "forest",
      defender: "b",
      maxDays: 720,
    }),
  },
];

/** Найти пресет по идентификатору */
export function getLanchesterPreset(id: string): LanchesterPreset | undefined {
  return LANCHESTER_PRESETS.find(
    (preset: LanchesterPreset): boolean => preset.id === id,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Пакетный анализ: чувствительность исхода к массе и качеству
// ─────────────────────────────────────────────────────────────────────────────

/** Строка развёртки по численному превосходству */
export interface NumericalSweepRow {
  /** Численное превосходство A над B (N_A = ratio x N_B) */
  ratio: number;
  /** Победитель при этом превосходстве */
  winner: LanchesterSide | null;
  /** Длительность боя, суток */
  durationDays: number;
  /** Потери победителя в процентах от его начальной численности */
  winnerLossPct: number | null;
  /** Обменное соотношение потерь */
  exchangeRatio: number;
}

/**
 * Развёртка исхода по численному превосходству стороны A.
 * Фиксирует численность B и качество обеих сторон, варьирует массу A.
 * Отвечает на практический вопрос планирования: «сколько массы нужно,
 * чтобы цена победы упала ниже приемлемой».
 */
export function sweepNumericalAdvantage(
  baseForceB: LanchesterForce,
  qualityA: number,
  qualityB: number,
  ratios: number[],
  law: LanchesterLaw,
): NumericalSweepRow[] {
  const rows: NumericalSweepRow[] = [];
  for (const ratio of ratios) {
    const scenario: LanchesterScenario = defaultScenario({
      forceA: {
        name: "A",
        initialStrength: Math.round(baseForceB.initialStrength * ratio),
        quality: qualityA,
        moraleBreakFraction: 0,
        reinforcementsPerDay: 0,
      },
      forceB: {
        ...baseForceB,
        quality: qualityB,
        moraleBreakFraction: 0,
        reinforcementsPerDay: 0,
      },
      law,
      exhaustionFraction: 0,
      maxDays: 720,
    });
    const result: LanchesterResult = simulateLanchester(scenario);
    rows.push({
      ratio,
      winner: result.winner,
      durationDays: result.durationDays,
      winnerLossPct: result.winnerLossPct,
      exchangeRatio: result.exchangeRatio,
    });
  }
  return rows;
}

/**
 * Период полураспада силы при заданной летальности противника
 * (квадратичный закон, противник условно неизменен в начале боя):
 * время, за которое сторона теряет половину численности при текущем
 * темпе в начальный момент. Быстрая прикидка темпа аттриции без полной
 * симуляции: t_half ≈ 0.5 x N / (beta x N_enemy).
 */
export function attritionHalfLifeDays(
  ownStrength: number,
  enemyStrength: number,
  enemyLethality: number,
): number {
  const initialDailyLoss: number = enemyLethality * enemyStrength;
  if (initialDailyLoss <= 0) {
    return Number.POSITIVE_INFINITY;
  }
  return (0.5 * ownStrength) / initialDailyLoss;
}

/**
 * Цена победы таблицей: для набора целевых уровней потерь победителя
 * находит минимальное численное превосходство A (квадратичный закон,
 * равное качество), при котором потери A укладываются в уровень.
 * Используется грубая сетка превосходств от 1.0 до 6.0 с шагом 0.25.
 */
export function requiredRatioForLossBudget(
  enemyStrength: number,
  quality: number,
  lossBudgetsPct: number[],
): Array<{ lossBudgetPct: number; requiredRatio: number | null }> {
  const baseB: LanchesterForce = {
    name: "B",
    initialStrength: enemyStrength,
    quality,
    moraleBreakFraction: 0,
    reinforcementsPerDay: 0,
  };
  const ratios: number[] = [];
  for (let ratio: number = 1.0; ratio <= 6.001; ratio += 0.25) {
    ratios.push(Math.round(ratio * 100) / 100);
  }
  const sweep: NumericalSweepRow[] = sweepNumericalAdvantage(
    baseB,
    quality,
    quality,
    ratios,
    "square",
  );
  return lossBudgetsPct.map(
    (budget: number): { lossBudgetPct: number; requiredRatio: number | null } => {
      const found: NumericalSweepRow | undefined = sweep.find(
        (row: NumericalSweepRow): boolean =>
          row.winner === "a" &&
          row.winnerLossPct !== null &&
          row.winnerLossPct <= budget,
      );
      return {
        lossBudgetPct: budget,
        requiredRatio: found !== undefined ? found.ratio : null,
      };
    },
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Текстовый отчёт симуляции
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Краткая сводка журнала по контрольным точкам: первые сутки, каждая
 * десятая и финальные сутки. Для включения в разведсводки, где полный
 * посуточный журнал избыточен.
 */
export function summarizeDailyLog(
  result: LanchesterResult,
  scenario: LanchesterScenario,
): string[] {
  const lines: string[] = [];
  const log: LanchesterDayRecord[] = result.dailyLog;
  if (log.length === 0) {
    return lines;
  }
  const checkpoints: Set<number> = new Set<number>();
  checkpoints.add(1);
  for (let day: number = 10; day < log.length; day += 10) {
    checkpoints.add(day);
  }
  checkpoints.add(log.length);
  for (const record of log) {
    if (!checkpoints.has(record.day)) {
      continue;
    }
    lines.push(
      `Сутки ${record.day}: ${scenario.forceA.name} — ${Math.round(record.strengthA)} ` +
        `(${record.remainingPctA.toFixed(0)}%), ${scenario.forceB.name} — ` +
        `${Math.round(record.strengthB)} (${record.remainingPctB.toFixed(0)}%), ` +
        `обмен накопленно ${record.exchangeRatio === Number.POSITIVE_INFINITY ? "∞" : record.exchangeRatio.toFixed(2)}`,
    );
  }
  return lines;
}

/**
 * Полный текстовый отчёт боя для сводок и UI.
 * Формат: заголовок, условия, эффективные летальности, контрольные точки
 * журнала, итог и вердикт.
 */
export function formatLanchesterReportRu(
  scenario: LanchesterScenario,
  result: LanchesterResult,
): string {
  const lines: string[] = [];
  const lawRu: string =
    scenario.law === "square" ? "квадратичный закон" : "линейный закон";
  lines.push(
    `АТТРИЦИЯ: ${scenario.forceA.name} против ${scenario.forceB.name} (${lawRu})`,
  );
  lines.push(
    `Начальные силы: ${scenario.forceA.initialStrength} против ` +
      `${scenario.forceB.initialStrength}; местность — ${scenario.terrain}` +
      (scenario.defender !== null
        ? `, обороняется ${scenario.defender === "a" ? scenario.forceA.name : scenario.forceB.name}`
        : ", встречный бой"),
  );
  lines.push(
    `Эффективная летальность: A=${result.effectiveAlpha.toFixed(4)}, ` +
      `B=${result.effectiveBeta.toFixed(4)} (с учётом качества, террейна, РЭБ и воздуха)`,
  );
  for (const line of summarizeDailyLog(result, scenario)) {
    lines.push(`- ${line}`);
  }
  lines.push(
    `Итог за ${result.durationDays} суток: остаток A=${Math.round(result.finalStrengthA)}, ` +
      `B=${Math.round(result.finalStrengthB)}; потери A=${Math.round(result.totalLossesA)}, ` +
      `B=${Math.round(result.totalLossesB)}; обмен ${result.exchangeRatio === Number.POSITIVE_INFINITY ? "∞" : result.exchangeRatio.toFixed(2)}`,
  );
  if (result.winnerLossPct !== null) {
    lines.push(
      `Цена победы: победитель потерял ${result.winnerLossPct.toFixed(1)}% начальной численности`,
    );
  }
  lines.push(`Вердикт: ${result.verdictRu}`);
  return lines.join("\n");
}
