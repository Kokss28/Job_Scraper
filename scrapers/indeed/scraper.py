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

        results_wanted = limit if limit else 100
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

            # Recency check on Indeed results
            posted_val = job.get("date_posted") or job.get("posted_date")
            try:
                from pipeline.recency import is_job_within_recency
                if posted_val is not None:
                    if not is_job_within_recency(posted_val, max_age_hours=max_age_hours, strict=False):
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

            # Standardize location so pipeline normalizer assigns target city
            if location and location.strip().lower() not in ("india", "all india", "remote"):
                target_city = location.strip().title()
                from pipeline.normalizer import INDIAN_CITY_TO_STATE
                target_state = INDIAN_CITY_TO_STATE.get(target_city, "Tamil Nadu")

                curr_city = job.get("city")
                if not curr_city or str(curr_city).lower() in ("none", "not specified", ""):
                    job["city"] = target_city
                curr_state = job.get("state")
                if not curr_state or str(curr_state).lower() in ("none", "not specified", ""):
                    job["state"] = target_state
                curr_loc = str(job.get("location") or "")
                if target_city.lower() not in curr_loc.lower():
                    job["location"] = f"{target_city}, {curr_loc if curr_loc else target_state + ', India'}"
            else:
                job["location"] = job.get("location") or location

            if not job.get("job_url"):
                job["job_url"] = job.get("job_url_direct") or ""
            collected.append(job)

    # If 0 jobs collected within a narrow time window (< 72h),
    # automatically expand to 72 hours so regional locations like Coimbatore
    # always yield Indeed postings
    if not collected and max_age_hours < 72:
        print(
            f"[Indeed] Found 0 jobs within {max_age_hours}h for {location!r}. "
            f"Auto-expanding search window to 72 hours to capture active listings..."
        )
        return collect_indeed_jobs(
            keywords=keywords,
            location=location,
            max_jobs=max_jobs,
            max_age_hours=72,
            max_jobs_per_keyword=max_jobs_per_keyword,
            **kwargs,
        )

    return collected
