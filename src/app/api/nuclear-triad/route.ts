// ─────────────────────────────────────────────────────────────────────────────
// API /api/nuclear-triad — Nuclear Triad Assessment
// GET ?iso=USA — returns nuclear triad data for a country
// РБП-Стратег 2.0
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import {
  getTriadAssessment,
  getActiveTriadLegs,
  getAllNuclearStates,
  getTriadCompleteness,
  getDeployedDeliverySystems,
} from "@/lib/nuclear-triad";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const iso = searchParams.get("iso") ?? undefined;
    const completeness = searchParams.get("completeness") === "true";

    if (iso && completeness) {
      return NextResponse.json({
        isoCode: iso,
        completeness: getTriadCompleteness(iso),
        activeLegs: getActiveTriadLegs(iso),
      });
    }

    if (iso) {
      const assessment = getTriadAssessment(iso);
      if (!assessment) {
        return NextResponse.json({
          isoCode: iso,
          status: "none",
          message: "Not a nuclear state or no data available",
        });
      }
      return NextResponse.json({
        isoCode: assessment.isoCode,
        countryNameRu: assessment.countryNameRu,
        status: assessment.status,
        totalWarheads: assessment.totalWarheads,
        triadLegs: assessment.triadLegs,
        deliverySystems: assessment.deliverySystems,
        doctrines: assessment.doctrines,
        firstTest: assessment.firstTest,
        nptStatus: assessment.nptStatus,
        completeness: getTriadCompleteness(iso),
        deployedSystems: getDeployedDeliverySystems(iso).length,
      });
    }

    const all = getAllNuclearStates();
    return NextResponse.json({
      count: all.length,
      nuclearStates: all.map((t) => ({
        isoCode: t.isoCode,
        countryNameRu: t.countryNameRu,
        status: t.status,
        totalWarheads: t.totalWarheads,
        completeness: getTriadCompleteness(t.isoCode),
        activeLegs: getActiveTriadLegs(t.isoCode),
        nptStatus: t.nptStatus,
      })),
      totalGlobalWarheads: all.reduce((sum, t) => sum + t.totalWarheads, 0),
      completeTriad: all.filter((t) => t.status === "complete").map((t) => t.isoCode),
      partialTriad: all.filter((t) => t.status === "partial").map((t) => t.isoCode),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
