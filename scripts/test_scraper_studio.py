import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT_DIR = Path(__file__).resolve().parent.parent
SCREENSHOT_DIR = ROOT_DIR / "web" / "public" / "test_screenshots"
SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)
screenshot_file = SCREENSHOT_DIR / "scraper_studio_verified.png"

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        print("Navigating to http://localhost:3000/dashboard/scraper...")
        page.goto("http://localhost:3000/dashboard/scraper", timeout=60000, wait_until="domcontentloaded")
        page.wait_for_selector("text=Configure Ingestion Run", timeout=30000)
        print("Page loaded successfully.")

        # Test clicking preset buttons
        linkedin_only = page.get_by_role("button", name="LinkedIn Only")
        all_3 = page.get_by_role("button", name="All 3")
        naukri_only = page.get_by_role("button", name="Naukri Only")

        assert linkedin_only.is_visible(), "LinkedIn Only button not visible"
        assert all_3.is_visible(), "All 3 button not visible"
        assert naukri_only.is_visible(), "Naukri Only button not visible"
        print("Preset buttons verified.")

        # Click LinkedIn Only
        linkedin_only.click()
        page.wait_for_timeout(500)
        print("Clicked LinkedIn Only.")

        # Click All 3
        all_3.click()
        page.wait_for_timeout(500)
        print("Clicked All 3.")

        # Inspect table tab
        table_tab = page.get_by_role("button", name="Extracted Jobs Table")
        if table_tab.is_visible():
            table_tab.click()
            page.wait_for_timeout(500)
            print("Extracted Jobs Table tab clicked.")

        page.screenshot(path=str(screenshot_file), full_page=True)
        print(f"Screenshot successfully saved: {screenshot_file}")
        browser.close()

if __name__ == "__main__":
    run()
