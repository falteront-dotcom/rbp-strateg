import { test, expect } from '@playwright/test';

test('Intel Card Rendering Test', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Wait for the app to load
    await page.waitForTimeout(1000);

    // Deploy some units
    // Assuming default deployment selects the first unit
    await page.click('button:has-text("РАЗВЕРНУТЬ")');
    await page.waitForTimeout(500);

    // Select a different unit to mix types (e.g. S-400)
    await page.selectOption('select', { label: "[RU] С-400 'Триумф'" });
    await page.click('button:has-text("РАЗВЕРНУТЬ")');
    await page.waitForTimeout(500);

    // Group select across the map by dragging
    await page.mouse.move(100, 100);
    await page.mouse.down();
    await page.mouse.move(800, 800);
    await page.mouse.up();
    await page.waitForTimeout(500);

    // Change Weather and EW to see modifiers apply
    await page.selectOption('select:has-text("Шторм")', { label: "Шторм" });
    await page.waitForTimeout(200);
    // Extracting all select elements on the page, the second one should be EW
    const selects = page.locator('select');
    await selects.nth(2).selectOption({ value: "Extreme" }); // 0 is Unit Type, 1 is Weather, 2 is EW
    await page.waitForTimeout(500);

    // Take screenshot of the entire UI, Intel Card should be visible on the left
    await page.screenshot({ path: 'C:/Users/Semyon/.gemini/antigravity/brain/6e6347ed-df67-4e12-98ca-6c3e407b04fb/v10_intel_card_test.png' });
});
