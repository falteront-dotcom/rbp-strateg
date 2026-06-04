import { test, expect } from '@playwright/test';

test('Custom Unit Builder Test', async ({ page }) => {
    await page.goto('http://localhost:3000/');

    // Wait for the app to load
    await page.waitForTimeout(1000);

    // Click the "Создать Кастомный Юнит" button
    await page.click('button:has-text("Создать Кастомный Юнит")');

    // Verify modal is open
    await expect(page.locator('h2:has-text("Конструктор Юнитов")')).toBeVisible();

    // Wait a bit for enter animation
    await page.waitForTimeout(500);

    // Take screenshot of the empty form
    await page.screenshot({ path: 'C:/Users/Semyon/.gemini/antigravity/brain/6e6347ed-df67-4e12-98ca-6c3e407b04fb/v11_builder_empty.png' });

    // Fill in unit name
    await page.fill('input[placeholder="Например: T-14M Super Armata"]', 'Puma IFV');

    // Select Country: Germany (DE)
    await page.locator('label:has-text("Страна") + select').selectOption('DE');

    // Select Category: Ground
    await page.locator('label:has-text("Категория") + select').selectOption('ground');

    // Select Role: IFV
    await page.locator('label:has-text("Тактическая Роль") + select').selectOption('IFV');

    // Wait for values to settle
    await page.waitForTimeout(200);

    // Take screenshot of filled form
    await page.screenshot({ path: 'C:/Users/Semyon/.gemini/antigravity/brain/6e6347ed-df67-4e12-98ca-6c3e407b04fb/v11_builder_filled.png' });

    // Click Save/Add button
    await page.click('button:has-text("ДОБАВИТЬ В АРСЕНАЛ")');

    // Ensure modal is closed
    await expect(page.locator('h2:has-text("Конструктор Юнитов")')).not.toBeVisible();

    // Wait for it to close
    await page.waitForTimeout(500);

    // Deploy the new unit (it should auto-select based on the implementation)
    await page.click('button:has-text("РАЗВЕРНУТЬ")');
    await page.waitForTimeout(500);

    // Take screenshot of deployed custom unit
    await page.screenshot({ path: 'C:/Users/Semyon/.gemini/antigravity/brain/6e6347ed-df67-4e12-98ca-6c3e407b04fb/v11_custom_deployed.png' });
});
