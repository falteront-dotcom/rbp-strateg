// ─────────────────────────────────────────────────────────────────────────────
// Валидация параметров сценария для POST /api/what-if
//
// Раньше роут делал `{ ...DEFAULT_SCENARIO_PARAMS, ...body.params }`: опечатка
// в имени (budgetMultiplier вместо budgetChange) молча игнорировалась, и API
// возвращал сценарий, равный базовому BP. Аналитик видел «бюджет ни на что не
// влияет», хотя запрос был неправильный. Теперь неизвестный ключ — это 400.
//
// Списки ключей и типов выводятся из DEFAULT_SCENARIO_PARAMS, а не пишутся
// руками: движок добавил параметр — валидация узнаёт об этом сама.
// ─────────────────────────────────────────────────────────────────────────────

import {
  DEFAULT_SCENARIO_PARAMS,
  type AllianceOption,
  type ScenarioParams,
} from "./what-if-engine";

/** Допустимые значения переключения альянса (синхронно с AllianceOption). */
const ALLIANCE_OPTIONS: readonly AllianceOption[] = ["NATO", "CSTO", "BRICS", "Neutral", "AUKUS"];

const ALLOWED_KEYS = Object.keys(DEFAULT_SCENARIO_PARAMS) as (keyof ScenarioParams)[];
const NUMBER_KEYS = ALLOWED_KEYS.filter((key) => typeof DEFAULT_SCENARIO_PARAMS[key] === "number");
const BOOLEAN_KEYS = ALLOWED_KEYS.filter((key) => typeof DEFAULT_SCENARIO_PARAMS[key] === "boolean");

export type ScenarioParamsValidation =
  | { ok: true; params: ScenarioParams; supplied: Partial<ScenarioParams> }
  | { ok: false; error: string };

/**
 * Проверяет присланные параметры. Отсутствие params — валидно (все дефолты).
 * `supplied` содержит только присланные ключи: роут строит из них список
 * изменённых входов для объяснения сценария.
 */
export function validateScenarioParams(input: unknown): ScenarioParamsValidation {
  if (input === undefined) {
    return { ok: true, params: { ...DEFAULT_SCENARIO_PARAMS }, supplied: {} };
  }

  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, error: "params must be an object" };
  }

  const record = input as Record<string, unknown>;

  const unknown = Object.keys(record).filter(
    (key) => !ALLOWED_KEYS.includes(key as keyof ScenarioParams),
  );
  if (unknown.length > 0) {
    return {
      ok: false,
      error: `Unknown params: ${unknown.join(", ")}. Allowed: ${ALLOWED_KEYS.join(", ")}`,
    };
  }

  for (const key of NUMBER_KEYS) {
    if (!(key in record)) continue;
    const value = record[key];
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return { ok: false, error: `params.${key} must be a finite number` };
    }
  }

  for (const key of BOOLEAN_KEYS) {
    if (!(key in record)) continue;
    if (typeof record[key] !== "boolean") {
      return { ok: false, error: `params.${key} must be a boolean` };
    }
  }

  if ("allianceSwitch" in record) {
    const value = record.allianceSwitch;
    const allowed = typeof value === "string" && (ALLIANCE_OPTIONS as readonly string[]).includes(value);
    if (value !== null && !allowed) {
      return {
        ok: false,
        error: `params.allianceSwitch must be null or one of: ${ALLIANCE_OPTIONS.join(", ")}`,
      };
    }
  }

  const supplied = record as Partial<ScenarioParams>;
  return { ok: true, params: { ...DEFAULT_SCENARIO_PARAMS, ...supplied }, supplied };
}
