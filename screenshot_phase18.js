const { chromium } = require('playwright');
const path = require('path');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    console.log("Navigating to localhost:3000...");
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 120000 });
    console.log("Page loaded. Waiting for compilation...");

    // Wait for the UI 
    await page.waitForTimeout(10000);

    // Find custom quantity selector
    console.log("Locating scale/quantity selector...");
    await page.waitForSelector('select', { state: 'visible' });

    // Assuming the second select is the quantity multiplier
    const selects = await page.$$('select');
    if (selects.length >= 2) {
        await selects[1].selectOption({ value: '50' });
        console.log("Selected x50 quantity");
    }

    // Click Deploy
    console.log("Deploying x50 units...");
    await page.getByText(/РАЗВЕРНУТЬ|ДЕПЛОЙ/i).click();

    // Wait a couple seconds for movement and markers
    await page.waitForTimeout(3000);

    // Zoom out the map to see the cluster
    const map = await page.locator('.group\\/map');
    await map.hover();
    await page.mouse.wheel(0, 1000); // Trigger zoom out

    // Deploy another x50
    await page.getByText(/РАЗВЕРНУТЬ|ДЕПЛОЙ/i).click();
    await page.waitForTimeout(4000);

    const artifactDir = "C:\\Users\\Semyon\\.gemini\\antigravity\\brain\\6e6347ed-df67-4e12-98ca-6c3e407b04fb";
    const filename = path.join(artifactDir, "phase18_mass_deployment.png");

    await page.screenshot({ path: filename, fullPage: true });
    console.log("Screenshot saved at", filename);

    await browser.close();
})();
