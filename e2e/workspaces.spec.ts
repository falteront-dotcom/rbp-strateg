import { test, expect } from '@playwright/test';

const params = {
  budgetChange: 0.2,
  personnelChange: 0,
  allianceSwitch: null,
  nuclearGain: false,
  nuclearWarheadsGained: 50,
  atWar: false,
  sanctionsActive: false,
  tankChange: 0,
  aircraftChange: 0,
  navyChange: 0,
};

test.describe('analytical workspaces', () => {
  test('creates, reopens, branches, analyzes, and deletes a workspace', async ({ request }) => {
    const create = await request.post('/api/workspaces', {
      data: { name: 'Baltic Study', selectedCountryIso: 'USA', comparisonIsos: ['RUS'], notes: 'Baseline' },
    });
    expect(create.status()).toBe(201);
    const created = await create.json();
    expect(created.workspace).toMatchObject({ name: 'Baltic Study', selectedCountryIso: 'USA' });

    const scenarioResponse = await request.post(`/api/workspaces/${created.workspace.id}/scenarios`, {
      data: { name: 'Budget branch', params },
    });
    expect(scenarioResponse.status()).toBe(201);
    const scenario = await scenarioResponse.json();
    expect(scenario.scenario.workspaceId).toBe(created.workspace.id);

    const reopened = await request.get(`/api/workspaces/${created.workspace.id}`);
    expect(reopened.ok()).toBe(true);
    const state = await reopened.json();
    expect(state.workspace.selectedCountryIso).toBe('USA');
    expect(state.scenarios).toHaveLength(1);

    const analysis = await request.get(`/api/workspaces/${created.workspace.id}/analysis?scenarioId=${scenario.scenario.id}`);
    expect(analysis.ok()).toBe(true);
    expect(analysis.body).not.toBeNull();
    const analysisBody = await analysis.json();
    expect(analysisBody.metadata.datasetVersion).toBeTruthy();
    expect(analysisBody.explanation.componentDeltas).toHaveLength(8);

    const deleted = await request.delete(`/api/workspaces/${created.workspace.id}`);
    expect(deleted.status()).toBe(204);
    expect((await request.get(`/api/workspaces/${created.workspace.id}`)).status()).toBe(404);
  });

  test('rejects invalid workspace and scenario commands', async ({ request }) => {
    expect((await request.post('/api/workspaces', { data: { name: '' } })).status()).toBe(400);
    expect((await request.post('/api/workspaces', { data: { name: 'x', comparisonIsos: ['USA', 'RUS', 'CHN', 'IND', 'GBR'] } })).status()).toBe(400);

    const created = await (await request.post('/api/workspaces', { data: { name: 'Validation case' } })).json();
    const invalidScenario = await request.post(`/api/workspaces/${created.workspace.id}/scenarios`, {
      data: { name: 'Bad', params: { budgetChange: Number.POSITIVE_INFINITY } },
    });
    expect(invalidScenario.status()).toBe(400);
    await request.delete(`/api/workspaces/${created.workspace.id}`);
  });
});
