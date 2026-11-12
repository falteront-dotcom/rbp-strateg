import { test, expect } from '@playwright/test';

// Контракт POST /api/what-if: неизвестный параметр или неверный тип — 400.
// Раньше `{ ...DEFAULT_SCENARIO_PARAMS, ...body.params }` молча глотал опечатку
// и возвращал сценарий, равный базовому BP: аналитик видел «бюджет ни на что
// не влияет», хотя запрос был неправильный.
test.describe('what-if parameter validation', () => {
  test('rejects a misspelled parameter instead of silently returning the baseline', async ({ request }) => {
    const response = await request.post('/api/what-if', {
      data: { iso: 'USA', params: { budgetMultiplier: 0.5 } },
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('budgetMultiplier');
    expect(body.error).toContain('budgetChange');
  });

  test('accepts the real budgetChange key and produces a measurable delta', async ({ request }) => {
    const response = await request.post('/api/what-if', {
      data: { iso: 'USA', params: { budgetChange: 0.5 } },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.scenario.totalBP).toBeGreaterThan(body.base.totalBP);
    expect(body.scenario.totalDelta).toBeGreaterThan(0);
  });

  test('rejects non-finite numbers', async ({ request }) => {
    // 1e999 парсится в Infinity — JSON такое пропускает, движок нет.
    const response = await request.post('/api/what-if', {
      data: '{"iso":"USA","params":{"budgetChange":1e999}}',
      headers: { 'content-type': 'application/json' },
    });
    expect(response.status()).toBe(400);
    expect((await response.json()).error).toContain('finite number');
  });

  test('rejects a numeric string where a number is required', async ({ request }) => {
    const response = await request.post('/api/what-if', {
      data: { iso: 'USA', params: { budgetChange: '0.5' } },
    });
    expect(response.status()).toBe(400);
    expect((await response.json()).error).toContain('budgetChange');
  });

  test('rejects a non-boolean flag', async ({ request }) => {
    const response = await request.post('/api/what-if', {
      data: { iso: 'USA', params: { atWar: 'yes' } },
    });
    expect(response.status()).toBe(400);
    expect((await response.json()).error).toContain('boolean');
  });

  test('rejects an unknown alliance and accepts a canonical one', async ({ request }) => {
    const bad = await request.post('/api/what-if', {
      data: { iso: 'USA', params: { allianceSwitch: 'EU' } },
    });
    expect(bad.status()).toBe(400);
    expect((await bad.json()).error).toContain('allianceSwitch');

    const good = await request.post('/api/what-if', {
      data: { iso: 'USA', params: { allianceSwitch: 'CSTO' } },
    });
    expect(good.status()).toBe(200);
  });

  test('rejects params that are not an object', async ({ request }) => {
    const response = await request.post('/api/what-if', {
      data: { iso: 'USA', params: 5 },
    });
    expect(response.status()).toBe(400);
    expect((await response.json()).error).toContain('object');
  });

  test('rejects a body that is not a JSON object', async ({ request }) => {
    const response = await request.post('/api/what-if', {
      data: '[1,2,3]',
      headers: { 'content-type': 'application/json' },
    });
    expect(response.status()).toBe(400);
  });

  test('omitted params still mean defaults: scenario equals baseline', async ({ request }) => {
    const response = await request.post('/api/what-if', { data: { iso: 'USA' } });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.scenario.totalBP).toBe(body.base.totalBP);
    expect(body.scenario.totalDelta).toBe(0);
  });

  test('unknown iso is still 404, not a validation error', async ({ request }) => {
    const response = await request.post('/api/what-if', {
      data: { iso: 'ZZZ', params: { budgetChange: 0.5 } },
    });
    expect(response.status()).toBe(404);
  });
});
