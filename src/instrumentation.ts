/**
 * Серверный bootstrap Next.js — выполняется при старте процесса.
 *
 * Пересобирает производную SQLite-базу из сидов и сгенерированных данных,
 * поэтому приложение полноценно работает на хостингах с эфемерным диском
 * (Render free, контейнеры) без ручного запуска /api/init-db.
 */

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
    // Старт сервера не блокируем: API ответят пустыми состояниями,
    // а /api/init-db остаётся доступен для ручного пересева.
    console.error("[bootstrap] инициализация БД не удалась:", err);
  }
}
