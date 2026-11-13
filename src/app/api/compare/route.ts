// ─────────────────────────────────────────────────────────────────────────────
// /api/compare — сравнение 2–4 стран
//
// Контракт ответа — ComparisonResult из src/lib/comparison.ts. Раньше маршрут
// собирал свой ответ (deltas/summary), а окно сравнения читало componentDeltas,
// metricDeltas и overallLeader: кнопка «Сравнить» роняла всё приложение
// ошибкой «Cannot read properties of undefined (reading 'side')».
// Теперь дельты считает одна функция — compareCountriesList, и разойтись
// ответ с интерфейсом не может.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { openReadonlyDatabase } from "@/db/runtime";
import { mapCountryRows, type RawCountryRow } from "@/db/country-mapper";
import {
  compareCountriesList,
  type CountryCompareData,
} from "@/lib/comparison";

/**
 * GET /api/compare?iso=USA&iso=RUS&iso=CHN
 *
 * Принимает 2–4 кода ISO 3166-1 alpha-3 повторяющимся параметром `iso`.
 * Возвращает ComparisonResult: страны, попарные дельты компонентов,
 * дельты ключевых метрик, лидера по суммарному БП и значения БП.
 */
export async function GET(request: Request): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const isoCodes = searchParams.getAll("iso");

    if (isoCodes.length < 2) {
      return NextResponse.json(
        { error: "Provide at least 2 ISO codes via ?iso=A&iso=B" },
        { status: 400 },
      );
    }

    if (isoCodes.length > 4) {
      return NextResponse.json(
        { error: "Maximum 4 countries can be compared at once" },
        { status: 400 },
      );
    }

    const sqlite = openReadonlyDatabase();
    let allCountries: CountryCompareData[];
    try {
      const rows = sqlite.prepare("SELECT * FROM countries").all() as RawCountryRow[];
      allCountries = mapCountryRows(rows) as CountryCompareData[];
    } finally {
      sqlite.close();
    }

    // Порядок запроса сохраняется, поиск по Map — O(1) на код.
    const byIso = new Map(allCountries.map((c) => [c.isoCode, c] as const));
    const requestedCountries: CountryCompareData[] = [];
    for (const iso of isoCodes) {
      const found = byIso.get(iso.toUpperCase());
      if (found) requestedCountries.push(found);
    }

    if (requestedCountries.length < 2) {
      return NextResponse.json(
        { error: "At least 2 valid ISO codes must resolve to countries in the database" },
        { status: 400 },
      );
    }

    return NextResponse.json(compareCountriesList(requestedCountries));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
