import { NextResponse } from "next/server";
import { initializeDatabase } from "@/db/bootstrap";
import { isAuthorizedAdminRequest } from "@/db/runtime";

/**
 * POST /api/init-db — Пересев базы (страны + БП + пакеты знаний).
 *
 * Идемпотентен: та же логика, что и серверный bootstrap при старте
 * (см. src/instrumentation.ts), — на хостингах с эфемерным диском база
 * восстанавливается автоматически, этот маршрут оставлен для ручного
 * принудительного пересева.
 *
 * Authenticated: requires `x-admin-token` equal to the server-side
 * `RBP_ADMIN_TOKEN`. The token is read only on the server; a missing or
 * mismatched token returns 401 BEFORE any database handle is opened.
 */
export async function POST(request: Request): Promise<NextResponse> {
  if (!isAuthorizedAdminRequest(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = initializeDatabase();
    return NextResponse.json({
      ok: true,
      countriesSeeded: result.countriesSeeded,
      bpCalculated: result.bpCalculated,
      knowledge: result.knowledge,
      knowledgeExtra: result.knowledgeExtra,
      top10: result.top10,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
