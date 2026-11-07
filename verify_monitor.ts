// ─────────────────────────────────────────────────────────────────────────────
// Самопроверки модулей monitor и brief (Волна 5 ROADMAP-3.0)
// Запуск: скомпилировать tsc вместе с модулями и выполнить node, либо через
// esbuild-register. Печатает PASS/FAIL по каждой проверке; код выхода 1
// при любом провале.
// ─────────────────────────────────────────────────────────────────────────────

import {
  buildSeriesRegistry,
  compareSnapshots,
  evaluateAll,
  evaluatePair,
  evaluateSeries,
  evaluateSnapshotRules,
  seriesByCountry,
  topChangesGlobal,
  type CountrySnapshot,
} from "./src/lib/monitor/index";
import {
  ALL_SNAPSHOTS,
  validateSnapshot,
} from "./src/lib/monitor/index";
import {
  BRIEF_TEMPLATES,
  buildDigestBriefInput,
  generateBrief,
} from "./src/lib/brief/index";
import { validateBriefing } from "./src/lib/intel/icd203";

let failures = 0;

function check(name: string, ok: boolean, detail: string): void {
  if (ok) {
    console.log(`PASS ${name} — ${detail}`);
  } else {
    failures += 1;
    console.log(`FAIL ${name} — ${detail}`);
  }
}

// ── 1. Реестр рядов: полнота ────────────────────────────────────────────────
const registry = buildSeriesRegistry();
check(
  "registry-size",
  registry.size() === 90 && registry.countries().length === 30,
  `снапшотов: ${registry.size()}, стран: ${registry.countries().length} (ожидалось 90/30)`,
);

// ── 2. Дельта бюджета считается верно (США 2023→2024: 916→997) ─────────────
const usa2023 = registry.at("USA", 2023);
const usa2024 = registry.at("USA", 2024);
if (usa2023 && usa2024) {
  const deltas = compareSnapshots(usa2023, usa2024);
  const budget = deltas.find((d) => d.metric === "budgetBnUsd");
  const ok =
    budget !== undefined &&
    Math.abs(budget.absolute - 81) < 0.001 &&
    budget.relativePct !== null &&
    Math.abs(budget.relativePct - (81 / 916) * 100) < 0.01;
  check(
    "delta-budget-usa",
    ok,
    budget
      ? `Δ=${budget.absolute.toFixed(1)} млрд $, ${budget.relativePct?.toFixed(2)}% (ожидалось 81.0 / 8.84%)`
      : "дельта бюджета не найдена",
  );
} else {
  check("delta-budget-usa", false, "снапшоты США не найдены");
}

// ── 3. Алерт на синтетическом удвоении производства ────────────────────────
function cloneWithShells(base: CountrySnapshot, shells: number): CountrySnapshot {
  return {
    ...base,
    production: base.production.map((line) =>
      line.kind === "shells_155"
        ? {
            ...line,
            annualUnits: { ...line.annualUnits, value: shells },
          }
        : line,
    ),
  };
}

if (usa2023) {
  const doubled = cloneWithShells(usa2023, 480);
  const alertsDoubled = evaluatePair(usa2023, doubled);
  check(
    "alert-production-doubling",
    alertsDoubled.some((a) => a.ruleId === "production-doubling" && a.level === "critical"),
    `алертов на удвоении: ${alertsDoubled.length}, есть production-doubling: ${alertsDoubled.some((a) => a.ruleId === "production-doubling")}`,
  );

  // ── 4. Шум не поднимает алертов (+3% к снарядам и бюджету) ───────────────
  const noisy: CountrySnapshot = {
    ...cloneWithShells(usa2023, 247),
    budgetBnUsd: { ...usa2023.budgetBnUsd, value: 943.5 },
  };
  const alertsNoise = evaluatePair(usa2023, noisy);
  check(
    "alert-noise-silent",
    alertsNoise.length === 0,
    `алертов на шуме (+3%): ${alertsNoise.length} (ожидалось 0)`,
  );
}

// ── 5. Реальные ряды: Украина — удвоение БПЛА, Израиль — скачок бюджета ────
const byCountry = seriesByCountry();
const ukrAlerts = evaluateSeries(byCountry.get("UKR") ?? []);
check(
  "alert-ukr-uav",
  ukrAlerts.some((a) => a.ruleId === "production-doubling" && a.iso3 === "UKR"),
  `алертов Украины: ${ukrAlerts.length}, удвоение БПЛА зафиксировано: ${ukrAlerts.some((a) => a.ruleId === "production-doubling")}`,
);
const allAlerts = evaluateAll(byCountry);
check(
  "alert-isr-budget",
  allAlerts.some((a) => a.ruleId === "budget-surge" && a.iso3 === "ISR"),
  `всего алертов по рядам: ${allAlerts.length}, скачок бюджета Израиля: ${allAlerts.some((a) => a.ruleId === "budget-surge" && a.iso3 === "ISR")}`,
);

// ── 6. Абсолютное правило: выносливость Украины ниже порога ─────────────────
const ukr2025 = registry.at("UKR", 2025);
const ukrSnapshotAlerts = ukr2025 ? evaluateSnapshotRules(ukr2025) : [];
check(
  "alert-ukr-endurance-threshold",
  ukrSnapshotAlerts.some((a) => a.ruleId === "endurance-below-threshold"),
  `алертов снапшота Украины-2025: ${ukrSnapshotAlerts.map((a) => a.ruleId).join(", ") || "нет"}`,
);

// ── 7. Глобальное ранжирование изменений работает ───────────────────────────
const topGlobal = topChangesGlobal(byCountry, 2023, 2024, 10);
check(
  "top-changes-global",
  topGlobal.length === 10 && topGlobal.every((d) => d.fromYear === 2023 && d.toYear === 2024),
  `топ-10 изменений 2023→2024 получен, первое: ${topGlobal[0]?.summaryRu ?? "—"}`,
);

// ── 8. Сводки всех шаблонов проходят ICD 203 и содержат BLUF + альтернативы ─
for (const template of BRIEF_TEMPLATES) {
  const brief = generateBrief(template);
  const direct = validateBriefing(brief.markdown, {
    hasAlternative: template.alternatives.length > 0,
    hasConfidenceStatement: true,
  });
  const hasBluf = brief.markdown.includes("## BLUF");
  const hasAlternatives = brief.markdown.includes("## Альтернативы");
  const hasChange = brief.markdown.includes("## Что изменит оценку");
  check(
    `brief-${template.kind}`,
    brief.validation.valid && direct.valid && hasBluf && hasAlternatives && hasChange,
    `валидатор: ${brief.validation.valid}, BLUF: ${hasBluf}, альтернативы: ${hasAlternatives}, ` +
      `ошибок валидации: ${brief.validation.issues.filter((i) => i.severity === "error").length}` +
      (brief.validation.issues.length > 0
        ? `, замечания: ${brief.validation.issues.map((i) => i.ruleId).join(", ")}`
        : ""),
  );
}

// ── 9. Все снапшоты рядов валидны по форме ──────────────────────────────────
const invalidSnapshots = ALL_SNAPSHOTS.filter(
  (s) => validateSnapshot(s).length > 0,
);
check(
  "snapshots-shape",
  invalidSnapshots.length === 0,
  `снапшотов с проблемами формы: ${invalidSnapshots.length} из ${ALL_SNAPSHOTS.length}`,
);

// ── 10. Дайджест мониторинга собирается в валидную черновую сводку ──────────
const digestInput = buildDigestBriefInput(allAlerts, topGlobal, {
  dateIso: "2026-01-15",
  periodRu: "2023 → 2025",
  maxJudgments: 5,
});
const digest = generateBrief(digestInput);
check(
  "digest-brief",
  digest.markdown.includes("ЧЕРНОВИК") &&
    digest.markdown.includes("## BLUF") &&
    digest.validation.valid,
  `дайджест: суждений ${digestInput.judgments.length}, валидатор ICD 203: ${digest.validation.valid}`,
);

console.log(
  failures === 0
    ? "\nИТОГ: все проверки PASS"
    : `\nИТОГ: провалов: ${failures}`,
);
process.exit(failures === 0 ? 0 : 1);
