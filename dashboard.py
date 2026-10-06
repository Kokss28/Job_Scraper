from __future__ import annotations

import sqlite3
from datetime import datetime, timedelta
from pathlib import Path
from typing import List

import pandas as pd
import plotly.express as px
import streamlit as st

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "Data" / "jobs.db"
EXPORT_DIR = BASE_DIR / "Data" / "exports"

DEFAULT_COLUMNS = [
    "job_id",
    "source",
    "title",
    "company",
    "search_keyword",
    "city",
    "state",
    "country",
    "min_experience_years",
    "max_experience_years",
    "skills",
    "degree_required",
    "specialization_required",
    "collected_at",
    "link",
    "full_description",
]

st.set_page_config(
    page_title="Job Intelligence Dashboard",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="collapsed",
    menu_items={
        "Get Help": "https://github.com/Pravink1005/Job_Scraper",
        "Report a bug": "https://github.com/Pravink1005/Job_Scraper/issues",
        "About": "Job Dashboard",
    },
)

st.markdown(
    """
    <style>
    :root {
        --bg: #0b1220;
        --panel: #111827;
        --panel-2: #172033;
        --surface: #1f2937;
        --text: #e5e7eb;
        --muted: #9ca3af;
        --primary: #8b5cf6;
        --primary-2: #6366f1;
        --success: #22c55e;
        --border: rgba(148, 163, 184, 0.18);
    }
    html, body, [data-testid="stAppViewContainer"], [data-testid="stApp"] {
        background: linear-gradient(180deg, #0b1220 0%, #0f172a 100%);
        color: var(--text);
    }
    [data-testid="stHeader"] {
        background: rgba(15, 23, 42, 0.7);
        backdrop-filter: blur(10px);
    }
    .block-container {
        padding-top: 1.2rem;
        padding-bottom: 2rem;
    }
    .top-search {
        background: rgba(17, 24, 39, 0.95);
        border: 1px solid var(--border);
        border-radius: 14px;
        padding: 0.8rem 1rem;
        box-shadow: 0 8px 24px rgba(15, 23, 42, 0.35);
    }
    .filter-card {
        background: linear-gradient(180deg, rgba(31,41,55,0.96), rgba(17,24,39,0.96));
        border: 1px solid var(--border);
        border-radius: 16px;
        padding: 1rem 1.1rem;
        height: 100%;
        box-shadow: 0 10px 28px rgba(15, 23, 42, 0.25);
    }
    .metric-box {
        background: linear-gradient(180deg, rgba(99,102,241,0.14), rgba(17,24,39,0.95));
        border: 1px solid rgba(139, 92, 246, 0.3);
        border-radius: 16px;
        padding: 1rem;
    }
    .stDataFrame, .stTabs [role="tablist"] {
        border-radius: 12px;
    }
    .stDownloadButton > button, .stButton > button {
        border-radius: 12px !important;
        font-weight: 600;
        background: linear-gradient(90deg, var(--primary), var(--primary-2));
        color: white;
        border: none;
        box-shadow: 0 10px 18px rgba(99, 102, 241, 0.25);
    }
    .stTabs [role="tablist"] button {
        background: transparent;
        color: var(--text);
        border: 1px solid var(--border);
        border-radius: 10px 10px 0 0;
        margin-right: 0.4rem;
    }
    .stTabs [role="tablist"] .st-emotion-cache-1y3xz0p {
        background: rgba(17, 24, 39, 0.8);
    }
    </style>
    """,
    unsafe_allow_html=True,
)


@st.cache_data
def load_jobs() -> pd.DataFrame:
    if not DB_PATH.exists():
        return pd.DataFrame()

    with sqlite3.connect(DB_PATH) as conn:
        df = pd.read_sql_query("SELECT * FROM jobs ORDER BY collected_at DESC", conn)

    if df.empty:
        return df

    for col in DEFAULT_COLUMNS:
        if col in df.columns:
            df[col] = df[col].fillna("Not Specified").replace({"": "Not Specified"})

    df["collected_at"] = pd.to_datetime(df["collected_at"], errors="coerce", utc=True)
    df["collected_at"] = df["collected_at"].dt.tz_localize(None)
    return df


def parse_csv_list(value: str) -> List[str]:
    if value is None:
        return []
    return [part.strip() for part in str(value).split(",") if part.strip()]


def estimate_time_in_minutes(row_count: int) -> float:
    if row_count <= 0:
        return 0.0
    return round(0.6 + (row_count / 180), 1)


def export_csv(df: pd.DataFrame, filename: str) -> Path:
    EXPORT_DIR.mkdir(parents=True, exist_ok=True)
    out = EXPORT_DIR / filename
    df.to_csv(out, index=False, encoding="utf-8")
    return out


def apply_search(df: pd.DataFrame, query: str) -> pd.DataFrame:
    if df.empty or not query.strip():
        return df

    q = query.strip().lower()
    searchable = df[["title", "company", "city", "state", "country", "search_keyword"]].fillna("").astype(str)
    mask = searchable.apply(lambda row: q in " ".join(row).lower(), axis=1)
    return df[mask].copy()


def parse_experience_value(value):
    if value is None or str(value).strip() == "":
        return None
    if str(value).strip().lower() in {"not specified", "n/a"}:
        return None
    try:
        return float(str(value).strip())
    except ValueError:
        try:
            text = str(value).strip()
            digits = "".join(ch for ch in text if ch.isdigit() or ch in ".+-")
            if not digits:
                return None
            return float(digits)
        except ValueError:
            return None


def apply_filters(
    df: pd.DataFrame,
    *,
    selected_sources: List[str] | None = None,
    selected_titles: List[str] | None = None,
    title_terms: List[str] | None = None,
    location_terms: List[str] | None = None,
    start_date=None,
    end_date=None,
    last_hours: int = 0,
    experience_min: float | None = None,
    experience_max: float | None = None,
) -> pd.DataFrame:
    if df.empty:
        return df.copy()

    filtered = df.copy()

    if selected_sources:
        filtered = filtered[filtered["source"].isin(selected_sources)]

    if selected_titles:
        filtered = filtered[filtered["title"].isin(selected_titles)]

    if title_terms:
        term_list = [t.lower() for t in title_terms if t]
        if term_list:
            filtered = filtered[
                filtered["title"].fillna("").astype(str).str.lower().str.contains("|".join(term_list), case=False, na=False)
            ]

    if location_terms:
        loc_list = [t.lower() for t in location_terms if t]
        if loc_list:
            loc_mask = filtered[["city", "state", "country"]].fillna("").astype(str).apply(
                lambda row: any(term in " ".join(row).lower() for term in loc_list),
                axis=1,
            )
            filtered = filtered[loc_mask]

    if experience_min is not None or experience_max is not None:
        exp_values = filtered["min_experience_years"].apply(parse_experience_value)
        min_mask = pd.Series(True, index=filtered.index)
        max_mask = pd.Series(True, index=filtered.index)

        if experience_min is not None:
            min_mask = exp_values.fillna(float("inf")) >= float(experience_min)
        if experience_max is not None:
            max_mask = exp_values.fillna(float("inf")) <= float(experience_max)

        filtered = filtered[min_mask & max_mask]

    if last_hours and "collected_at" in filtered.columns:
        cutoff = pd.Timestamp(datetime.now())
        filtered = filtered[filtered["collected_at"] >= cutoff - pd.Timedelta(hours=int(last_hours))]

    if start_date is not None and end_date is not None:
        start_ts = pd.Timestamp(start_date)
        end_ts = pd.Timestamp(end_date) + pd.Timedelta(days=1) - pd.Timedelta(seconds=1)
        if "collected_at" in filtered.columns:
            filtered = filtered[(filtered["collected_at"] >= start_ts) & (filtered["collected_at"] <= end_ts)]

    if not filtered.empty:
        filtered = filtered.sort_values("collected_at", ascending=False)

    return filtered


def render_dashboard(df: pd.DataFrame):
    if df.empty:
        st.info("No jobs found yet. Run the scraper first to populate the database.")
        return

    st.sidebar.markdown("### Filters")
    source_options = sorted(df["source"].dropna().unique().tolist())
    title_options = sorted(df["title"].dropna().unique().tolist())

    st.session_state.setdefault("dashboard_sources", source_options)
    st.session_state.setdefault("dashboard_titles", title_options)
    st.session_state.setdefault("dashboard_locations", "")
    st.session_state.setdefault("dashboard_title_terms", "")
    st.session_state.setdefault("dashboard_exp_range", (0.0, 10.0))
    st.session_state.setdefault("dashboard_last_hours", 24)
    st.session_state.setdefault("dashboard_time_mode", "Last N hours")

    def reset_dashboard_filters():
        st.session_state["dashboard_sources"] = source_options
        st.session_state["dashboard_titles"] = title_options
        st.session_state["dashboard_locations"] = ""
        st.session_state["dashboard_title_terms"] = ""
        st.session_state["dashboard_exp_range"] = (0.0, 10.0)
        st.session_state["dashboard_last_hours"] = 24
        st.session_state["dashboard_time_mode"] = "Last N hours"

    with st.sidebar:
        selected_sources = st.multiselect(
            "Sources",
            source_options,
            default=st.session_state["dashboard_sources"],
            key="dashboard_sources",
        )
        selected_titles = st.multiselect(
            "Job Titles",
            title_options,
            default=st.session_state["dashboard_titles"],
            key="dashboard_titles",
        )
        location_input = st.text_input(
            "Locations",
            value=st.session_state.get("dashboard_locations", ""),
            key="dashboard_locations",
            placeholder="Bengaluru, Hyderabad",
        )
        title_input = st.text_input(
            "Title keywords",
            value=st.session_state.get("dashboard_title_terms", ""),
            key="dashboard_title_terms",
            placeholder="Python Developer, Data Analyst",
        )
        exp_min, exp_max = st.slider(
            "Experience range (years)",
            min_value=0.0,
            max_value=20.0,
            value=st.session_state.get("dashboard_exp_range", (0.0, 10.0)),
            step=0.5,
            key="dashboard_exp_range",
        )
        time_mode = st.radio(
            "Timing",
            ["Last N hours", "Date range"],
            index=0 if st.session_state.get("dashboard_time_mode", "Last N hours") == "Last N hours" else 1,
            horizontal=True,
            key="dashboard_time_mode",
        )

        if time_mode == "Last N hours":
            last_hours = st.slider(
                "Last N hours",
                min_value=1,
                max_value=720,
                value=st.session_state.get("dashboard_last_hours", 24),
                key="dashboard_last_hours",
            )
            start_date = None
            end_date = None
        else:
            last_hours = 0
            today = datetime.today().date()
            default_start = today - timedelta(days=30)
            start_date, end_date = st.date_input(
                "Date range",
                value=(default_start, today),
                min_value=datetime(2020, 1, 1).date(),
                max_value=today,
            )

        st.button("Reset Filters", on_click=reset_dashboard_filters)

    filtered = apply_filters(
        df,
        selected_sources=selected_sources,
        selected_titles=selected_titles,
        title_terms=parse_csv_list(title_input) or None,
        location_terms=parse_csv_list(location_input) or None,
        start_date=start_date,
        end_date=end_date,
        last_hours=last_hours,
        experience_min=exp_min,
        experience_max=exp_max,
    )

    if filtered.empty:
        st.warning("No jobs match the current dashboard filters.")
        return

    total_jobs = len(filtered)
    unique_companies = filtered["company"].replace("Not Specified", "").str.strip().nunique()
    top_source = filtered["source"].mode().iloc[0] if not filtered["source"].empty else "N/A"
    top_city = filtered["city"].replace("Not Specified", "").str.strip()
    top_city = top_city[top_city != ""].mode().iloc[0] if not top_city.empty else "N/A"

    c1, c2, c3, c4 = st.columns(4)
    c1.markdown(f"<div class='metric-box'><h4>Total Jobs</h4><h3>{total_jobs}</h3></div>", unsafe_allow_html=True)
    c2.markdown(f"<div class='metric-box'><h4>Companies</h4><h3>{unique_companies}</h3></div>", unsafe_allow_html=True)
    c3.markdown(f"<div class='metric-box'><h4>Top Source</h4><h3>{top_source}</h3></div>", unsafe_allow_html=True)
    c4.markdown(f"<div class='metric-box'><h4>Top City</h4><h3>{top_city}</h3></div>", unsafe_allow_html=True)

    st.markdown("---")

    col1, col2 = st.columns(2)
    source_counts = filtered["source"].value_counts().reset_index()
    source_counts.columns = ["Source", "Jobs"]
    fig1 = px.bar(source_counts, x="Source", y="Jobs", color="Source", title="Jobs by Source")
    col1.plotly_chart(fig1, use_container_width=True)

    city_counts = filtered["city"].replace("Not Specified", "").str.strip()
    city_counts = city_counts[city_counts != ""]
    if not city_counts.empty:
        city_df = city_counts.value_counts().head(10).reset_index()
        city_df.columns = ["City", "Jobs"]
        fig2 = px.bar(city_df, x="City", y="Jobs", title="Top Cities")
    else:
        fig2 = px.bar(pd.DataFrame({"City": ["N/A"], "Jobs": [0]}), x="City", y="Jobs", title="Top Cities")
    col2.plotly_chart(fig2, use_container_width=True)

    col3, col4 = st.columns(2)
    degree_counts = filtered["degree_required"].replace("Not Specified", "").str.strip()
    degree_counts = degree_counts[degree_counts != ""]
    if not degree_counts.empty:
        degree_df = degree_counts.value_counts().head(10).reset_index()
        degree_df.columns = ["Degree", "Jobs"]
        fig3 = px.pie(degree_df, names="Degree", values="Jobs", title="Degree Requirements")
    else:
        fig3 = px.pie(pd.DataFrame({"Degree": ["N/A"], "Jobs": [0]}), names="Degree", values="Jobs", title="Degree Requirements")
    col3.plotly_chart(fig3, use_container_width=True)

    exp_values = filtered["min_experience_years"].apply(lambda x: float(x) if str(x).replace('.', '', 1).isdigit() else None)
    exp_values = exp_values.dropna()
    if not exp_values.empty:
        fig4 = px.histogram(exp_values, x=exp_values, nbins=15, title="Min Experience Distribution")
    else:
        fig4 = px.histogram(pd.DataFrame({"experience": [0]}), x="experience", title="Min Experience Distribution")
    col4.plotly_chart(fig4, use_container_width=True)

    skill_series = filtered["skills"].fillna("").astype(str)
    skill_words = []
    for value in skill_series:
        if value and value.lower() not in {"not specified", "n/a", ""}:
            for item in value.replace(";", ",").replace("|", ",").split(","):
                item = item.strip()
                if item:
                    skill_words.append(item)

    if skill_words:
        skill_df = pd.Series(skill_words).value_counts().head(15).reset_index()
        skill_df.columns = ["Skill", "Count"]
        fig5 = px.bar(skill_df, x="Skill", y="Count", title="Top Skills")
        st.plotly_chart(fig5, use_container_width=True)

    st.markdown("---")
    st.subheader("Recent Jobs")
    recent = filtered.head(20)[["source", "title", "company", "city", "search_keyword", "collected_at", "link"]].copy()
    recent = recent.sort_values("collected_at", ascending=False)
    recent["collected_at"] = recent["collected_at"].dt.strftime("%Y-%m-%d %H:%M")
    recent["Apply Link"] = recent["link"].apply(lambda url: f"[Open]({url})" if str(url).startswith("http") else "")
    recent = recent.rename(columns={"link": "Job URL"})

    st.dataframe(
        recent[["source", "title", "company", "city", "search_keyword", "collected_at", "Job URL", "Apply Link"]],
        use_container_width=True,
        hide_index=True,
        column_config={
            "Job URL": st.column_config.LinkColumn("Job URL", display_text="Open job"),
            "Apply Link": st.column_config.LinkColumn("Apply Link", display_text="Apply"),
        },
    )


def render_extract(df: pd.DataFrame):
    if df.empty:
        st.info("No data available to extract. Run the scraper first.")
        return

    st.subheader("Export Data")
    st.caption("Select the filters you want, then preview and download the result as CSV.")

    source_options = sorted(df["source"].dropna().unique().tolist())
    title_options = sorted(df["title"].dropna().unique().tolist())

    st.session_state.setdefault("extract_sources", source_options)
    st.session_state.setdefault("extract_titles", title_options)
    st.session_state.setdefault("extract_locations", "")
    st.session_state.setdefault("extract_title_terms", "")
    st.session_state.setdefault("extract_exp_range", (0.0, 10.0))

    def reset_extract_filters():
        st.session_state["extract_sources"] = source_options
        st.session_state["extract_titles"] = title_options
        st.session_state["extract_locations"] = ""
        st.session_state["extract_title_terms"] = ""
        st.session_state["extract_exp_range"] = (0.0, 10.0)
        st.session_state["extract_last_hours"] = 24
        st.session_state["extract_time_mode"] = "Last N hours"

    with st.form("extract_form"):
        st.markdown("<div class='filter-card'>", unsafe_allow_html=True)
        col1, col2 = st.columns(2)

        with col1:
            selected_sources = st.multiselect(
                "Sources",
                source_options,
                default=st.session_state["extract_sources"],
                key="extract_sources",
            )
            selected_titles = st.multiselect(
                "Job Titles",
                title_options,
                default=st.session_state["extract_titles"],
                key="extract_titles",
            )
            time_mode = st.radio(
                "Timing",
                ["Last N hours", "Date range"],
                index=0 if st.session_state.get("extract_time_mode", "Last N hours") == "Last N hours" else 1,
                horizontal=True,
                key="extract_time_mode",
            )

            if time_mode == "Last N hours":
                last_hours = st.slider(
                    "Last N hours",
                    min_value=1,
                    max_value=720,
                    value=st.session_state.get("extract_last_hours", 24),
                    key="extract_last_hours",
                )
                start_date = None
                end_date = None
            else:
                last_hours = 0
                today = datetime.today().date()
                default_start = today - timedelta(days=30)
                start_date, end_date = st.date_input(
                    "Date range",
                    value=(default_start, today),
                    min_value=datetime(2020, 1, 1).date(),
                    max_value=today,
                )

        with col2:
            location_input = st.text_input(
                "Locations (comma-separated)",
                value="",
                placeholder="Bengaluru, Hyderabad, Pune",
            )
            title_input = st.text_input(
                "Job titles (comma-separated)",
                value="",
                placeholder="Python Developer, Data Analyst",
            )

        st.markdown("</div>", unsafe_allow_html=True)
        submit = st.form_submit_button("Preview & Extract")

    if not submit:
        return

    filtered = apply_filters(
        df,
        selected_sources=selected_sources,
        selected_titles=selected_titles,
        title_terms=parse_csv_list(title_input) or None,
        location_terms=parse_csv_list(location_input) or None,
        start_date=start_date,
        end_date=end_date,
        last_hours=last_hours,
    )

    if filtered.empty:
        st.warning("No jobs match your selected filters.")
        return

    estimated_minutes = estimate_time_in_minutes(len(filtered))
    st.success(f"Estimated extraction time: {estimated_minutes} minute(s)")
    st.info(f"{len(filtered)} jobs match your filters.")

    preview_cols = [
        "job_id",
        "source",
        "title",
        "company",
        "city",
        "state",
        "country",
        "search_keyword",
        "degree_required",
        "collected_at",
        "link",
    ]
    preview_df = filtered[preview_cols].head(50).copy()
    preview_df["collected_at"] = preview_df["collected_at"].dt.strftime("%Y-%m-%d %H:%M")
    preview_df["Open"] = preview_df["link"].apply(lambda url: f"[Open job]({url})" if str(url).startswith("http") else "")
    preview_df["Apply"] = preview_df["link"].apply(lambda url: f"[Apply]({url})" if str(url).startswith("http") else "")
    preview_df = preview_df[[
        "source",
        "title",
        "company",
        "city",
        "search_keyword",
        "degree_required",
        "collected_at",
        "Open",
        "Apply",
    ]]

    st.dataframe(
        preview_df,
        use_container_width=True,
        hide_index=True,
        column_config={
            "Open": st.column_config.LinkColumn("Open", display_text="Open job"),
            "Apply": st.column_config.LinkColumn("Apply", display_text="Apply"),
        },
    )

    export_filename = "extracted_jobs_" + datetime.now().strftime("%Y%m%d_%H%M%S") + ".csv"
    csv_data = filtered.to_csv(index=False, encoding="utf-8")

    col_a, col_b = st.columns(2)
    with col_a:
        st.download_button(
            label="Download CSV",
            data=csv_data,
            file_name=export_filename,
            mime="text/csv",
        )
    with col_b:
        if st.button("Save to exports folder"):
            saved_path = export_csv(filtered, export_filename)
            st.success(f"Saved to: {saved_path}")


def main():
    st.title("Job Intelligence Dashboard")
    st.caption("Analyze, filter, and export your job data in one place.")

    search_query = st.text_input(
        "Search jobs",
        placeholder="Search by title, company, city, keyword...",
        label_visibility="collapsed",
    )

    df = load_jobs()
    if df.empty:
        st.error("Database not found at Data/jobs.db")
        st.info("Run the scraper first: python main.py --source all")
        return

    df = apply_search(df, search_query)

    tabs = st.tabs(["Dashboard", "Extract Data"])

    with tabs[0]:
        render_dashboard(df)

    with tabs[1]:
        render_extract(df)


if __name__ == "__main__":
    main()
