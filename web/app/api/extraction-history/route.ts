import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  // Parse header and strip BOM
  const headers = lines[0]
    .split(",")
    .map((h) => h.replace(/^\uFEFF/, "").trim());

  const records: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    // Regex to split by comma ignoring commas inside quotes
    const regex = /(?:,|\n|^)("(?:(?:"")*[^"]*)*"|[^",\n]*|(?:\n|$))/g;
    const values: string[] = [];
    let match;
    while ((match = regex.exec(line)) !== null) {
      let val = match[1] ?? "";
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.slice(1, -1).replace(/""/g, '"');
      }
      values.push(val.trim());
      if (match.index === regex.lastIndex) {
        regex.lastIndex++;
      }
    }

    if (values.length >= headers.length) {
      const rec: Record<string, string> = {};
      headers.forEach((h, idx) => {
        rec[h] = values[idx] ?? "";
      });
      records.push(rec);
    }
  }

  return records;
}

function calculateStartTime(dateStr: string, timeStr: string, durationSeconds: number): string {
  try {
    // timeStr e.g. "11:25:37 AM"
    const match = timeStr.match(/(\d+):(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return timeStr;

    let [_, hoursStr, minsStr, secsStr, ampm] = match;
    let hours = parseInt(hoursStr, 10);
    const mins = parseInt(minsStr, 10);
    const secs = parseInt(secsStr, 10);

    if (ampm.toUpperCase() === "PM" && hours < 12) hours += 12;
    if (ampm.toUpperCase() === "AM" && hours === 12) hours = 0;

    const [year, month, day] = dateStr.split("-").map((n) => parseInt(n, 10));
    const compDate = new Date(Date.UTC(year, month - 1, day, hours, mins, secs));

    const startDate = new Date(compDate.getTime() - Math.round(durationSeconds * 1000));
    let sHours = startDate.getUTCHours();
    const sMins = startDate.getUTCMinutes();
    const sSecs = startDate.getUTCSeconds();
    const sAmpm = sHours >= 12 ? "PM" : "AM";
    sHours = sHours % 12 || 12;

    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    return `${pad(sHours)}:${pad(sMins)}:${pad(sSecs)} ${sAmpm}`;
  } catch {
    return timeStr;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedDate = searchParams.get("date"); // e.g. "2026-11-14"

    let rootDir = process.cwd();
    if (!fs.existsSync(path.join(rootDir, "Data"))) {
      rootDir = path.resolve(rootDir, "..");
    }
    const historyCsvPath = path.join(rootDir, "Data", "extraction_history.csv");

    if (!fs.existsSync(historyCsvPath)) {
      return NextResponse.json({
        success: true,
        dates: [],
        selectedDate: requestedDate || new Date().toISOString().slice(0, 10),
        summary: {
          totalRuns: 0,
          totalExtracted: 0,
          completedCount: 0,
          failedCount: 0,
          sourceYields: { LinkedIn: 0, Naukri: 0, Indeed: 0 },
        },
        runs: [],
        catalogPostings: 11819,
        activeSourcingApis: 3,
        lastUpdated: new Date().toISOString(),
      });
    }

    const rawCsv = fs.readFileSync(historyCsvPath, "utf-8");
    const records = parseCsv(rawCsv);

    const parsedRuns = records.map((rec, index) => {
      const timeIst = rec["Extraction_Time_IST"] || "";
      // Expected format: "2026-11-14 11:25:37 AM IST"
      const datePart = timeIst.slice(0, 10);
      const timeMatch = timeIst.match(/(\d{2}:\d{2}:\d{2}\s*(?:AM|PM))/i);
      const completionTime = timeMatch ? timeMatch[1] : timeIst.slice(11).replace("IST", "").trim();

      const durationSec = parseFloat(rec["Duration_Seconds"] || "0") || 0;
      const startTime = calculateStartTime(datePart, completionTime, durationSec);

      let durationFormatted = `${durationSec.toFixed(1)}s`;
      if (durationSec >= 60) {
        const m = Math.floor(durationSec / 60);
        const s = Math.round(durationSec % 60);
        durationFormatted = `${m}m ${s}s`;
      }

      const rawStatus = (rec["Status"] || "SUCCESS").trim().toUpperCase();
      let status: "Completed" | "Failed" | "Running" = "Completed";
      if (rawStatus === "FAILED" || rec["Error_Notes"]) {
        status = "Failed";
      } else if (rawStatus === "RUNNING") {
        status = "Running";
      }

      const totalExtracted = parseInt(rec["Jobs_Extracted_Now"] || "0", 10) || 0;
      const newJobs = parseInt(rec["New_Jobs_Added"] || "0", 10) || 0;
      const yieldLinkedIn = parseInt(rec["Yield_LinkedIn"] || "0", 10) || 0;
      const yieldNaukri = parseInt(rec["Yield_Naukri"] || "0", 10) || 0;
      const yieldIndeed = parseInt(rec["Yield_Indeed"] || "0", 10) || 0;

      return {
        id: `run_${datePart.replace(/-/g, "")}_${index}_${completionTime.replace(/[^0-9]/g, "")}`,
        date: datePart,
        startTime: `${startTime} IST`,
        completionTime: `${completionTime} IST`,
        durationSeconds: durationSec,
        durationFormatted,
        totalJobs: totalExtracted,
        newJobs,
        totalDatabase: parseInt(rec["Total_Database_Jobs"] || "11819", 10) || 11819,
        sources: rec["Sources"] || "LinkedIn, Naukri, Indeed",
        domain: rec["Domain"] || "General Tech Sourcing",
        slot: rec["Slot"] || "Standard",
        keywords: rec["Keywords"] || "Python developer",
        location: rec["Location"] || "India",
        status,
        yieldLinkedIn,
        yieldNaukri,
        yieldIndeed,
        batchCsvFile: rec["Batch_CSV_File"] || "",
        batchCsvPath: rec["Batch_CSV_Path"] || "",
        errorNotes: rec["Error_Notes"] || null,
        fullTimestampIst: timeIst,
      };
    });

    // Extract all unique dates present
    const uniqueDates = Array.from(new Set(parsedRuns.map((r) => r.date).filter(Boolean)))
      .sort((a, b) => b.localeCompare(a));

    // Always honor requestedDate if provided; otherwise fallback to latest date available or today
    const selectedDate = requestedDate
      ? requestedDate
      : (uniqueDates[0] || new Date().toISOString().slice(0, 10));

    // Filter to selected date only (reverse so most recent extraction is top)
    const dateRuns = parsedRuns
      .filter((r) => r.date === selectedDate)
      .reverse();

    const summary = {
      totalRuns: dateRuns.length,
      totalExtracted: dateRuns.reduce((acc, r) => acc + (r.status === "Completed" ? r.totalJobs : 0), 0),
      completedCount: dateRuns.filter((r) => r.status === "Completed").length,
      failedCount: dateRuns.filter((r) => r.status === "Failed").length,
      sourceYields: {
        LinkedIn: dateRuns.reduce((acc, r) => acc + r.yieldLinkedIn, 0),
        Naukri: dateRuns.reduce((acc, r) => acc + r.yieldNaukri, 0),
        Indeed: dateRuns.reduce((acc, r) => acc + r.yieldIndeed, 0),
      },
    };

    return NextResponse.json(
      {
        success: true,
        dates: uniqueDates,
        selectedDate,
        summary,
        runs: dateRuns,
        catalogPostings: 11819,
        activeSourcingApis: 3,
        lastUpdated: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to fetch extraction history" },
      { status: 500 }
    );
  }
}

