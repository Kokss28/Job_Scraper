"""Collect Indeed jobs as plain dictionaries for the unified pipeline.

JobSpy provides the same Indeed search backend used by the standalone Indeed
project. Results are adapted here so normalization, enrichment, deduplication,
and storage remain shared with LinkedIn and Naukri.
"""

from __future__ import annotations

from typing import Any


def _value(value: Any) -> Any:
    """Convert pandas/NumPy missing values into ordinary ``None`` values."""
    if value is None:
        return None

    if str(value) in {"<NA>", "NaT"}:
        return None

    try:
        if value != value:  # NaN / NaT
            return None
    except (TypeError, ValueError):
        pass

    if hasattr(value, "item"):
        try:
            return value.item()
        except (TypeError, ValueError):
            pass

    return value


def collect_indeed_jobs(
    keywords: list[str],
    location: str = "India",
    max_jobs: int = 50,
    max_age_hours: int = 168,
) -> list[dict[str, Any]]:
    """Search Indeed for each keyword and return pipeline-ready records."""
    try:
        from jobspy import scrape_jobs
    except ImportError as error:
        raise RuntimeError(
            "Indeed scraping requires python-jobspy. Install requirements.txt."
        ) from error

    collected: list[dict[str, Any]] = []

    for keyword in keywords:
        keyword = str(keyword).strip()
        if not keyword:
            continue

        print(
            f"[Indeed] Searching {keyword!r} in {location!r} "
            f"(last {max_age_hours} hours, max {max_jobs})"
        )

        frame = scrape_jobs(
            site_name=["indeed"],
            search_term=keyword,
            location=location,
            results_wanted=max_jobs,
            hours_old=max_age_hours,
            country_indeed="India",
            description_format="html",
        )

        if frame is None or frame.empty:
            continue

        for record in frame.to_dict(orient="records"):
            job = {key: _value(value) for key, value in record.items()}
            raw_id = job.get("id") or job.get("job_id")
            if raw_id:
                job["job_id"] = f"indeed_{raw_id}"
            job["source"] = "Indeed"
            job["search_keyword"] = keyword
            job["location"] = job.get("location") or location
            if not job.get("job_url"):
                job["job_url"] = job.get("job_url_direct") or ""
            collected.append(job)

    return collected
