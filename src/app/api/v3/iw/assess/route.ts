// ─────────────────────────────────────────────────────────────────────────────
// API /api/v3/iw/assess — скоринг предупреждения I&W по наблюдениям (intel)
// POST { iso?: string, states: Record<string, string> }
//   states: indicatorId → состояние наблюдения:
//     "0.75"          — числовая сила проявления 0..1;
//     "full"/"strong" — 1.0; "observed" — 0.75;
//     "partial"       — 0.5; "weak" — 0.25;
//     "none"/"absent" — индикатор не проявлен (пропускается).
//   Неизвестные id индикаторов не роняют запрос: возвращаются в ignored.
// → IWScoringResult из intel/iw-scoring (scoreIW)
// РБП-Стратег 3.0
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { findIndicator } from "@/lib/intel/iw-catalog";
import {
  observe,
  scoreIW,
  type ObservedIndicator,
} from "@/lib/intel/iw-scoring";

/** Уверенность наблюдения по умолчанию (нет грейда сообщения на входе). */
const DEFAULT_SOURCE_CONFIDENCE = 0.7;

/** Разбор состояния индикатора в силу проявления 0..1; null — пропустить. */
function parseState(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return Math.min(1, Math.max(0, raw));
  }
  if (typeof raw !== "string") {
    return null;
  }
  const text = raw.trim().toLowerCase();
  if (text === "") {
    return null;
  }
  const numeric = Number(text);
  if (Number.isFinite(numeric)) {
    return Math.min(1, Math.max(0, numeric));
  }
  switch (text) {
    case "full":
    case "strong":
    case "confirmed":
    case "полностью":
    case "подтверждено":
      return 1;
    case "observed":
    case "active":
    case "да":
    case "true":
    case "наблюдается":
      return 0.75;
    case "partial":
    case "частично":
      return 0.5;
    case "weak":
    case "слабо":
      return 0.25;
    default:
      return null;
  }
}

/** POST /api/v3/iw/assess — оценка уровня предупреждения по состояниям. */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();
    if (typeof body !== "object" || body === null) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const record = body as Record<string, unknown>;
    const states = record.states;
    if (typeof states !== "object" || states === null) {
      return NextResponse.json(
        { error: "Missing states object: Record<indicatorId, state>" },
        { status: 400 },
      );
    }
    const iso: string =
      typeof record.iso === "string" && record.iso.trim() !== ""
        ? record.iso.trim().toUpperCase()
        : "GLOBAL";

    const observedAt = new Date().toISOString().slice(0, 10);
    const observations: ObservedIndicator[] = [];
    const ignored: string[] = [];
    for (const [indicatorId, rawState] of Object.entries(
      states as Record<string, unknown>,
    )) {
      if (findIndicator(indicatorId) === undefined) {
        ignored.push(indicatorId);
        continue;
      }
      const strength = parseState(rawState);
      if (strength === null || strength <= 0) {
        continue;
      }
      observations.push(
        observe(indicatorId, strength, DEFAULT_SOURCE_CONFIDENCE, observedAt),
      );
    }

    const result = scoreIW(iso, observations);
    return NextResponse.json({ ...result, ignoredIndicators: ignored });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
