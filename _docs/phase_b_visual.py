"""Phase B visual sanity check — capture rail prices on homepage."""
from playwright.sync_api import sync_playwright
import json, os, sys

sys.stdout.reconfigure(encoding="utf-8")
OUT_DIR = r"C:\Users\TING\Documents\Astro8\AI\buy\_docs\screenshots_phase_b"
os.makedirs(OUT_DIR, exist_ok=True)


def grab_prices(page) -> list[str]:
    return page.evaluate(
        """() => {
            const rail = document.querySelector('section.py-16 div.flex.gap-4.overflow-x-auto');
            if (!rail) return [];
            return Array.from(rail.querySelectorAll('a span'))
                .map(el => el.textContent?.trim() ?? '')
                .filter(t => /^[A-Z]{3}\\s/.test(t));
        }""",
    )


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()

    # Reset state
    page.goto("http://localhost:5175/", wait_until="networkidle")
    page.evaluate("() => { localStorage.clear(); }")
    page.context.clear_cookies()
    page.reload(wait_until="networkidle")
    page.wait_for_timeout(800)
    page.evaluate("() => window.scrollTo(0, 1400)")
    page.wait_for_timeout(500)
    page.screenshot(path=os.path.join(OUT_DIR, "home_rail_usd.png"))

    usd = grab_prices(page)
    print("USD rail prices:", usd)

    # Switch to RWF
    page.evaluate("() => window.scrollTo(0, 0)")
    page.locator('header [aria-haspopup="dialog"]').first.click()
    page.wait_for_selector('[role="dialog"]')
    page.locator('[role="dialog"] button:has-text("RWF")').first.click()
    page.wait_for_timeout(400)
    page.keyboard.press("Escape")
    page.wait_for_timeout(800)
    page.evaluate("() => window.scrollTo(0, 1400)")
    page.wait_for_timeout(500)
    page.screenshot(path=os.path.join(OUT_DIR, "home_rail_rwf.png"))
    rwf = grab_prices(page)
    print("RWF rail prices:", rwf)

    browser.close()
