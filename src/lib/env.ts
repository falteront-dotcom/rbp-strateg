/**
 * Определение CI-окружения.
 *
 * GitHub Actions выставляет `CI=true`, а не `CI=1`. Проверка `CI === "1"`
 * молча считала CI обычным прод-запуском: включался сетевой авто-refresh
 * датасета и не срабатывал тест-хук сбоя pipeline — e2e получали 262 страны
 * из живого World Bank вместо 195 сидовых (run CI 43248960187).
 *
 * Правило: переменная задана и не равна одному из явных «выключено».
 */
const CI_FALSE_VALUES = new Set(["", "0", "false", "no", "off"]);

export function isCiEnvironment(env: Record<string, string | undefined> = process.env): boolean {
  const raw = env.CI;
  if (typeof raw !== "string") return false;
  return !CI_FALSE_VALUES.has(raw.trim().toLowerCase());
}
