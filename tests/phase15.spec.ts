import { test, expect } from '@playwright/test';
import path from 'path';

test('Phase 15: Context-Aware TTx & Category Switch', async ({ page }) => {
    const brainDir = 'C:\\Users\\Semyon\\.gemini\\antigravity\\brain\\6e6347ed-df67-4e12-98ca-6c3e407b04fb';

    await page.goto('http://localhost:3000');

    // Wait for the main UI to load with extended timeout
    await expect(page.locator('text="+ Создать Кастомный Юнит"')).toBeVisible({ timeout: 25000 });

    // Test 1: Ground stats view
    await page.click('text="+ Создать Кастомный Юнит"');
    const builderModal = page.locator('.glass-panel').filter({ hasText: 'Конструктор Юнитов' });
    await expect(builderModal).toBeVisible();

    // Verify Ground stats labels are present
    await expect(builderModal.locator('text="Мощность Двигателя"')).toBeVisible();
    await expect(builderModal.locator('text="Эквивалент Брони"')).toBeVisible();

    // Test 2: Switch to Aircraft stats
    await builderModal.locator('select').nth(1).selectOption('aircraft');
    // Verify Aircraft stats labels are present
    await expect(builderModal.locator('text="Тяга Двигателей"')).toBeVisible();
    await expect(builderModal.locator('text="ЭПР (Стелс)"')).toBeVisible();

    await page.screenshot({ path: path.join(brainDir, 'phase15_builder_air.png'), fullPage: true });

    // Test 3: Switch to Air Defense stats
    await builderModal.locator('select').nth(1).selectOption('air_defense');
    await expect(builderModal.locator('text="Дальность Радара"')).toBeVisible();
    await expect(builderModal.locator('text="Время развертывания"')).toBeVisible();

    // Save the custom SAM
    await builderModal.locator('input[placeholder="Например: M1A2 SEPv3 Abrams"]').fill('Custom S-600');
    await page.click('text="ДОБАВИТЬ В АРСЕНАЛ"');

    // Close Builder Modal implicit on save, ensure it's gone
    await expect(builderModal).not.toBeVisible();

    // Test 4: Open Comparison Matrix
    await page.click('text="Аналитика (Сравнение)"');
    const matrixOverlay = page.locator('.glass-panel').filter({ hasText: 'Матрица Сравнения Юнитов' });
    await expect(matrixOverlay).toBeVisible();

    // Select two air units to compare Air-specific stats
    // "Su-57 Felon" and "F-35A Lightning II"
    await matrixOverlay.locator('select').nth(0).selectOption('Su-57 Felon');
    await matrixOverlay.locator('select').nth(1).selectOption('F-35A Lightning II');

    // Verify that it renders "Тяга Двигателей" row
    await expect(matrixOverlay.locator('text="Тяга Двигателей"').first()).toBeVisible();

    await page.screenshot({ path: path.join(brainDir, 'phase15_comparison_air.png'), fullPage: true });

    // Close Matrix
    await matrixOverlay.locator('button').first().click(); // X button
});
