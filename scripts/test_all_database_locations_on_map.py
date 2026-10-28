import sys
import os
import csv
from playwright.sync_api import sync_playwright

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

os.makedirs("web/public/test_screenshots", exist_ok=True)

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 1100})
        page = context.new_page()

        print("Navigating to http://localhost:3000/dashboard ...")
        page.goto("http://localhost:3000/dashboard", wait_until="networkidle", timeout=30000)
        page.wait_for_timeout(2000)

        # 1. Check all rendered city clusters
        clusters = page.locator("#city-nodes > g").all()
        print(f"Total city clusters rendered on map: {len(clusters)}")
        assert len(clusters) >= 20, f"Expected at least 20 active locations on map, found {len(clusters)}"

        # Check that specific database locations exist
        expected_cities = [
            "delhi", "mumbai", "pune", "hyderabad", "kolkata", 
            "bengaluru", "chennai", "coimbatore", "ahmedabad", 
            "kochi", "jaipur", "chandigarh", "indore", "bhubaneswar", "lucknow"
        ]
        for c in expected_cities:
            loc = page.locator(f"#city-cluster-{c}")
            assert loc.is_visible(), f"City cluster for '{c}' must be visible on map"
            print(f"  ✓ City cluster visible on map: {c}")

        # 2. Test clicking Ahmedabad on the map
        print("\n--- Testing Ahmedabad Selection on Map ---")
        ahmedabad_node = page.locator("#city-cluster-ahmedabad")
        ahmedabad_node.click()
        page.wait_for_timeout(1000)

        region_kpi = page.locator("#dashboard-container").inner_text()
        assert "Ahmedabad" in region_kpi, "Dashboard should reflect Ahmedabad selection"
        print("  ✓ Selected Ahmedabad on map: KPI updated to Ahmedabad")

        # 3. Test clicking Kochi on the map
        print("\n--- Testing Kochi Selection on Map ---")
        kochi_node = page.locator("#city-cluster-kochi")
        kochi_node.click()
        page.wait_for_timeout(1000)

        region_kpi = page.locator("#dashboard-container").inner_text()
        assert "Kochi" in region_kpi, "Dashboard should reflect Kochi selection"
        print("  ✓ Selected Kochi on map: KPI updated to Kochi")

        # 4. Test clicking Jaipur on the map
        print("\n--- Testing Jaipur Selection on Map ---")
        jaipur_node = page.locator("#city-cluster-jaipur")
        jaipur_node.click()
        page.wait_for_timeout(1000)

        region_kpi = page.locator("#dashboard-container").inner_text()
        assert "Jaipur" in region_kpi, "Dashboard should reflect Jaipur selection"
        print("  ✓ Selected Jaipur on map: KPI updated to Jaipur")

        # 5. Test clicking Gujarat state contour to select Ahmedabad
        print("\n--- Testing State Contour Click (Gujarat) ---")
        page.locator("#state-gj").click(force=True)
        page.wait_for_timeout(1000)
        assert "Ahmedabad" in page.locator("#dashboard-container").inner_text()
        print("  ✓ Clicked Gujarat state contour -> Selected Ahmedabad hub")

        # 6. Capture full screenshot of map with all locations
        page.locator("#reset-to-india-btn").click()
        page.wait_for_timeout(1000)
        map_card = page.locator("div.lg\\:col-span-7")
        map_card.screenshot(path="web/public/test_screenshots/map_all_database_locations.png")
        print("\nSaved screenshot of map with all locations to web/public/test_screenshots/map_all_database_locations.png")

        browser.close()
        print("\nALL DATABASE LOCATION MAP CHECKS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    run()
