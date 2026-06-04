// ─────────────────────────────────────────────────────────────────────────────
// API /api/formulas — Strategic Formulas Reference
// GET — returns all BP model formulas with explanations
// РБП-Стратег 2.0
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { getAllFormulas, getFormulasByComponent } from "@/lib/bp/formulas";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const component = searchParams.get("component") ?? undefined;

    const formulas = component
      ? getFormulasByComponent(component)
      : getAllFormulas();

    return NextResponse.json({
      count: formulas.length,
      formulas: formulas.map((f) => ({
        id: f.id,
        name: f.name,
        nameRu: f.nameRu,
        formula: f.formula,
        formulaDisplay: f.formulaDisplay,
        variables: f.variables,
        source: f.source,
        description: f.description,
        bpComponent: f.bpComponent,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
