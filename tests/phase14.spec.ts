import { test, expect } from '@playwright/test';
import path from 'path';

test('Phase 14: Analytical Tool Modernization', async ({ page }) => {
    // Setup the artifact paths
    const brainDir = 'C:\\Users\\Semyon\\.gemini\\antigravity\\brain\\6e6347ed-df67-4e12-98ca-6c3e407b04fb';
    const filledBuilderPath = path.join(brainDir, 'v14_builder_filled.png');
    const matrixPath = path.join(brainDir, 'v14_matrix_view.png');

    await page.goto('http://localhost:3000');
    await page.waitForTimeout(1000);

    // 1. Open the Custom Unit Builder
    await page.click('text="+ Создать Кастомный Юнит"');
    await expect(page.locator('text="Конструктор Юнитов (Real TTx)"')).toBeVisible();

    // 2. Fill out the form
    const builderModal = page.locator('.glass-panel').filter({ has: page.locator('h2', { hasText: 'Конструктор Юнитов' }) }).first();

    await builderModal.locator('input[placeholder="Например: M1A2 SEPv3 Abrams"]').fill('Viper IFV 2025');

    // Set category and role to IFV
    await builderModal.locator('select').nth(0).selectOption('US');
    await builderModal.locator('select').nth(1).selectOption('ground');
    await builderModal.locator('select').nth(2).selectOption('IFV');

    // Set Parametric stats (Total 6 inputs of type number)
    // HP
    await builderModal.locator('input[type="number"]').nth(0).fill('900');
    // Weight
    await builderModal.locator('input[type="number"]').nth(1).fill('40');
    // RHA
    await builderModal.locator('input[type="number"]').nth(2).fill('300');
    // Caliber
    await builderModal.locator('input[type="number"]').nth(3).fill('50');
    // Pen
    await builderModal.locator('input[type="number"]').nth(4).fill('250');
    // Tech Level
    await builderModal.locator('input[type="number"]').nth(5).fill('8');

    // Take screenshot of filled builder
    await page.waitForTimeout(500);
    await page.screenshot({ path: filledBuilderPath });

    // 3. Save the unit
    await builderModal.locator('button:has-text("ДОБАВИТЬ В АРСЕНАЛ")').click();
    await page.waitForTimeout(500);

    // 4. Open Comparison Matrix
    await page.click('button:has-text("Аналитика (Сравнение)")');
    const matrixOverlay = page.locator('.glass-panel').filter({ has: page.locator('h2', { hasText: 'Матрица Сравнения Юнитов' }) }).first();
    await expect(matrixOverlay).toBeVisible();

    // 5. Select units for comparison
    await matrixOverlay.locator('select').nth(0).selectOption({ label: '[US] Viper IFV 2025' });
    await matrixOverlay.locator('select').nth(1).selectOption({ label: '[RU] Курганец-25' });

    await page.waitForTimeout(1000); // Wait for animations and selection
    await page.screenshot({ path: matrixPath });

    // Just check if we see "Общее преимущество:"
    await expect(matrixOverlay.locator('text="Общее преимущество:"')).toBeVisible();
});
