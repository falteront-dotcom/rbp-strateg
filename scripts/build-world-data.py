# -*- coding: utf-8 -*-
"""
Build the "all world states" data layer for RBP-Strateg.

Authoritative sources (cached under test-results/research/):
  - mledoze/countries (REST Countries dataset): cca2/cca3, capital, latlng,
    region/subregion, area, landlocked
  - World Bank API: population, GDP PPP, military expenditure (SIPRI), land area
  - Agent research files countries-grp*.json: military inventories (GFP/IISS style)

Outputs:
  - src/db/seed/world-countries.ts          (NewCountry[] for the missing states)
  - src/lib/geo/world-registry.generated.ts (iso2 map, centroids, RU regions, alliances)
  - test-results/research/world-countries.merged.json (audit trail)

Run:  python scripts/build-world-data.py
"""

from __future__ import annotations

import json
import math
import re
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RESEARCH = ROOT / "test-results" / "research"
RESEARCH.mkdir(parents=True, exist_ok=True)

MLEDOZE_URL = "https://raw.githubusercontent.com/mledoze/countries/master/countries.json"
WB_BASE = "https://api.worldbank.org/v2/country/all/indicator/{ind}?format=json&per_page=500&date={years}&page={page}"
WB_INDICATORS = {
    "population": ("SP.POP.TOTL", "2022:2024"),
    "gdp_ppp": ("NY.GDP.MKTP.PP.CD", "2021:2024"),
    "mil_usd": ("MS.MIL.XPND.CD", "2021:2024"),
    "mil_pct": ("MS.MIL.XPND.GD.ZS", "2021:2024"),
}

UA = {"User-Agent": "rbp-data/1.0"}


def fetch_json(url: str, cache: Path, retries: int = 3) -> object:
    if cache.exists():
        return json.loads(cache.read_text(encoding="utf-8"))
    last: Exception | None = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=60) as resp:
                data = json.load(resp)
            cache.write_text(json.dumps(data), encoding="utf-8")
            print(f"  fetched {cache.name}")
            return data
        except Exception as exc:  # noqa: BLE001
            last = exc
            time.sleep(1 + attempt)
    raise RuntimeError(f"failed to fetch {url}: {last}")


def load_ru_names() -> dict[str, str]:
    text = (ROOT / "src/lib/geo/country-names-ru.ts").read_text(encoding="utf-8")
    block = text.split("COUNTRY_NAMES_RU", 1)[1].split("};", 1)[0]
    return dict(re.findall(r'\b([A-Z]{3}):\s*"([^"]+)"', block))


def load_existing_isos() -> set[str]:
    """ISOs covered by the hand-written seed files (not the generated one)."""
    isos: set[str] = set()
    for name in ("top20-countries.ts", "extended-countries.ts", "additional-countries.ts"):
        seed = ROOT / "src/db/seed" / name
        if seed.exists():
            isos.update(re.findall(r'isoCode:\s*"([A-Z]+)"', seed.read_text(encoding="utf-8")))
    return isos


def latest_per_country(rows: list[dict]) -> dict[str, float]:
    out: dict[str, float] = {}
    for row in rows:
        iso = row.get("countryiso3code") or ""
        val = row.get("value")
        if len(iso) == 3 and val is not None and iso not in out:
            out[iso] = float(val)
    return out


# --- static political mappings -------------------------------------------------

NATO = {
    "ALB", "BEL", "BGR", "CAN", "HRV", "CZE", "DNK", "EST", "FIN", "FRA",
    "DEU", "GRC", "HUN", "ISL", "ITA", "LVA", "LTU", "LUX", "MNE", "NLD",
    "MKD", "NOR", "POL", "PRT", "ROU", "SVK", "SVN", "ESP", "SWE", "TUR",
    "GBR", "USA",
}
CSTO = {"RUS", "BLR", "KAZ", "KGZ", "TJK", "ARM"}
BRICS = {"BRA", "RUS", "IND", "CHN", "ZAF", "EGY", "ETH", "IRN", "ARE"}
AUKUS = {"AUS", "GBR", "USA"}

REGION_RU = {
    ("Europe", ""): "Европа",
    ("Americas", "North America"): "Северная Америка",
    ("Americas", "South America"): "Южная Америка",
    ("Americas", "Central America"): "Центральная Америка",
    ("Americas", "Caribbean"): "Карибы",
    ("Asia", "Central Asia"): "Центральная Азия",
    ("Asia", "Eastern Asia"): "Восточная Азия",
    ("Asia", "South-Eastern Asia"): "Юго-Восточная Азия",
    ("Asia", "Southern Asia"): "Южная Азия",
    ("Asia", "Western Asia"): "Ближний Восток",
    ("Africa", "Northern Africa"): "Северная Африка",
    ("Africa", "Western Africa"): "Западная Африка",
    ("Africa", "Middle Africa"): "Центральная Африка",
    ("Africa", "Eastern Africa"): "Восточная Африка",
    ("Africa", "Southern Africa"): "Южная Африка",
    ("Oceania", ""): "Океания",
}

ARID = {
    "DZA", "EGY", "LBY", "TUN", "MAR", "MRT", "MLI", "NER", "TCD", "SDN",
    "SSD", "ERI", "DJI", "SOM", "SAU", "YEM", "OMN", "ARE", "QAT", "BHR",
    "KWT", "IRQ", "JOR", "ISR", "PSE", "IRN", "AFG", "TKM", "UZB", "KAZ",
    "MNG", "NAM", "BWA", "PER", "CHL", "AUS", "MEX",
}


def climate_for(iso: str, lat: float) -> str:
    if iso in ARID:
        return "Arid/Semi-arid"
    a = abs(lat)
    if a < 15:
        return "Tropical"
    if a < 30:
        return "Subtropical"
    if a < 50:
        return "Temperate"
    if a < 62:
        return "Continental"
    return "Subarctic"


def region_ru(region: str, subregion: str) -> str:
    return REGION_RU.get((region, subregion)) or REGION_RU.get((region, ""), "Другие")


def ts_str(value: str) -> str:
    return '"' + value.replace("\\", "\\\\").replace('"', '\\"') + '"'


def main() -> int:
    print("== build-world-data ==")

    ru_names = load_ru_names()
    existing = load_existing_isos()
    # PHI (legacy seed key) already covers the Philippines: do not emit a
    # second country under the canonical PHL code.
    alias_covered = {"PHI", "PHL"} if "PHI" in existing else {"PHI"}
    missing = sorted(set(ru_names) - existing - alias_covered)
    print(f"existing={len(existing)} missing={len(missing)}")

    mledoze = fetch_json(MLEDOZE_URL, RESEARCH / "mledoze-countries.json")
    by_iso3: dict[str, dict] = {}
    for c in mledoze:  # type: ignore[union-attr]
        iso3 = c.get("cca3")
        if iso3 == "UNK":
            iso3 = "XKX"  # Kosovo code used by Natural Earth / this project
        if iso3:
            by_iso3[iso3] = c

    wb: dict[str, dict[str, float]] = {}
    for key, (ind, years) in WB_INDICATORS.items():
        cache = RESEARCH / f"wb-{ind}.json"
        if cache.exists():
            wb[key] = {k: float(v) for k, v in json.loads(cache.read_text(encoding="utf-8")).items()}
            continue
        merged_rows: dict[str, float] = {}
        page = 1
        pages = 1
        while page <= pages:
            url = WB_BASE.format(ind=ind, years=years, page=page)
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=60) as resp:
                payload = json.load(resp)
            if not isinstance(payload, list) or len(payload) < 2 or payload[1] is None:
                break
            pages = int(payload[0].get("pages") or 1)
            merged_rows.update(latest_per_country(payload[1]))
            page += 1
        cache.write_text(json.dumps(merged_rows), encoding="utf-8")
        print(f"  fetched wb-{ind} pages={pages} countries={len(merged_rows)}")
        wb[key] = merged_rows

    # Agent research (optional; script is re-runnable as agents land)
    agent_rows: dict[str, dict] = {}
    for path in sorted(RESEARCH.glob("countries-grp*.json")):
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
            rows = payload["countries"] if isinstance(payload, dict) else payload
            for row in rows:
                iso = (row.get("isoCode") or "").upper()
                if iso:
                    agent_rows[iso] = row
        except Exception as exc:  # noqa: BLE001
            print(f"  WARN bad agent file {path.name}: {exc}")
    print(f"agent countries loaded={len(agent_rows)}")

    def agent_val(iso: str, field: str):
        row = agent_rows.get(iso)
        if not row:
            return None
        val = row.get(field)
        return val if isinstance(val, (int, float)) else None

    merged: list[dict] = []
    gaps: list[str] = []
    for iso in missing:
        rc = by_iso3.get(iso)
        if not rc:
            gaps.append(f"{iso}: no restcountries entry")
            continue
        name = rc["name"]["common"]
        latlng = rc.get("latlng") or [0, 0]
        lat, lng = float(latlng[0]), float(latlng[1])
        area = int(round(rc.get("area") or wb.get("population") and 0 or 0))
        landlocked = bool(rc.get("landlocked"))
        capital = (rc.get("capital") or [name])[0]

        pop_m = (wb["population"].get(iso) or 0) / 1e6
        gdp_bn = (wb["gdp_ppp"].get(iso) or 0) / 1e9
        mil_bn = (wb["mil_usd"].get(iso) or 0) / 1e9
        mil_pct = wb["mil_pct"].get(iso) or 0.0

        # Agent values override when WB lacks coverage (TWN, XKX, PRK-like gaps)
        if not gdp_bn and agent_val(iso, "gdpPppBn"):
            gdp_bn = float(agent_val(iso, "gdpPppBn"))
        if not pop_m and agent_val(iso, "populationM"):
            pop_m = float(agent_val(iso, "populationM"))
        if not mil_bn and agent_val(iso, "militaryBudgetBn"):
            mil_bn = float(agent_val(iso, "militaryBudgetBn"))
        if not mil_pct and agent_val(iso, "defensePctGdp"):
            mil_pct = float(agent_val(iso, "defensePctGdp"))
        if not mil_pct and gdp_bn and mil_bn:
            mil_pct = round(mil_bn / gdp_bn * 100, 1)
        if not mil_bn and mil_pct and gdp_bn:
            mil_bn = round(gdp_bn * mil_pct / 100, 3)

        def pick(field: str, default: float) -> float:
            v = agent_val(iso, field)
            return float(v) if v is not None else default

        micro = pop_m and pop_m < 0.3
        active_default = 0 if micro else int(max(500, pop_m * 1e6 * 0.004))
        coast_default = 0 if landlocked else max(20, int(math.sqrt(max(area, 1)) * 1.6))

        row = {
            "isoCode": iso,
            "name": name,
            "nameRu": ru_names[iso],
            "side": "NATO" if iso in NATO else ("RUS" if iso in CSTO else "NEUTRAL"),
            "coalition": "NATO" if iso in NATO else ("CSTO" if iso in CSTO else ("BRICS" if iso in BRICS else None)),
            "areaKm2": area or int(pick("areaKm2", 0)),
            "coastlineKm": int(pick("coastlineKm", coast_default)),
            "climateZone": climate_for(iso, lat),
            "gdpPppBn": round(gdp_bn, 1),
            "militaryBudgetBn": round(mil_bn, 2),
            "defensePctGdp": round(mil_pct, 1),
            "populationM": round(pop_m, 3),
            "activePersonnel": int(pick("activePersonnel", active_default)),
            "reservePersonnel": int(pick("reservePersonnel", 0)),
            "fitForServiceM": round(pick("fitForServiceM", pop_m * 0.35), 2),
            "totalTanks": int(pick("totalTanks", 0)),
            "totalAfv": int(pick("totalAfv", 0)),
            "totalArtillery": int(pick("totalArtillery", 0)),
            "totalMlrs": int(pick("totalMlrs", 0)),
            "totalAircraft": int(pick("totalAircraft", 0)),
            "totalHelicopters": int(pick("totalHelicopters", 0)),
            "totalNavy": int(pick("totalNavy", 0 if landlocked else (1 if micro else 5))),
            "submarines": int(pick("submarines", 0)),
            "aircraftCarriers": int(pick("aircraftCarriers", 0)),
            "nuclearWarheads": int(pick("nuclearWarheads", 0)),
            "ports": int(pick("ports", 0 if landlocked else (1 if micro else 3))),
            "airfields": int(pick("airfields", max(1, int(math.sqrt(max(area, 1)) / 120)))),
            "oilProductionKbd": int(pick("oilProductionKbd", 0)),
            "merchantFleet": int(pick("merchantFleet", 0 if landlocked else 5)),
            "techLevel": int(pick("techLevel", 4)),
            "moraleIndex": int(pick("moraleIndex", 5)),
            "combatExperience": int(pick("combatExperience", 2)),
            "c2Capability": int(pick("c2Capability", 4)),
            "ewCapability": int(pick("ewCapability", 3)),
            "updatedAt": "2025-01-01",
        }
        if iso not in agent_rows:
            gaps.append(f"{iso}: no agent military data -> heuristics used")
        merged.append(row)

    (RESEARCH / "world-countries.merged.json").write_text(
        json.dumps(merged, ensure_ascii=False, indent=1), encoding="utf-8")

    # --- emit seed TS ---------------------------------------------------------
    lines = [
        'import type { NewCountry } from "@/db/schema";',
        "",
        "// GENERATED by scripts/build-world-data.py — do not edit by hand.",
        "// Sources: World Bank (GDP PPP / population / military expenditure),",
        "// mledoze/countries (area, capital, region), agent research (GFP/IISS inventories).",
        "",
        'const UPDATED = "2025-01-01";',
        "",
        "export const worldCountries: NewCountry[] = [",
    ]
    for r in merged:
        lines.append("  {")
        for key, val in r.items():
            if key == "updatedAt":
                lines.append("    updatedAt: UPDATED,")
            elif isinstance(val, str):
                lines.append(f"    {key}: {ts_str(val)},")
            elif val is None:
                lines.append(f"    {key}: null,")
            else:
                lines.append(f"    {key}: {val},")
        lines.append("  },")
    lines.append("];")
    lines.append("")
    (ROOT / "src/db/seed/world-countries.ts").write_text("\n".join(lines), encoding="utf-8")

    # --- emit registry TS ------------------------------------------------------
    iso2 = {iso: by_iso3[iso]["cca2"] for iso in merged_iso(merged) if by_iso3.get(iso, {}).get("cca2")}
    reg = [
        "/** GENERATED by scripts/build-world-data.py — world coverage registry. */",
        "",
        "export const WORLD_ISO3_TO_ISO2: Readonly<Record<string, string>> = {",
    ]
    for iso in sorted(iso2):
        reg.append(f"  {iso}: {ts_str(iso2[iso])},")
    reg.append("};")
    reg.append("")
    reg.append("export const WORLD_CENTROIDS: Readonly<Record<string, { lng: number; lat: number }>> = {")
    for r in merged:
        rc = by_iso3[r["isoCode"]]
        lat, lng = (rc.get("latlng") or [0, 0])[:2]
        cap = (rc.get("capital") or [r["name"]])[0]
        reg.append(f"  {r['isoCode']}: {{ lng: {round(float(lng), 4)}, lat: {round(float(lat), 4)} }},  // {cap}")
    reg.append("};")
    reg.append("")
    reg.append("export const WORLD_REGIONS_RU: Readonly<Record<string, string>> = {")
    for r in merged:
        rc = by_iso3[r["isoCode"]]
        reg.append(f"  {r['isoCode']}: {ts_str(region_ru(rc.get('region', ''), rc.get('subregion', '')))},")
    reg.append("};")
    reg.append("")
    reg.append("export const WORLD_ALLIANCES: Readonly<Record<string, readonly string[]>> = {")
    for r in merged:
        iso = r["isoCode"]
        tags: list[str] = []
        if iso in NATO:
            tags.append("НАТО")
        if iso in CSTO:
            tags.append("ОДКБ")
        if iso in BRICS:
            tags.append("БРИКС")
        if iso in AUKUS:
            tags.append("AUKUS")
        if tags:
            joined = ", ".join(ts_str(t) for t in tags)
            reg.append(f"  {iso}: [{joined}],")
    reg.append("};")
    reg.append("")
    (ROOT / "src/lib/geo/world-registry.generated.ts").write_text("\n".join(reg), encoding="utf-8")

    print(f"merged={len(merged)} countries")
    print(f"wrote src/db/seed/world-countries.ts and src/lib/geo/world-registry.generated.ts")
    if gaps:
        print(f"gaps ({len(gaps)}):")
        for g in gaps[:40]:
            print("  " + g)
    return 0


def merged_iso(rows: list[dict]) -> list[str]:
    return [r["isoCode"] for r in rows]


if __name__ == "__main__":
    sys.exit(main())
