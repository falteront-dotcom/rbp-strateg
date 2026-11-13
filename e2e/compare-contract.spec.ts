import { test, expect } from '@playwright/test';

/**
 * Контракт /api/compare и окно сравнения стран.
 *
 * Маршрут отдавал собственный ответ (deltas/summary), а окно читало
 * componentDeltas, metricDeltas и overallLeader из ComparisonResult.
 * Кнопка «Сравнить» роняла всё приложение: «Cannot read properties of
 * undefined (reading 'side')». Теперь дельты считает одна функция —
 * compareCountriesList, и ответ расходиться с интерфейсом не может.
 */

interface CompareBody {
  countries: Array<{ isoCode: string; bpTotal: number; side: string }>;
  componentDeltas: Array<Array<{
    component: string; label: string; valueA: number; valueB: number;
    delta: number; deltaPercent: number; advantage: number;
  }>>;
  metricDeltas: Array<{ label: string; values: number[]; unit: string; winner: number }>;
  overallLeader: number;
  totalBPValues: number[];
  pairwiseResults: Array<{ countryAIndex: number; countryBIndex: number; totalDelta: number; overallAdvantage: number }>;
}

test.describe('compare API contract', () => {
  test('returns the ComparisonResult shape the window reads', async ({ request }) => {
    const response = await request.get('/api/compare?iso=USA&iso=CHN');
    expect(response.ok()).toBe(true);
    const body = (await response.json()) as CompareBody;

    expect(body.countries.map((c) => c.isoCode)).toEqual(['USA', 'CHN']);
    expect(body.componentDeltas).toHaveLength(1);
    expect(body.componentDeltas[0]).toHaveLength(8);
    expect(body.metricDeltas.length).toBeGreaterThan(0);
    expect(body.totalBPValues).toHaveLength(2);
    expect(body.pairwiseResults).toHaveLength(1);

    // Каждая дельта несёт advantage — индекс страны или -1 при ничьей.
    for (const delta of body.componentDeltas[0]) {
      expect(delta.label.length).toBeGreaterThan(0);
      expect([-1, 0, 1]).toContain(delta.advantage);
      expect(Number.isFinite(delta.delta)).toBe(true);
    }
    for (const metric of body.metricDeltas) {
      expect(metric.values).toHaveLength(2);
      expect([-1, 0, 1]).toContain(metric.winner);
    }
    expect(body.totalBPValues[0]).toBeGreaterThan(body.totalBPValues[1]);
    expect(body.overallLeader).toBe(0);
  });

  test('keeps request order and handles four countries', async ({ request }) => {
    const response = await request.get('/api/compare?iso=RUS&iso=USA&iso=CHN&iso=IND');
    expect(response.ok()).toBe(true);
    const body = (await response.json()) as CompareBody;
    expect(body.countries.map((c) => c.isoCode)).toEqual(['RUS', 'USA', 'CHN', 'IND']);
    expect(body.componentDeltas).toHaveLength(3);
    expect(body.pairwiseResults).toHaveLength(3);
    expect(body.totalBPValues).toHaveLength(4);
  });

  test('rejects one code and five codes', async ({ request }) => {
    expect((await request.get('/api/compare?iso=USA')).status()).toBe(400);
    expect((await request.get('/api/compare?iso=USA&iso=CHN&iso=RUS&iso=IND&iso=DEU')).status()).toBe(400);
  });
});

test('comparison window computes without crashing the app', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });

  await page.goto('/');
  await expect(page.getByTestId('country-list-item').first()).toBeVisible({ timeout: 20_000 });
  await page.getByTestId('country-list-item').first().click();
  await page.getByRole('button', { name: 'Открыть сравнение стран' }).click();

  const dialog = page.getByTestId('country-comparison');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Сравнить' })).toBeDisabled();

  await dialog.getByRole('button', { name: /добавить/i }).click();
  const run = dialog.getByRole('button', { name: 'Сравнить' });
  await expect(run).toBeEnabled();
  await run.click();

  // Окно остаётся на месте, результаты заполнены, приложение живо.
  await expect(dialog).toBeVisible({ timeout: 15_000 });
  await expect(dialog.getByRole('button', { name: /радар/i })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/Application error/i)).toHaveCount(0);
  expect(errors).toEqual([]);

  // Все три вкладки результатов рендерят своё содержимое.
  await dialog.getByRole('button', { name: /таблица/i }).click();
  const table = dialog.locator('table').first();
  await expect(table).toBeVisible();
  await expect(table.getByText('Оружие')).toBeVisible();
  await expect(table.locator('tbody tr')).toHaveCount(9);
  await expect(table.getByText('Итого БП')).toBeVisible();

  await dialog.getByRole('button', { name: /метрики/i }).click();
  await expect(dialog.getByText(/Воен\. Бюджет|Актив\. Состав/).first()).toBeVisible();

  await dialog.getByRole('button', { name: /радар/i }).click();
  await expect(dialog.locator('svg.recharts-surface').first()).toBeVisible();

  // Третья страна добавляется и убирается, результат пересчитывается.
  await dialog.getByRole('button', { name: /добавить/i }).click();
  await expect(dialog.locator('select')).toHaveCount(3);
  await run.click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: /Убрать .* из сравнения/ }).first().click();
  await expect(dialog.locator('select')).toHaveCount(2);

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  expect(errors).toEqual([]);
});

test('coalition builder tabs work and load a preset into the constructor', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('country-list-item').first()).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: 'Открыть анализ коалиций' }).click();

  const dialog = page.getByTestId('coalition-builder');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Суммарный БП').first()).toBeVisible();

  await dialog.getByRole('button', { name: 'Конструктор', exact: true }).click();
  const search = dialog.getByPlaceholder('Поиск страны...');
  await search.fill('Герм');
  const germany = dialog.getByRole('button', { name: /Германия/ }).first();
  await expect(germany).toBeVisible();
  await germany.click();
  await expect(dialog.getByText(/ВЫБРАННЫЕ СТРАНЫ \(1\)/i)).toBeVisible();

  await dialog.getByRole('button', { name: 'Сравнение', exact: true }).click();
  await expect(dialog.locator('select').first()).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});
