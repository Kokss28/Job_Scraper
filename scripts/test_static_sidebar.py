import sys
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

ROOT_DIR = Path(__file__).resolve().parent.parent
SCREENSHOT_DIR = ROOT_DIR / "web" / "public" / "test_screenshots"
SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)
screenshot_file = SCREENSHOT_DIR / "static_sidebar_scrolled.png"

def test_static_sidebar():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        
        print("1. Navigating to http://localhost:3000/dashboard...")
        page.goto("http://localhost:3000/dashboard", timeout=60000, wait_until="domcontentloaded")
        page.wait_for_selector("#dashboard-container", timeout=30000)
        print("  ✓ Dashboard loaded.")

        # Locate sidebar
        aside = page.locator("aside")
        assert aside.is_visible(), "Sidebar (aside) is not visible"

        # Check initial position
        box_initial = aside.bounding_box()
        print(f"  ✓ Initial sidebar position: x={box_initial['x']}, y={box_initial['y']}, width={box_initial['width']}, height={box_initial['height']}")
        assert box_initial["y"] == 0, f"Expected sidebar y=0, got {box_initial['y']}"

        # Scroll right side main content down by 1000px
        main = page.locator("main")
        main.evaluate("el => el.scrollTop = 1000")
        page.wait_for_timeout(600)

        # Check sidebar position after scroll
        box_scrolled = aside.bounding_box()
        print(f"  ✓ Sidebar position after scrolling main 1000px: x={box_scrolled['x']}, y={box_scrolled['y']}")
        assert box_scrolled["y"] == 0, f"Sidebar moved! Expected y=0, got {box_scrolled['y']}"

        # Scroll main further to 2500px (near bottom)
        main.evaluate("el => el.scrollTop = 2500")
        page.wait_for_timeout(600)
        box_deep = aside.bounding_box()
        print(f"  ✓ Sidebar position after scrolling main 2500px: x={box_deep['x']}, y={box_deep['y']}")
        assert box_deep["y"] == 0, f"Sidebar moved! Expected y=0, got {box_deep['y']}"

        # Capture screenshot proving the right content is scrolled down while sidebar is static
        page.screenshot(path=str(screenshot_file))
        print(f"  ✓ Screenshot saved: {screenshot_file}")
        
        # Test also /dashboard/scraper
        print("2. Navigating to http://localhost:3000/dashboard/scraper...")
        page.goto("http://localhost:3000/dashboard/scraper", timeout=60000, wait_until="domcontentloaded")
        page.wait_for_selector("text=Configure Ingestion Run", timeout=30000)
        
        main_scraper = page.locator("main")
        main_scraper.evaluate("el => el.scrollTop = 800")
        page.wait_for_timeout(600)
        box_scraper = page.locator("aside").bounding_box()
        assert box_scraper["y"] == 0, f"Sidebar moved in scraper! Expected y=0, got {box_scraper['y']}"
        print(f"  ✓ Scraper page sidebar position after scroll: y={box_scraper['y']}")

        browser.close()
        print("\nALL STATIC SIDEBAR TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_static_sidebar()
