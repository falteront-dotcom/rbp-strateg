import { NextResponse } from 'next/server';
import { openReadonlyDatabase } from '@/db/runtime';
import { getDatasetHealth } from '@/db/dataset-repository';
import { refreshDatasetFromSources, refreshDatasetIfDue } from '@/lib/dataset/updater';

export async function GET(): Promise<NextResponse> {
  const db = openReadonlyDatabase();
  try {
    const health = getDatasetHealth(db);
    if (process.env.RBP_AUTO_REFRESH === 'true') {
      void refreshDatasetIfDue({ lastCheck: health.lastCheck, operation: refreshDatasetFromSources }).then((outcome) => {
        if (!outcome.ok) console.warn('[dataset/health] background refresh retained previous dataset:', outcome.error);
      });
    }
    return NextResponse.json(health);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ status: 'FAILED', error: message }, { status: 500 });
  } finally {
    db.close();
  }
}
