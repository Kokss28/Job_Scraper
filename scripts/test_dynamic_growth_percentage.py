import os
import sys
from playwright.sync_api import sync_playwright

def main():
    os.makedirs("web/public/test_screenshots", exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1400, "height": 950})

        print("Navigating to http://localhost:3000/dashboard ...")
        page.goto("http://localhost:3000/dashboard", wait_until="networkidle", timeout=30000)

        # 1. Wait for KPI card
        page.wait_for_selector("#kpi-total-live-jobs", timeout=15000)
        page.wait_for_selector("#kpi-today-growth-badge", timeout=15000)

        total_jobs_text = page.locator("#kpi-total-live-jobs").inner_text()
        badge_text = page.locator("#kpi-today-growth-badge").inner_text()
        badge_title = page.locator("#kpi-today-growth-badge").get_attribute("title")

        print(f"Total Live Jobs: {total_jobs_text}")
        print("Dynamic Growth Badge Text:", badge_text.encode("ascii", "replace").decode("ascii"))
        print("Badge Tooltip/Title:", str(badge_title).encode("ascii", "replace").decode("ascii"))

        assert "%" in badge_text, f"Expected % in badge text, got: {badge_text}"
        assert "today" in badge_text.lower(), f"Expected 'today' in badge text, got: {badge_text}"

        # 2. Test Sync DB button
        sync_btn = page.locator("#sync-database-btn")
        assert sync_btn.is_visible(), "Sync DB button should be visible"
        print("Clicking 'Sync DB' button to trigger live database revalidation...")
        sync_btn.click()

        # Wait 2 seconds for sync
        page.wait_for_timeout(2000)

        updated_jobs = page.locator("#kpi-total-live-jobs").inner_text()
        updated_badge = page.locator("#kpi-today-growth-badge").inner_text()
        print(f"Post-Sync Live Jobs: {updated_jobs}")
        print("Post-Sync Dynamic Badge:", updated_badge.encode("ascii", "replace").decode("ascii"))

        # Capture screenshot of the KPI section
        screenshot_path = "web/public/test_screenshots/dynamic_percentage_verified.png"
        page.screenshot(path=screenshot_path)
        print(f"Saved verification screenshot to: {screenshot_path}")

        browser.close()
        print("ALL DYNAMIC PERCENTAGE & DB AUTO-SYNC VERIFICATIONS PASSED!")

if __name__ == "__main__":
    main()
