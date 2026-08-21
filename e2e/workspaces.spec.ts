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

    const snapshot = await request.post(`/api/workspaces/${created.workspace.id}/analysis/snapshot`, {
      data: { scenarioId: scenario.scenario.id, analysis: analysisBody },
    });
    expect(snapshot.status()).toBe(201);
    expect((await snapshot.json()).snapshot.datasetVersion).toBeTruthy();

    const jsonExport = await request.get(`/api/workspaces/${created.workspace.id}/export?format=json`);
    expect(jsonExport.ok()).toBe(true);
    const jsonBody = await jsonExport.json();
    expect(jsonBody.workspace.schemaVersion).toBe(1);
    expect(jsonBody.datasetVersion).toBeTruthy();
    expect(jsonBody.scenarios).toHaveLength(1);
    expect(jsonBody.snapshots).toHaveLength(1);
    expect(jsonBody.snapshots[0].result).toBeTruthy();

    const csvExport = await request.get(`/api/workspaces/${created.workspace.id}/export?format=csv`);
    expect(csvExport.ok()).toBe(true);
    const csvBody = await csvExport.text();
    expect(csvBody).toContain('workspaceId');
    expect(csvBody).toContain('scenarioId');
    expect(csvBody).toContain('totalBP');

    const deleted = await request.delete(`/api/workspaces/${created.workspace.id}`);
    expect(deleted.status()).toBe(204);
    expect((await request.get(`/api/workspaces/${created.workspace.id}`)).status()).toBe(404);
  });

  test('rejects invalid workspace and scenario commands', async ({ request }) => {
    expect((await request.post('/api/workspaces', { data: { name: '' } })).status()).toBe(400);
    expect((await request.post('/api/workspaces', { data: { name: 'x', comparisonIsos: ['USA', 'RUS', 'CHN', 'IND', 'GBR'] } })).status()).toBe(400);
    expect((await request.post('/api/workspaces', { data: { name: 'Unknown country', selectedCountryIso: 'ZZZ' } })).status()).toBe(400);

    const created = await (await request.post('/api/workspaces', { data: { name: 'Validation case' } })).json();
    const invalidScenario = await request.post(`/api/workspaces/${created.workspace.id}/scenarios`, {
      data: { name: 'Bad', params: { budgetChange: Number.POSITIVE_INFINITY } },
    });
    expect(invalidScenario.status()).toBe(400);
    const unsupportedScenario = await request.post(`/api/workspaces/${created.workspace.id}/scenarios`, { data: { name: 'Bad key', params: { unsupported: 1 } } });
    expect(unsupportedScenario.status()).toBe(400);

    const root = await (await request.post(`/api/workspaces/${created.workspace.id}/scenarios`, { data: { name: 'Root', params } })).json();
    const child = await (await request.post(`/api/workspaces/${created.workspace.id}/scenarios`, { data: { name: 'Child', params, parentScenarioId: root.scenario.id } })).json();
    const grandchild = await (await request.post(`/api/workspaces/${created.workspace.id}/scenarios`, { data: { name: 'Grandchild', params, parentScenarioId: child.scenario.id } })).json();
    expect(grandchild.scenario.parentScenarioId).toBe(child.scenario.id);
    const tooDeep = await request.post(`/api/workspaces/${created.workspace.id}/scenarios`, { data: { name: 'Too deep', params, parentScenarioId: grandchild.scenario.id } });
    expect(tooDeep.status()).toBe(409);
    await request.delete(`/api/workspaces/${created.workspace.id}`);
  });
});
