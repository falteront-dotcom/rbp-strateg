import type { DatasetHealthStatus } from '@/lib/dataset/types';
import type { ScenarioResult } from '@/lib/what-if-engine';
import type { ChangedInput, ConfidenceSummary, ScenarioExplanation } from './types';

export function buildConfidenceSummary(
  missingFields: string[],
  healthStatus: DatasetHealthStatus,
): ConfidenceSummary {
  const uniqueMissing = [...new Set(missingFields)];
  const healthPenalty = healthStatus === 'OPERATIONAL' ? 0 : healthStatus === 'DEGRADED' ? 0.15 : 0.3;
  const missingPenalty = Math.min(0.5, uniqueMissing.length * 0.08);
  const score = Number(Math.max(0, 1 - healthPenalty - missingPenalty).toFixed(2));
  const level: ConfidenceSummary['level'] = score >= 0.8 ? 'high' : score >= 0.5 ? 'medium' : 'low';
  const warnings: string[] = [];
  if (healthStatus !== 'OPERATIONAL') warnings.push(`Dataset status: ${healthStatus}`);
  if (uniqueMissing.length > 0) warnings.push(`Missing fields: ${uniqueMissing.join(', ')}`);
  return { score, level, missingFieldCount: uniqueMissing.length, warnings };
}

export function buildScenarioExplanation(
  result: ScenarioResult,
  confidence: ConfidenceSummary,
  changedInputs: ChangedInput[] = [],
): ScenarioExplanation {
  const positive = result.componentDeltas
    .filter((delta) => delta.delta > 0)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 3)
    .map((delta) => ({ component: delta.component, label: delta.label, delta: delta.delta, contribution: 'positive' as const }));
  const negative = result.componentDeltas
    .filter((delta) => delta.delta < 0)
    .sort((a, b) => a.delta - b.delta)
    .slice(0, 3)
    .map((delta) => ({ component: delta.component, label: delta.label, delta: delta.delta, contribution: 'negative' as const }));

  return {
    totalDelta: result.totalDelta,
    componentDeltas: result.componentDeltas,
    topPositiveDrivers: positive,
    topNegativeDrivers: negative,
    changedInputs,
    confidenceScore: confidence.score,
    warnings: confidence.warnings,
  };
}
