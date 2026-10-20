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
    max_jobs: int | None = None,
    max_age_hours: int | float = 24,
    max_jobs_per_keyword: int | None = None,
    **kwargs: Any,
) -> list[dict[str, Any]]:
    """Search Indeed for each keyword and return pipeline-ready records."""
    limit: int | None = None
    if max_jobs_per_keyword is not None and max_jobs_per_keyword > 0:
        limit = max_jobs_per_keyword
    elif max_jobs is not None and max_jobs > 0:
        limit = max_jobs

    if "freshness" in kwargs:
        try:
            max_age_hours = float(kwargs["freshness"])
        except Exception:
            pass
    max_age_int = max(1, int(float(max_age_hours)))

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

        results_wanted = limit if limit else 500
        print(
            f"[Indeed] Searching {keyword!r} in {location!r} "
            f"(last {max_age_int} hours, {'max ' + str(limit) if limit else 'all accessible jobs'})"
        )

        frame = scrape_jobs(
            site_name=["indeed"],
            search_term=keyword,
            location=location,
            results_wanted=results_wanted,
            hours_old=max_age_int,
            country_indeed="India",
            description_format="html",
        )

        if frame is None or frame.empty:
            continue

        for record in frame.to_dict(orient="records"):
            job = {key: _value(value) for key, value in record.items()}

            # Strict recency check on Indeed results
            posted_val = job.get("date_posted") or job.get("posted_date")
            try:
                from pipeline.recency import is_job_within_recency
                if not is_job_within_recency(posted_val, max_age_hours=max_age_hours, strict=True):
                    continue
            except Exception:
                pass

            # Role relevance check
            title = job.get("title") or ""
            desc = job.get("description") or ""
            try:
                from pipeline.role_matcher import is_job_role_relevant
                if not is_job_role_relevant(title, keyword, desc):
                    continue
            except Exception:
                pass

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
