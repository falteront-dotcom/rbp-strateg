import { NextResponse } from 'next/server';
import { openDatabase } from '@/db/runtime';
import { getPublishedDataset } from '@/db/dataset-repository';
import { createWorkspaceSnapshot, getScenario, getWorkspace } from '@/db/workspace-repository';

type Context = { params: Promise<{ workspaceId: string }> };

export async function POST(request: Request, context: Context): Promise<NextResponse> {
  const { workspaceId } = await context.params;
  const body = await request.json() as { scenarioId?: string; analysis?: unknown };
  const db = openDatabase();
  try {
    const workspace = getWorkspace(db, workspaceId);
    const scenario = body.scenarioId ? getScenario(db, workspaceId, body.scenarioId) : null;
    const dataset = getPublishedDataset(db);
    if (!workspace || !scenario) return NextResponse.json({ error: 'Workspace or scenario not found' }, { status: 404 });
    if (!dataset) return NextResponse.json({ error: 'No published dataset' }, { status: 409 });
    if (!body.analysis || typeof body.analysis !== 'object') return NextResponse.json({ error: 'analysis object required' }, { status: 400 });
    const snapshot = createWorkspaceSnapshot(db, workspaceId, scenario.id, dataset.version, 'bp-v2', body.analysis);
    return NextResponse.json({ snapshot }, { status: 201 });
  } finally { db.close(); }
}
