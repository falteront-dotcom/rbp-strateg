import { NextResponse } from 'next/server';
import { openDatabase } from '@/db/runtime';
import { deleteScenario, getScenario, listScenarios, scenarioDepth, scenarioWouldCycle, updateScenario } from '@/db/workspace-repository';
import { validateScenarioPatch } from '@/lib/workspace/validation';

type Context = { params: Promise<{ workspaceId: string; scenarioId: string }> };

export async function GET(_request: Request, context: Context): Promise<NextResponse> {
  const { workspaceId, scenarioId } = await context.params; const db = openDatabase(); try { const scenario = getScenario(db, workspaceId, scenarioId); return scenario ? NextResponse.json({ scenario }) : NextResponse.json({ error: 'Scenario not found' }, { status: 404 }); } finally { db.close(); }
}

export async function PATCH(request: Request, context: Context): Promise<NextResponse> {
  const { workspaceId, scenarioId } = await context.params; const validation = validateScenarioPatch(await request.json());
  if (!validation.ok) return NextResponse.json({ error: validation.errors }, { status: 400 });
  const db = openDatabase(); try {
    const existing = getScenario(db, workspaceId, scenarioId);
    if (!existing) return NextResponse.json({ error: 'Scenario not found' }, { status: 404 });
    const scenarios = listScenarios(db, workspaceId).filter((scenario) => scenario.id !== scenarioId);
    const parentId = validation.value.parentScenarioId === undefined ? existing.parentScenarioId : validation.value.parentScenarioId;
    if (scenarioWouldCycle([...scenarios, existing], scenarioId, parentId)) return NextResponse.json({ error: 'Scenario parent would create a cycle' }, { status: 409 });
    if (parentId !== null && !scenarios.some((scenario) => scenario.id === parentId)) return NextResponse.json({ error: 'Parent scenario not found' }, { status: 409 });
    if (scenarioDepth(scenarios, parentId) + 1 > 3) return NextResponse.json({ error: 'Scenario tree depth cannot exceed 3' }, { status: 409 });
    const scenario = updateScenario(db, workspaceId, scenarioId, validation.value);
    return scenario ? NextResponse.json({ scenario }) : NextResponse.json({ error: 'Scenario not found' }, { status: 404 });
  } finally { db.close(); }
}

export async function DELETE(_request: Request, context: Context): Promise<NextResponse> {
  const { workspaceId, scenarioId } = await context.params; const db = openDatabase(); try { return deleteScenario(db, workspaceId, scenarioId) ? new NextResponse(null, { status: 204 }) : NextResponse.json({ error: 'Scenario not found' }, { status: 404 }); } finally { db.close(); }
}
