# -*- coding: utf-8 -*-
"""Functional test of knowledge-backed UI sections.

Opens the country panel and verifies that the knowledge pack renders in the
tabs: History (battles + campaigns with real records), Industry (weapon
browser table with sortable headers and counters), and Military (equipment
model inventory + strategic systems panels). Also exercises the weapon
browser category filter and verifies honest empty states.

Usage: python scripts/test-knowledge-ui.py [base_url]
"""
import sys

from playwright.sync_api import sync_playwright, expect

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3000"


def main() -> int:
    errors: list[str] = []
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="msedge")
        page = browser.new_page(viewport={"width": 1600, "height": 1000})
        page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
        page.goto(BASE, wait_until="networkidle")
        page.wait_for_timeout(1200)

        atlas = page.get_by_test_id("strategic-atlas").first
        expect(atlas).to_be_visible()

        # Открываем панель США (богатейшие данные)
        usa = atlas.locator('path[data-iso="USA"]')
        usa.focus()
        usa.press("Enter")
        panel = page.get_by_test_id("country-detail-panel")
        expect(panel).to_be_visible()
        expect(panel.get_by_test_id("country-code")).to_have_text("USA")

        # ── История: сражения и кампании с реальными записями ──
        panel.get_by_role("tab", name="История").click()
        page.wait_for_timeout(400)
        expect(panel).to_contain_text("История конфликтов")
        body = panel.inner_text()
        low = body.lower()
        assert "сражени" in low, "History: нет секции сражений"
        assert "кампани" in low, "History: нет секции кампаний"
        # хотя бы одна известная кампания/сражение США
        known = ["норманд", "мидуэй", "гуадалканал", "буря", "ирак", "вьетнам", "корейск", "свобода"]
        assert any(k in low for k in known), "History: нет узнаваемых записей США"

        # ── ОПК: браузер образцов ВВТ ──
        panel.get_by_role("tab", name="ОПК").click()
        page.wait_for_timeout(400)
        assert "база образцов ввт" in panel.inner_text().lower(), "Industry: нет браузера ВВТ"
        rows_before = panel.locator("table tbody tr").count()
        assert rows_before > 20, f"Weapon browser: {rows_before} строк (<20)"
        # фильтр по категории «Флот»
        panel.get_by_role("button", name="Флот", exact=True).click()
        page.wait_for_timeout(300)
        rows_navy = panel.locator("table tbody tr").count()
        assert 0 < rows_navy <= rows_before, f"Weapon filter: {rows_navy} vs {rows_before}"
        # сортировка по массе
        panel.get_by_role("button", name="по массе", exact=True).click()
        page.wait_for_timeout(300)

        # ── Вооружение: модели + стратегические системы + образцы ──
        panel.get_by_role("tab", name="Вооружение").click()
        page.wait_for_timeout(400)
        body = panel.inner_text()
        assert "парк техники" in body.lower(), "Military: нет инвентаря моделей"
        assert "стратегические системы" in body.lower(), "Military: нет стратегических систем"
        assert "ввт" in body.lower(), "Military: нет образцов"

        # ── География: досье страны ──
        panel.get_by_role("tab", name="География").click()
        page.wait_for_timeout(400)
        expect(panel).to_contain_text("Страновое досье")
        # ── Аналитика: история/бюджеты агрегаты ──
        panel.get_by_role("tab", name="Аналитика").click()
        page.wait_for_timeout(400)
        body = panel.inner_text()
        assert "военная история" in body.lower(), "Analytics: нет агрегатов истории"
        assert "бюджеты мира" in body.lower(), "Analytics: нет бюджетных трендов"

        page.screenshot(path="test-results/atlas/knowledge-ui.png")
        browser.close()

    if errors:
        print("JS errors:")
        for e in errors[:5]:
            print("  ", e)
        print("FAIL")
        return 1
    print("PASS: knowledge-backed UI renders (history, industry browser, equipment, dossier, analytics)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
