import type { ScenarioParams } from '@/lib/what-if-engine';

export interface Workspace {
  id: string;
  name: string;
  selectedCountryIso: string;
  comparisonIsos: string[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceScenario {
  id: string;
  workspaceId: string;
  parentScenarioId: string | null;
  name: string;
  params: ScenarioParams;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkspaceInput {
  name: string;
  selectedCountryIso?: string;
  comparisonIsos?: string[];
  notes?: string;
}

export interface UpdateWorkspaceInput {
  name?: string;
  selectedCountryIso?: string;
  comparisonIsos?: string[];
  notes?: string;
}

export interface CreateScenarioInput {
  name: string;
  params: unknown;
  parentScenarioId?: string | null;
}
