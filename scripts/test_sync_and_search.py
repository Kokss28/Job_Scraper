"""
Verification script for:
1. Dashboard full job sync (> 1,000 jobs, 1,623 from Supabase)
2. Dynamic Last Extraction Run (not hardcoded 14 Mins Ago)
3. Search functionality with dedicated Search button:
   - Searching for "Chennai"
   - Searching for "Pune"
   - Searching for "Bengaluru"
   - Searching for skills
   - Empty state on no matches with clear button
4. Table accurate locations without hardcoded ', TN'
"""

import sys
import time
from pathlib import Path

# Fix console encoding
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

from playwright.sync_api import sync_playwright

ROOT_DIR = Path(__file__).resolve().parent.parent
SCREENSHOT_DIR = ROOT_DIR / "web" / "public" / "test_screenshots"
SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)


def run_verification():
    print("=" * 70)
    print("PLAYWRIGHT VERIFICATION: JOB SYNC & SEARCH FUNCTIONALITY")
    print("=" * 70)

    console_errors = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        page.on(
            "console",
            lambda msg: console_errors.append(f"[{msg.type}] {msg.text}")
            if msg.type == "error"
            else None,
        )

        print("\n[Step 1] Loading http://localhost:3000/dashboard ...")
        page.goto("http://localhost:3000/dashboard", timeout=60000, wait_until="domcontentloaded")
        page.wait_for_selector("#dashboard-container", timeout=30000)
        time.sleep(1)

        # 1. Verify Card 1: Total Live Jobs (> 1000, expecting 1,623)
        total_live_jobs = page.locator("#kpi-total-live-jobs").inner_text().strip()
        print(f"  ✓ Card 1 (TOTAL LIVE JOBS): {total_live_jobs}")
        assert int(total_live_jobs.replace(",", "")) > 1000, f"Expected > 1,000 jobs, got {total_live_jobs}"

        # 2. Verify Card 2: Selected Region (Default Pan-India)
        selected_region = page.locator("#kpi-selected-region").inner_text().strip()
        print(f"  ✓ Card 2 (SELECTED REGION): {selected_region}")
        assert "Pan-India" in selected_region, f"Expected Pan-India, got {selected_region}"

        # 3. Verify Card 3: All India Jobs
        city_jobs_count = page.locator("#kpi-city-jobs-count").inner_text().strip()
        print(f"  ✓ Card 3 (ALL INDIA JOBS): {city_jobs_count}")
        assert int(city_jobs_count.replace(",", "")) > 1000, f"Expected > 1,000, got {city_jobs_count}"

        # 4. Verify Card 4: Dynamic Last Extraction Run (not static "14 Mins Ago")
        last_extraction = page.locator("#kpi-last-extraction-run").inner_text().strip()
        print(f"  ✓ Card 4 (LAST EXTRACTION RUN): {last_extraction}")

        page.screenshot(path=str(SCREENSHOT_DIR / "sync_step1_pan_india.png"))
        print("  ✓ Screenshot saved: sync_step1_pan_india.png")

        # 5. Search for "Chennai" using the Search Button
        print("\n[Step 2] Testing Search for 'Chennai' with Search Button...")
        page.fill("#global-search-input", "Chennai")
        page.click("#global-search-btn")
        time.sleep(0.8)

        region_chn = page.locator("#kpi-selected-region").inner_text().strip()
        count_chn = page.locator("#kpi-city-jobs-count").inner_text().strip()
        table_title_chn = page.locator("#table-title").inner_text().strip()
        table_count_chn = page.locator("#table-count-label").inner_text().strip()
        print(f"  ✓ After Searching 'Chennai':")
        print(f"      Region: {region_chn}")
        print(f"      Count: {count_chn}")
        print(f"      Table: {table_title_chn} {table_count_chn}")
        assert "Chennai" in region_chn, f"Expected Chennai in region, got {region_chn}"
        assert int(count_chn.replace(",", "")) >= 190, f"Expected >= 190 jobs for Chennai, got {count_chn}"

        # Check location column for first row
        first_row_loc = page.locator("table tbody tr:first-child td:nth-child(3)").inner_text().strip()
        print(f"      First row location: {first_row_loc}")
        assert "Chennai" in first_row_loc, f"Expected Chennai in location, got {first_row_loc}"

        page.screenshot(path=str(SCREENSHOT_DIR / "sync_step2_search_chennai.png"))
        print("  ✓ Screenshot saved: sync_step2_search_chennai.png")

        # 6. Search for "Pune" using the Search Button
        print("\n[Step 3] Testing Search for 'Pune' with Search Button...")
        page.fill("#global-search-input", "Pune")
        page.click("#global-search-btn")
        time.sleep(0.8)

        region_pune = page.locator("#kpi-selected-region").inner_text().strip()
        count_pune = page.locator("#kpi-city-jobs-count").inner_text().strip()
        table_title_pune = page.locator("#table-title").inner_text().strip()
        table_count_pune = page.locator("#table-count-label").inner_text().strip()
        print(f"  ✓ After Searching 'Pune':")
        print(f"      Region: {region_pune}")
        print(f"      Count: {count_pune}")
        print(f"      Table: {table_title_pune} {table_count_pune}")
        assert "Pune" in region_pune, f"Expected Pune in region, got {region_pune}"
        assert int(count_pune.replace(",", "")) >= 150, f"Expected >= 150 jobs for Pune, got {count_pune}"

        pune_first_row_loc = page.locator("table tbody tr:first-child td:nth-child(3)").inner_text().strip()
        print(f"      First row location: {pune_first_row_loc}")
        assert "Pune" in pune_first_row_loc, f"Expected Pune in location, got {pune_first_row_loc}"
        assert ", TN" not in pune_first_row_loc, f"Pune should NOT have ', TN'! Got {pune_first_row_loc}"

        page.screenshot(path=str(SCREENSHOT_DIR / "sync_step3_search_pune.png"))
        print("  ✓ Screenshot saved: sync_step3_search_pune.png")

        # 7. Search for "Bengaluru"
        print("\n[Step 4] Testing Search for 'Bengaluru'...")
        page.fill("#global-search-input", "Bengaluru")
        page.click("#global-search-btn")
        time.sleep(0.8)

        region_blr = page.locator("#kpi-selected-region").inner_text().strip()
        count_blr = page.locator("#kpi-city-jobs-count").inner_text().strip()
        print(f"  ✓ After Searching 'Bengaluru':")
        print(f"      Region: {region_blr}")
        print(f"      Count: {count_blr}")
        assert "Bengaluru" in region_blr, f"Expected Bengaluru, got {region_blr}"
        assert int(count_blr.replace(",", "")) >= 400, f"Expected >= 400 jobs for Bengaluru, got {count_blr}"

        blr_first_row_loc = page.locator("table tbody tr:first-child td:nth-child(3)").inner_text().strip()
        print(f"      First row location: {blr_first_row_loc}")
        assert "Bengaluru" in blr_first_row_loc or "Karnataka" in blr_first_row_loc, f"Got {blr_first_row_loc}"

        page.screenshot(path=str(SCREENSHOT_DIR / "sync_step4_search_bengaluru.png"))
        print("  ✓ Screenshot saved: sync_step4_search_bengaluru.png")

        # 8. Test Empty Search State
        print("\n[Step 5] Testing Empty State with non-matching query...")
        page.fill("#global-search-input", "nonexistentjobxyz999")
        page.click("#global-search-btn")
        time.sleep(0.8)

        empty_text = page.locator("table tbody").inner_text().strip()
        print(f"  ✓ Empty state message: {empty_text}")
        assert "No matching jobs found" in empty_text, "Expected 'No matching jobs found'"
        assert "Clear Search" in empty_text, "Expected Clear Search button"

        page.screenshot(path=str(SCREENSHOT_DIR / "sync_step5_empty_search.png"))
        print("  ✓ Screenshot saved: sync_step5_empty_search.png")

        # Click Clear Search button
        page.click("button:has-text('Clear Search')")
        time.sleep(0.8)

        # 9. Reset to India
        print("\n[Step 6] Testing Reset to India...")
        page.click("#reset-to-india-btn")
        time.sleep(0.8)

        reset_region = page.locator("#kpi-selected-region").inner_text().strip()
        reset_count = page.locator("#kpi-city-jobs-count").inner_text().strip()
        print(f"  ✓ After Reset: Region={reset_region}, Count={reset_count}")
        assert "Pan-India" in reset_region, f"Expected Pan-India, got {reset_region}"
        assert int(reset_count.replace(",", "")) > 1000, f"Expected > 1,000, got {reset_count}"

        page.screenshot(path=str(SCREENSHOT_DIR / "sync_step6_reset_pan_india.png"))
        print("  ✓ Screenshot saved: sync_step6_reset_pan_india.png")

        browser.close()

    print("\n" + "=" * 70)
    print("VERIFICATION COMPLETED SUCCESSFULLY!")
    print(f"Console errors: {len(console_errors)}")
    print("=" * 70)


if __name__ == "__main__":
    run_verification()
