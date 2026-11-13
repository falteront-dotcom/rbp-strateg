import { test, expect } from '@playwright/test';

// ─────────────────────────────────────────────────────────────────────────────
// Публичный API v1 (мост к продукту, путь B дорожной карты).
//
// Тесты адаптивны к реальному лимиту (RBP_RATE_LIMIT_PER_MIN, дефолт 60):
// burst-тест читает лимит из /meta и бьёт limit+N запросов. Каждый тест ходит
// со своим x-forwarded-for: бакеты лимитера изолированы, burst не мешает
// контрактным проверкам. Канонический размер сида — 195 (как в admin-api).
// ─────────────────────────────────────────────────────────────────────────────

/** Тестовые IP из документной группы 198.51.100.0/24 (TEST-NET-2). */
const ip = (n: number) => ({ headers: { 'x-forwarded-for': `198.51.100.${n}` } });

const EXPECTED_SEED_COUNT = 195;

test.describe('public API v1 — contracts', () => {
  test('countries: envelope with ranked list, cached 5 minutes', async ({ request }) => {
    const response = await request.get('/api/public/v1/countries', ip(1));
    expect(response.status()).toBe(200);
    expect(response.headers()['cache-control']).toBe('public, max-age=300');

    const body = await response.json();
    expect(body.apiVersion).toBe('v1');
    expect(body.count).toBe(EXPECTED_SEED_COUNT);
    expect(body.countries).toHaveLength(EXPECTED_SEED_COUNT);

    const usa = body.countries.find(
      (c: { isoCode: string }) => c.isoCode === 'USA',
    );
    expect(usa).toBeDefined();
    if (!usa) return;
    expect(usa.bpRank).toBe(1);
    expect(usa.bpTotal).toBeGreaterThan(0);
  });

  test('ranking: BP3 medians, P10–P90 intervals and rank stability', async ({ request }) => {
    const response = await request.get('/api/public/v1/ranking', ip(2));
    expect(response.status()).toBe(200);
    expect(response.headers()['cache-control']).toBe('public, max-age=300');

    const body = await response.json();
    expect(body.apiVersion).toBe('v1');
    expect(body.model).toBe('bp3');
    expect(body.count).toBeGreaterThan(150);

    const first = body.ranking[0];
    expect(first.rank).toBe(1);
    expect(first.iso).toBe('USA');
    expect(first.p10).toBeLessThanOrEqual(first.total);
    expect(first.total).toBeLessThanOrEqual(first.p90);
    expect(first.components.length).toBe(10);
    expect(first.rankStability.rankP10).toBeLessThanOrEqual(
      first.rankStability.rankP90,
    );

    // Ранги монотонны и соответствуют позициям массива.
    for (let i = 1; i < body.ranking.length; i++) {
      expect(body.ranking[i].rank).toBe(i + 1);
      expect(body.ranking[i].total).toBeLessThanOrEqual(
        body.ranking[i - 1].total,
      );
    }
  });

  test('dossier: same markdown as v3 export, never cached', async ({ request }) => {
    const publicResponse = await request.get(
      '/api/public/v1/dossier?iso=usa',
      ip(3),
    );
    expect(publicResponse.status()).toBe(200);
    expect(publicResponse.headers()['content-type']).toContain('text/markdown');
    expect(publicResponse.headers()['cache-control']).toBe('no-store');
    expect(publicResponse.headers()['content-disposition']).toContain(
      'dossier-USA',
    );

    const md = await publicResponse.text();
    expect(md).toContain('# Досье:');
    expect(md).toContain('P10–P90');
    expect(md).toContain('Грейд входов');
    expect(md).toContain('Методология и ограничения');

    // Тот же построитель, что у v3: документы совпадают в пределах одной даты.
    const v3Response = await request.get('/api/v3/dossier?iso=usa');
    expect(v3Response.status()).toBe(200);
    expect(await v3Response.text()).toBe(md);
  });

  test('dossier: missing iso → 400, unknown iso → 404', async ({ request }) => {
    const badRequest = await request.get('/api/public/v1/dossier', ip(4));
    expect(badRequest.status()).toBe(400);

    const notFound = await request.get(
      '/api/public/v1/dossier?iso=ZZZ',
      ip(4),
    );
    expect(notFound.status()).toBe(404);
  });

  test('meta: model passport from code constants', async ({ request }) => {
    const response = await request.get('/api/public/v1/meta', ip(5));
    expect(response.status()).toBe(200);
    expect(response.headers()['cache-control']).toBe('public, max-age=300');

    const body = await response.json();
    expect(body.apiVersion).toBe('v1');
    expect(body.model.version).toBe('3.0');
    expect(body.model.components).toBe(10);
    expect(body.model.weightConcentration).toBe(100);

    expect(body.model.weights).toHaveLength(10);
    const sum = body.model.weights.reduce(
      (acc: number, w: { weight: number }) => acc + w.weight,
      0,
    );
    expect(sum).toBeCloseTo(1.0, 10);

    expect(body.data.countriesCovered).toBe(195);
    expect(body.data.benchmarks.qualitative).toBe(10);
    expect(body.data.benchmarks.gfpReference).toBeGreaterThan(100);
    expect(body.data.sources.length).toBeGreaterThanOrEqual(4);

    expect(typeof body.limits.rateLimitPerMinute).toBe('number');
    expect(body.limits.rateLimitPerMinute).toBeGreaterThan(0);
    expect(body.links.methodology).toBe('/v3/methodology');
  });
});

test.describe('public API v1 — rate limit', () => {
  test('burst exceeds the bucket → 429 with Retry-After; other IPs unaffected', async ({ request }) => {
    // Лимит читаем из /meta (другой IP): тест адаптивен к любому
    // RBP_RATE_LIMIT_PER_MIN, включая дефолт 60 в каноническом CI-конфиге.
    const metaResponse = await request.get('/api/public/v1/meta', ip(8));
    expect(metaResponse.status()).toBe(200);
    const limit = (await metaResponse.json()).limits.rateLimitPerMinute as number;
    expect(limit).toBeGreaterThan(0);

    const burstIp = ip(6);
    const statuses: number[] = [];
    let throttled = null as null | Awaited<ReturnType<typeof request.get>>;

    // Первые limit запросов проходят, дальше 429.
    for (let i = 0; i < limit + 3; i++) {
      const response = await request.get('/api/public/v1/meta', burstIp);
      statuses.push(response.status());
      if (response.status() === 429) throttled = response;
    }
    expect(statuses[0]).toBe(200);
    expect(statuses).toContain(429);
    expect(throttled).not.toBeNull();
    if (!throttled) return;

    const retryAfter = Number(throttled.headers()['retry-after']);
    expect(Number.isInteger(retryAfter)).toBe(true);
    expect(retryAfter).toBeGreaterThan(0);
    expect((await throttled.json()).error).toBe('rate limit exceeded');

    // Лимит персональный: соседний IP не наказан за чужой burst.
    const neighbour = await request.get('/api/public/v1/meta', ip(7));
    expect(neighbour.status()).toBe(200);
  });
});
