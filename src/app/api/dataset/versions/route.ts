import { NextResponse } from 'next/server';
import { openReadonlyDatabase } from '@/db/runtime';
import { listDatasetVersions } from '@/db/dataset-repository';

export async function GET(): Promise<NextResponse> {
  const db = openReadonlyDatabase();
  try {
    return NextResponse.json({ versions: listDatasetVersions(db) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    db.close();
  }
}
