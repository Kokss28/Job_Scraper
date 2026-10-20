"""
Strict Job Recency and Posting Time Validation.
Ensures that jobs are strictly verified against the requested freshness window
(e.g., Past 1 Hour, Past 24 Hours, Past 7 Days, Past 30 Days).
Never assumes an unverified or missing date is recent when strict=True.
"""

from __future__ import annotations

import re
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional


def parse_job_posted_date(text: Any) -> Optional[datetime]:
    """
    Parse relative or absolute date strings into a naive datetime.
    Supports:
      - 'Just now', 'Active moments ago', '30 minutes ago', '1 hour ago'
      - 'Today', 'Yesterday', '2 days ago', '1 week ago', '1 month ago'
      - ISO-8601 timestamps (e.g. '2026-10-16T04:30:00Z')
      - Formats: '%d-%m-%Y %H:%M', '%d/%m/%Y %H:%M:%S', '%Y-%m-%d', etc.
    Returns None if unparseable or 'Not Specified'.
    """
    if text is None:
        return None

    raw = str(text).strip()
    if not raw:
        return None

    lower = raw.lower()
    if lower in ("not specified", "na", "n/a", "none", "null", "unknown"):
        return None

    now = datetime.now()

    # Just now / moments ago
    if any(k in lower for k in ["just now", "few seconds", "moments ago", "active now"]):
        return now

    # Few hours ago / a few hours ago
    if any(k in lower for k in ["few hours ago", "a few hours", "couple of hours"]):
        return now - timedelta(hours=2.5)

    # An hour ago
    if "an hour ago" in lower or "1 hour ago" in lower:
        return now - timedelta(hours=1)

    # Minutes ago: "15 minutes ago", "30 mins ago", "5m ago"
    m_min = re.search(r"(\d+)\s*(?:minutes?|mins?|m)\b", lower)
    if m_min:
        return now - timedelta(minutes=int(m_min.group(1)))

    # Hours ago: "1 hour ago", "3 hours ago", "4h ago"
    m_hr = re.search(r"(\d+)\s*(?:hours?|hrs?|h)\b", lower)
    if m_hr:
        return now - timedelta(hours=int(m_hr.group(1)))

    # A day ago / 1 day ago
    if "a day ago" in lower or "1 day ago" in lower:
        return now - timedelta(days=1)

    # Few days ago
    if "few days ago" in lower:
        return now - timedelta(days=2)

    # Today: represents a posting from earlier today (~6 hours ago)
    if "today" in lower:
        return now - timedelta(hours=6)

    # Yesterday
    if "yesterday" in lower:
        return now - timedelta(days=1)

    # Days ago: "2 days ago", "5d ago"
    m_day = re.search(r"(\d+)\s*(?:days?|d)\b", lower)
    if m_day:
        return now - timedelta(days=int(m_day.group(1)))

    # Weeks ago: "1 week ago", "2w ago"
    m_wk = re.search(r"(\d+)\s*(?:weeks?|wks?|w)\b", lower)
    if m_wk:
        return now - timedelta(weeks=int(m_wk.group(1)))

    # Months ago: "1 month ago", "2mo ago"
    m_mo = re.search(r"(\d+)\s*(?:months?|mos?|mo)\b", lower)
    if m_mo:
        return now - timedelta(days=int(m_mo.group(1)) * 30)

    # Standard date formats
    for fmt in (
        "%Y-%m-%dT%H:%M:%S%z",
        "%Y-%m-%dT%H:%M:%SZ",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%d %H:%M:%S",
        "%d-%m-%Y %H:%M:%S",
        "%d-%m-%Y %H:%M",
        "%d/%m/%Y %H:%M:%S",
        "%d/%m/%Y %H:%M",
        "%Y-%m-%d",
        "%d-%m-%Y",
        "%d/%m/%Y",
    ):
        try:
            clean = raw.replace("Z", "+00:00") if "%z" in fmt or "%Z" in fmt else raw
            dt = datetime.strptime(clean, fmt)
            if dt.tzinfo:
                dt = dt.replace(tzinfo=None)
            return dt
        except Exception:
            continue

    # Try ISO fromisoformat
    try:
        iso_clean = raw.replace("Z", "+00:00")
        dt = datetime.fromisoformat(iso_clean)
        if dt.tzinfo:
            dt = dt.replace(tzinfo=None)
        return dt
    except Exception:
        pass

    return None


def is_job_within_recency(
    posted_date_value: Any,
    max_age_hours: float = 24.0,
    strict: bool = True,
) -> bool:
    """
    Check if a job was posted within the given max_age_hours.
    If strict=True:
      - If the posting date cannot be verified or is missing, returns False.
      - Never assumes a job is fresh without proof of posting date.
    """
    if posted_date_value is None:
        return False if strict else True

    now = datetime.now()

    # Handle datetime.date objects directly (e.g. from Indeed JobSpy)
    from datetime import date
    if isinstance(posted_date_value, date) and not isinstance(posted_date_value, datetime):
        if float(max_age_hours) < 24:
            min_date = now.date()
        else:
            days_threshold = max(1, int(float(max_age_hours) / 24.0))
            min_date = (now - timedelta(days=days_threshold)).date()
        return posted_date_value >= min_date

    if isinstance(posted_date_value, datetime):
        dt = posted_date_value.replace(tzinfo=None) if posted_date_value.tzinfo else posted_date_value
    else:
        dt = parse_job_posted_date(posted_date_value)

    if dt is None:
        return False if strict else True

    age = now - dt
    total_hours = age.total_seconds() / 3600.0

    # Allow a small 10-minute future skew for server clock drift
    if total_hours < -0.2:
        return False

    # Allow a 3-hour buffer for relative day strings (e.g. '1 day ago' can be 24-26h)
    buffer_hours = 3.0 if float(max_age_hours) >= 24 else 0.5
    return total_hours <= (float(max_age_hours) + buffer_hours)


def filter_jobs_by_recency(
    jobs: List[Dict[str, Any]],
    max_age_hours: float = 24.0,
    strict: bool = True,
) -> List[Dict[str, Any]]:
    """Filter a list of raw or normalized job dictionaries by recency."""
    filtered = []
    for job in jobs:
        posted = (
            job.get("posted_date")
            or job.get("date_posted")
            or job.get("posted_time")
            or job.get("collected_at")
        )
        if is_job_within_recency(posted, max_age_hours=max_age_hours, strict=strict):
            filtered.append(job)
    return filtered
