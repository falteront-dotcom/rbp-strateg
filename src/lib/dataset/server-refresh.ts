import { getDatasetHealth } from '@/db/dataset-repository';
import { openReadonlyDatabase } from '@/db/runtime';
import { getRefreshIntervalMs, refreshDatasetFromSources, refreshDatasetIfDue } from './updater';
import { isCiEnvironment } from '@/lib/env';

let refreshTimer: ReturnType<typeof setInterval> | undefined;
let startupRefresh: Promise<void> | null = null;

async function refreshIfDue(): Promise<void> {
  const db = openReadonlyDatabase();
  let lastCheck: string | null = null;
  try {
    lastCheck = getDatasetHealth(db).lastCheck;
  } finally {
    db.close();
  }

  const outcome = await refreshDatasetIfDue({ lastCheck, operation: refreshDatasetFromSources });
  if (!outcome.ok) console.warn('[dataset/updater] refresh failed; retaining previous published version:', outcome.error);
}

export function ensureDatasetRefreshScheduler(): void {
  // В CI датасет обязан остаться сидовым: живой pipeline даёт другое число
  // стран и ломает контракты. См. isCiEnvironment — GitHub ставит CI=true.
  if (isCiEnvironment() || process.env.NODE_ENV === 'test' || process.env.RBP_AUTO_REFRESH === 'false') return;
  if (refreshTimer || startupRefresh) return;

  const runSafely = (): Promise<void> => refreshIfDue().catch((error: unknown) => {
    console.warn('[dataset/updater] scheduler error; retaining previous published version:', error);
  });
  startupRefresh = runSafely().finally(() => {
    startupRefresh = null;
  });
  refreshTimer = setInterval(() => {
    void runSafely();
  }, getRefreshIntervalMs());
}
