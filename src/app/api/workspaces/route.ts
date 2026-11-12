import { NextResponse } from 'next/server';
import { openDatabase } from '@/db/runtime';
import { countryExists, createWorkspace, listWorkspaces } from '@/db/workspace-repository';
import { validateWorkspaceInput } from '@/lib/workspace/validation';

export function GET(): NextResponse {
  const db = openDatabase();
  try { return NextResponse.json({ workspaces: listWorkspaces(db) }); }
  finally { db.close(); }
}

export async function POST(request: Request): Promise<NextResponse> {
  const validation = validateWorkspaceInput(await request.json());
  if (!validation.ok) return NextResponse.json({ error: validation.errors }, { status: 400 });
  const db = openDatabase();
  try {
    const input = validation.value;
    if (input.selectedCountryIso && !countryExists(db, input.selectedCountryIso)) return NextResponse.json({ error: ['selectedCountryIso does not exist'] }, { status: 400 });
    if (input.comparisonIsos?.some((iso) => !countryExists(db, iso))) return NextResponse.json({ error: ['comparisonIsos contains an unknown country'] }, { status: 400 });
    return NextResponse.json({ workspace: createWorkspace(db, input) }, { status: 201 });
  } finally { db.close(); }
}
