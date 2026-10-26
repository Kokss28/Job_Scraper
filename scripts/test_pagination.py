import sys
import os
import time
from playwright.sync_api import sync_playwright

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

os.makedirs("web/public/test_screenshots", exist_ok=True)

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        print("Navigating to http://localhost:3000/dashboard ...")
        page.goto("http://localhost:3000/dashboard", wait_until="networkidle", timeout=30000)
        page.wait_for_timeout(2000)

        # 1. Verify "Load More Records" is removed
        load_more_btn = page.locator("#load-more-jobs-btn")
        assert load_more_btn.count() == 0, "'Load More Records' button must be removed!"
        print("Confirmed: 'Load More Records' button is removed.")

        # 2. Verify Pagination Controls Exist
        pagination_bar = page.locator("#table-pagination-bar")
        assert pagination_bar.is_visible(), "Pagination bar must be visible!"

        prev_btn = page.locator("#prev-page-btn")
        next_btn = page.locator("#next-page-btn")
        assert prev_btn.is_visible(), "Previous Page button must be visible!"
        assert next_btn.is_visible(), "Next Page button must be visible!"
        assert prev_btn.is_disabled(), "Previous Page button must be disabled on Page 1!"
        assert not next_btn.is_disabled(), "Next Page button must be enabled on Page 1!"

        # Check Page 1 table records
        count_label = page.locator("#table-count-label").text_content()
        print(f"Initial Count Label: {count_label}")
        assert "Page 1" in count_label
        assert "1–10" in count_label

        first_job_p1 = page.locator("#directory tbody tr").first.locator("td").first.text_content().strip()
        print(f"Page 1 first job: {first_job_p1}")

        # Capture Page 1 screenshot
        page.locator("#directory").screenshot(path="web/public/test_screenshots/table_page_1.png")
        print("Saved Page 1 screenshot.")

        # 3. Click "Next Page"
        print("\n--- Clicking 'Next Page' ---")
        next_btn.click()
        page.wait_for_timeout(1000)

        count_label_p2 = page.locator("#table-count-label").text_content()
        print(f"Page 2 Count Label: {count_label_p2}")
        assert "Page 2" in count_label_p2
        assert "11–20" in count_label_p2

        first_job_p2 = page.locator("#directory tbody tr").first.locator("td").first.text_content().strip()
        print(f"Page 2 first job: {first_job_p2}")
        assert first_job_p2 != first_job_p1, "Page 2 must show different jobs than Page 1!"

        # Verify only 10 rows are shown on page 2 (not 20 accumulated!)
        row_count_p2 = page.locator("#directory tbody tr").count()
        assert row_count_p2 == 10, f"Expected 10 rows on Page 2, got {row_count_p2} (must not accumulate on same page!)"
        print(f"Confirmed: Table displays exactly {row_count_p2} rows on Page 2.")

        assert not prev_btn.is_disabled(), "Previous button must be enabled on Page 2!"

        # Capture Page 2 screenshot
        page.locator("#directory").screenshot(path="web/public/test_screenshots/table_page_2.png")
        print("Saved Page 2 screenshot.")

        # 4. Click "Next Page" again to Page 3
        print("\n--- Clicking 'Next Page' to Page 3 ---")
        next_btn.click()
        page.wait_for_timeout(1000)

        count_label_p3 = page.locator("#table-count-label").text_content()
        print(f"Page 3 Count Label: {count_label_p3}")
        assert "Page 3" in count_label_p3
        assert "21–30" in count_label_p3

        # 5. Click "Previous Page" to go back to Page 2
        print("\n--- Clicking 'Previous' back to Page 2 ---")
        prev_btn.click()
        page.wait_for_timeout(1000)

        count_label_back_p2 = page.locator("#table-count-label").text_content()
        print(f"Back to Page 2: {count_label_back_p2}")
        assert "Page 2" in count_label_back_p2

        # 6. Test with City Selection (Coimbatore)
        print("\n--- Testing City Filter Auto-Reset with Coimbatore ---")
        page.locator("#city-cluster-coimbatore").click()
        page.wait_for_timeout(1000)

        cbe_count_label = page.locator("#table-count-label").text_content()
        print(f"Coimbatore Count Label: {cbe_count_label}")
        assert "Page 1" in cbe_count_label, "Selecting a new city must reset to Page 1!"

        # Click Next Page for Coimbatore
        page.locator("#next-page-btn").click()
        page.wait_for_timeout(1000)
        cbe_p2_label = page.locator("#table-count-label").text_content()
        print(f"Coimbatore Page 2 Label: {cbe_p2_label}")
        assert "Page 2" in cbe_p2_label
        assert "11–20" in cbe_p2_label

        page.screenshot(path="web/public/test_screenshots/coimbatore_page_2.png", full_page=False)
        print("Saved Coimbatore Page 2 screenshot.")

        browser.close()
        print("\nALL PAGINATION VERIFICATION CHECKS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    run()
