import { test, expect } from '@playwright/test';

test('should deploy unit and show logistics data', async ({ page }) => {
  await page.goto('http://localhost:3000');
  // Deploy unit
  await page.selectOption('select', 'T-90M Proryv');
  await page.click('[data-testid="deploy-button"]');
  
  // Wait for unit to appear and click it
  const unitMarker = page.locator('[data-testid="unit-marker"]').first();
  await unitMarker.click();

  // Check if Logistics panel appears
  const fuelLabel = page.locator('text=Fuel');
  await expect(fuelLabel).toBeVisible();
  
  // Use the new test ID for fuel value
  const fuelValue = page.locator('[data-testid="fuel-value"]');
  await expect(fuelValue).toBeVisible();
  await expect(fuelValue).toContainText('%');
});

test('should update logistics on movement', async ({ page }) => {
  await page.goto('http://localhost:3000');
  // Deploy unit
  await page.selectOption('select', 'T-90M Proryv');
  await page.click('[data-testid="deploy-button"]');

  // Select unit
  const unitMarker = page.locator('[data-testid="unit-marker"]').first();
  await unitMarker.click();

  // Get initial fuel
  const fuelInitial = await page.locator('[data-testid="fuel-value"]').innerText();

  // Set waypoint (click on map)
  await page.click('div.cursor-crosshair', { position: { x: 200, y: 200 } });

  // Wait for movement and fuel consumption
  await page.waitForTimeout(3000);

  // Check if fuel percentage decreased
  const fuelFinal = await page.locator('[data-testid="fuel-value"]').innerText();
  expect(fuelFinal).not.toBe(fuelInitial);
});

test('should change potential when weather changes', async ({ page }) => {
  await page.goto('http://localhost:3000');
  // Deploy aircraft
  await page.selectOption('select', 'F-35A Lightning II');
  await page.click('[data-testid="deploy-button"]');

  // Select it
  const unitMarker = page.locator('[data-testid="unit-marker"]').first();
  await unitMarker.click();

  // Get initial potential - target only the value part
  const potentialLocator = page.locator('div.bg-tactical-primary\\/10 span.text-2xl');
  const potentialInitial = await potentialLocator.innerText();

  // Change weather to Storm using the new test ID
  await page.selectOption('[data-testid="weather-select"]', 'Storm');

  // Get new potential
  const potentialAfter = await potentialLocator.innerText();
  expect(potentialInitial).not.toBe(potentialAfter);
});
