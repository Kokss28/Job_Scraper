"""
Strict Job Role & Relevance Matcher.
Filters out unrelated job titles and postings so that search queries
(e.g. 'Python Developer', 'Data Analyst') only retain relevant, authentic roles.
"""

from __future__ import annotations

import re
from typing import Set, Tuple, List, Optional


# ============================================================
# KEYWORD & CATEGORY DEFINITIONS
# ============================================================

UNRELATED_ROLES = {
    "sales": {
        "sales", "business development", "bde", "bdm", "account executive",
        "telecaller", "telesales", "inside sales", "lead generation"
    },
    "hr": {
        "hr", "human resources", "recruiter", "recruitment", "talent acquisition",
        "sourcing specialist", "headhunter", "hrbp"
    },
    "marketing": {
        "seo", "content writer", "copywriter", "digital marketing",
        "social media", "growth marketing", "graphic designer", "brand manager"
    },
    "operations_finance": {
        "accountant", "accounting", "auditor", "chartered accountant",
        "billing", "tax consultant", "financial analyst", "bookkeeper",
        "office assistant", "receptionist", "store manager"
    },
    "healthcare": {
        "nurse", "doctor", "pharmacist", "clinical", "hospital", "physician"
    },
}

TECH_LANGUAGE_MAP = {
    "python": {"python", "django", "fastapi", "flask", "pyspark"},
    "java": {"java", "spring", "springboot", "j2ee", "hibernate"},
    "javascript": {"javascript", "react", "reactjs", "node", "nodejs", "typescript", "angular", "vue", "frontend", "front-end"},
    "c#": {"c#", "csharp", ".net", "dotnet", "asp.net"},
    "c++": {"c++", "cpp"},
    "php": {"php", "laravel", "codeigniter", "wordpress"},
    "ruby": {"ruby", "rails"},
    "golang": {"golang", "go developer", "go engineer"},
    "devops": {"devops", "sre", "site reliability", "kubernetes", "docker", "sysadmin", "infrastructure"},
    "qa": {"qa", "sdet", "test engineer", "automation tester", "manual tester", "quality assurance"},
}

ROLE_FAMILIES = {
    "developer": {
        "developer", "engineer", "programmer", "coder", "architect",
        "software engineer", "sde", "swe", "backend", "full stack",
        "fullstack", "tech lead", "technical lead", "consultant"
    },
    "data_analyst": {
        "data analyst", "business analyst", "bi analyst", "analytics analyst",
        "reporting analyst", "data analytics", "product analyst", "insights analyst"
    },
    "data_scientist": {
        "data scientist", "data science", "machine learning", "ml engineer",
        "ai engineer", "deep learning", "nlp engineer", "ai-native", "agentic ai"
    },
    "data_engineer": {
        "data engineer", "big data", "etl developer", "databricks", "pipeline engineer"
    },
}


def _clean_text(text: str) -> str:
    """Normalize text for consistent keyword matching."""
    if not text:
        return ""
    text = text.lower()
    # Normalize punctuation and delimiters
    text = re.sub(r"[/\\|,;:\-_()[\]{}]+", " ", text)
    # Collapse whitespace
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def _has_word(text: str, word: str) -> bool:
    """Check if a distinct word or multi-word phrase exists in text."""
    pattern = r"(?:^|\b)" + re.escape(word) + r"(?:\b|$)"
    return bool(re.search(pattern, text, re.IGNORECASE))


def is_job_role_relevant(
    title: str,
    query: str,
    description: str = "",
) -> bool:
    """
    Determine if a job title (and optional description) is genuinely relevant
    to the user's entered search query.

    Args:
        title: Extracted job title (e.g. 'Python Developer', 'Data Scientist')
        query: User search query (e.g. 'Python Developer', 'Data Analyst')
        description: Optional job description or snippet for ambiguous cases

    Returns:
        True if the job is relevant to the queried role, False otherwise.
    """
    clean_title = _clean_text(title)
    clean_query = _clean_text(query)
    clean_desc = _clean_text(description[:2000]) if description else ""

    if not clean_title or not clean_query:
        return True

    # Check for direct phrase match first (highest confidence)
    if clean_query in clean_title:
        return True

    # -------------------------------------------------------------------------
    # 1. HARD EXCLUSION: UNRELATED DOMAINS (Sales, HR, Marketing, Finance, etc.)
    # -------------------------------------------------------------------------
    for cat_name, keywords in UNRELATED_ROLES.items():
        # Only exclude if the user is NOT searching for this category
        query_in_cat = any(_has_word(clean_query, kw) for kw in keywords)
        if not query_in_cat:
            if any(_has_word(clean_title, kw) for kw in keywords):
                return False

    # -------------------------------------------------------------------------
    # 2. DATA ANALYST SPECIFIC MATCHING
    # -------------------------------------------------------------------------
    query_is_data_analyst = (
        _has_word(clean_query, "data") and _has_word(clean_query, "analyst")
    ) or "data analyst" in clean_query or "analytics" in clean_query

    if query_is_data_analyst:
        # Must match analyst/analytics domain
        has_analyst = _has_word(clean_title, "analyst") or _has_word(clean_title, "analytics")
        has_data_domain = (
            _has_word(clean_title, "data")
            or _has_word(clean_title, "bi")
            or _has_word(clean_title, "business intelligence")
            or _has_word(clean_title, "reporting")
            or _has_word(clean_title, "insights")
            or _has_word(clean_title, "product")
            or _has_word(clean_title, "sql")
        )
        # Exclude software engineering / scientist roles from Data Analyst
        is_conflicting_role = (
            _has_word(clean_title, "scientist")
            or _has_word(clean_title, "software engineer")
            or _has_word(clean_title, "developer")
            or _has_word(clean_title, "devops")
            or _has_word(clean_title, "qa")
            or _has_word(clean_title, "sales")
            or _has_word(clean_title, "recruiter")
        )
        if is_conflicting_role:
            return False
        return has_analyst and has_data_domain

    # -------------------------------------------------------------------------
    # 3. PYTHON DEVELOPER SPECIFIC MATCHING
    # -------------------------------------------------------------------------
    query_has_python = _has_word(clean_query, "python")
    query_is_dev = any(
        _has_word(clean_query, term)
        for term in ["developer", "engineer", "programmer", "coder", "dev", "backend"]
    )

    if query_has_python and query_is_dev:
        # Exclude unrelated role families
        if _has_word(clean_title, "data scientist") or _has_word(clean_title, "data science"):
            return False
        if _has_word(clean_title, "data analyst") or _has_word(clean_title, "business analyst"):
            return False
        if _has_word(clean_title, "data engineer") and not _has_word(clean_title, "python"):
            return False

        # Exclude conflicting primary languages without Python in title
        has_python_in_title = any(_has_word(clean_title, py_term) for py_term in TECH_LANGUAGE_MAP["python"])
        
        conflicting_languages = ["java", "c#", ".net", "dotnet", "php", "ruby", "golang", "c++", "android", "ios", "swift", "kotlin"]
        if not has_python_in_title:
            for clang in conflicting_languages:
                if _has_word(clean_title, clang) and ("developer" in clean_title or "engineer" in clean_title):
                    return False

        # If title explicitly has Python (or Django, FastAPI, Flask):
        if has_python_in_title:
            # Must also be a developer/engineer/programmer/tech role or intern/fresher
            has_role_term = any(
                _has_word(clean_title, term)
                for term in [
                    "developer", "engineer", "programmer", "coder", "architect",
                    "lead", "intern", "consultant", "specialist", "backend",
                    "full stack", "fullstack", "sde", "swe", "automation", "tech lead",
                    "fresher", "trainee", "associate", "junior", "entry"
                ]
            )
            return has_role_term

        # If title is a generic backend/software developer (e.g. 'Backend Developer', 'Full Stack Engineer'):
        # Check if Python is explicitly highlighted in description or title
        is_dev_role = any(
            _has_word(clean_title, term)
            for term in ["developer", "software engineer", "backend", "full stack", "fullstack", "programmer", "associate software"]
        )
        if is_dev_role:
            # Exclude purely unrelated generic titles like "Custom Software Engineer"
            # unless the description clearly has Python backend focus
            if _has_word(clean_title, "custom software"):
                return False
            if clean_desc and ("python" in clean_desc or "django" in clean_desc or "fastapi" in clean_desc):
                # Verify Python is prominent, not just a passing 1-word mention in a list of 10 languages
                py_count = len(re.findall(r"\bpython\b", clean_desc))
                if py_count >= 2 or "django" in clean_desc or "fastapi" in clean_desc or "flask" in clean_desc:
                    return True

        # If no Python found in title and not a Python backend role, reject
        return False

    # -------------------------------------------------------------------------
    # 4. GENERAL TECH QUERY (e.g. 'Java Developer', 'React Developer')
    # -------------------------------------------------------------------------
    for tech_name, aliases in TECH_LANGUAGE_MAP.items():
        if _has_word(clean_query, tech_name):
            has_tech_match = any(_has_word(clean_title, a) for a in aliases)
            if not has_tech_match:
                # If title has a different language explicitly, reject
                for other_tech, other_aliases in TECH_LANGUAGE_MAP.items():
                    if other_tech != tech_name and any(_has_word(clean_title, oa) for oa in other_aliases):
                        return False
            break

    # -------------------------------------------------------------------------
    # 5. TOKEN OVERLAP FALLBACK
    # -------------------------------------------------------------------------
    query_tokens = [t for t in clean_query.split() if len(t) > 2 and t not in {"and", "for", "the", "with"}]
    if not query_tokens:
        return True

    matching_tokens = sum(1 for t in query_tokens if _has_word(clean_title, t))
    # Require at least 50% of meaningful query words in the title
    return (matching_tokens / len(query_tokens)) >= 0.5
