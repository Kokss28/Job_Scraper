import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// RFC 4180 compliant CSV parser supporting quoted newlines and escaped double quotes
function parseCsvRecords(text: string): string[][] {
  const records: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        row.push(field);
        field = "";
      } else if (char === "\r") {
        if (nextChar === "\n") i++;
        row.push(field);
        field = "";
        if (row.some((f) => f.trim().length > 0)) {
          records.push(row);
        }
        row = [];
      } else if (char === "\n") {
        row.push(field);
        field = "";
        if (row.some((f) => f.trim().length > 0)) {
          records.push(row);
        }
        row = [];
      } else {
        field += char;
      }
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some((f) => f.trim().length > 0)) {
      records.push(row);
    }
  }

  return records;
}

function formatCsvRecords(records: string[][]): string {
  return records
    .map((row) =>
      row
        .map((val) => {
          if (
            val.includes(",") ||
            val.includes('"') ||
            val.includes("\n") ||
            val.includes("\r")
          ) {
            return `"${val.replace(/"/g, '""')}"`;
          }
          return val;
        })
        .join(",")
    )
    .join("\r\n");
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const batch = searchParams.get("batch"); // 'latest' or 'all'
    const sourcesParam = searchParams.get("sources"); // comma-separated e.g. "LinkedIn,Naukri,Indeed"
    const freshnessParam = searchParams.get("freshness"); // hours e.g. "24" or "72"
    const recentOnly = searchParams.get("recent");

    let rootDir = process.cwd();
    if (!fs.existsSync(path.join(rootDir, "Data"))) {
      rootDir = path.resolve(rootDir, "..");
    }
    const latestBatchPath = path.join(rootDir, "Data", "latest_extracted_jobs.csv");
    const unifiedCatalogPath = path.join(rootDir, "Data", "unified_jobs.csv");

    // Case 1: user wants the latest extraction batch (or default when latest batch exists)
    if (batch !== "all" && fs.existsSync(latestBatchPath)) {
      const rawLatest = fs.readFileSync(latestBatchPath, "utf-8");
      const records = parseCsvRecords(rawLatest);

      // If the latest file has actual data rows (header + at least 1 job)
      if (records.length > 1) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
        return new NextResponse(rawLatest, {
          status: 200,
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="extracted_jobs_${timestamp}.csv"`,
            "Cache-Control": "no-store, no-cache, must-revalidate",
          },
        });
      }
    }

    // Case 2: unified catalog or fallback
    let targetPath = unifiedCatalogPath;
    if (!fs.existsSync(targetPath)) {
      if (fs.existsSync(latestBatchPath)) {
        targetPath = latestBatchPath;
      } else {
        return NextResponse.json(
          { error: "Extracted jobs CSV file not found on disk." },
          { status: 404 }
        );
      }
    }

    const fileContent = fs.readFileSync(targetPath, "utf-8");
    const records = parseCsvRecords(fileContent);

    if (records.length <= 1) {
      // Only header exists
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      return new NextResponse(fileContent, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="extracted_jobs_${timestamp}.csv"`,
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      });
    }

    const headers = records[0];
    const sourceIdx = headers.findIndex((h) => h.toLowerCase() === "source");
    const collectedAtIdx = headers.findIndex((h) => h.toLowerCase() === "collected_at");

    let dataRows = records.slice(1);

    // 1. Filter by requested platforms if specified
    if (sourcesParam && sourceIdx !== -1) {
      const allowedSources = sourcesParam
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);

      if (allowedSources.length > 0) {
        dataRows = dataRows.filter((cols) => {
          const src = (cols[sourceIdx] || "").toLowerCase().trim();
          return allowedSources.some(
            (allowed) => src.includes(allowed) || allowed.includes(src)
          );
        });
      }
    }

    // 2. Filter by freshness hours if specified (only if rows remain)
    if (freshnessParam && !isNaN(Number(freshnessParam)) && collectedAtIdx !== -1) {
      const maxHours = Number(freshnessParam);
      const cutoffMs = Date.now() - maxHours * 3600 * 1000;

      const freshRows = dataRows.filter((cols) => {
        const dateStr = (cols[collectedAtIdx] || "").trim();
        if (!dateStr || dateStr.toLowerCase() === "not specified") {
          return false;
        }
        const parsed = Date.parse(dateStr);
        if (isNaN(parsed)) return false;
        return parsed >= cutoffMs;
      });

      // If fresh rows are found, use them; if catalog had older jobs matching source, don't drop to 0 if freshness was optional
      if (freshRows.length > 0) {
        dataRows = freshRows;
      }
    }

    // 3. Optional limit for recent N rows
    if (recentOnly && !isNaN(Number(recentOnly))) {
      const limit = Math.max(1, Number(recentOnly));
      dataRows = dataRows.slice(-limit);
    }

    const finalRecords = [headers, ...dataRows];
    const outputCsv = formatCsvRecords(finalRecords);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const filename = `extracted_jobs_${timestamp}.csv`;

    return new NextResponse(outputCsv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to download extracted jobs CSV" },
      { status: 500 }
    );
  }
}
