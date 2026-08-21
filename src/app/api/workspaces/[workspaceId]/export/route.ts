import { NextResponse } from 'next/server';
import { openDatabase } from '@/db/runtime';
import { exportWorkspaceCsv, exportWorkspaceJson } from '@/lib/workspace/export';

type Context = { params: Promise<{ workspaceId: string }> };

export async function GET(request: Request, context: Context): Promise<NextResponse> {
  const { workspaceId } = await context.params;
  const format = new URL(request.url).searchParams.get('format') ?? 'json';
  const db = openDatabase();
  try {
    if (format === 'csv') {
      const csv = exportWorkspaceCsv(db, workspaceId);
      return csv === null ? NextResponse.json({ error: 'Workspace not found' }, { status: 404 }) : new NextResponse(csv, { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="workspace-${workspaceId}.csv"` } });
    }
    const json = exportWorkspaceJson(db, workspaceId);
    return json === null ? NextResponse.json({ error: 'Workspace not found' }, { status: 404 }) : NextResponse.json(json);
  } finally { db.close(); }
}
