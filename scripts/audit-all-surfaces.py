"""Smoke-test every analytical tab and tactical modal after the UI rewrite."""
import os
import sys
from playwright.sync_api import sync_playwright, expect

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3000"
TABS = ["Сводка", "Модель БП", "Экономика", "Вооружение", "Коалиции", "Сравнение", "Аналитика", "Сценарий", "Доктрина", "География", "Объекты", "История", "ОПК"]

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, **({"channel": "msedge"} if os.name == "nt" else {}))
    page = browser.new_page(viewport={"width": 1920, "height": 1080})
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto(BASE, wait_until="networkidle", timeout=90000)
    page.get_by_role("button", name="США", exact=False).first.click()
    panel = page.get_by_test_id("country-detail-panel")
    expect(panel).to_be_visible()

    for label in TABS:
        tab = panel.get_by_role("tab", name=label, exact=True)
        tab.click()
        expect(tab).to_have_attribute("aria-selected", "true")
        page.wait_for_timeout(250)
        assert panel.evaluate("node => node.scrollWidth <= node.clientWidth"), f"Horizontal overflow in {label}"

    # Strategic modals.
    page.get_by_role("button", name="Открыть анализ коалиций", exact=True).click()
    expect(page.get_by_test_id("coalition-builder")).to_be_visible()
    page.keyboard.press("Escape")
    expect(page.get_by_test_id("coalition-builder")).to_be_hidden()
    page.get_by_role("button", name="Открыть сравнение стран", exact=True).click()
    comparison = page.get_by_test_id("country-comparison")
    expect(comparison).to_be_visible()
    expect(comparison.locator("select").first).to_have_value("USA")
    page.keyboard.press("Escape")

    # Tactical tools.
    page.get_by_role("button", name="Тактический", exact=False).click()
    page.wait_for_timeout(500)
    expect(page.get_by_role("heading", name="Театр не развёрнут", exact=True)).to_be_visible()
    page.get_by_role("button", name="Создать Кастомный Юнит", exact=False).click()
    expect(page.get_by_role("heading", name="Конструктор Юнитов", exact=False)).to_be_visible()
    page.keyboard.press("Escape")
    if page.get_by_role("heading", name="Конструктор Юнитов", exact=False).is_visible():
        page.locator('button:has(svg.lucide-x)').last.click()
    page.get_by_role("button", name="Аналитика", exact=False).first.click()
    expect(page.get_by_role("heading", name="Матрица Сравнения Юнитов", exact=False)).to_be_visible()

    assert not errors, errors
    print("PASS: all strategic tabs and major strategic/tactical modals")
    browser.close()
