"""Phase 1 shell verification — IKEA-style redesign of Silk Road navbar/footer/about."""
from playwright.sync_api import sync_playwright
import json
import os

PAGES = [
    ("home", "http://localhost:5175/"),
    ("about", "http://localhost:5175/about"),
    ("marketplace", "http://localhost:5175/marketplace"),
]

OUT_DIR = r"C:\Users\TING\Documents\Astro8\AI\buy\_docs\screenshots_phase1"
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
                resp = page.goto(url, wait_until="networkidle", timeout=45_000)
                status = resp.status if resp else None
            except Exception as e:
                results.append({
                    "page": name, "url": url, "error": f"goto failed: {e}",
                })
                page.close()
                continue

            page.wait_for_timeout(800)  # allow font/animations to settle

            shot_path = os.path.join(OUT_DIR, f"{name}.png")
            page.screenshot(path=shot_path, full_page=True)

            # --- Structural assertions ---
            # Navbar: <header> with the 3 visible rows on lg viewport (1440px)
            header = page.locator("header").first
            header_visible = header.is_visible()

            # Search input
            search_visible = page.locator(
                'input[name="q"], input[type="search"]'
            ).first.is_visible()

            # Category strip pills (look for "Electronics" pill in nav)
            category_strip_visible = page.locator(
                'header a:has-text("Electronics")'
            ).first.is_visible()

            # Utility row (look for "About" link in top-most utility row inside header)
            utility_about_visible = page.locator(
                'header a:has-text("About")'
            ).first.is_visible()

            # Footer 5 columns (count h4 headings inside footer)
            footer = page.locator("footer").first
            footer_visible = footer.is_visible()
            col_headings = footer.locator("h4").all_inner_texts() if footer_visible else []

            # Newsletter form in footer
            newsletter_input = footer.locator('input[type="email"]').count() if footer_visible else 0

            relevant_console = [
                m for m in console_msgs
                if m["type"] in ("error", "warning")
                and "Hydration" not in m["text"]
                and "DevTools" not in m["text"]
                and "Download the React" not in m["text"]
            ]

            results.append({
                "page": name,
                "url": url,
                "status": status,
                "screenshot": shot_path,
                "navbar_header_visible": header_visible,
                "navbar_search_visible": search_visible,
                "navbar_category_strip_visible": category_strip_visible,
                "navbar_utility_about_visible": utility_about_visible,
                "footer_visible": footer_visible,
                "footer_column_headings": col_headings,
                "footer_newsletter_inputs": newsletter_input,
                "console_errors_warnings": relevant_console[:10],
                "page_errors": page_errors,
            })
            page.close()

        browser.close()

    print(json.dumps(results, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
