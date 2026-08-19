import type { ComponentDelta } from '@/lib/what-if-engine';

export interface ConfidenceSummary {
  score: number;
  level: 'high' | 'medium' | 'low';
  missingFieldCount: number;
  warnings: string[];
}

export interface AnalysisMetadata {
  datasetVersion: string | null;
  formulaVersion: string;
  calculatedAt: string;
  confidence: ConfidenceSummary;
  warnings: string[];
}

export interface ScenarioDriver {
  component: ComponentDelta['component'];
  label: string;
  delta: number;
  contribution: 'positive' | 'negative';
}

export interface ChangedInput {
  field: string;
  before: unknown;
  after: unknown;
}

export interface ScenarioExplanation {
  totalDelta: number;
  componentDeltas: ComponentDelta[];
  topPositiveDrivers: ScenarioDriver[];
  topNegativeDrivers: ScenarioDriver[];
  changedInputs: ChangedInput[];
  confidenceScore: number;
  warnings: string[];
}
