import { test, expect } from '@playwright/test';

test('Combat Simulator (Phase 16) works correctly', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:3000');

    // Wait for the main app to load
    await expect(page.getByRole('button', { name: /Развернуть/i })).toBeVisible({ timeout: 25000 });

    // Open the Comparison Matrix by clicking the Analytics button
    const analyticsBtn = page.locator('text="Аналитика (Сравнение)"');
    await expect(analyticsBtn).toBeVisible();
    await analyticsBtn.click();

    // Wait for Matrix to appear
    const matrixOverlay = page.locator('.glass-panel').filter({ hasText: 'Матрица Сравнения' });
    await expect(matrixOverlay).toBeVisible();

    // Select Su-57 and F-35A
    const teamASelect = matrixOverlay.locator('select').first();
    const teamBSelect = matrixOverlay.locator('select').nth(1);

    await teamASelect.selectOption('Su-57 Felon');
    await teamBSelect.selectOption('F-35A Lightning II');

    // Open Combat Simulator
    const duelButton = page.getByRole('button', { name: /Симуляция Дуэли/i });
    await expect(duelButton).toBeVisible();

    // Screenshot before starting simulation
    await page.screenshot({ path: 'tests/screenshots/phase16_matrix_with_duel_button.png' });

    await duelButton.click();

    // Wait for Simulator to appear
    await expect(page.locator('text=Симулятор Боестолкновения')).toBeVisible();

    // Wait for timeline animation to finish (at least 3 seconds)
    await page.waitForTimeout(5000);

    // Screenshot the final timeline state
    await page.screenshot({ path: 'tests/screenshots/phase16_duel_timeline.png' });

    // Expect conclusion
    await expect(page.locator('text=Финальный Анализ ИИ')).toBeVisible();
});
