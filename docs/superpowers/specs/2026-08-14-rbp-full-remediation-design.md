# RBP Strateg — Full Remediation Design

## Status

Approved design for implementation. Scope is the complete confirmed audit remediation, using a single raw `better-sqlite3` runtime layer. The real Mapbox token is not invented or committed; the existing fallback remains safe and documented.

## Goals

1. Remove the snake_case/camelCase API data corruption cluster.
2. Make database writes explicit, authenticated, atomic, and non-GET.
3. Establish reliable API/domain/test gates.
4. Reduce duplicated data access and domain constants without a risky full Drizzle migration.
5. Preserve the working BP calculation behavior and current no-token fallback.
6. Remove only approved derived artifacts and update documentation.

## Non-goals

- Do not invent or commit a Mapbox token.
- Do not perform a blind full migration to Drizzle.
- Do not remove the SafeLngLat workaround without a verified replacement.
- Do not change BP formulas unless tests prove an existing implementation defect.
- Do not delete the primary `sqlite.db`.

## Architecture

### Runtime database layer

Add a shared runtime module under `src/db/` responsible for:

- resolving the absolute database path from `process.cwd()`;
- opening read-only/read-write `better-sqlite3` connections;
- applying stable SQLite pragmas where appropriate;
- exposing small helpers that make `try/finally` closure straightforward.

Use this layer for API reads and writes. Keep Drizzle types only where they are still useful for seed typing until the repository's schema strategy is explicitly retired.

### Country row mapping

Add one shared mapper for raw SQLite rows. It must map all country columns from snake_case to the application camelCase shape, preserve legitimate zero values, and provide explicit defaults only where the domain type permits them. API routes must not hand-roll alternate mappings.

The mapper must cover the fields needed by:

- countries and comparison;
- analytics;
- what-if;
- data-quality;
- export;
- pipeline BP input.

`region` is derived in application code and is not read as a database column.

## API changes

### Correctness

Fix all four affected routes:

- `src/app/api/analytics/route.ts`
- `src/app/api/data-quality/route.ts`
- `src/app/api/export/route.ts`
- `src/app/api/what-if/route.ts`

Use `iso_code` and `bp_total` in SQL and the shared mapper for result rows. Preserve parameterized SQL and existing response contracts where possible.

### Administrative routes

Convert database-mutating handlers to:

- `POST /api/init-db`
- `POST /api/run-pipeline`

Require `x-admin-token` equal to `process.env.RBP_ADMIN_TOKEN`. If the environment secret is missing or the header is invalid, return `401` without touching the database. Keep no mutating GET compatibility route.

### Atomicity and lifecycle

- Wrap init seed/delete/insert/calculation writes in one transaction.
- Make pipeline replacement semantics match its documentation: replace the current country set atomically, or update the documentation if a deliberate merge is retained. Preferred behavior is atomic replacement.
- Ensure database handles close in `finally` paths.
- Normalize all database path handling through the shared runtime helper.

## Pipeline reliability

For World Bank fetching:

- add a bounded timeout using `AbortSignal.timeout` or equivalent;
- add bounded retry for transient failures;
- preserve graceful fallback behavior;
- avoid unbounded request hangs.

Do not make the route silently re-run expensive network work on ordinary GET requests.

## Domain consistency

### BP tiers

Create one canonical tier threshold/label implementation and update consumers to import it. Preserve the selected canonical thresholds unless existing product documentation clearly establishes another set; add tests for boundary values.

### Coalitions

Choose one registry and one explicitly named aggregation semantic. Preserve UI behavior where possible, but eliminate contradictory member lists and avg-vs-sum ambiguity. Add tests covering member counts and aggregation invariants.

### Data quality

Treat numeric zero as valid for count metrics. Report null/undefined/absent values as missing. Add tests for nuclear warheads, aircraft carriers, submarines, and other legitimate-zero fields.

## Frontend and Mapbox

- Keep the no-token fallback and document `NEXT_PUBLIC_MAPBOX_TOKEN` setup.
- Add a retry/reset action to `MapErrorBoundary`.
- Do not remove the SafeLngLat patch until a real-token verification demonstrates a safe replacement.
- Remove or narrow E2E error filtering so NaN/LngLat regressions are observable.
- Add accessible names/roles to interactive tactical elements where changes are local and low-risk.
- Fix the duplicate `dark-dem` style alias if the intended terrain style is known; otherwise label it accurately instead of claiming a distinct style.

## Testing and CI

Add or repair scripts for:

- `typecheck`: `tsc --noEmit`;
- `test`: unit/contract tests used by the repository;
- `test:e2e`: Playwright suite.

Make the active Playwright configuration discover the intended specs, remove stale hardcoded ports, and replace the impossible `>=200` assertion with a deterministic fixture/seed-aware contract. Add API contract coverage for the four repaired routes and unit coverage for the shared mapper, BP tiers, weights, data-quality zero handling, and coalition aggregation.

Add CI checks for lint, typecheck, unit/contract tests, and Playwright, preserving artifacts on failure.

## Performance

Implement only behavior-preserving improvements with tests:

- cache or reuse cohort normalization data for repeated what-if calculations where safe;
- use maps for repeated country lookup;
- cache parsed static geometry;
- evaluate a spatial index for tactical simulation only with equivalence tests.

Do not undertake a broad rewrite of the tactical engine in the same change if equivalence cannot be demonstrated.

## Repository hygiene and docs

Remove only approved derived artifacts:

- tracked runtime logs;
- stale dev logs;
- SQLite WAL/SHM fragments;
- byte-identical backup source;
- stale screenshot scripts and generated screenshots.

Update `.gitignore` for these patterns while preserving the primary database. Correct README, DEVELOPMENT, and conductor documentation for actual row counts, test discovery, DB strategy, admin endpoints, and Mapbox setup. Remove or replace destructive `drizzle-kit push` guidance until the schema strategy is made safe.

## Delivery order

1. Shared runtime DB helper and row mapper.
2. Four API correctness fixes and contract tests.
3. Admin authentication, POST handlers, atomic writes, pipeline timeout.
4. Test discovery/scripts and CI gates.
5. Domain consistency (tiers, coalitions, data quality).
6. Frontend Mapbox error/retry/accessibility changes.
7. Behavior-preserving performance improvements.
8. Cleanup and documentation.

Every phase must run focused verification before the next phase. No phase should claim success without command output.
