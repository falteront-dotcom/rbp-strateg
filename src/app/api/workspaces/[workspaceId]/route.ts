import { NextResponse } from 'next/server';
import { openDatabase } from '@/db/runtime';
import { countryExists, deleteWorkspace, getWorkspace, listScenarios, updateWorkspace } from '@/db/workspace-repository';
import { validateWorkspaceInput } from '@/lib/workspace/validation';

type Context = { params: Promise<{ workspaceId: string }> };

export async function GET(_request: Request, context: Context): Promise<NextResponse> {
  const { workspaceId } = await context.params; const db = openDatabase();
  try { const workspace = getWorkspace(db, workspaceId); if (!workspace) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 }); return NextResponse.json({ workspace, scenarios: listScenarios(db, workspaceId) }); }
  finally { db.close(); }
}

export async function PATCH(request: Request, context: Context): Promise<NextResponse> {
  const { workspaceId } = await context.params; const validation = validateWorkspaceInput(await request.json(), true);
  if (!validation.ok) return NextResponse.json({ error: validation.errors }, { status: 400 });
  const db = openDatabase(); try {
    const input = validation.value;
    if (input.selectedCountryIso && !countryExists(db, input.selectedCountryIso)) return NextResponse.json({ error: ['selectedCountryIso does not exist'] }, { status: 400 });
    if (input.comparisonIsos?.some((iso) => !countryExists(db, iso))) return NextResponse.json({ error: ['comparisonIsos contains an unknown country'] }, { status: 400 });
    const workspace = updateWorkspace(db, workspaceId, input);
    return workspace ? NextResponse.json({ workspace }) : NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
  } finally { db.close(); }
}

export async function DELETE(_request: Request, context: Context): Promise<NextResponse> {
  const { workspaceId } = await context.params; const db = openDatabase(); try { return deleteWorkspace(db, workspaceId) ? new NextResponse(null, { status: 204 }) : NextResponse.json({ error: 'Workspace not found' }, { status: 404 }); } finally { db.close(); }
}
