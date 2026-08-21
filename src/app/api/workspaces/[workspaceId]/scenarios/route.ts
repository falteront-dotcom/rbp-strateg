import { NextResponse } from 'next/server';
import { openDatabase } from '@/db/runtime';
import { createScenario, getWorkspace, listScenarios } from '@/db/workspace-repository';
import { validateScenarioInput } from '@/lib/workspace/validation';

type Context = { params: Promise<{ workspaceId: string }> };

export async function GET(_request: Request, context: Context): Promise<NextResponse> {
  const { workspaceId } = await context.params; const db = openDatabase();
  try { if (!getWorkspace(db, workspaceId)) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 }); return NextResponse.json({ scenarios: listScenarios(db, workspaceId) }); }
  finally { db.close(); }
}

export async function POST(request: Request, context: Context): Promise<NextResponse> {
  const { workspaceId } = await context.params; const validation = validateScenarioInput(await request.json());
  if (!validation.ok) return NextResponse.json({ error: validation.errors }, { status: 400 });
  const db = openDatabase();
  try {
    if (!getWorkspace(db, workspaceId)) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    if (validation.value.parentScenarioId && !listScenarios(db, workspaceId).some((scenario) => scenario.id === validation.value.parentScenarioId)) return NextResponse.json({ error: 'Parent scenario not found' }, { status: 400 });
    return NextResponse.json({ scenario: createScenario(db, workspaceId, validation.value) }, { status: 201 });
  } finally { db.close(); }
}
