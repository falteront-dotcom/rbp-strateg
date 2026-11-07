// ─────────────────────────────────────────────────────────────────────────────
// API /api/v3/systems — база систем вооружений data4 (220 систем)
// GET ?q=&class= → список; GET ?duel=ID_A,ID_B → дуэльный счёт duelScore
// РБП-Стратег 3.0
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { getSystemsList } from "@/lib/v3-facade";
import { duelScore } from "@/lib/data4/systems-analysis";

/** GET /api/v3/systems — список с фильтрами или дуэль двух систем. */
export async function GET(request: Request): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);

    const duel = searchParams.get("duel");
    if (duel) {
      const parts = duel.split(",").map((part) => part.trim());
      if (parts.length !== 2 || !parts[0] || !parts[1]) {
        return NextResponse.json(
          { error: "duel must be two system ids separated by a comma" },
          { status: 400 },
        );
      }
      const result = duelScore(parts[0], parts[1]);
      if (!result) {
        return NextResponse.json(
          { error: "System not found" },
          { status: 404 },
        );
      }
      return NextResponse.json(result);
    }

    const q = searchParams.get("q") ?? undefined;
    const cls = searchParams.get("class") ?? undefined;
    return NextResponse.json(getSystemsList(q, cls));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
