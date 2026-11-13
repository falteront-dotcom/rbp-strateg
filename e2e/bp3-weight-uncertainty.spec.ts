import { test, expect } from '@playwright/test';
import {
  DEFAULT_WEIGHTS_BP3,
  calculateCountryBP3,
  findTop30Input,
  mulberry32,
  createNormalSampler,
  createGammaSampler,
  sampleDirichletWeights,
} from '../src/lib/bp3/index';
import { BP3_COMPONENTS } from '../src/lib/bp3/types';

// ─────────────────────────────────────────────────────────────────────────────
// Весовая неопределённость (шаг 2 дорожной карты, пузырь 2026-11-13).
// Веса экспертные → тянутся из Dirichlet на каждой итерации MC; P10/P90
// обязаны покрывать весовой риск, а не только разброс входов. Чистые функции.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Dirichlet weight uncertainty', () => {
  test('drawn weights sum to 1 and average to the expert weights', () => {
    const rng = mulberry32(42);
    const nextNormal = createNormalSampler(rng);
    const nextGamma = createGammaSampler(rng, nextNormal);
    const kappa = 100;
    const alphas = BP3_COMPONENTS.map((c) => DEFAULT_WEIGHTS_BP3[c] * kappa);
    const sums: number[] = BP3_COMPONENTS.map(() => 0);
    const draws = 5000;
    let maxSumDeviation = 0;
    let minWeight = Infinity;
    for (let i = 0; i < draws; i++) {
      const w = sampleDirichletWeights(nextGamma, alphas);
      const sum = w.reduce((a, v) => a + v, 0);
      maxSumDeviation = Math.max(maxSumDeviation, Math.abs(sum - 1));
      w.forEach((v, j) => {
        sums[j] = (sums[j] ?? 0) + v;
        minWeight = Math.min(minWeight, v);
      });
    }
    // Проверки вне цикла: 55k expect внутри цикла дали бы минуты рантайма
    expect(maxSumDeviation).toBeLessThan(1e-9);
    expect(minWeight).toBeGreaterThanOrEqual(0);
    BP3_COMPONENTS.forEach((c, j) => {
      const mean = (sums[j] ?? 0) / draws;
      // статистическое допущение: 5000 draws, σ среднего ≈ 0.0005
      expect(Math.abs(mean - DEFAULT_WEIGHTS_BP3[c]), `mean weight ${c}`).toBeLessThan(0.01);
    });
  });

  test('weight uncertainty widens the P10–P90 interval', () => {
    const usa = findTop30Input('USA');
    expect(usa).toBeDefined();
    if (!usa) return;
    const fixed = calculateCountryBP3(usa, { iterations: 3000, weightConcentration: 0 });
    const drawn = calculateCountryBP3(usa, { iterations: 3000, weightConcentration: 100 });
    const fixedWidth = fixed.total.p90 - fixed.total.p10;
    const drawnWidth = drawn.total.p90 - drawn.total.p10;
    expect(drawnWidth).toBeGreaterThan(fixedWidth);
  });

  test('same seed reproduces results with weight uncertainty on', () => {
    const usa = findTop30Input('USA');
    expect(usa).toBeDefined();
    if (!usa) return;
    const a = calculateCountryBP3(usa, { iterations: 1500 });
    const b = calculateCountryBP3(usa, { iterations: 1500 });
    expect(a.total.median).toBe(b.total.median);
    expect(a.total.p10).toBe(b.total.p10);
    expect(a.total.p90).toBe(b.total.p90);
  });

  test('default calculation includes weight uncertainty (intervals differ from fixed weights)', () => {
    const ukr = findTop30Input('UKR');
    expect(ukr).toBeDefined();
    if (!ukr) return;
    const byDefault = calculateCountryBP3(ukr, { iterations: 2000 });
    const fixed = calculateCountryBP3(ukr, { iterations: 2000, weightConcentration: 0 });
    expect(byDefault.total.p90 - byDefault.total.p10).not.toBe(
      fixed.total.p90 - fixed.total.p10,
    );
  });
});

test.describe('rank stability in the bp3 API', () => {
  test('ranking rows carry rank intervals and P(above next)', async ({ request }) => {
    const response = await request.get('/api/v3/bp3');
    expect(response.status()).toBe(200);
    const rows = await response.json();
    expect(rows.length).toBeGreaterThan(100);
    for (const row of rows) {
      expect(row.rankStability).toBeDefined();
      expect(row.rankStability.rankP10).toBeLessThanOrEqual(row.rankStability.rankP90);
      expect(row.rankStability.rankP10).toBeGreaterThanOrEqual(1);
      if (row.rankStability.pAboveNext !== null) {
        expect(row.rankStability.pAboveNext).toBeGreaterThanOrEqual(0);
        expect(row.rankStability.pAboveNext).toBeLessThanOrEqual(1);
      }
    }
    // Лидер рейтинга: pAboveNext — число, а не null (сосед существует).
    // Значение не ассертим: топ-страны могут быть статистически неразличимы
    // (замер 2026-11-14: P(USA выше CHN) ≈ 0.65) — это и есть смысл метрики.
    expect(typeof rows[0].rankStability.pAboveNext).toBe('number');
    // Среди 195 стран есть близкие пары — место в рейтинге не точка
    const someUncertain = rows.some(
      (r: { rankStability: { pAboveNext: number | null } }) =>
        r.rankStability.pAboveNext !== null && r.rankStability.pAboveNext < 0.99,
    );
    expect(someUncertain).toBe(true);
  });
});
