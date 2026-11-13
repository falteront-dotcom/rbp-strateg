import { test, expect } from '@playwright/test';

// ─────────────────────────────────────────────────────────────────────────────
// Шаг 4: страница методологии и экспорт досье (md).
// Досье несёт провенанс и интервалы; методология доступна без БД.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('methodology page', () => {
  test('renders the model contract and honest limitations', async ({ request }) => {
    const response = await request.get('/v3/methodology');
    expect(response.status()).toBe(200);
    const html = await response.text();
    expect(html).toContain('Методология БП 3.0');
    expect(html).toContain('экспертные');
    expect(html).toContain('Dirichlet');
    expect(html).toContain('Ранг — не точка');
    expect(html).toContain('Ограничения');
  });
});

test.describe('dossier export', () => {
  test('USA dossier is markdown with provenance and intervals', async ({ request }) => {
    const response = await request.get('/api/v3/dossier?iso=USA');
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('text/markdown');
    expect(response.headers()['content-disposition']).toContain('attachment');
    expect(response.headers()['content-disposition']).toContain('dossier-USA');
    const md = await response.text();
    expect(md).toContain('# Досье:');
    expect(md).toContain('P10–P90');
    expect(md).toContain('ранг P10–P90');
    expect(md).toContain('Грейд входов');
    expect(md).toContain('Чувствительность');
    expect(md).toContain('Методология и ограничения');
    expect(md).toContain('не калиброваны по исходам');
  });

  test('iso is case-insensitive and trimmed', async ({ request }) => {
    const response = await request.get('/api/v3/dossier?iso=usa');
    expect(response.status()).toBe(200);
    const md = await response.text();
    expect(md).toContain('(USA)');
  });

  test('unknown iso is 404, missing iso is 400', async ({ request }) => {
    const notFound = await request.get('/api/v3/dossier?iso=ZZZ');
    expect(notFound.status()).toBe(404);
    const badRequest = await request.get('/api/v3/dossier');
    expect(badRequest.status()).toBe(400);
  });

  test('country card links to the dossier', async ({ request }) => {
    const response = await request.get('/v3/country/USA');
    expect(response.status()).toBe(200);
    const html = await response.text();
    expect(html).toContain('/api/v3/dossier?iso=USA');
    expect(html).toContain('Досье (md)');
  });
});
