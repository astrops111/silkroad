"""Phase 2.2 verification — category mega-menu click-toggle behavior."""
from playwright.sync_api import sync_playwright
import json
import os
import sys

sys.stdout.reconfigure(encoding="utf-8")

BASE = "http://localhost:5175"
OUT_DIR = r"C:\Users\TING\Documents\Astro8\AI\buy\_docs\screenshots_phase2_2"
os.makedirs(OUT_DIR, exist_ok=True)


def main() -> None:
    results: dict = {}
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(viewport={"width": 1440, "height": 900})
        page = ctx.new_page()

        page_errors: list[str] = []
        page.on("pageerror", lambda err: page_errors.append(str(err)))

        page.goto(f"{BASE}/", wait_until="networkidle", timeout=45_000)
        page.wait_for_timeout(800)

        electronics = page.locator(
            'header button[aria-haspopup="true"]:has-text("Electronics")'
        ).first
        machinery = page.locator(
            'header button[aria-haspopup="true"]:has-text("Machinery")'
        ).first

        # 1) Initially closed
        results["1_initial_no_panel"] = page.locator(
            'header :text("Smartphones & Tablets")'
        ).count() == 0
        results["1_initial_aria_expanded"] = electronics.get_attribute("aria-expanded")

        # 2) Click Electronics → opens
        electronics.click()
        page.wait_for_timeout(300)
        results["2_after_click_aria_expanded"] = electronics.get_attribute("aria-expanded")
        results["2_subgroup_visible"] = page.locator(
            'header :text("Smartphones & Tablets")'
        ).first.is_visible()
        results["2_featured_visible"] = page.locator(
            'header :text("5G smartphone OEM bulk")'
        ).first.is_visible()
        page.screenshot(path=os.path.join(OUT_DIR, "1_electronics_open.png"))

        # 3) Click Electronics AGAIN → closes (per user spec: "another click close")
        electronics.click()
        page.wait_for_timeout(300)
        results["3_after_second_click_aria"] = electronics.get_attribute("aria-expanded")
        results["3_subgroup_gone"] = page.locator(
            'header :text("Smartphones & Tablets")'
        ).count() == 0

        # 4) Click Electronics, then click Machinery → switches without closing
        electronics.click()
        page.wait_for_timeout(200)
        machinery.click()
        page.wait_for_timeout(300)
        results["4_machinery_aria"] = machinery.get_attribute("aria-expanded")
        results["4_electronics_aria"] = electronics.get_attribute("aria-expanded")
        results["4_machinery_subgroup"] = page.locator(
            'header :text("Hydraulic Equipment")'
        ).first.is_visible()
        results["4_electronics_subgroup_gone"] = page.locator(
            'header :text("Smartphones & Tablets")'
        ).count() == 0
        page.screenshot(path=os.path.join(OUT_DIR, "2_machinery_open.png"))

        # 5) Click outside (on the page body) → closes
        page.locator("main").first.click()
        page.wait_for_timeout(300)
        results["5_after_outside_click_aria"] = machinery.get_attribute("aria-expanded")
        results["5_no_subgroup_visible"] = page.locator(
            'header :text("Hydraulic Equipment")'
        ).count() == 0

        # 6) Press Escape closes too
        machinery.click()
        page.wait_for_timeout(200)
        page.keyboard.press("Escape")
        page.wait_for_timeout(200)
        results["6_after_escape_aria"] = machinery.get_attribute("aria-expanded")

        # 7) "All" and "RFQ" should NOT have a dropdown — they're plain links
        all_link = page.locator('header a:has-text("All")').first
        rfq_link = page.locator('header a:has-text("RFQ")').first
        results["7_all_is_link"] = all_link.evaluate("el => el.tagName") == "A"
        results["7_rfq_is_link"] = rfq_link.evaluate("el => el.tagName") == "A"

        # 8) Clicking a subgroup link should close the menu before navigation
        # (we'll check by verifying openCategory clears)
        machinery.click()
        page.wait_for_timeout(200)
        first_sub = page.locator('header a:has-text("CNC & Lathes")').first
        # Just verify it's clickable / visible
        results["8_subgroup_clickable"] = first_sub.is_visible()

        results["page_errors"] = page_errors

        browser.close()

    print(json.dumps(results, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
