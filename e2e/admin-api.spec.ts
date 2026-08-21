import { test, expect } from '@playwright/test';
import { ADMIN_TOKEN_HEADER, openReadonlyDatabase } from '../src/db/runtime';

// ─────────────────────────────────────────────────────────────────────────────
// Admin database operations — authenticated POST-only contract.
//
// init-db and run-pipeline mutate the database, so they are POST-only and
// require `x-admin-token` equal to the server-side `RBP_ADMIN_TOKEN`. These
// tests run against the live server (Playwright `request` fixture, baseURL from
// playwright.config). Unauthorized checks never mutate the DB (verified with a
// read-only row count). The authorized happy path only runs when a token is
// already configured (locally or in CI); run-pipeline additionally opts in via
// `RBP_PIPELINE_E2E=1` because it hits the live GFP/World Bank network.
// ─────────────────────────────────────────────────────────────────────────────

/** Canonical fixture size: top20 + extended + additional seed rows. */
const EXPECTED_SEED_COUNT = 59;

function countCountries(): number {
  const db = openReadonlyDatabase();
  try {
    const row = db.prepare('SELECT count(*) AS c FROM countries').get() as { c: number };
    return row.c;
  } finally {
    db.close();
  }
}

test.describe('admin database operations — authentication contract', () => {
  test.describe.configure({ mode: 'serial' });

  test('GET /api/init-db is POST-only (405)', async ({ request }) => {
    const r = await request.get('/api/init-db');
    expect(r.status()).toBe(405);
  });

  test('GET /api/run-pipeline is POST-only (405)', async ({ request }) => {
    const r = await request.get('/api/run-pipeline');
    expect(r.status()).toBe(405);
  });

  test('POST /api/init-db without a token returns 401', async ({ request }) => {
    const r = await request.post('/api/init-db');
    expect(r.status()).toBe(401);
    const body = await r.json().catch(() => null);
    expect(body).toMatchObject({ ok: false, error: expect.any(String) });
  });

  test('POST /api/init-db with a wrong token returns 401', async ({ request }) => {
    const r = await request.post('/api/init-db', {
      headers: { [ADMIN_TOKEN_HEADER]: 'not-the-token' },
    });
    expect(r.status()).toBe(401);
  });

  test('POST /api/run-pipeline without a token returns 401', async ({ request }) => {
    const r = await request.post('/api/run-pipeline');
    expect(r.status()).toBe(401);
  });

  test('POST /api/run-pipeline with a wrong token returns 401', async ({ request }) => {
    const r = await request.post('/api/run-pipeline', {
      headers: { [ADMIN_TOKEN_HEADER]: 'still-wrong' },
    });
    expect(r.status()).toBe(401);
  });

  test('unauthorized admin requests do not mutate the database', async ({ request }) => {
    const before = countCountries();
    const responses = await Promise.all([
      request.post('/api/init-db'),
      request.post('/api/init-db', { headers: { [ADMIN_TOKEN_HEADER]: 'bad' } }),
      request.post('/api/run-pipeline'),
      request.post('/api/run-pipeline', { headers: { [ADMIN_TOKEN_HEADER]: 'bad' } }),
    ]);
    for (const r of responses) {
      expect(r.status()).toBe(401);
    }
    const after = countCountries();
    expect(after).toBe(before);
  });

  // Authorized happy path — only when a token is already configured.
  const adminToken = process.env.RBP_ADMIN_TOKEN;
  const authorized = typeof adminToken === 'string' && adminToken.length > 0;
  (authorized ? test : test.skip)(
    'authorized POST /api/init-db re-seeds the fixture atomically',
    async ({ request }) => {
      const before = countCountries();
      const r = await request.post('/api/init-db', {
        headers: { [ADMIN_TOKEN_HEADER]: adminToken as string },
      });
      expect(r.status()).toBe(200);
      const body = await r.json();
      expect(body.ok).toBe(true);
      expect(body.countriesSeeded).toBe(EXPECTED_SEED_COUNT);
      expect(body.bpCalculated).toBe(EXPECTED_SEED_COUNT);
      // The atomic transaction always leaves a full fixture set in place.
      expect(countCountries()).toBe(EXPECTED_SEED_COUNT);
      expect(countCountries()).toBe(before);
    },
  );

  const failureInjectionEnabled = authorized && process.env.RBP_PIPELINE_TEST_HOOK === '1';
  (failureInjectionEnabled ? test : test.skip)(
    'failed authorized pipeline preserves the published dataset',
    async ({ request }) => {
      const before = countCountries();
      const response = await request.post('/api/run-pipeline', {
        headers: { [ADMIN_TOKEN_HEADER]: adminToken as string },
        data: { testFailure: 'before-publish' },
      });
      expect(response.status()).toBe(500);
      expect(countCountries()).toBe(before);
    },
  );

  // run-pipeline replaces the whole country set from the live network, so it
  // only runs on explicit opt-in to avoid flaky CI/network-dependent e2e.
  const pipelineOptIn = authorized && process.env.RBP_PIPELINE_E2E === '1';
  (pipelineOptIn ? test : test.skip)(
    'authorized POST /api/run-pipeline replaces the country set atomically',
    async ({ request }) => {
      const r = await request.post('/api/run-pipeline', {
        headers: { [ADMIN_TOKEN_HEADER]: adminToken as string },
      });
      expect(r.status()).toBe(200);
      const body = await r.json();
      expect(body.ok).toBe(true);
      expect(body.countriesWritten).toBeGreaterThan(0);
      expect(body.bpCalculated).toBe(body.countriesWritten);
      // Every persisted row carries a BP score (atomic replace kept the table
      // consistent — no half-written rows from a removed source country).
      const db = openReadonlyDatabase();
      try {
        const nulls = db
          .prepare('SELECT count(*) AS c FROM countries WHERE bp_total IS NULL OR bp_total = 0')
          .get() as { c: number };
        expect(nulls.c).toBe(0);
      } finally {
        db.close();
      }
    },
  );
});