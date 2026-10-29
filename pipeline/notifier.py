"""
Automated Email & Alert Notification Engine using Gmail SMTP (smtplib).

Features:
- Successful Extraction Alerts: Sends formatted execution digests with counts and sample jobs.
- Failure / Error Alerts: Sends immediate alerts on crashes, timeouts, or 0-job anomalies.
- Standard Library: Uses Python's built-in smtplib + email.mime (zero external packages required).
- Responsive HTML Templates: Modern Tailwind/Inter styled inline email markup for desktop & mobile.
- Safe Execution: Non-blocking; email errors never crash the scraping pipeline.
"""

from __future__ import annotations

import os
import smtplib
import sys
import traceback
from datetime import datetime, timezone, timedelta
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path
from typing import Any, Dict, List, Optional

# Configure utf-8 stdout for cross-platform compatibility
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# Load .env if python-dotenv is present
try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

ROOT_DIR = Path(__file__).resolve().parent.parent

# ============================================================================
# CONFIGURATION & CREDENTIALS
# ============================================================================

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))

# Sender Credentials (Gmail App Password)
SMTP_USER = (
    os.getenv("SMTP_USER")
    or os.getenv("GMAIL_USER")
    or "thoorigai.cons.ttk@gmail.com"
)
SMTP_PASSWORD = (
    os.getenv("SMTP_PASSWORD")
    or os.getenv("GMAIL_APP_PASSWORD")
    or ""
)

# Target Recipient for Notifications
DEFAULT_RECIPIENT = (
    os.getenv("ALERT_RECIPIENT_EMAIL")
    or "thoorigai.cons.ttk@gmail.com"
)

# Live Dashboard URL
DASHBOARD_URL = os.getenv(
    "DASHBOARD_URL",
    "https://job-consolidation-portal.vercel.app/dashboard"
)


def get_current_timestamps() -> Dict[str, str]:
    """Returns timestamps in both UTC and Indian Standard Time (IST)."""
    utc_now = datetime.now(timezone.utc)
    ist_now = utc_now + timedelta(hours=5, minutes=30)
    return {
        "utc": utc_now.strftime("%Y-%m-%d %H:%M:%S UTC"),
        "ist": ist_now.strftime("%Y-%m-%d %I:%M:%S %p IST"),
    }


def format_duration(seconds: float) -> str:
    """Formats duration seconds into human-readable string (e.g. '2m 14s')."""
    if seconds < 60:
        return f"{seconds:.1f}s"
    mins = int(seconds // 60)
    secs = int(seconds % 60)
    return f"{mins}m {secs}s"


# ============================================================================
# CORE SMTP DISPATCHER
# ============================================================================

def send_smtp_email(
    subject: str,
    html_content: str,
    text_content: Optional[str] = None,
    recipient: Optional[str] = None,
) -> bool:
    """
    Sends an email via Gmail SMTP using standard library smtplib.
    Returns True if sent successfully, False otherwise.
    """
    target = recipient or DEFAULT_RECIPIENT

    if not SMTP_USER or not SMTP_PASSWORD:
        print(
            f"[Notifier] Notice: SMTP credentials not set. Email not sent.\n"
            f"           To enable Gmail alerts, set GMAIL_USER and GMAIL_APP_PASSWORD in your .env or GitHub Secrets.\n"
            f"           Target recipient: {target}",
            flush=True,
        )
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"TalentPulse Automation <{SMTP_USER}>"
    msg["To"] = target

    # Fallback plain text
    plain_text = text_content or "Please open this email in an HTML-compatible client to view the extraction report."
    msg.attach(MIMEText(plain_text, "plain", "utf-8"))
    msg.attach(MIMEText(html_content, "html", "utf-8"))

    try:
        server = smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=20)
        server.ehlo()
        server.starttls()
        server.ehlo()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.sendmail(SMTP_USER, [target], msg.as_string())
        server.quit()
        print(f"[Notifier] ✅ Email sent successfully to {target} (Subject: {subject})", flush=True)
        return True
    except Exception as exc:
        print(f"[Notifier] ⚠️ Failed to send email via SMTP ({SMTP_HOST}:{SMTP_PORT}): {exc}", flush=True)
        return False


# ============================================================================
# HIGH-LEVEL ALERT TEMPLATES
# ============================================================================

def send_extraction_success_alert(
    domain_name: str,
    slot_number: Optional[int] = None,
    extracted_jobs: int = 0,
    new_jobs: int = 0,
    duration_seconds: float = 0.0,
    by_source: Optional[Dict[str, int]] = None,
    sample_jobs: Optional[List[Dict[str, Any]]] = None,
    freshness_hours: float = 4.0,
    keywords: Optional[str] = None,
    recipient: Optional[str] = None,
) -> bool:
    """Dispatches a formatted success digest email."""
    target = recipient or DEFAULT_RECIPIENT
    ts = get_current_timestamps()
    slot_label = f"Slot {slot_number}" if slot_number is not None else "Manual Run"
    duration_str = format_duration(duration_seconds)

    subject = f"✅ [SUCCESS] Harvest Complete: {domain_name} ({slot_label}) - {extracted_jobs} Jobs Found"

    # Source breakdown pills
    sources_markup = ""
    if by_source:
        for src, cnt in by_source.items():
            sources_markup += f"""
            <span style="display:inline-block; margin-right:8px; margin-bottom:6px; padding:4px 10px; border-radius:20px; font-size:12px; font-weight:600; background:#EEF2FF; color:#4338CA; border:1px solid #C7D2FE;">
                {src}: <strong>{cnt}</strong>
            </span>
            """
    else:
        sources_markup = "<span style='color:#64748B; font-size:12px;'>Multi-channel (LinkedIn, Naukri, Indeed)</span>"

    # Sample jobs table
    sample_rows = ""
    if sample_jobs and len(sample_jobs) > 0:
        for j in sample_jobs[:6]:
            title = j.get("title", "Position")
            company = j.get("company", "Company")
            city = j.get("city") or "India"
            source = j.get("source", "")
            link = j.get("link", "#")
            sample_rows += f"""
            <tr style="border-bottom:1px solid #F1F5F9;">
                <td style="padding:10px 8px; font-size:13px; font-weight:600; color:#1E293B;">
                    <a href="{link}" style="color:#4F46E5; text-decoration:none;" target="_blank">{title}</a>
                </td>
                <td style="padding:10px 8px; font-size:12px; color:#475569;">{company}</td>
                <td style="padding:10px 8px; font-size:12px; color:#64748B;">{city}</td>
                <td style="padding:10px 8px; font-size:11px; font-weight:700; color:#059669;">{source}</td>
            </tr>
            """

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0; padding:0; background-color:#F8FAFC; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F8FAFC; padding:24px 0;">
            <tr>
                <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%; background-color:#FFFFFF; border-radius:16px; border:1px solid #E2E8F0; overflow:hidden; box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">
                        <!-- Header Banner -->
                        <tr>
                            <td style="background:linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); padding:28px 24px; color:#FFFFFF;">
                                <div style="font-size:11px; text-transform:uppercase; letter-spacing:1.5px; font-weight:800; opacity:0.85; margin-bottom:4px;">
                                    TalentPulse • Automated Extraction System
                                </div>
                                <h1 style="margin:0; font-size:22px; font-weight:800; line-height:1.2;">
                                    {domain_name} ({slot_label})
                                </h1>
                                <div style="margin-top:10px;">
                                    <span style="display:inline-block; padding:4px 12px; border-radius:20px; font-size:11px; font-weight:700; background:#10B981; color:#FFFFFF; text-transform:uppercase;">
                                        ● Execution Success
                                    </span>
                                </div>
                            </td>
                        </tr>

                        <!-- Key Metrics Grid -->
                        <tr>
                            <td style="padding:24px;">
                                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
                                    <tr>
                                        <td width="33%" style="background:#F8FAFC; padding:14px; border-radius:10px; border:1px solid #E2E8F0; text-align:center;">
                                            <div style="font-size:11px; font-weight:700; color:#64748B; text-transform:uppercase;">Extracted</div>
                                            <div style="font-size:22px; font-weight:900; color:#1E293B; margin-top:2px;">{extracted_jobs}</div>
                                            <div style="font-size:10px; color:#10B981; font-weight:600;">{new_jobs} New</div>
                                        </td>
                                        <td width="5%"></td>
                                        <td width="33%" style="background:#F8FAFC; padding:14px; border-radius:10px; border:1px solid #E2E8F0; text-align:center;">
                                            <div style="font-size:11px; font-weight:700; color:#64748B; text-transform:uppercase;">Execution Time</div>
                                            <div style="font-size:18px; font-weight:900; color:#1E293B; margin-top:5px;">{duration_str}</div>
                                            <div style="font-size:10px; color:#64748B; font-weight:600;">Fast Mode</div>
                                        </td>
                                        <td width="5%"></td>
                                        <td width="33%" style="background:#F8FAFC; padding:14px; border-radius:10px; border:1px solid #E2E8F0; text-align:center;">
                                            <div style="font-size:11px; font-weight:700; color:#64748B; text-transform:uppercase;">Time Window</div>
                                            <div style="font-size:18px; font-weight:900; color:#4F46E5; margin-top:5px;">Past {freshness_hours:g}h</div>
                                            <div style="font-size:10px; color:#64748B; font-weight:600;">Rolling Window</div>
                                        </td>
                                    </tr>
                                </table>

                                <!-- Details List -->
                                <div style="font-size:13px; color:#475569; line-height:1.6; margin-bottom:18px;">
                                    <div><strong>🕒 Triggered Time (IST):</strong> {ts['ist']}</div>
                                    <div><strong>🌐 Triggered Time (UTC):</strong> {ts['utc']}</div>
                                    {f"<div><strong>🔍 Keywords:</strong> {keywords}</div>" if keywords else ""}
                                </div>

                                <!-- Platform Breakdown -->
                                <div style="margin-bottom:20px;">
                                    <div style="font-size:12px; font-weight:700; color:#64748B; text-transform:uppercase; margin-bottom:8px;">Yield by Source</div>
                                    <div>{sources_markup}</div>
                                </div>

                                <!-- Sample Extracted Table -->
                                {f'''
                                <div style="margin-top:24px;">
                                    <div style="font-size:12px; font-weight:700; color:#64748B; text-transform:uppercase; margin-bottom:8px;">Sample Harvested Postings</div>
                                    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                                        <thead>
                                            <tr style="border-bottom:2px solid #E2E8F0; text-align:left;">
                                                <th style="padding:6px 8px; font-size:11px; color:#64748B; text-transform:uppercase;">Title</th>
                                                <th style="padding:6px 8px; font-size:11px; color:#64748B; text-transform:uppercase;">Company</th>
                                                <th style="padding:6px 8px; font-size:11px; color:#64748B; text-transform:uppercase;">City</th>
                                                <th style="padding:6px 8px; font-size:11px; color:#64748B; text-transform:uppercase;">Source</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {sample_rows}
                                        </tbody>
                                    </table>
                                </div>
                                ''' if sample_rows else ''}

                                <!-- Action Button -->
                                <div style="text-align:center; margin-top:28px; padding-top:20px; border-top:1px solid #F1F5F9;">
                                    <a href="{DASHBOARD_URL}" style="display:inline-block; padding:12px 28px; background-color:#4F46E5; color:#FFFFFF; text-decoration:none; font-weight:700; font-size:13px; border-radius:10px; box-shadow:0 2px 4px rgba(79, 70, 229, 0.2);" target="_blank">
                                        Open Live TalentPulse Dashboard →
                                    </a>
                                </div>
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td style="background:#F8FAFC; padding:16px 24px; text-align:center; font-size:11px; color:#94A3B8; border-top:1px solid #E2E8F0;">
                                Automated message sent to <strong>{target}</strong> by Job_Scraper Pipeline.
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """
    return send_smtp_email(subject=subject, html_content=html, recipient=recipient)


def send_extraction_failure_alert(
    domain_name: str,
    slot_number: Optional[int] = None,
    error_message: str = "Unknown error occurred during execution",
    traceback_text: Optional[str] = None,
    duration_seconds: float = 0.0,
    keywords: Optional[str] = None,
    recipient: Optional[str] = None,
) -> bool:
    """Dispatches an immediate critical failure alert email."""
    target = recipient or DEFAULT_RECIPIENT
    ts = get_current_timestamps()
    slot_label = f"Slot {slot_number}" if slot_number is not None else "Manual Run"
    duration_str = format_duration(duration_seconds)

    subject = f"🚨 [CRITICAL ALERT] Extraction FAILED: {domain_name} ({slot_label})"

    formatted_trace = traceback_text or error_message

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0; padding:0; background-color:#FEF2F2; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#FEF2F2; padding:24px 0;">
            <tr>
                <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%; background-color:#FFFFFF; border-radius:16px; border:1px solid #FECACA; overflow:hidden; box-shadow:0 4px 6px -1px rgba(220,38,38,0.08);">
                        <!-- Header Banner -->
                        <tr>
                            <td style="background:linear-gradient(135deg, #DC2626 0%, #B91C1C 100%); padding:28px 24px; color:#FFFFFF;">
                                <div style="font-size:11px; text-transform:uppercase; letter-spacing:1.5px; font-weight:800; opacity:0.85; margin-bottom:4px;">
                                    TalentPulse • Pipeline Monitoring Alert
                                </div>
                                <h1 style="margin:0; font-size:22px; font-weight:800; line-height:1.2;">
                                    Extraction Failed: {domain_name} ({slot_label})
                                </h1>
                                <div style="margin-top:10px;">
                                    <span style="display:inline-block; padding:4px 12px; border-radius:20px; font-size:11px; font-weight:700; background:#7F1D1D; color:#FEE2E2; text-transform:uppercase; border:1px solid #EF4444;">
                                        🚨 Execution Error
                                    </span>
                                </div>
                            </td>
                        </tr>

                        <!-- Content -->
                        <tr>
                            <td style="padding:24px;">
                                <div style="background:#FFF1F2; border:1px solid #FECDD3; border-radius:10px; padding:14px; margin-bottom:18px;">
                                    <div style="font-size:12px; font-weight:700; color:#9F1239; text-transform:uppercase; margin-bottom:4px;">Failure Reason</div>
                                    <div style="font-size:14px; font-weight:600; color:#881337;">{error_message}</div>
                                </div>

                                <div style="font-size:13px; color:#475569; line-height:1.6; margin-bottom:18px;">
                                    <div><strong>🕒 Triggered Time (IST):</strong> {ts['ist']}</div>
                                    <div><strong>🌐 Triggered Time (UTC):</strong> {ts['utc']}</div>
                                    <div><strong>⏱️ Elapsed Before Failure:</strong> {duration_str}</div>
                                    {f"<div><strong>🔍 Keywords:</strong> {keywords}</div>" if keywords else ""}
                                </div>

                                <!-- Traceback Code Block -->
                                <div style="margin-top:16px;">
                                    <div style="font-size:11px; font-weight:700; color:#64748B; text-transform:uppercase; margin-bottom:6px;">Stack Trace &amp; Failure Log</div>
                                    <pre style="background:#0F172A; color:#E2E8F0; padding:14px; border-radius:8px; font-size:11px; line-height:1.5; overflow-x:auto; font-family:Consolas, Monaco, monospace; max-height:260px; margin:0;">{formatted_trace}</pre>
                                </div>

                                <!-- Action Button -->
                                <div style="text-align:center; margin-top:24px; padding-top:18px; border-top:1px solid #F1F5F9;">
                                    <a href="https://github.com/Kokss28/Job_Scraper/actions" style="display:inline-block; padding:11px 24px; background-color:#DC2626; color:#FFFFFF; text-decoration:none; font-weight:700; font-size:13px; border-radius:8px;" target="_blank">
                                        View GitHub Actions Run Logs →
                                    </a>
                                </div>
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td style="background:#F8FAFC; padding:14px 24px; text-align:center; font-size:11px; color:#94A3B8; border-top:1px solid #E2E8F0;">
                                Urgent alert dispatched to <strong>{target}</strong> by Job_Scraper Monitoring Engine.
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """
    return send_smtp_email(subject=subject, html_content=html, recipient=recipient)


# ============================================================================
# CLI TEST UTILITY
# ============================================================================

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Test email notification delivery via Gmail SMTP.")
    parser.add_argument("--test", action="store_true", help="Send a test success email")
    parser.add_argument("--test-fail", action="store_true", help="Send a test failure alert email")
    parser.add_argument("--to", type=str, default=DEFAULT_RECIPIENT, help="Recipient email address")
    args = parser.parse_args()

    print(f"[Notifier] Testing Gmail SMTP setup for {args.to}...")
    print(f"           SMTP Host: {SMTP_HOST}:{SMTP_PORT}")
    print(f"           Sender User: {SMTP_USER}")
    print(f"           App Password: {'***' + SMTP_PASSWORD[-4:] if len(SMTP_PASSWORD) >= 4 else 'NOT SET'}")

    if args.test_fail:
        success = send_extraction_failure_alert(
            domain_name="Python Development (Test Failure)",
            slot_number=1,
            error_message="Simulated Playwright Timeout: Unable to reach portal after 30s",
            traceback_text="Traceback (most recent call last):\n  File 'pipeline/live_scrape_runner.py', line 140\n  PlaywrightTimeoutError: Page navigation timed out",
            duration_seconds=32.4,
            keywords="python developer, django developer",
            recipient=args.to,
        )
    else:
        sample_mock = [
            {"title": "Senior Python Backend Engineer", "company": "Swiggy", "city": "Bengaluru", "source": "LinkedIn", "link": "https://linkedin.com"},
            {"title": "Data Analyst (PowerBI, SQL)", "company": "Target India", "city": "Bengaluru", "source": "Indeed", "link": "https://indeed.com"},
            {"title": "Full Stack Java Developer", "company": "TCS", "city": "Chennai", "source": "Naukri", "link": "https://naukri.com"},
        ]
        success = send_extraction_success_alert(
            domain_name="Python Development",
            slot_number=1,
            extracted_jobs=48,
            new_jobs=32,
            duration_seconds=134.5,
            by_source={"LinkedIn": 22, "Naukri": 16, "Indeed": 10},
            sample_jobs=sample_mock,
            freshness_hours=4.0,
            keywords="python developer, python backend, django, fastapi",
            recipient=args.to,
        )

    if success:
        print("[Notifier] ✅ Test email delivered successfully!")
    else:
        print("[Notifier] ⚠️ Test email could not be delivered. Please check credentials above.")
