# RBP-Стратег — контекст проекта (для агента pi)

Обновлено: 2026-11-12. Оба PR зелёные, слияние проверено на объединённом дереве.

## Что это

«РБП-Стратег 2.0» — Next.js-приложение: анализ боевого потенциала государств. 195 стран, 8-компонентная модель БП, стратегическая карта (Mapbox/deck.gl), ядерные триады, сценарный анализ, симуляции. Стек: Next.js 16 (Turbopack), React 19, Drizzle 0.45 + better-sqlite3, Tailwind 4, Playwright 1.58, Node 22.

## Текущее состояние

- Две открытые ветки поверх `master`: `ops/live-health-keepalive` (PR #7, этот worktree) и `rbp-analytical-complex` (PR #6, worktree `/c/Users/sundermeta/worktrees/rbp-analytical-complex`).
- Порядок слияния: сначала PR #7 (ops), потом PR #6 — аналитическая ветка уже перебазирована на `origin/master` и не содержит ops-фиксов.
- В аналитической ветке сохранены tokenless MapLibre-карта, нативные слои, facilities, scenario lab, workspaces и lifecycle версий датасетов. После визуального аудита исправлены честный статус seed-данных, единая BP-шкала карты/легенды/карточки, непрозрачная лаборатория, активная навигация v3 и подписи шкалы P10–P90.
- **Прод живёт на Render, не здесь:** https://rbp-strateg.onrender.com (free-тариф, Франкфурт, засыпает — первый запрос до ~45 сек). Автодеплой из GitHub `master`. Конфиг: `render.yaml`. Отпечаток текущего релиза: `/api/countries` отдаёт ровно 195 стран.
- БД: SQLite, пересоздаётся при каждом старте (`instrumentation.ts`), постоянный диск не нужен. На Render при каждом рестарте сид заново.

## Как запускать локально здесь (VPS)

```
cd /root/work/projects/rbp-strateg
npm ci            # better-sqlite3 ставится из prebuilt, python3/make/g++ есть
npm run build     # Turbopack, на 2 vCPU несколько минут
npm run start     # прод-режим; для разработки npm run dev
```

`.env.local` лежит в корне (Mapbox-токен пустой — карта рендерит fallback, см. известные проблемы; RBP_ADMIN_TOKEN — дев-токен).

## Проверки аналитической ветки

- `npm run lint`, `npx tsc --noEmit`, `npm run build` — зелёные, без предупреждений.
- Playwright локально в условиях GitHub (`CI=true`, `RBP_ADMIN_TOKEN`, `RBP_PIPELINE_TEST_HOOK=1`): `80 passed, 1 skipped`.
- CI PR #6 зелёный: run `43297631087` (head `46a93e5`), `80 passed, 1 skipped`. Пропущен только opt-in тест живого pipeline (`RBP_PIPELINE_E2E=1`).
- CI PR #7 зелёный: run `43296414683` (head `9e8f661`), `53 passed, 1 skipped`.
- Визуально перепроверены главная, карточка США и `/v3`: BP 97.6 идёт тёплым цветом критического тира, дубль `NATO · NATO` устранён, `/v3` подсвечивает только текущий раздел.

### Почему CI падал на 262 странах (run 43248960187)

GitHub Actions выставляет `CI=true`, а код проверял `CI === "1"`. Детект молча
возвращал false, поэтому в CI не срабатывал тест-хук сбоя pipeline — вместо
инжектированного 500 шёл реальный сетевой прогон, и World Bank подменял 195
сидовых стран на 262 (USA BP `94.04` вместо `97.57330447450244`).

Фикс: общий `isCiEnvironment()` в `src/lib/env.ts` (учитывает `true`, `1`,
регистр и пробелы; `0/false/no/off/пусто` — не CI), подключён в
`server-refresh.ts`, `api/run-pipeline` и `playwright.config.ts`. Плюс
`webServer.env.RBP_AUTO_REFRESH=false` — e2e больше не зависят от детекта CI
и от живой сети. Регресс закрыт `e2e/ci-env.spec.ts`.

### Один путь сева вместо двух

`src/scripts/init-db.ts` содержал вторую реализацию сева: 59 стран, без
пакетов знаний и без метаданных сева. CLI-«пересев» оставлял базу расходящейся
с эталоном, а полное восстановление требовало рестарта сервера. Теперь скрипт —
тонкая обёртка над `initializeDatabase()` (тот же код, что в `instrumentation.ts`
и `POST /api/init-db`). Проверено: CLI даёт 195 стран, 2854 модели техники и
публикует версию датасета. Файл одинаков в обеих ветках — конфликта при слиянии нет.

### Слияние PR #7 + PR #6 (проверено до прода)

Единственный конфликт — `src/db/bootstrap.ts`: ops добавляет `writeSeedMeta()`,
аналитика — `publishSeedDataset()`. Функции независимы, решение — сохранить обе;
порядок вызовов уже слит автоматически: сначала публикация версии, затем эталон
(иначе `_seed_meta` не учёл бы строки `dataset_versions`).

На объединённом дереве (worktree `worktrees/rbp-integration`, ветка `integration-check`):
`lint`, `tsc --noEmit`, `build` — зелёные; Playwright при `CI=true` — `80 passed, 1 skipped`.
Живые пробы: `/api/live`, `/api/health`, `/api/countries`, `/api/analytics`,
`/api/data-quality`, `/api/export?format=csv&iso=USA`, `POST /api/what-if` — все 200.
Саботаж: `DROP TABLE equipment_models` → `/api/health` 503 с расхождением
`expected 2854, actual -1`, `/api/live` остаётся 200; рестарт (bootstrap) возвращает
`ok:true`, 28 таблиц, 6891 строка, 195 стран. Без заданного `RBP_ADMIN_TOKEN`
`POST /api/init-db` отвечает 401 — гейт закрыт по умолчанию.

### Открытый вопрос: what-if молча принимает неизвестные параметры

`POST /api/what-if` делает `{ ...DEFAULT_SCENARIO_PARAMS, ...body.params }`.
Опечатка в имени (`budgetMultiplier` вместо `budgetChange`) не даёт ошибки:
сценарий возвращается равным базовому BP. Рабочий контракт — `budgetChange`
(дробь: `0.5` = +50%); проверено `97.5733 → 97.7135`, дельта по экономике.
Стоит решить: отклонять неизвестные ключи с 400 или оставить как есть.

## Известные проблемы (аудит мейнтейнера, июнь 2026, docs в `maintainer-report-2026-06.md`)

Проверять актуальность — аудит делался на более старом HEAD (`6587a63`):

1. **P0:** 4 API-маршрута сломаны двойным багом snake_case↔camelCase (`what-if`, `data-quality`, `export`, `analytics`): SQL с несуществующими колонками + мапперы читают не те ключи. `/api/analytics` опаснее всех — молча возвращает нули.
2. **P0:** E2E-тест «≥200 стран» не проходит против сидовой БД (в сидe 59 строк; в проде теперь 195 — ассерт, возможно, уже честный, проверить).
3. **P0:** `NEXT_PUBLIC_MAPBOX_TOKEN` пуст → карта всегда в fallback «TOKEN_MISSING».
4. **P1:** пути к БД, транзакции, таймауты сети, порог-тиров — по отчёту.

## Документация в репозитории

`README.md`, `DEVELOPMENT.md`, `CLAUDE.md`, `docs/` (MAP-OVERHAUL, audit-report), `maintainer-report-2026-06.md` (полный аудит 216 строк).

## Правила работы

- Кодить → коммитить в `master` → пуш в GitHub → Render подхватит сам. Прежде чем пушить в прод-ветку — прогнать build.
- Демо-данные и графики не выдумывать: все числа брать из БД/`/api/*`.
- Этот файл обновлять при смене состояния (HEAD, прод, найденные/починенные проблемы).
- Не вливать PR #6 в `master` до отдельного зелёного CI и финальной проверки merge с ops PR #7.
