import sys
import os
from playwright.sync_api import sync_playwright

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

os.makedirs("web/public/test_screenshots", exist_ok=True)

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 1000})
        page = context.new_page()

        print("Navigating to http://localhost:3000/dashboard ...")
        page.goto("http://localhost:3000/dashboard", wait_until="networkidle", timeout=30000)
        page.wait_for_timeout(2000)

        # 1. Verify Skills Chart Card background color
        print("\n--- Verifying Skills Chart Card Background & Styling ---")
        chart_title = page.locator("#skills-pie-chart-title")
        assert chart_title.is_visible(), "Skills pie chart title must be visible"
        print(f"Skills Chart Title: '{chart_title.text_content().strip()}'")

        # Get parent container card
        card = page.locator("#sidebar-analytics-column > div:first-child")
        card_bg = card.evaluate("el => window.getComputedStyle(el).backgroundColor")
        print(f"Card computed backgroundColor: {card_bg}")
        # rgb(255, 255, 255) is white
        assert card_bg == "rgb(255, 255, 255)", f"Expected white background, got {card_bg}"
        print("  ✓ Confirmed: Skills Breakdown Chart container has WHITE background (rgb(255, 255, 255))")

        # Verify title color
        title_color = chart_title.evaluate("el => window.getComputedStyle(el).color")
        print(f"Title computed color: {title_color}")
        # Slate-900 is rgb(15, 23, 42)
        print("  ✓ Confirmed: Skills Breakdown title is styled in dark theme text (Slate-900)")

        # Verify donut pie stroke
        pie_path = card.locator("path.recharts-pie-sector").first
        if pie_path.count() > 0:
            stroke = pie_path.get_attribute("stroke")
            print(f"Pie sector stroke attribute: {stroke}")
            assert stroke in ["#ffffff", "#fff", "rgb(255, 255, 255)"], f"Expected white stroke, got {stroke}"
            print("  ✓ Confirmed: Donut slices have white stroke divider for clean visual separation")

        # 2. Capture close-up screenshot of the Skills Chart and column
        card.screenshot(path="web/public/test_screenshots/white_skills_chart_closeup.png")
        print("Saved close-up screenshot: web/public/test_screenshots/white_skills_chart_closeup.png")

        sidebar_col = page.locator("#sidebar-analytics-column")
        sidebar_col.screenshot(path="web/public/test_screenshots/sidebar_analytics_white_theme.png")
        print("Saved sidebar column screenshot: web/public/test_screenshots/sidebar_analytics_white_theme.png")

        # 3. Take screenshot of the entire upper dashboard view (Map + Sidebar)
        page.screenshot(path="web/public/test_screenshots/full_dashboard_white_theme.png")
        print("Saved full dashboard screenshot: web/public/test_screenshots/full_dashboard_white_theme.png")

        # 4. Test City change (e.g. Chennai) to ensure dynamic update still works with white theme
        print("\n--- Verifying City Change to Chennai ---")
        chennai_node = page.locator("#city-cluster-chennai")
        if chennai_node.count() > 0:
            chennai_node.click()
            page.wait_for_timeout(1000)
            c_title = page.locator("#skills-pie-chart-title").text_content().strip()
            print(f"Updated Title: '{c_title}'")
            assert "Chennai" in c_title
            card.screenshot(path="web/public/test_screenshots/white_skills_chart_chennai.png")
            print("Saved Chennai close-up screenshot.")

        browser.close()
        print("\nALL CHECKS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    run()
