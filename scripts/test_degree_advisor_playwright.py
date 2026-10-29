import os
import sys
import time
from playwright.sync_api import sync_playwright
import urllib.request
import json
from pypdf import PdfReader

def run_tests():
    print("=== STEP 1: VERIFYING API DEGREE REPORT DATA ===")
    url = "http://localhost:3000/api/degree-report?degree=bsc&experience=fresher"
    req = urllib.request.Request(url, headers={"User-Agent": "PlaywrightTest"})
    with urllib.request.urlopen(req) as resp:
        assert resp.status == 200, f"Expected 200, got {resp.status}"
        data = json.loads(resp.read().decode("utf-8"))["report"]

    print(f"Total eligible jobs: {data['eligibleJobsCount']}")
    print(f"Top categories: {[c['code'] + ' (' + str(c['percentage']) + '%)' for c in data['topCategories']]}")
    
    # 1. Verify soft skills excluded
    top_skill_names = [s["name"].lower() for s in data["topSkills"]]
    print(f"Top 5 skills: {[s['name'] for s in data['topSkills'][:5]]}")
    assert "communication" not in top_skill_names, "ERROR: Communication should not be in top technical skills!"
    print("PASS: Soft skill 'Communication' successfully excluded from technical skills.")

    # 2. Verify sample jobs categorization
    da_jobs = [j for j in data["sampleJobs"] if j.get("category_code") == "DA"]
    se_jobs = [j for j in data["sampleJobs"] if j.get("category_code") == "SE"]
    print(f"Found {len(da_jobs)} DA jobs and {len(se_jobs)} SE jobs in sample.")

    for j in da_jobs:
        title_lower = j["title"].lower()
        assert "full stack" not in title_lower, f"ERROR: Full Stack Engineer in DA jobs: {j['title']}"
        assert "associate software engineer" not in title_lower, f"ERROR: Software Engineer in DA jobs: {j['title']}"
    print("PASS: No Software Engineers or Full Stack Developers in DA sample jobs.")

    print("\n=== STEP 2: PLAYWRIGHT BROWSER AUTOMATION & ALIGNMENT CHECKS ===")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1400, "height": 1000})
        page = context.new_page()

        console_errors = []
        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)

        print("Navigating to http://localhost:3000/dashboard/degree-advisor...")
        page.goto("http://localhost:3000/dashboard/degree-advisor", wait_until="networkidle")
        time.sleep(2)

        # 1. Verify Top KPI cards
        kpi = page.locator('[data-testid="kpi-eligible-jobs"]').inner_text()
        print(f"KPI Eligible Openings: {kpi}")
        assert int(kpi.replace(",", "")) > 0, "KPI count should be > 0"

        # 2. Verify skills ranking does not contain Communication
        skills_section = page.locator("text=Top In-Demand Technical Skills").locator("..").locator("..").inner_text()
        assert "Communication" not in skills_section or "Soft Skills Note" in skills_section, "Communication should not be a ranked technical bar"
        print("PASS: Top In-Demand Skills chart shows pure tech ranking without soft skills.")

        # 3. Verify Experience pill in table is 'Fresher (0y)' without awkward break
        exp_badges = page.locator("table tbody tr td span:text('Fresher (0y)')").all()
        print(f"Found {len(exp_badges)} 'Fresher (0y)' badges in table.")
        assert len(exp_badges) > 0, "Should have fresher badges in table"
        white_space = exp_badges[0].evaluate("el => window.getComputedStyle(el).whiteSpace")
        assert white_space == "nowrap", f"Expected nowrap, got {white_space}"
        print(f"PASS: Experience pill has white-space: {white_space} (No multi-line wrapping).")

        # 4. Check Job Categories card and click DA
        da_filter_btn = page.locator('[data-testid="category-filter-da"]')
        assert da_filter_btn.is_visible(), "DA filter button should be visible"
        print("Clicking DA (Data Analytics & BI) filter button...")
        da_filter_btn.click()
        time.sleep(1)

        # 5. Verify Targeted Course Curriculum section is revealed
        curriculum_section = page.locator("#curriculum-section")
        assert curriculum_section.is_visible(), "Curriculum section should appear when DA is clicked"
        
        # Check header badge is 'Track Curriculum' on a single line
        badge_el = curriculum_section.locator("span:text('Track Curriculum')")
        assert badge_el.is_visible(), "'Track Curriculum' badge should be visible"
        badge_ws = badge_el.evaluate("el => window.getComputedStyle(el).whiteSpace")
        assert badge_ws == "nowrap", f"Expected nowrap on curriculum badge, got {badge_ws}"
        print(f"PASS: Curriculum header has 'Track Curriculum' badge with white-space: {badge_ws}.")

        # Verify no 3-line wrapped 'Active Category Focus'
        assert "Active\nCategory\nFocus" not in curriculum_section.inner_text(), "3-line wrapped badge found!"

        # 6. Verify jobs table is strictly filtered to DA
        table_rows = page.locator("table tbody tr").all()
        print(f"Showing {len(table_rows)} filtered jobs in table.")
        for row in table_rows[:8]:
            title = row.locator("td").first.inner_text()
            title_lower = title.lower()
            assert "full stack" not in title_lower, f"Filtered table contains Full Stack: {title}"
            assert "associate software engineer" not in title_lower, f"Filtered table contains Software Eng: {title}"
        print("PASS: Verified matching jobs table displays ONLY Data Analytics jobs.")

        # Take full screenshot
        screenshot_path = "C:/Users/youca/.gemini/antigravity/brain/e92e722a-fe51-4204-b96e-bea43fb327be/degree_advisor_aligned_verified.png"
        page.screenshot(path=screenshot_path, full_page=True)
        print(f"Saved full screenshot to {screenshot_path}")

        # 7. Test PDF Download with DA selected
        print("\n=== STEP 3: TESTING PDF DOWNLOAD & CONTENT INTEGRITY ===")
        download_btn = page.locator('[data-testid="btn-download-pdf"]')
        assert download_btn.is_visible(), "Download PDF button should be visible"

        with page.expect_download() as download_info:
            download_btn.click()
        download = download_info.value
        pdf_path = "C:/Users/youca/.gemini/antigravity/brain/e92e722a-fe51-4204-b96e-bea43fb327be/downloaded_test.pdf"
        download.save_as(pdf_path)
        print(f"Downloaded PDF saved to {pdf_path}")

        # Inspect PDF content using PdfReader
        reader = PdfReader(pdf_path)
        num_pages = len(reader.pages)
        print(f"PDF has {num_pages} pages.")
        assert num_pages == 2, f"Expected 2 pages, got {num_pages}"

        page1_text = reader.pages[0].extract_text()
        page2_text = reader.pages[1].extract_text()

        # Check Track 1 on Page 1
        assert "Track 1: Primary High-Demand Path" in page1_text, "Page 1 missing Track 1 header"
        assert "Data Analytics" in page1_text, "Page 1 missing Data Analytics"
        print("PASS: Page 1 contains Track 1 Primary Path: Data Analytics.")

        # Check Track 2 on Page 2 (Dynamic Second Option: Software Engineering)
        assert "Track 2: Alternative High-Demand Path" in page2_text, "Page 2 missing Track 2 header"
        assert "Software Engineering" in page2_text, "Page 2 missing Software Engineering second option"
        print("PASS: Page 2 dynamically selected Track 2: Software Engineering & Full Stack Dev as second option.")

        # Check Verified Jobs on Page 2
        assert "Verified Live Job Openings: Data Analytics" in page2_text, "Page 2 missing DA job table heading"
        assert "Full Stack Engineer" not in page2_text, "ERROR: Full Stack Engineer found in DA table on Page 2"
        print("PASS: Page 2 verified jobs table contains only Data Analytics positions.")

        # Check no Match Score
        assert "Match Score" not in page1_text and "Match Score" not in page2_text, "ERROR: Match Score found in PDF!"
        print("PASS: No 'Match Score' found in the PDF.")

        # Check Console Errors
        if console_errors:
            print(f"Console errors during test: {console_errors}")
        else:
            print("PASS: Zero browser console errors encountered.")

        browser.close()

    print("\n[SUCCESS] ALL DEGREE ADVISOR ALIGNMENTS & TESTS PASSED!")

if __name__ == "__main__":
    run_tests()
