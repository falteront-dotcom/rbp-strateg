import { test, expect } from '@playwright/test';

test.describe('public strategic object layer', () => {
  test('returns local documented objects without a Mapbox token at global zoom', async ({ request }) => {
    const response = await request.get('/api/map/objects?south=35&west=-90&north=60&east=-60&zoom=3');
    expect(response.ok()).toBe(true);
    const body = await response.json();
    expect(Array.isArray(body.objects)).toBe(true);
    expect(body.objects.every((object: { publiclyDocumented: boolean; source: string; confidence: string }) => object.publiclyDocumented && object.source && ['high', 'medium', 'low'].includes(object.confidence))).toBe(true);
  });

  test('rejects unbounded global object queries', async ({ request }) => {
    const response = await request.get('/api/map/objects?south=-90&west=-180&north=90&east=180&zoom=3');
    expect(response.status()).toBe(400);
  });
});
