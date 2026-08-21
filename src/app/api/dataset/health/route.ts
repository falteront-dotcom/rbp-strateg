import { NextResponse } from 'next/server';
import { openReadonlyDatabase } from '@/db/runtime';
import { getDatasetHealth } from '@/db/dataset-repository';

export async function GET(): Promise<NextResponse> {
  const db = openReadonlyDatabase();
  try {
    const health = getDatasetHealth(db);
    return NextResponse.json(health);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ status: 'FAILED', error: message }, { status: 500 });
  } finally {
    db.close();
  }
}
