"""Phase 2.1 verification — region picker actually switches locale + persists currency."""
from playwright.sync_api import sync_playwright
import json
import os
import sys

# Force UTF-8 stdout so flag emojis / Chinese characters don't crash on Windows cp950.
sys.stdout.reconfigure(encoding="utf-8")

BASE = "http://localhost:5175"
OUT_DIR = r"C:\Users\TING\Documents\Astro8\AI\buy\_docs\screenshots_phase2_1"
os.makedirs(OUT_DIR, exist_ok=True)


def main() -> None:
    results: dict = {}
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(viewport={"width": 1440, "height": 900})
        page = ctx.new_page()

        page_errors: list[str] = []
        page.on("pageerror", lambda err: page_errors.append(str(err)))

        # 1) Initial visit — confirm English
        page.goto(f"{BASE}/", wait_until="networkidle", timeout=45_000)
        page.wait_for_timeout(800)
        signin_initial = page.locator('header a:has-text("Sign in")').first.is_visible()
        results["1_initial_signin_en"] = signin_initial
        page.screenshot(path=os.path.join(OUT_DIR, "1_initial_en.png"))

        # 2) Open the picker, switch to Chinese
        page.locator('header [aria-haspopup="dialog"]').first.click()
        page.wait_for_selector('[role="dialog"][aria-label="Region, language and currency"]', state="visible")
        page.locator('button:has-text("中文")').first.click()
        # router.refresh — wait for re-render
        page.wait_for_timeout(2500)
        # Close picker if still open
        page.keyboard.press("Escape")
        page.wait_for_timeout(500)

        # 3) Verify navbar now shows Chinese sign-in label
        signin_after_zh = page.locator('header a:has-text("登录")').first
        results["2_signin_zh"] = signin_after_zh.is_visible()
        # Negative check — English label should be gone
        results["2_signin_en_gone"] = page.locator('header a:has-text("Sign in")').count() == 0
        page.screenshot(path=os.path.join(OUT_DIR, "2_after_zh.png"))

        # 4) Set currency to RWF (Rwandan Franc) via the picker
        page.locator('header [aria-haspopup="dialog"]').first.click()
        page.wait_for_selector('[role="dialog"][aria-label="Region, language and currency"]', state="visible")
        page.locator('[role="dialog"] button:has-text("RWF")').first.click()
        page.wait_for_timeout(400)
        page.keyboard.press("Escape")
        page.wait_for_timeout(300)

        # Picker trigger should now show RWF
        trigger_text = page.locator('header [aria-haspopup="dialog"]').first.inner_text()
        results["3_trigger_shows_rwf"] = "RWF" in trigger_text
        results["3_trigger_text"] = trigger_text.strip()

        # Read localStorage to confirm persistence
        ls_value = page.evaluate("() => localStorage.getItem('silkroad.region')")
        results["4_localstorage_persisted"] = ls_value
        ls_parsed = json.loads(ls_value) if ls_value else None
        results["4_currency_in_storage"] = ls_parsed and ls_parsed.get("currency") == "RWF"

        # 5) Hard reload — confirm currency sticks AND locale stays Chinese
        page.reload(wait_until="networkidle")
        page.wait_for_timeout(1000)
        results["5_after_reload_signin_zh"] = page.locator('header a:has-text("登录")').first.is_visible()
        trigger_after_reload = page.locator('header [aria-haspopup="dialog"]').first.inner_text()
        results["5_after_reload_trigger"] = trigger_after_reload.strip()
        results["5_rwf_persists"] = "RWF" in trigger_after_reload
        page.screenshot(path=os.path.join(OUT_DIR, "3_after_reload.png"))

        # 6) Switch back to English so leftover state doesn't bleed into next test runs
        page.locator('header [aria-haspopup="dialog"]').first.click()
        page.wait_for_selector('[role="dialog"][aria-label="Region, language and currency"]', state="visible")
        page.locator('button:has-text("English")').first.click()
        page.wait_for_timeout(2000)
        page.keyboard.press("Escape")
        results["6_back_to_en"] = page.locator('header a:has-text("Sign in")').first.is_visible()

        results["page_errors"] = page_errors

        browser.close()

    print(json.dumps(results, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
