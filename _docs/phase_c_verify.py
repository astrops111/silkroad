"""Phase C verification — full Chinese translation on /about, /marketplace, /commodities/browse."""
from playwright.sync_api import sync_playwright
import json
import os
import sys

sys.stdout.reconfigure(encoding="utf-8")

BASE = "http://localhost:5175"
OUT_DIR = r"C:\Users\TING\Documents\Astro8\AI\buy\_docs\screenshots_phase_c"
os.makedirs(OUT_DIR, exist_ok=True)


def switch_to_chinese(page) -> None:
    page.locator('header [aria-haspopup="dialog"]').first.click()
    page.wait_for_selector('[role="dialog"][aria-label="Region, language and currency"]', state="visible")
    # Click 中文 (Chinese) language button
    page.locator('[role="dialog"] button:has-text("中文")').first.click()
    page.wait_for_timeout(400)
    page.keyboard.press("Escape")
    page.wait_for_timeout(1200)


def visible_text(page, selector: str) -> str:
    locator = page.locator(selector).first
    if locator.count() == 0:
        return ""
    return (locator.inner_text() or "").strip()


def main() -> None:
    results: dict = {}
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(viewport={"width": 1440, "height": 900})
        page = ctx.new_page()

        # Fresh state
        page.goto(f"{BASE}/", wait_until="networkidle", timeout=45_000)
        page.evaluate("() => { localStorage.clear(); }")
        page.context.clear_cookies()
        page.reload(wait_until="networkidle")
        page.wait_for_timeout(600)

        # Switch to Chinese
        switch_to_chinese(page)

        # 1) /about — Chinese
        page.goto(f"{BASE}/about", wait_until="networkidle", timeout=45_000)
        page.wait_for_timeout(1000)
        h1 = visible_text(page, "main h1")
        results["1_about_h1"] = h1
        results["1_about_h1_is_chinese"] = "两片大陆" in h1
        results["1_about_has_pillars_title"] = page.locator(
            'main :text("四大支柱")'
        ).count() > 0
        results["1_about_has_flow_title"] = page.locator(
            'main :text("丝路上的贸易流动")'
        ).count() > 0
        results["1_about_has_cta_buyer_zh"] = page.locator(
            'main a:has-text("我要采购")'
        ).count() > 0
        results["1_about_no_english_pillar"] = page.locator(
            'main :text("Trade Assurance")'
        ).count() == 0
        page.screenshot(path=os.path.join(OUT_DIR, "1_about_zh.png"), full_page=True)

        # 2) /marketplace — Chinese
        page.goto(f"{BASE}/marketplace", wait_until="networkidle", timeout=45_000)
        page.wait_for_timeout(1000)
        mp_h1 = visible_text(page, "main h1")
        results["2_mp_h1"] = mp_h1
        results["2_mp_h1_is_chinese"] = "商城" in mp_h1
        results["2_mp_has_category_heading"] = page.locator(
            'main :text("分类")'
        ).count() > 0
        results["2_mp_has_all_categories"] = page.locator(
            'main a:has-text("全部分类")'
        ).count() > 0
        results["2_mp_sort_zh"] = page.locator(
            'main option:has-text("最相关")'
        ).count() > 0
        results["2_mp_products_found_zh"] = page.locator(
            'main :text("找到")'
        ).count() > 0
        page.screenshot(path=os.path.join(OUT_DIR, "2_marketplace_zh.png"), full_page=True)

        # 2b) Click Electronics category filter via URL → chip should be translated
        page.goto(
            f"{BASE}/marketplace?category=electronics",
            wait_until="networkidle",
            timeout=45_000,
        )
        page.wait_for_timeout(800)
        mp_filtered_h1 = visible_text(page, "main h1")
        results["2b_mp_filtered_h1"] = mp_filtered_h1
        results["2b_mp_filtered_h1_zh"] = "电子产品" in mp_filtered_h1
        results["2b_mp_filter_chip_label_zh"] = page.locator(
            'main :text("筛选")'
        ).count() > 0

        # 3) /commodities/browse — Chinese
        page.goto(
            f"{BASE}/commodities/browse",
            wait_until="networkidle",
            timeout=45_000,
        )
        page.wait_for_timeout(1000)
        br_h1 = visible_text(page, "main h1")
        results["3_br_h1"] = br_h1
        results["3_br_h1_is_chinese"] = "浏览大宗商品" in br_h1
        results["3_br_has_commodity_heading"] = page.locator(
            'main :text("商品")'
        ).count() > 0
        results["3_br_cert_heading_zh"] = page.locator(
            'main :text("认证")'
        ).count() > 0
        results["3_br_fair_trade_zh"] = page.locator(
            'main :text("公平贸易")'
        ).count() > 0
        results["3_br_view_lot_zh"] = page.locator(
            'main :text("查看批次")'
        ).count() > 0
        results["3_br_showing_zh"] = page.locator(
            'main :text("显示")'
        ).count() > 0
        page.screenshot(path=os.path.join(OUT_DIR, "3_browse_zh.png"), full_page=True)

        # 3b) Coffee filter → header reflects translation
        page.goto(
            f"{BASE}/commodities/browse?category=coffee",
            wait_until="networkidle",
            timeout=45_000,
        )
        page.wait_for_timeout(800)
        br_filtered_h1 = visible_text(page, "main h1")
        results["3b_br_filtered_h1"] = br_filtered_h1
        results["3b_br_filtered_is_coffee_zh"] = "咖啡" in br_filtered_h1

        # 4) Switch back to English — sanity check that it flips back
        page.locator('header [aria-haspopup="dialog"]').first.click()
        page.wait_for_selector('[role="dialog"]', state="visible")
        page.locator('[role="dialog"] button:has-text("English")').first.click()
        page.wait_for_timeout(400)
        page.keyboard.press("Escape")
        page.wait_for_timeout(1000)

        page.goto(f"{BASE}/about", wait_until="networkidle", timeout=45_000)
        page.wait_for_timeout(800)
        en_about_h1 = visible_text(page, "main h1")
        results["4_about_en_h1"] = en_about_h1
        results["4_about_en_has_continents"] = "continents" in en_about_h1.lower()

        browser.close()

    print(json.dumps(results, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
