"""Capture major RBP surfaces and report visible layout defects."""
import os
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3000"
OUT = Path("test-results/ui-audit")
OUT.mkdir(parents=True, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, **({"channel": "msedge"} if os.name == "nt" else {}))
    page = browser.new_page(viewport={"width": 1920, "height": 1080}, device_scale_factor=1)
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto(BASE, wait_until="networkidle", timeout=90000)

    page.get_by_role("button", name="США", exact=False).first.click()
    panel = page.get_by_test_id("country-detail-panel")
    expect(panel).to_be_visible()
    expect(panel.get_by_test_id("country-code")).to_have_text("USA")
    expect(page.get_by_test_id("atlas-inspector")).to_have_count(0)
    page.wait_for_timeout(500)
    page.screenshot(path=str(OUT / "country-detail.png"), full_page=True)

    measurements = page.evaluate("""() => {
      const panel = document.querySelector('[data-testid="country-detail-panel"]');
      const tabs = document.querySelector('[role="tablist"]');
      const tiny = [...document.querySelectorAll('body *')].filter(el => {
        const s = getComputedStyle(el); const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && parseFloat(s.fontSize) < 10;
      });
      return {
        panelWidth: panel?.getBoundingClientRect().width,
        tabsOverflow: tabs ? tabs.scrollWidth - tabs.clientWidth : 0,
        tinyTextCount: tiny.length,
        horizontalOverflow: document.documentElement.scrollWidth - innerWidth,
        tinyText: tiny.slice(0, 40).map(el => ({
          tag: el.tagName,
          text: (el.textContent || '').trim().slice(0, 60),
          size: getComputedStyle(el).fontSize,
          className: typeof el.className === 'string' ? el.className.slice(0, 100) : '',
        })),
      };
    }""")
    assert measurements["panelWidth"] >= 390, measurements
    assert measurements["tabsOverflow"] <= 0, measurements
    assert measurements["horizontalOverflow"] <= 0, measurements

    page.get_by_role("button", name="Открыть анализ коалиций", exact=True).click()
    coalition = page.get_by_test_id("coalition-builder")
    expect(coalition).to_be_visible()
    expect(coalition.get_by_role("heading", name="Анализ коалиций", exact=True)).to_be_visible()
    page.wait_for_timeout(500)
    page.screenshot(path=str(OUT / "coalitions.png"), full_page=True)
    page.keyboard.press("Escape")
    expect(coalition).to_be_hidden()

    page.get_by_role("button", name="Открыть сравнение стран", exact=True).click()
    comparison = page.get_by_test_id("country-comparison")
    expect(comparison).to_be_visible()
    expect(comparison.get_by_role("heading", name="Сравнение стран", exact=True)).to_be_visible()
    expect(comparison.locator('select').first).to_have_value("USA")
    page.wait_for_timeout(500)
    page.screenshot(path=str(OUT / "comparison.png"), full_page=True)
    page.keyboard.press("Escape")
    expect(comparison).to_be_hidden()

    page.get_by_role("button", name="Тактический", exact=False).click()
    page.wait_for_timeout(1000)
    expect(page.get_by_role("heading", name="Театр не развёрнут", exact=True)).to_be_visible()
    page.screenshot(path=str(OUT / "tactical.png"), full_page=True)

    mobile = browser.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=1)
    mobile.goto(BASE, wait_until="networkidle", timeout=90000)
    mobile_header = mobile.locator("header").first
    assert mobile_header.bounding_box()["height"] <= 76, "Mobile header is too tall"
    assert mobile.evaluate("document.documentElement.scrollWidth <= innerWidth"), "Mobile horizontal overflow"
    mobile.screenshot(path=str(OUT / "mobile-overview.png"), full_page=True)

    assert not errors, errors
    print("PASS", measurements)
    browser.close()
