import { test, expect } from '@playwright/test';

/**
 * На узком вьюпорте боковая панель скрыта (`hidden md:flex`), и без кнопки
 * список стран был недостижим: 195 элементов в DOM, видимых 0, аналитика по
 * стране не открывалась вовсе. Список открывается выдвижной панелью из шапки.
 */

test.use({ viewport: { width: 390, height: 844 } });

test('mobile list opens from the header, selects a country and closes', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });

  await page.goto('/');
  await expect(page.getByTestId('country-list-item').first()).toBeAttached({ timeout: 20_000 });

  // До открытия список скрыт, кнопка доступна и подписана.
  await expect(page.getByTestId('country-list-item').first()).toBeHidden();
  const opener = page.getByRole('button', { name: 'Открыть список стран' });
  await expect(opener).toBeVisible();
  await expect(opener).toHaveAttribute('aria-expanded', 'false');
  const box = await opener.boundingBox();
  expect(box?.width ?? 0).toBeGreaterThanOrEqual(32);
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(32);

  await opener.click();
  const nav = page.locator('#country-list-nav');
  await expect(nav).toBeVisible();
  await expect(nav).toHaveAttribute('aria-modal', 'true');
  await expect(opener).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByTestId('country-list-item').first()).toBeVisible();

  // Фокус внутри панели, фон не прокручивается.
  expect(await nav.evaluate((el) => el.contains(document.activeElement))).toBe(true);
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).overflow)).toBe('hidden');

  // Поиск сужает список, выбор страны закрывает панель и открывает карточку.
  await page.getByPlaceholder('Поиск страны...').fill('Герм');
  await expect(page.getByTestId('country-list-item')).toHaveCount(1);
  await page.getByTestId('country-list-item').first().click();

  await expect(nav).toBeHidden();
  const panel = page.getByTestId('country-detail-panel');
  await expect(panel).toBeVisible();
  await expect(page.getByTestId('country-code')).toHaveText('DEU');
  await expect(page.getByRole('tab').first()).toBeVisible();
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).overflow)).not.toBe('hidden');
  expect(errors).toEqual([]);
});

test('mobile list closes on Escape and on the close button', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('country-list-item').first()).toBeAttached({ timeout: 20_000 });
  const opener = page.getByRole('button', { name: 'Открыть список стран' });
  const nav = page.locator('#country-list-nav');

  await opener.click();
  await expect(nav).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(nav).toBeHidden();
  await expect(opener).toBeFocused();

  await opener.click();
  await expect(nav).toBeVisible();
  await page.getByRole('button', { name: 'Закрыть список стран' }).click();
  await expect(nav).toBeHidden();
});

test('desktop keeps the permanent sidebar without a drawer button', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await expect(page.getByTestId('country-list-item').first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('button', { name: 'Открыть список стран' })).toBeHidden();
  const nav = page.locator('#country-list-nav');
  await expect(nav).toBeVisible();
  expect(await nav.getAttribute('aria-modal')).toBeNull();
});
