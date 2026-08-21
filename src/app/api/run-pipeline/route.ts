import { NextResponse } from "next/server";
import { isAuthorizedAdminRequest } from "@/db/runtime";

/**
 * Authenticated pipeline entrypoint. Candidate construction and publication
 * live in the updater so all callers share the same atomic transaction.
 */
export async function POST(request: Request): Promise<NextResponse> {
  if (!isAuthorizedAdminRequest(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    if (process.env.CI === "1" && process.env.RBP_PIPELINE_TEST_HOOK === "1" && body.testFailure === "before-publish") {
      throw new Error("Injected pipeline failure before publish");
    }
    const { refreshDatasetFromSources } = await import("@/lib/dataset/updater");
    const result = await refreshDatasetFromSources();
    const { dataset } = result;
    const sourceSummary = dataset.sourceSummary;
    const pipeline = sourceSummary.pipeline;
    const conflicts = typeof sourceSummary.conflicts === "number" ? sourceSummary.conflicts : 0;
    const conflictDetails = Array.isArray(sourceSummary.conflictDetails) ? sourceSummary.conflictDetails.slice(0, 10) : [];

    return NextResponse.json({
      ok: true,
      pipeline,
      countriesWritten: result.countriesWritten,
      bpCalculated: result.countriesWritten,
      conflicts,
      conflictDetails,
      datasetVersion: dataset.version,
      top10: result.top10,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[run-pipeline] Failed:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
