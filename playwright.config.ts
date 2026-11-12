import { defineConfig, devices } from '@playwright/test';
import { isCiEnvironment } from './src/lib/env';

const ci = isCiEnvironment();

/**
 * E2E + contract tests for RBP-Strateg 2.0.
 *
 * - Only the intended `./e2e` directory is discovered, and only `*.spec.ts`
 *   files — stale helper/legacy specs elsewhere can never be picked up.
 * - `webServer` runs the compiled production server. This avoids stale
 *   Turbopack dev persistence state during parallel API/UI tests and matches
 *   the runtime produced by `npm run build`.
 * - API/contract specs that use only the `request` fixture or are pure
 *   functions do not launch a browser; UI specs do.
 */
export default defineConfig({
    testDir: './e2e',
    testMatch: '*.spec.ts',
    fullyParallel: true,
    forbidOnly: ci,
    retries: ci ? 2 : 0,
    workers: ci ? 1 : undefined,
    timeout: 30_000,
    reporter: [
      ['html', { outputFolder: 'playwright-report' }],
      ['list'],
    ],
    outputDir: 'test-results',
    use: {
        baseURL: 'http://localhost:3000',
        trace: 'off',
        video: 'off',
    },
    webServer: {
        command: 'npm run start',
        url: 'http://localhost:3000/api/countries',
        reuseExistingServer: !ci,
        timeout: 180_000,
        stdout: 'ignore',
        stderr: 'pipe',
        // Тесты не должны зависеть от живой сети: авто-refresh датасета
        // выключен явно, а не только через детект CI.
        env: { RBP_AUTO_REFRESH: 'false' },
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
});