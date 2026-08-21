import { test, expect } from '@playwright/test';

test.describe('native strategic map modes', () => {
  test('switches every analytical mode on a single map canvas', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });

    await page.goto('/');
    await page.waitForSelector('canvas');

    for (const label of ['BGT', 'FLEET', 'AIR', 'TNK', 'NUKE', 'BP']) {
      await page.getByRole('button', { name: new RegExp(label) }).first().click();
      await page.waitForTimeout(350);
      await expect(page.locator('canvas')).toHaveCount(1);
      await expect(page.getByText(label, { exact: false }).first()).toBeVisible();
    }

    expect(errors).toEqual([]);
  });

  test('explains object clusters and layer colors', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('canvas');
    await expect(page.getByText(/Cluster numbers show documented objects/i)).toBeVisible();
    await expect(page.getByText('capital', { exact: true })).toBeVisible();
    await expect(page.getByText('military', { exact: true })).toBeVisible();
    await expect(page.getByText('airport', { exact: true })).toBeVisible();
  });
});
