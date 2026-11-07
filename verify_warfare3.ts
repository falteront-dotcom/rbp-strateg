// ─────────────────────────────────────────────────────────────────────────────
// Самопроверки Волны 3 «Устойчивость в войне» (warfare3)
// Запуск: npx tsx verify_warfare3.ts (или скомпилировать tsc и выполнить node)
// Каждая проверка печатает PASS/FAIL; итоговая строка — сводка,
// код выхода 1 при любом FAIL.
// РБП-Стратег 3.0
// ─────────────────────────────────────────────────────────────────────────────

import {
  analyticOutcome,
  simulateLanchester,
} from "./src/lib/warfare3/lanchester.js";
import type {
  LanchesterAnalyticPrediction,
  LanchesterResult,
  LanchesterScenario,
} from "./src/lib/warfare3/lanchester.js";
import {
  assessCountryEndurance,
  monthsToExhaustion,
} from "./src/lib/warfare3/endurance.js";
import type {
  CountryEnduranceReport,
  EnduranceCategoryInput,
} from "./src/lib/warfare3/endurance.js";
import {
  buildMobilizationPlan,
  generateMobilizationWaves,
} from "./src/lib/warfare3/mobilization.js";
import type { MobilizationPlanResult } from "./src/lib/warfare3/mobilization.js";
import {
  distanceDecayFactor,
  projectForce,
} from "./src/lib/warfare3/projection.js";
import type { ProjectionResult } from "./src/lib/warfare3/projection.js";
import {
  getSustainabilityProfile,
  TOP30_SUSTAINABILITY,
} from "./src/lib/warfare3/data/top30-sustainability.js";
import type {
  CountrySustainabilityProfile,
} from "./src/lib/warfare3/data/top30-sustainability.js";

// ─────────────────────────────────────────────────────────────────────────────
// Мини-каркас проверок
// ─────────────────────────────────────────────────────────────────────────────

let passedCount: number = 0;
let failedCount: number = 0;

function check(nameRu: string, condition: boolean, details: string): void {
  if (condition) {
    passedCount += 1;
    console.log(`PASS  ${nameRu} — ${details}`);
  } else {
    failedCount += 1;
    console.log(`FAIL  ${nameRu} — ${details}`);
  }
}

function approxEqual(left: number, right: number, tolerance: number): boolean {
  return Math.abs(left - right) <= tolerance;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Ланчестер: численное превосходство 3:1 при равном качестве
// ─────────────────────────────────────────────────────────────────────────────

const scenario3to1: LanchesterScenario = {
  forceA: {
    name: "Сильный (3000)",
    initialStrength: 3000,
    quality: 0.02,
    moraleBreakFraction: 0,
    reinforcementsPerDay: 0,
  },
  forceB: {
    name: "Слабый (1000)",
    initialStrength: 1000,
    quality: 0.02,
    moraleBreakFraction: 0,
    reinforcementsPerDay: 0,
  },
  law: "square",
  terrain: "plains",
  defender: null,
  ewSuperiority: { side: null, level: "none" },
  airSuperiority: { side: null, level: "none" },
  maxDays: 365,
  stepDays: 0.25,
  exhaustionFraction: 0,
  linearScale: null,
};

const result3to1: LanchesterResult = simulateLanchester(scenario3to1);
check(
  "Ланчестер 3:1, квадратичный закон: побеждает численно сильнейший",
  result3to1.winner === "a" && result3to1.outcome === "annihilation",
  `winner=${result3to1.winner}, outcome=${result3to1.outcome}, дней=${result3to1.durationDays}`,
);

// Аналитический остаток победителя: sqrt(3000^2 - 1000^2) = sqrt(8 000 000) ≈ 2828.4
const analytic3to1: LanchesterAnalyticPrediction = analyticOutcome(scenario3to1);
check(
  "Ланчестер 3:1: аналитический остаток победителя sqrt(A0^2-B0^2)",
  analytic3to1.winner === "a" &&
    approxEqual(analytic3to1.winnerRemaining, Math.sqrt(8_000_000), 0.01),
  `остаток=${analytic3to1.winnerRemaining.toFixed(1)}, ожидалось ${Math.sqrt(8_000_000).toFixed(1)}`,
);

check(
  "Ланчестер 3:1: численная симуляция близка к аналитике",
  approxEqual(result3to1.finalStrengthA, analytic3to1.winnerRemaining, 60),
  `симуляция=${result3to1.finalStrengthA.toFixed(1)}, аналитика=${analytic3to1.winnerRemaining.toFixed(1)}`,
);

check(
  "Ланчестер 3:1: обмен потерями в пользу сильного",
  result3to1.exchangeRatio > 2,
  `exchangeRatio=${result3to1.exchangeRatio.toFixed(2)} (потери слабого к потерям сильного)`,
);

// Линейный закон на том же сценарии: победитель тот же, но темп и остаток иные.
// Горизонт расширен: при линейном законе потери сторон равны по абсолютной
// величине, слабый противник тает экспоненциально и бой длится на порядок
// дольше квадратичного — это демонстрируемое свойство закона, а не дефект.
const linear3to1: LanchesterResult = simulateLanchester({
  ...scenario3to1,
  law: "linear",
  maxDays: 2000,
});
check(
  "Ланчестер 3:1, линейный закон: победитель сохраняется",
  linear3to1.winner === "a",
  `winner=${linear3to1.winner}, дней=${linear3to1.durationDays} против ${result3to1.durationDays} у квадратичного`,
);

// ─────────────────────────────────────────────────────────────────────────────
// 2. Endurance: страна с нулевым производством истощается по формуле
// ─────────────────────────────────────────────────────────────────────────────

const zeroProductionInput: EnduranceCategoryInput = {
  stock: 30_000,
  dailyConsumption: 1_000,
  monthlyProduction: 0,
  monthlyImports: 0,
};
const zeroProductionMonths: number = monthsToExhaustion(zeroProductionInput);
check(
  "Endurance: нулевое производство — горизонт равен запасы/(расход x 30)",
  approxEqual(zeroProductionMonths, 30_000 / (1_000 * 30), 1e-9),
  `месяцев=${zeroProductionMonths}, ожидался ровно 1 месяц`,
);

const sustainableInput: EnduranceCategoryInput = {
  stock: 10_000,
  dailyConsumption: 100,
  monthlyProduction: 3_000,
  monthlyImports: 500,
};
check(
  "Endurance: приток >= расхода — категория устойчива (Infinity)",
  monthsToExhaustion(sustainableInput) === Number.POSITIVE_INFINITY,
  "производство 3000 + импорт 500 против расхода 3000 в месяц",
);

const usaProfile: CountrySustainabilityProfile | undefined =
  getSustainabilityProfile("USA");
check(
  "Данные: профиль USA присутствует в топ-30",
  usaProfile !== undefined && TOP30_SUSTAINABILITY.length === 30,
  `профилей загружено: ${TOP30_SUSTAINABILITY.length}`,
);

if (usaProfile !== undefined) {
  const usaReport: CountryEnduranceReport = assessCountryEndurance(usaProfile);
  check(
    "Endurance USA: бутылочное горлышко определено и конечно или устойчиво",
    usaReport.bottleneck.labelRu.length > 0 &&
      usaReport.overallScore >= 0 &&
      usaReport.overallScore <= 100,
    `горлышко=${usaReport.bottleneck.labelRu}, балл=${usaReport.overallScore}`,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Мобилизация: волны не превышают потолок
// ─────────────────────────────────────────────────────────────────────────────

const rusProfile: CountrySustainabilityProfile | undefined =
  getSustainabilityProfile("RUS");
check(
  "Данные: профиль RUS присутствует в топ-30",
  rusProfile !== undefined,
  "нужен для мобилизационной проверки",
);

if (rusProfile !== undefined) {
  const plan: MobilizationPlanResult = buildMobilizationPlan(rusProfile, {
    firstWaveSize: 300_000,
    waveDecay: 0.9,
    maxWaves: 12,
    waveIntervalMonths: 2,
    trainingMonths: 4,
    trainingDecayPerWave: 0.25,
    minTrainingMonths: 1,
    baseQuality: 0.9,
    qualityDecayPerWave: 0.93,
    trainingHorizonMonths: 24,
    trainingThroughputPerMonth: 40_000,
  });
  check(
    "Мобилизация RUS: суммарные волны не превышают потолок",
    plan.totalMobilized <= plan.ceiling.ceiling,
    `мобилизовано=${plan.totalMobilized}, потолок=${plan.ceiling.ceiling} (${plan.ceiling.bindingConstraint})`,
  );

  const wavesCheck: { waves: Array<{ cumulativeMobilized: number }> } =
    generateMobilizationWaves(rusProfile.mobilizationBase, {
      firstWaveSize: 500_000,
      waveDecay: 1,
      maxWaves: 20,
      waveIntervalMonths: 1,
      trainingMonths: 3,
      trainingDecayPerWave: 0,
      minTrainingMonths: 1,
      baseQuality: 0.9,
      qualityDecayPerWave: 0.95,
      trainingHorizonMonths: 24,
      trainingThroughputPerMonth: 40_000,
    });
  const lastCumulative: number =
    wavesCheck.waves.length > 0
      ? wavesCheck.waves[wavesCheck.waves.length - 1].cumulativeMobilized
      : 0;
  check(
    "Мобилизация: агрессивный план упирается в потолок, а не пробивает его",
    lastCumulative <= plan.ceiling.ceiling && lastCumulative > 0,
    `накопленно=${lastCumulative} при потолке=${plan.ceiling.ceiling}`,
  );

  const qualityMonotonic: boolean = plan.waves.every(
    (wave, idx): boolean =>
      idx === 0 || wave.qualityFactor <= plan.waves[idx - 1].qualityFactor,
  );
  check(
    "Мобилизация: качество волн не растёт с номером волны",
    qualityMonotonic,
    `качество первой волны=${plan.waves.length > 0 ? plan.waves[0].qualityFactor.toFixed(2) : "н/д"}`,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Проекция силы: затухание и закрытый chokepoint
// ─────────────────────────────────────────────────────────────────────────────

check(
  "Проекция: доставленный потенциал падает с дистанцией",
  distanceDecayFactor(5_000, "naval") < distanceDecayFactor(1_000, "naval") &&
    distanceDecayFactor(0, "naval") === 1,
  `1000 км=${distanceDecayFactor(1_000, "naval").toFixed(2)}, 5000 км=${distanceDecayFactor(5_000, "naval").toFixed(2)}`,
);

const closedRoute: ProjectionResult = projectForce({
  basePotential: 90,
  directDistanceKm: 1_800,
  domain: "naval",
  bases: [],
  allySupport: 0.5,
  route: [{ chokepointId: "bosphorus", control: "closed" }],
  detourDistanceKm: 0,
});
check(
  "Проекция: закрытый Босфор обнуляет морскую проекцию",
  closedRoute.deliveredPotential === 0 && closedRoute.routeFactor === 0,
  `delivered=${closedRoute.deliveredPotential}, bottleneck=${closedRoute.bottleneckChokepoint?.nameRu ?? "нет"}`,
);

// ─────────────────────────────────────────────────────────────────────────────
// Сводка
// ─────────────────────────────────────────────────────────────────────────────

console.log("");
console.log(
  `ИТОГ: ${passedCount} PASS, ${failedCount} FAIL из ${passedCount + failedCount} проверок Волны 3`,
);
if (failedCount > 0) {
  process.exit(1);
}
