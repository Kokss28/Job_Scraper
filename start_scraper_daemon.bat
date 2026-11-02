@echo off
title Job Scraper 24/7 Automated Rolling Harvester
echo ==============================================================================
echo           JOB SCRAPER - 24/7 AUTOMATED ROLLING DOMAIN HARVESTER
echo ==============================================================================
echo.
echo Running hourly extraction loop across 4 domains:
echo   - Slot 0: Data ^& Analytics
echo   - Slot 1: Python Development
echo   - Slot 2: Java Development
echo   - Slot 3: Cloud ^& DevOps
echo.
echo Extracted CSVs will be saved automatically to Data\Date\YYYY-MM-DD\
echo Press Ctrl+C in this window at any time to pause or exit.
echo ==============================================================================
echo.

cd /d "%~dp0"
if exist ".venv\Scripts\python.exe" (
    ".venv\Scripts\python.exe" pipeline\automated_domain_extractor.py --daemon
) else (
    python pipeline\automated_domain_extractor.py --daemon
)

pause
