// ─────────────────────────────────────────────────────────────────────────────
// Общие элементы роутов /api/public/v1/*: IP клиента и 429-ответ лимитера.
// Файл без route.ts — Next маршрутом не является, это внутренний хелпер.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * IP клиента: за прокси Render — первый адрес x-forwarded-for,
 * при прямом локальном обращении (e2e, dev) — константа 'local'.
 */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return "local";
}

/**
 * Проверить квоту IP; при превышении — готовый 429-ответ с Retry-After,
 * иначе null и роут продолжает обработку.
 */
export function rateLimitResponse(ip: string): NextResponse | null {
  const { allowed, retryAfterSec } = checkRateLimit(ip);
  if (allowed) {
    return null;
  }
  return NextResponse.json(
    { error: "rate limit exceeded", retryAfterSec },
    {
      status: 429,
      headers: {
        "retry-after": String(retryAfterSec),
        "cache-control": "no-store",
      },
    },
  );
}

/** Общий заголовок кэширования читаемых коллекций v1. */
export const PUBLIC_CACHE_CONTROL = "public, max-age=300";
