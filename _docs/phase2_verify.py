"""Phase 2 verification — dual-portal (Products/Commodities) + relocated content pages."""
from playwright.sync_api import sync_playwright
import json
import os

PAGES = [
    ("home_products", "http://localhost:5175/"),
    ("commodities", "http://localhost:5175/commodities"),
    ("how-it-works", "http://localhost:5175/how-it-works"),
    ("about", "http://localhost:5175/about"),
]

OUT_DIR = r"C:\Users\TING\Documents\Astro8\AI\buy\_docs\screenshots_phase2"
os.makedirs(OUT_DIR, exist_ok=True)


def main() -> None:
    results = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(viewport={"width": 1440, "height": 900})

        for name, url in PAGES:
            page = ctx.new_page()
            console_msgs: list[dict] = []
            page_errors: list[str] = []

            page.on("console", lambda msg: console_msgs.append(
                {"type": msg.type, "text": msg.text}
            ))
            page.on("pageerror", lambda err: page_errors.append(str(err)))

            try:
                resp = page.goto(url, wait_until="networkidle", timeout=60_000)
                status = resp.status if resp else None
            except Exception as e:
                results.append({
                    "page": name, "url": url, "error": f"goto failed: {e}",
                })
                page.close()
                continue

            page.wait_for_timeout(1200)

            shot_path = os.path.join(OUT_DIR, f"{name}.png")
            page.screenshot(path=shot_path, full_page=True)

            # Portal toggle: should be visible on every page
            portal_toggle_visible = page.locator(
                'header [role="tablist"][aria-label="Switch portal"]'
            ).first.is_visible()
            products_active = page.locator(
                'header a[role="tab"]:has-text("Products")'
            ).first.get_attribute("aria-selected")
            commodities_active = page.locator(
                'header a[role="tab"]:has-text("Commodities")'
            ).first.get_attribute("aria-selected")

            # Per-page structural assertions
            checks = {}
            if name == "home_products":
                checks["hero_h1"] = page.locator(
                    'h1:has-text("Source from 12,000")'
                ).first.is_visible()
                checks["product_rail"] = page.locator(
                    'h2:has-text("New on Silk Road")'
                ).first.is_visible()
                checks["editorial_band"] = page.locator(
                    'h2:has-text("Trade intelligence")'
                ).first.is_visible()
                checks["two_up_value"] = page.locator(
                    'h3:has-text("Trade assurance on every order")'
                ).first.is_visible()
            elif name == "commodities":
                checks["hero_h1"] = page.locator(
                    'h1:has-text("Export Africa")'
                ).first.is_visible()
                checks["product_rail"] = page.locator(
                    'h2:has-text("New from Africa")'
                ).first.is_visible()
                checks["two_up_value"] = page.locator(
                    'h3:has-text("Trade assurance on every order")'
                ).first.is_visible()
            elif name == "how-it-works":
                checks["trade_directions"] = page.locator(
                    'h2:has-text("What flows through Silk Road")'
                ).first.is_visible()
                checks["four_steps"] = page.locator(
                    'h2:has-text("Four steps, end to end")'
                ).first.is_visible()
            elif name == "about":
                checks["flow_diagram"] = page.locator(
                    'h2:has-text("How trade flows on Silk Road")'
                ).first.is_visible()
                checks["social_proof"] = page.locator(
                    ':text("Trusted by Businesses Across Two Continents")'
                ).first.is_visible()

            relevant_console = [
                m for m in console_msgs
                if m["type"] in ("error",)
                and "Hydration" not in m["text"]
                and "Download the React" not in m["text"]
                # 404s for /icons/* and other PWA assets are pre-existing noise
                and "Failed to load resource" not in m["text"]
            ]

            results.append({
                "page": name,
                "url": url,
                "status": status,
                "screenshot": shot_path,
                "portal_toggle_visible": portal_toggle_visible,
                "products_aria_selected": products_active,
                "commodities_aria_selected": commodities_active,
                **checks,
                "page_errors": page_errors,
                "console_errors_filtered": relevant_console[:5],
            })
            page.close()

        browser.close()

    print(json.dumps(results, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
