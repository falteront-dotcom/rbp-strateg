# rbp-strateg — Cross-Validated Audit Report

**Repo:** `C:/Users/sundermeta/rbp-strateg` · **Head:** `8a234ef` (2 doc commits past audited `bb97141`)
**Working tree:** lint `--cache` fix **uncommitted** (`package.json` + `.gitignore`)
**Basis:** 5 independent audits, cross-validated against repo artifacts (grep + targeted reads). Every code-level claim below was re-verified at head.

---

## Verdict summary

| Source audit | Reliability | Notes |
|---|---|---|
| Audit 3 (defects) | ✅ **Reliable** | Every code-level claim survived grep. F10/F4 adjusted. |
| Audit 5 (pipeline/UI) | ✅ **Reliable** | HIGH finding confirmed; BRICS mismatch worse than first reported. |
| Audit 2 (infra) | ✅ Accurate, superseded | PASS verified at `bb97141`; F2/F3 noise rejected. |
| Audit 1 (lint hang) | ⚠️ Fix good, uncommitted | `--cache` works (2.96s); Defender diagnosis unverifiable. |
| Audit 4 (workspace plan) | ⚠️ Directionally right | Overstates cheapness; one file-size claim wrong. |

**No audit contained fabricated code claims.** Findings stored under `cross-validation-validator`.

---

## 1 · CRITICAL — NATO-seeded allies silently demoted to NEUTRAL

**Severity: HIGH** · `src/scripts/data-pipeline/merge-validate.ts:89-118`

`deriveSide()` returns `"NEUTRAL"` for **9 countries the seed data intentionally lists as NATO-side allies** — JPN, KOR, ISR, AUS, TWN, SGP, PHI, NZL, UKR — because:

- `NATO_MEMBERS` is a strict 33-member set (USA→BIH, incl. FIN/SWE); the seed's extended list treats the 9 as NATO-leaning.
- **`AUKUS_MEMBERS` (`USA`,`AUS`,`GBR`) is dead code** — defined at line 92, referenced only by `deriveCoalition()` which is never called (only `deriveSide` is used at line 241-242).
- **BRICS mismatch:** `BRICS_MEMBERS` has 10 members (CHN RUS IND BRA ZAF SAU IRN UAE EGY ETH) but the seed only carries CHN+RUS as BRICS-side; the other 8 also fall to NEUTRAL or wrong coalition.
- **Why invisible:** the e2e pipeline path is **opt-in** (`RBP_PIPELINE_E2E` env var) and is **never set in CI** — `ci.yml:43` explicitly keeps `run-pipeline` opted-out for determinism. The happy-path e2e seeds the 59-country fixture directly via `init-db`, so demotion never surfaces.

**Impact:** every downstream map/UI grouping, coalition legend, and region label for 9 allied countries is wrong in any fresh pipeline run. Not a display bug — the stored data is wrong.

**Recommended fix (in priority order):**
1. **Remove the dead `AUKUS_MEMBERS`/`deriveCoalition` branch ambiguity** — either wire `deriveCoalition` into the merge output or delete it. Current state invites future misuse.
2. **Align the seed and the set:** decide the intended taxonomy (strict-NATO vs. allied), then make `deriveSide` handle the 9 explicitly (e.g. an `ALLIES` set returning NATO-side) and expand the seed's BRICS-side to all 10, or trim `BRICS_MEMBERS` to what the seed actually provides.
3. **Add an offline smoke test** that runs `run-pipeline` against the committed fixture (no network) and asserts: 59 countries in, expected sides for a sample (AUS→NATO-side, CHN→CHINA, RUS→RUS, UKR→UKR), and **zero NEUTRAL for countries the seed marks allied**. Wire it into CI with `RBP_PIPELINE_E2E=1` — this is the only way the class of bug becomes visible.
4. Add an assertion in the pipeline that no seed-listed ally resolves to NEUTRAL (fail loudly, not silently).

---

## 2 · MEDIUM — Stale What-If state on country switch

**Severity: MEDIUM** · `src/components/strategic/WhatIfTab.tsx:309-313` + `src/app/page.tsx:686`

`selectedIso` is initialized **only on mount** (`useState(initialIsoCode ?? "USA")`), and `StrategicDetailPanel` is **not keyed by `isoCode`** (`page.tsx:686`). Switching countries reuses the mounted component, so the What-If scenario carries over from the previous country — user sees another country's assumptions on the new panel.

**Fix:** key the panel by ISO (`key={selectedCountry.iso3}` on `StrategicDetailPanel`), or reset `selectedIso` in an effect when `initialIsoCode` changes. Prefer the `key` approach — one line, resets all descendant state.

---

## 3 · MEDIUM — Dead `getBPTierHex` export; private `scoreToColor` duplicated

**Severity: MEDIUM** · `src/lib/bp/tiers.ts:76` + `src/components/strategic/BPDetailTab.tsx:99`

`getBPTierHex` is exported from `tiers.ts` with **zero importers**; `BPDetailTab` defines its own private `scoreToColor` (used ~7× in the component). Two color mappings for the same concept now drift independently.

**Fix:** delete the dead export, or make `BPDetailTab` import it and remove the private copy. Since the component's logic is score→color with a linear-gradient wrapper, keep one source of truth in `tiers.ts` and have the tab consume it.

---

## 4 · MEDIUM — Dead DB write-singleton + missing `busy_timeout`

**Severity: MEDIUM** · `src/db/index.ts:7`, `src/db/runtime.ts`, `src/db/queries.ts`, `src/db/seed.ts`

- `src/db/index.ts` runs `openDatabase()` (a **write** connection, WAL + foreign_keys) at **module load** — a side effect that fires even when only read paths import it.
- `src/db/queries.ts` has **zero importers** (dead).
- `src/db/seed.ts` (the file; seed *data* lives under `scripts/data-pipeline/`) is unimported.
- `runtime.ts` sets `journal_mode=WAL` and `foreign_keys=ON` but **no `busy_timeout`** — under concurrent write access (e.g. pipeline + dev server), SQLITE_BUSY is a live risk on Windows.

**Fix:**
1. Add `db.pragma("busy_timeout = 5000")` in `runtime.ts` next to the other pragmas.
2. Delete `queries.ts` and the unimported `seed.ts`; make `index.ts` lazy (export a getter) or fold the write-singleton into `runtime.ts` so module import has no side effect.

---

## 5 · LOW — `deriveRegion` lacks UKR branch

**Severity: LOW** · `src/db/country-mapper.ts:66-73`

`deriveRegion` maps `side === "NATO" → Western`, `RUS → Eurasian`, `CHINA → Asia-Pacific`, everything else (incl. `UKR`) → **Non-Aligned**. A dedicated UKR region label is absent.

**Fix:** add `if (side === "UKR") return "Ukraine";` before the fall-through.

---

## 6 · LOW — Triple DDL drift

**Severity: LOW** · `src/app/api/init-db/route.ts:14`, `src/app/api/run-pipeline/route.ts:94`, `src/scripts/init-db.ts:24`

Three independent copies of `CREATE TABLE IF NOT EXISTS countries` with **deliberate divergence** (they're not kept in sync), plus an orphaned drizzle migration for assets/squadrons.

**Fix:** extract a single `schema-ddl.ts` module exporting the canonical DDL and import it from all three call sites. Delete the orphaned migration.

---

## 7 · LOW — README bootstrap 401 + script seeds only 20+9

**Severity: LOW** · `README.md:177`, `scripts/init-db.ts:74`

- README step 4 runs `curl -X POST http://localhost:3000/api/init-db` **without a token** → the route's auth gate returns 401; the documented bootstrap fails for a fresh clone. The token (`RBP_ADMIN_TOKEN`) is only documented in `conductor/tech-stack.md:50`.
- `init-db.ts:74` seeds `[...top20Countries, ...extendedCountries]` — not all 59 countries the comment/CI implies.

**Fix:** add the token to the README curl (`-H "Authorization: Bearer $RBP_ADMIN_TOKEN"` with a pointer to where to set it), and either seed the full 59 or correct the doc.

---

## 8 · LOW — Persistence gap (by design, but undocumented)

**Severity: LOW** · whole repo

No `localStorage`/`sessionStorage` anywhere; `STRATEGIC_SCENARIOS` is consumed only by `/api/scenarios`; `AnalyticsTab` re-implements analytics-lib functions (lines 29/44/62); `climateZone` is hardcoded `"temperate"` in `WhatIfTab` (368/410).

**Fix:** document this as intentional (server-backed state only); fold the AnalyticsTab duplication into the analytics lib. Treat "workspaces persistence" as a **new feature** (see §9) — not a patch.

---

## 9 · Deferred — Workspaces persistence as a new feature

**Severity: NEW FEATURE (large)** · supersedes Audit 4's "cheap fix" framing

Audit 4's "costs almost nothing" workspace plan was **rejected as a cheap-fix framing**: it double-counts the stale-state bug (§2) as an aside, and mislabels `what-if-engine` at 1517 lines (that is `WhatIfTab.tsx`; the engine is 611). The *direction* is right — save/restore What-If scenarios across sessions — but it is a real feature with UI + API + storage, sized accordingly. Schedule it separately; do not fold into the defect pass.

---

## Partially confirmed / rejected findings

| ID | Status | Detail |
|---|---|---|
| P1 | ⚠️ Partial | Audit 1 lint fix **works** (`--cache`, 2.96s, 102 warnings, exit 0 — verified by re-run) but is **uncommitted**; the Defender-hang diagnosis can't be proven from repo artifacts. |
| P2 | ⚠️ Partial | Audit 2 PASS verified at `bb97141`, still plausible at `8a234ef`; `RBP_PIPELINE_E2E` skip confirmed in `ci.yml:43`; lint-warning file attribution is stale. |
| P3 | ⚠️ Partial | Audit 3 F10: no rollback-failure test exists — only happy-path atomic-replace e2e. |
| F1 | ❌ Rejected | Audit 4 "costs almost nothing" framing (double-counts §2; wrong line count). |
| F2 | ❌ Rejected | Audit 2 "no stray node procs" unverifiable + self-contradictory `rm -rf` narrative. |
| F3 | ❌ Rejected | Audit 1 "CI unaffected" stated as fact without CI logs. |
| F4 | ❌ Rejected | Audit 3 F5 "inconsistent read idiom" is normal architecture (pure-lib routes need no DB). |

---

## Recommended execution order

1. **§1 pipeline member sets** (HIGH — data correctness; add offline smoke test + CI toggle).
2. **§4 `busy_timeout` + delete dead `queries.ts`/`seed.ts`/write-singleton** (low risk, unblocks §1 CI work).
3. **§2 key `StrategicDetailPanel` by `isoCode`** (one line).
4. **§3 `BPDetailTab` → `getBPTierHex`** (dedupe).
5. **§5 `deriveRegion` UKR branch** (one line).
6. **§6 single `schema-ddl.ts`** (refactor, moderate).
7. **§7 README token + seed 59** (docs + one seed change).
8. **§8 doc the persistence gap** (docs).
9. **§9 workspaces persistence** — separate feature ticket, properly scoped.

**Also:** commit the verified `--cache` lint fix (P1) — it is proven good and currently at risk in the working tree.
