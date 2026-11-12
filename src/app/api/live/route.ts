// ─────────────────────────────────────────────────────────────────────────────
// API /api/live — liveness-проба для Render (healthCheckPath).
//
// Намеренно не касается БД: главная страница и карта работают без базы,
// поэтому частичный отказ сида не должен гасить весь сервис. Глубокая
// правда о данных живёт в /api/health (readiness, для мониторинга),
// а не в лайвнессе: стойкий 503 на healthCheckPath по докам Render
// останавливает трафик через 15 с и рестартует инстанс через 60 с —
// цикл рестартов ради живой половины сайта.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    { ok: true, uptimeSec: Math.round(process.uptime()) },
    { headers: { "cache-control": "no-store" } },
  );
}
