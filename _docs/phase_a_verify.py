"""Phase A verification — portal-aware mega-menus + URL filter integration."""
from playwright.sync_api import sync_playwright
import json
import os
import sys

sys.stdout.reconfigure(encoding="utf-8")

BASE = "http://localhost:5175"
OUT_DIR = r"C:\Users\TING\Documents\Astro8\AI\buy\_docs\screenshots_phase_a"
os.makedirs(OUT_DIR, exist_ok=True)


def main() -> None:
    results: dict = {}
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(viewport={"width": 1440, "height": 900})
        page = ctx.new_page()

        page_errors: list[str] = []
        page.on("pageerror", lambda err: page_errors.append(str(err)))

        # 1) Products portal — mega-menu should show product categories only
        page.goto(f"{BASE}/", wait_until="networkidle", timeout=45_000)
        page.wait_for_timeout(500)
        results["products_portal_has_electronics"] = page.locator(
            'header button:has-text("Electronics")'
        ).count() > 0
        results["products_portal_has_machinery"] = page.locator(
            'header button:has-text("Machinery")'
        ).count() > 0
        results["products_portal_no_coffee"] = page.locator(
            'header button:has-text("Coffee")'
        ).count() == 0
        results["products_portal_no_minerals"] = page.locator(
            'header button:has-text("Minerals")'
        ).count() == 0

        # 2) Click Electronics → menu opens; click "Smartphones & Tablets"
        page.locator('header button:has-text("Electronics")').first.click()
        page.wait_for_timeout(300)
        page.locator('header a:has-text("Smartphones & Tablets")').first.click()
        page.wait_for_load_state("networkidle", timeout=20_000)
        page.wait_for_timeout(800)

        # 3) Should land on /marketplace?category=electronics&sub=phones
        url = page.url
        results["3_landed_on_marketplace"] = "/marketplace" in url
        results["3_has_category_param"] = "category=electronics" in url
        results["3_has_sub_param"] = "sub=phones" in url

        # 4) The h1 should reflect the active category
        h1_text = page.locator("main h1").first.inner_text()
        results["4_h1_text"] = h1_text
        results["4_h1_is_category"] = "Electronics" in h1_text

        # 5) The active filter chip should be visible
        results["5_filter_chip_category"] = page.locator(
            'main :text("Electronics & Components")'
        ).first.is_visible()
        results["5_filter_chip_sub"] = page.locator(
            'main :text("phones")'
        ).first.is_visible()

        # 6) Only Electronics & Components products should show
        product_categories = page.locator(
            '[class*="grid"] :text("Electronics & Components")'
        ).count()
        results["6_filtered_product_count"] = page.locator(
            'main h3'
        ).count()
        page.screenshot(path=os.path.join(OUT_DIR, "1_marketplace_filtered.png"))

        # 7) Click "Clear" → returns to unfiltered
        page.locator('main button:has-text("Clear")').first.click()
        page.wait_for_timeout(500)
        results["7_after_clear_url"] = page.url
        results["7_no_category_param"] = "category=" not in page.url

        # 8) Switch to Commodities portal via toggle
        page.locator('header a[role="tab"]:has-text("Commodities")').first.click()
        page.wait_for_load_state("networkidle", timeout=20_000)
        page.wait_for_timeout(800)
        results["8_now_on_commodities"] = "/commodities" in page.url and "browse" not in page.url

        # 9) Mega-menu should now show commodity categories only
        results["9_commodities_portal_has_coffee"] = page.locator(
            'header button:has-text("Coffee")'
        ).count() > 0
        results["9_commodities_portal_has_cocoa"] = page.locator(
            'header button:has-text("Cocoa")'
        ).count() > 0
        results["9_commodities_portal_no_electronics"] = page.locator(
            'header button:has-text("Electronics")'
        ).count() == 0
        results["9_commodities_portal_no_machinery"] = page.locator(
            'header button:has-text("Machinery")'
        ).count() == 0

        # 10) Click Coffee → menu opens; click "Yirgacheffe Grade 1" (featured promo)
        page.locator('header button:has-text("Coffee")').first.click()
        page.wait_for_timeout(300)
        page.locator('header a:has-text("Arabica Green Beans")').first.click()
        page.wait_for_load_state("networkidle", timeout=20_000)
        page.wait_for_timeout(800)

        # 11) Should land on /commodities/browse?category=coffee&sub=arabica
        results["11_landed_on_browse"] = "/commodities/browse" in page.url
        results["11_has_coffee_filter"] = "category=coffee" in page.url
        results["11_has_arabica_sub"] = "sub=arabica" in page.url

        h1_browse = page.locator("main h1").first.inner_text()
        results["11_browse_h1"] = h1_browse
        results["11_browse_filtered"] = page.locator(
            'main :text("Arabica")'
        ).count() > 0
        page.screenshot(path=os.path.join(OUT_DIR, "2_commodities_browse_filtered.png"))

        # 12) Switch back to Products portal — should land on /
        page.locator('header a[role="tab"]:has-text("Products")').first.click()
        page.wait_for_load_state("networkidle", timeout=20_000)
        page.wait_for_timeout(500)
        results["12_back_on_home"] = page.url.rstrip("/") == BASE.rstrip("/")

        results["page_errors"] = page_errors
        browser.close()

    print(json.dumps(results, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
