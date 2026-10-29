import fs from "fs";
import path from "path";
import { createClient } from "@/lib/supabase/server";
import { hasEnvVars } from "@/lib/utils";
import {
  UnifiedJobRecord,
  classifyEducation,
  parseExpNumber,
  computeCareerTier,
  formatExpDisplay,
  normalizeIndianHub,
} from "./taxonomy";

export * from "./taxonomy";

// Fallback CSV parser reading ../Data/unified_jobs.csv
function loadJobsFromLocalCsv(): UnifiedJobRecord[] {
  try {
    let csvPath = path.resolve(process.cwd(), "../Data/unified_jobs.csv");
    if (!fs.existsSync(csvPath)) {
      csvPath = path.resolve(process.cwd(), "Data/unified_jobs.csv");
    }
    if (!fs.existsSync(csvPath)) return [];

    const fileContent = fs.readFileSync(csvPath, "utf-8");
    const lines = fileContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) return [];

    const headers = parseCsvLine(lines[0]);
    const records: UnifiedJobRecord[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCsvLine(lines[i]);
      if (values.length < headers.length) continue;

      const obj: any = {};
      headers.forEach((h, idx) => {
        obj[h] = values[idx] || "Not Specified";
      });

      const minExp = parseExpNumber(obj.min_experience_years);
      const maxExp = parseExpNumber(obj.max_experience_years);
      const edu = classifyEducation(obj.degree_required);

      records.push({
        ...obj,
        min_exp_num: minExp,
        max_exp_num: maxExp,
        career_tier: computeCareerTier(minExp, maxExp),
        normalized_location: normalizeIndianHub(
          obj.city,
          obj.state,
          obj.country
        ),
        edu_cluster: edu.edu_cluster,
        edu_subcluster: edu.edu_subcluster,
        edu_degrees: edu.edu_degrees,
        exp_display: formatExpDisplay(minExp, maxExp),
      });
    }

    return records;
  } catch (err) {
    console.error("Error loading local CSV:", err);
    return [];
  }
}

function parseCsvLine(text: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  result.push(cur.trim());
  return result;
}

// In-memory cache for fast sub-millisecond responses
let cachedCatalog: {
  jobs: UnifiedJobRecord[];
  isCloudSupabase: boolean;
  timestamp: number;
} | null = null;
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

export function invalidateJobsCache(): void {
  cachedCatalog = null;
}

// Master loader: tries Supabase first; falls back cleanly to local CSV
export async function getJobsCatalog(): Promise<{
  jobs: UnifiedJobRecord[];
  isCloudSupabase: boolean;
}> {
  if (cachedCatalog && Date.now() - cachedCatalog.timestamp < CACHE_TTL_MS) {
    return { jobs: cachedCatalog.jobs, isCloudSupabase: cachedCatalog.isCloudSupabase };
  }

  if (hasEnvVars) {
    try {
      const supabase = await createClient();
      // Supabase / PostgREST limits single requests to 1,000 rows by default.
      // Fetch in chunks of 1,000 to retrieve ALL extracted jobs without truncation.
      const PAGE_SIZE = 1000;
      let allRawJobs: any[] = [];
      let page = 0;

      while (true) {
        const from = page * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;
        const { data, error } = await supabase
          .from("jobs")
          .select("*")
          .order("collected_at", { ascending: false })
          .range(from, to);

        if (error) {
          console.warn("Supabase query page error:", error);
          break;
        }

        if (data && data.length > 0) {
          allRawJobs.push(...data);
          if (data.length < PAGE_SIZE) {
            break;
          }
          page++;
        } else {
          break;
        }
      }

      if (allRawJobs.length > 0) {
        const enriched: UnifiedJobRecord[] = allRawJobs.map((j: any) => {
          const minExp = parseExpNumber(j.min_experience_years);
          const maxExp = parseExpNumber(j.max_experience_years);
          const edu = classifyEducation(j.degree_required);
          return {
            ...j,
            min_exp_num: minExp,
            max_exp_num: maxExp,
            career_tier: computeCareerTier(minExp, maxExp),
            normalized_location: normalizeIndianHub(
              j.city,
              j.state,
              j.country
            ),
            edu_cluster: edu.edu_cluster,
            edu_subcluster: edu.edu_subcluster,
            edu_degrees: edu.edu_degrees,
            exp_display: formatExpDisplay(minExp, maxExp),
          };
        });
        cachedCatalog = { jobs: enriched, isCloudSupabase: true, timestamp: Date.now() };
        return { jobs: enriched, isCloudSupabase: true };
      }
    } catch (e) {
      console.warn("Supabase query failed, falling back to local catalog:", e);
    }
  }

  // Local fallback
  const localJobs = loadJobsFromLocalCsv();
  cachedCatalog = { jobs: localJobs, isCloudSupabase: false, timestamp: Date.now() };
  return { jobs: localJobs, isCloudSupabase: false };
}
