"""Browser regression for the token-free atlas. Run against a running server.
Usage: python scripts/test-map.py [base_url]
Uses installed Edge on Windows; Playwright Chromium elsewhere.
"""
import os
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3000"
ARTIFACTS = Path("test-results/atlas")
ARTIFACTS.mkdir(parents=True, exist_ok=True)
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, **({"channel": "msedge"} if os.name == "nt" else {}))
    page = browser.new_page(viewport={"width": 1600, "height": 1000})
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto(BASE, wait_until="networkidle", timeout=90000)
    page.screenshot(path=str(ARTIFACTS / "overview.png"))
    atlas = page.get_by_test_id("strategic-atlas")
    expect(atlas).to_be_visible()
    expect(atlas.locator("path[data-iso]").first).to_be_visible()
    assert atlas.locator("path[data-iso]").count() > 150
    expect(page.get_by_text("Требуется токен Mapbox", exact=True)).to_have_count(0)
    # World coverage: all sovereign states carry data and appear in the sidebar.
    page.wait_for_function("() => document.body.innerText.includes('195')", timeout=15000)
    country = atlas.locator('path[data-iso="CHN"]')
    country.focus()
    country.press("Enter")
    expect(country).to_have_attribute("aria-pressed", "true")
    detail_panel = page.get_by_test_id("country-detail-panel")
    expect(detail_panel).to_be_visible()
    expect(detail_panel).to_contain_text("Китай")
    expect(detail_panel.get_by_test_id("country-code")).to_have_text("CHN")
    # The page detail panel is the single source of selected-country data.
    expect(page.get_by_test_id("atlas-inspector")).to_have_count(0)
    tabs = page.get_by_role("tablist", name="Разделы анализа")
    expect(tabs).to_be_visible()
    assert tabs.evaluate("node => node.scrollWidth <= node.clientWidth"), "Country tabs overflow horizontally"
    assert detail_panel.bounding_box()["width"] >= 360, "Desktop country panel is too narrow"
    # 13 tabs (incl. Objects, History, Industry) must fit without horizontal overflow.
    tabs = page.get_by_role("tablist", name="Разделы анализа")
    assert tabs.evaluate("node => node.scrollWidth <= node.clientWidth"), "13 country tabs overflow"
    assert tabs.get_by_role("tab").count() == 13, "Expected 13 country analysis tabs"
    # Objects tab shows real hosted facilities and conflict zones for the selected state.
    usa = atlas.locator('path[data-iso="USA"]')
    usa.focus()
    usa.press("Enter")
    expect(detail_panel.get_by_test_id("country-code")).to_have_text("USA")
    detail_panel.get_by_role("tab", name="Объекты").click()
    expect(detail_panel).to_contain_text("Объекты на территории")
    expect(detail_panel).to_contain_text("Оперирует за рубежом")
    page.screenshot(path=str(ARTIFACTS / "country-objects-tab.png"))
    # Panel→map integration: locate button centers the atlas on the facility
    # (must run while the Objects tab is active).
    detail_panel.get_by_role("button", name="Показать на карте:").first.click()
    expect(page.get_by_text("4.0×")).to_be_visible()
    # History tab: timeline of conflicts involving the selected state.
    detail_panel.get_by_role("tab", name="История").click()
    expect(detail_panel).to_contain_text("История конфликтов")
    # Industry tab: defense companies / transfers / treaties.
    detail_panel.get_by_role("tab", name="ОПК").click()
    expect(detail_panel).to_contain_text("ОПК")
    detail_panel.get_by_role("tab", name="Сводка").click()
    page.get_by_role("button", name="Закрыть анализ страны", exact=True).click()
    # A country absent from the low-resolution polygons must still be selectable.
    singapore = atlas.locator('[data-iso="SGP"]')
    expect(singapore).to_be_visible()
    singapore.focus()
    singapore.press("Enter")
    expect(singapore).to_have_attribute("aria-pressed", "true")
    # Hover state must clear over the ocean without creating another selected-country card.
    country.dispatch_event("pointerover", {"pointerType": "mouse"})
    country.dispatch_event("pointerout", {"pointerType": "mouse"})
    expect(page.get_by_test_id("atlas-inspector")).to_have_count(0)
    page.set_viewport_size({"width": 1600, "height": 1000})
    before = page.get_by_test_id("atlas-camera").get_attribute("transform")
    page.get_by_role("button", name="Увеличить масштаб", exact=True).click()
    assert page.get_by_test_id("atlas-camera").get_attribute("transform") != before
    page.get_by_role("button", name="Сбросить вид", exact=True).click()
    for title, unit in [("Оборонный бюджет", "млрд $"), ("Военно-морской флот", "кораблей"),
                        ("Военная авиация", "самолётов"), ("Бронетехника", "танков"),
                        ("Ядерный арсенал", "боеголовок")]:
        page.get_by_role("button", name=title, exact=True).click()
        expect(page.get_by_test_id("atlas-legend")).to_contain_text(unit)
    page.screenshot(path=str(ARTIFACTS / "nuclear.png"))
    # Strategic facilities overlay: markers render, click opens the facility card,
    # and the toggle hides the layer again.
    page.get_by_role("button", name="Сбросить вид", exact=True).click()
    facilities = atlas.get_by_test_id("atlas-facility")
    expect(facilities.first).to_be_visible()
    assert facilities.count() >= 20, f"expected high-value facilities at world zoom, got {facilities.count()}"
    facilities.first.click()
    card = page.get_by_test_id("facility-card")
    expect(card).to_be_visible()
    expect(card).to_contain_text("значимость")
    card.get_by_role("button", name="Закрыть карточку объекта").click()
    expect(card).to_have_count(0)
    page.get_by_test_id("facilities-toggle").click()
    expect(atlas.get_by_test_id("atlas-facility")).to_have_count(0)
    page.get_by_test_id("facilities-toggle").click()
    expect(atlas.get_by_test_id("atlas-facility").first).to_be_visible()
    # Type filters hide/show facility classes independently.
    visible_before = atlas.get_by_test_id("atlas-facility").count()
    page.get_by_test_id("filter-naval_base").click()
    assert atlas.get_by_test_id("atlas-facility").count() < visible_before, "naval filter must hide naval bases"
    page.get_by_test_id("filter-naval_base").click()
    expect(atlas.get_by_test_id("atlas-facility").first).to_be_visible()
    # Type chips carry live counts from the registry (verified against the API).
    import json as _json, urllib.request as _urlreq
    with _urlreq.urlopen(f"{BASE}/api/facilities?type=air_base", timeout=20) as _r:
        _air = _json.load(_r)["count"]
    expect(page.get_by_test_id("filter-air_base")).to_contain_text(str(_air))
    page.screenshot(path=str(ARTIFACTS / "facilities.png"))
    # Facility labels appear zoomed in and do not overlap.
    expect(atlas.get_by_test_id("facility-label")).to_have_count(0)
    # Labels appear at k>=3; four 1.4x clicks from home gives k=3.84.
    for _ in range(4):
        page.get_by_role("button", name="Увеличить масштаб", exact=True).click()
    flabels = atlas.get_by_test_id("facility-label")
    expect(flabels.first).to_be_visible()
    fboxes = flabels.evaluate_all("nodes => nodes.map(n => { const r = n.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height}; })")
    for i, a in enumerate(fboxes):
        for b in fboxes[i+1:]:
            assert not (a["x"] < b["x"] + b["w"] and a["x"] + a["w"] > b["x"] and a["y"] < b["y"] + b["h"] and a["y"] + a["h"] > b["y"]), "Facility labels overlap"
    page.screenshot(path=str(ARTIFACTS / "facilities-labels.png"))
    page.get_by_role("button", name="Сбросить вид", exact=True).click()
    # Conflict zones overlay: off by default, toggle shows rings, click opens card.
    expect(atlas.get_by_test_id("atlas-conflict")).to_have_count(0)
    page.get_by_test_id("conflicts-toggle").click()
    zones = atlas.get_by_test_id("atlas-conflict")
    expect(zones.first).to_be_visible()
    assert zones.count() >= 20, f"expected conflict zones, got {zones.count()}"
    zones.first.click()
    zone_card = page.get_by_test_id("conflict-card")
    expect(zone_card).to_be_visible()
    expect(zone_card).to_contain_text("интенсивность")
    zone_card.get_by_role("button", name="Закрыть карточку зоны").click()
    expect(zone_card).to_have_count(0)
    page.get_by_test_id("conflicts-toggle").click()
    expect(atlas.get_by_test_id("atlas-conflict")).to_have_count(0)
    page.screenshot(path=str(ARTIFACTS / "conflicts.png"))
    # Fullscreen keeps the thematic controls accessible and exits with Escape.
    page.get_by_role("button", name="Развернуть карту", exact=True).click()
    expect(atlas).to_have_attribute("data-fullscreen", "true")
    page.get_by_role("button", name="Сбросить вид", exact=True).click()
    label_boxes = atlas.get_by_test_id("atlas-label").evaluate_all("nodes => nodes.map(node => { const r = node.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height}; })")
    assert len(label_boxes) >= 3, "World overview must retain useful labels"
    for i, a in enumerate(label_boxes):
        for b in label_boxes[i+1:]:
            assert not (a["x"] < b["x"] + b["w"] and a["x"] + a["w"] > b["x"] and a["y"] < b["y"] + b["h"] and a["y"] + a["h"] > b["y"]), "Country labels overlap"
    page.get_by_role("button", name="Подписи стран", exact=True).click()
    expect(atlas.get_by_test_id("atlas-label")).to_have_count(0)
    page.get_by_role("button", name="Подписи стран", exact=True).click()
    expect(atlas.get_by_test_id("atlas-label").first).to_be_visible()
    page.screenshot(path=str(ARTIFACTS / "fullscreen.png"))
    atlas.get_by_role("button", name="Боевой потенциал", exact=True).click()
    expect(page.get_by_test_id("atlas-legend")).to_contain_text("баллов БП")
    page.keyboard.press("Escape")
    expect(atlas).to_have_attribute("data-fullscreen", "false")
    # Keyboard search and a dedicated locate control work without pointer input.
    keyboard_search = page.get_by_role("combobox", name="Найти страну на карте")
    keyboard_search.fill("Германия")
    keyboard_search.press("ArrowDown")
    keyboard_search.press("Enter")
    expect(atlas.locator('path[data-iso="DEU"]')).to_have_attribute("aria-pressed", "true")
    page.get_by_role("button", name="Сбросить вид", exact=True).click()
    home_camera = page.get_by_test_id("atlas-camera").get_attribute("transform")
    page.get_by_role("button", name="Показать выбранную страну", exact=True).click()
    assert page.get_by_test_id("atlas-camera").get_attribute("transform") != home_camera
    # Search must return the original API key PHI, not the geometry key PHL.
    search = page.get_by_role("combobox", name="Найти страну на карте")
    search.fill("Филиппины")
    atlas.get_by_role("option", name="Филиппины", exact=False).click()
    expect(atlas.locator('path[data-iso="PHL"]')).to_have_attribute("aria-pressed", "true")
    page.set_viewport_size({"width": 390, "height": 844})
    expect(atlas).to_be_visible()
    expect(page.get_by_role("button", name="Закрыть анализ страны", exact=True)).to_be_visible()
    page.get_by_role("button", name="Закрыть анализ страны", exact=True).click()
    expect(atlas.locator('path[data-iso="PHL"]')).to_have_attribute("aria-pressed", "false")
    page.screenshot(path=str(ARTIFACTS / "mobile.png"))
    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth"), "Horizontal overflow"
    assert not errors, errors
    # Boundary errors must offer a working retry, not an infinite loading state.
    failed = browser.new_page(viewport={"width": 1400, "height": 900})
    failed.route("**/data/countries.geojson", lambda route: route.fulfill(status=503, body="unavailable"), times=1)
    failed.goto(BASE, wait_until="networkidle")
    expect(failed.get_by_text("Не удалось загрузить границы", exact=True)).to_be_visible()
    failed.get_by_role("button", name="Повторить", exact=True).click()
    expect(failed.get_by_test_id("strategic-atlas").locator('path[data-iso="CHN"]')).to_be_visible()
    browser.close()
print("PASS: atlas rendering, world coverage (195 states), facilities layer + type filters, conflict zones, keyboard selection, zoom/reset, five analytics layers, mobile, no JS errors")
