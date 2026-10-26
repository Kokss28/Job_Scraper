import sys
import os
import time
from playwright.sync_api import sync_playwright

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

os.makedirs("web/public/test_screenshots", exist_ok=True)

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        print("Navigating to http://localhost:3000/dashboard ...")
        page.goto("http://localhost:3000/dashboard", wait_until="networkidle", timeout=30000)
        page.wait_for_timeout(2000)

        # 1. Verify layout changes
        print("\n--- Verifying Layout Elements ---")
        sidebar_col = page.locator("#sidebar-analytics-column")
        assert sidebar_col.is_visible(), "Sidebar analytics column beside map must be visible!"

        extract_btn = page.locator("#extract-live-postings-btn")
        assert extract_btn.count() == 0, "Extract live postings button must be removed!"
        print("Confirmed: Extract option is removed.")

        export_btn = page.locator("#sidebar-analytics-column #export-city-csv-btn")
        assert export_btn.is_visible(), "Export CSV button must be present at the end of the sidebar column!"
        print(f"Confirmed: Export button present with text: '{export_btn.text_content().strip()}'")

        bottom_charts = page.locator("#analytics-charts-section")
        assert bottom_charts.count() == 0, "Bottom analytics charts section must be removed!"
        print("Confirmed: Bottom charts section is removed.")

        # 2. Verify Default (All India) in Sidebar Column
        print("\n--- Testing Default View (All India) ---")
        skills_chart_title = page.locator("#skills-pie-chart-title").text_content()
        print(f"Skills Chart Title: {skills_chart_title}")
        assert "All India" in skills_chart_title

        exp_chart_title = page.locator("#experience-chart-title").text_content()
        print(f"Experience Chart Title: {exp_chart_title}")
        assert "All India" in exp_chart_title

        # Capture All India Sidebar + Map screenshot
        page.locator("#sidebar-analytics-column").screenshot(
            path="web/public/test_screenshots/sidebar_charts_all_india.png"
        )
        print("Saved All India sidebar charts screenshot.")

        # 3. Click Coimbatore
        print("\n--- Testing Coimbatore City Selection ---")
        coimbatore_node = page.locator("#city-cluster-coimbatore")
        coimbatore_node.click()
        page.wait_for_timeout(1000)

        cbe_skills_chart_title = page.locator("#skills-pie-chart-title").text_content()
        print(f"Skills Chart Title: {cbe_skills_chart_title}")
        assert "Coimbatore" in cbe_skills_chart_title

        cbe_exp_chart_title = page.locator("#experience-chart-title").text_content()
        print(f"Experience Chart Title: {cbe_exp_chart_title}")
        assert "Coimbatore" in cbe_exp_chart_title

        cbe_export_btn = page.locator("#sidebar-analytics-column #export-city-csv-btn")
        print(f"Export button text: '{cbe_export_btn.text_content().strip()}'")
        assert "coimbatore" in cbe_export_btn.text_content().lower()

        # Capture Coimbatore screenshot
        page.locator("#sidebar-analytics-column").screenshot(
            path="web/public/test_screenshots/sidebar_charts_coimbatore.png"
        )
        print("Saved Coimbatore sidebar charts screenshot.")

        # 4. Click Delhi
        print("\n--- Testing Delhi City Selection ---")
        delhi_node = page.locator("#city-cluster-delhi")
        delhi_node.click()
        page.wait_for_timeout(1000)

        delhi_skills_chart_title = page.locator("#skills-pie-chart-title").text_content()
        print(f"Skills Chart Title: {delhi_skills_chart_title}")
        assert "Delhi" in delhi_skills_chart_title

        delhi_exp_chart_title = page.locator("#experience-chart-title").text_content()
        print(f"Experience Chart Title: {delhi_exp_chart_title}")
        assert "Delhi" in delhi_exp_chart_title

        delhi_export_btn = page.locator("#sidebar-analytics-column #export-city-csv-btn")
        print(f"Export button text: '{delhi_export_btn.text_content().strip()}'")
        assert "delhi" in delhi_export_btn.text_content().lower()

        # Capture Delhi screenshot
        page.locator("#sidebar-analytics-column").screenshot(
            path="web/public/test_screenshots/sidebar_charts_delhi.png"
        )
        print("Saved Delhi sidebar charts screenshot.")

        # Capture full dashboard view showing map alongside the 2 charts and live table below
        page.screenshot(path="web/public/test_screenshots/dashboard_with_sidebar_charts.png", full_page=False)
        print("Saved full dashboard screenshot with sidebar charts.")

        browser.close()
        print("\nALL VERIFICATION CHECKS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    run()
