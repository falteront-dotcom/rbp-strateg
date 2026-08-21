import { test, expect } from '@playwright/test';

test('analyst creates and compares two scenario branches', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('country-list-item').first()).toBeVisible({ timeout: 15_000 });
  await page.getByTestId('country-list-item').first().click();
  await page.getByRole('button', { name: /сценарная лаборатория/i }).click();
  await expect(page.getByRole('heading', { name: /сценарная лаборатория/i })).toBeVisible();

  await page.getByRole('button', { name: /создать workspace/i }).click();
  await page.getByLabel('Название workspace').fill('Baltic Study UI');
  await page.getByRole('button', { name: /сохранить workspace/i }).click();
  await expect(page.getByTestId('workspace-name')).toHaveText('Baltic Study UI');

  await page.getByRole('button', { name: /добавить ветку/i }).click();
  await page.getByRole('button', { name: /добавить ветку/i }).click();
  await expect(page.getByTestId('scenario-branch-card')).toHaveCount(2);
  await expect(page.getByTestId('scenario-explanation')).toBeVisible();
});
