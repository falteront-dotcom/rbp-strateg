const brainDir = 'C:\\Users\\Semyon\\.gemini\\antigravity\\brain\\6e6347ed-df67-4e12-98ca-6c3e407b04fb';

(async () => {
    const { chromium } = await import('playwright');
    const path = await import('node:path');
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    try {
        console.log('Navigating to app...');
        await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

        console.log('Opening Comparison Matrix...');
        // Click the button to open matrix
        await page.click('button:has(svg.lucide-activity)');
        await page.waitForTimeout(1000);

        console.log('Taking baseline matrix screenshot...');
        await page.screenshot({ path: path.join(brainDir, 'phase17_matrix_baseline.png') });

        console.log('Toggling ERA (ДЗ) or APS (КАЗ) module...');
        // Find checkboxes for loadout modules
        // Click the first KAZ checkbox
        const checkboxes = await page.$$('input[type="checkbox"]');
        if (checkboxes.length > 0) {
            // Toggle the first one we find
            await checkboxes[0].click();
            await page.waitForTimeout(500);
            await page.screenshot({ path: path.join(brainDir, 'phase17_matrix_module_active.png') });
            console.log('Matrix Module Active screenshot taken.');
        } else {
            console.log('No module checkboxes found in matrix?');
        }

        // Now start the duel
        console.log('Starting Duel Simulation...');
        const duelBtn = await page.$('button:has-text("Симуляция Дуэли")');
        if (duelBtn) {
            await duelBtn.click();
            await page.waitForTimeout(2000); // wait for anims
            await page.screenshot({ path: path.join(brainDir, 'phase17_duel_with_module.png') });
            console.log('Duel Simulation screenshot taken.');
        }

        // Now check Custom Unit Builder
        console.log('Opening Custom Unit Builder...');
        // Close simulator and matrix
        await page.click('button:has(svg.lucide-x)'); // close sim
        await page.waitForTimeout(500);
        await page.click('button:has(svg.lucide-x)'); // close matrix
        await page.waitForTimeout(500);

        // Open builder
        await page.click('button:has(svg.lucide-brain-circuit)');
        await page.waitForTimeout(1000);

        // Toggle EPS or beast mode in builder
        const builderChecks = await page.$$('input[type="checkbox"]');
        if (builderChecks.length > 0) {
            await builderChecks[builderChecks.length - 1].click();
            await page.waitForTimeout(500);
            await page.screenshot({ path: path.join(brainDir, 'phase17_builder_with_module.png') });
            console.log('Builder Module Active screenshot taken.');
        }

    } catch (err) {
        console.error(err);
    } finally {
        await browser.close();
    }
})();
