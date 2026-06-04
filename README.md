# РБП-Стратег 2.0

> **Система анализа боевого потенциала государств**  
> Military Combat Potential Analysis System

## 📊 Обзор

РБП-Стратег 2.0 — веб-приложение для комплексного анализа боевого потенциала (БП) государств мира. Построено на основе 8-компонентной модели, разработанной по методологии военной науки (Энциклопедия РВСН, SIPRI, Creveld).

### 8 компонентов БП

| Компонент | Вес | Описание |
|---|---|---|
| **W** — Оружие | 20% | Танки, авиация, флот, ядерное оружие |
| **M** — Люди | 15% | Активный состав, резерв, качество |
| **L** — Логистика | 12% | Порты, аэродромы, нефть, торговый флот |
| **C2** — Управление | 10% | C4ISR, РЭБ, технологический уровень |
| **E** — Экономика | 15% | ВВП, военный бюджет, доля обороны |
| **D** — Доктрина | 8% | Стратегическая культура, опыт конфликтов |
| **R** — Боеготовность | 10% | Резерв/актив, обученность, мораль |
| **T** — География | 10% | Площадь, побережье, сухопутность |

**Формула:** `БП = W×0.20 + M×0.15 + L×0.12 + C2×0.10 + E×0.15 + D×0.08 + R×0.10 + T×0.10`

## 🏗️ Архитектура

```
src/
├── app/                          # Next.js 16 App Router
│   ├── page.tsx                  # Главная страница (724 строк)
│   ├── layout.tsx                # Layout + Mapbox GL CSS
│   ├── globals.css               # Tailwind v4 theme (hex only)
│   └── api/                      # 20 API маршрутов
│       ├── countries/            # GET — список стран с БП
│       ├── coalitions/           # GET — коалиции (NATO, CSTO, BRICS...)
│       ├── compare/             # GET — сравнение стран
│       ├── what-if/             # POST — сценарный анализ
│       ├── analytics/           # GET — рейтинг, распределение, аномалии
│       ├── export/              # GET — CSV/JSON экспорт
│       ├── benchmarks/          # GET — валидация по GFP 2025
│       ├── conflicts/           # GET — история конфликтов
│       ├── equipment/           # GET — справочник техники
│       ├── formulas/            # GET — формулы БП модели
│       ├── military-balance/   # GET — глобальный баланс
│       ├── nuclear-triad/       # GET — ядерные триады 9 держав
│       ├── scenarios/           # GET — стратегические сценарии
│       ├── strategic-culture/   # GET — профили стратегических культур
│       ├── tactical-doctrines/  # GET — тактические доктрины
│       ├── unit-strength/       # GET — рейтинги боевой эффективности
│       ├── warfare-domains/     # GET — домены войны
│       ├── data-quality/        # GET — оценка качества данных
│       ├── init-db/             # POST — инициализация БД
│       └── run-pipeline/        # POST — запуск data pipeline
├── components/
│   ├── map/                      # Стратегическая карта
│   │   ├── StrategicMap.tsx      # MapGL + DeckGL (siblings, z-index)
│   │   ├── ChoroplethLayer.tsx   # Чороплет (pure function, not component)
│   │   ├── CountryPopup.tsx     # Всплывающее окно страны (inside MapGL)
│   │   ├── MapControls.tsx      # Зум, центрирование, слои
│   │   ├── MapLegend.tsx        # Легенда цветовой шкалы
│   │   ├── LayerSelector.tsx    # Выбор аналитических слоёв
│   │   └── AnalyticsLayers.tsx  # Deck.gl аналитические оверлеи
│   ├── strategic/               # 10 табов стратегического анализа
│   │   ├── BPDetailTab.tsx      # Детальный разбор 8 компонентов
│   │   ├── EconomicsTab.tsx     # Экономика, бюджет, ВВП
│   │   ├── MilitaryHardwareTab.tsx  # Техника, ядерная триада
│   │   ├── CoalitionTab.tsx     # Коалиции, альянсы
│   │   ├── ComparisonTab.tsx    # Сравнение стран
│   │   ├── AnalyticsTab.tsx     # Рейтинг, распределение
│   │   ├── WhatIfTab.tsx        # Сценарный анализ
│   │   ├── DoctrineTab.tsx      # Доктрина, культура, конфликты
│   │   └── GeographyTab.tsx     # География, стратегическая глубина
│   ├── tactical/               # Тактический режим
│   │   ├── TacticalMap.tsx     # Терренная сетка 6 типов
│   │   ├── UnitDeployment.tsx  # Развертывание 16 типов юнитов
│   │   ├── BattleSimulation.tsx # Симуляция боя
│   │   └── OrbatBuilder.tsx    # Строитель ОШС
│   ├── viz/                     # Визуализации
│   │   ├── ScoreGauge.tsx      # Круговой индикатор 0-100
│   │   ├── RankBadge.tsx       # Бейдж ранга
│   │   ├── Sparkline.tsx       # Анимированная спарклайн
│   │   ├── ComparisonBar.tsx   # Двунаправленный бар
│   │   ├── HeatMapGrid.tsx     # Интерактивная тепловая карта
│   │   └── TrendChart.tsx      # Recharts AreaChart + forecast
│   ├── CountryCard.tsx          # Карточка страны
│   ├── CountryComparison.tsx    # Сравнение 2 стран
│   ├── CoalitionBuilder.tsx     # Конструктор коалиций
│   ├── CoalitionCard.tsx        # Карточка коалиции
│   ├── ComparisonMatrix.tsx     # Матрица сравнения
│   ├── TacticalHUD.tsx          # Тактический HUD (legacy)
│   ├── HolographicMap.tsx       # Голографическая карта (legacy)
│   └── CustomUnitBuilder.tsx    # Кастомный юнит (legacy)
├── lib/
│   ├── bp/                      # БП модель (ядро)
│   │   ├── types.ts             # CountryRawData, CountryBP, ComponentScore
│   │   ├── weights.ts           # Веса компонентов
│   │   ├── normalize.ts         # Лог/мин-макс нормализация
│   │   ├── weapon-potential.ts  # W: танки×1 + БМП×0.5 + ПЛ×3 + авианосцы×15
│   │   ├── manpower-potential.ts # M: актив×0.4 + резерв×0.3 + качество×0.3
│   │   ├── logistics-potential.ts # L: порты×0.25 + аэродромы×0.25 + нефть×0.3
│   │   ├── c2-potential.ts      # C2: C4ISR×0.4 + РЭБ×0.3 + технологии×0.3
│   │   ├── economy-potential.ts # E: ВВП×0.3 + бюджет×0.35 + доля×0.2
│   │   ├── doctrine-potential.ts # D: опыт×0.4 + культура×0.3 + ядерная доктрина×0.3
│   │   ├── readiness-potential.ts # R: резерв/актив×0.4 + обучение×0.3 + мораль×0.3
│   │   ├── terrain-potential.ts # T: площадь×0.5 + побережье×0.5 × сухопутность
│   │   ├── calculate-bp.ts      # Оркестратор: raw → normalize → weight → total
│   │   ├── sub-factors.ts       # 38 суб-факторов (6+4+5+5+5+4+4+5)
│   │   ├── detailed-calculator.ts # DetailedBPResult + strengths/weaknesses
│   │   ├── benchmarks.ts        # Top-10 валидация vs GFP 2025
│   │   ├── coalition-data.ts    # 7 коалиций (NATO 32, CSTO 6, BRICS 10...)
│   │   ├── formulas.ts          # 10 формул с LaTeX + источниками
│   │   └── index.ts             # Barrel export + calculateAllCountriesBP
│   ├── tactical-engine.ts       # Пошаговый движок боя (terrain + matchup)
│   ├── what-if-engine.ts        # Сценарный движок (modify → recalculate)
│   ├── analytics.ts             # Рейтинг, распределение, аномалии
│   ├── coalitions.ts            # Коалиционный анализ
│   ├── coalition-analysis.ts    # Расширенный коалиционный анализ
│   ├── comparison.ts            # Сравнение стран
│   ├── conflict-history.ts      # 15 конфликтов (Корея → Газа 2023)
│   ├── strategic-culture.ts     # 12 профилей стратегических культур
│   ├── strategic-scenarios.ts   # 6 стратегических сценариев
│   ├── nuclear-triad.ts         # 9 ядерных держав: триады, носители, НПТ
│   ├── tactical-doctrines.ts    # 6 военных доктрин
│   ├── warfare-domains.ts       # 8 доменов войны
│   ├── unit-strength.ts         # Рейтинги + 5 шаблонов формирований
│   ├── military-balance.ts      # Глобальный баланс: 8 регионов
│   ├── data-quality.ts          # 7 источников данных, confidence
│   ├── equipment-reference.ts   # 10 MBT, 8 истребителей, 6 ПЛ, 6 МБР
│   ├── nato-symbols.ts          # APP-6D/MIL-STD-2525C рендерер
│   ├── constants.ts             # Общие константы приложения
│   ├── geo/                     # Географические данные
│   │   ├── country-boundaries.ts
│   │   ├── country-centroids.ts
│   │   └── country-names-ru.ts  # 195 ISO3 → русские названия
│   ├── db/ → src/db/            # (aliased)
│   ├── combat-engine.ts         # ⚠️ Legacy — TS ошибки
│   ├── rbp-engine.ts            # ⚠️ Legacy — TS ошибки
│   └── terrain.ts               # ⚠️ Legacy — TS ошибки
├── db/
│   ├── schema.ts                # Drizzle ORM схема (263 страны)
│   ├── index.ts                 # Подключение к БД
│   ├── queries.ts               # CRUD запросы
│   └── seed/                    # Seed данные
│       ├── seed.ts              # Основной seeder
│       ├── top20-countries.ts   # Top-20 детальные данные
│       ├── extended-countries.ts # Расширенные данные
│       └── additional-countries.ts
└── scripts/
    └── data-pipeline/           # Data pipeline скрипты
        ├── fetch-worldbank.ts   # World Bank API
        ├── scrape-gfp.ts        # GFP 2025 (manual curation)
        ├── nuclear-data.ts      # FAS Nuclear Notebook
        └── merge-validate.ts   # Cross-validation ±20%
```

## 📈 Статистика проекта

- **30,011 строк** TypeScript/TSX кода
- **124 файла** (84 .ts + 37 .tsx + CSS/ICO)
- **20 API маршрутов**
- **263 страны** в БД
- **0 TypeScript ошибок** (исключая 3 legacy файла)
- **7 E2E тестов** (Playwright)

## 🚀 Запуск

```bash
# 1. Установить зависимости
npm install

# 2. Создать .env.local с Mapbox токеном
echo "NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1Ijoi..." > .env.local

# 3. Запустить dev-сервер
npm run dev

# 4. Инициализировать БД (первый запуск)
curl -X POST http://localhost:3000/api/init-db

# 5. Открыть http://localhost:3000
```

## 🔑 Ключевые технологии

| Технология | Версия | Назначение |
|---|---|---|
| Next.js | 16.1.6 | App Router, SSR/API routes |
| React | 19.2.3 | UI framework |
| TypeScript | 5.x | Strict mode |
| Mapbox GL | 3.24 | Векторная карта |
| Deck.gl | 9.3 | GPU-ускоренные слои |
| Drizzle ORM | 0.45 | SQLite ORM |
| better-sqlite3 | 12.6 | Embedded DB |
| Recharts | 3.7 | Графики |
| framer-motion | 12.34 | Анимации |
| Tailwind CSS | 4 | Стили |
| Playwright | 1.58 | E2E тесты |

## ⚠️ Известные ограничения

1. **Turbopack CSS**: `oklch()` и `@keyframes` внутри `@theme {}` вызывают panic на Windows → используем hex colors
2. **MapGL/DeckGL**: Рендерятся как siblings (не parent-child) с z-index; MapGL `pointerEvents: "none"`
3. **Map SSR**: StrategicMap загружается через `dynamic(() => import(...), { ssr: false })`
4. **NaN LngLat**: Известный баг Mapbox GL при dynamic/SSR-false; все практические guards на месте
5. **Legacy файлы**: `combat-engine.ts`, `rbp-engine.ts`, `terrain.ts` — имеют TS ошибки, исключены из проверки

## 📋 Смотрите также

- [DEVELOPMENT.md](./DEVELOPMENT.md) — Подробное руководство для разработки
- [CLAUDE.md](./CLAUDE.md) — Инструкции для AI агентов
