import { NextResponse } from 'next/server';
import { openDatabase } from '@/db/runtime';
import { createWorkspace, listWorkspaces } from '@/db/workspace-repository';
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
  try { return NextResponse.json({ workspace: createWorkspace(db, validation.value) }, { status: 201 }); }
  finally { db.close(); }
}
