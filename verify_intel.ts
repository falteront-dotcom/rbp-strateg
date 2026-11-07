// ─────────────────────────────────────────────────────────────────────────────
// Самопроверки модуля src/lib/intel (Волна 2 ROADMAP-3.0)
// Запуск: скомпилировать tsc вместе с модулем и выполнить node, либо tsx.
// Печатает PASS/FAIL по каждой проверке; код выхода 1 при любом провале.
// ─────────────────────────────────────────────────────────────────────────────

import {
  ADMIRALTY_CONFIDENCE_MATRIX,
  COMBINED_ASSESSMENTS,
  applyDowngrades,
  confidenceFromGrade,
  formatAdmiraltyCode,
  parseAdmiraltyCode,
  type AdmiraltyContext,
} from "./src/lib/intel/admiralty";
import {
  baseGradeForSource,
  getSourceProfile,
  provenanceCompleteness,
  requiresQuarantine,
  type ValueProvenance,
} from "./src/lib/intel/provenance";
import {
  SAMPLE_ACH_EVIDENCE,
  SAMPLE_ACH_HYPOTHESES,
  SAMPLE_ACH_MATRIX,
  analyzeACH,
  validateACHInput,
} from "./src/lib/intel/ach";
import {
  IW_CATALOG,
  indicatorsByCategory,
  type IWCategory,
} from "./src/lib/intel/iw-catalog";
import { observe, scoreIW } from "./src/lib/intel/iw-scoring";
import {
  PIR_TEMPLATES,
  assessCoverage,
  buildCollectionPlan,
  summarizeGaps,
  type PIRInstance,
} from "./src/lib/intel/pir";
import { validateBriefing } from "./src/lib/intel/icd203";
import {
  DECEPTION_INDICATORS,
  assessDeceptionRisk,
} from "./src/lib/intel/deception";

let failures = 0;
let total = 0;

function check(name: string, condition: boolean, detail?: string): void {
  total += 1;
  if (condition) {
    console.log(`PASS  ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

// ─── 1. Адмиралтейский грейдинг ──────────────────────────────────────────────

check(
  "admiralty: confidence B2 = 0.87",
  confidenceFromGrade({ source: "B", info: 2 }) === 0.87,
  `получено ${confidenceFromGrade({ source: "B", info: 2 })}`,
);
check(
  "admiralty: confidence A1 = 0.98 (максимум матрицы)",
  ADMIRALTY_CONFIDENCE_MATRIX.A[1] === 0.98,
);
const parsed = parseAdmiraltyCode("B-2");
check(
  "admiralty: parse/format round-trip B-2 → B2",
  parsed !== null && parsed.source === "B" && parsed.info === 2 && formatAdmiraltyCode(parsed) === "B2",
);
check(
  "admiralty: матрица полна (36 комбинаций, все confidence в (0;1])",
  COMBINED_ASSESSMENTS.length === 36 &&
    COMBINED_ASSESSMENTS.every((a) => a.confidence > 0 && a.confidence <= 1),
);
const untestedCtx: AdmiraltyContext = {
  sourcePreviouslyTested: false,
  confirmedReports: 0,
  refutedReports: 0,
  corroboratingSources: 2,
  dataAgeMonths: 1,
  deceptionHistory: false,
  isSecondHand: false,
  directlyObserved: true,
};
const downgraded = applyDowngrades({ source: "B", info: 2 }, untestedCtx);
check(
  "admiralty: непроверенный источник понижается до F (DG-01)",
  downgraded.adjusted.source === "F" && downgraded.appliedRuleIds.includes("DG-01"),
  `adjusted=${formatAdmiraltyCode(downgraded.adjusted)}, rules=${downgraded.appliedRuleIds.join(",")}`,
);
check(
  "admiralty: понижение снижает confidence",
  downgraded.confidenceAfter < downgraded.confidenceBefore,
);

// ─── 2. Провенанс ────────────────────────────────────────────────────────────

const sipriGrade = baseGradeForSource("sipri");
const gfpGrade = baseGradeForSource("gfp");
check(
  "provenance: базовый грейд SIPRI = B2",
  sipriGrade.source === "B" && sipriGrade.info === 2,
);
check(
  "provenance: базовый грейд GFP = D3 (закрытая методология)",
  gfpGrade.source === "D" && gfpGrade.info === 3,
);
check(
  "provenance: собственная оценка проекта имеет грейд источника F",
  getSourceProfile("custom").baseReliability === "F",
);
const fullProvenance: ValueProvenance = {
  field: "totalTanks",
  sourceId: "iiss",
  dataYear: 2025,
  method: "manual-curation",
  grade: { source: "B", info: 2 },
  urlDescriptionRu: "iiss.org — The Military Balance 2025",
  retrievedAt: "2026-11-07",
  noteRu: "Проверка полноты провенанса.",
};
check(
  "provenance: полнота полного провенанса = 1",
  provenanceCompleteness(fullProvenance) === 1,
  `получено ${provenanceCompleteness(fullProvenance)}`,
);
const llmValue: ValueProvenance = {
  ...fullProvenance,
  field: "fpvProductionMonthly",
  sourceId: "custom",
  method: "llm-generated",
  grade: { source: "F", info: 6 },
};
check(
  "provenance: llm-generated значение уходит в карантин",
  requiresQuarantine(llmValue) === true,
);
check(
  "provenance: проверенное значение не в карантине",
  requiresQuarantine(fullProvenance) === false,
);

// ─── 3. ACH (учебный пример: 3 гипотезы × 6 свидетельств) ────────────────────

check(
  "ach: учебный пример валиден (validateACHInput = [])",
  validateACHInput(SAMPLE_ACH_HYPOTHESES, SAMPLE_ACH_EVIDENCE, SAMPLE_ACH_MATRIX).length === 0,
);
const ach = analyzeACH(SAMPLE_ACH_HYPOTHESES, SAMPLE_ACH_EVIDENCE, SAMPLE_ACH_MATRIX);
check(
  "ach: лидер — H2 (демонстрация силы), наименее опровергнутая гипотеза",
  ach.leaderHypothesisId === "H2",
  `лидер=${ach.leaderHypothesisId}`,
);
check(
  "ach: вывод устойчив к удалению одного свидетельства (fragileConclusion = false)",
  ach.fragileConclusion === false,
);
const e1diag = ach.diagnostics.find((d) => d.evidenceId === "E1");
check(
  "ach: E1 (госпитали и кровь) — высокодиагностичное свидетельство (> 0.8)",
  e1diag !== undefined && e1diag.diagnosticity > 0.8,
  `diagnosticity=${e1diag?.diagnosticity}`,
);
const scoreOf = (id: string): number =>
  ach.scores.find((s) => s.hypothesisId === id)?.weightedInconsistency ?? Number.NaN;
check(
  "ach: порядок опровержения H2 < H1 < H3",
  scoreOf("H2") < scoreOf("H1") && scoreOf("H1") < scoreOf("H3"),
  `H2=${scoreOf("H2")}, H1=${scoreOf("H1")}, H3=${scoreOf("H3")}`,
);

// ─── 4. Каталог I&W и скоринг ────────────────────────────────────────────────

check(
  "iw: каталог содержит 340 индикаторов (минимум по задаче — 150)",
  IW_CATALOG.length === 340,
  `получено ${IW_CATALOG.length}`,
);
const ALL_CATS: IWCategory[] = [
  "mobilization",
  "logistics",
  "medical",
  "ew-cyber",
  "nuclear",
  "defense-industry",
  "finance",
  "diplomacy",
  "information",
  "space",
];
check(
  "iw: по 34 индикатора в каждой из 10 категорий",
  ALL_CATS.every((c) => indicatorsByCategory(c).length === 34),
  ALL_CATS.map((c) => `${c}=${indicatorsByCategory(c).length}`).join(", "),
);
check(
  "iw: id индикаторов уникальны",
  new Set(IW_CATALOG.map((i) => i.id)).size === IW_CATALOG.length,
);
const AT = "2026-11-07T06:00:00Z";
const strongScenario = scoreIW("TST", [
  observe("medical-34", 1, 0.95, AT),
  observe("medical-32", 1, 0.95, AT),
  observe("medical-26", 1, 0.95, AT),
  observe("medical-25", 1, 0.95, AT),
  observe("logistics-33", 1, 0.95, AT),
  observe("logistics-26", 1, 0.95, AT),
  observe("logistics-27", 1, 0.95, AT),
  observe("logistics-32", 1, 0.95, AT),
  observe("logistics-31", 1, 0.95, AT),
  observe("logistics-25", 1, 0.95, AT),
  observe("mobilization-30", 1, 0.95, AT),
  observe("mobilization-34", 1, 0.95, AT),
  observe("mobilization-31", 1, 0.95, AT),
  observe("mobilization-27", 1, 0.95, AT),
  observe("mobilization-29", 1, 0.95, AT),
  observe("mobilization-26", 1, 0.95, AT),
  observe("diplomacy-32", 1, 0.95, AT),
  observe("diplomacy-31", 1, 0.95, AT),
  observe("diplomacy-30", 1, 0.95, AT),
  observe("diplomacy-25", 1, 0.95, AT),
  observe("diplomacy-29", 1, 0.95, AT),
  observe("ew-cyber-30", 1, 0.95, AT),
  observe("ew-cyber-32", 1, 0.95, AT),
  observe("ew-cyber-27", 1, 0.95, AT),
  observe("ew-cyber-34", 1, 0.95, AT),
  observe("ew-cyber-28", 1, 0.95, AT),
  observe("space-31", 1, 0.95, AT),
  observe("space-32", 1, 0.95, AT),
  observe("space-30", 1, 0.95, AT),
  observe("space-27", 1, 0.95, AT),
]);
check(
  "iw-scoring: сильный мультидоменный сценарий даёт уровень HIGH",
  strongScenario.level === "HIGH",
  `level=${strongScenario.level}, total=${strongScenario.totalScore.toFixed(1)}, active=${strongScenario.activeCategories}`,
);
const emptyScenario = scoreIW("TST", []);
check(
  "iw-scoring: пустой набор наблюдений → ROUTINE и 10 слепых категорий",
  emptyScenario.level === "ROUTINE" &&
    emptyScenario.blindCategories.length === 10 &&
    emptyScenario.totalScore === 0,
);

// ─── 5. ICD 203: валидатор сводки ────────────────────────────────────────────

const goodBriefing = validateBriefing(
  "Мы оцениваем, что противник, вероятно, начнёт операцию в ближайшие недели. " +
    "Наша аналитическая уверенность — умеренная, источники независимы. " +
    "Альтернативная гипотеза: активность является демонстрацией силы для принуждения к переговорам.",
  { hasAlternative: true, hasConfidenceStatement: true },
);
check(
  "icd203: корректная сводка проходит валидацию",
  goodBriefing.valid === true,
  goodBriefing.issues.map((i) => i.ruleId).join(","),
);
const badBriefing = validateBriefing(
  "Противник несомненно нападёт, это возможно уже завтра, исход предрешён.",
  { hasAlternative: false, hasConfidenceStatement: false },
);
const badRules = new Set(badBriefing.issues.map((i) => i.ruleId));
check(
  "icd203: абсолютная формулировка ловится правилом ICD-ABS",
  badBriefing.valid === false && badRules.has("ICD-ABS"),
  [...badRules].join(","),
);
check(
  "icd203: внешкальное «возможно» ловится правилом ICD-VAGUE",
  badRules.has("ICD-VAGUE"),
  [...badRules].join(","),
);

// ─── 6. PIR и план сбора ─────────────────────────────────────────────────────

check("pir: каталог шаблонов содержит 50 PIR", PIR_TEMPLATES.length === 50);
const pirInstance: PIRInstance = {
  id: "PIR-TEST-1",
  templateId: "PIR-INTE-01",
  countryIso: "TST",
  deadline: "2026-11-14",
  ownerRu: "Смена анализа",
};
const plan = buildCollectionPlan(pirInstance);
check(
  "pir: план сбора по шаблону приоритета 1 строится (2 задачи: OSINT, HUMINT)",
  plan.length === 2 && plan.every((t) => t.cadenceRu.startsWith("Ежедневно")),
  `задач=${plan.length}`,
);
const completedPlan = plan.map((t) => ({ ...t, status: "completed" as const }));
check(
  "pir: полное покрытие при всех задачах completed = 100%",
  assessCoverage(pirInstance.id, completedPlan).coveragePct === 100,
);
const gapPlan = plan.map((t, idx) => (idx === 0 ? { ...t, status: "gap" as const } : t));
const gapSummary = summarizeGaps([pirInstance], gapPlan);
check(
  "pir: пробел по PIR приоритета 1 фиксируется как критичный",
  gapSummary.criticalGapsRu.length === 1,
  `criticalGaps=${gapSummary.criticalGapsRu.length}`,
);

// ─── 7. Denial & Deception ───────────────────────────────────────────────────

check(
  "deception: каталог содержит 90 индикаторов (10 каналов × 9)",
  DECEPTION_INDICATORS.length === 90,
  `получено ${DECEPTION_INDICATORS.length}`,
);
const noDeception = assessDeceptionRisk({
  observedIndicatorIds: [],
  singleChannelDependence: false,
  adversaryAwareOfCollection: false,
});
check(
  "deception: пустой ввод → риск low, score 0",
  noDeception.level === "low" && noDeception.score === 0,
);
const deceptionRisk = assessDeceptionRisk({
  observedIndicatorIds: ["DD-media-01", "DD-media-02", "DD-media-03"],
  singleChannelDependence: true,
  adversaryAwareOfCollection: false,
});
check(
  "deception: три high-индикатора + зависимость от одного канала → critical",
  deceptionRisk.level === "critical",
  `level=${deceptionRisk.level}, score=${deceptionRisk.score}`,
);

// ─── Итог ────────────────────────────────────────────────────────────────────

console.log(`\nИтого: ${total - failures}/${total} проверок PASS, провалено: ${failures}`);
if (failures > 0) {
  process.exit(1);
}
