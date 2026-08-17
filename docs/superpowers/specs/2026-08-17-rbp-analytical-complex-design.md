# РБП-Стратег — аналитический программный комплекс

## Статус

Дизайн утверждён пользователем для поэтапной реализации. Целевой первый пользователь — один локальный аналитик. Комплекс должен быть local-first и работать на последнем валидном локальном наборе данных без обязательного подключения к интернету.

## Видение

**РБП-Стратег** — аналитический программный комплекс для исследования военного потенциала, стратегических альтернатив и устойчивости решений на основе версионируемых данных и объяснимых моделей.

Главный продуктовый вектор — **«Театр стратегических решений»**. Система не выдаёт только рейтинг или единственное число; она позволяет построить базовый сценарий, альтернативные ветви, сравнить их последствия, увидеть вклад факторов и оценить устойчивость вывода к качеству данных.

Комплекс не позиционируется как достоверный прогноз реального конфликта. Результаты являются объяснимыми аналитическими сценариями модели и должны сопровождаться версиями данных, формулой, confidence и предупреждениями.

## Цели

1. Завершить текущую ремедиацию и сделать quality gates надёжными.
2. Превратить существующее приложение в целостный аналитический комплекс, не создавая параллельные доменные реализации.
3. Сохранить и развить 8-компонентную модель боевого потенциала.
4. Добавить версионируемые данные, автоматическое обновление и безопасную публикацию dataset.
5. Добавить полноценные локальные workspace и дерево стратегических сценариев.
6. Объяснять результат через вклад компонентов, изменения входов, confidence и warnings.
7. Сохранить возможность работы без интернета после первоначальной установки.
8. Создать архитектурные границы, позволяющие позже добавить командный и публичный режимы без переписывания аналитического ядра.

## Не входит в первый milestone

- многопользовательская авторизация, роли и совместное редактирование;
- отдельный удалённый persistence-сервис;
- полный переход runtime-доступа к БД на Drizzle;
- автоматический minimax или автономный ИИ-оппонент;
- утверждения о вероятности победы в реальном конфликте;
- произвольный DAG без ограничения глубины;
- постоянный Windows-служебный updater при закрытом приложении;
- полная field-level provenance для каждого значения;
- большая переработка тактического движка без тестов эквивалентности.

## Архитектурные решения

### Runtime и хранение

Сохраняется единый raw `better-sqlite3` runtime как источник истины для runtime-операций. Drizzle-типы и миграционные материалы остаются там, где они нужны для seed и описания схемы, но не запускается рискованная полная миграция runtime.

Граница доступа:

```text
UI
 ↓
API routes
 ↓
Domain/application services
 ↓
Repositories
 ↓
SQLite runtime
```

Стратегические расчёты остаются чистыми функциями и не получают прямого доступа к SQLite. Workspace API должен использовать отдельный service/repository слой, чтобы позднее заменить хранилище без переписывания UI.

### Целевая эксплуатация

Первая версия предназначена для одного локального аналитика:

- SQLite хранится локально;
- обычная работа не требует авторизации;
- admin-операции остаются отдельными и защищёнными;
- workspace, сценарии, заметки и версии расчётов сохраняются локально;
- публичные и командные API не входят в первый milestone.

### Local-first

Приложение сразу загружает последний опубликованный локальный dataset. Внешние источники не блокируют старт UI и не являются обязательными для базовой аналитики. Интернет нужен для автоматического обновления источников.

Updater запускается при старте и периодически во время работы приложения. Отдельный системный сервис для обновления при закрытом приложении не требуется в первом milestone.

## Функциональные контуры

### 1. Data Platform

- adapters внешних источников;
- загрузка raw snapshot;
- staging;
- нормализация;
- проверка полноты, типов, единиц и диапазонов;
- anomaly detection;
- versioning;
- atomic publish;
- rollback;
- health status и журнал обновлений.

### 2. Strategic Model

- 8 компонентов BP: W, M, L, C2, E, D, R, T;
- нормализация и веса;
- субфакторы;
- canonical BP tiers;
- confidence aggregation;
- explainability ledger;
- детерминированные результаты.

### 3. Strategic Analysis

- профили стран;
- сравнение до четырёх стран;
- коалиционный анализ;
- экономика и военный бюджет;
- военный баланс и техника;
- ядерный потенциал;
- доктрина и конфликтный опыт;
- география и логистика;
- аналитические слои карты;
- тренды, рейтинги и распределения;
- экспорт аналитических результатов.

### 4. Scenario Lab

- What-If;
- базовый сценарий;
- ветви альтернатив;
- сравнение ветвей;
- sensitivity analysis;
- поиск точек перелома;
- uncertainty/confidence;
- сценарии коалиций и внешних ограничений.

Первый вертикальный срез ограничивает дерево глубиной 2–3 уровня и поддерживает минимум базовый сценарий плюс две дочерние ветви.

### 5. Workspace

- проекты аналитика;
- сохранённые workspace;
- заметки;
- сценарные узлы;
- снимки результатов;
- версия схемы workspace;
- сравнение текущих и прошлых dataset.

### 6. Reporting

- JSON;
- CSV;
- printable/analysis brief в последующем вертикальном срезе;
- metadata: dataset version, formula version, calculatedAt, confidence и warnings.

### 7. Tactical Integration

Тактический контур сохраняется и развивается отдельно. Связь со стратегическим контуром выполняется через immutable strategic scenario snapshot, передаваемый в tactical simulation. Тактический движок не меняет published strategic dataset.

## Модель данных

### Published dataset

Поток версий:

```text
Источник
  ↓
raw snapshot
  ↓
staging
  ↓
validation
  ↓
validated
  ↓
published
```

Состояния версии:

- `staging` — загрузка и обработка;
- `validated` — проверки пройдены;
- `published` — используется расчётами;
- `rejected` — отклонена с причинами;
- `superseded` — заменена новой опубликованной версией.

Для версии dataset хранятся как минимум:

```text
id
version
status
created_at
published_at
source_summary
validation_summary
warning_count
error_count
```

Правило публикации: критическая ошибка сохраняет текущий published dataset; некритичное предупреждение допускает публикацию с видимым warning; успешная версия публикуется атомарно.

### Provenance и confidence

На уровне доменной модели постепенно поддерживаются:

```text
source
asOf
confidence: 0..1
level: high | medium | low
valueKind: fact | estimate | fallback
sourceCount
warnings[]
```

Первая версия агрегирует confidence через существующий data-quality слой. Подробная provenance для каждого поля — отдельный последующий срез.

### Workspace

```text
StrategicWorkspace
├── id: string
├── name: string
├── description: string | null
├── baseDataVersion: string
├── selectedCountryIso: string | null
├── comparisonIsos: string[]
├── activeTab: StrategicTab
├── activeMapLayer: AnalyticsLayerKey
├── filters: WorkspaceFilters
├── notes: string
├── schemaVersion: number
├── createdAt: string
└── updatedAt: string
```

Основные поля workspace хранятся отдельными колонками. Гибкие настройки могут храниться в валидируемом `state_json`. Результаты BP не являются источником истины и пересчитываются на актуальном dataset. Для отчётности создаётся отдельный immutable result snapshot.

### ScenarioNode

```text
ScenarioNode
├── id: string
├── workspaceId: string
├── parentId: string | null
├── name: string
├── description: string
├── params: ScenarioParams
├── orderIndex: number
├── createdAt: string
└── updatedAt: string
```

Узел хранит только входные параметры. Результат пересчитывается через существующий `calculateWhatIf`. Для первого среза глубина дерева ограничена 2–3 уровнями.

## Explainability

Каждый расчёт возвращает envelope:

```text
AnalysisResult
├── result
├── datasetVersion
├── formulaVersion
├── calculatedAt
├── confidence
└── warnings[]
```

Для What-If и ветвей добавляется ledger:

```text
ScenarioExplanation
├── totalDelta
├── componentDeltas
├── topPositiveDrivers[]
├── topNegativeDrivers[]
├── changedInputs[]
├── confidenceScore
└── warnings[]
```

Компонентные дельты должны быть согласованы с восемью BP-компонентами. Одинаковые входы, dataset version и formula version дают одинаковый результат. Случайность не используется внутри стратегического расчёта; seeded Monte Carlo остаётся изолированным в uncertainty/tactical слое.

## Основные API-контуры

Точные маршруты и DTO фиксируются на этапе implementation plan, но интерфейсы должны покрывать:

```text
GET    /api/dataset/health
GET    /api/dataset/versions
GET    /api/workspaces
POST   /api/workspaces
GET    /api/workspaces/:id
PATCH  /api/workspaces/:id
DELETE /api/workspaces/:id
POST   /api/workspaces/:id/duplicate
POST   /api/workspaces/:id/export
POST   /api/workspaces/:id/scenarios
PATCH  /api/workspaces/:id/scenarios/:scenarioId
DELETE /api/workspaces/:id/scenarios/:scenarioId
GET    /api/workspaces/:id/analysis
```

Существующие API стран, сравнения, what-if, аналитики и экспорта сохраняют текущие response contracts, если исправление не требуется для согласования domain-модели.

Workspace-команды валидируются до записи и сохраняются транзакционно. Удаление workspace удаляет принадлежащие scenario nodes и snapshots согласно внешним ключам/явной транзакции.

## Потоки

### Запуск

```text
Application start
  ↓
Open SQLite
  ↓
Load last published dataset
  ↓
Render UI immediately
  ↓
Run updater health check in background
  ↓
Stage → validate → publish if safe
  ↓
Invalidate analysis cache and show update status
```

### Анализ

```text
User selection
  ↓
Analysis service
  ↓
Capture one published dataset version
  ↓
Pure BP calculation
  ↓
Explainability + confidence
  ↓
AnalysisResult envelope
  ↓
UI
```

Один запрос использует одну dataset version даже если updater публикует новую версию во время вычисления.

### Сохранение workspace

```text
UI
  ↓
Validate command
  ↓
Workspace service
  ↓
SQLite transaction
  ├── workspace
  ├── scenario nodes
  ├── notes/state
  └── snapshot metadata
  ↓
Versioned response
```

## Обновление данных и ошибки

Updater:

- запускается при старте и периодически во время работы;
- использует bounded timeout и retry;
- не запускает сетевую работу, блокирующую UI;
- сохраняет raw snapshot для диагностики;
- не заменяет published dataset до прохождения проверок;
- отображает health status и причины отказов.

Ошибочная ситуация и политика:

| Ситуация | Поведение |
|---|---|
| Нет интернета | Работа на последнем published dataset |
| Источник недоступен | Ограниченный retry, затем staging failure |
| Некорректный snapshot | Reject с причиной |
| Скачок данных | Warning или reject по severity |
| Повреждённый workspace | Изолированная ошибка workspace, приложение продолжает работу |
| Ошибка расчёта | Понятная ошибка без NaN/Infinity |
| База занята | Ограниченный retry, затем безопасная ошибка |
| Обновление во время анализа | Запрос сохраняет одну dataset version |
| Несовместимая schema version | Миграция или read-only recovery |

Health status показывает как минимум:

```text
DATASET: OPERATIONAL | DEGRADED | STALE | FAILED
VERSION
LAST CHECK
COUNTRY COUNT
WARNINGS
```

## Первый production milestone

1. Завершить quality gates и устранить зависание lint.
2. Проверить production build и весь E2E suite.
3. Добавить dataset health и безопасный updater foundation.
4. Добавить workspace/projects CRUD с SQLite repository/service.
5. Реализовать базовый стратегический analysis view через существующий доменный слой.
6. Реализовать базовый сценарий и две What-If ветви.
7. Реализовать сравнение ветвей.
8. Добавить explainability ledger и confidence/warnings.
9. Добавить сохранение и повторное открытие workspace.
10. Добавить JSON/CSV export workspace и результатов.
11. Добавить unit, integration и E2E coverage для критического потока.

После milestone отдельными срезами развиваются breakpoint search, uncertainty bands, подробная provenance, printable reports и strategic-to-tactical handoff.

## Тестовая стратегия

### Unit/domain

- веса и нормализация BP;
- canonical tiers;
- детерминированность расчёта;
- explainability ledger;
- confidence aggregation;
- scenario branching;
- breakpoint search;
- dataset validation;
- zero/null semantics;
- mapper и API DTO validation.

### Integration

- source adapter timeout/retry;
- staging → validation → publish;
- rollback при критической ошибке;
- workspace CRUD в транзакции;
- dataset version consistency;
- безопасное удаление и duplicate workspace;
- сохранение/восстановление scenario tree.

### E2E

- запуск без интернета с локальным dataset;
- отображение health status;
- выбор страны и сравнение;
- создание двух сценарных ветвей;
- просмотр explainability;
- сохранение и повторное открытие workspace;
- export;
- обновление dataset без поломки открытого workspace;
- Mapbox fallback без token.

### Quality gates

```bash
npm run typecheck
npm run lint
npm test
npx playwright test --list
npx playwright test
npm run build
git diff --check
git status --short
```

Нельзя заявлять о завершении фазы без фактического вывода проверок.

## Границы и риски

- Формулы BP не меняются без отдельного доказанного дефекта и regression tests.
- Основной `sqlite.db` не удаляется.
- Mapbox token не придумывается и не коммитится.
- SafeLngLat workaround не удаляется без проверки на реальном token.
- Тактический legacy-код не удаляется в рамках стратегического milestone.
- Внешние источники не должны silently overwrite published dataset.
- Snapshot и formula version обязательны для воспроизводимости.
- Любая новая доменная логика должна иметь один источник истины и тесты на граничные случаи.
