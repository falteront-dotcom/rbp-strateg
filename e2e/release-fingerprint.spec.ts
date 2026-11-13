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
  test('health carries the build commit field in every response', async ({ request }) => {
    const response = await request.get('/api/health');
    // 200 — данные сходятся с эталоном; 503 — расхождение (в CI так оставляет
    // инъекция отказа pipeline в admin-api.spec.ts). Отпечаток обязан быть
    // в обоих случаях: «старый билд» и «новый билд с broken данными» —
    // разные аварии, монитор должен их различать.
    expect([200, 503]).toContain(response.status());
    const body = await response.json();
    expect(typeof body.commit).toBe('string');
    if (response.status() === 200) expect(body.ok).toBe(true);
  });

  test('liveness stays up for the Render health check', async ({ request }) => {
    const response = await request.get('/api/live');
    expect(response.status()).toBe(200);
  });
});
