/**
 * CLI-пересев базы: npx tsx src/scripts/init-db.ts (или npm run db:seed).
 *
 * Тонкая обёртка над initializeDatabase() — тем же кодом, что выполняется
 * при старте сервера (src/instrumentation.ts) и по POST /api/init-db.
 *
 * Раньше здесь была вторая, расходящаяся реализация сева: она вставляла
 * только часть стран (59), не сеяла пакеты знаний и не писала метаданные
 * сева. «Пересев» из CLI оставлял базу в состоянии, которое расходится с
 * эталоном, а полное восстановление молча требовало рестарта сервера.
 * Один путь сева убирает этот класс ошибок.
 */
import { initializeDatabase } from "../db/bootstrap";
import { DB_PATH } from "../db/runtime";

function main(): void {
  console.log("🔧 Initializing RBP-Strateg database...");
  console.log(`   DB path: ${DB_PATH}`);

  const result = initializeDatabase();

  console.log(`   Inserted ${result.countriesSeeded} countries`);
  console.log(`   Calculated BP for ${result.bpCalculated} countries`);
  console.log(`   Knowledge: ${JSON.stringify(result.knowledge)}`);

  console.log("\n🏆 Top 10 Countries by Combat Potential:");
  console.log("─".repeat(60));
  for (const bp of result.top10) {
    console.log(
      `  #${String(bp.rank).padStart(2)} ${bp.iso} ${bp.name.padEnd(20)} BP: ${bp.totalBP.toFixed(1).padStart(6)}`,
    );
  }
  console.log("─".repeat(60));
  console.log("\n✅ Database initialization complete!");
}

try {
  main();
} catch (err) {
  console.error("❌ Database initialization failed:", err);
  process.exit(1);
}
