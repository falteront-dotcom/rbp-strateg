import { test, expect } from '@playwright/test';

/**
 * Окна продукта ведут себя одинаково: Escape закрывает верхнее, фокус остаётся
 * внутри, фон не прокручивается, кнопка закрытия подписана и нажимаема.
 * Тактический HUD раньше этого не умел — окна закрывались только мышью.
 */

async function openTactical(page: import('@playwright/test').Page) {
  await page.goto('/');
  await expect(page.getByTestId('country-list-item').first()).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: 'Тактический' }).click();
  await expect(page.getByTestId('deploy-button')).toBeVisible({ timeout: 15_000 });
}

test('unit builder is a labelled dialog, closes on Escape and restores focus', async ({ page }) => {
  await openTactical(page);
  const opener = page.getByRole('button', { name: /создать кастомный юнит/i });
  await opener.click();

  const dialog = page.getByTestId('custom-unit-builder');
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute('role', 'dialog');
  await expect(dialog).toHaveAttribute('aria-modal', 'true');
  await expect(dialog).toHaveAccessibleName(/конструктор юнитов/i);

  // Фокус внутри окна, а не на странице под ним.
  const focusInside = await dialog.evaluate((el) => el.contains(document.activeElement));
  expect(focusInside).toBe(true);

  // Фон под модальным окном не прокручивается.
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).overflow)).toBe('hidden');

  // Окно въезжает со scale 0.95, поэтому размер меряется после анимации,
  // а не на первом кадре появления.
  const close = page.getByRole('button', { name: 'Закрыть конструктор юнитов' });
  await expect
    .poll(async () => (await close.boundingBox())?.width ?? 0)
    .toBeGreaterThanOrEqual(32);
  await expect
    .poll(async () => (await close.boundingBox())?.height ?? 0)
    .toBeGreaterThanOrEqual(32);

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).overflow)).not.toBe('hidden');
  await expect(opener).toBeFocused();
});

test('Tab stays inside the dialog', async ({ page }) => {
  await openTactical(page);
  await page.getByRole('button', { name: /создать кастомный юнит/i }).click();
  const dialog = page.getByTestId('custom-unit-builder');
  await expect(dialog).toBeVisible();

  for (let i = 0; i < 25; i += 1) {
    await page.keyboard.press('Tab');
    const inside = await dialog.evaluate((el) => el.contains(document.activeElement));
    expect(inside).toBe(true);
  }

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});

test('nested duel closes first and leaves the matrix open', async ({ page }) => {
  await openTactical(page);
  await page.getByRole('button', { name: /аналитика \(сравнение\)/i }).click();
  const matrix = page.getByTestId('comparison-matrix');
  await expect(matrix).toBeVisible();

  await matrix.getByRole('button', { name: /симуляция дуэли/i }).click();
  const duel = page.getByTestId('duel-simulator');
  await expect(duel).toBeVisible();
  await expect(duel).toHaveAttribute('aria-modal', 'true');

  await page.keyboard.press('Escape');
  await expect(duel).toBeHidden();
  await expect(matrix).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(matrix).toBeHidden();
});

test('scenario lab panel closes on Escape without trapping the map', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('country-list-item').first()).toBeVisible({ timeout: 20_000 });
  await page.getByTestId('country-list-item').first().click();
  await page.getByRole('button', { name: /сценарная лаборатория/i }).click();

  const panel = page.getByTestId('scenario-lab');
  await expect(panel).toBeVisible();
  await expect(panel).toHaveAccessibleName(/сценарная лаборатория/i);

  // Панель боковая: страница под ней остаётся прокручиваемой.
  const overflow = await page.evaluate(() => getComputedStyle(document.body).overflow);
  expect(overflow).not.toBe('hidden');

  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
});

test('country comparison and coalition builder share the same behaviour', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('country-list-item').first()).toBeVisible({ timeout: 20_000 });

  await page.getByRole('button', { name: /анализ коалиций/i }).first().click();
  const coalition = page.getByTestId('coalition-builder');
  await expect(coalition).toBeVisible();
  await expect(coalition).toHaveAttribute('aria-modal', 'true');
  await page.keyboard.press('Escape');
  await expect(coalition).toBeHidden();

  await page.getByRole('button', { name: /сравнение стран/i }).first().click();
  const comparison = page.getByTestId('country-comparison');
  await expect(comparison).toBeVisible();
  await expect(comparison).toHaveAttribute('aria-modal', 'true');
  await page.keyboard.press('Escape');
  await expect(comparison).toBeHidden();
});

test('reopening a dialog ten times keeps one instance and no console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });

  await openTactical(page);
  for (let i = 0; i < 10; i += 1) {
    await page.getByRole('button', { name: /создать кастомный юнит/i }).click();
    await expect(page.getByTestId('custom-unit-builder')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('custom-unit-builder')).toBeHidden();
  }

  await expect(page.getByTestId('custom-unit-builder')).toHaveCount(0);
  const overflow = await page.evaluate(() => getComputedStyle(document.body).overflow);
  expect(overflow).not.toBe('hidden');
  expect(errors).toEqual([]);
});
