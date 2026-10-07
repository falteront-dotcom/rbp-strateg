# -*- coding: utf-8 -*-
"""Knowledge-stack audit: validates every /api/knowledge/* endpoint end-to-end.

Checks that the production data pipeline (research JSON → generated TS →
SQLite seed → Drizzle queries → API routes) returns coherent data:
counts match payloads, ISO codes are well-formed, no duplicate ids/names,
numeric fields stay sane, and honest empty-states appear where data is
genuinely absent.

Usage: python scripts/audit-knowledge.py [base_url]
"""
import json
import sys
import urllib.request

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3000"

failures: list[str] = []
checks = 0


def fetch(path: str) -> dict:
    with urllib.request.urlopen(f"{BASE}{path}", timeout=30) as r:
        return json.load(r)


def check(ok: bool, msg: str) -> None:
    global checks
    checks += 1
    if not ok:
        failures.append(msg)
        print(f"  FAIL: {msg}")


def expect_count(data: dict, key: str, label: str) -> list:
    rows = data.get(key)
    if rows is None:
        check(False, f"{label}: нет ключа {key}")
        return []
    check(data.get("count") == len(rows), f"{label}: count={data.get('count')} != len({key})={len(rows)}")
    return rows


def valid_iso(iso) -> bool:
    return isinstance(iso, str) and len(iso) == 3 and iso.isalpha() and iso == iso.upper()


def main() -> None:
    print(f"=== knowledge audit @ {BASE} ===")

    # Оборудование
    d = fetch("/api/knowledge/equipment?summary=1")
    rows = expect_count(d, "summary", "equipment/summary")
    check(len(rows) >= 180, f"equipment/summary: покрыто {len(rows)} стран (<180)")
    usa = fetch("/api/knowledge/equipment?iso=USA")
    check(usa["count"] >= 30, f"equipment USA: {usa['count']} записей (<30)")

    # Конфликты
    d = fetch("/api/knowledge/conflicts")
    rows = expect_count(d, "conflicts", "conflicts")
    check(len(rows) >= 100, f"conflicts: {len(rows)} (<100)")
    ids = [r["id"] for r in rows]
    check(len(ids) == len(set(ids)), "conflicts: дубли id")
    for r in rows[:50]:
        check(r["startYear"] <= r["endYear"], f"conflicts/{r['id']}: start>end")

    # Сражения
    d = fetch("/api/knowledge/battles")
    rows = expect_count(d, "battles", "battles")
    check(len(rows) >= 50, f"battles: {len(rows)} (<50)")

    # Кампании
    d = fetch("/api/knowledge/campaigns")
    rows = expect_count(d, "campaigns", "campaigns")
    check(len(rows) >= 20, f"campaigns: {len(rows)} (<20)")

    # ОПК
    d = fetch("/api/knowledge/industry")
    rows = expect_count(d, "companies", "industry")
    check(len(rows) >= 150, f"industry: {len(rows)} (<150)")
    check(all(valid_iso(r["iso"]) for r in rows), "industry: некорректные iso")

    # Договоры
    d = fetch("/api/knowledge/treaties")
    rows = expect_count(d, "treaties", "treaties")
    check(len(rows) >= 60, f"treaties: {len(rows)} (<60)")
    types = {"defense", "nonprolif", "arms_control", "security", "neutrality"}
    check(all(r["type"] in types for r in rows), "treaties: type вне enum")

    # Поставки
    d = fetch("/api/knowledge/transfers?top=1")
    rows = expect_count(d, "exporters", "transfers/top")
    check(len(rows) >= 5, f"transfers/top: {len(rows)} (<5)")

    # Учения и миротворчество
    d = fetch("/api/knowledge/exercises")
    rows = expect_count(d, "exercises", "exercises")
    check(len(rows) >= 40, f"exercises: {len(rows)} (<40)")
    d = fetch("/api/knowledge/exercises?pk=1")
    rows = expect_count(d, "peacekeeping", "exercises/pk")
    check(len(rows) >= 30, f"peacekeeping: {len(rows)} (<30)")

    # Образцы ВВТ
    d = fetch("/api/knowledge/weapons")
    rows = expect_count(d, "weapons", "weapons")
    check(len(rows) >= 300, f"weapons: {len(rows)} (<300)")
    cats = {"ground", "air", "naval", "missile"}
    check(all(r["category"] in cats for r in rows), "weapons: category вне enum")

    # World Bank (реальные данные)
    d = fetch("/api/knowledge/worldbank")
    rows = expect_count(d, "data", "worldbank")
    check(d.get("kind") == "real", "worldbank: kind != real")
    check(len(rows) >= 150, f"worldbank: {len(rows)} стран (<150)")

    # Досье и узкие места
    d = fetch("/api/knowledge/dossier")
    rows = expect_count(d, "dossiers", "dossier")
    check(len(rows) >= 40, f"dossier: {len(rows)} (<40)")
    d = fetch("/api/knowledge/chokepoints")
    rows = expect_count(d, "chokepoints", "chokepoints")
    check(len(rows) >= 30, f"chokepoints: {len(rows)} (<30)")
    for r in rows:
        if r.get("lat") is not None:
            check(-90 <= r["lat"] <= 90, f"chokepoints/{r['nameRu']}: lat вне диапазона")
        if r.get("lng") is not None:
            check(-180 <= r["lng"] <= 180, f"chokepoints/{r['nameRu']}: lng вне диапазона")

    # Ракеты
    d = fetch("/api/knowledge/missiles")
    rows = expect_count(d, "missiles", "missiles")
    check(len(rows) >= 40, f"missiles: {len(rows)} (<40)")

    # Боевой порядок
    d = fetch("/api/knowledge/order-of-battle")
    rows = expect_count(d, "formations", "order-of-battle")
    check(len(rows) >= 150, f"order-of-battle: {len(rows)} (<150)")

    # Честные empty-состояния
    d = fetch("/api/knowledge/dossier?iso=XXX")
    check(d.get("dossier") is None, "dossier/XXX: ожидалось пустое состояние")
    d = fetch("/api/knowledge/weapons?category=nonexistent")
    check(d.get("count") == 0, "weapons/bad-category: ожидался 0")

    print(f"\n{checks} проверок, {len(failures)} нарушений")
    if failures:
        print("FAIL")
        sys.exit(1)
    print("PASS: knowledge stack consistent")


if __name__ == "__main__":
    main()
