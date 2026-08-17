# РБП-Стратег Analytical Complex Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the first production milestone of the local-first RBP-Strateg analytical complex: stable quality gates, versioned dataset health, workspace persistence, a two-branch strategic scenario lab, explainability, confidence/warnings, and export.

**Architecture:** Preserve the existing raw `better-sqlite3` runtime as the application source of truth. Add a small dataset metadata/version layer, a repository/service boundary for workspaces, and pure analysis helpers that wrap the existing BP and What-If engines without duplicating formulas. The UI will compose the existing strategic tabs with a new workspace/scenario surface; calculated BP results remain derived from the active published dataset and are never treated as stored source data.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5 strict mode, better-sqlite3, SQLite WAL, existing BP/What-If domain modules, Playwright contract/E2E tests, ESLint, Node 22, GitHub Actions.

## Global Constraints

- The first target user is one local analyst; ordinary local use requires no login.
- The application is local-first: the last published dataset must remain usable without internet.
- The updater runs at application start and periodically while the app is running; no Windows service is required in this milestone.
- Keep raw `better-sqlite3` as the runtime database layer; do not perform a blind full Drizzle migration.
- Do not delete the primary `sqlite.db`.
- External refresh must stage, validate, and publish atomically; a critical failure preserves the current published dataset.
- Stored workspaces and scenario nodes contain inputs and metadata; BP results are recalculated from the active dataset.
- Analysis responses include dataset version, formula version, calculation time, confidence, and warnings.
- Strategic calculations are deterministic; random simulation is not introduced into the strategic calculation path.
- Preserve the no-token Mapbox fallback and do not invent or commit a Mapbox token.
- Preserve the tactical compatibility modules and do not change tactical simulation semantics in this milestone.
- All user-controlled SQL values remain bound parameters.
- Every database handle opened by a route or service closes in `finally` or through a helper that guarantees closure.
- Every task ends with focused verification and a small commit; do not claim completion without command output.
- Existing user modifications in `.gitignore` and `package.json` are preserved and must not be overwritten or reverted.

---

## Scope and file map

### New files

- `src/db/dataset-schema.ts` — idempotent SQL for dataset metadata, snapshots, and application state.
- `src/db/dataset-repository.ts` — dataset version/health reads and atomic publish metadata operations.
- `src/lib/dataset/types.ts` — dataset status, health, source snapshot, validation result, and version DTOs.
- `src/lib/dataset/validation.ts` — structural/domain validation for staged country rows and pipeline summaries.
- `src/lib/dataset/updater.ts` — bounded refresh coordinator with single-flight guard, retry-aware source adapters, and publish decision.
- `src/lib/analysis/types.ts` — analysis envelope, confidence, warning, component delta, and scenario explanation types.
- `src/lib/analysis/explainability.ts` — pure functions that create component-driver ledgers from BP/What-If results.
- `src/lib/workspaces/types.ts` — workspace, scenario node, filters, and snapshot DTOs.
- `src/lib/workspaces/validation.ts` — strict JSON validation and bounds for workspace commands and scenario parameters.
- `src/db/workspace-schema.ts` — idempotent SQL for workspaces, scenario nodes, and result snapshots.
- `src/db/workspace-repository.ts` — transaction-safe CRUD for workspace entities.
- `src/lib/workspaces/service.ts` — application service that validates commands and delegates to the repository.
- `src/app/api/dataset/health/route.ts` — read-only health response plus non-blocking freshness check.
- `src/app/api/dataset/versions/route.ts` — published/rejected dataset version history.
- `src/app/api/workspaces/route.ts` — list/create workspaces.
- `src/app/api/workspaces/[id]/route.ts` — get/update/delete one workspace.
- `src/app/api/workspaces/[id]/scenarios/route.ts` — list/create scenario nodes.
- `src/app/api/workspaces/[id]/scenarios/[scenarioId]/route.ts` — update/delete scenario node.
- `src/app/api/workspaces/[id]/analysis/route.ts` — calculate a workspace scenario against one dataset version.
- `src/app/api/workspaces/[id]/export/route.ts` — JSON/CSV workspace export.
- `src/components/strategic/ScenarioLab.tsx` — base + two-branch scenario UI and branch comparison.
- `src/components/strategic/WorkspacePanel.tsx` — create/open/save/delete workspace controls and health indicator.
- `e2e/dataset-lifecycle.spec.ts` — dataset metadata, health, and validation contracts.
- `e2e/workspaces.spec.ts` — workspace and scenario CRUD contracts.
- `e2e/scenario-lab.spec.ts` — branch comparison and persistence flow.
- `e2e/explainability.spec.ts` — deterministic envelope and component-driver contracts.
- `.github/workflows/ci.yml` — lint, typecheck, E2E, build, and report artifacts.

### Modified files

- `src/db/runtime.ts` — shared transaction/schema initialization helpers if needed.
- `src/app/api/init-db/route.ts` — initialize new metadata/workspace tables transactionally.
- `src/app/api/run-pipeline/route.ts` — create staging version, validate, publish metadata atomically, and retain prior published version on failure.
- `src/scripts/data-pipeline/merge-validate.ts` — expose a typed pipeline result suitable for validation and source summaries without changing current merge semantics.
- `src/scripts/data-pipeline/fetch-worldbank.ts` — preserve bounded timeout/retry behavior and expose adapter metadata.
- `src/app/api/countries/route.ts` — return active dataset version metadata where the current response contract permits.
- `src/app/api/what-if/route.ts` — return analysis envelope and explanation while preserving `base`/`scenario` fields.
- `src/lib/what-if-engine.ts` — expose stable input diff/driver helpers only; do not change BP formulas.
- `src/lib/data-quality.ts` — expose aggregate confidence calculation without changing zero/null semantics.
- `src/app/page.tsx` — load health/workspace state and mount `WorkspacePanel`/`ScenarioLab` without changing strategic mode default.
- `src/components/strategic/WhatIfTab.tsx` — reuse scenario parameter controls through shared props or extract the calculation controls used by `ScenarioLab`.
- `src/components/strategic/index.ts` — export new strategic components.
- `e2e/core-api.spec.ts` — assert analysis envelope fields on existing What-If contract.
- `playwright.config.ts` — keep production-server discovery and add stable artifact paths if needed.
- `package.json` — only add scripts required by the plan; preserve the existing user lint-cache change.
- `README.md`, `DEVELOPMENT.md`, `conductor/tech-stack.md` — document local-first updater, active dataset, workspace API, and actual quality gates.
- `.gitignore` — preserve existing user changes and add only confirmed generated artifacts.

---

### Task 1: Establish and document the baseline quality gates

**Files:**
- Modify: `package.json`
- Modify: `playwright.config.ts`
- Modify: `e2e/app.spec.ts`
- Create: `.github/workflows/ci.yml`
- Test: existing `e2e/*.spec.ts`

**Interfaces:**
- Consumes: current `npm run lint`, `npm run typecheck`, `npm test`, and production `webServer` configuration.
- Produces: deterministic `lint`, `typecheck`, `test`, `test:e2e`, and CI commands; no product API changes.

- [ ] **Step 1: Capture the current baseline without changing source behavior.**

Run:

```bash
npm run typecheck
npm run lint
npx playwright test --list
npm run build
```

Record which command exceeds its timeout or fails. Do not alter `.gitignore` or `package.json` before inspecting the existing user diff.

- [ ] **Step 2: Write a deterministic app-shell regression test.**

In `e2e/app.spec.ts`, assert the known seeded fixture contract instead of an arbitrary country count:

```ts
test('country list contains required seeded countries', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('США', { exact: false })).toBeVisible();
  await expect(page.locator('[data-testid="country-list-item"]')).toHaveCount(59);
});
```

If the current markup has no stable test id, add `data-testid="country-list-item"` to the existing sidebar item without changing its click behavior.

- [ ] **Step 3: Make lint bounded and cache-safe.**

Keep the user’s existing command:

```json
"lint": "eslint --cache --cache-location .eslintcache"
```

Run it with a longer verification window and inspect `.eslintcache` size. If lint remains slow, narrow ESLint’s ignored/generated paths in `eslint.config.mjs`; do not disable rules or add a blanket ignore for `src/`.

- [ ] **Step 4: Add the CI workflow with the exact local gates.**

`.github/workflows/ci.yml` must run on pushes and pull requests with Node 22:

```yaml
- run: npm ci
- run: npx playwright install --with-deps chromium
- run: npm run lint
- run: npm run typecheck
- run: npm test
- run: npm run build
```

Upload `playwright-report/`, `test-results/`, and `.next` build logs on failure. Do not add a new unit-test dependency while Playwright pure-function specs cover the current domain tests.

- [ ] **Step 5: Run and commit the baseline gate changes.**

Run:

```bash
npm run lint
npm run typecheck
npx playwright test --list
npm run build
npm test
```

Commit only intentional changes:

```bash
git add package.json playwright.config.ts e2e/app.spec.ts .github/workflows/ci.yml eslint.config.mjs
git commit -m "test: establish analytical complex quality gates"
```

---

### Task 2: Add dataset version metadata, validation, and health contracts

**Files:**
- Create: `src/db/dataset-schema.ts`
- Create: `src/db/dataset-repository.ts`
- Create: `src/lib/dataset/types.ts`
- Create: `src/lib/dataset/validation.ts`
- Create: `src/app/api/dataset/health/route.ts`
- Create: `src/app/api/dataset/versions/route.ts`
- Modify: `src/app/api/init-db/route.ts`
- Test: `e2e/dataset-lifecycle.spec.ts`

**Interfaces:**
- Produce `ensureDatasetSchema(db: Database.Database): void`.
- Produce `getPublishedDataset(db): DatasetVersion | null`.
- Produce `getDatasetHealth(db): DatasetHealth`.
- Produce `listDatasetVersions(db, limit): DatasetVersion[]`.
- Produce `validateCountryDataset(rows: RawCountryRow[]): ValidationSummary`.
- Produce `type DatasetStatus = 'staging' | 'validated' | 'published' | 'rejected' | 'superseded'`.
- Consume `RawCountryRow` and the existing country table without changing BP formulas.

- [ ] **Step 1: Write failing health and validation contracts.**

Create `e2e/dataset-lifecycle.spec.ts` with these expectations:

```ts
test('health reports an operational published dataset', async ({ request }) => {
  const response = await request.get('/api/dataset/health');
  expect(response.ok()).toBe(true);
  const health = await response.json();
  expect(['OPERATIONAL', 'DEGRADED', 'STALE']).toContain(health.status);
  expect(health.datasetVersion).toBeTruthy();
  expect(health.countryCount).toBe(59);
});

test('versions expose status and validation counters', async ({ request }) => {
  const response = await request.get('/api/dataset/versions');
  expect(response.ok()).toBe(true);
  const body = await response.json();
  expect(body.versions[0]).toMatchObject({ status: 'published' });
  expect(typeof body.versions[0].warningCount).toBe('number');
});
```

Add a pure validation case in the same Playwright file using an exported helper: a row with BP values outside `0..100`, duplicate ISO codes, or non-finite values must produce an error; numeric zero values must remain valid.

- [ ] **Step 2: Add idempotent SQLite metadata tables.**

`ensureDatasetSchema` must create:

```sql
CREATE TABLE IF NOT EXISTS dataset_versions (
  id TEXT PRIMARY KEY,
  version TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('staging','validated','published','rejected','superseded')),
  created_at TEXT NOT NULL,
  published_at TEXT,
  source_summary_json TEXT NOT NULL DEFAULT '{}',
  validation_summary_json TEXT NOT NULL DEFAULT '{}',
  warning_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS source_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dataset_version_id TEXT NOT NULL REFERENCES dataset_versions(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  fetched_at TEXT NOT NULL,
  status TEXT NOT NULL,
  payload_json TEXT,
  error_message TEXT
);

CREATE TABLE IF NOT EXISTS app_state (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

Use `INSERT ... ON CONFLICT` for the active published version key. JSON columns must be serialized and parsed through typed helpers, not returned as unvalidated arbitrary objects.

- [ ] **Step 3: Implement validation with explicit critical and warning classes.**

`validateCountryDataset` must:

- reject duplicate/empty ISO codes;
- reject missing required strings;
- reject non-finite numeric values;
- reject BP component values outside `0..100`;
- treat `0` as present for counts and metrics;
- warn on fewer than 59 rows or a large row-count delta from the active dataset;
- return `{ ok, errors, warnings, rowCount, isoCount }`.

- [ ] **Step 4: Initialize metadata from the current fixture.**

Update `POST /api/init-db` so its existing transaction also calls `ensureDatasetSchema`, creates a deterministic initial version such as `seed-<updatedAt>`, and sets `app_state.current_published_dataset_id`. Do not delete or recreate `sqlite.db`; ensure rerunning init remains atomic and idempotent.

- [ ] **Step 5: Implement health/version routes and verify.**

`GET /api/dataset/health` must open read-only SQLite, call `getDatasetHealth`, close in `finally`, and return the last published version even if no network is available. `GET /api/dataset/versions` returns newest first with parsed summaries and no raw payload bodies.

Run:

```bash
npx playwright test e2e/dataset-lifecycle.spec.ts
npm run typecheck
npm run build
```

Commit:

```bash
git add src/db/dataset-schema.ts src/db/dataset-repository.ts src/lib/dataset src/app/api/dataset src/app/api/init-db/route.ts e2e/dataset-lifecycle.spec.ts
git commit -m "feat: add versioned dataset health metadata"
```

---

### Task 3: Make pipeline publication versioned and rollback-safe

**Files:**
- Create: `src/lib/dataset/updater.ts`
- Modify: `src/app/api/run-pipeline/route.ts`
- Modify: `src/scripts/data-pipeline/merge-validate.ts`
- Modify: `src/scripts/data-pipeline/fetch-worldbank.ts` only for typed source metadata if required
- Modify: `src/db/dataset-repository.ts`
- Test: `e2e/dataset-lifecycle.spec.ts`, `e2e/admin-api.spec.ts`

**Interfaces:**
- Produce `type PipelineCandidate = { countries: MergedCountry[]; conflicts: ConflictRecord[]; stats: PipelineStats; sourceSummary: SourceSummary }`.
- Produce `publishPipelineCandidate(db, candidate, version): PublishResult`.
- Produce `refreshDatasetIfDue(options): Promise<RefreshOutcome>` with a single-flight guard.
- Consume the existing `runPipeline()` and `calculateAllCountriesBP()` outputs.

- [ ] **Step 1: Add failure-path tests before changing the route.**

Add admin contract coverage:

```ts
test('failed authorized pipeline preserves the published row count', async ({ request }) => {
  const before = await request.get('/api/countries');
  const beforeRows = await before.json();
  // Use a test-only injected pipeline failure flag, never a real network failure.
  const response = await request.post('/api/run-pipeline', {
    headers: { 'x-admin-token': process.env.RBP_ADMIN_TOKEN ?? 'test-token' },
    data: { testFailure: 'before-publish' },
  });
  expect(response.status()).toBe(500);
  const afterRows = await (await request.get('/api/countries')).json();
  expect(afterRows).toHaveLength(beforeRows.length);
});
```

The test hook must be disabled unless `NODE_ENV === 'test'`; it must not be a production feature.

- [ ] **Step 2: Separate candidate construction from publication.**

Refactor the route into:

```ts
const candidate = await buildPipelineCandidate();
const result = publishPipelineCandidate(sqlite, candidate, createDatasetVersion(candidate));
```

`buildPipelineCandidate` performs network fetch, merge, validation, and in-memory BP calculation. It must not open SQLite or mutate the current dataset.

- [ ] **Step 3: Publish in one transaction.**

Inside one SQLite transaction:

1. insert a `staging` version;
2. validate the complete candidate;
3. mark it `validated`;
4. mark the previous published version `superseded`;
5. delete/replace `countries` using the existing bound insert statement;
6. mark the candidate `published` with `published_at`;
7. update `app_state.current_published_dataset_id`.

On any thrown error, rollback all steps and mark no new published version. Keep prior country rows and prior app state intact.

- [ ] **Step 4: Add the non-blocking updater coordinator.**

Implement `refreshDatasetIfDue` with:

- a process-local promise guard preventing concurrent refreshes;
- a freshness interval read from `RBP_DATA_REFRESH_INTERVAL_MS` with a safe default of 6 hours;
- bounded source retries inherited from `fetchWorldBankData`;
- no throw into the UI health request;
- a result stored in dataset version metadata and logs.

`GET /api/dataset/health` may call `void refreshDatasetIfDue(...)` after returning the current health, but the response must never wait for the network or change the response shape during refresh.

- [ ] **Step 5: Verify authenticated success, failure, and rollback.**

Run:

```bash
npx playwright test e2e/admin-api.spec.ts e2e/dataset-lifecycle.spec.ts
npm run typecheck
npm run build
```

Commit:

```bash
git add src/lib/dataset/updater.ts src/app/api/run-pipeline/route.ts src/scripts/data-pipeline src/db/dataset-repository.ts e2e/admin-api.spec.ts e2e/dataset-lifecycle.spec.ts
git commit -m "feat: publish datasets atomically with rollback"
```

---

### Task 4: Add analysis envelopes, confidence, and explainability

**Files:**
- Create: `src/lib/analysis/types.ts`
- Create: `src/lib/analysis/explainability.ts`
- Modify: `src/lib/data-quality.ts`
- Modify: `src/lib/what-if-engine.ts`
- Modify: `src/app/api/what-if/route.ts`
- Modify: `e2e/core-api.spec.ts`
- Create: `e2e/explainability.spec.ts`

**Interfaces:**
- Produce `AnalysisMetadata` with `datasetVersion`, `formulaVersion`, `calculatedAt`, `confidence`, and `warnings`.
- Produce `ScenarioExplanation` with `totalDelta`, `componentDeltas`, `topPositiveDrivers`, `topNegativeDrivers`, `changedInputs`, `confidenceScore`, and `warnings`.
- Produce `buildScenarioExplanation(result: ScenarioResult, confidence: ConfidenceSummary): ScenarioExplanation`.
- Preserve existing `ScenarioResult` fields and existing `/api/what-if` `base` and `scenario` keys.

- [ ] **Step 1: Write deterministic explanation tests.**

Create `e2e/explainability.spec.ts` with a pure function contract:

```ts
test('explanation is deterministic and ranks component drivers', () => {
  const first = buildScenarioExplanation(sampleScenarioResult, sampleConfidence);
  const second = buildScenarioExplanation(sampleScenarioResult, sampleConfidence);
  expect(second).toEqual(first);
  expect(first.componentDeltas).toHaveLength(8);
  expect(first.topPositiveDrivers.length).toBeLessThanOrEqual(3);
});
```

Add an API test that `/api/what-if` returns `metadata` and `explanation` while `body.base.isoCode` and `body.scenario.totalBP` remain unchanged.

- [ ] **Step 2: Implement typed analysis envelope and confidence aggregation.**

Use the existing `assessDataQuality`/`computeMissingFields` semantics. Define:

```ts
export interface ConfidenceSummary {
  score: number;
  level: 'high' | 'medium' | 'low';
  missingFieldCount: number;
  warnings: string[];
}
```

Numeric zero must not reduce confidence merely because it is zero. Confidence reduction comes from missing fields, low source quality, or stale dataset metadata.

- [ ] **Step 3: Implement explainability as a pure adapter.**

Sort component deltas by signed magnitude, preserve all eight components, and represent changed parameters by their public names and before/after values. Use the existing `ComponentDelta` values; do not recalculate BP or alter weights.

- [ ] **Step 4: Add metadata to the What-If route.**

Read the active dataset version once before calculation. Return:

```json
{
  "metadata": {
    "datasetVersion": "seed-...",
    "formulaVersion": "bp-v2",
    "calculatedAt": "2026-08-17T...Z",
    "confidence": { "score": 0.92, "level": "high" },
    "warnings": []
  },
  "explanation": { "totalDelta": 1.2, "componentDeltas": [] },
  "base": {},
  "scenario": {}
}
```

- [ ] **Step 5: Verify no formula regression.**

Run:

```bash
npx playwright test e2e/core-api.spec.ts e2e/explainability.spec.ts e2e/bp-tiers.spec.ts e2e/data-quality.spec.ts
npm run typecheck
```

Commit:

```bash
git add src/lib/analysis src/lib/data-quality.ts src/lib/what-if-engine.ts src/app/api/what-if/route.ts e2e/core-api.spec.ts e2e/explainability.spec.ts
git commit -m "feat: expose explainable strategic analysis results"
```

---

### Task 5: Implement workspace persistence repository and API

**Files:**
- Create: `src/lib/workspaces/types.ts`
- Create: `src/lib/workspaces/validation.ts`
- Create: `src/db/workspace-schema.ts`
- Create: `src/db/workspace-repository.ts`
- Create: `src/lib/workspaces/service.ts`
- Create: `src/app/api/workspaces/route.ts`
- Create: `src/app/api/workspaces/[id]/route.ts`
- Create: `src/app/api/workspaces/[id]/scenarios/route.ts`
- Create: `src/app/api/workspaces/[id]/scenarios/[scenarioId]/route.ts`
- Create: `src/app/api/workspaces/[id]/analysis/route.ts`
- Modify: `src/app/api/init-db/route.ts`
- Test: `e2e/workspaces.spec.ts`

**Interfaces:**
- Produce `WorkspaceInput`, `WorkspaceRecord`, `ScenarioNodeInput`, `ScenarioNodeRecord`, `WorkspaceState`, and `WorkspaceSnapshotRecord`.
- Produce `createWorkspace(input): WorkspaceRecord`.
- Produce `updateWorkspace(id, patch): WorkspaceRecord`.
- Produce `deleteWorkspace(id): void`.
- Produce `createScenarioNode(workspaceId, input): ScenarioNodeRecord`.
- Produce `updateScenarioNode(workspaceId, scenarioId, patch): ScenarioNodeRecord`.
- Produce `deleteScenarioNode(workspaceId, scenarioId): void`.
- Produce `getWorkspaceAnalysis(workspaceId, scenarioId): AnalysisResult`.
- All repository functions accept an explicit `Database.Database` and never open hidden connections.

- [ ] **Step 1: Write CRUD and validation tests.**

Create `e2e/workspaces.spec.ts`:

```ts
test('workspace CRUD persists state and scenario nodes', async ({ request }) => {
  const created = await (await request.post('/api/workspaces', {
    data: { name: 'Baltic Study', selectedCountryIso: 'USA', comparisonIsos: ['RUS'] },
  })).json();
  expect(created.workspace.name).toBe('Baltic Study');

  const scenario = await (await request.post(`/api/workspaces/${created.workspace.id}/scenarios`, {
    data: { name: 'Budget branch', params: defaultScenarioParams },
  })).json();
  expect(scenario.scenario.workspaceId).toBe(created.workspace.id);

  const reopened = await (await request.get(`/api/workspaces/${created.workspace.id}`)).json();
  expect(reopened.workspace.selectedCountryIso).toBe('USA');
  expect(reopened.scenarios).toHaveLength(1);

  await request.delete(`/api/workspaces/${created.workspace.id}`);
  expect((await request.get(`/api/workspaces/${created.workspace.id}`)).status()).toBe(404);
});
```

Add validation tests for empty names, unknown ISO codes, comparison lists longer than four, malformed `state_json`, scenario depth above three, and invalid numeric parameters. Add a test proving a failed child insert leaves no partial workspace mutation.

- [ ] **Step 2: Add idempotent workspace tables.**

`ensureWorkspaceSchema` must create:

```sql
CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  base_data_version TEXT NOT NULL,
  selected_country_iso TEXT,
  comparison_isos_json TEXT NOT NULL DEFAULT '[]',
  active_tab TEXT NOT NULL DEFAULT 'summary',
  active_map_layer TEXT NOT NULL DEFAULT 'bp',
  filters_json TEXT NOT NULL DEFAULT '{}',
  notes TEXT NOT NULL DEFAULT '',
  schema_version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS workspace_scenarios (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  parent_id TEXT REFERENCES workspace_scenarios(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  params_json TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS workspace_snapshots (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  scenario_id TEXT REFERENCES workspace_scenarios(id) ON DELETE SET NULL,
  dataset_version TEXT NOT NULL,
  formula_version TEXT NOT NULL,
  result_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
```

- [ ] **Step 3: Implement strict validation and repository transactions.**

Validate before SQL:

- name length 1–120;
- description length at most 2,000;
- notes length at most 20,000;
- `comparisonIsos.length <= 4` and all ISO values match the country table;
- `activeTab` and `activeMapLayer` are known unions;
- scenario JSON exactly contains the `ScenarioParams` keys and finite bounded numbers;
- parent belongs to the same workspace and creates depth no greater than 3.

Create/update/delete workspace and scenario operations must use one transaction when multiple tables change. Use `crypto.randomUUID()` for IDs and ISO timestamps.

- [ ] **Step 4: Implement API routes and consistent errors.**

Return `400` for invalid command bodies, `404` for unknown workspace/scenario IDs, `409` for depth/parent conflicts, and `500` only for unexpected failures. Every route opens read-only or read-write SQLite through the shared runtime and closes in `finally`.

- [ ] **Step 5: Implement workspace analysis endpoint.**

`GET /api/workspaces/:id/analysis?scenarioId=<id>` must:

1. load workspace and scenario;
2. capture the current published dataset version;
3. load mapped countries;
4. call `calculateWhatIf`;
5. build the analysis envelope and explanation;
6. return the result without writing a snapshot unless `POST /.../analysis/snapshot` is added later.

- [ ] **Step 6: Verify and commit.**

Run:

```bash
npx playwright test e2e/workspaces.spec.ts
npm run typecheck
npm run build
```

Commit:

```bash
git add src/lib/workspaces src/db/workspace-schema.ts src/db/workspace-repository.ts src/app/api/workspaces src/app/api/init-db/route.ts e2e/workspaces.spec.ts
git commit -m "feat: persist analytical workspaces and scenario trees"
```

---

### Task 6: Build the two-branch Scenario Lab UI

**Files:**
- Create: `src/components/strategic/ScenarioLab.tsx`
- Create: `src/components/strategic/WorkspacePanel.tsx`
- Modify: `src/components/strategic/WhatIfTab.tsx`
- Modify: `src/components/strategic/index.ts`
- Modify: `src/app/page.tsx`
- Modify: `src/app/globals.css` only for local styles required by the new panel
- Test: `e2e/scenario-lab.spec.ts`, `e2e/app.spec.ts`

**Interfaces:**
- `ScenarioLabProps = { workspaceId: string | null; allCountries: CountryCompareData[]; selectedIso: string | null; onWorkspaceChange(id: string | null): void }`.
- `WorkspacePanelProps = { workspace: WorkspaceRecord | null; health: DatasetHealth | null; onOpen(id: string): void; onCreate(input: WorkspaceInput): Promise<void>; onSave(patch: WorkspacePatch): Promise<void> }`.
- `ScenarioLab` consumes the existing `ScenarioParams`, `calculateWhatIf` response shape, and workspace API; it must not implement BP formulas.

- [ ] **Step 1: Write the UI flow test.**

In `e2e/scenario-lab.spec.ts`:

```ts
test('analyst creates and compares two scenario branches', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /сценар|what-if/i }).click();
  await page.getByRole('button', { name: /создать workspace/i }).click();
  await page.getByLabel('Название workspace').fill('Baltic Study');
  await page.getByRole('button', { name: /сохранить workspace/i }).click();
  await page.getByRole('button', { name: /добавить ветку/i }).click();
  await page.getByLabel('Название ветки').fill('Budget branch');
  await page.getByRole('button', { name: /добавить ветку/i }).click();
  await expect(page.getByTestId('scenario-branch-card')).toHaveCount(2);
  await expect(page.getByTestId('scenario-explanation')).toBeVisible();
});
```

Add selectors/accessible labels in the component rather than relying on CSS or text fragments.

- [ ] **Step 2: Extract reusable What-If controls.**

Move the selected-country and parameter control section from `WhatIfTab.tsx` into a typed internal component or shared module. Keep URL import/export behavior working. The extracted control must emit `onParamsChange(params)` and receive `params`/`onReset` instead of owning duplicate calculation logic.

- [ ] **Step 3: Implement workspace panel actions.**

`WorkspacePanel` must:

- display dataset health and active version;
- create a workspace with current country/comparison/tab/layer state;
- open a saved workspace and restore selected country, comparison list, active tab, active layer, filters, and notes;
- save changes through the workspace API;
- delete only after an explicit confirmation;
- show offline/stale health without blocking local workspace use.

- [ ] **Step 4: Implement two-branch comparison.**

`ScenarioLab` must render:

- base scenario card;
- branch A and branch B cards;
- total BP before/after;
- rank and tier changes;
- eight component deltas;
- top positive/negative drivers;
- confidence and warnings;
- changed input list.

Branches are persisted as scenario nodes. Results are loaded from `/analysis` and are recalculated whenever the active dataset version changes.

- [ ] **Step 5: Integrate without changing strategic default.**

Mount `WorkspacePanel` and `ScenarioLab` from the existing strategic page while keeping `mode === 'strategic'` as the default and preserving all existing strategic tabs. Do not delete `TacticalHUD`, `DuelSimulator`, `HolographicMap`, or the existing What-If route.

- [ ] **Step 6: Run UI verification and commit.**

Run:

```bash
npx playwright test e2e/app.spec.ts e2e/scenario-lab.spec.ts
npm run lint
npm run typecheck
npm run build
```

Commit:

```bash
git add src/components/strategic src/app/page.tsx src/app/globals.css e2e/app.spec.ts e2e/scenario-lab.spec.ts
 git commit -m "feat: add two-branch strategic scenario lab"
```

---

### Task 7: Add workspace export and result snapshots

**Files:**
- Modify: `src/app/api/workspaces/[id]/export/route.ts`
- Modify: `src/db/workspace-repository.ts`
- Modify: `src/lib/workspaces/service.ts`
- Modify: `src/lib/analysis/types.ts`
- Modify: `e2e/workspaces.spec.ts`
- Test: existing `src/app/api/export/route.ts` contract and new workspace export tests

**Interfaces:**
- Produce `exportWorkspaceJson(workspaceId): WorkspaceExport`.
- Produce `exportWorkspaceCsv(workspaceId): string`.
- Produce `createWorkspaceSnapshot(workspaceId, scenarioId, analysis): WorkspaceSnapshotRecord`.
- Preserve the existing country export API and its response/CSV headers.

- [ ] **Step 1: Write export contract tests.**

Add tests that create a workspace and scenario, request both formats, and assert:

```ts
expect(json.workspace.schemaVersion).toBe(1);
expect(json.datasetVersion).toBeTruthy();
expect(json.scenarios).toHaveLength(1);
expect(csv).toContain('workspaceId');
expect(csv).toContain('scenarioId');
expect(csv).toContain('totalBP');
```

- [ ] **Step 2: Implement a stable export DTO.**

JSON export must include workspace metadata, scenario inputs, active dataset/formula versions, and optional latest calculated explanation. It must not include raw source payloads or secrets. CSV must use stable headers and one row per scenario with component deltas flattened to named columns.

- [ ] **Step 3: Implement immutable snapshots.**

When the UI requests “save result snapshot”, store the complete `AnalysisResult` envelope with dataset and formula versions. Never overwrite a snapshot; create a new ID. Reopening a workspace still recalculates live results, while snapshots remain historical evidence for reports.

- [ ] **Step 4: Verify export and commit.**

Run:

```bash
npx playwright test e2e/workspaces.spec.ts e2e/core-api.spec.ts
npm run typecheck
npm run build
```

Commit:

```bash
git add src/app/api/workspaces src/db/workspace-repository.ts src/lib/workspaces src/lib/analysis e2e/workspaces.spec.ts
 git commit -m "feat: export workspaces and preserve analysis snapshots"
```

---

### Task 8: Documentation, operational UX, and final integration gates

**Files:**
- Modify: `README.md`
- Modify: `DEVELOPMENT.md`
- Modify: `conductor/tech-stack.md`
- Modify: `conductor/tracks.md`
- Modify: `e2e/app.spec.ts`
- Modify: `e2e/core-api.spec.ts`
- Modify: `.gitignore`
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- Documentation must describe the actual commands, local-first behavior, dataset health, workspace endpoints, and admin token policy.
- No source API contract changes are introduced in this task.

- [ ] **Step 1: Add health and offline UX coverage.**

Add an E2E test that mocks the updater network failure while `/api/countries` remains available and the UI shows the last dataset/health warning. Add an accessible health indicator with a stable test id.

- [ ] **Step 2: Update operational documentation.**

Document:

- `npm run dev`, `npm run build`, `npm run start`;
- `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:e2e`;
- local SQLite as runtime source of truth;
- automatic startup/periodic updater;
- offline fallback and rollback policy;
- workspace/scenario API routes;
- `RBP_ADMIN_TOKEN` for destructive admin operations;
- `NEXT_PUBLIC_MAPBOX_TOKEN` as optional and never committed;
- how to inspect dataset health and version history.

- [ ] **Step 3: Align conductor tracks with the actual milestone.**

Mark the existing completed remediation tracks accurately and add the analytical-complex milestone with explicit status and scope. Do not claim tactical integration is complete; it remains a later track.

- [ ] **Step 4: Keep generated artifacts ignored without touching user changes.**

Retain the existing `.eslintcache` rule. Add only verified patterns for updater logs, generated reports, and test screenshots. Do not remove `sqlite.db` or alter unrelated ignore rules.

- [ ] **Step 5: Run the complete final gate.**

From `C:/Users/sundermeta/rbp-strateg` run:

```bash
npm run typecheck
npm run lint
npm test
npx playwright test --list
npm run build
git diff --check
git status --short
```

Then run a clean production-server E2E pass with no reused stale server:

```bash
CI=1 npm test
```

Verify manually through the running app/API:

```bash
curl -s http://localhost:3000/api/dataset/health
curl -s http://localhost:3000/api/dataset/versions
curl -s http://localhost:3000/api/workspaces
curl -s http://localhost:3000/api/countries
curl -s -X POST http://localhost:3000/api/what-if \
  -H 'content-type: application/json' \
  -d '{"iso":"USA"}'
```

- [ ] **Step 6: Commit documentation and integration changes.**

```bash
git add README.md DEVELOPMENT.md conductor .gitignore .github/workflows/ci.yml e2e/app.spec.ts e2e/core-api.spec.ts
git commit -m "docs: align analytical complex operations and delivery gates"
```

---

## Deferred follow-up plans

These are intentionally separate plans after the first production milestone:

1. **Sensitivity and breakpoint engine** — sweep one parameter across a bounded range, identify rank/tier crossings, and render a breakpoint chart with deterministic tests.
2. **Uncertainty bands and provenance** — field-level source lineage, confidence propagation, seeded perturbation runs, and robustness scoring.
3. **Reporting** — printable analysis brief/PDF with citations, dataset/formula metadata, and immutable snapshots.
4. **Strategic-to-tactical handoff** — convert an immutable strategic scenario snapshot into a tactical scenario without changing either engine’s source of truth.
5. **Always-on updater** — optional Windows Task Scheduler integration for updates while the application is closed.
6. **Team mode** — users, roles, collaboration, and remote persistence only after local-first APIs have stable repository boundaries.

## Final acceptance criteria

The first milestone is complete only when all of the following are true:

- `npm run typecheck` passes.
- `npm run lint` completes without a timeout.
- `npm test` passes the full discovered suite.
- `CI=1 npm test` passes against a fresh production server.
- `npm run build` passes.
- The app renders the last published dataset without internet.
- Dataset health/version endpoints report the active version and warnings.
- Pipeline failure leaves the previous published countries and version intact.
- A local analyst can create, save, reopen, update, duplicate, delete, and export a workspace.
- A workspace can contain a base scenario and two child branches.
- Branch analysis shows all eight component deltas, drivers, confidence, warnings, rank, and tier.
- `/api/what-if` preserves its existing base/scenario fields while exposing metadata/explanation.
- No BP formula changes were introduced without regression evidence.
- `git diff --check` is clean and only intentional files remain modified.
