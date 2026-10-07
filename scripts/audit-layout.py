# -*- coding: utf-8 -*-
"""Composition audit: walk every country-panel tab and map overlay, measure
layout quality (truncation, clipping, overlaps, tiny fonts, misalignment,
inconsistent gaps). Reports violations as JSON; screenshots each surface.

Usage: python scripts/audit-layout.py [base_url]
"""
import json
import os
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright, expect

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3000"
OUT = Path("test-results/layout-audit")
OUT.mkdir(parents=True, exist_ok=True)

TABS = ["Сводка", "Модель БП", "Экономика", "Вооружение", "Коалиции", "Сравнение",
        "Аналитика", "Сценарий", "Доктрина", "География", "Объекты", "История", "ОПК"]

MEASURE = """(label) => {
  const panel = document.querySelector('[data-testid="country-detail-panel"]');
  if (!panel) return { label, error: 'no panel' };
  const pr = panel.getBoundingClientRect();
  const out = { label, trunc: [], clip: [], tiny: [], overlap: [], tabs: {}, gaps: {}, heads: [] };
  const vis = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el);
    return r.width > 4 && r.height > 4 && s.visibility !== 'hidden' && s.display !== 'none'; };

  // 1) text truncation: scrollWidth exceeds box without title tooltip
  panel.querySelectorAll('*').forEach(el => {
    if (!vis(el) || el.children.length) return;
    if (el.scrollWidth > el.clientWidth + 3 && !el.hasAttribute('title')) {
      out.trunc.push({ tag: el.tagName, text: (el.textContent||'').trim().slice(0,40),
        w: Math.round(el.clientWidth), sw: Math.round(el.scrollWidth) });
    }
    // vertical truncation of block content
    if (el.scrollHeight > el.clientHeight + 4 && getComputedStyle(el).overflowY !== 'auto'
        && getComputedStyle(el).overflow !== 'auto' && el.clientHeight > 0 && !el.closest('[data-scroll]')) {
      // ignore intentionally scrollable lists
    }
  });

  // 2) clipped: leaves outside the panel rect
  panel.querySelectorAll('*').forEach(el => {
    if (!vis(el) || el.children.length) return;
    const r = el.getBoundingClientRect();
    if (r.right > pr.right + 2 || r.left < pr.left - 2) {
      out.clip.push({ tag: el.tagName, text: (el.textContent||'').trim().slice(0,40),
        left: Math.round(r.left - pr.left), right: Math.round(pr.right - r.right) });
    }
  });

  // 3) tiny fonts
  panel.querySelectorAll('*').forEach(el => {
    if (!vis(el) || el.children.length) return;
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (fs < 10) out.tiny.push({ tag: el.tagName, text: (el.textContent||'').trim().slice(0,30), fs });
  });

  // 4) overlapping siblings (leaf rows in same list/section)
  const rects = new Map();
  panel.querySelectorAll('li, section > div, article').forEach(el => {
    if (!vis(el)) return;
    const r = el.getBoundingClientRect();
    if (r.width < 10 || r.height < 10) return;
    for (const [other, or] of rects) {
      if (el.contains(other) || other.contains(el)) continue;
      const ox = Math.min(r.right, or.right) - Math.max(r.left, or.left);
      const oy = Math.min(r.bottom, or.bottom) - Math.max(r.top, or.top);
      if (ox > 6 && oy > 6) out.overlap.push({ a: (el.textContent||'').trim().slice(0,25), b: (other.textContent||'').trim().slice(0,25) });
    }
    rects.set(el, r);
  });

  // 5) tab uniformity
  const tabs = [...panel.querySelectorAll('[role="tab"]')].map(t => { const r = t.getBoundingClientRect();
    return { label: t.textContent.trim(), w: Math.round(r.width), h: Math.round(r.height) }; });
  out.tabs = { count: tabs.length, widths: [...new Set(tabs.map(t=>t.w))], heights: [...new Set(tabs.map(t=>t.h))],
    wrapped: tabs.filter(t => t.w < 40).map(t => t.label) };

  // 6) list gap consistency: vertical gaps between li siblings of the first big list
  for (const ul of panel.querySelectorAll('ul')) {
    const items = [...ul.children].filter(vis); if (items.length < 3) continue;
    const gaps = []; for (let i = 1; i < items.length; i++) {
      gaps.push(Math.round(items[i].getBoundingClientRect().top - items[i-1].getBoundingClientRect().bottom)); }
    const uniq = [...new Set(gaps)];
    if (uniq.length > 1) out.gaps[(ul.previousElementSibling?.textContent || 'list').trim().slice(0,30)] = uniq.slice(0,6);
    break;
  }

  // 7) section header left offsets
  panel.querySelectorAll('h2, h3, h4').forEach(h => { if (vis(h))
    out.heads.push({ tag: h.tagName, text: h.textContent.trim().slice(0,30), left: Math.round(h.getBoundingClientRect().left - pr.left) }); });
  return out;
}"""

MAP_OVERLAYS = """() => {
  const out = { chips: {}, card: null, legend: {}, overlaps: [] };
  const root = document.querySelector('[data-testid="strategic-atlas"]') || document.body;
  const rr = root.getBoundingClientRect();
  const chipsBox = root.querySelector('[class*="typeFilters"]');
  if (chipsBox) { const r = chipsBox.getBoundingClientRect();
    out.chips = { right: Math.round(rr.right - r.right), bottom: Math.round(rr.bottom - r.bottom), w: Math.round(r.width), h: Math.round(r.height),
      rows: [...chipsBox.children].length };
    const legend = [...root.querySelectorAll('div')].find(d => d.textContent.includes('Логарифмическая'));
    if (legend) { const lr = legend.getBoundingClientRect();
      const ox = Math.min(r.right, lr.right) - Math.max(r.left, lr.left);
      const oy = Math.min(r.bottom, lr.bottom) - Math.max(r.top, lr.top);
      if (ox > 4 && oy > 4) out.overlaps.push('chips x legend'); } }
  const card = root.querySelector('[data-testid="facility-card"]');
  if (card) { const c = card.getBoundingClientRect();
    out.card = { top: Math.round(c.top - rr.top), h: Math.round(c.height), clipped: c.right > rr.right + 2 };
    const chips = chipsBox?.getBoundingClientRect();
    if (chips) { const oy = Math.min(c.bottom, chips.bottom) - Math.max(c.top, chips.top);
      if (oy > 4) out.overlaps.push('facilityCard x chips'); } }
  return out;
}"""


def walk_tabs(page, viewport_label):
    report = []
    panel = page.get_by_test_id("country-detail-panel")
    expect(panel).to_be_visible()
    for label in TABS:
        tab = panel.get_by_role("tab", name=label, exact=True)
        tab.click()
        expect(tab).to_have_attribute("aria-selected", "true")
        page.wait_for_timeout(900)
        data = page.evaluate(MEASURE, label)
        report.append(data)
        page.screenshot(path=str(OUT / f"tab-{label.replace(' ', '_')}-{viewport_label}.png"))
    return report


def main():
    all_reports = {}
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, **({"channel": "msedge"} if os.name == "nt" else {}))
        for vw, vh, label in [(1600, 1000, "desktop"), (1280, 800, "laptop")]:
            page = browser.new_page(viewport={"width": vw, "height": vh}, device_scale_factor=1)
            errors = []
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.goto(BASE, wait_until="networkidle", timeout=90000)
            page.get_by_role("button", name="США", exact=False).first.click()
            tabs = walk_tabs(page, label)
            # map overlays at world zoom with facilities on
            overlays = page.evaluate(MAP_OVERLAYS)
            # modal composition: coalitions
            page.keyboard.press("Escape")
            page.get_by_role("button", name="Закрыть анализ страны", exact=True).click()
            page.get_by_role("button", name="Открыть анализ коалиций", exact=True).click()
            coal = page.get_by_test_id("coalition-builder")
            expect(coal).to_be_visible()
            page.wait_for_timeout(400)
            page.screenshot(path=str(OUT / f"coalitions-{label}.png"))
            page.keyboard.press("Escape")
            page.get_by_role("button", name="Открыть сравнение стран", exact=True).click()
            comp = page.get_by_test_id("country-comparison")
            expect(comp).to_be_visible()
            page.wait_for_timeout(400)
            page.screenshot(path=str(OUT / f"comparison-{label}.png"))
            page.keyboard.press("Escape")
            all_reports[label] = {"tabs": tabs, "overlays": overlays, "jsErrors": errors}
            page.close()
        browser.close()

    (OUT / "report.json").write_text(json.dumps(all_reports, ensure_ascii=False, indent=1), encoding="utf-8")

    # Human summary
    for label, rep in all_reports.items():
        print(f"=== {label} ===")
        for t in rep["tabs"]:
            issues = []
            if t.get("error"):
                issues.append("ERROR " + t["error"])
            for key in ("trunc", "clip", "tiny", "overlap"):
                if t.get(key):
                    issues.append(f"{key}={len(t[key])}")
            if t.get("tabs", {}).get("widths", []) and len(t["tabs"]["widths"]) > 1:
                issues.append(f"tabWidths={t['tabs']['widths']}")
            if t.get("tabs", {}).get("heights", []) and len(t["tabs"]["heights"]) > 1:
                issues.append(f"tabHeights={t['tabs']['heights']}")
            if t.get("gaps"):
                issues.append("gaps=" + json.dumps(t["gaps"], ensure_ascii=False))
            status = " | ".join(issues) if issues else "ok"
            print(f"  [{t.get('label')}] {status}")
            for key in ("trunc", "clip", "overlap"):
                for v in (t.get(key) or [])[:6]:
                    print(f"      {key}: {json.dumps(v, ensure_ascii=False)}")
        print("  overlays:", json.dumps(rep["overlays"], ensure_ascii=False))
        print("  jsErrors:", len(rep["jsErrors"]))
    print("DONE ->", OUT / "report.json")


if __name__ == "__main__":
    main()
