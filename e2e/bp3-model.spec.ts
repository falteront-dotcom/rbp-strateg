import { test, expect } from '@playwright/test';
import {
  DEFAULT_WEIGHTS_BP3,
  analyzeSensitivity,
  calculateAllBP3,
  calculateCountryBP3,
  findTop30Input,
  validateWeightsBP3,
  type CountryBP3Input,
} from '../src/lib/bp3/index';
import { V2_COMPONENTS } from '../src/lib/bp3/types';
import { BP_COMPONENTS } from '../src/lib/bp/types';

// ─────────────────────────────────────────────────────────────────────────────
// Модель БП 3.0: инварианты и живой контракт v2Scores.
//
// Проверки перенесены из корневого verify_bp3.ts (удалён в PR шага 1:
// верификация живёт в e2e или удаляется). Плюс регресс на контракт поколений:
// bp3 потребляет v2-баллы (calculate-bp3.ts, слой 1) — v2 заморожен как
// внутренний контракт, но не мёртв: правка v2-балла обязана менять итог БП3.
// Чистые функции, сервер и браузер не нужны.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('BP3 model invariants', () => {
  test('default weights are valid and sum to 1.0', () => {
    const validation = validateWeightsBP3(DEFAULT_WEIGHTS_BP3);
    expect(validation.valid).toBe(true);
    const sum = Object.values(DEFAULT_WEIGHTS_BP3).reduce((a, w) => a + w, 0);
    expect(Math.abs(sum - 1.0)).toBeLessThan(1e-9);
  });

  test('focus countries keep P10 ≤ median ≤ P90 on the 0–100 scale', () => {
    const inputs: CountryBP3Input[] = [];
    for (const iso of ['USA', 'RUS', 'CHN', 'UKR']) {
      const input = findTop30Input(iso);
      expect(input, `input for ${iso}`).toBeDefined();
      if (input) inputs.push(input);
    }
    const results = calculateAllBP3(inputs, { iterations: 4000 });
    expect(results.length).toBe(4);
    for (const r of results) {
      expect(r.total.p10, `${r.isoCode} P10`).toBeLessThanOrEqual(r.total.median);
      expect(r.total.median, `${r.isoCode} median`).toBeLessThanOrEqual(r.total.p90);
      expect(r.total.median).toBeGreaterThan(0);
      expect(r.total.median).toBeLessThanOrEqual(100);
    }
  });

  test('doubling UKR FPV production raises U and does not lower the BP3 median', () => {
    const ukr = findTop30Input('UKR');
    expect(ukr).toBeDefined();
    if (!ukr) return;
    const base = calculateCountryBP3(ukr, { iterations: 2000 });
    const boosted = calculateCountryBP3(
      {
        ...ukr,
        uav: {
          ...ukr.uav,
          fpvProductionPerMonth: {
            ...ukr.uav.fpvProductionPerMonth,
            value: ukr.uav.fpvProductionPerMonth.value * 2,
          },
        },
      },
      { iterations: 2000 },
    );
    expect(boosted.components.uav.score).toBeGreaterThan(base.components.uav.score);
    expect(boosted.total.median).toBeGreaterThanOrEqual(base.total.median);
  });

  test('same seed reproduces the Monte Carlo summary bit-for-bit', () => {
    const usa = findTop30Input('USA');
    expect(usa).toBeDefined();
    if (!usa) return;
    const first = calculateCountryBP3(usa, { iterations: 1500 });
    const second = calculateCountryBP3(usa, { iterations: 1500 });
    expect(first.total.median).toBe(second.total.median);
    expect(first.total.p10).toBe(second.total.p10);
    expect(first.total.p90).toBe(second.total.p90);
  });

  test('tornado has 10 entries with variance shares summing to 1', () => {
    const usa = findTop30Input('USA');
    expect(usa).toBeDefined();
    if (!usa) return;
    const result = calculateCountryBP3(usa, { iterations: 2000 });
    const report = analyzeSensitivity(result);
    expect(report.entries.length).toBe(10);
    const shareSum = report.entries.reduce((a, e) => a + e.varianceShare, 0);
    expect(Math.abs(shareSum - 1.0)).toBeLessThan(1e-6);
    for (let i = 1; i < report.entries.length; i++) {
      // entries отсортированы по OAT-размаху (bySwing), не по доле дисперсии
      expect(report.entries[i - 1].oatSwing).toBeGreaterThanOrEqual(
        report.entries[i].oatSwing,
      );
    }
  });
});

test.describe('v2Scores is a live contract between generations', () => {
  test('bp3 consumes exactly the eight v2 components', () => {
    expect([...V2_COMPONENTS].sort()).toEqual([...BP_COMPONENTS].sort());
  });

  test('halving the v2 weapon score lowers the BP3 median', () => {
    const usa = findTop30Input('USA');
    expect(usa).toBeDefined();
    if (!usa) return;
    const base = calculateCountryBP3(usa, { iterations: 2000 });
    const weakened: CountryBP3Input = {
      ...usa,
      v2Scores: {
        ...usa.v2Scores,
        weapon: { ...usa.v2Scores.weapon, score: usa.v2Scores.weapon.score / 2 },
      },
    };
    const weaker = calculateCountryBP3(weakened, { iterations: 2000 });
    // Тот же сид: разница детерминирована и обязана быть заметной
    // (доля weapon в весах bp3 — 0.16).
    expect(weaker.total.median).toBeLessThan(base.total.median - 1);
  });
});
