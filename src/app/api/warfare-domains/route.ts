// ─────────────────────────────────────────────────────────────────────────────
// API /api/warfare-domains — Warfare Domain Reference
// GET ?domain=land — returns domain profiles
// РБП-Стратег 2.0
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { getDomainProfile, getAllDomains, getCountryDomainStrength, type WarfareDomain } from "@/lib/warfare-domains";

const WARFARE_DOMAINS = ["land", "sea", "air", "space", "cyber", "electronic", "information", "nuclear"] as const;

function isWarfareDomain(value: string): value is WarfareDomain {
  return WARFARE_DOMAINS.includes(value as WarfareDomain);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get("domain") ?? undefined;
    const iso = searchParams.get("iso") ?? undefined;

    if (iso) {
      const strengths = getCountryDomainStrength(iso);
      return NextResponse.json({
        isoCode: iso,
        domains: strengths.map((s) => ({
          domain: s.domain,
          level: s.level,
        })),
      });
    }

    if (domain) {
      if (!isWarfareDomain(domain)) {
        return NextResponse.json({ error: "Invalid warfare domain", validDomains: WARFARE_DOMAINS }, { status: 400 });
      }
      const profile = getDomainProfile(domain);
      if (!profile) {
        return NextResponse.json({ error: "Domain not found" }, { status: 404 });
      }
      return NextResponse.json(profile);
    }

    const all = getAllDomains();
    return NextResponse.json({
      count: all.length,
      domains: all.map((d) => ({
        domain: d.domain,
        nameRu: d.nameRu,
        importanceWeight: d.importanceWeight,
        technologyDependency: d.technologyDependency,
        costIndex: d.costIndex,
        leadingCountries: d.leadingCountries,
        bpComponentLink: d.bpComponentLink,
        recentDevelopments: d.recentDevelopments,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
