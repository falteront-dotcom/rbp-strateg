import { test, expect } from '@playwright/test';

// ─────────────────────────────────────────────────────────────────────────────
// Отпечаток релиза: /api/health обязан нести commit собранного билда.
//
// Зачем: стейл-прод ноября 2026 — Render держал билд от 7 октября, потому что
// все деплои после v3-волны падали на сборке, а отпечаток «ровно 195 стран»
// проходил и старый билд. SHA коммита (RENDER_GIT_COMMIT на Render) различает
// релизы независимо от данных и переименований маршрутов; keepalive.yml
// сверяет его с master. Вне Render поле пустое — контракт проверяет наличие
// ключа и тип, а не значение.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('release fingerprint', () => {
  test('health carries the build commit field', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(typeof body.commit).toBe('string');
  });

  test('liveness stays up for the Render health check', async ({ request }) => {
    const response = await request.get('/api/live');
    expect(response.status()).toBe(200);
  });
});
