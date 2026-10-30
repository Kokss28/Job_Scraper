"""
Unit tests for pipeline/audit_logger.py.
Verifies date/time folder generation, CSV batch creation, and extraction history logging.
"""

import csv
from pathlib import Path
from pipeline.audit_logger import (
    get_timestamps,
    get_daily_folder,
    detect_domain_from_keywords,
    save_batch_extraction_csv,
    record_extraction_run,
    DATE_BASE_DIR,
    HISTORY_CSV_PATH,
    LATEST_CSV_PATH,
)


def test_get_timestamps_format():
    ts = get_timestamps()
    assert "utc" in ts
    assert "ist" in ts
    assert "date_ist" in ts
    assert "time_ist" in ts
    assert "stamp" in ts
    assert "time_stamp" in ts
    assert "time_slug" in ts

    # Date should match YYYY-MM-DD format
    parts = ts["date_ist"].split("-")
    assert len(parts) == 3
    assert len(parts[0]) == 4
    assert len(parts[1]) == 2
    assert len(parts[2]) == 2


def test_get_daily_folder(tmp_path, monkeypatch):
    test_date_dir = tmp_path / "Date"
    monkeypatch.setattr("pipeline.audit_logger.DATE_BASE_DIR", test_date_dir)

    folder = get_daily_folder("2026-10-30")
    assert folder.exists()
    assert folder.is_dir()
    assert folder.name == "2026-10-30"
    assert folder.parent == test_date_dir


def test_detect_domain_from_keywords():
    # Direct hint match
    domain, slot = detect_domain_from_keywords([], domain_hint="Python Development")
    assert domain == "Python Development"
    assert slot == 1

    domain, slot = detect_domain_from_keywords([], domain_hint="Data & Analytics")
    assert domain == "Data & Analytics"
    assert slot == 0

    # Keyword match
    domain, slot = detect_domain_from_keywords(["spring boot", "core java"])
    assert domain == "Java Development"
    assert slot == 2

    domain, slot = detect_domain_from_keywords("kubernetes cloud engineer")
    assert domain == "Cloud & DevOps"
    assert slot == 3

    # Fallback
    domain, slot = detect_domain_from_keywords([])
    assert domain == "General Extraction"
    assert slot is None


def test_save_batch_extraction_csv(tmp_path, monkeypatch):
    test_data_dir = tmp_path / "Data"
    test_date_dir = test_data_dir / "Date"
    test_latest = test_data_dir / "latest_extracted_jobs.csv"

    monkeypatch.setattr("pipeline.audit_logger.DATA_DIR", test_data_dir)
    monkeypatch.setattr("pipeline.audit_logger.DATE_BASE_DIR", test_date_dir)
    monkeypatch.setattr("pipeline.audit_logger.LATEST_CSV_PATH", test_latest)

    fake_jobs = [
        {
            "job_id": "test_job_1",
            "title": "Data Analyst",
            "company": "Tech Corp",
            "city": "Bengaluru",
            "source": "LinkedIn",
        },
        {
            "job_id": "test_job_2",
            "title": "Senior Data Scientist",
            "company": "AI Labs",
            "city": "Hyderabad",
            "source": "Naukri",
        },
    ]

    time_path, filename, count = save_batch_extraction_csv(
        jobs=fake_jobs,
        domain="Data & Analytics",
        date_str="2026-10-30",
    )

    assert count == 2
    assert time_path.exists()
    assert "Data_Analytics" in filename
    assert time_path.parent.name == "2026-10-30"

    # Verify time-stamped CSV content
    with open(time_path, "r", encoding="utf-8-sig") as f:
        reader = list(csv.DictReader(f))
        assert len(reader) == 2
        assert reader[0]["job_id"] == "test_job_1"
        assert reader[0]["domain"] == "Data & Analytics"
        assert reader[1]["job_id"] == "test_job_2"

    # Verify cumulative daily CSV content
    daily_file = test_date_dir / "2026-10-30" / "Jobs_2026-10-30.csv"
    assert daily_file.exists()
    with open(daily_file, "r", encoding="utf-8-sig") as f:
        reader = list(csv.DictReader(f))
        assert len(reader) == 2

    # Second run with one duplicate and one new job
    fake_jobs_run2 = [
        {
            "job_id": "test_job_2",  # Duplicate
            "title": "Senior Data Scientist",
            "company": "AI Labs",
            "city": "Hyderabad",
            "source": "Naukri",
        },
        {
            "job_id": "test_job_3",  # New
            "title": "BI Developer",
            "company": "Cloud Data",
            "city": "Pune",
            "source": "Indeed",
        },
    ]

    time_path_2, filename_2, count_2 = save_batch_extraction_csv(
        jobs=fake_jobs_run2,
        domain="Data & Analytics",
        date_str="2026-10-30",
    )
    assert count_2 == 2
    assert time_path_2.exists()

    # Cumulative file should deduplicate (3 jobs total: 1, 2, 3)
    with open(daily_file, "r", encoding="utf-8-sig") as f:
        reader = list(csv.DictReader(f))
        assert len(reader) == 3
        ids = {r["job_id"] for r in reader}
        assert ids == {"test_job_1", "test_job_2", "test_job_3"}


def test_record_extraction_run(tmp_path, monkeypatch):
    test_data_dir = tmp_path / "Data"
    test_history = test_data_dir / "extraction_history.csv"

    monkeypatch.setattr("pipeline.audit_logger.DATA_DIR", test_data_dir)
    monkeypatch.setattr("pipeline.audit_logger.HISTORY_CSV_PATH", test_history)

    res_path = record_extraction_run(
        domain="Python Development",
        slot=1,
        keywords="python, fastapi",
        location="India",
        sources="LinkedIn,Naukri",
        extracted_count=45,
        new_jobs_added=20,
        total_db_jobs=150,
        by_source={"LinkedIn": 25, "Naukri": 20},
        duration_seconds=12.4,
        status="SUCCESS",
        batch_filename="Jobs_Python_120000.csv",
        batch_file_path=Path("Data/Date/2026-10-30/Jobs_Python_120000.csv"),
    )

    assert res_path.exists()
    with open(res_path, "r", encoding="utf-8-sig") as f:
        rows = list(csv.DictReader(f))
        assert len(rows) == 1
        r = rows[0]
        assert r["Domain"] == "Python Development"
        assert r["Slot"] == "Slot 1"
        assert r["Jobs_Extracted_Now"] == "45"
        assert r["New_Jobs_Added"] == "20"
        assert r["Yield_LinkedIn"] == "25"
        assert r["Yield_Naukri"] == "20"
        assert r["Status"] == "SUCCESS"
        assert r["Batch_CSV_File"] == "Jobs_Python_120000.csv"

