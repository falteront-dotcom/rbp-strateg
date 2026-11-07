// ─────────────────────────────────────────────────────────────────────────────
// API /api/v3/warfare/duel — аттриционная симуляция Ланчестера (warfare3)
// POST тело = LanchesterScenario. Минимальная валидация: у обеих сторон
// есть конечная положительная initialStrength; остальные поля сценария
// при отсутствии заполняются консервативными значениями по умолчанию.
// → LanchesterResult из warfare3/simulateLanchester
// РБП-Стратег 3.0
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import {
  simulateLanchester,
  type DomainSuperiority,
  type LanchesterForce,
  type LanchesterLaw,
  type LanchesterScenario,
  type LanchesterSide,
  type LanchesterTerrain,
  type SuperiorityLevel,
} from "@/lib/warfare3";

const TERRAINS: readonly LanchesterTerrain[] = [
  "plains",
  "steppe",
  "forest",
  "mountains",
  "urban",
  "desert",
  "swamp",
  "coastal",
];

const SUPERIORITY_LEVELS: readonly SuperiorityLevel[] = [
  "none",
  "contested",
  "advantage",
  "dominance",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Сборка стороны боя: обязательна только численность, остальное — дефолты. */
function buildForce(raw: unknown, fallbackName: string): LanchesterForce | null {
  if (!isRecord(raw)) {
    return null;
  }
  const strength = finiteNumber(raw.initialStrength);
  if (strength === null || strength <= 0) {
    return null;
  }
  const quality = finiteNumber(raw.quality);
  const morale = finiteNumber(raw.moraleBreakFraction);
  const reinforcements = finiteNumber(raw.reinforcementsPerDay);
  return {
    name:
      typeof raw.name === "string" && raw.name.trim() !== ""
        ? raw.name
        : fallbackName,
    initialStrength: strength,
    quality: quality !== null && quality > 0 ? quality : 0.02,
    moraleBreakFraction: morale !== null ? clamp(morale, 0, 1) : 0.25,
    reinforcementsPerDay:
      reinforcements !== null ? Math.max(0, reinforcements) : 0,
  };
}

function buildSuperiority(raw: unknown): DomainSuperiority {
  if (!isRecord(raw)) {
    return { side: null, level: "none" };
  }
  const side: LanchesterSide | null =
    raw.side === "a" || raw.side === "b" ? raw.side : null;
  const level: SuperiorityLevel =
    typeof raw.level === "string" &&
    (SUPERIORITY_LEVELS as readonly string[]).includes(raw.level)
      ? (raw.level as SuperiorityLevel)
      : "none";
  return { side, level };
}

/** POST /api/v3/warfare/duel — симуляция боя по сценарию Ланчестера. */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();
    if (!isRecord(body)) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const forceA = buildForce(body.forceA, "Сторона A");
    const forceB = buildForce(body.forceB, "Сторона B");
    if (forceA === null || forceB === null) {
      return NextResponse.json(
        {
          error:
            "forceA.initialStrength and forceB.initialStrength must be positive numbers",
        },
        { status: 400 },
      );
    }

    const law: LanchesterLaw = body.law === "linear" ? "linear" : "square";
    const terrain: LanchesterTerrain =
      typeof body.terrain === "string" &&
      (TERRAINS as readonly string[]).includes(body.terrain)
        ? (body.terrain as LanchesterTerrain)
        : "plains";
    const defender: LanchesterSide | null =
      body.defender === "a" || body.defender === "b" ? body.defender : null;
    const maxDaysRaw = finiteNumber(body.maxDays);
    const stepDaysRaw = finiteNumber(body.stepDays);
    const exhaustionRaw = finiteNumber(body.exhaustionFraction);
    const linearScaleRaw = finiteNumber(body.linearScale);

    const scenario: LanchesterScenario = {
      forceA,
      forceB,
      law,
      terrain,
      defender,
      ewSuperiority: buildSuperiority(body.ewSuperiority),
      airSuperiority: buildSuperiority(body.airSuperiority),
      maxDays: maxDaysRaw !== null ? clamp(Math.round(maxDaysRaw), 1, 365) : 60,
      stepDays: stepDaysRaw !== null ? clamp(stepDaysRaw, 0.01, 1) : 0.25,
      exhaustionFraction:
        exhaustionRaw !== null ? clamp(exhaustionRaw, 0, 1) : 0.1,
      linearScale:
        linearScaleRaw !== null && linearScaleRaw > 0 ? linearScaleRaw : null,
    };

    const result = simulateLanchester(scenario);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
