import { test, expect } from '@playwright/test';
import type { ScenarioResult } from '@/lib/what-if-engine';
import { buildConfidenceSummary, buildScenarioExplanation } from '@/lib/analysis/explainability';

function makeScenarioResult(): ScenarioResult {
  const componentDeltas = [
    { component: 'weapon' as const, label: 'Оружие', before: 10, after: 15, delta: 5, deltaPercent: 50 },
    { component: 'manpower' as const, label: 'Личный Состав', before: 10, after: 8, delta: -2, deltaPercent: -20 },
    { component: 'logistics' as const, label: 'Логистика', before: 10, after: 11, delta: 1, deltaPercent: 10 },
    { component: 'c2' as const, label: 'Управление', before: 10, after: 10, delta: 0, deltaPercent: 0 },
    { component: 'economy' as const, label: 'Экономика', before: 10, after: 10, delta: 0, deltaPercent: 0 },
    { component: 'doctrine' as const, label: 'Доктрина', before: 10, after: 10, delta: 0, deltaPercent: 0 },
    { component: 'readiness' as const, label: 'Готовность', before: 10, after: 10, delta: 0, deltaPercent: 0 },
    { component: 'terrain' as const, label: 'География', before: 10, after: 9, delta: -1, deltaPercent: -10 },
  ];
  return {
    modifiedData: {} as ScenarioResult['modifiedData'],
    baseBP: {} as ScenarioResult['baseBP'],
    scenarioBP: {} as ScenarioResult['scenarioBP'],
    componentDeltas,
    totalDelta: 3,
    baseRank: 4,
    scenarioRank: 3,
    rankChange: 1,
  };
}

test.describe('explainable analysis', () => {
  test('ranks all eight component drivers deterministically', () => {
    const confidence = buildConfidenceSummary([], 'OPERATIONAL');
    const first = buildScenarioExplanation(makeScenarioResult(), confidence);
    const second = buildScenarioExplanation(makeScenarioResult(), confidence);

    expect(second).toEqual(first);
    expect(first.componentDeltas).toHaveLength(8);
    expect(first.topPositiveDrivers[0].component).toBe('weapon');
    expect(first.topNegativeDrivers[0].component).toBe('manpower');
    expect(first.confidenceScore).toBe(1);
  });

  test('reduces confidence and emits warnings for missing fields/degraded health', () => {
    const confidence = buildConfidenceSummary(['militaryBudgetBn', 'nuclearWarheads'], 'DEGRADED');
    expect(confidence.level).toBe('medium');
    expect(confidence.score).toBeLessThan(1);
    expect(confidence.warnings.length).toBeGreaterThan(0);
  });

  test('What-If API keeps its existing response fields and adds metadata', async ({ request }) => {
    const response = await request.post('/api/what-if', { data: { iso: 'USA' } });
    expect(response.ok()).toBe(true);
    const body = await response.json();

    expect(body.base.isoCode).toBe('USA');
    expect(typeof body.scenario.totalBP).toBe('number');
    expect(body.metadata).toMatchObject({ formulaVersion: 'bp-v2' });
    expect(body.metadata.datasetVersion).toBeTruthy();
    expect(body.explanation.componentDeltas).toHaveLength(8);
  });
});
