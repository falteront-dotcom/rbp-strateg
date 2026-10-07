# -*- coding: utf-8 -*-
"""
Build the strategic facilities layer (military bases & strategic objects).

Reads research agent output fac-*.json from test-results/research/ (wave 1),
fac2-*.json from test-results/research/wave2/ (wave 2) and ind-*.json plus
fac3-gaps.json from test-results/research/wave3/ (wave 3) and fac4-*.json
from test-results/research/wave4/ (wave 4), validates every
record, deduplicates by (name, hostIso) proximity, and emits
src/lib/facilities/strategic-facilities.generated.ts.

Run:  python scripts/build-facilities.py
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RESEARCH = ROOT / "test-results" / "research"
OUT = ROOT / "src/lib/facilities" / "strategic-facilities.generated.ts"

VALID_TYPES = {
    "air_base", "naval_base", "army_base", "missile_site", "radar_site",
    "space_facility", "nuclear_facility", "intel_site", "logistics_hub", "chokepoint",
    "defense_industry",
}

# Country ISO3 codes present in the merged world dataset (used to validate hosts)
def load_known_isos() -> set[str]:
    text = (ROOT / "src/lib/geo/country-names-ru.ts").read_text(encoding="utf-8")
    return set(re.findall(r'\b([A-Z]{3}):\s*"', text))


def ts_str(value: str) -> str:
    return '"' + value.replace("\\", "\\\\").replace('"', '\\"') + '"'


def slugify(text: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return slug or "facility"


def main() -> int:
    print("== build-facilities ==")
    known = load_known_isos()
    facilities: list[dict] = []
    seen_ids: set[str] = set()
    seen_keys: set[tuple[str, str]] = set()
    problems: list[str] = []

    wave2 = RESEARCH / "wave2"
    wave3 = RESEARCH / "wave3"
    paths = sorted(RESEARCH.glob("fac-*.json"))
    if wave2.exists():
        paths += sorted(wave2.glob("fac2-*.json"))
    if wave3.exists():
        paths += sorted(wave3.glob("ind-*.json")) + sorted(wave3.glob("fac3-*.json"))
    wave4 = RESEARCH / "wave4"
    if wave4.exists():
        paths += sorted(wave4.glob("fac4-*.json"))
    wave5 = RESEARCH / "wave5"
    if wave5.exists():
        paths += sorted(wave5.glob("fac5-*.json"))
    for path in paths:
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
            rows = payload["facilities"] if isinstance(payload, dict) else payload
        except Exception as exc:  # noqa: BLE001
            problems.append(f"{path.name}: unreadable ({exc})")
            continue
        for raw in rows:
            try:
                name = str(raw["name"]).strip()
                ftype = str(raw["type"]).strip()
                if ftype not in VALID_TYPES:
                    problems.append(f"{path.name}/{name}: bad type {ftype!r}")
                    continue
                lat = float(raw["lat"])
                lng = float(raw["lng"])
                if not (-90 <= lat <= 90 and -180 <= lng <= 180):
                    problems.append(f"{path.name}/{name}: bad coords {lat},{lng}")
                    continue
                # Territorial dependencies map to their sovereign / INTL
                TERRITORY_HOST = {"SHN": "GBR", "GIB": "GBR", "GRL": "DNK", "NCL": "FRA", "PYF": "FRA"}
                host = str(raw.get("hostIso") or "INTL").strip().upper()
                if host == "PHI":
                    host = "PHL"
                host = TERRITORY_HOST.get(host, host)
                operator = str(raw.get("operator") or host).strip().upper()
                if operator == "PHI":
                    operator = "PHL"
                base_id = slugify(str(raw.get("id") or name))
                fid = base_id
                n = 2
                while fid in seen_ids:
                    fid = f"{base_id}-{n}"
                    n += 1
                key = (name.lower(), host)
                if key in seen_keys:
                    continue
                seen_ids.add(fid)
                seen_keys.add(key)
                facilities.append({
                    "id": fid,
                    "name": name,
                    "nameRu": str(raw.get("nameRu") or name).strip(),
                    "type": ftype,
                    "operator": operator,
                    "hostIso": host,
                    "hostName": str(raw.get("hostName") or host).strip(),
                    "lat": round(lat, 4),
                    "lng": round(lng, 4),
                    "strategicValue": max(1, min(10, int(raw.get("strategicValue") or 5))),
                    "note": str(raw.get("note") or "").strip(),
                    "noteRu": str(raw.get("noteRu") or "").strip(),
                    "source": str(raw.get("source") or "public").strip(),
                })
                if host not in known and host != "INTL":
                    problems.append(f"{path.name}/{name}: unknown host {host}")
            except (KeyError, TypeError, ValueError) as exc:
                problems.append(f"{path.name}: bad record {raw!r} ({exc})")

    facilities.sort(key=lambda f: (-f["strategicValue"], f["name"]))

    lines = [
        "/** GENERATED by scripts/build-facilities.py — do not edit by hand. */",
        'import type { StrategicFacility } from "./types";',
        "",
        "export const STRATEGIC_FACILITIES: StrategicFacility[] = [",
    ]
    for f in facilities:
        lines.append("  {")
        for key in ("id", "name", "nameRu", "type", "operator", "hostIso", "hostName"):
            lines.append(f"    {key}: {ts_str(str(f[key]))},")
        lines.append(f"    lat: {f['lat']},")
        lines.append(f"    lng: {f['lng']},")
        lines.append(f"    strategicValue: {f['strategicValue']},")
        lines.append(f"    note: {ts_str(f['note'])},")
        lines.append(f"    noteRu: {ts_str(f['noteRu'])},")
        lines.append(f"    source: {ts_str(f['source'])},")
        lines.append("  },")
    lines.append("];")
    lines.append("")
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text("\n".join(lines), encoding="utf-8")

    by_type: dict[str, int] = {}
    for f in facilities:
        by_type[f["type"]] = by_type.get(f["type"], 0) + 1
    print(f"facilities={len(facilities)}")
    for t, c in sorted(by_type.items()):
        print(f"  {t}: {c}")
    if problems:
        print(f"problems ({len(problems)}):")
        for p in problems[:20]:
            print("  " + p)
    return 0


if __name__ == "__main__":
    sys.exit(main())
