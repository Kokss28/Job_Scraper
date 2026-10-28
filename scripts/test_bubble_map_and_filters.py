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
        # 1. VALIDATING PROPORTIONAL DENSITY BUBBLE MAP & ZERO-JOB EXCLUSION
        # =====================================================================
        print("\n=== 1. Validating Active Hubs Only (Zero-Job Cities Excluded) ===")
        city_clusters = page.locator("#city-nodes > g[id^='city-cluster-']")
        initial_node_count = city_clusters.count()
        print(f"  Total active mapped city clusters: {initial_node_count}")
        # Only active hubs with jobs > 0 are rendered by default
        assert initial_node_count >= 25, f"Expected active tech hubs, found {initial_node_count}"

        # Check proportional bubble elements (outer halo and inner core)
        bengaluru_node = page.locator("#city-cluster-bengaluru")
        assert bengaluru_node.count() > 0, "Bengaluru node must be present"
        bengaluru_circles = bengaluru_node.locator("circle")
        assert bengaluru_circles.count() >= 2, "Each bubble node must have at least outer halo and inner core circles"
        
        # Major metro: Bengaluru (radius should be large, ~18-22px)
        bengaluru_halo = bengaluru_circles.first
        bengaluru_r = float(bengaluru_halo.get_attribute("r") or "0")
        print(f"  Bengaluru bubble outer radius: {bengaluru_r:.1f}px")
        assert bengaluru_r >= 15, f"Bengaluru radius should be >= 15px, got {bengaluru_r}"

        # Smaller hub: Madurai
        madurai_node = page.locator("#city-cluster-madurai")
        if madurai_node.count() > 0:
            madurai_r = float(madurai_node.locator("circle").first.get_attribute("r") or "0")
            print(f"  Madurai bubble outer radius: {madurai_r:.1f}px")
            assert madurai_r < bengaluru_r, f"Madurai radius ({madurai_r}) must be smaller than Bengaluru ({bengaluru_r})"
            print("  ✓ Mathematical proportional scaling confirmed: hiring volume correlates with bubble size!")

        # Check Bubble Size Scale in Legend
        legend_scale = page.locator("text='Bubble Size = Hiring Volume'")
        assert legend_scale.is_visible(), "Bottom legend must display 'Bubble Size = Hiring Volume'"
        print("  ✓ Cartographic legend scale verified.")

        # Capture Default Bubble Map screenshot
        page.screenshot(path="web/public/test_screenshots/bubble_map_default_view.png")
        print("  ✓ Saved default bubble density map screenshot.")

        # =====================================================================
        # 2. VALIDATING TAMIL NADU DRILL-DOWN: NO ZERO-JOB BADGES SHOWING!
        # =====================================================================
        print("\n=== 2. Validating State Drill-Down (Tamil Nadu) ===")
        tn_state = page.locator("#state-tn")
        tn_state.click()
        page.wait_for_timeout(1000)

        # In Tamil Nadu:
        # Active cities with jobs: Chennai (257), Coimbatore (41), Madurai (2), Salem (1)
        for active_city in ["chennai", "coimbatore", "madurai", "salem"]:
            node = page.locator(f"#city-cluster-{active_city}")
            assert node.count() > 0, f"Active city {active_city} MUST be rendered"
            print(f"  ✓ Active city present: {active_city}")

        # Cities with 0 jobs: Hosur (0), Tiruppur (0), Tiruchirappalli (0) MUST NOT BE RENDERED!
        for zero_city in ["hosur", "tiruppur", "tiruchirappalli"]:
            node = page.locator(f"#city-cluster-{zero_city}")
            assert node.count() == 0, f"Zero-job city {zero_city} MUST NOT be rendered on the map"
            print(f"  ✓ Zero-job city successfully excluded: {zero_city}")

        # Capture Clean Tamil Nadu Drill-Down Screenshot
        page.screenshot(path="web/public/test_screenshots/tamil_nadu_clean_no_zero_jobs.png")
        print("  ✓ Saved clean Tamil Nadu drill-down screenshot (Zero 0-job badges visible!).")

        # Reset back to India
        page.locator("#reset-to-india-btn").click()
        page.wait_for_timeout(500)

        # =====================================================================
        # 3. VALIDATING CONCEPT 1: MULTI-FILTER RIBBON CONTROLS
        # =====================================================================
        print("\n=== 3. Validating Concept 1: Multi-Filter Ribbon ===")

        # A. Volume Threshold Filter (50+ Metros)
        print("  --- Testing Volume Threshold Filter (50+) ---")
        vol_50_btn = page.locator("#volume-filter-pills button:has-text('50+')")
        vol_50_btn.click()
        page.wait_for_timeout(500)

        vol_50_count = page.locator("#city-nodes > g[id^='city-cluster-']").count()
        print(f"  Hubs visible with 50+ volume: {vol_50_count}")
        assert vol_50_count < initial_node_count
        assert vol_50_count >= 5

        # Check Reset Filters button is visible
        reset_filters_btn = page.locator("#reset-filters-btn")
        assert reset_filters_btn.is_visible()

        # B. City Tier Filter
        print("  --- Testing City Tier Filter (Tier 2) ---")
        page.locator("#volume-filter-pills button:has-text('All Active')").click()
        page.wait_for_timeout(300)

        tier_2_btn = page.locator("#tier-filter-pills button:has-text('Tier 2')")
        tier_2_btn.click()
        page.wait_for_timeout(500)

        tier_2_count = page.locator("#city-nodes > g[id^='city-cluster-']").count()
        print(f"  Hubs visible for Tier 2: {tier_2_count}")
        assert tier_2_count > 0

        # C. Zone Filter (South Zone)
        print("  --- Testing Zone Filter (South) ---")
        page.locator("#tier-filter-pills button:has-text('All')").click()
        page.wait_for_timeout(300)

        zone_select = page.locator("#zone-filter-select")
        zone_select.select_option("south")
        page.wait_for_timeout(500)

        south_count = page.locator("#city-nodes > g[id^='city-cluster-']").count()
        print(f"  Hubs visible in South Zone: {south_count}")
        assert south_count > 0 and south_count < initial_node_count

        # Northern states dimmed
        dl_state = page.locator("#state-dl")
        assert dl_state.get_attribute("opacity") == "0.35"
        # Southern state opacity 1
        ka_state = page.locator("#state-ka")
        assert ka_state.get_attribute("opacity") == "1"

        # D. Live Location Search
        print("  --- Testing Live Location Search ---")
        zone_select.select_option("all")
        page.wait_for_timeout(300)

        search_input = page.locator("#location-search-input")
        search_input.fill("pune")
        page.wait_for_timeout(500)

        pune_search_count = page.locator("#city-nodes > g[id^='city-cluster-']").count()
        print(f"  Hubs visible when searching 'pune': {pune_search_count}")
        assert pune_search_count == 1
        assert page.locator("#city-cluster-pune").is_visible()

        # Clear search
        page.locator("#clear-location-search-btn").click()
        page.wait_for_timeout(500)
        assert page.locator("#city-nodes > g[id^='city-cluster-']").count() == initial_node_count

        # Reset filters
        reset_filters_btn = page.locator("#reset-filters-btn")
        if reset_filters_btn.is_visible():
            reset_filters_btn.click()
            page.wait_for_timeout(500)

        # =====================================================================
        # 4. VALIDATING INTERACTIVE NODE SELECTION & ANALYTICS SYNC
        # =====================================================================
        print("\n=== 4. Validating Node Selection & Analytics Sync ===")
        mumbai_node = page.locator("#city-cluster-mumbai")
        mumbai_node.click()
        page.wait_for_timeout(1000)

        mumbai_text = mumbai_node.text_content()
        assert "★" in mumbai_text and "Mumbai" in mumbai_text

        donut_title = page.locator("#skills-pie-chart-title").text_content().strip()
        exp_title = page.locator("#experience-chart-title").text_content().strip()
        assert "Mumbai Skills Breakdown" in donut_title
        assert "Experience Demand (Mumbai)" in exp_title

        print("\n🎉 ALL TESTS (ACTIVE HUBS ONLY + AUTOMATIC DISCOVERY) PASSED PERFECTLY!")

        browser.close()

if __name__ == "__main__":
    run()
