# Tracks — РБП-Стратег 2.0

## Completed Tracks

### Track 1: `map-foundation` — Реальная карта мира
**Priority:** P0 | **Status:** `[x]` complete | **Phase:** 1

Mapbox GL + Deck.gl strategic map integrated with SafeLngLat guards and no-token fallback.

### Track 2: `bp-model` — 8-компонентная модель боевого потенциала
**Priority:** P0 | **Status:** `[x]` complete | **Phase:** 1

Canonical BP formulas, calibrated weights, tier boundaries and regression contracts are active. Formula changes remain out of scope without new evidence.

### Track 3: `country-database` — Локальная база стран
**Priority:** P0 | **Status:** `[x]` complete for milestone | **Phase:** 1

Raw better-sqlite3 runtime, deterministic 59-country fixture, mapped API contracts and dataset version/health metadata are active. External pipeline refresh remains bounded and rollback-safe.

### Track 4: `country-card` — Карточка государства
**Priority:** P1 | **Status:** `[x]` complete | **Phase:** 1

Strategic country detail panel with BP decomposition and compatible tabs.

### Track 5: `analytics-layers` — Аналитические слои
**Priority:** P1 | **Status:** `[x]` complete | **Phase:** 2

Budget, equipment, personnel, nuclear and BP map layers are available through the existing selector.

### Track 6: `country-comparison` — Сравнение стран
**Priority:** P1 | **Status:** `[x]` complete | **Phase:** 2

Country comparison and coalition analysis contracts are covered by the existing API/UI suite.

### Track 7: `coalition-analysis` — Коалиционный анализ
**Priority:** P2 | **Status:** `[x]` complete | **Phase:** 2

NATO/CSTO/AUKUS/BRICS precedence and aggregation semantics are regression-tested.

### Track 8: `analytical-complex` — Dataset, workspaces, Scenario Lab
**Priority:** P0 | **Status:** `[x]` milestone complete | **Phase:** 1–2

Versioned dataset health, atomic publication/rollback, confidence and explainability, local workspaces, two scenario branches, JSON/CSV export, immutable snapshots and local operational documentation are implemented.

### Track 9: `tactical-map` — Тактический симулятор
**Priority:** P1 | **Status:** `[ ]` pending | **Phase:** 3

Tactical compatibility remains preserved. Full strategic-to-tactical handoff is deferred.

## Deferred Follow-up

- sensitivity/breakpoint engine;
- uncertainty bands and field-level provenance;
- printable PDF/reporting;
- always-on Windows Task Scheduler updater;
- team mode and authorization beyond local admin operations.
