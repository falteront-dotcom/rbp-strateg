/**
 * Серверный bootstrap Next.js — выполняется при старте процесса.
 *
 * Пересобирает производную SQLite-базу из сидов и сгенерированных данных,
 * поэтому приложение полноценно работает на хостингах с эфемерным диске
 * (Render free, контейнеры) без ручного запуска /api/init-db.
 *
 * Отказ сида НЕ блокирует старт: главная страница и карта работают без БД,
 * но API-роуты данных в этом случае отвечают 500 (openReadonlyDatabase
 * бросает при несозданной базе) — состояние видно снаружи через /api/health
 * (503 «сид не завершён»), ручной пересев — /api/init-db.
 *
 * Self-ping: на Render free инстанс засыпает после ~15 минут тишины
 * (первый запрос потом ждёт десятки секунд). Пока процесс жив, он сам
 * пингует свой публичный URL каждые 5 минут — держатель не зависит
 * от внешних кронов. Выключается RBP_SELF_PING=off; локально (без
 * RENDER_EXTERNAL_URL) — no-op.
 */

const SELF_PING_INTERVAL_MS = 5 * 60 * 1000;
const SELF_PING_TIMEOUT_MS = 10_000;

function startSelfPing() {
  const base = process.env.RENDER_EXTERNAL_URL;
  if (!base || process.env.RBP_SELF_PING === "off") return;
  const url = `${base}/api/live`;
  const ping = async () => {
    try {
      const res = await fetch(url, {
        method: "HEAD",
        signal: AbortSignal.timeout(SELF_PING_TIMEOUT_MS),
      });
      if (!res.ok) console.error(`[self-ping] ${url} → HTTP ${res.status}`);
    } catch (err) {
      console.error(`[self-ping] ${url} недоступен:`, err instanceof Error ? err.message : err);
    }
  };
  const timer = setInterval(ping, SELF_PING_INTERVAL_MS);
  // таймер не должен держать процесс живым при завершении
  timer.unref?.();
  console.log(`[self-ping] включён: HEAD ${url} каждые 5 мин`);
}

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.RBP_AUTO_SEED === "off") return;
  try {
    const { initializeDatabase } = await import("./db/bootstrap");
    const result = initializeDatabase();
    console.log(
      `[bootstrap] БД готова: стран ${result.countriesSeeded}, БП ${result.bpCalculated}, знания ${JSON.stringify(result.knowledge)}`,
    );
  } catch (err) {
    // Старт сервера не блокируем (см. комментарий в шапке): сайт жив,
    // /api/health показывает 503, /api/init-db остаётся для ручного пересева.
    console.error("[bootstrap] инициализация БД не удалась:", err);
  }
  startSelfPing();
}
