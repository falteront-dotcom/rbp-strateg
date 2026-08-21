import { NextResponse } from 'next/server';
import { openDatabase } from '@/db/runtime';
import { deleteScenario, getScenario, updateScenario } from '@/db/workspace-repository';
import { validateScenarioInput } from '@/lib/workspace/validation';

type Context = { params: Promise<{ workspaceId: string; scenarioId: string }> };

export async function GET(_request: Request, context: Context): Promise<NextResponse> {
  const { workspaceId, scenarioId } = await context.params; const db = openDatabase(); try { const scenario = getScenario(db, workspaceId, scenarioId); return scenario ? NextResponse.json({ scenario }) : NextResponse.json({ error: 'Scenario not found' }, { status: 404 }); } finally { db.close(); }
}

export async function PATCH(request: Request, context: Context): Promise<NextResponse> {
  const { workspaceId, scenarioId } = await context.params; const validation = validateScenarioInput(await request.json());
  if (!validation.ok) return NextResponse.json({ error: validation.errors }, { status: 400 });
  const db = openDatabase(); try { const scenario = updateScenario(db, workspaceId, scenarioId, validation.value); return scenario ? NextResponse.json({ scenario }) : NextResponse.json({ error: 'Scenario not found' }, { status: 404 }); } finally { db.close(); }
}

export async function DELETE(_request: Request, context: Context): Promise<NextResponse> {
  const { workspaceId, scenarioId } = await context.params; const db = openDatabase(); try { return deleteScenario(db, workspaceId, scenarioId) ? new NextResponse(null, { status: 204 }) : NextResponse.json({ error: 'Scenario not found' }, { status: 404 }); } finally { db.close(); }
}
