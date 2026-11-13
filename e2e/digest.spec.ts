import { test, expect } from '@playwright/test';
import { buildDigest, selectDigestData } from '../src/lib/digest/generator';
import { getAlertsFeed, getBP3Ranking } from '../src/lib/v3-facade';

// ─────────────────────────────────────────────────────────────────────────────
// Еженедельный дайджест: страница /v3/digest и чистый генератор Markdown.
// Генератор питается тем же фасадом, что страница, — тест прогоняет его на
// реальных данных БД (seed-эталон), чтобы регрессить контракт секций:
// топ-10 с интервалами P10–P90, неопределённые пары, лента, методология.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('digest page /v3/digest', () => {
  test('renders 200 with all digest sections', async ({ page }) => {
    const response = await page.goto('/v3/digest');
    expect(response?.status()).toBe(200);
    // Заголовок и дата генерации (проверяем в DOM, не в сыром HTML:
    // RSC-поток разбивает смешанные текстовые узлы на фрагменты)
    await expect(
      page.getByRole('heading', { name: 'Дайджест', exact: true }),
    ).toBeVisible();
    await expect(page.locator('main header')).toContainText(
      /Сгенерирован: \d{4}-\d{2}-\d{2}/,
    );
    // Секции
    await expect(
      page.getByRole('heading', { name: /Топ-10 рейтинга БП 3\.0/ }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Самые неопределённые соседние пары' }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Лента мониторинга' }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Методология и ограничения' }),
    ).toBeVisible();
    await expect(
      page.getByRole('columnheader', { name: 'Интервал P10–P90' }),
    ).toBeVisible();
    // Числа из реальной БД, не заглушки: топ-1 США присутствует
    await expect(page.locator('tbody')).toContainText('США');
    // Футер: методологическая честность и история
    await expect(page.getByText('Dirichlet').first()).toBeVisible();
    await expect(page.getByText('docs/digests').first()).toBeVisible();
    await expect(
      page.getByRole('link', { name: '/v3/methodology' }),
    ).toBeVisible();
  });

  test('digest link is in v3 navigation', async ({ request }) => {
    const response = await request.get('/v3/digest');
    const html = await response.text();
    expect(html).toContain('href="/v3/digest"');
    expect(html).toContain('href="/v3/methodology"');
  });
});

test.describe('digest generator on real facade data', () => {
  test('contains top-10 with P10–P90 intervals and methodology footer', () => {
    const ranking = getBP3Ranking();
    expect(ranking.length).toBeGreaterThan(0);
    const alerts = getAlertsFeed();
    const md = buildDigest({
      dateIso: '2026-11-14',
      ranking,
      alerts,
    });

    // Заголовок и дата
    expect(md).toContain('# Дайджест РБП-Стратег · 2026-11-14');
    // Топ-10: секция и все строки рейтинга с интервалами
    expect(md).toContain('## Топ-10 рейтинга БП 3.0');
    for (const row of ranking.slice(0, 10)) {
      expect(md).toContain(row.name);
      expect(md).toContain(`${row.p10.toFixed(1).replace('.', ',')}–${row.p90.toFixed(1).replace('.', ',')}`);
    }
    // Неопределённые пары и лента мониторинга
    expect(md).toContain('## Самые неопределённые соседние пары');
    expect(md).toContain('## Лента мониторинга');
    // Методологический футер
    expect(md).toContain('веса экспертные');
    expect(md).toContain('Dirichlet(κ=100)');
    expect(md).toContain('/v3/methodology');
  });

  test('selects the least certain adjacent pairs from ranking', () => {
    const ranking = getBP3Ranking();
    const d = selectDigestData({
      dateIso: '2026-11-14',
      ranking,
      alerts: [],
    });
    expect(d.pairs.length).toBeGreaterThan(0);
    expect(d.pairs.length).toBeLessThanOrEqual(3);
    // Пары отсортированы по возрастанию pAboveNext (наименее уверенные — выше)
    const ps = d.pairs.map((p) => p.pAboveNext);
    expect([...ps].sort((a, b) => a - b)).toEqual(ps);
    // Каждая пара — реальные соседи по рейтингу
    for (const p of d.pairs) {
      const upperIdx = ranking.findIndex((r) => r.iso === p.upper.iso);
      expect(ranking[upperIdx + 1].iso).toBe(p.lower.iso);
    }
  });

  test('empty alerts do not crash the generator', () => {
    const ranking = getBP3Ranking();
    const md = buildDigest({ dateIso: '2026-11-14', ranking, alerts: [] });
    expect(md).toContain('## Лента мониторинга');
    expect(md).toContain('Алертов нет');
    // Остальные секции на месте
    expect(md).toContain('## Топ-10 рейтинга БП 3.0');
    expect(md).toContain('## Методология и ограничения');
  });
});
