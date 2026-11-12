import { test, expect } from '@playwright/test';

/**
 * Контракт каталога I&W: доска предупреждения строит список из плоского
 * `indicators`, скоринг считает по тем же id. Раньше API отдавал индикаторы
 * только внутри `categories` и без описаний — страница показывала «0 из 0»,
 * а оценка всегда была нулевой при любых наблюдениях.
 */

interface CatalogIndicator {
  id: string;
  code: string;
  nameRu: string;
  descriptionRu: string;
  weight: number;
  category: string;
}

test.describe('I&W catalog contract', () => {
  test('board exposes a flat catalog and the same indicators per category', async ({ request }) => {
    const response = await request.get('/api/v3/iw');
    expect(response.ok()).toBe(true);
    const board = (await response.json()) as {
      totalIndicators: number;
      indicators: CatalogIndicator[];
      categories: Array<{ id: string; nameRu: string; indicators: CatalogIndicator[] }>;
    };

    expect(board.totalIndicators).toBe(340);
    expect(board.indicators).toHaveLength(340);
    expect(board.categories).toHaveLength(10);

    // Плоский список и группировка не расходятся.
    const grouped = board.categories.flatMap((category) => category.indicators);
    expect(grouped).toHaveLength(board.indicators.length);
    expect(new Set(grouped.map((i) => i.id)).size).toBe(340);

    // Описание нужно карточке признака: без него нечего наблюдать.
    for (const indicator of board.indicators.slice(0, 20)) {
      expect(indicator.descriptionRu.length).toBeGreaterThan(20);
      expect(indicator.nameRu).toMatch(/[А-Яа-яЁё]/);
      expect(indicator.weight).toBeGreaterThan(0);
    }

    for (const category of board.categories) {
      expect(category.indicators.length).toBeGreaterThan(0);
      expect(category.indicators.every((i) => i.category === category.id)).toBe(true);
    }
  });

  test('assessment reacts to observations and ignores unknown ids', async ({ request }) => {
    const board = (await (await request.get('/api/v3/iw')).json()) as {
      indicators: CatalogIndicator[];
    };
    const ids = board.indicators.slice(0, 12).map((i) => i.id);
    const states: Record<string, string> = {};
    for (const id of ids) states[id] = 'confirmed';
    states['no-such-indicator'] = 'confirmed';

    const response = await request.post('/api/v3/iw/assess', { data: { states } });
    expect(response.ok()).toBe(true);
    const result = (await response.json()) as {
      totalScore: number;
      level: string;
      categoryScores: Array<{ category: string; observedCount: number }>;
      topContributors: Array<{ indicatorId: string }>;
    };

    expect(result.totalScore).toBeGreaterThan(0);
    const observed = result.categoryScores.reduce((sum, c) => sum + c.observedCount, 0);
    expect(observed).toBe(12);
    expect(result.topContributors.length).toBeGreaterThan(0);
    expect(result.topContributors.every((c) => ids.includes(c.indicatorId))).toBe(true);

    const empty = (await (
      await request.post('/api/v3/iw/assess', { data: { states: {} } })
    ).json()) as { totalScore: number; categoryScores: Array<{ observedCount: number }> };
    expect(empty.totalScore).toBe(0);
    expect(empty.categoryScores.every((c) => c.observedCount === 0)).toBe(true);
  });
});

test('intel board renders the catalog, scores observations and resets', async ({ page }) => {
  await page.goto('/v3/intel');
  const counter = page.getByText(/Активных индикаторов:/);
  await expect(counter).toContainText('из 340', { timeout: 20_000 });

  const selects = page.locator('select');
  await expect(selects).toHaveCount(340);
  await expect(counter).toContainText('Активных индикаторов: 0');

  for (let i = 0; i < 6; i += 1) {
    await selects.nth(i).selectOption('confirmed');
  }
  await expect(counter).toContainText('Активных индикаторов: 6');

  await page.getByRole('button', { name: /рассчитать оценку/i }).click();
  const verdict = page.getByRole('heading', { name: /уровень|внимание/i }).first();
  await expect(verdict).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/набл\. 6/).first()).toBeVisible();
  await expect(page.getByText('Сильнейшие факторы')).toBeVisible();

  await page.getByRole('button', { name: /сбросить всё/i }).click();
  await expect(counter).toContainText('Активных индикаторов: 0');
  await expect(verdict).toBeHidden();
});
