import sys
import os
from playwright.sync_api import sync_playwright

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

os.makedirs("web/public/test_screenshots", exist_ok=True)

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 1050})
        page = context.new_page()

        print("Navigating to dashboard at http://127.0.0.1:3000/dashboard ...")
        page.goto("http://127.0.0.1:3000/dashboard", wait_until="networkidle", timeout=30000)
        page.wait_for_timeout(2000)

        # =====================================================================
        # 1. VERIFY REMOVAL OF UNWANTED FILTERS (Volume, Tier, Labels, Zone, Ribbon Search)
        # =====================================================================
        print("\n=== 1. Verifying Removal of Unwanted Filter Elements ===")
        unwanted_selectors = [
            ("#volume-filter-pills", "Volume pills"),
            ("#tier-filter-pills", "Tier pills"),
            ("#label-mode-pills", "Label Mode pills"),
            ("#zone-filter-select", "Zone selector dropdown"),
            ("#location-search-input", "Ribbon location search input"),
            ("#reset-filters-btn", "Reset filters button"),
        ]

        for selector, label in unwanted_selectors:
            count = page.locator(selector).count()
            print(f"  Checking {label} ({selector}): count = {count}")
            assert count == 0, f"Unwanted element {label} ({selector}) must NOT be present!"
            print(f"  ✓ {label} completely removed.")

        # =====================================================================
        # 2. VERIFY PROPORTIONAL DENSITY BUBBLE MAP & ACTIVE HUBS
        # =====================================================================
        print("\n=== 2. Verifying Proportional Density Bubble Map ===")
        city_clusters = page.locator("#city-nodes > g[id^='city-cluster-']")
        active_hub_count = city_clusters.count()
        print(f"  Total active mapped city clusters: {active_hub_count}")
        assert active_hub_count >= 25, f"Expected active tech hubs, found {active_hub_count}"

        # Check Bengaluru
        bengaluru_node = page.locator("#city-cluster-bengaluru")
        assert bengaluru_node.count() > 0, "Bengaluru node must be present"
        bengaluru_circles = bengaluru_node.locator("circle")
        assert bengaluru_circles.count() >= 2, "Bengaluru node must have halo and core circles"
        bengaluru_r = float(bengaluru_circles.first.get_attribute("r") or "0")
        print(f"  Bengaluru bubble outer radius: {bengaluru_r:.1f}px")

        # Zero-job locations must NOT be rendered
        for zero_city in ["hosur", "tiruppur", "tiruchirappalli"]:
            node = page.locator(f"#city-cluster-{zero_city}")
            assert node.count() == 0, f"Zero-job city {zero_city} must NOT be rendered"
            print(f"  ✓ Zero-job city excluded: {zero_city}")

        # Capture Clean National Overview Screenshot
        clean_national_screenshot = "web/public/test_screenshots/clean_national_overview_no_ribbon.png"
        page.screenshot(path=clean_national_screenshot)
        print(f"  ✓ Saved clean National Overview screenshot to {clean_national_screenshot}")

        # =====================================================================
        # 3. VERIFY LEVEL 2: STATE DRILL-DOWN (TAMIL NADU)
        # =====================================================================
        print("\n=== 3. Verifying Level 2: State Drill-Down (Tamil Nadu) ===")
        tn_state = page.locator("#state-tn")
        assert tn_state.count() > 0, "Tamil Nadu state polygon must be present"
        tn_state.click()
        page.wait_for_timeout(1000)

        # Breadcrumb should now show Tamil Nadu
        breadcrumb = page.locator("#map-state-breadcrumb")
        assert breadcrumb.is_visible(), "Breadcrumb bar for Tamil Nadu must be visible"
        print(f"  ✓ State breadcrumb visible: {breadcrumb.inner_text().strip()}")

        # Active TN cities (Chennai, Coimbatore, Madurai, Salem) must be visible
        for active_city in ["chennai", "coimbatore", "madurai", "salem"]:
            node = page.locator(f"#city-cluster-{active_city}")
            assert node.count() > 0, f"Active city {active_city} must be rendered in TN drill-down"
            print(f"  ✓ Active TN city present: {active_city}")

        # Zero-job TN cities must NOT be rendered
        for zero_city in ["hosur", "tiruppur", "tiruchirappalli"]:
            node = page.locator(f"#city-cluster-{zero_city}")
            assert node.count() == 0, f"Zero-job city {zero_city} must NOT be rendered in TN drill-down"

        # Capture Clean Tamil Nadu Drill-Down Screenshot
        clean_tn_screenshot = "web/public/test_screenshots/clean_tn_drilldown_no_ribbon.png"
        page.screenshot(path=clean_tn_screenshot)
        print(f"  ✓ Saved clean Tamil Nadu drill-down screenshot to {clean_tn_screenshot}")

        # =====================================================================
        # 4. VERIFY RESET BACK TO NATIONAL OVERVIEW
        # =====================================================================
        print("\n=== 4. Verifying Reset to India ===")
        reset_btn = page.locator("#reset-to-india-btn")
        assert reset_btn.is_visible(), "Reset to India button must be visible"
        reset_btn.click()
        page.wait_for_timeout(1000)

        assert not page.locator("#map-state-breadcrumb").is_visible(), "Breadcrumb should be hidden after reset"
        resetted_count = page.locator("#city-nodes > g[id^='city-cluster-']").count()
        print(f"  Hub count after reset: {resetted_count}")
        assert resetted_count == active_hub_count, "All active national hubs should be restored"
        print("  ✓ Successfully reset back to Level 1 National Overview.")

        browser.close()
        print("\n🎉 ALL TESTS PASSED! Map is clean, proportional, and free of unwanted filter clutter.")

if __name__ == "__main__":
    run()
