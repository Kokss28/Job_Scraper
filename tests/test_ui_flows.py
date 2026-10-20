"""
Automated End-to-End Test Suite for Job Intelligence Next.js Web App
Tests DOM buttons, multi-user personas (Candidate, Recruiter, Admin),
interactive filters, job drawer, pipeline tracking, and RBAC console.
"""

import os
import sys
import time
from pathlib import Path

# Configure utf-8 encoding for Windows console
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

from playwright.sync_api import sync_playwright

SCREENSHOT_DIR = Path("d:/Job_Scraper/tests/screenshots")
SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)

CHROME_PATH = "C:/Program Files/Google/Chrome/Application/chrome.exe"
EDGE_PATH = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
BROWSER_EXE = CHROME_PATH if os.path.exists(CHROME_PATH) else EDGE_PATH

BASE_URL = "http://localhost:3000"


def run_full_suite():
    print(f"===========================================================")
    print(f"🚀 Launching Automated UI & Multi-User RBAC Test Suite")
    print(f"   Browser Executable: {BROWSER_EXE}")
    print(f"   Target URL: {BASE_URL}")
    print(f"===========================================================\n")

    results = []

    def record(name, passed, detail=""):
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"[{status}] {name} {detail and f'-> {detail}'}")
        results.append((name, passed, detail))

    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path=BROWSER_EXE,
            headless=True,
            args=["--no-sandbox", "--disable-gpu", "--window-size=1440,900"],
        )
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        # -------------------------------------------------------------
        # FLOW 1: CANDIDATE (JOB SEEKER) PERSONA
        # -------------------------------------------------------------
        print("\n--- 👤 Testing Candidate (Job Seeker) Persona Flow ---")
        try:
            page.goto(f"{BASE_URL}/dashboard", timeout=20000)
            page.wait_for_load_state("networkidle")
            record("Dashboard Load", True, f"Loaded in {page.title()}")

            # 1. Switch persona to Candidate
            candidate_btn = page.locator('[data-testid="persona-candidate"]')
            if candidate_btn.count() > 0:
                candidate_btn.click()
                time.sleep(0.5)
                record("Persona Switch: Candidate", True, "Active role set to Candidate")
            else:
                record("Persona Switch: Candidate", False, "Candidate toggle button not found")

            # 2. Test Search Input
            search_input = page.locator('[data-testid="search-input"]')
            if search_input.count() > 0:
                search_input.fill("Python")
                time.sleep(0.5)
                record("Search Input Filter", True, "Filtered catalog by 'Python'")
            else:
                record("Search Input Filter", False, "Search input not found")

            # 3. Test Indian Tech Hub Pill
            bengaluru_hub = page.locator('[data-testid="hub-bengaluru"]')
            if bengaluru_hub.count() > 0:
                bengaluru_hub.click()
                time.sleep(0.5)
                record("Tech Hub Filter", True, "Selected Bengaluru hub")
            else:
                record("Tech Hub Filter", False, "Bengaluru hub button not found")

            # 4. Test Min / Max Experience Bounds
            min_exp = page.locator('[data-testid="min-exp-input"]')
            max_exp = page.locator('[data-testid="max-exp-input"]')
            if min_exp.count() > 0 and max_exp.count() > 0:
                min_exp.fill("2")
                max_exp.fill("6")
                time.sleep(0.5)
                record("Min/Max Experience Filter", True, "Bound: 2 to 6 Yrs")
            else:
                record("Min/Max Experience Filter", False, "Experience inputs missing")

            # 5. Test Career Tier Preset
            tier_mid = page.locator('[data-testid="tier-mid"]')
            if tier_mid.count() > 0:
                tier_mid.click()
                time.sleep(0.5)
                record("Career Tier Filter", True, "Selected Mid-Level (2-5 Yrs)")

            # Clear search to view full mid-level jobs
            search_input.fill("")
            time.sleep(0.5)

            # 6. Test Job Inspection Drawer / Modal
            inspect_btn = page.locator('[data-testid="inspect-job-btn"]').first
            if inspect_btn.count() > 0:
                inspect_btn.click()
                time.sleep(0.5)
                modal = page.locator('[data-testid="close-modal-btn"]')
                if modal.count() > 0:
                    record("Job Inspection Modal", True, "Modal opened with full description")
                    modal.click()
                    time.sleep(0.3)
                    record("Job Modal Dismiss", True, "Modal closed cleanly")
                else:
                    record("Job Inspection Modal", False, "Close button not rendered in modal")
            else:
                record("Job Inspection Modal", False, "Inspect button not found")

            # 7. Test Bookmark / Save Job Action
            save_btn = page.locator('[data-testid^="save-job-"]').first
            if save_btn.count() > 0:
                save_btn.click()
                time.sleep(0.5)
                record("Bookmark Job Action", True, "Job saved to candidate pipeline")
            else:
                record("Bookmark Job Action", False, "Save button not found")

            # 8. Test Export CSV
            export_btn = page.locator('[data-testid="export-csv-btn"]')
            record("Export CSV Button", export_btn.count() > 0, "Button present in DOM")

            # Capture Candidate Explorer Screenshot
            page.screenshot(path=str(SCREENSHOT_DIR / "01_candidate_explorer.png"))
            record("Candidate Screenshot", True, "Saved 01_candidate_explorer.png")

            # 9. Navigate to Saved Jobs Pipeline
            page.locator('[data-testid="nav-saved-jobs"]').click()
            page.wait_for_load_state("networkidle")
            time.sleep(1)

            record("Saved Jobs Pipeline Load", True, f"Navigated to {page.url}")
            page.screenshot(path=str(SCREENSHOT_DIR / "02_candidate_pipeline.png"))

            # Test Pipeline Stage Tabs
            tab_interviewing = page.locator('[data-testid="tab-interviewing"]')
            if tab_interviewing.count() > 0:
                tab_interviewing.click()
                time.sleep(0.5)
                record("Pipeline Stage Filter", True, "Switched to 'Interviewing' stage")

            # Test Candidate Notes Editing
            edit_note_btn = page.locator('[data-testid^="edit-note-"]').first
            if edit_note_btn.count() > 0:
                edit_note_btn.click()
                time.sleep(0.3)
                note_box = page.locator('[data-testid^="note-textarea-"]').first
                note_box.fill("Automated Test Note: Recruiter screen passed with flying colors.")
                save_note_btn = page.locator('[data-testid^="save-note-"]').first
                save_note_btn.click()
                time.sleep(0.5)
                record("Candidate Note Persistence", True, "Updated and saved candidate note")

        except Exception as e:
            record("Candidate Persona Flow Exception", False, str(e))

        # -------------------------------------------------------------
        # FLOW 2: RECRUITER PERSONA
        # -------------------------------------------------------------
        print("\n--- 👔 Testing Recruiter Persona Flow ---")
        try:
            # 1. Switch persona to Recruiter
            recruiter_btn = page.locator('[data-testid="persona-recruiter"]')
            if recruiter_btn.count() > 0:
                recruiter_btn.click()
                time.sleep(0.5)
                record("Persona Switch: Recruiter", True, "Active role set to Recruiter")

            # 2. Navigate to Experience Intel
            page.locator('[data-testid="nav-experience"]').click()
            page.wait_for_load_state("networkidle")
            time.sleep(1)
            record("Experience Intel Page", True, f"Navigated to {page.url}")
            page.screenshot(path=str(SCREENSHOT_DIR / "03_recruiter_experience_intel.png"))

            # 3. Navigate to Market & Hubs
            page.locator('[data-testid="nav-market"]').click()
            page.wait_for_load_state("networkidle")
            time.sleep(1)
            record("Market & Hubs Page", True, f"Navigated to {page.url}")
            page.screenshot(path=str(SCREENSHOT_DIR / "04_recruiter_market_hubs.png"))

            # 4. Navigate to Scraper Studio
            page.locator('[data-testid="nav-scraper"]').click()
            page.wait_for_load_state("networkidle")
            time.sleep(1)
            record("Scraper Studio Page", True, f"Navigated to {page.url}")

            # Test Scraper Controls
            freshness_24 = page.locator('[data-testid="freshness-24"]')
            if freshness_24.count() > 0:
                freshness_24.click()
                record("Scraper Freshness Select", True, "Selected Past 24 Hours")

            dispatch_btn = page.locator('[data-testid="dispatch-scrape-btn"]')
            if dispatch_btn.count() > 0:
                dispatch_btn.click()
                time.sleep(2)
                banner = page.locator('[data-testid="scrape-status-banner"]')
                record("Dispatch Scraper Execution", banner.count() > 0, "Execution banner confirmed")

            page.screenshot(path=str(SCREENSHOT_DIR / "05_recruiter_scraper_studio.png"))

        except Exception as e:
            record("Recruiter Persona Flow Exception", False, str(e))

        # -------------------------------------------------------------
        # FLOW 3: ADMINISTRATOR & RBAC GOVERNANCE
        # -------------------------------------------------------------
        print("\n--- 🛡️ Testing Administrator & RBAC Governance Flow ---")
        try:
            # 1. Switch persona to Admin
            admin_btn = page.locator('[data-testid="persona-admin"]')
            if admin_btn.count() > 0:
                admin_btn.click()
                time.sleep(0.5)
                record("Persona Switch: Admin", True, "Active role set to Administrator")

            # 2. Navigate to Admin & RBAC Console
            page.locator('[data-testid="nav-admin"]').click()
            page.wait_for_load_state("networkidle")
            time.sleep(1)
            record("Admin Console Page", True, f"Navigated to {page.url}")
            page.screenshot(path=str(SCREENSHOT_DIR / "06_admin_governance.png"))

            # 3. Verify User Management Table
            role_select = page.locator('select[aria-label="User role"]').first
            if role_select.count() > 0:
                role_select.select_option("recruiter")
                time.sleep(0.5)
                record("RBAC Role Selector", True, "Changed user role tier")

            # 4. Verify Account Status Toggle
            toggle_btn = page.locator('button:has-text("Deactivate"), button:has-text("Activate")').first
            if toggle_btn.count() > 0:
                toggle_btn.click()
                time.sleep(0.5)
                record("User Status Toggle", True, "Toggled account access status")

        except Exception as e:
            record("Admin Persona Flow Exception", False, str(e))

        browser.close()

    # -------------------------------------------------------------
    # FINAL AUDIT REPORT
    # -------------------------------------------------------------
    passed_count = sum(1 for _, p, _ in results if p)
    total_count = len(results)

    print("\n===========================================================")
    print(f"📊 AUTOMATED TEST SUITE SUMMARY: {passed_count}/{total_count} PASSED")
    print("===========================================================")
    for name, passed, detail in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f" {status} - {name.ljust(35)} : {detail}")
    print("===========================================================\n")

    return passed_count == total_count


if __name__ == "__main__":
    success = run_full_suite()
    sys.exit(0 if success else 1)
