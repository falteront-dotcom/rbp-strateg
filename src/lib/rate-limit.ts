// ─────────────────────────────────────────────────────────────────────────────
// Rate-limit публичного API (мост к продукту, путь B дорожной карты 2026-11-14).
//
// Token bucket на IP в памяти процесса. Render free — один инстанс без
// персистентного диска, поэтому in-memory бакеты честно описывают реальность:
// лимит на инстанс, после рестарта бакеты пусты (cold start даёт свежую квоту).
//
// Параметры:
//   - лимит: env RBP_RATE_LIMIT_PER_MIN запросов в минуту (по умолчанию 60),
//     битое/нулевое значение молча откатывается к дефолту;
//   - пополнение равномерное limit/60 в секунду, burst — до limit сразу;
//   - протухшие бакеты (10 минут без запросов) вычищаются раз в минуту,
//     чтобы Map не рос бесконечно на публичном трафике.
// ─────────────────────────────────────────────────────────────────────────────

export interface RateLimitResult {
  allowed: boolean;
  /** Секунды до следующего разрешённого запроса; 0, если запрос разрешён. */
  retryAfterSec: number;
}

/** Дефолтный лимит (запросов в минуту), если env не задан. */
export const DEFAULT_RATE_LIMIT_PER_MIN = 60;

interface TokenBucket {
  tokens: number;
  lastRefill: number;
  lastSeen: number;
}

const WINDOW_MS = 60_000;
const SWEEP_INTERVAL_MS = 60_000;
const BUCKET_TTL_MS = 10 * 60_000;

const buckets = new Map<string, TokenBucket>();
let lastSweepAt = 0;

/** Текущий лимит из env; NaN/<=0/несчислимое значение → дефолт. */
export function rateLimitPerMinute(
  env: Record<string, string | undefined> = process.env,
): number {
  const raw = env.RBP_RATE_LIMIT_PER_MIN;
  if (raw === undefined) {
    return DEFAULT_RATE_LIMIT_PER_MIN;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : DEFAULT_RATE_LIMIT_PER_MIN;
}

/** Вычистить бакеты, к которым не обращались дольше BUCKET_TTL_MS. */
function sweep(nowMs: number): void {
  if (nowMs - lastSweepAt < SWEEP_INTERVAL_MS) return;
  lastSweepAt = nowMs;
  for (const [ip, bucket] of buckets) {
    if (nowMs - bucket.lastSeen > BUCKET_TTL_MS) {
      buckets.delete(ip);
    }
  }
}

/**
 * Списать один токен для IP. Не ждёт и не ретраит: при отказе вызывающий
 * роут обязан ответить 429 с заголовком Retry-After = retryAfterSec.
 */
export function checkRateLimit(
  ip: string,
  nowMs: number = Date.now(),
): RateLimitResult {
  const limit = rateLimitPerMinute();
  const refillPerMs = limit / WINDOW_MS;
  sweep(nowMs);

  const bucket = buckets.get(ip);
  if (bucket === undefined) {
    buckets.set(ip, { tokens: limit - 1, lastRefill: nowMs, lastSeen: nowMs });
    return { allowed: true, retryAfterSec: 0 };
  }

  bucket.tokens = Math.min(
    limit,
    bucket.tokens + (nowMs - bucket.lastRefill) * refillPerMs,
  );
  bucket.lastRefill = nowMs;
  bucket.lastSeen = nowMs;

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return { allowed: true, retryAfterSec: 0 };
  }
  const waitForTokenMs = (1 - bucket.tokens) / refillPerMs;
  return {
    allowed: false,
    retryAfterSec: Math.max(1, Math.ceil(waitForTokenMs / 1000)),
  };
}
