/**
 * CLI: генерация еженедельного дайджеста из реальной БД.
 *
 *   npx tsx src/scripts/generate-digest.ts
 *
 * Собирает данные через фасад v3 (рейтинг БП 3.0 + лента алертов) и пишет
 * docs/digests/digest-<date>.md. Дайджест живёт в репозитории — это и есть
 * «история» для страницы /v3/digest (путь B: контент без инфраструктуры).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { buildDigest } from "../lib/digest/generator";
import { getAlertsFeed, getBP3Ranking } from "../lib/v3-facade";

function main(): void {
  const ranking = getBP3Ranking();
  if (ranking.length === 0) {
    console.error("✖ Рейтинг пуст: дайджест не сгенерирован (нет данных БП 3.0).");
    process.exit(1);
  }
  const alerts = getAlertsFeed();

  const dateIso = new Date().toISOString().slice(0, 10);
  const md = buildDigest({ dateIso, ranking, alerts });

  const dir = path.resolve(process.cwd(), "docs/digests");
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `digest-${dateIso}.md`);
  writeFileSync(file, md, "utf8");

  console.log(`📄 Дайджест: ${path.relative(process.cwd(), file)}`);
  console.log(`   Стран в рейтинге: ${ranking.length}`);
  console.log(`   Алертов мониторинга: ${alerts.length}`);
}

main();
