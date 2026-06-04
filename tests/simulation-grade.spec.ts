import { test, expect } from '@playwright/test';

test('should deploy units and initiate engagement', async ({ page }) => {
  await page.goto('http://localhost:3001'); // Use 3001 as 3000 was busy
  
  // 1. Deploy NATO unit
  await page.selectOption('select', 'T-90M'); 
  await page.click('text=РАЗВЕРНУТЫ');
  
  // 2. Deploy RUS unit
  await page.selectOption('select', 'Leopard 2A7'); 
  await page.click('text=РАЗВЕРНУТЫ');

  // 3. Check if units are listed in the assets panel
  const assetList = page.locator('.glass-panel >> text=T-90M');
  await expect(assetList).toBeVisible();

  // 4. Trigger engagement by clicking on map
  await page.click('div.cursor-crosshair', { position: { x: 500, y: 500 } });

  // 5. Verify target lock (Tactical Log)
  const log = page.locator('text=ЗАХВАТ');
  await expect(log).toBeVisible({ timeout: 10000 });
});

test('should react to environmental changes', async ({ page }) => {
  await page.goto('http://localhost:3001');
  
  // Deploy unit
  await page.selectOption('select', 'F-35');
  await page.click('text=РАЗВЕРНУТЫ');

  // Get initial potential
  const potentialInitial = await page.locator('text=ИТОГО (ОБС)').last().innerText();
  
  // Change weather to Storm
  // The selector might need to be more specific. Let's try by label.
  await page.selectOption('select', 'Storm'); 
  
  // Check if potential changed
  const potentialAfter = await page.locator('text=ИТОГО (ОБС)').last().innerText();
  expect(potentialInitial).not.toBe(potentialAfter);
});
