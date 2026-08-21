# Технологический стек — РБП-Стратег 2.0

## Основной стек

| Компонент | Технология | Версия | Назначение |
|---|---|---|---|
| Фреймворк | Next.js (App Router) | 16.x | SSR, routing, API |
| UI | React | 19.x | Компоненты |
| Стили | Tailwind CSS + OKLCH | 4.x | Дизайн-система |
| Анимации | Framer Motion | 12.x | Микро-анимации |
| Язык | TypeScript | 5.x | Типобезопасность |

## Новые зависимости (Карта и Гео)

| Зависимость | Версия | Назначение |
|---|---|---|
| `react-map-gl` | ^8.x | React-обёртка для MapLibre/Mapbox |
| `mapbox-gl` | ^3.x | Векторная карта мира (WebGL) |
| `deck.gl` | ^9.x | Аналитические слои (choropleth, arcs, heatmap) |
| `@deck.gl/react` | ^9.x | React интеграция deck.gl |
| `@deck.gl/layers` | ^9.x | Стандартные слои |
| `@nebula.gl/editor` | ^3.x | Редактирование геометрий (зоны, маршруты) |

## Новые зависимости (Данные и Визуализация)

| Зависимость | Версия | Назначение |
|---|---|---|
| `d3-scale` | ^4.x | Цветовые шкалы для choropleth |
| `d3-geo` | ^3.x | Проекции и GeoJSON утилиты |
| `@turf/turf` | ^7.x | Геопространственные вычисления (буферы, пересечения) |

## Существующие зависимости (оставляем)

| Зависимость | Назначение |
|---|---|
| База данных | raw `better-sqlite3` + единый runtime/mapper | Локальная SQLite-БД; admin API и pipeline — authenticated POST |
| `recharts` | Радарные диаграммы, графики |
| `lucide-react` | Иконки |
| `clsx` + `tailwind-merge` | Утилиты стилей |

## Dev-зависимости (оставляем)

| Зависимость | Назначение |
|---|---|
| `@playwright/test` | E2E тестирование |
| `drizzle-kit` | Миграции БД |

## Runtime database policy

The application uses `src/db/runtime.ts` and `better-sqlite3` as the runtime database layer. Drizzle files remain only as type/schema history until regenerated safely; do not run `drizzle-kit push` against the current orphaned migration. Database-mutating endpoints are authenticated POST routes and require `RBP_ADMIN_TOKEN`/`x-admin-token`.

The first analytical-complex milestone is local-first: the last published dataset remains usable without network, metadata is versioned, pipeline publication is atomic, and workspace/scenario state is local SQLite. `NEXT_PUBLIC_MAPBOX_TOKEN` is optional; no-token fallback must remain available.



| Источник | Тип | Обновляемость |
|---|---|---|
| Natural Earth / GeoJSON стран | Статический | Ежегодно |
| Global Firepower Index | API/скрейпинг | Ежегодно |
| SIPRI Military Expenditure | API | Ежегодно |
| CIA World Factbook | API | Ежегодно |
| World Bank Open Data | API | Ежеквартально |
| Собственная БД юнитов | SQLite | Ручное обновление |

## Ключ mapbox

`NEXT_PUBLIC_MAPBOX_TOKEN` опционален. При отсутствии токена карта использует безопасный no-token fallback; credentials не должны попадать в git.

## Архитектурные решения

1. **MapLibre GL + native layers + Deck.gl** вместо чистого Leaflet — tokenless CARTO/OpenFreeMap basemap, нативные fill/line/cluster слои и высокая производительность вторичных аналитических слоёв; Mapbox остаётся опциональным.
2. **react-map-gl** — официальный React-биндинг, поддержка MapRef для императивного управления
3. **Deck.gl overlay** поверх Mapbox — для choropleth, heatmap, arc-слоёв (GPU-ускоренные)
4. **@turf/turf** — для расчётов: буферы дальности ПВО, пересечения зон, расстояния
5. **Стратегический и тактический режимы** — одна карта, разные слои и UI-панели
