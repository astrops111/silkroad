"""Phase B verification — currency code prefix + conversion on switch."""
from playwright.sync_api import sync_playwright
import json
import os
import sys
import re

sys.stdout.reconfigure(encoding="utf-8")

BASE = "http://localhost:5175"
OUT_DIR = r"C:\Users\TING\Documents\Astro8\AI\buy\_docs\screenshots_phase_b"
os.makedirs(OUT_DIR, exist_ok=True)


def collect_prices(page) -> list[str]:
    """Read all price strings rendered inside product rails on the current page."""
    return page.evaluate(
        """() => {
            const rail = document.querySelector('[class*="overflow-x-auto"]');
            if (!rail) return [];
            return Array.from(rail.querySelectorAll('a > div + div > div > span:first-child'))
                .map(el => el.textContent?.trim() ?? '')
                .filter(Boolean);
        }""",
    )


def main() -> None:
    results: dict = {}
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(viewport={"width": 1440, "height": 900})

        # Reset state by clearing storage on a fresh page
        page = ctx.new_page()
        page.goto(f"{BASE}/", wait_until="networkidle", timeout=45_000)
        page.evaluate("() => { localStorage.clear(); }")
        page.context.clear_cookies()
        page.reload(wait_until="networkidle")
        page.wait_for_timeout(800)

        # 1) Default currency = USD; product prices should start with "USD "
        page.evaluate("() => document.querySelector('main')?.scrollIntoView()")
        page.wait_for_timeout(400)
        usd_prices = collect_prices(page)
        results["1_initial_prices"] = usd_prices[:6]
        results["1_all_start_with_USD"] = all(p.startswith("USD ") for p in usd_prices) if usd_prices else False
        page.screenshot(path=os.path.join(OUT_DIR, "1_default_usd.png"))

        # 2) Open region picker, switch to RWF
        page.locator('header [aria-haspopup="dialog"]').first.click()
        page.wait_for_selector('[role="dialog"][aria-label="Region, language and currency"]', state="visible")
        page.locator('[role="dialog"] button:has-text("RWF")').first.click()
        page.wait_for_timeout(400)
        page.keyboard.press("Escape")
        page.wait_for_timeout(800)

        rwf_prices = collect_prices(page)
        results["2_rwf_prices"] = rwf_prices[:6]
        results["2_all_start_with_RWF"] = all(p.startswith("RWF ") for p in rwf_prices) if rwf_prices else False

        # The rate is RWF 1350/USD. CNC lathe was USD 8,500 → should be ~RWF 11,475,000
        # Look for at least one price in millions for big-ticket items
        big_prices = [p for p in rwf_prices if re.match(r"^RWF \d{1,3}(,\d{3}){2,}", p)]
        results["2_has_big_rwf_amount"] = len(big_prices) > 0
        page.screenshot(path=os.path.join(OUT_DIR, "2_rwf_converted.png"))

        # 3) Switch to CNY (Chinese Yuan)
        page.locator('header [aria-haspopup="dialog"]').first.click()
        page.wait_for_selector('[role="dialog"]', state="visible")
        page.locator('[role="dialog"] button:has-text("CNY")').first.click()
        page.wait_for_timeout(400)
        page.keyboard.press("Escape")
        page.wait_for_timeout(800)
        cny_prices = collect_prices(page)
        results["3_cny_prices"] = cny_prices[:6]
        results["3_all_start_with_CNY"] = all(p.startswith("CNY ") for p in cny_prices) if cny_prices else False

        # 4) Visit /commodities/browse and check those cards too
        page.goto(f"{BASE}/commodities/browse", wait_until="networkidle", timeout=45_000)
        page.wait_for_timeout(800)
        browse_prices = page.evaluate(
            """() => Array.from(document.querySelectorAll('main a div.p-5 span:first-child'))
                .map(el => el.textContent?.trim() ?? '')
                .filter(Boolean)
            """,
        )
        results["4_browse_prices"] = browse_prices[:6]
        results["4_browse_all_CNY"] = all(p.startswith("CNY ") for p in browse_prices) if browse_prices else False
        page.screenshot(path=os.path.join(OUT_DIR, "3_browse_cny.png"))

        # 5) Switch back to USD, reload, prices stick
        page.locator('header [aria-haspopup="dialog"]').first.click()
        page.wait_for_selector('[role="dialog"]', state="visible")
        page.locator('[role="dialog"] button:has-text("USD")').first.click()
        page.wait_for_timeout(400)
        page.keyboard.press("Escape")
        page.wait_for_timeout(500)
        page.reload(wait_until="networkidle")
        page.wait_for_timeout(800)
        reloaded_prices = page.evaluate(
            """() => Array.from(document.querySelectorAll('main a div.p-5 span:first-child'))
                .map(el => el.textContent?.trim() ?? '')
                .filter(Boolean)
            """,
        )
        results["5_after_reload_prices"] = reloaded_prices[:3]
        results["5_persists_as_USD"] = all(p.startswith("USD ") for p in reloaded_prices) if reloaded_prices else False

        browser.close()

    print(json.dumps(results, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
