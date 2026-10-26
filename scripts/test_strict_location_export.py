import sys
import os
import csv
import io
from playwright.sync_api import sync_playwright

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

os.makedirs("web/public/test_screenshots", exist_ok=True)

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 1000}, accept_downloads=True)
        page = context.new_page()

        print("Navigating to http://localhost:3000/dashboard ...")
        page.goto("http://localhost:3000/dashboard", wait_until="networkidle", timeout=30000)
        page.wait_for_timeout(2000)

        # 1. Select Chennai on the India map
        print("\n--- Selecting Chennai ---")
        chennai_node = page.locator("#city-cluster-chennai")
        assert chennai_node.is_visible(), "Chennai node on map must be visible"
        chennai_node.click()
        page.wait_for_timeout(1500)

        # Verify KPI Card 3
        kpi_city = page.locator("#kpi-city-jobs-count").text_content().strip()
        print(f"Jobs in Chennai KPI Count: {kpi_city}")

        # 2. Inspect table rows on page 1, 2, 3
        print("\n--- Verifying Table Rows for Chennai ---")
        table_locations = page.locator("tbody tr td:nth-child(3)").all_text_contents()
        print(f"Sample table locations on Page 1 (count={len(table_locations)}):")
        for loc in table_locations:
            print(f"  • {loc}")
            assert "chennai" in loc.lower(), f"Unexpected location in table: {loc}"
            assert "hyderabad" not in loc.lower(), f"Mixed location found: {loc}"
            assert "pune" not in loc.lower(), f"Mixed location found: {loc}"
            assert "bengaluru" not in loc.lower(), f"Mixed location found: {loc}"
            assert "coimbatore" not in loc.lower(), f"Mixed location found: {loc}"
            assert "dubai" not in loc.lower(), f"Mixed location found: {loc}"
        print("  ✓ All Page 1 rows are strictly Chennai!")

        # 3. Test Export CSV Download for Chennai
        print("\n--- Testing Export CSV for Chennai ---")
        with page.expect_download() as download_info:
            page.locator("#export-city-csv-btn").click()
        download = download_info.value
        suggested_filename = download.suggested_filename
        print(f"Downloaded file name: {suggested_filename}")
        assert "chennai_jobs.csv" in suggested_filename.lower()

        # Save and parse CSV content
        save_path = "web/public/test_screenshots/downloaded_chennai_jobs.csv"
        download.save_as(save_path)
        print(f"Saved downloaded CSV to: {save_path}")

        with open(save_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            rows = list(reader)

        print(f"Total exported rows for Chennai: {len(rows)}")
        assert len(rows) > 0, "Exported CSV must contain records"

        # Check every single row's City column
        other_forbidden_cities = ["hyderabad", "pune", "bengaluru", "bangalore", "delhi", "noida", "gurugram", "gurgaon", "mumbai", "coimbatore", "kolkata", "dubai", "kuwait", "madurai", "salem", "tiruppur"]
        
        for i, row in enumerate(rows):
            city_val = row.get("City", "").strip()
            # Must be Chennai
            assert "chennai" in city_val.lower(), f"Row {i+1} has unexpected City: {city_val}"
            for forbidden in other_forbidden_cities:
                assert forbidden not in city_val.lower(), f"Row {i+1} has mixed location '{forbidden}' in City: {city_val}"

        print("  ✓ Confirmed: 100% of exported rows have pure 'Chennai' location with ZERO mixed cities!")

        # Capture screenshot of Chennai table
        page.locator("#directory").screenshot(path="web/public/test_screenshots/chennai_table_pure_location.png")
        print("Saved Chennai table screenshot.")

        # 4. Test Coimbatore City Selection and Export
        print("\n--- Testing Coimbatore City Selection & Export ---")
        coimbatore_node = page.locator("#city-cluster-coimbatore")
        coimbatore_node.click()
        page.wait_for_timeout(1500)

        cbe_locations = page.locator("tbody tr td:nth-child(3)").all_text_contents()
        print(f"Sample table locations for Coimbatore (count={len(cbe_locations)}):")
        for loc in cbe_locations:
            print(f"  • {loc}")
            assert "coimbatore" in loc.lower(), f"Unexpected location in Coimbatore table: {loc}"
            assert "chennai" not in loc.lower(), f"Mixed Chennai found in Coimbatore table: {loc}"
            assert "bengaluru" not in loc.lower(), f"Mixed Bengaluru found in Coimbatore table: {loc}"

        with page.expect_download() as download_info_cbe:
            page.locator("#export-city-csv-btn").click()
        cbe_download = download_info_cbe.value
        cbe_save_path = "web/public/test_screenshots/downloaded_coimbatore_jobs.csv"
        cbe_download.save_as(cbe_save_path)

        with open(cbe_save_path, "r", encoding="utf-8") as f:
            cbe_reader = csv.DictReader(f)
            cbe_rows = list(cbe_reader)

        print(f"Total exported rows for Coimbatore: {len(cbe_rows)}")
        for i, row in enumerate(cbe_rows):
            city_val = row.get("City", "").strip()
            assert "coimbatore" in city_val.lower(), f"Row {i+1} has unexpected City: {city_val}"
            assert "chennai" not in city_val.lower(), f"Row {i+1} has mixed Chennai: {city_val}"

        print("  ✓ Confirmed: 100% of Coimbatore exported rows have pure 'Coimbatore' location!")

        browser.close()
        print("\nALL STRICT LOCATION & EXPORT CHECKS PASSED!")

if __name__ == "__main__":
    run()
