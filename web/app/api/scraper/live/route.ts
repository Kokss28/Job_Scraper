import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { invalidateJobsCache } from "@/lib/data-service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const sources = Array.isArray(body.sources) && body.sources.length > 0
      ? body.sources.join(",")
      : "LinkedIn,Naukri,Indeed";
    const keywords = (body.keywords && String(body.keywords).trim()) || "Python developer";
    const freshness = Number(body.freshness) > 0 ? Number(body.freshness) : 24;
    const location = (body.location && String(body.location).trim()) || "India";

    let rootDir = process.cwd();
    if (!fs.existsSync(path.join(rootDir, "pipeline", "live_scrape_runner.py"))) {
      rootDir = path.resolve(rootDir, "..");
    }
    const venvPython = path.join(rootDir, ".venv", "Scripts", "python.exe");
    const pythonExe = fs.existsSync(venvPython) ? venvPython : "python";
    const scriptPath = path.join(rootDir, "pipeline", "live_scrape_runner.py");

    const args = [
      scriptPath,
      "--sources",
      sources,
      "--keywords",
      keywords,
      "--freshness",
      String(freshness),
      "--location",
      location,
    ];

    if (body.maxJobs && Number(body.maxJobs) > 0) {
      args.push("--max-jobs", String(body.maxJobs));
    }

    if (body.enableDetails === false) {
      args.push("--no-details");
    } else {
      args.push("--enable-details");
    }

    const encoder = new TextEncoder();
    let resultJson: any = null;

    const stream = new ReadableStream({
      start(controller) {
        const sendEvent = (event: string, data: any) => {
          try {
            const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
            controller.enqueue(encoder.encode(payload));
          } catch {}
        };

        const child = spawn(pythonExe, args, {
          cwd: rootDir,
          env: {
            ...process.env,
            PYTHONUNBUFFERED: "1",
          },
        });

        child.stdout.on("data", (chunk: Buffer) => {
          const text = chunk.toString("utf-8");
          const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);

          for (const line of lines) {
            if (line.includes("__RESULT_JSON__")) {
              const rawJson = line.split("__RESULT_JSON__")[1];
              try {
                resultJson = JSON.parse(rawJson);
              } catch {}
            } else {
              sendEvent("log", { text: line });
            }
          }
        });

        child.stderr.on("data", (chunk: Buffer) => {
          const text = chunk.toString("utf-8");
          const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
          for (const line of lines) {
            if (
              line.includes("InconsistentVersionWarning") ||
              line.includes("UserWarning") ||
              line.includes("FutureWarning")
            ) {
              continue;
            }
            if (line.includes("WARNING") || line.includes("WARN")) {
              sendEvent("log", { text: `[WARN] ${line}` });
            } else if (line.includes("ERROR") || line.includes("Failed")) {
              sendEvent("log", { text: `[ERROR] ${line}` });
            } else {
              sendEvent("log", { text: line });
            }
          }
        });

        child.on("close", (code) => {
          if (code === 0 && resultJson) {
            try {
              invalidateJobsCache();
            } catch {}
            sendEvent("done", {
              success: true,
              result: resultJson,
            });
          } else {
            sendEvent("done", {
              success: false,
              error: resultJson?.message || `Scraper exited with code ${code}`,
            });
          }
          try {
            controller.close();
          } catch {}
        });

        child.on("error", (err) => {
          sendEvent("done", {
            success: false,
            error: `Failed to spawn Python runner: ${err.message}`,
          });
          try {
            controller.close();
          } catch {}
        });
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
