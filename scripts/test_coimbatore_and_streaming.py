import sys
import time
from playwright.sync_api import sync_playwright

def run_tests():
    print("==================================================")
    print("STARTING PLAYWRIGHT VERIFICATION FOR COIMBATORE & SSE STREAMING")
    print("==================================================")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1400, "height": 900})
        
        # Test 1: Verify Dashboard Location Filtering for Coimbatore
        print("\n--- Test 1: Dashboard Location Filtering (Coimbatore) ---")
        page.goto("http://localhost:3000/dashboard", wait_until="networkidle")
        time.sleep(2)
        
        # Capture initial state
        initial_title = page.locator("#table-title").inner_text()
        print(f"Initial table title: {initial_title}")
        
        # Search for "Coimbatore" in the search box
        print("Searching for 'Coimbatore'...")
        search_input = page.locator("#global-search-input")
        search_input.fill("Coimbatore")
        page.locator("#global-search-btn").click()
        time.sleep(1.5)
        
        # Verify selected region and table title updated to Coimbatore
        region_text = page.locator("#kpi-selected-region").inner_text()
        table_title = page.locator("#table-title").inner_text()
        city_count_text = page.locator("#kpi-city-jobs-count").inner_text()
        print(f"KPI Selected Region: {region_text}")
        print(f"KPI City Jobs Count: {city_count_text}")
        print(f"Table Title: {table_title}")
        
        assert "Coimbatore" in region_text, f"Expected Coimbatore in region, got: {region_text}"
        assert "Coimbatore" in table_title, f"Expected Coimbatore in table title, got: {table_title}"
        
        # Check rows in the table
        rows = page.locator("table tbody tr").all()
        print(f"Table row count: {len(rows)}")
        
        # Check if rows show Coimbatore
        for i, row in enumerate(rows[:5]):
            row_text = row.inner_text()
            print(f"  Row {i+1}: {row_text[:80]}...")
            if "No matching jobs found" in row_text:
                print("  (Empty state rendered cleanly)")
            else:
                # Ensure the location column contains Coimbatore and NOT just Chennai/Dubai
                cells = row.locator("td").all()
                if len(cells) >= 3:
                    loc_cell = cells[2].inner_text()
                    print(f"    Location cell: {loc_cell}")
                    assert "Coimbatore" in loc_cell, f"Expected Coimbatore in location cell, got: {loc_cell}"
        
        # Test 2: Search for a non-existent query
        print("\n--- Test 2: Dashboard Empty State for Non-Existent Search ---")
        search_input.fill("NonExistentJobTitleXYZ999")
        page.locator("#global-search-btn").click()
        time.sleep(1)
        empty_text = page.locator("table tbody").inner_text()
        print(f"Empty state text: {empty_text.strip()[:100]}...")
        assert "No matching jobs found" in empty_text, "Expected 'No matching jobs found' empty state"

        # Test 3: Verify Scraper Studio page & UI controls
        print("\n--- Test 3: Scraper Studio UI Controls ---")
        page.goto("http://localhost:3000/dashboard/scraper", wait_until="networkidle")
        time.sleep(2)
        
        # Check presets include Coimbatore
        page_content = page.content()
        assert "Coimbatore" in page_content, "Expected Coimbatore in location presets"
        print("Coimbatore verified in Scraper Studio presets!")
        
        # Check default freshness is 24h
        freshness_input = page.locator("input[data-testid='freshness-hours-input']")
        freshness_val = freshness_input.input_value()
        print(f"Default freshness value: {freshness_val}h")
        assert freshness_val == "24", f"Expected default freshness 24, got: {freshness_val}"
        
        # Test 4: Trigger Live Scraper with SSE streaming for Coimbatore
        print("\n--- Test 4: Dynamic Live Console Streaming Verification ---")
        # Set keywords: Data Analyst, location: Coimbatore, max 2 jobs
        kw_input = page.locator("input[data-testid='scrape-keywords-input']")
        kw_input.fill("Data Analyst")
        
        loc_input = page.locator("input[data-testid='scrape-location-input']")
        loc_input.fill("Coimbatore")
        
        # Click dispatch
        print("Dispatching scraper run...")
        page.locator("button[data-testid='dispatch-scrape-btn']").click()
        
        # Check that terminal tab is active and logs stream in dynamically
        time.sleep(2)
        terminal_active = page.locator("button:has-text('Live Console Output')").get_attribute("class")
        print(f"Terminal tab active check: {'border-indigo-600' in (terminal_active or '')}")
        
        # Observe streaming logs over the next 15 seconds
        prev_log_count = 0
        stream_observed = False
        
        for check in range(6):
            time.sleep(3)
            terminal_box = page.locator("div.font-mono.max-h-\\[340px\\]")
            logs_text = terminal_box.inner_text()
            log_lines = [l for l in logs_text.split("\n") if l.strip()]
            print(f"  [T+{check*3+3}s] Streamed logs count: {len(log_lines)}")
            if len(log_lines) > 3 and len(log_lines) > prev_log_count:
                stream_observed = True
                print(f"    Sample recent log: {log_lines[-1][:90]}")
            prev_log_count = len(log_lines)
            
            # Check if finished
            status_text = page.locator("div[data-testid='scrape-status-banner']").inner_text() if page.locator("div[data-testid='scrape-status-banner']").count() > 0 else ""
            if "complete" in status_text.lower() or "error" in status_text.lower() or "0 verified" in status_text.lower():
                print(f"  Scraper finished with status: {status_text}")
                break
        
        print(f"Dynamic log streaming verified: {stream_observed}")
        assert stream_observed, "Expected real-time log lines to stream into live console dynamically!"
        
        # Take a screenshot as proof
        screenshot_path = "scripts/coimbatore_test_screenshot.png"
        page.screenshot(path=screenshot_path)
        print(f"Screenshot saved to {screenshot_path}")

        browser.close()
        print("\nALL VERIFICATION TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    run_tests()
