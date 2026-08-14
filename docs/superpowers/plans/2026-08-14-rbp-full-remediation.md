# RBP Full Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Repair the confirmed API/data defects and harden the rbp-strateg application across database access, admin operations, tests, domain consistency, frontend resilience, pipeline reliability, performance, repository hygiene, and documentation.

**Architecture:** Use one raw `better-sqlite3` runtime layer under `src/db/` with a shared absolute DB path, connection helpers, and a single snake_case-to-camelCase country mapper. Keep Drizzle seed types where needed, but remove runtime dependence on duplicated raw mappings and make the existing hand-written schema the explicit source of truth for this remediation. Administrative DB mutations become authenticated POST operations and all replacements are transactional.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5, better-sqlite3, SQLite/WAL, Playwright, ESLint, Node 22, GitHub Actions.

## Global Constraints

- Do not invent or commit a Mapbox token; preserve the no-token fallback.
- Do not delete the primary `sqlite.db`.
- Do not perform a blind full Drizzle migration.
- Do not remove SafeLngLat without a verified replacement.
- Do not change BP formulas unless a test proves an existing defect.
- All DB handles opened by API code must close through `finally` or a helper that guarantees closure.
- All user-controlled SQL values must remain bound parameters.
- Admin routes require `x-admin-token` equal to `process.env.RBP_ADMIN_TOKEN`; missing configuration or invalid token returns 401 without DB access.
- Every task ends with focused verification; never claim a fix without command output.

## File Map

### New files

- `src/db/runtime.ts` — absolute DB path, readonly/read-write open helpers, shared pragmas, admin token check helper if appropriate.
- `src/db/country-mapper.ts` — raw SQLite country-row type and snake_case-to-camelCase mapping plus derived region helper.
- `src/lib/bp/tiers.ts` — canonical BP tier thresholds, labels, and colors.
- `tests/unit/country-mapper.test.ts` — mapper contract tests.
- `tests/unit/bp-tiers.test.ts` — tier boundary tests.
- `tests/unit/data-quality.test.ts` — legitimate-zero tests.
- `tests/unit/coalitions.test.ts` — coalition registry/aggregation tests.
- `tests/api/routes.test.ts` or an equivalent repository-supported API contract test file — four repaired endpoint contracts.
- `vitest.config.ts` — only if a unit runner is introduced and dependency installation is approved by the workflow.
- `.github/workflows/ci.yml` — lint, typecheck, unit/contract tests, Playwright artifacts.

### Modified files

- `src/app/api/analytics/route.ts`
- `src/app/api/data-quality/route.ts`
- `src/app/api/export/route.ts`
- `src/app/api/what-if/route.ts`
- `src/app/api/init-db/route.ts`
- `src/app/api/run-pipeline/route.ts`
- `src/scripts/data-pipeline/fetch-worldbank.ts`
- `src/lib/analytics.ts` only if needed to consume the shared mapped shape safely
- `src/lib/data-quality.ts` only if zero semantics belong in the library
- `src/lib/coalitions.ts`, `src/lib/coalition-analysis.ts`, `src/lib/bp/coalition-data.ts`
- tier consumers (`CountryCard.tsx`, `BPDetailTab.tsx`, `comparison.ts`, `coalition-analysis.ts`, `detailed-calculator.ts`)
- `src/components/map/MapErrorBoundary.tsx`
- `src/components/map/MapControls.tsx`
- `src/components/TacticalHUD.tsx` only for local accessibility fixes that do not alter simulation semantics
- `src/lib/rbp-engine.ts` only if a behavior-preserving optimization is demonstrated
- `e2e/app.spec.ts`
- `playwright.config.ts`
- `package.json`, `package-lock.json` only when scripts/dependencies are intentionally changed
- `.gitignore`
- `README.md`, `DEVELOPMENT.md`, `conductor/tech-stack.md`
- `src/lib/unit-database.ts.backup`, `server.log`, stale screenshot artifacts as approved cleanup

---

### Task 1: Establish the shared SQLite runtime and country mapper

**Files:**
- Create: `src/db/runtime.ts`
- Create: `src/db/country-mapper.ts`
- Modify: `src/app/api/countries/route.ts`
- Modify: `src/app/api/compare/route.ts`
- Modify: `src/app/api/coalitions/route.ts`
- Test: `tests/unit/country-mapper.test.ts` or the repository's selected contract-test location

**Interfaces:**
- Produce `DB_PATH: string`.
- Produce `openReadonlyDatabase(): Database.Database` and `openDatabase(): Database.Database` or equivalent helpers with explicit types.
- Produce `RawCountryRow` describing snake_case SQLite fields.
- Produce `mapCountryRow(row: RawCountryRow): CountryApiData`.
- Produce `mapCountryRows(rows: RawCountryRow[]): CountryApiData[]`.
- Produce `deriveRegion(side: string, coalition: string | null): string`.

- [ ] Write tests using a representative raw row containing non-zero values and legitimate zero values; assert every mapped field is correct and `region` is derived rather than read from SQL.
- [ ] Run the mapper test and record the expected initial failure if no unit runner exists; do not add a new runner until the dependency decision is explicit in the implementation branch.
- [ ] Implement runtime helpers using `path.resolve(process.cwd(), "sqlite.db")`, `journal_mode = WAL`, and `foreign_keys = ON` where safe.
- [ ] Implement the mapper from existing correct patterns in `countries/route.ts` and `compare/route.ts`; preserve zeros with nullish checks rather than `||`.
- [ ] Refactor countries, compare, and coalitions to use the shared mapper without changing response contracts.
- [ ] Run `npx tsc --noEmit` and targeted route/type checks.
- [ ] Commit: `refactor: centralize sqlite runtime and country row mapping`.

---

### Task 2: Repair the four affected API routes

**Files:**
- Modify: `src/app/api/analytics/route.ts`
- Modify: `src/app/api/data-quality/route.ts`
- Modify: `src/app/api/export/route.ts`
- Modify: `src/app/api/what-if/route.ts`
- Test: `tests/api/routes.test.ts` or equivalent

**Interfaces:**
- Consume `openReadonlyDatabase`, `mapCountryRow`, and `RawCountryRow` from Task 1.
- Preserve existing JSON/CSV response shapes wherever they are not demonstrably defective.

- [ ] Add contract tests for `analytics?type=ranking`, `data-quality?iso=USA`, `export?iso=USA&format=json`, `export?format=csv`, and POST `what-if` with `{"iso":"USA"}`.
- [ ] Assert USA is mapped as `isoCode: "USA"`, has non-zero BP, and exports contain real values.
- [ ] Replace SQL `isoCode` with `iso_code` and `bpTotal` with `bp_total`.
- [ ] Replace all raw-row camelCase reads with the shared mapper; remove `row.region` reads and derive region in code if the response needs it.
- [ ] Wrap every DB usage in a guaranteed-close path.
- [ ] Validate missing/unknown ISO values with stable 400/404 responses; preserve existing API error style.
- [ ] Run the contract tests, direct read-only SQLite probes, `npx tsc --noEmit`, and a production build.
- [ ] Commit: `fix: repair api country row mappings and sqlite columns`.

---

### Task 3: Secure and atomically implement admin database operations

**Files:**
- Modify: `src/app/api/init-db/route.ts`
- Modify: `src/app/api/run-pipeline/route.ts`
- Modify: `src/db/runtime.ts`
- Test: admin API contract tests

**Interfaces:**
- Produce a shared `isAuthorizedAdminRequest(request: Request): boolean` or equivalent.
- Admin routes expose only `POST` handlers.
- Missing/invalid `RBP_ADMIN_TOKEN` or header returns 401 before opening the DB.

- [ ] Add tests for missing token, wrong token, and correct token; assert unauthorized requests do not mutate the DB.
- [ ] Convert handlers from GET to POST and update comments/docs.
- [ ] Read `RBP_ADMIN_TOKEN` only on the server; never expose it through `NEXT_PUBLIC_*`.
- [ ] Wrap init delete, seed insert, BP calculation, and updates in one write transaction.
- [ ] Make run-pipeline replace the current country set atomically: calculate the complete new result first, then delete/insert within one transaction; ensure removed source countries do not persist.
- [ ] Close connections in `finally`, including failure paths.
- [ ] Run authorized/unauthorized route tests and a readonly row-count check before and after a controlled test operation.
- [ ] Commit: `fix: protect and atomically run database admin operations`.

---

### Task 4: Harden World Bank pipeline and normalize DB path use

**Files:**
- Modify: `src/scripts/data-pipeline/fetch-worldbank.ts`
- Modify: all remaining API routes that open relative `sqlite.db`
- Test: pipeline helper tests

- [ ] Add a bounded timeout of 15 seconds per request with `AbortSignal.timeout` or an equivalent Node 22-safe mechanism.
- [ ] Add at most two retries for transient network failures with bounded delay; do not retry malformed responses indefinitely.
- [ ] Preserve the existing fallback path when World Bank is unavailable.
- [ ] Verify the configured `per_page=300` response handling and make pagination explicit if the endpoint can return more pages.
- [ ] Replace all direct relative DB paths with the shared runtime helper.
- [ ] Run a mocked success, timeout, and retry-exhaustion test; run typecheck/build.
- [ ] Commit: `fix: bound external data pipeline and database paths`.

---

### Task 5: Repair test discovery and add deterministic gates

**Files:**
- Modify: `e2e/app.spec.ts`
- Modify: `playwright.config.ts`
- Modify: `package.json`
- Create/modify: unit and API contract test files
- Create: `vitest.config.ts` only if selected

- [ ] Replace `>=200` with a deterministic seed-aware assertion based on the known fixture contract, or assert required country codes and BP values instead of an arbitrary count.
- [ ] Remove stale hardcoded `localhost:3001` assumptions from discovered specs.
- [ ] Configure Playwright to include the intended test directories without accidentally running helper files.
- [ ] Remove broad error filtering for `NaN|LngLat|mapbox`; assert expected fallback behavior explicitly when no token is configured.
- [ ] Add package scripts: `typecheck`, `test`, and `test:e2e`; do not add a dependency if the current installed harness can support the tests.
- [ ] If Vitest is required, add the smallest compatible dependency and update lockfile; otherwise use a supported Node/Playwright contract harness.
- [ ] Run test listing first, then targeted tests, then full E2E with an explicit server lifecycle.
- [ ] Commit: `test: make api and e2e coverage deterministic`.

---

### Task 6: Unify BP tiers and coalition semantics

**Files:**
- Create: `src/lib/bp/tiers.ts`
- Modify: `src/lib/comparison.ts`
- Modify: `src/lib/coalition-analysis.ts`
- Modify: `src/lib/bp/detailed-calculator.ts`
- Modify: `src/components/CountryCard.tsx`
- Modify: `src/components/strategic/BPDetailTab.tsx`
- Modify: `src/lib/coalitions.ts`
- Modify: `src/lib/bp/coalition-data.ts` if unused
- Test: `tests/unit/bp-tiers.test.ts`, `tests/unit/coalitions.test.ts`

- [ ] Add boundary tests for the canonical 80/60/40/20 thresholds unless repository documentation proves another set is intended.
- [ ] Implement one `getBPTier`, `getBPTierLabel`, and color mapping; update all consumers.
- [ ] Fix `detailed-calculator.ts` component-key mapping so `weaponScore` maps to `weapon` rather than falling back to 0.1; add a weighted-score test even if the module is currently unused.
- [ ] Select one coalition registry and document the choice; preserve or explicitly name the aggregation semantics.
- [ ] Ensure component aggregates and total BP do not claim incompatible semantics; add invariants/tests.
- [ ] Remove unused duplicate registry/re-exports only after structural search confirms no consumer.
- [ ] Run domain tests, typecheck, and build.
- [ ] Commit: `fix: unify bp tiers and coalition calculations`.

---

### Task 7: Correct data-quality zero semantics

**Files:**
- Modify: `src/app/api/data-quality/route.ts` and/or `src/lib/data-quality.ts`
- Test: `tests/unit/data-quality.test.ts`

- [ ] Write tests showing zero nuclear warheads, zero aircraft carriers, and zero submarines are valid values, not missing fields.
- [ ] Change missing detection to distinguish absent/null/undefined from numeric zero.
- [ ] Keep genuine required-string and required-number missing checks explicit.
- [ ] Run focused tests and the data-quality API contract test.
- [ ] Commit: `fix: treat legitimate zero values as complete data`.

---

### Task 8: Harden Mapbox fallback and local frontend accessibility

**Files:**
- Modify: `src/components/map/MapErrorBoundary.tsx`
- Modify: `src/components/map/MapControls.tsx`
- Modify: `src/components/TacticalHUD.tsx` only for local a11y fixes
- Modify: `e2e/app.spec.ts`
- Modify: `.env.local.example` or documentation if appropriate

- [ ] Add a reset/retry action to `MapErrorBoundary` that clears error state and remounts children using a key or equivalent.
- [ ] Keep the empty-token fallback as the expected behavior and add a documented example environment file without a real secret.
- [ ] Label the duplicate `dark-dem` style accurately or replace it only if a known valid style exists.
- [ ] Add keyboard semantics and accessible labels to clickable tactical markers and icon-only controls without changing event behavior.
- [ ] Add a test for the retry button and no-token fallback; do not remove SafeLngLat yet.
- [ ] Run lint on touched frontend files, targeted E2E, and production build.
- [ ] Commit: `fix: make map fallback recoverable and improve tactical accessibility`.

---

### Task 9: Apply behavior-preserving performance hardening

**Files:**
- Modify: `src/lib/what-if-engine.ts`
- Modify: `src/app/api/compare/route.ts` if still needed after mapper refactor
- Modify: `src/lib/geo/country-boundaries.ts` or map data loader if safe
- Modify: `src/lib/rbp-engine.ts` only with equivalence tests
- Test: performance/equivalence tests

- [ ] Replace repeated country `.find` lookups with a `Map` where bounded behavior remains identical.
- [ ] Reuse cohort normalization data in what-if calculations only if output equality tests pass for all 59 current rows.
- [ ] Cache parsed static geometry without changing feature identity semantics relied upon by Mapbox/DeckGL.
- [ ] Do not implement spatial hashing unless a before/after equivalence test covers unit positions, separation, and simulation outcomes; otherwise document it as deferred.
- [ ] Run focused equivalence tests and build.
- [ ] Commit: `perf: reduce repeated country and geometry work`.

---

### Task 10: Repository cleanup, schema guidance, documentation, and CI

**Files:**
- Modify: `.gitignore`
- Modify: `README.md`
- Modify: `DEVELOPMENT.md`
- Modify: `conductor/tech-stack.md`
- Create: `.github/workflows/ci.yml`
- Delete only approved derived files: `server.log`, `dev.log`, `sqlite.db-wal`, `sqlite.db-shm`, `src/lib/unit-database.ts.backup`, stale screenshot scripts and generated screenshots
- Modify/replace: `drizzle/` guidance only where it cannot destroy current columns

- [ ] Add ignore rules for `server.log`, `dev.log`, `sqlite.db-*`, `.codebase-memory/`, and generated screenshot artifacts.
- [ ] Remove approved derived artifacts and untrack them where necessary; preserve `sqlite.db` and all source files not explicitly approved.
- [ ] Correct row counts, test discovery, endpoint methods, Mapbox setup, and DB-layer documentation.
- [ ] Remove the destructive `drizzle-kit push` instruction; replace it with the selected raw SQLite schema procedure and an explicit warning that Drizzle migration files are not the runtime source of truth.
- [ ] Add CI workflow with Node 22, `npm ci`, lint, typecheck, tests, Playwright installation, E2E, and uploaded reports.
- [ ] Run `git diff --check`, all available checks, and verify `git status` contains only intentional changes.
- [ ] Commit: `chore: align repository hygiene docs and ci`.

---

## Final Verification Gate

Run from `C:/Users/sundermeta/rbp-strateg`:

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

Additionally verify with a running app or route harness:

```bash
curl -s "http://localhost:3000/api/countries"
curl -s "http://localhost:3000/api/analytics?type=ranking"
curl -s "http://localhost:3000/api/data-quality?iso=USA"
curl -s "http://localhost:3000/api/export?iso=USA&format=json"
curl -s -X POST "http://localhost:3000/api/what-if" -H "content-type: application/json" -d '{"iso":"USA"}'
```

For admin routes, verify unauthorized requests return 401 and authorized requests require a locally supplied `RBP_ADMIN_TOKEN`; never print the token.
