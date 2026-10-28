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
        # 1. LEVEL 1: NATIONAL OVERVIEW VALIDATION
        # =====================================================================
        print("\n=== Validating Level 1: National Overview ===")

        # A. Horizontal pill carousel should be removed
        quick_pills = page.locator("[id^='quick-pill-']").count()
        assert quick_pills == 0, f"Expected 0 quick pills, found {quick_pills}"
        print("  ✓ Cramped horizontal pill carousel successfully removed.")

        # B. Corridors should be hidden by default
        corridors = page.locator("#talent-corridors")
        assert corridors.count() == 0, "Corridor lines should be hidden by default in National Overview"
        print("  ✓ Crisscrossing corridor lines hidden by default.")

        # C. Right-hand analytics titles should show All India
        donut_title = page.locator("#skills-pie-chart-title").text_content().strip()
        exp_title = page.locator("#experience-chart-title").text_content().strip()
        print(f"  Donut title: '{donut_title}'")
        print(f"  Experience title: '{exp_title}'")
        assert "India Skills Breakdown" in donut_title, f"Unexpected donut title: {donut_title}"
        assert "Experience Demand (All India)" in exp_title, f"Unexpected exp title: {exp_title}"
        print("  ✓ Analytics panel correctly bound to National scope.")

        # D. Top 10 Hubs vs subtle beacon dots check
        # Top 10 hub like Bengaluru should have a visible badge
        bengaluru_badge = page.locator("#city-cluster-bengaluru rect")
        assert bengaluru_badge.count() > 0, "Bengaluru should render a floating count badge in Top 10"
        print("  ✓ Top 10 Hub (Bengaluru) renders visible count badge.")

        # Capture Level 1 screenshot
        page.screenshot(path="web/public/test_screenshots/level1_national_overview.png")
        print("  Saved Level 1 National Overview screenshot.")

        # =====================================================================
        # 2. LEVEL 2: STATE DRILL-DOWN VALIDATION (TAMIL NADU)
        # =====================================================================
        print("\n=== Validating Level 2: State Drill-Down (Clicking Tamil Nadu) ===")
        tn_state = page.locator("#state-tn")
        assert tn_state.is_visible(), "Tamil Nadu polygon must exist and be visible"

        # Check tooltip title on state polygon
        tn_title = tn_state.locator("title").text_content()
        print(f"  Tamil Nadu hover title: '{tn_title}'")
        assert "Tamil Nadu" in tn_title and "Click to view all" in tn_title

        # Click Tamil Nadu polygon
        tn_state.click()
        page.wait_for_timeout(1000)

        # Check breadcrumb presence
        breadcrumb = page.locator("#map-state-breadcrumb")
        assert breadcrumb.is_visible(), "Breadcrumb navigation must be visible when state is selected"
        breadcrumb_text = breadcrumb.text_content().strip()
        print(f"  Breadcrumb text: '{breadcrumb_text}'")
        assert "All India" in breadcrumb_text and "Tamil Nadu" in breadcrumb_text
        print("  ✓ State breadcrumb active.")

        # Check camera zoom transform
        camera_layer = page.locator("#map-camera-layer")
        camera_style = camera_layer.get_attribute("style") or ""
        print(f"  Camera style: '{camera_style}'")
        assert "scale(" in camera_style, "Camera layer must have scaled transform applied"
        assert "scale(1)" not in camera_style, "Camera layer must zoom in (scale > 1)"
        print("  ✓ Camera smoothly zoomed into state bounding box.")

        # Check state polygon dimming: other states should be opacity 0.2, TN should be opacity 1
        tn_opacity = tn_state.get_attribute("opacity")
        assert tn_opacity == "1", f"Selected state opacity should be 1, got {tn_opacity}"
        
        # Check non-selected state (e.g. Maharashtra or Gujarat) opacity
        mh_state = page.locator("#state-mh")
        mh_opacity = mh_state.get_attribute("opacity")
        assert mh_opacity == "0.2", f"Non-selected state opacity should be 0.2, got {mh_opacity}"
        print("  ✓ Non-selected states dimmed to 0.2 opacity.")

        # Check local state cities revealed with full badges
        # Tamil Nadu should reveal Chennai, Coimbatore, Madurai, Salem, Trichy, Tiruppur, Hosur
        for city_id in ["chennai", "coimbatore", "madurai", "salem"]:
            city_node = page.locator(f"#city-cluster-{city_id}")
            assert city_node.count() > 0, f"City node {city_id} should be present in Tamil Nadu"
            rect_count = city_node.locator("rect").count()
            assert rect_count > 0, f"City node {city_id} in Tamil Nadu must render full badge rect"
        print("  ✓ All local Tier-2 and Tier-3 cities in Tamil Nadu rendered with visible label badges.")

        # Check right-hand analytics synchronization
        donut_title_tn = page.locator("#skills-pie-chart-title").text_content().strip()
        exp_title_tn = page.locator("#experience-chart-title").text_content().strip()
        print(f"  State Donut title: '{donut_title_tn}'")
        print(f"  State Experience title: '{exp_title_tn}'")
        assert "Tamil Nadu Skills Breakdown" in donut_title_tn, f"Unexpected: {donut_title_tn}"
        assert "Experience Demand (Tamil Nadu)" in exp_title_tn, f"Unexpected: {exp_title_tn}"
        print("  ✓ Right-hand analytics widgets synchronized to Tamil Nadu scope.")

        # Capture Level 2 screenshot
        page.screenshot(path="web/public/test_screenshots/level2_state_drilldown_tn.png")
        print("  Saved Level 2 Tamil Nadu Drill-Down screenshot.")

        # =====================================================================
        # 3. RESET VIEW VALIDATION
        # =====================================================================
        print("\n=== Validating Reset to Level 1 National Overview ===")
        reset_btn = page.locator("#reset-view-breadcrumb-btn")
        assert reset_btn.is_visible(), "Reset View button must be visible in Level 2"
        reset_btn.click()
        page.wait_for_timeout(1000)

        # Check camera zoomed back to 1
        camera_style_reset = page.locator("#map-camera-layer").get_attribute("style") or ""
        print(f"  Camera style after reset: '{camera_style_reset}'")
        assert "scale(1)" in camera_style_reset or "scale(1.000)" in camera_style_reset
        print("  ✓ Camera zoomed back to National scale (1).")

        # Check state opacities reset to 1
        mh_opacity_reset = page.locator("#state-mh").get_attribute("opacity")
        assert mh_opacity_reset == "1", f"State opacity after reset should be 1, got {mh_opacity_reset}"
        print("  ✓ All state opacities restored to 1.")

        # Check analytics restored to India
        donut_title_reset = page.locator("#skills-pie-chart-title").text_content().strip()
        exp_title_reset = page.locator("#experience-chart-title").text_content().strip()
        assert "India Skills Breakdown" in donut_title_reset
        assert "Experience Demand (All India)" in exp_title_reset
        print("  ✓ Analytics panel successfully restored to National scope.")

        # Capture Reset screenshot
        page.screenshot(path="web/public/test_screenshots/level1_restored_overview.png")
        print("  Saved Level 1 Restored Overview screenshot.")

        browser.close()
        print("\n🎉 ALL 2-LEVEL PROGRESSIVE DISCLOSURE ARCHITECTURE TESTS PASSED!")

if __name__ == "__main__":
    run()
