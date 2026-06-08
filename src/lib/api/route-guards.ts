// ─────────────────────────────────────────────────────────────────────────────
// API Route Guards
// Protect destructive maintenance endpoints while keeping local development easy.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";

export function assertMaintenanceAccess(request: NextRequest, routeName: string): NextResponse | null {
  if (process.env.NODE_ENV !== "production") return null;

  const expectedToken = process.env.RBP_ADMIN_TOKEN;
  if (!expectedToken) {
    return NextResponse.json(
      {
        ok: false,
        error: `${routeName} is disabled in production: RBP_ADMIN_TOKEN is not configured`,
      },
      { status: 403 },
    );
  }

  const providedToken = request.headers.get("x-rbp-admin-token") ?? new URL(request.url).searchParams.get("token");
  if (providedToken !== expectedToken) {
    return NextResponse.json(
      {
        ok: false,
        error: `${routeName} requires x-rbp-admin-token in production`,
      },
      { status: 403 },
    );
  }

  return null;
}
