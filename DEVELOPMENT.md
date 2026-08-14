# РБП-Стратег 2.0 — Руководство для разработки

> Детальный технический аудит и roadmap для дальнейшей разработки

## 1. ТЕКУЩЕЕ СОСТОЯНИЕ ПРОЕКТА

### 1.1 Метрики

| Метрика | Значение | Оценка |
|---|---|---|
| Строки кода | Около 30 000 | ✅ Поддерживается в актуальном дереве |
| TypeScript ошибки | Проверяются `npm run typecheck` | ✅ Production build/typecheck проходят |
| E2E тесты | 8 spec-файлов | ✅ Contract/API/UI suite через `npm test` |
| API маршрутов | 20 | ✅ Полный набор |
| Стран в локальной БД | 59 | ✅ Seed fixture; pipeline обновляет набор |
| Компоненты UI | 40+ | ✅ Полный набор |
| Lib модули | 30+ | ✅ Полный набор |

### 1.2 Качество кода — Проблемы

#### 🔴 КРИТИЧЕСКИЕ

1. **Legacy compatibility modules**
   - `src/lib/combat-engine.ts`, `src/lib/rbp-engine.ts`, `src/lib/terrain.ts` сохраняются для тактической совместимости.
   - Основные стратегические расчёты используют `src/lib/bp/` и `tactical-engine.ts`.
   - Typecheck/build проходят; lint debt в legacy/UI-адаптерах отслеживается отдельно.

2. **Нет unit-тестов в отдельном runner-е**
   - Contract/API/доменная проверка выполняется Playwright suite через `npm test`.
   - UI и API тесты находятся в `e2e/`; старые standalone specs удалены из discovery.

3. **База данных — локальный SQLite runtime**
   - API использует единый слой `src/db/runtime.ts` и raw `better-sqlite3`.
   - `sqlite.db` не коммитится; runtime-фрагменты `sqlite.db-*` игнорируются.
   - Схема поддерживается безопасным ручным DDL в admin/pipeline коде; текущая orphaned Drizzle migration не является runtime source of truth.

#### 🟡 СРЕДНИЕ

4. **Дублирование типов**
   - `CountryData` (из API) vs `CountryCompareData` (из comparison) vs `Country` (из schema)
   - `as any` касты в 15+ местах (особенно Recharts Tooltip, deck.gl)
   - **Решение**: Унифицировать типы через общий `types.ts` в lib/

5. **API маршруты без валидации**
   - Нет Zod/schema валидации на входных параметрах
   - Прямой SQL без санитизации (хотя Drizzle использует параметризованные запросы)
   - **Решение**: Добавить Zod schemas для query params

6. **Нет error boundaries в React**
   - Если StrategicMap падает — всё приложение крашится
   - **Решение**: React ErrorBoundary вокруг map и tab компонентов

7. **Нет loading states на API**
   - `/api/countries` может висеть 5+ секунд при первом запросе
   - Нет skeleton/spinner компонентов
   - **Решение**: React Suspense + skeleton UI

8. **Страница page.tsx — 724 строки**
   - Слишком большой файл — mixing data fetching, state, UI
   - **Решение**: Вынести хуки в `useStrategicData.ts`, `useCountrySelection.ts`

#### 🟢 МИНОРНЫЕ

9. **Отсутствует i18n система**
   - `src/lib/i18n.ts` существует, но не используется
   - Все строки захардкожены на русском
   - **Решение**: Либо использовать i18n.ts, либо удалить

10. **Нет CI/CD pipeline**
    - Нет GitHub Actions
    - Нет автоматического тестирования
    - **Решение**: Добавить `.github/workflows/ci.yml`

11. **Нет деплоймент конфигурации**
    - Не настроен Vercel/Turso
    - SQLite не работает на serverless (нужен Turso или Postgres)
    - **Решение**: Мигрировать на Turso (libSQL) для Vercel

12. **Unused imports / dead code**
    - `HolographicMap.tsx`, `DuelSimulator.tsx`, `CustomUnitBuilder.tsx` — legacy
    - `src/lib/c2.ts`, `src/lib/logistics.ts` — старые модули (заменяны bp/*)
    - **Решение**: Удалить или пометить @deprecated

---

## 2. АРХИТЕКТУРНЫЕ РЕШЕНИЯ — ДЛЯ ПОНИМАНИЯ

### 2.1 Стратегическая карта (КРИТИЧЕСКИЙ КОНТЕКСТ)

```
┌─────────────────────────────────────────────┐
│  containerRef (position: relative)           │
│  ┌───────────────────────────────────────┐  │
│  │  MapGL (z-index: 0)                  │  │
│  │  pointerEvents: "none"               │  │
│  │  - Рендерит векторную карту          │  │
│  │  - CountryPopup внутри MapGL         │  │
│  │  - ResizeObserver → width/height     │  │
│  ├───────────────────────────────────────┤  │
│  │  DeckGL (z-index: 1)                 │  │
│  │  controller: true                    │  │
│  │  - Чороплет + аналитические слои    │  │
│  │  - Обрабатывает клики/ховеры         │  │
│  │  - Синхронизация ViewState с MapGL   │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

**Почему siblings, не parent-child?**
DeckGL внутри MapGL вызывает container dimension 0×0 → NaN LngLat при инициализации. Siblings с z-index решают проблему.

**Почему `pointerEvents: "none"` на MapGL?**
DeckGL должен обрабатывать все взаимодействия (клики по странам, ховеры). MapGL только рендерит базовую карту.

**Почему `dynamic(() => import(...), { ssr: false })`?**
Mapbox GL использует `window` при инициализации. SSR вызывает hydration mismatch и NaN координат.

### 2.2 БП Модель — Поток данных

```
CountryRawData (from DB)
  ├── calcWeaponRaw()      → 0-∞ raw score
  ├── calcManpowerRaw()    → 0-∞ raw score
  ├── calcLogisticsRaw()  → 0-∞ raw score
  ├── calcC2Raw()         → 1-10 raw score
  ├── calcEconomyRaw()    → 0-∞ raw score
  ├── calcDoctrineRaw()   → 1-10 raw score
  ├── calcReadinessRaw()  → 0-∞ raw score
  └── calcTerrainRaw()    → 0-∞ raw score
        ↓
  logNormalize(raw, cohortMax) → 0-100
        ↓
  weightedScore = normalized × weight
        ↓
  totalBP = Σ(weightedScore) → 0-100
        ↓
  rank = sorted position in cohort
```

**Ключевой принцип**: Нормализация логарифмическая, не линейная. Это критично — США (ВВП 25T) не в 250× мощнее Уругвая (100B), а примерно в 2× для военных целей.

### 2.3 API — Паттерн

Все API маршруты используют `dynamic import("better-sqlite3")` для совместимости с Turbopack:

```typescript
export async function GET(request: NextRequest) {
  const Database = (await import("better-sqlite3")).default;
  const db = new Database("sqlite.db", { readonly: true });
  const rows = db.prepare("SELECT * FROM ...").all();
  db.close();
  return NextResponse.json(rows);
}
```

**Почему dynamic import?** Turbopack виснет при static import better-sqlite3 на этапе компиляции.

### 2.4 CSS — Turbopack ограничения

```css
/* ❌ НЕ ДЕЛАТЬ — Turbopack crash на Windows */
@theme {
  --color-cyan: oklch(0.75 0.15 200);  /* crash */
  @keyframes pulse { ... }               /* crash */
}

/* ✅ ПРАВИЛЬНО */
@theme {
  --color-cyan: #06b6d4;                /* hex только */
}
@keyframes pulse { ... }                 /* вне @theme */
```

---

## 3. ROADMAP — ЧТО ДЕЛАТЬ ДАЛЬШЕ

### Фаза 1: Стабилизация (1-2 недели)

| # | Задача | Приоритет | Сложность |
|---|---|---|---|
| 1.1 | Удалить/починить 3 legacy файла | P0 | Easy |
| 1.2 | Добавить Vitest + unit тесты для bp/* | P0 | Medium |
| 1.3 | Унифицировать типы (CountryData vs CountryCompareData) | P1 | Medium |
| 1.4 | React ErrorBoundary вокруг map | P1 | Easy |
| 1.5 | Zod валидация на API query params | P1 | Medium |
| 1.6 | Skeleton/spinner для loading states | P1 | Easy |
| 1.7 | GitHub Actions CI pipeline | P1 | Easy |
| 1.8 | Удалить dead code (HolographicMap, DuelSimulator, c2.ts, logistics.ts) | P2 | Easy |

### Фаза 2: Деплоймент (1 неделя)

| # | Задача | Приоритет | Сложность |
|---|---|---|---|
| 2.1 | Мигрировать БД на Turso (libSQL) для Vercel | P0 | Hard |
| 2.2 | Настроить Vercel deployment | P0 | Easy |
| 2.3 | Environment variables на Vercel | P0 | Easy |
| 2.4 | Mapbox token rotation strategy | P1 | Easy |
| 2.5 | CDN для GeoJSON (countries.geojson 1.8MB) | P2 | Easy |

### Фаза 3: Фичи (2-4 недели)

| # | Задача | Приоритет | Сложность |
|---|---|---|---|
| 3.1 | Тактический режим — полный UI | P1 | Hard |
| 3.2 | Исторические данные — тренды БП по годам | P1 | Hard |
| 3.3 | Real-time World Bank API fetch | P2 | Medium |
| 3.4 | PWA (offline + push уведомления) | P2 | Medium |
| 3.5 | i18n (EN/RU переключатель) | P2 | Medium |
| 3.6 | Export в PDF/PowerPoint | P3 | Medium |
| 3.7 | Dark/light theme toggle | P3 | Easy |
| 3.8 | Mobile-responsive карта | P3 | Medium |

### Фаза 4: Масштабирование (4+ недели)

| # | Задача | Приоритет | Сложность |
|---|---|---|---|
| 4.1 | Server-Sent Events для live updates | P2 | Hard |
| 4.2 | WebSocket для multiplayer tactical mode | P3 | Hard |
| 4.3 | ML модель для прогнозирования конфликтов | P3 | Very Hard |
| 4.4 | Satellite imagery integration | P3 | Hard |
| 4.5 | OpenAI/DeepSeek API для natural language queries | P3 | Medium |

---

## 4. ФАЙЛЫ — ДЕТАЛЬНЫЙ АУДИТ

### 4.1 Требуют немедленного внимания

| Файл | Проблема | Действие |
|---|---|---|
| `src/lib/combat-engine.ts` | TS ошибки, заменён tactical-engine.ts | Удалить |
| `src/lib/rbp-engine.ts` | TS ошибки, заменён bp/calculate-bp.ts | Удалить |
| `src/lib/terrain.ts` | TS ошибки, заменён bp/terrain-potential.ts | Удалить |
| `src/lib/c2.ts` | Дублирует bp/c2-potential.ts | Удалить |
| `src/lib/logistics.ts` | Дублирует bp/logistics-potential.ts | Удалить |
| `src/components/HolographicMap.tsx` | Legacy, не используется | Удалить |
| `src/components/DuelSimulator.tsx` | Legacy, не используется | Удалить |
| `src/components/CustomUnitBuilder.tsx` | Legacy, не используется | Удалить |
| `src/app/page.tsx` | 724 строк — слишком большой | Рефакторинг → вынести хуки |

### 4.2 Хорошее качество

| Файл | Строки | Оценка | Примечание |
|---|---|---|---|
| `src/lib/bp/calculate-bp.ts` | ~100 | ✅ Отлично | Чистый, документированный |
| `src/lib/bp/weapon-potential.ts` | ~120 | ✅ Отлично | Реальные формулы |
| `src/lib/bp/normalize.ts` | ~40 | ✅ Отлично | 3 метода нормализации |
| `src/lib/bp/sub-factors.ts` | 480 | ✅ Хорошо | 38 суб-факторов с описаниями |
| `src/lib/nuclear-triad.ts` | 360 | ✅ Отлично | 9 держав, реальные данные FAS |
| `src/lib/equipment-reference.ts` | ~350 | ✅ Отлично | 30+ единиц с реальными характеристиками |
| `src/components/map/StrategicMap.tsx` | 858 | ✅ Хорошо | Сложная архитектура, работает |
| `src/components/viz/*.tsx` | ~600 | ✅ Хорошо | Переиспользуемые визуализации |

### 4.3 Требуют рефакторинга

| Файл | Проблема | Рекомендация |
|---|---|---|
| `src/app/page.tsx` | 724 строк, mixing concerns | → `hooks/useStrategicData.ts` + `hooks/useCountrySelection.ts` |
| `src/components/strategic/WhatIfTab.tsx` | 1517 строк — самый большой | → Разбить на WhatIfScenarioForm + WhatIfResults |
| `src/components/TacticalHUD.tsx` | 968 строк legacy | → Переписать на новый tactical engine |
| `src/components/CountryComparison.tsx` | 875 строк | → Вынести ComparisonChart в отдельный компонент |
| `src/db/seed/extended-countries.ts` | 1153 строк данных | → JSON файл + import |

---

## 5. ТЕСТИРОВАНИЕ

### 5.1 Текущее покрытие

- **E2E**: 7 тестов (Playwright) — загрузка, список стран, карта, детальная панель
- **Unit**: 0 — нет вообще
- **Integration**: 0 — API маршруты не протестированы

### 5.2 Рекомендуемое покрытие

```
src/lib/bp/           → 100% unit (чистые функции, легко тестировать)
src/lib/tactical-engine.ts → 100% unit
src/lib/what-if-engine.ts → 100% unit
src/app/api/          → integration tests
src/components/       → component tests (React Testing Library)
```

### 5.3 Пример unit теста для БП

```typescript
// src/lib/bp/__tests__/calculate-bp.test.ts
import { calculateCountryBP } from '../calculate-bp';
import { CountryRawData } from '../types';

describe('calculateCountryBP', () => {
  it('USA should be top-3', () => {
    const usa: CountryRawData = { isoCode: 'USA', ... };
    const cohort = [usa, russia, china, ...];
    const result = calculateCountryBP(usa, cohort);
    expect(result.totalBP).toBeGreaterThan(80);
    expect(result.rank).toBeLessThanOrEqual(3);
  });

  it('landlocked country should get terrain penalty', () => {
    const mongolia = { isoCode: 'MNG', ... };
    const result = calculateCountryBP(mongolia, cohort);
    expect(result.terrainScore).toBeLessThan(50);
  });
});
```

---

## 6. ДЕПЛОЙМЕНТ

### 6.1 Vercel + Turso

SQLite не работает на Vercel (serverless, read-only filesystem). Нужна миграция:

```
better-sqlite3 → @libsql/client (Turso)
sqlite.db      → turso://... remote DB
```

**Шаги:**
1. Установить `@libsql/client`
2. Создать Turso DB: `turso db create rbp-strateg`
3. Обновить `src/db/index.ts` для использования Turso client
4. Schema/runtime maintenance is handled through the shared raw SQLite runtime. Do not run `drizzle-kit push` against this repository until the migration history is regenerated from the actual `countries` schema; the orphaned migration is not the runtime source of truth.
5. Seed через API endpoint `/api/init-db`
6. Deploy на Vercel: `vercel deploy`

### 6.2 Переменные окружения

```env
# .env.local (development)
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1Ijoi...

# .env.production (Vercel)
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1Ijoi...
TURSO_DATABASE_URL=libsql://rbp-strateg-xxx.turso.io
TURSO_AUTH_TOKEN=eyJhbGciOi...
```

---

## 7. ЗАВИСИМОСТИ — АУДИТ

| Пакет | Версия | Статус | Примечание |
|---|---|---|---|
| next | 16.1.6 | ✅ Latest | App Router stable |
| react | 19.2.3 | ✅ Latest | |
| mapbox-gl | 3.24.0 | ✅ | |
| deck.gl | 9.3.3 | ✅ | |
| better-sqlite3 | 12.6.2 | ⚠️ | Не работает на Vercel → нужен Turso |
| drizzle-orm | 0.45.1 | ✅ | |
| recharts | 3.7.0 | ✅ | Tooltip требует `as any` |
| framer-motion | 12.34.3 | ✅ | |
| @turf/turf | 7.3.5 | ⚠️ | Unused? Только country-centroids |
| d3-geo / d3-scale | 3.x/4.x | ⚠️ | Unused в текущем коде? |

**Кандидаты на удаление**: `@turf/turf`, `d3-geo`, `d3-scale` — если не используются напрямую.

---

## 8. КОНВЕНЦИИ КОДА

### 8.1 Обязательные правила

1. **TypeScript strict mode** — без `any` (кроме deck.gl accessors и Recharts formatters)
2. **`@/` path imports** — Turbopack не резолвит relative `../`
3. **Hex colors only** — `oklch()` крашит Turbopack на Windows
4. **`@keyframes` outside `@theme`** — Tailwind v4 ограничение
5. **`dynamic(() => import(...), { ssr: false })`** — для Mapbox компонентов
6. **`await import("better-sqlite3")`** — в API маршрутах для Turbopack
7. **Функции < 30 строк** — SRP, DRY, KISS

### 8.2 Структура компонента

```typescript
// 1. Imports (sorted: react → next → libs → local)
"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ScoreGauge } from "@/components/viz";
import type { CountryBP } from "@/lib/bp";

// 2. Types
interface Props {
  country: CountryBP;
  onSelect?: (iso: string) => void;
}

// 3. Component
export function CountryPanel({ country, onSelect }: Props) {
  // hooks
  const [expanded, setExpanded] = useState(false);

  // handlers
  const handleClick = () => onSelect?.(country.isoCode);

  // render
  return (
    <div className="glass-panel" onClick={handleClick}>
      ...
    </div>
  );
}
```

---

## 9. ДАННЫЕ — ИСТОЧНИКИ И КАЧЕСТВО

| Источник | Покрытие | Точность | Свежесть | Поля |
|---|---|---|---|---|
| Статистическая база World Bank/GFP | Набор зависит от источника; локальный seed содержит 59 стран | 2024–2025 | Экономика и техника |
| World Bank | Pipeline source; локальный seed содержит 59 стран | 2024 | ВВП, население, бюджет |
| FAS Nuclear | 9 ядерных держав в reference data | 85% | 2025 | Боеголовки |
| SIPRI | Pipeline/reference source; покрытие зависит от данных | 85% | 2024 | Бюджет, экспорт оружия |
| IISS MB | Reference source; покрытие зависит от данных | 90% | 2025 | ОШК, техника |
| CIA Factbook | Reference source; покрытие зависит от данных | 80% | 2025 | Площадь, побережье, порты |
| ООН | Reference source; покрытие зависит от данных | 85% | 2024 | Население, ВВП |

**Cross-validation**: GFP vs World Bank — ±20% threshold. Если расхождение >20% — пометка ⚠️ в UI.

---

## 10. ГЛОССАРИЙ

| Термин | Значение |
|---|---|
| БП | Боевой потенциал — комплексная оценка военной мощи |
| ОШК | Организационно-штатная структура (ORBAT) |
| C4ISR | Command, Control, Communications, Computers, Intelligence, Surveillance, Reconnaissance |
| РЭБ | Радиоэлектронная борьба (Electronic Warfare) |
| ПВО | Противовоздушная оборона |
| ПЛАРБ | Подводная лодка атомная с баллистическими ракетами (SSBN) |
| МБР | Межконтинентальная баллистическая ракета (ICBM) |
| A2/AD | Anti-Access / Area Denial — зона отрицания доступа |
| GFP | Global Firepower Index |
| SIPRI | Stockholm International Peace Research Institute |
| FAS | Federation of American Scientists |
