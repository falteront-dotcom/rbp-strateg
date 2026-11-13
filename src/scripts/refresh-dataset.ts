// ─────────────────────────────────────────────────────────────────────────────
// CLI живого обновления датасета из источников (World Bank + merge-validate).
//
// Запуск: npx tsx src/scripts/refresh-dataset.ts
// Требует посеянную БД (npm run db:seed). Тот же путь, что у
// POST /api/run-pipeline (refreshDatasetFromSources) — один код, без расхождений.
//
// Назначение в CI (pipeline-refresh.yml): еженедельный живой smoke-тест
// источников — ловит протухание URL/форматов до того, как оно станет
// аварией. Это НЕ обновление прод-данных: на Render free БД эфемерная,
// прод-данные = коммитные сиды (осознанный компромисс, см. bootstrap.ts).
// ─────────────────────────────────────────────────────────────────────────────

import { refreshDatasetFromSources } from "../lib/dataset/updater";

async function main(): Promise<void> {
  console.log("🔄 Живой refresh датасета из источников...");
  const result = await refreshDatasetFromSources();
  console.log(`✅ Стран записано: ${result.countriesWritten}`);
  console.log(`   Версия датасета: ${result.dataset.version}`);
  const summary = result.dataset.sourceSummary as Record<string, unknown>;
  console.log(`   Конфликты: ${JSON.stringify(summary.conflicts ?? 0)}`);
  console.log("   Топ-10:");
  for (const row of result.top10) {
    console.log(`   #${row.rank} ${row.iso} ${row.name} — ${row.totalBP.toFixed(1)}`);
  }
}

main().catch((err: unknown) => {
  console.error("❌ Pipeline упал:", err instanceof Error ? err.message : err);
  process.exit(1);
});
