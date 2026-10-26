// ============================================================================
// EDUCATION TAXONOMY & TYPES (SHARED CLIENT & SERVER)
// ============================================================================

export type UnifiedJobRecord = {
  job_id: string;
  source: string;
  title: string;
  company: string;
  search_keyword: string;
  city: string;
  state: string;
  country: string;
  min_experience_years: string;
  max_experience_years: string;
  experience_review: string;
  skills: string;
  degree_required: string;
  specialization_required: string;
  collected_at: string;
  link: string;
  full_description: string;
  min_exp_num: number | null;
  max_exp_num: number | null;
  career_tier: string;
  normalized_location: string;
  edu_cluster: string;
  edu_subcluster: string;
  edu_degrees: string[];
  exp_display: string;
};

export const EDUCATION_TAXONOMY: Record<
  string,
  Record<string, { patterns: Array<[string, RegExp]>; color: string }>
> = {
  "Undergraduate / Any Graduate": {
    "Tech & Engineering (B.E., B.Tech, BCA, B.Sc CS)": {
      patterns: [
        ["B.E.", /\bb\.?e\b/i],
        ["B.Tech", /\bb\.?tech\b/i],
        ["BCA", /\bb\.?c\.?a\b|bca\b/i],
        ["B.Sc CS", /\bb\.?sc\.?\s*(cs|it)/i],
      ],
      color: "#818cf8",
    },
    "General Graduate (Any Graduate, B.A., B.Com, B.Sc.)": {
      patterns: [
        ["Any Graduate", /any\s+graduate|any\s+bachelor/i],
        ["B.Sc.", /\bb\.?sc\b(?!(\.|\s)*(cs|it))/i],
        ["B.Com.", /\bb\.?com\b/i],
        ["B.A.", /\bb\.?a\b/i],
        ["Bachelor's", /\bbachelor('s)?\b/i],
      ],
      color: "#6366f1",
    },
  },
  "Postgraduate / Master's": {
    "Tech & Management (MCA, M.Tech, MBA)": {
      patterns: [
        ["MCA", /\bmca\b/i],
        ["M.Tech", /\bm\.?tech\b/i],
        ["M.E.", /\bm\.?e\b/i],
        ["MBA", /\bmba\b/i],
      ],
      color: "#a78bfa",
    },
    "General Master's (Any Postgraduate, M.Sc., M.Com)": {
      patterns: [
        ["Any Postgraduate", /any\s+postgraduate|any\s+master/i],
        ["M.Sc.", /\bm\.?sc\b/i],
        ["M.Com.", /\bm\.?com\b/i],
        ["Master's", /\bmaster('s)?\b/i],
      ],
      color: "#8b5cf6",
    },
  },
  "Doctorate & Specialized": {
    "Ph.D. / Research": {
      patterns: [["Ph.D.", /\bph\.?d\b|doctorate/i]],
      color: "#10b981",
    },
  },
  "Open / No Degree Required": {
    "Diploma": {
      patterns: [
        ["Diploma", /\bdiploma\b/i],
      ],
      color: "#f59e0b",
    },
    "Not Specified": {
      patterns: [
        ["Graduation Not Required", /graduation\s+not\s+required/i],
        ["Not Specified", /not\s+specified/i],
      ],
      color: "#64748b",
    },
  },
};

export function classifyEducation(degreeRaw: string): {
  edu_cluster: string;
  edu_subcluster: string;
  edu_degrees: string[];
} {
  const text = String(degreeRaw || "").trim();
  if (!text || text.toLowerCase() === "not specified") {
    return {
      edu_cluster: "Open / No Degree Required",
      edu_subcluster: "Not Specified",
      edu_degrees: ["Not Specified"],
    };
  }

  const matchedDegrees: string[] = [];
  const matchedClusters: string[] = [];
  const matchedSubclusters: string[] = [];

  for (const [cluster, subclusters] of Object.entries(EDUCATION_TAXONOMY)) {
    for (const [subcluster, config] of Object.entries(subclusters)) {
      for (const [degName, pattern] of config.patterns) {
        if (pattern.test(text)) {
          if (!matchedDegrees.includes(degName)) matchedDegrees.push(degName);
          if (!matchedClusters.includes(cluster)) matchedClusters.push(cluster);
          if (!matchedSubclusters.includes(subcluster))
            matchedSubclusters.push(subcluster);
        }
      }
    }
  }

  if (matchedDegrees.length === 0) {
    return {
      edu_cluster: "Undergraduate / Any Graduate",
      edu_subcluster: "General Graduate (Any Graduate, B.A., B.Com, B.Sc.)",
      edu_degrees: [text],
    };
  }

  const priority = [
    "Doctorate & Specialized",
    "Postgraduate / Master's",
    "Undergraduate / Any Graduate",
    "Open / No Degree Required",
  ];

  let primaryCluster = matchedClusters[0];
  let primarySubcluster = matchedSubclusters[0];

  for (const p of priority) {
    if (matchedClusters.includes(p)) {
      primaryCluster = p;
      for (const sub of matchedSubclusters) {
        if (EDUCATION_TAXONOMY[p]?.[sub]) {
          primarySubcluster = sub;
          break;
        }
      }
      break;
    }
  }

  return {
    edu_cluster: primaryCluster,
    edu_subcluster: primarySubcluster,
    edu_degrees: matchedDegrees,
  };
}

export function parseExpNumber(val: string | null | undefined): number | null {
  if (!val) return null;
  const s = String(val).trim();
  if (!s || ["not specified", "n/a", "none"].includes(s.toLowerCase())) return null;

  const f = parseFloat(s);
  if (!isNaN(f)) {
    if (f > 35) {
      if (s.length === 3 && s[0] !== "0") return parseFloat(s[0]);
      if (s.length === 2 && s[0] !== "0") return parseFloat(s[0]);
    }
    return f;
  }
  const match = s.match(/(\d+(\.\d+)?)/);
  if (match) {
    const parsed = parseFloat(match[1]);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}

export function computeCareerTier(
  minExp: number | null,
  maxExp: number | null
): string {
  const exp = minExp !== null ? minExp : maxExp;
  if (exp === null) return "Not Specified";
  if (exp <= 2.0) return "Fresher & Entry (0 - 2 Yrs)";
  if (exp <= 5.0) return "Mid-Level (2 - 5 Yrs)";
  if (exp <= 8.0) return "Senior (5 - 8 Yrs)";
  return "Staff & Lead (8+ Yrs)";
}

export function formatExpDisplay(
  minExp: number | null,
  maxExp: number | null
): string {
  if (minExp !== null && maxExp !== null) {
    if (minExp === maxExp) return `${minExp} Yrs`;
    return `${minExp} - ${maxExp} Yrs`;
  } else if (minExp !== null) {
    return `${minExp}+ Yrs`;
  } else if (maxExp !== null) {
    return `Up to ${maxExp} Yrs`;
  }
  return "Not Specified";
}

const STATE_MAPPING: Record<string, string> = {
  KA: "Karnataka",
  TS: "Telangana",
  TG: "Telangana",
  TN: "Tamil Nadu",
  MH: "Maharashtra",
  DL: "Delhi NCR",
  UP: "Uttar Pradesh",
  HR: "Haryana",
  WB: "West Bengal",
  GJ: "Gujarat",
  AP: "Andhra Pradesh",
  KL: "Kerala",
  MP: "Madhya Pradesh",
  RJ: "Rajasthan",
  PB: "Punjab",
  OR: "Odisha",
  OD: "Odisha",
  CH: "Chandigarh",
  AS: "Assam",
  IN: "India",
};

export function normalizeIndianHub(
  city: string,
  state: string,
  country: string
): string {
  const c = String(city || "").trim();
  const s = String(state || "").trim();
  const lower = c.toLowerCase();

  if (lower.includes("remote") || s.toLowerCase().includes("remote")) {
    return "Remote";
  }

  if (lower.includes("bengaluru") || lower.includes("bangalore"))
    return "Bengaluru, Karnataka";
  if (lower.includes("hyderabad")) return "Hyderabad, Telangana";
  if (lower.includes("pune")) return "Pune, Maharashtra";
  if (lower.includes("mumbai")) return "Mumbai, Maharashtra";
  if (lower.includes("chennai")) return "Chennai, Tamil Nadu";
  if (lower.includes("noida")) return "Noida, Delhi NCR";
  if (lower.includes("gurugram") || lower.includes("gurgaon"))
    return "Gurugram, Delhi NCR";
  if (lower.includes("delhi")) return "Delhi NCR";
  if (lower.includes("kolkata")) return "Kolkata, West Bengal";

  let cToken = c;
  if (cToken.toUpperCase().endsWith(", IN")) {
    cToken = cToken.slice(0, -4).trim();
  } else if (cToken.toUpperCase().endsWith(", INDIA")) {
    cToken = cToken.slice(0, -7).trim();
  }

  // Exact abbreviation check for city token (e.g. KA -> Karnataka, TN -> Tamil Nadu)
  if (STATE_MAPPING[cToken.toUpperCase()]) {
    const fullSt = STATE_MAPPING[cToken.toUpperCase()];
    if (fullSt === "India") return "India (Not Specified)";
    return fullSt;
  }

  const parts: string[] = [];
  if (cToken && cToken !== "Not Specified") {
    parts.push(cToken);
  }
  const fullState = STATE_MAPPING[s.toUpperCase()] || s;
  if (
    fullState &&
    fullState !== "Not Specified" &&
    fullState !== "India" &&
    !parts.includes(fullState)
  ) {
    parts.push(fullState);
  }
  return parts.length > 0 ? parts.join(", ") : "India (Not Specified)";
}

export const DELHI_TOKENS = [
  "delhi",
  "noida",
  "gurugram",
  "gurgaon",
  "new delhi",
  "delhi ncr",
  "ghaziabad",
  "greater noida",
];

export const MAJOR_HUBS_CONFIG: Record<string, string[]> = {
  bengaluru: ["bengaluru", "bangalore"],
  chennai: ["chennai"],
  hyderabad: ["hyderabad"],
  pune: ["pune"],
  mumbai: ["mumbai", "navi mumbai"],
  delhi: DELHI_TOKENS,
  kolkata: ["kolkata", "calcutta"],
  coimbatore: ["coimbatore"],
};

export const EXTERNAL_MIXED_TOKENS = [
  "dubai",
  "kuwait",
  "united arab emirates",
  "uae",
  "madurai",
  "salem",
  "tiruppur",
  "tiruchirappalli",
  "ahmedabad",
  "hosur",
  "mysuru",
  "chandigarh",
  "nagpur",
  "lucknow",
  "jaipur",
  "kochi",
  "cochin",
];

/**
 * Strict city filter: ensures a job exclusively matches targetCity,
 * and does NOT contain other separate metro hubs or external mixed locations.
 */
export function isCityMatchStrict(
  rawCity: string | undefined | null,
  targetCity: string,
  normalizedLocation?: string
): boolean {
  if (!targetCity || targetCity === "All India") return true;

  const c = (String(rawCity || "") + " " + String(normalizedLocation || "")).trim().toLowerCase();
  const t = targetCity.toLowerCase();

  // 1. Get tokens for target city
  const targetTokens = MAJOR_HUBS_CONFIG[t] || [t];
  const hasTarget = targetTokens.some((tok) => c.includes(tok));
  if (!hasTarget) return false;

  // 2. Reject if it mentions any other major hub
  for (const [hub, hubTokens] of Object.entries(MAJOR_HUBS_CONFIG)) {
    if (hub !== t) {
      if (hubTokens.some((tok) => c.includes(tok))) {
        return false;
      }
    }
  }

  // 3. Reject if it mentions external mixed tokens (unless target itself is that token)
  for (const ext of EXTERNAL_MIXED_TOKENS) {
    if (t !== ext && c.includes(ext)) {
      return false;
    }
  }

  return true;
}

