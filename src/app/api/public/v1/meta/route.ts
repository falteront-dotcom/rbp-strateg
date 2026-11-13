// ─────────────────────────────────────────────────────────────────────────────
// GET /api/public/v1/meta — паспорт публичного API v1: версия модели, веса
// компонентов (DEFAULT_WEIGHTS_BP3), концентрация Dirichlet
// (DEFAULT_WEIGHT_CONCENTRATION), источники данных, покрытие бенчмарков
// (качественные BP_BENCHMARKS + GFP-снапшот), лимиты и ссылки на методологию.
// Все числа — из кода и констант, ничего не дублируется руками.
// Контракт: docs/API.md.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import {
  BP3_COMPONENTS,
  BP3_COMPONENT_LABELS_RU,
  DEFAULT_WEIGHTS_BP3,
  DEFAULT_WEIGHT_CONCENTRATION,
} from "@/lib/bp3";
import { BP_BENCHMARKS } from "@/lib/bp/benchmarks";
import { GFP_RANKINGS_2025 } from "@/scripts/data-pipeline/scrape-gfp";
import { COUNTRIES_COVERED } from "@/lib/coverage";
import { rateLimitPerMinute } from "@/lib/rate-limit";
import { clientIp, rateLimitResponse, PUBLIC_CACHE_CONTROL } from "../guard";

export const runtime = "nodejs";

/** Источники данных модели — тот же список, что в досье и методологии. */
const DATA_SOURCES = [
  "SIPRI Military Expenditure Database",
  "Global Firepower 2025 (снапшот листинга)",
  "World Bank Open Data",
  "IISS Military Balance",
] as const;

export async function GET(request: Request): Promise<NextResponse> {
  const limited = rateLimitResponse(clientIp(request));
  if (limited) return limited;

  const weights = BP3_COMPONENTS.map((key) => ({
    key,
    labelRu: BP3_COMPONENT_LABELS_RU[key],
    weight: DEFAULT_WEIGHTS_BP3[key],
  }));

  return NextResponse.json(
    {
      apiVersion: "v1",
      model: {
        id: "bp3",
        version: "3.0",
        nameRu: "БП 3.0",
        components: BP3_COMPONENTS.length,
        weights,
        weightsSum: weights.reduce((sum, w) => sum + w.weight, 0),
        // κ Dirichlet: веса тянутся на каждой итерации MC, P10/P90
        // покрывают весовую неопределённость (см. /v3/methodology).
        weightConcentration: DEFAULT_WEIGHT_CONCENTRATION,
        weightPolicyRu:
          "веса экспертные (elicitation), не калиброваны по исходам конфликтов",
      },
      data: {
        sources: DATA_SOURCES,
        countriesCovered: COUNTRIES_COVERED,
        benchmarks: {
          qualitative: BP_BENCHMARKS.length,
          gfpReference: GFP_RANKINGS_2025.length,
        },
      },
      limits: {
        rateLimitPerMinute: rateLimitPerMinute(),
        rateLimitPolicyRu: "token bucket на IP, in-memory на инстанс",
      },
      links: {
        methodology: "/v3/methodology",
        weightsElicitation: "docs/weights-elicitation.md",
        apiContract: "docs/API.md",
      },
    },
    { headers: { "cache-control": PUBLIC_CACHE_CONTROL } },
  );
}
