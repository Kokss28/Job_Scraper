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
  CITY_SEARCH_ALIASES,
  CITY_TO_STATE_FALLBACK,
  EXPERIENCE_FILTER_OPTIONS,
} from "./taxonomy";

export * from "./taxonomy";

export interface DashboardStats {
  totalJobs: number;
  byLocation: { state: string; city: string; count: number }[];
  topSkills: { skill: string; count: number }[];
  dailyTrend: { date: string; count: number }[];
  isCloudSupabase: boolean;
}

export interface JobFilterParams {
  page?: number;
  pageSize?: number;
  query?: string;
  city?: string;
  state?: string;
  skill?: string;
  hours?: number;
  experience?: string;
  source?: string;
}

export interface PaginatedJobsResult {
  jobs: UnifiedJobRecord[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  isCloudSupabase: boolean;
}

// In-memory cache for fast sub-millisecond responses
let cachedStats: { data: DashboardStats; timestamp: number } | null = null;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes (aligns with scraper frequency)

export function invalidateJobsCache(): void {
  cachedStats = null;
  cachedCatalog = null;
}

// ---------------------------------------------------------------------------
// 1. HIGH-SPEED AGGREGATED STATS (< 25 KB payload)
// ---------------------------------------------------------------------------
export async function getDashboardStats(): Promise<DashboardStats> {
  if (cachedStats && Date.now() - cachedStats.timestamp < CACHE_TTL_MS) {
    return cachedStats.data;
  }

  if (hasEnvVars) {
    try {
      const supabase = await createClient();

      // 1. Try querying the ultra-fast PostgreSQL Materialized View
      const { data, error } = await supabase
        .from("dashboard_stats")
        .select("total_jobs, by_location, top_skills, daily_trend")
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        const stats: DashboardStats = {
          totalJobs: Number(data.total_jobs || 0),
          byLocation: Array.isArray(data.by_location) ? data.by_location : [],
          topSkills: Array.isArray(data.top_skills) ? data.top_skills : [],
          dailyTrend: Array.isArray(data.daily_trend) ? data.daily_trend : [],
          isCloudSupabase: true,
        };
        cachedStats = { data: stats, timestamp: Date.now() };
        return stats;
      }

      // 2. High-speed full database location resolution across all jobs
      const countRes = await supabase.from("jobs").select("job_id", { count: "exact", head: true });
      const total = countRes.count || 0;

      // Parallel batch query for city, state across the entire database (chunks of 1000)
      const CHUNK_SIZE = 1000;
      const chunkPromises: PromiseLike<any>[] = [];
      for (let offset = 0; offset < total; offset += CHUNK_SIZE) {
        chunkPromises.push(
          supabase
            .from("jobs")
            .select("city, state")
            .range(offset, offset + CHUNK_SIZE - 1)
        );
      }

      // Simultaneously fetch recent 2000 jobs for skills and daily trends
      const samplePromise = supabase
        .from("jobs")
        .select("skills, collected_at")
        .order("collected_at", { ascending: false })
        .limit(2000);

      const [chunkResults, sampleRes] = await Promise.all([
        Promise.all(chunkPromises),
        samplePromise,
      ]);

      const locMap = new Map<string, number>();
      const skillMap = new Map<string, number>();
      const dateMap = new Map<string, number>();

      for (const res of chunkResults) {
        for (const r of res.data || []) {
          const rawCity = (r.city || "").trim();
          if (rawCity && rawCity !== "Not Specified" && rawCity !== "Remote") {
            let stateVal = (r.state || "").trim();
            if (!stateVal || stateVal === "Not Specified" || stateVal === "Other") {
              const cLower = rawCity.toLowerCase();
              for (const [cKey, sVal] of Object.entries(CITY_TO_STATE_FALLBACK)) {
                if (cLower.includes(cKey)) {
                  stateVal = sVal;
                  break;
                }
              }
            }
            const key = `${stateVal || "Other"}||${rawCity}`;
            locMap.set(key, (locMap.get(key) || 0) + 1);
          }
        }
      }

      for (const r of sampleRes.data || []) {
        if (r.skills && r.skills !== "Not Specified") {
          for (const s of String(r.skills).split(",")) {
            const sk = s.trim();
            if (sk && sk.length > 1) {
              skillMap.set(sk, (skillMap.get(sk) || 0) + 1);
            }
          }
        }
        if (r.collected_at) {
          const d = String(r.collected_at).slice(0, 10);
          dateMap.set(d, (dateMap.get(d) || 0) + 1);
        }
      }

      // Return all locations with authentic database counts
      const byLocation = Array.from(locMap.entries())
        .map(([k, count]) => {
          const [state, city] = k.split("||");
          return { state, city, count };
        })
        .sort((a, b) => b.count - a.count);

      const topSkills = Array.from(skillMap.entries())
        .map(([skill, count]) => ({ skill, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 30);

      const dailyTrend = Array.from(dateMap.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 30);

      const stats: DashboardStats = {
        totalJobs: total,
        byLocation,
        topSkills,
        dailyTrend,
        isCloudSupabase: true,
      };
      cachedStats = { data: stats, timestamp: Date.now() };
      return stats;
    } catch (err) {
      console.warn("Could not query Supabase stats, falling back to local:", err);
    }
  }

  // Local fallback stats
  const localJobs = loadJobsFromLocalCsv();
  const locMap = new Map<string, number>();
  const skillMap = new Map<string, number>();
  const dateMap = new Map<string, number>();

  for (const r of localJobs) {
    if (r.city && r.city !== "Not Specified") {
      const key = `${r.state || "Other"}||${r.city}`;
      locMap.set(key, (locMap.get(key) || 0) + 1);
    }
    if (r.skills && r.skills !== "Not Specified") {
      for (const s of String(r.skills).split(",")) {
        const sk = s.trim();
        if (sk && sk.length > 1) {
          skillMap.set(sk, (skillMap.get(sk) || 0) + 1);
        }
      }
    }
    if (r.collected_at) {
      const d = String(r.collected_at).slice(0, 10);
      dateMap.set(d, (dateMap.get(d) || 0) + 1);
    }
  }

  const stats: DashboardStats = {
    totalJobs: localJobs.length,
    byLocation: Array.from(locMap.entries())
      .map(([k, count]) => {
        const [state, city] = k.split("||");
        return { state, city, count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 50),
    topSkills: Array.from(skillMap.entries())
      .map(([skill, count]) => ({ skill, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 30),
    dailyTrend: Array.from(dateMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => b.date.localeCompare(a.date)),
    isCloudSupabase: false,
  };
  cachedStats = { data: stats, timestamp: Date.now() };
  return stats;
}

// ---------------------------------------------------------------------------
// 2. SERVER-PAGINATED JOBS (Only 20 to 50 lightweight card rows)
// ---------------------------------------------------------------------------
export async function getPaginatedJobs(
  params: JobFilterParams = {}
): Promise<PaginatedJobsResult> {
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(100, Math.max(10, params.pageSize || 25));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  if (hasEnvVars) {
    try {
      const supabase = await createClient();

      let query = supabase
        .from("jobs")
        .select(
          "job_id, source, title, company, city, state, country, min_experience_years, max_experience_years, skills, degree_required, collected_at, link",
          { count: "exact" }
        );

      // Server-side text search
      if (params.query?.trim()) {
        const q = params.query.trim();
        query = query.or(
          `title.ilike.%${q}%,company.ilike.%${q}%,skills.ilike.%${q}%,city.ilike.%${q}%`
        );
      }

      // City filter with alias expansion
      if (params.city && params.city !== "All India") {
        const cLower = params.city.trim().toLowerCase();
        const aliases = CITY_SEARCH_ALIASES[cLower] || [cLower];
        const orConditions = aliases.map((a) => `city.ilike.%${a}%`).join(",");
        query = query.or(orConditions);
      }

      // State filter
      if (params.state) {
        query = query.ilike("state", `%${params.state.trim()}%`);
      }

      // Skill filter
      if (params.skill) {
        query = query.ilike("skills", `%${params.skill.trim()}%`);
      }

      // Source filter (LinkedIn, Indeed, Naukri)
      if (params.source && params.source.toLowerCase() !== "all") {
        query = query.ilike("source", `%${params.source.trim()}%`);
      }

      // Experience filter (0-2, 3-5, 6-8, 8+)
      if (params.experience && params.experience.toLowerCase() !== "all") {
        const tier = params.experience.trim();
        const expOpt = EXPERIENCE_FILTER_OPTIONS.find((o) => o.key === tier);
        if (expOpt && expOpt.dbValues && expOpt.dbValues.length > 0) {
          query = query.in("min_experience_years", [...expOpt.dbValues]);
        }
      }

      // Time window recency filter (hours)
      if (params.hours && params.hours > 0) {
        const cutoff = new Date(Date.now() - params.hours * 60 * 60 * 1000).toISOString();
        query = query.gte("collected_at", cutoff);
      }

      const { data, count, error } = await query
        .order("collected_at", { ascending: false, nullsFirst: false })
        .range(from, to);

      if (!error && data) {
        const totalCount = count || 0;
        const enriched: UnifiedJobRecord[] = data.map((j: any) => {
          const minExp = parseExpNumber(j.min_experience_years);
          const maxExp = parseExpNumber(j.max_experience_years);
          const edu = classifyEducation(j.degree_required);
          return {
            ...j,
            min_exp_num: minExp,
            max_exp_num: maxExp,
            career_tier: computeCareerTier(minExp, maxExp),
            normalized_location: normalizeIndianHub(j.city, j.state, j.country),
            edu_cluster: edu.edu_cluster,
            edu_subcluster: edu.edu_subcluster,
            edu_degrees: edu.edu_degrees,
            exp_display: formatExpDisplay(minExp, maxExp),
          };
        });

        return {
          jobs: enriched,
          totalCount,
          page,
          pageSize,
          totalPages: Math.ceil(totalCount / pageSize),
          isCloudSupabase: true,
        };
      }
    } catch (e) {
      console.warn("Supabase paginated query failed, falling back to local CSV:", e);
    }
  }

  // Local fallback filtering
  const allLocal = loadJobsFromLocalCsv();
  let filtered = allLocal;

  if (params.query?.trim()) {
    const q = params.query.toLowerCase().trim();
    filtered = filtered.filter(
      (j) =>
        j.title?.toLowerCase().includes(q) ||
        j.company?.toLowerCase().includes(q) ||
        j.skills?.toLowerCase().includes(q)
    );
  }

  if (params.city && params.city !== "All India") {
    const c = params.city.toLowerCase().trim();
    const aliases = CITY_SEARCH_ALIASES[c] || [c];
    filtered = filtered.filter((j) => {
      const jc = (j.city || "").toLowerCase();
      return aliases.some((a) => jc.includes(a));
    });
  }

  if (params.skill) {
    const s = params.skill.toLowerCase();
    filtered = filtered.filter((j) => j.skills?.toLowerCase().includes(s));
  }

  if (params.source && params.source.toLowerCase() !== "all") {
    const s = params.source.toLowerCase().trim();
    filtered = filtered.filter((j) => (j.source || "").toLowerCase().includes(s));
  }

  if (params.experience && params.experience.toLowerCase() !== "all") {
    const expKey = params.experience.trim();
    filtered = filtered.filter((j) => {
      const minExp = parseExpNumber(j.min_experience_years);
      const maxExp = parseExpNumber(j.max_experience_years);
      const exp = minExp !== null ? minExp : maxExp;
      if (exp === null) return false;
      if (expKey === "0-2") return exp <= 2.0;
      if (expKey === "3-5") return exp >= 3.0 && exp <= 5.0;
      if (expKey === "6-8") return exp >= 6.0 && exp <= 8.0;
      if (expKey === "8+") return exp >= 8.0;
      return true;
    });
  }

  const totalCount = filtered.length;
  const pageSlice = filtered.slice(from, to + 1);

  return {
    jobs: pageSlice,
    totalCount,
    page,
    pageSize,
    totalPages: Math.ceil(totalCount / pageSize),
    isCloudSupabase: false,
  };
}

// ---------------------------------------------------------------------------
// 3. ON-DEMAND FULL DESCRIPTION (< 5 KB per click)
// ---------------------------------------------------------------------------
export async function getJobFullDescription(jobId: string): Promise<string | null> {
  if (hasEnvVars) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("jobs")
        .select("full_description")
        .eq("job_id", jobId)
        .maybeSingle();

      if (!error && data?.full_description) {
        return data.full_description;
      }
    } catch (e) {
      console.warn("Could not fetch full_description from Supabase:", e);
    }
  }

  const allLocal = loadJobsFromLocalCsv();
  const match = allLocal.find((j) => j.job_id === jobId);
  return match?.full_description || "Full job description is not available for this posting.";
}

// ---------------------------------------------------------------------------
// 4. BACKWARD-COMPATIBLE FAST CATALOG LOADER (For legacy sub-pages)
// ---------------------------------------------------------------------------
let cachedCatalog: {
  jobs: UnifiedJobRecord[];
  isCloudSupabase: boolean;
  timestamp: number;
} | null = null;

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
      const countRes = await supabase.from("jobs").select("job_id", { count: "exact", head: true });
      const total = countRes.count || 0;

      if (total > 0) {
        const CHUNK_SIZE = 1000;
        const chunkPromises: PromiseLike<any>[] = [];
        for (let offset = 0; offset < total; offset += CHUNK_SIZE) {
          chunkPromises.push(
            supabase
              .from("jobs")
              .select(
                "job_id, source, title, company, city, state, country, min_experience_years, max_experience_years, skills, degree_required, collected_at, link"
              )
              .order("collected_at", { ascending: false, nullsFirst: false })
              .range(offset, offset + CHUNK_SIZE - 1)
          );
        }

        const chunkResults = await Promise.all(chunkPromises);
        const allRows: any[] = [];
        for (const res of chunkResults) {
          if (res.data && Array.isArray(res.data)) {
            allRows.push(...res.data);
          }
        }

        const enriched: UnifiedJobRecord[] = allRows.map((j: any) => {
          const minExp = parseExpNumber(j.min_experience_years);
          const maxExp = parseExpNumber(j.max_experience_years);
          const edu = classifyEducation(j.degree_required);
          return {
            ...j,
            min_exp_num: minExp,
            max_exp_num: maxExp,
            career_tier: computeCareerTier(minExp, maxExp),
            normalized_location: normalizeIndianHub(j.city, j.state, j.country),
            edu_cluster: edu.edu_cluster,
            edu_subcluster: edu.edu_subcluster,
            edu_degrees: edu.edu_degrees,
            exp_display: formatExpDisplay(minExp, maxExp),
          };
        });

        cachedCatalog = {
          jobs: enriched,
          isCloudSupabase: true,
          timestamp: Date.now(),
        };
        return { jobs: enriched, isCloudSupabase: true };
      }
    } catch (e) {
      console.warn("Supabase full catalog query failed, falling back to local CSV:", e);
    }
  }

  // Fallback to local CSV
  const localJobs = loadJobsFromLocalCsv();
  cachedCatalog = {
    jobs: localJobs,
    isCloudSupabase: false,
    timestamp: Date.now(),
  };
  return { jobs: localJobs, isCloudSupabase: false };
}

// ---------------------------------------------------------------------------
// 5. LOCAL CSV FALLBACK PARSER
// ---------------------------------------------------------------------------
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
        normalized_location: normalizeIndianHub(obj.city, obj.state, obj.country),
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
