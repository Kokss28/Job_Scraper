"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  Download,
  ExternalLink,
  Sparkles,
  Zap,
  MapPin,
  CheckCircle2,
  RefreshCw,
  Building,
  Briefcase,
  Layers,
  ArrowUpRight,
  Filter,
  X,
  PieChart as PieIcon,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  ChevronDown,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import {
  type UnifiedJobRecord,
  isCityMatchStrict,
  CITY_SEARCH_ALIASES,
  EXPERIENCE_FILTER_OPTIONS,
  SOURCE_FILTER_OPTIONS,
  parseExpNumber,
} from "@/lib/taxonomy";
import type { DashboardStats } from "@/lib/data-service";
import {
  INDIA_STATES,
  INDIA_MAP_VIEWBOX,
  STATE_BBOXES,
  type StateBoundingBox,
} from "./india-map-paths";

export interface SelectedStateInfo {
  id: string;
  code: string;
  name: string;
  totalJobs: number;
}

export interface TimeWindowOption {
  key: string;
  label: string;
  shortLabel: string;
  hours: number | null;
}

export const TIME_WINDOWS: TimeWindowOption[] = [
  { key: "all", label: "All Time", shortLabel: "All Time", hours: null },
  { key: "2h", label: "Last 2 Hours", shortLabel: "Last 2h", hours: 2 },
  { key: "4h", label: "Last 4 Hours", shortLabel: "Last 4h", hours: 4 },
  { key: "12h", label: "Last 12 Hours", shortLabel: "Last 12h", hours: 12 },
  { key: "24h", label: "Last 24 Hours", shortLabel: "Last 24h", hours: 24 },
  { key: "7d", label: "Last 7 Days", shortLabel: "Last 7d", hours: 168 },
];

interface TalentPulseDashboardProps {
  initialJobs: UnifiedJobRecord[];
  isCloudSupabase?: boolean;
  initialStats?: DashboardStats;
  totalJobsCount?: number;
  initialPage?: number;
  initialTotalPages?: number;
}

export interface CityNode {
  name: string;
  fullName: string;
  state: string;
  stateId: string;
  x: number;
  y: number;
  labelPos: "left" | "right";
  lx: number;
  ly: number;
  lw: number;
  tier: number;
  baseCount: number;
}

// Authentic tech hub coordinates on the 612x696 India GIS vector projection
// Includes all national metro hubs and regional clusters across India stored in the database
const CITY_NODES: CityNode[] = [
  // --- TIER 1 METRO TECH HUBS (Exact original benchmark coordinates preserved) ---
  {
    name: "Delhi",
    fullName: "Delhi NCR",
    state: "DL",
    stateId: "dl",
    x: 186,
    y: 210,
    labelPos: "right",
    lx: 206,
    ly: 198,
    lw: 88,
    tier: 1,
    baseCount: 2840,
  },
  {
    name: "Gurugram",
    fullName: "Gurugram (Gurgaon), Haryana",
    state: "HR",
    stateId: "hr",
    x: 176,
    y: 222,
    labelPos: "left",
    lx: 104,
    ly: 218,
    lw: 70,
    tier: 1,
    baseCount: 1200,
  },
  {
    name: "Noida",
    fullName: "Noida / Greater Noida, Uttar Pradesh",
    state: "UP",
    stateId: "up",
    x: 198,
    y: 218,
    labelPos: "right",
    lx: 212,
    ly: 214,
    lw: 64,
    tier: 1,
    baseCount: 1100,
  },
  {
    name: "Mumbai",
    fullName: "Mumbai, Maharashtra",
    state: "MH",
    stateId: "mh",
    x: 105,
    y: 428,
    labelPos: "left",
    lx: 12,
    ly: 416,
    lw: 94,
    tier: 1,
    baseCount: 2110,
  },
  {
    name: "Pune",
    fullName: "Pune, Maharashtra",
    state: "MH",
    stateId: "mh",
    x: 130,
    y: 456,
    labelPos: "right",
    lx: 148,
    ly: 456,
    lw: 88,
    tier: 1,
    baseCount: 1420,
  },
  {
    name: "Hyderabad",
    fullName: "Hyderabad, Telangana",
    state: "TS",
    stateId: "tg",
    x: 236,
    y: 462,
    labelPos: "right",
    lx: 254,
    ly: 450,
    lw: 110,
    tier: 1,
    baseCount: 2530,
  },
  {
    name: "Kolkata",
    fullName: "Kolkata, West Bengal",
    state: "WB",
    stateId: "wb",
    x: 418,
    y: 358,
    labelPos: "right",
    lx: 436,
    ly: 346,
    lw: 96,
    tier: 1,
    baseCount: 890,
  },
  {
    name: "Bengaluru",
    fullName: "Bengaluru, Karnataka",
    state: "KA",
    stateId: "ka",
    x: 192,
    y: 570,
    labelPos: "left",
    lx: 68,
    ly: 558,
    lw: 116,
    tier: 1,
    baseCount: 4210,
  },
  {
    name: "Chennai",
    fullName: "Chennai, Tamil Nadu",
    state: "TN",
    stateId: "tn",
    x: 248,
    y: 576,
    labelPos: "right",
    lx: 268,
    ly: 564,
    lw: 118,
    tier: 1,
    baseCount: 1842,
  },
  {
    name: "Coimbatore",
    fullName: "Coimbatore, Tamil Nadu",
    state: "TN",
    stateId: "tn",
    x: 184,
    y: 602,
    labelPos: "left",
    lx: 68,
    ly: 600,
    lw: 106,
    tier: 1,
    baseCount: 420,
  },

  // --- TIER 1 & 2 REGIONAL TECH & INDUSTRIAL HUBS ACROSS INDIA ---
  {
    name: "Ahmedabad",
    fullName: "Ahmedabad / Gandhinagar, Gujarat",
    state: "GJ",
    stateId: "gj",
    x: 100,
    y: 340,
    labelPos: "left",
    lx: 8,
    ly: 328,
    lw: 88,
    tier: 1,
    baseCount: 650,
  },
  {
    name: "Kochi",
    fullName: "Kochi (Cochin), Kerala",
    state: "KL",
    stateId: "kl",
    x: 173,
    y: 637,
    labelPos: "left",
    lx: 82,
    ly: 630,
    lw: 86,
    tier: 1,
    baseCount: 520,
  },
  {
    name: "Thiruvananthapuram",
    fullName: "Thiruvananthapuram, Kerala",
    state: "KL",
    stateId: "kl",
    x: 186,
    y: 670,
    labelPos: "right",
    lx: 202,
    ly: 660,
    lw: 132,
    tier: 2,
    baseCount: 380,
  },
  {
    name: "Jaipur",
    fullName: "Jaipur, Rajasthan",
    state: "RJ",
    stateId: "rj",
    x: 165,
    y: 253,
    labelPos: "left",
    lx: 82,
    ly: 242,
    lw: 80,
    tier: 1,
    baseCount: 490,
  },
  {
    name: "Chandigarh",
    fullName: "Chandigarh / Mohali, Punjab",
    state: "CH",
    stateId: "ch",
    x: 185,
    y: 167,
    labelPos: "left",
    lx: 76,
    ly: 156,
    lw: 104,
    tier: 1,
    baseCount: 510,
  },
  {
    name: "Indore",
    fullName: "Indore, Madhya Pradesh",
    state: "MP",
    stateId: "mp",
    x: 166,
    y: 348,
    labelPos: "right",
    lx: 178,
    ly: 338,
    lw: 78,
    tier: 1,
    baseCount: 370,
  },
  {
    name: "Bhopal",
    fullName: "Bhopal, Madhya Pradesh",
    state: "MP",
    stateId: "mp",
    x: 197,
    y: 336,
    labelPos: "right",
    lx: 210,
    ly: 326,
    lw: 72,
    tier: 2,
    baseCount: 220,
  },
  {
    name: "Lucknow",
    fullName: "Lucknow, Uttar Pradesh",
    state: "UP",
    stateId: "up",
    x: 268,
    y: 256,
    labelPos: "right",
    lx: 284,
    ly: 246,
    lw: 86,
    tier: 1,
    baseCount: 340,
  },
  {
    name: "Nagpur",
    fullName: "Nagpur, Maharashtra",
    state: "MH",
    stateId: "mh",
    x: 231,
    y: 385,
    labelPos: "right",
    lx: 246,
    ly: 375,
    lw: 76,
    tier: 2,
    baseCount: 260,
  },
  {
    name: "Raipur",
    fullName: "Raipur, Chhattisgarh",
    state: "CT",
    stateId: "ct",
    x: 295,
    y: 382,
    labelPos: "right",
    lx: 308,
    ly: 376,
    lw: 74,
    tier: 2,
    baseCount: 180,
  },
  {
    name: "Surat",
    fullName: "Surat, Gujarat",
    state: "GJ",
    stateId: "gj",
    x: 105,
    y: 382,
    labelPos: "left",
    lx: 26,
    ly: 372,
    lw: 72,
    tier: 2,
    baseCount: 210,
  },
  {
    name: "Vadodara",
    fullName: "Vadodara, Gujarat",
    state: "GJ",
    stateId: "gj",
    x: 112,
    y: 356,
    labelPos: "right",
    lx: 126,
    ly: 356,
    lw: 80,
    tier: 2,
    baseCount: 190,
  },
  {
    name: "Rajkot",
    fullName: "Rajkot, Gujarat",
    state: "GJ",
    stateId: "gj",
    x: 64,
    y: 355,
    labelPos: "left",
    lx: 4,
    ly: 348,
    lw: 56,
    tier: 2,
    baseCount: 120,
  },
  {
    name: "Visakhapatnam",
    fullName: "Visakhapatnam, Andhra Pradesh",
    state: "AP",
    stateId: "ap",
    x: 313,
    y: 465,
    labelPos: "right",
    lx: 328,
    ly: 456,
    lw: 104,
    tier: 2,
    baseCount: 230,
  },
  {
    name: "Bhubaneswar",
    fullName: "Bhubaneswar, Odisha",
    state: "OR",
    stateId: "or",
    x: 366,
    y: 407,
    labelPos: "right",
    lx: 382,
    ly: 398,
    lw: 102,
    tier: 1,
    baseCount: 290,
  },
  {
    name: "Patna",
    fullName: "Patna, Bihar",
    state: "BR",
    stateId: "br",
    x: 353,
    y: 286,
    labelPos: "right",
    lx: 368,
    ly: 276,
    lw: 76,
    tier: 1,
    baseCount: 180,
  },
  {
    name: "Dehradun",
    fullName: "Dehradun, Uttarakhand",
    state: "UT",
    stateId: "ut",
    x: 210,
    y: 177,
    labelPos: "right",
    lx: 226,
    ly: 168,
    lw: 82,
    tier: 2,
    baseCount: 150,
  },
  {
    name: "Madurai",
    fullName: "Madurai, Tamil Nadu",
    state: "TN",
    stateId: "tn",
    x: 210,
    y: 638,
    labelPos: "right",
    lx: 226,
    ly: 630,
    lw: 78,
    tier: 2,
    baseCount: 190,
  },
  {
    name: "Mysuru",
    fullName: "Mysuru, Karnataka",
    state: "KA",
    stateId: "ka",
    x: 180,
    y: 584,
    labelPos: "left",
    lx: 96,
    ly: 578,
    lw: 76,
    tier: 2,
    baseCount: 240,
  },
  {
    name: "Mangaluru",
    fullName: "Mangaluru, Karnataka",
    state: "KA",
    stateId: "ka",
    x: 122,
    y: 538,
    labelPos: "left",
    lx: 46,
    ly: 530,
    lw: 74,
    tier: 3,
    baseCount: 170,
  },
  {
    name: "Salem",
    fullName: "Salem, Tamil Nadu",
    state: "TN",
    stateId: "tn",
    x: 211,
    y: 599,
    labelPos: "right",
    lx: 226,
    ly: 596,
    lw: 72,
    tier: 2,
    baseCount: 130,
  },
  {
    name: "Tiruppur",
    fullName: "Tiruppur, Tamil Nadu",
    state: "TN",
    stateId: "tn",
    x: 194,
    y: 611,
    labelPos: "right",
    lx: 208,
    ly: 608,
    lw: 76,
    tier: 2,
    baseCount: 110,
  },
  {
    name: "Tiruchirappalli",
    fullName: "Tiruchirappalli, Tamil Nadu",
    state: "TN",
    stateId: "tn",
    x: 222,
    y: 619,
    labelPos: "right",
    lx: 236,
    ly: 614,
    lw: 104,
    tier: 2,
    baseCount: 140,
  },
  {
    name: "Warangal",
    fullName: "Warangal, Telangana",
    state: "TS",
    stateId: "tg",
    x: 240,
    y: 457,
    labelPos: "left",
    lx: 154,
    ly: 448,
    lw: 78,
    tier: 2,
    baseCount: 90,
  },
  {
    name: "Guwahati",
    fullName: "Guwahati, Assam",
    state: "AS",
    stateId: "as",
    x: 485,
    y: 276,
    labelPos: "right",
    lx: 500,
    ly: 266,
    lw: 84,
    tier: 1,
    baseCount: 160,
  },
  {
    name: "Goa",
    fullName: "Goa (Panaji)",
    state: "GA",
    stateId: "ga",
    x: 130,
    y: 515,
    labelPos: "left",
    lx: 62,
    ly: 506,
    lw: 64,
    tier: 2,
    baseCount: 120,
  },
  {
    name: "Gwalior",
    fullName: "Gwalior, Madhya Pradesh",
    state: "MP",
    stateId: "mp",
    x: 213,
    y: 270,
    labelPos: "right",
    lx: 226,
    ly: 262,
    lw: 72,
    tier: 3,
    baseCount: 80,
  },
  {
    name: "Kanpur",
    fullName: "Kanpur, Uttar Pradesh",
    state: "UP",
    stateId: "up",
    x: 256,
    y: 265,
    labelPos: "left",
    lx: 180,
    ly: 272,
    lw: 72,
    tier: 3,
    baseCount: 90,
  },
  {
    name: "Prayagraj",
    fullName: "Prayagraj, Uttar Pradesh",
    state: "UP",
    stateId: "up",
    x: 286,
    y: 289,
    labelPos: "right",
    lx: 300,
    ly: 280,
    lw: 82,
    tier: 3,
    baseCount: 70,
  },
  {
    name: "Varanasi",
    fullName: "Varanasi, Uttar Pradesh",
    state: "UP",
    stateId: "up",
    x: 309,
    y: 292,
    labelPos: "right",
    lx: 322,
    ly: 290,
    lw: 78,
    tier: 3,
    baseCount: 75,
  },
  {
    name: "Agra",
    fullName: "Agra, Uttar Pradesh",
    state: "UP",
    stateId: "up",
    x: 209,
    y: 248,
    labelPos: "right",
    lx: 222,
    ly: 240,
    lw: 68,
    tier: 3,
    baseCount: 85,
  },
  {
    name: "Nashik",
    fullName: "Nashik, Maharashtra",
    state: "MH",
    stateId: "mh",
    x: 124,
    y: 409,
    labelPos: "right",
    lx: 136,
    ly: 398,
    lw: 70,
    tier: 3,
    baseCount: 95,
  },
  {
    name: "Aurangabad",
    fullName: "Aurangabad, Maharashtra",
    state: "MH",
    stateId: "mh",
    x: 155,
    y: 412,
    labelPos: "right",
    lx: 168,
    ly: 408,
    lw: 98,
    tier: 3,
    baseCount: 85,
  },
  {
    name: "Udaipur",
    fullName: "Udaipur, Rajasthan",
    state: "RJ",
    stateId: "rj",
    x: 123,
    y: 305,
    labelPos: "left",
    lx: 46,
    ly: 296,
    lw: 72,
    tier: 3,
    baseCount: 70,
  },
  {
    name: "Hubballi",
    fullName: "Hubballi, Karnataka",
    state: "KA",
    stateId: "ka",
    x: 150,
    y: 514,
    labelPos: "right",
    lx: 164,
    ly: 508,
    lw: 80,
    tier: 3,
    baseCount: 65,
  },
  {
    name: "Belagavi",
    fullName: "Belagavi, Karnataka",
    state: "KA",
    stateId: "ka",
    x: 138,
    y: 503,
    labelPos: "right",
    lx: 152,
    ly: 496,
    lw: 76,
    tier: 3,
    baseCount: 60,
  },
  {
    name: "Itanagar",
    fullName: "Itanagar, Arunachal Pradesh",
    state: "AR",
    stateId: "ar",
    x: 523,
    y: 256,
    labelPos: "right",
    lx: 538,
    ly: 248,
    lw: 76,
    tier: 3,
    baseCount: 50,
  },
  {
    name: "Jharsuguda",
    fullName: "Jharsuguda, Odisha",
    state: "OR",
    stateId: "or",
    x: 329,
    y: 371,
    labelPos: "left",
    lx: 242,
    ly: 364,
    lw: 82,
    tier: 3,
    baseCount: 40,
  },
  {
    name: "Ramban",
    fullName: "Ramban, Jammu & Kashmir",
    state: "JK",
    stateId: "jk",
    x: 154,
    y: 109,
    labelPos: "right",
    lx: 170,
    ly: 100,
    lw: 82,
    tier: 3,
    baseCount: 45,
  },
  {
    name: "Hosur",
    fullName: "Hosur, Tamil Nadu",
    state: "TN",
    stateId: "tn",
    x: 204,
    y: 574,
    labelPos: "right",
    lx: 218,
    ly: 568,
    lw: 68,
    tier: 3,
    baseCount: 90,
  },
  {
    name: "Tumakuru",
    fullName: "Tumakuru, Karnataka",
    state: "KA",
    stateId: "ka",
    x: 188,
    y: 554,
    labelPos: "right",
    lx: 198,
    ly: 546,
    lw: 82,
    tier: 3,
    baseCount: 50,
  },
  {
    name: "Kozhikode",
    fullName: "Kozhikode (Calicut), Kerala",
    state: "KL",
    stateId: "kl",
    x: 163,
    y: 607,
    labelPos: "left",
    lx: 82,
    ly: 604,
    lw: 82,
    tier: 3,
    baseCount: 80,
  },
  {
    name: "Vijayawada",
    fullName: "Vijayawada, Andhra Pradesh",
    state: "AP",
    stateId: "ap",
    x: 261,
    y: 490,
    labelPos: "right",
    lx: 276,
    ly: 484,
    lw: 92,
    tier: 3,
    baseCount: 110,
  },
  {
    name: "Ranchi",
    fullName: "Ranchi, Jharkhand",
    state: "JH",
    stateId: "jh",
    x: 356,
    y: 337,
    labelPos: "left",
    lx: 276,
    ly: 330,
    lw: 76,
    tier: 2,
    baseCount: 130,
  },
];

const TALENT_CORRIDORS = [
  // Primary corridors connecting national metro hubs
  { x1: 186, y1: 210, x2: 105, y2: 428 }, // Delhi - Mumbai
  { x1: 105, y1: 428, x2: 130, y2: 456 }, // Mumbai - Pune
  { x1: 130, y1: 456, x2: 236, y2: 462 }, // Pune - Hyderabad
  { x1: 236, y1: 462, x2: 192, y2: 570 }, // Hyderabad - Bengaluru
  { x1: 192, y1: 570, x2: 248, y2: 576 }, // Bengaluru - Chennai
  { x1: 236, y1: 462, x2: 248, y2: 576 }, // Hyderabad - Chennai
  { x1: 186, y1: 210, x2: 418, y2: 358 }, // Delhi - Kolkata
  { x1: 418, y1: 358, x2: 236, y2: 462 }, // Kolkata - Hyderabad
  { x1: 192, y1: 570, x2: 184, y2: 602 }, // Bengaluru - Coimbatore
  { x1: 184, y1: 602, x2: 248, y2: 576 }, // Coimbatore - Chennai

  // Nationwide Inter-State Regional Corridors
  { x1: 186, y1: 210, x2: 185, y2: 167 }, // Delhi - Chandigarh
  { x1: 185, y1: 167, x2: 154, y2: 109 }, // Chandigarh - Ramban
  { x1: 186, y1: 210, x2: 210, y2: 177 }, // Delhi - Dehradun
  { x1: 186, y1: 210, x2: 165, y2: 253 }, // Delhi - Jaipur
  { x1: 165, y1: 253, x2: 100, y2: 340 }, // Jaipur - Ahmedabad
  { x1: 100, y1: 340, x2: 105, y2: 428 }, // Ahmedabad - Mumbai
  { x1: 186, y1: 210, x2: 268, y2: 256 }, // Delhi - Lucknow
  { x1: 268, y1: 256, x2: 353, y2: 286 }, // Lucknow - Patna
  { x1: 353, y1: 286, x2: 418, y2: 358 }, // Patna - Kolkata
  { x1: 418, y1: 358, x2: 485, y2: 276 }, // Kolkata - Guwahati
  { x1: 105, y1: 428, x2: 166, y2: 348 }, // Mumbai - Indore
  { x1: 166, y1: 348, x2: 197, y2: 336 }, // Indore - Bhopal
  { x1: 197, y1: 336, x2: 231, y2: 385 }, // Bhopal - Nagpur
  { x1: 231, y1: 385, x2: 236, y2: 462 }, // Nagpur - Hyderabad
  { x1: 236, y1: 462, x2: 313, y2: 465 }, // Hyderabad - Visakhapatnam
  { x1: 313, y1: 465, x2: 366, y2: 407 }, // Visakhapatnam - Bhubaneswar
  { x1: 366, y1: 407, x2: 418, y2: 358 }, // Bhubaneswar - Kolkata
  { x1: 192, y1: 570, x2: 173, y2: 637 }, // Bengaluru - Kochi
  { x1: 173, y1: 637, x2: 186, y2: 670 }, // Kochi - Thiruvananthapuram
  { x1: 184, y1: 602, x2: 210, y2: 638 }, // Coimbatore - Madurai
  { x1: 210, y1: 638, x2: 186, y2: 670 }, // Madurai - Thiruvananthapuram
  { x1: 130, y1: 456, x2: 130, y2: 515 }, // Pune - Goa
  { x1: 186, y1: 210, x2: 176, y2: 222 }, // Delhi - Gurugram
  { x1: 186, y1: 210, x2: 198, y2: 218 }, // Delhi - Noida
  { x1: 231, y1: 385, x2: 295, y2: 382 }, // Nagpur - Raipur
  { x1: 295, y1: 382, x2: 366, y2: 407 }, // Raipur - Bhubaneswar
];

const CANONICAL_SKILL_MAP: Record<string, string> = {
  python: "Python",
  py: "Python",
  sql: "SQL",
  mysql: "MySQL",
  postgresql: "PostgreSQL",
  postgres: "PostgreSQL",
  aws: "AWS",
  cloud: "Cloud",
  azure: "Azure",
  gcp: "GCP",
  git: "Git",
  github: "GitHub",
  docker: "Docker",
  kubernetes: "Kubernetes",
  k8s: "Kubernetes",
  react: "React",
  "react.js": "React",
  reactjs: "React",
  javascript: "JavaScript",
  js: "JavaScript",
  typescript: "TypeScript",
  ts: "TypeScript",
  node: "Node.js",
  nodejs: "Node.js",
  "node.js": "Node.js",
  java: "Java",
  django: "Django",
  flask: "Flask",
  fastapi: "FastAPI",
  html: "HTML",
  css: "CSS",
  tailwind: "Tailwind CSS",
  linux: "Linux",
  c: "C",
  "c++": "C++",
  cpp: "C++",
  "c#": "C#",
  ai: "AI / ML",
  ml: "AI / ML",
  "machine learning": "Machine Learning",
  "data analysis": "Data Analysis",
  "data science": "Data Science",
  spark: "Spark",
  kafka: "Kafka",
  redis: "Redis",
  mongodb: "MongoDB",
  nosql: "NoSQL",
  powerbi: "Power BI",
  "power bi": "Power BI",
  tableau: "Tableau",
  pandas: "Pandas",
  devops: "DevOps",
  "ci/cd": "CI/CD",
};

const IGNORED_SKILLS = new Set([
  "not specified",
  "none",
  "n/a",
  "na",
  "null",
  "undefined",
  "others",
  "other",
  "general",
  "skills",
]);

interface TooltipPayloadItem {
  name: string;
  value: number;
  color?: string;
  payload: {
    name: string;
    value: number;
    percentage: number;
    color?: string;
    bracket?: string;
    count?: number;
    pct?: number;
  };
}

function CustomPieTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayloadItem[] }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white text-slate-900 text-xs rounded-xl p-3 shadow-xl border border-slate-200 space-y-1 z-50">
        <div className="font-bold text-slate-900 flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full inline-block"
            style={{ backgroundColor: data.color || payload[0].color }}
          />
          {data.name}
        </div>
        <div className="text-slate-600">
          Openings: <span className="font-semibold text-slate-900">{data.value} jobs</span>
        </div>
        <div className="text-slate-500 text-[11px]">
          Share: <span className="font-extrabold text-indigo-600">{data.percentage}%</span> of city tech skills
        </div>
      </div>
    );
  }
  return null;
}

function CustomExpTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipPayloadItem[]; label?: string }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white text-slate-900 text-xs rounded-xl p-3 shadow-xl border border-slate-200 space-y-1 z-50">
        <div className="font-bold text-slate-900">
          Seniority: <span className="text-indigo-600 font-extrabold">{label}</span>
        </div>
        <div className="text-slate-600">
          Openings: <span className="font-bold text-slate-900">{data.count ?? data.value} jobs</span>
        </div>
        <div className="text-slate-500 text-[11px]">
          Share: <span className="font-semibold text-indigo-600">{data.pct}%</span> of total openings
        </div>
      </div>
    );
  }
  return null;
}

export function TalentPulseDashboard({
  initialJobs,
  isCloudSupabase = false,
  initialStats,
  totalJobsCount,
  initialPage = 1,
  initialTotalPages = 1,
}: TalentPulseDashboardProps) {
  // Hold active job catalog in state (seeded by initialJobs) so newly extracted jobs update automatically
  const [jobs, setJobs] = useState<UnifiedJobRecord[]>(initialJobs);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [loadingDescription, setLoadingDescription] = useState<boolean>(false);

  // Synchronize state when initialJobs prop changes
  useEffect(() => {
    setJobs(initialJobs);
  }, [initialJobs]);

  const handleSelectJob = async (job: UnifiedJobRecord) => {
    setSelectedJob(job);
    if (!job.full_description || job.full_description === "Not Specified") {
      setLoadingDescription(true);
      try {
        const res = await fetch(`/api/jobs/${encodeURIComponent(job.job_id)}`);
        const json = await res.json();
        if (json.success && json.fullDescription) {
          setSelectedJob((prev) =>
            prev && prev.job_id === job.job_id
              ? { ...prev, full_description: json.fullDescription }
              : prev
          );
        }
      } catch (err) {
        console.warn("Could not load job description:", err);
      } finally {
        setLoadingDescription(false);
      }
    }
  };

  // 2-Level Progressive Disclosure Architecture:
  // Level 1: selectedState === null (National Overview)
  // Level 2: selectedState !== null (State Drill-Down)
  const [selectedState, setSelectedState] = useState<SelectedStateInfo | null>(null);
  const [hoveredStateId, setHoveredStateId] = useState<string | null>(null);

  // Default selected city: "All India" (Pan-National / Pan-State)
  const [selectedCity, setSelectedCity] = useState<string>("All India");
  const [searchInput, setSearchInput] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedSkillFilter, setSelectedSkillFilter] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [extractStatus, setExtractStatus] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const PAGE_SIZE = 10;
  const [selectedJob, setSelectedJob] = useState<UnifiedJobRecord | null>(null);
  const [serverJobs, setServerJobs] = useState<UnifiedJobRecord[] | null>(null);
  const [serverTotalCount, setServerTotalCount] = useState<number | null>(null);
  const [isServerLoading, setIsServerLoading] = useState<boolean>(false);
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [mapViewMode, setMapViewMode] = useState<"all" | "major">("major");
  const [hoveredCity, setHoveredCity] = useState<string | null>(null);
  const [timeWindow, setTimeWindow] = useState<string>("all");
  const [timeWindowOpen, setTimeWindowOpen] = useState<boolean>(false);

  // Column Filters: Location, Experience, Sources
  const [selectedSourceFilter, setSelectedSourceFilter] = useState<string>("all");
  const [selectedExpFilter, setSelectedExpFilter] = useState<string>("all");
  const [locationDropdownOpen, setLocationDropdownOpen] = useState<boolean>(false);
  const [expDropdownOpen, setExpDropdownOpen] = useState<boolean>(false);
  const [sourceDropdownOpen, setSourceDropdownOpen] = useState<boolean>(false);
  const [locationSearchText, setLocationSearchText] = useState<string>("");

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Pre-calculate city job distributions from database stats or catalog
  const cityCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const node of CITY_NODES) {
      counts[node.name] = 0;
    }

    if (initialStats?.byLocation && initialStats.byLocation.length > 0) {
      for (const loc of initialStats.byLocation) {
        if (!loc.city) continue;
        const locLower = loc.city.toLowerCase().trim();

        // 1. Direct or alias match using CITY_SEARCH_ALIASES
        let matched = false;
        for (const node of CITY_NODES) {
          const nodeKey = node.name.toLowerCase();
          const aliases = CITY_SEARCH_ALIASES[nodeKey] || [nodeKey];
          if (aliases.some((a) => locLower.includes(a))) {
            counts[node.name] = (counts[node.name] || 0) + loc.count;
            matched = true;
            break;
          }
        }

        // 2. Fallback substring match if not caught by aliases
        if (!matched) {
          for (const node of CITY_NODES) {
            if (locLower.includes(node.name.toLowerCase())) {
              counts[node.name] = (counts[node.name] || 0) + loc.count;
              break;
            }
          }
        }
      }
      return counts;
    }
    for (const node of CITY_NODES) {
      const matching = jobs.filter((j) =>
        isCityMatchStrict(j.city, node.name, j.normalized_location)
      );
      counts[node.name] = matching.length;
    }
    return counts;
  }, [jobs, initialStats]);

  // Cities that have active jobs in the catalog, sorted by count descending
  const citiesWithJobs = useMemo(() => {
    const list = CITY_NODES.filter((c) => (cityCounts[c.name] || 0) > 0);
    return list.sort((a, b) => (cityCounts[b.name] || 0) - (cityCounts[a.name] || 0));
  }, [cityCounts]);

  // Dynamic list of locations with jobs, searchable for the location filter dropdown
  const filteredLocationList = useMemo(() => {
    let list = citiesWithJobs.map((c) => ({
      name: c.name,
      fullName: c.fullName,
      state: c.state,
      count: cityCounts[c.name] || 0,
    }));

    if (locationSearchText.trim()) {
      const q = locationSearchText.toLowerCase().trim();
      list = list.filter(
        (c) => c.name.toLowerCase().includes(q) || c.fullName.toLowerCase().includes(q)
      );
    }
    return list;
  }, [citiesWithJobs, cityCounts, locationSearchText]);

  // Global click-outside listener to dismiss filter dropdowns cleanly
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-dropdown-id='location-filter']")) {
        setLocationDropdownOpen(false);
      }
      if (!target.closest("[data-dropdown-id='exp-filter']")) {
        setExpDropdownOpen(false);
      }
      if (!target.closest("[data-dropdown-id='source-filter']")) {
        setSourceDropdownOpen(false);
      }
      if (!target.closest("[data-dropdown-id='time-window-filter']")) {
        setTimeWindowOpen(false);
      }
    };
    document.addEventListener("mousedown", handleGlobalClick);
    return () => document.removeEventListener("mousedown", handleGlobalClick);
  }, []);

  const handleClearAllFilters = () => {
    setSelectedCity("All India");
    setSelectedState(null);
    setSelectedSourceFilter("all");
    setSelectedExpFilter("all");
    setSelectedSkillFilter(null);
    setTimeWindow("all");
    setSearchInput("");
    setSearchQuery("");
    setCurrentPage(1);
    setLocationDropdownOpen(false);
    setExpDropdownOpen(false);
    setSourceDropdownOpen(false);
    setTimeWindowOpen(false);
  };

  // Dynamic state job counts computed from active database catalog
  const stateJobCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const state of INDIA_STATES) {
      counts[state.id] = 0;
    }

    const stateLookup = new Map<string, string>();
    for (const s of INDIA_STATES) {
      stateLookup.set(s.name.toLowerCase(), s.id);
      stateLookup.set(s.id.toLowerCase(), s.id);
    }
    const codeMap: Record<string, string> = {
      ka: "ka", tn: "tn", mh: "mh", tg: "tg", ts: "tg", dl: "dl", hr: "hr",
      up: "up", kl: "kl", gj: "gj", wb: "wb", rj: "rj", mp: "mp", pb: "pb",
      ch: "ch", or: "or", od: "or", ct: "ct", cg: "ct", ap: "ap", br: "br",
      ut: "ut", uk: "ut", jh: "jh", as: "as", ar: "ar", ga: "ga", jk: "jk",
    };

    if (initialStats?.byLocation && initialStats.byLocation.length > 0) {
      for (const item of initialStats.byLocation) {
        let matchedId: string | null = null;
        if (item.state) {
          const sRaw = item.state.toLowerCase().trim();
          const sFirst = sRaw.split(",")[0].trim();
          if (stateLookup.has(sRaw)) {
            matchedId = stateLookup.get(sRaw)!;
          } else if (stateLookup.has(sFirst)) {
            matchedId = stateLookup.get(sFirst)!;
          } else if (codeMap[sFirst]) {
            matchedId = codeMap[sFirst];
          }
        }
        // If state was unassigned or 'Other', resolve from city node
        if (!matchedId && item.city) {
          const cLower = item.city.toLowerCase().trim();
          for (const node of CITY_NODES) {
            const nodeKey = node.name.toLowerCase();
            const aliases = CITY_SEARCH_ALIASES[nodeKey] || [nodeKey];
            if (aliases.some((a) => cLower.includes(a))) {
              matchedId = node.stateId;
              break;
            }
          }
        }
        if (matchedId && counts[matchedId] !== undefined) {
          counts[matchedId] += item.count;
        }
      }
      return counts;
    }

    if (!jobs || jobs.length === 0) {
      return counts;
    }

    const stateNameMap = new Map<string, string>();
    for (const s of INDIA_STATES) {
      stateNameMap.set(s.name.toLowerCase(), s.id);
      stateNameMap.set(s.id.toLowerCase(), s.id);
    }
    const cityToStateId = new Map<string, string>();
    for (const c of CITY_NODES) {
      if (c.stateId) {
        cityToStateId.set(c.name.toLowerCase(), c.stateId);
      }
    }

    for (const j of jobs) {
      let matchedStateId: string | null = null;
      if (j.state) {
        const sLower = j.state.trim().toLowerCase();
        if (stateNameMap.has(sLower)) {
          matchedStateId = stateNameMap.get(sLower)!;
        }
      }
      if (!matchedStateId && j.city) {
        const cLower = j.city.trim().toLowerCase();
        if (cityToStateId.has(cLower)) {
          matchedStateId = cityToStateId.get(cLower)!;
        } else {
          for (const node of CITY_NODES) {
            if (isCityMatchStrict(j.city, node.name, j.normalized_location)) {
              matchedStateId = node.stateId;
              break;
            }
          }
        }
      }
      if (!matchedStateId && j.normalized_location) {
        const locLower = j.normalized_location.toLowerCase();
        for (const s of INDIA_STATES) {
          if (locLower.includes(s.name.toLowerCase())) {
            matchedStateId = s.id;
            break;
          }
        }
      }
      if (matchedStateId && counts[matchedStateId] !== undefined) {
        counts[matchedStateId]++;
      }
    }
    return counts;
  }, [jobs]);

  // Top 10 locations calculated dynamically by total job count from database
  const top10NationalHubs = useMemo(() => {
    return [...CITY_NODES]
      .filter((c) => (cityCounts[c.name] || 0) > 0)
      .sort((a, b) => {
        const countA = cityCounts[a.name] || 0;
        const countB = cityCounts[b.name] || 0;
        if (countB !== countA) return countB - countA;
        return a.name.localeCompare(b.name);
      })
      .slice(0, 10);
  }, [cityCounts]);

  const top10CityNamesSet = useMemo(() => {
    return new Set(top10NationalHubs.map((c) => c.name.toLowerCase()));
  }, [top10NationalHubs]);

  // Camera Zoom & Pan Transform: smoothly animates to selected state's bounding box
  const cameraTransform = useMemo(() => {
    if (!selectedState) {
      return {
        scale: 1,
        tx: 0,
        ty: 0,
        transform: "translate(0px, 0px) scale(1)",
      };
    }

    const bbox = STATE_BBOXES[selectedState.id];
    if (!bbox) {
      return {
        scale: 1,
        tx: 0,
        ty: 0,
        transform: "translate(0px, 0px) scale(1)",
      };
    }

    const w = Math.max(bbox.maxX - bbox.minX, 30);
    const h = Math.max(bbox.maxY - bbox.minY, 30);
    const cx = (bbox.minX + bbox.maxX) / 2;
    const cy = (bbox.minY + bbox.maxY) / 2;

    const scaleX = (612 * 0.72) / w;
    const scaleY = (696 * 0.72) / h;
    let scale = Math.min(scaleX, scaleY);
    scale = Math.min(3.2, Math.max(1.35, scale));

    const tx = 306 - cx * scale;
    const ty = 348 - cy * scale;

    return {
      scale,
      tx,
      ty,
      transform: `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) scale(${scale.toFixed(3)})`,
    };
  }, [selectedState]);

  // Talent Corridors: strictly show on hover over an active node that has > 0 jobs
  const activeCorridors = useMemo(() => {
    if (!hoveredCity) return [];
    if ((cityCounts[hoveredCity] || 0) <= 0) return [];
    const hoveredNode = CITY_NODES.find(
      (c) => c.name.toLowerCase() === hoveredCity.toLowerCase()
    );
    if (!hoveredNode) return [];
    return TALENT_CORRIDORS.filter(
      (c) =>
        (Math.abs(c.x1 - hoveredNode.x) < 8 && Math.abs(c.y1 - hoveredNode.y) < 8) ||
        (Math.abs(c.x2 - hoveredNode.x) < 8 && Math.abs(c.y2 - hoveredNode.y) < 8)
    );
  }, [hoveredCity, cityCounts]);

  // State selection handler: drills down into Level 2 (State view)
  // Clicking the active state toggles back to National Overview
  const handleStateClick = (state: { id: string; name: string }) => {
    if (selectedState?.id === state.id) {
      handleResetToNational();
      return;
    }
    const totalJobs = stateJobCounts[state.id] || 0;
    setSelectedState({
      id: state.id,
      code: state.id.toUpperCase(),
      name: state.name,
      totalJobs,
    });
    setSelectedCity("All India");
    setSelectedSkillFilter(null);
    setCurrentPage(1);
  };

  // Reset handler: smoothly zooms out to Level 1 National Overview
  const handleResetToNational = () => {
    setSelectedState(null);
    setSelectedCity("All India");
    setSelectedSkillFilter(null);
    setCurrentPage(1);
  };

  // Dedicated city switch handler that cleanly resets active skill filter and page
  // Clicking the active city toggles back to National (or state level)
  const handleCitySelect = (cityName: string) => {
    if (cityName === "All India" || selectedCity.toLowerCase() === cityName.toLowerCase()) {
      if (selectedState) {
        setSelectedCity("All India");
      } else {
        handleResetToNational();
      }
      setSelectedSkillFilter(null);
      setCurrentPage(1);
      return;
    }

    const found = CITY_NODES.find((c) => c.name.toLowerCase() === cityName.toLowerCase());
    if (found && found.stateId) {
      const stateObj = INDIA_STATES.find((s) => s.id === found.stateId);
      if (stateObj && !selectedState) {
        setSelectedState({
          id: stateObj.id,
          code: found.state,
          name: stateObj.name,
          totalJobs: stateJobCounts[stateObj.id] || 0,
        });
      }
    }

    setSelectedCity(cityName);
    setSelectedSkillFilter(null);
    setCurrentPage(1);
  };

  // Automatically reset to page 1 when city, state, skill filter, search query, time window, or column filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCity, selectedState, selectedSkillFilter, searchQuery, timeWindow, selectedSourceFilter, selectedExpFilter]);

  // Refresh job catalog from database (calls /api/jobs)
  const refreshFromDatabase = useCallback(async (forced: boolean = false) => {
    try {
      setIsSyncing(true);
      const res = await fetch(`/api/jobs?refresh=${forced ? "true" : "false"}`);
      if (res.ok) {
        const data = await res.json();
        if (data.jobs && Array.isArray(data.jobs)) {
          setJobs(data.jobs);
        }
      }
    } catch (err) {
      console.warn("Failed to auto-refresh database jobs:", err);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Auto-poll the database every 20 seconds so newly extracted jobs update automatically
  useEffect(() => {
    const interval = setInterval(() => {
      refreshFromDatabase(false);
    }, 20000);
    return () => clearInterval(interval);
  }, [refreshFromDatabase]);

  // Server-side full database search & filtering across all Supabase records (H4 fix + Recency + Column filters)
  useEffect(() => {
    const hasSearch = searchQuery.trim().length > 0;
    const hasSkill = Boolean(selectedSkillFilter);
    const hasCity = selectedCity && selectedCity !== "All India";
    const hasState = Boolean(selectedState);
    const hasTimeWindow = timeWindow !== "all";
    const hasSource = selectedSourceFilter !== "all";
    const hasExp = selectedExpFilter !== "all";

    // If national default overview with no search/filters and on page 1, use initial preloaded jobs
    if (!hasSearch && !hasSkill && !hasCity && !hasState && !hasTimeWindow && !hasSource && !hasExp && currentPage === 1) {
      setServerJobs(null);
      setServerTotalCount(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsServerLoading(true);
        const params = new URLSearchParams({
          page: String(currentPage),
          pageSize: String(PAGE_SIZE),
        });
        if (hasSearch) params.set("q", searchQuery.trim());
        if (hasSkill && selectedSkillFilter) params.set("skill", selectedSkillFilter);
        if (hasCity) params.set("city", selectedCity);
        if (hasState && selectedState) params.set("state", selectedState.name);
        if (hasSource) params.set("source", selectedSourceFilter);
        if (hasExp) params.set("experience", selectedExpFilter);

        const currentWindow = TIME_WINDOWS.find((w) => w.key === timeWindow);
        if (currentWindow?.hours) {
          params.set("hours", String(currentWindow.hours));
        }

        const res = await fetch(`/api/jobs?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (data.jobs && Array.isArray(data.jobs)) {
            setServerJobs(data.jobs);
            setServerTotalCount(typeof data.total === "number" ? data.total : data.jobs.length);
          }
        }
      } catch (err) {
        console.warn("Failed to fetch server jobs:", err);
      } finally {
        setIsServerLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedSkillFilter, selectedCity, selectedState, timeWindow, selectedSourceFilter, selectedExpFilter, currentPage]);

  // Dynamic relative time for last extraction run
  const lastExtractionText = useMemo(() => {
    let latestTime = 0;
    for (const j of jobs) {
      if (j.collected_at) {
        const t = new Date(j.collected_at).getTime();
        if (!isNaN(t) && t > latestTime) {
          latestTime = t;
        }
      }
    }
    if (latestTime === 0) return "Just now";
    const diffMs = Date.now() - latestTime;
    if (diffMs < 0) return "Just now";
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} Mins Ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} Hours Ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} Day${diffDays > 1 ? "s" : ""} Ago`;
  }, [jobs]);

  // Nodes to display on the India map: strictly locations with > 0 jobs in the database
  // Eliminates all 0-job nodes, bubbles, and badges across national and state views
  const displayedCityNodes = useMemo(() => {
    // Only include cities that have > 0 jobs in the database
    let list = CITY_NODES.filter((c) => (cityCounts[c.name] || 0) > 0);

    // LEVEL 2: State Drill-Down (State Selected) - only keep regional hubs that have > 0 jobs
    if (selectedState) {
      list = list.filter((c) => c.stateId === selectedState.id);
    }

    // If a specific city is selected, ensure it has > 0 jobs before keeping it
    if (selectedCity !== "All India") {
      const selectedNode = CITY_NODES.find(
        (c) => c.name.toLowerCase() === selectedCity.toLowerCase()
      );
      if (
        selectedNode &&
        (cityCounts[selectedNode.name] || 0) > 0 &&
        !list.some((c) => c.name.toLowerCase() === selectedNode.name.toLowerCase())
      ) {
        list = [...list, selectedNode];
      }
    }

    // SVG Paint Ordering:
    // 1. Larger count bubbles render first (bottom layer in SVG)
    // 2. Smaller count bubbles render on top so they are easily clickable without being obscured
    // 3. Hovered node renders near the top
    // 4. Selected node renders last (very top layer in SVG)
    return [...list].sort((a, b) => {
      const aIsSelected = a.name.toLowerCase() === selectedCity.toLowerCase();
      const bIsSelected = b.name.toLowerCase() === selectedCity.toLowerCase();
      if (aIsSelected) return 1;
      if (bIsSelected) return -1;

      const aIsHovered = hoveredCity === a.name;
      const bIsHovered = hoveredCity === b.name;
      if (aIsHovered) return 1;
      if (bIsHovered) return -1;

      const countA = cityCounts[a.name] || 0;
      const countB = cityCounts[b.name] || 0;
      return countB - countA;
    });
  }, [
    selectedState,
    selectedCity,
    hoveredCity,
    cityCounts,
  ]);

  // Current active city info
  const activeCityNode = useMemo(() => {
    if (selectedCity === "All India") {
      return {
        name: selectedState ? selectedState.name : "All India",
        fullName: selectedState
          ? `${selectedState.name} (State Aggregate)`
          : "All India (Pan-National)",
        state: selectedState ? selectedState.code : "IN",
        stateId: selectedState ? selectedState.id : "",
        x: 306,
        y: 348,
        labelPos: "right" as const,
        lx: 0,
        ly: 0,
        lw: 0,
        tier: 1,
        baseCount: selectedState ? selectedState.totalJobs : (initialStats?.totalJobs || jobs.length || 0),
      };
    }
    const found = CITY_NODES.find((c) => c.name.toLowerCase() === selectedCity.toLowerCase());
    if (found) return found;
    return {
      name: selectedCity,
      fullName: `${selectedCity}, India`,
      state: selectedState ? selectedState.code : "IN",
      stateId: selectedState ? selectedState.id : "",
      x: 184,
      y: 602,
      labelPos: "right" as const,
      lx: 190,
      ly: 595,
      lw: 90,
      tier: 3,
      baseCount: cityCounts[selectedCity] ?? 0,
    };
  }, [selectedCity, selectedState, jobs, cityCounts]);

  // Computed active job subset based on 2-level progressive disclosure:
  // Level 1 (National): All jobs across India
  // Level 2 (State): Jobs in selectedState
  // Drilldown (City): Jobs matching selectedCity
  const activeAnalyticsJobs = useMemo(() => {
    if (jobs.length === 0) return [];

    // Specific city selected (and not "All India")
    if (selectedCity && selectedCity !== "All India") {
      return jobs.filter((j) =>
        isCityMatchStrict(j.city, selectedCity, j.normalized_location)
      );
    }

    // State selected (State-level aggregate)
    if (selectedState) {
      const stateCities = CITY_NODES.filter((c) => c.stateId === selectedState.id);
      const stateCityNamesLower = new Set(stateCities.map((c) => c.name.toLowerCase()));
      const sNameLower = selectedState.name.toLowerCase();
      const sIdLower = selectedState.id.toLowerCase();

      return jobs.filter((j) => {
        if (j.state) {
          const js = j.state.toLowerCase();
          if (js === sNameLower || js === sIdLower) return true;
        }
        if (j.city && stateCityNamesLower.has(j.city.toLowerCase())) {
          return true;
        }
        for (const c of stateCities) {
          if (isCityMatchStrict(j.city, c.name, j.normalized_location)) {
            return true;
          }
        }
        return false;
      });
    }

    // Default National Overview: All India jobs
    return jobs;
  }, [jobs, selectedCity, selectedState]);

  // Dynamic scope title for analytics widgets
  const activeAnalyticsTitle = useMemo(() => {
    if (selectedCity && selectedCity !== "All India") {
      return selectedCity;
    }
    if (selectedState) {
      return selectedState.name;
    }
    return "India";
  }, [selectedCity, selectedState]);

  // Dynamic skills extraction computed specifically for the active scope
  const { cityTopSkills, cityTotalSkillInstances } = useMemo(() => {
    const skillCounts = new Map<string, number>();
    const baseJobs = activeAnalyticsJobs.length > 0 ? activeAnalyticsJobs : (jobs.length > 0 ? jobs : []);
    const totalJobs = baseJobs.length || 1;
    let totalInstances = 0;

    for (const job of baseJobs) {
      if (!job.skills) continue;
      const rawSkills = job.skills.split(/[,;|/]/).map((s) => s.trim()).filter(Boolean);
      const seenInJob = new Set<string>();

      for (const raw of rawSkills) {
        const lower = raw.toLowerCase();
        if (IGNORED_SKILLS.has(lower) || lower.length < 2) continue;
        const canonical = CANONICAL_SKILL_MAP[lower] || (raw.charAt(0).toUpperCase() + raw.slice(1));
        if (!seenInJob.has(canonical.toLowerCase())) {
          seenInJob.add(canonical.toLowerCase());
          skillCounts.set(canonical, (skillCounts.get(canonical) || 0) + 1);
          totalInstances++;
        }
      }
    }

    const sorted = Array.from(skillCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => {
        const pctNumber = Math.min(100, Math.round((count / totalJobs) * 100));
        return {
          name,
          count,
          pctNumber,
          pct: `${pctNumber}%`,
        };
      });

    return {
      cityTopSkills: sorted.length > 0 ? sorted : [
        { name: "Python", count: 42, pctNumber: 42, pct: "42%" },
        { name: "SQL", count: 31, pctNumber: 31, pct: "31%" },
        { name: "AWS", count: 25, pctNumber: 25, pct: "25%" },
        { name: "Data / AI", count: 22, pctNumber: 22, pct: "22%" },
      ],
      cityTotalSkillInstances: totalInstances || 100,
    };
  }, [activeAnalyticsJobs, jobs]);

  // Dynamic experience split for the active scope (Entry, Mid, Senior)
  const cityExpSplit = useMemo(() => {
    const baseJobs = activeAnalyticsJobs.length > 0 ? activeAnalyticsJobs : (jobs.length > 0 ? jobs : []);
    if (baseJobs.length === 0) {
      return { entryPct: 25, midPct: 45, seniorPct: 30, entryCount: 25, midCount: 45, seniorCount: 30 };
    }

    let entry = 0;
    let mid = 0;
    let senior = 0;

    for (const j of baseJobs) {
      let val = 2; // Default to mid if unspecified
      if (j.min_experience_years !== null && j.min_experience_years !== undefined) {
        const parsed = parseFloat(String(j.min_experience_years));
        if (!isNaN(parsed)) val = parsed;
      }
      if (val <= 1) entry++;
      else if (val <= 5) mid++;
      else senior++;
    }

    const total = baseJobs.length;
    const entryPct = Math.round((entry / total) * 100);
    const seniorPct = Math.round((senior / total) * 100);
    const midPct = Math.max(0, 100 - entryPct - seniorPct);

    return {
      entryPct,
      midPct,
      seniorPct,
      entryCount: entry,
      midCount: mid,
      seniorCount: senior,
    };
  }, [activeAnalyticsJobs, jobs]);

  // Donut chart dataset matching Image 2 (Dark card with vibrant slices)
  const locationSkillsPieData = useMemo(() => {
    const PALETTE = ["#A855F7", "#F43F5E", "#F59E0B", "#06B6D4", "#10B981", "#3B82F6"];
    const top5 = cityTopSkills.slice(0, 5);
    const top5Count = top5.reduce((sum, s) => sum + s.count, 0);
    const remaining = Math.max(0, cityTotalSkillInstances - top5Count);

    const slices = top5.map((s, idx) => ({
      name: s.name,
      value: s.count,
      percentage: s.pctNumber,
      color: PALETTE[idx % PALETTE.length],
    }));

    if (remaining > 0 && cityTopSkills.length > 5) {
      const otherPct = Math.max(1, Math.round((remaining / cityTotalSkillInstances) * 100));
      slices.push({
        name: "Others",
        value: remaining,
        percentage: otherPct,
        color: "#64748B",
      });
    }
    return slices;
  }, [cityTopSkills, cityTotalSkillInstances]);

  // Point chart dataset matching Image 3 (Minimalist white card with connected points)
  const experienceCurveData = useMemo(() => {
    const baseJobs = activeAnalyticsJobs.length > 0 ? activeAnalyticsJobs : (jobs.length > 0 ? jobs : []);
    const total = baseJobs.length || 1;

    let b0_1 = 0;
    let b1_3 = 0;
    let b3_5 = 0;
    let b5_8 = 0;
    let b8_12 = 0;
    let b12_plus = 0;

    for (const j of baseJobs) {
      let val = 2;
      if (j.min_experience_years !== null && j.min_experience_years !== undefined) {
        const parsed = parseFloat(String(j.min_experience_years));
        if (!isNaN(parsed)) val = parsed;
      }
      if (val <= 1) b0_1++;
      else if (val <= 3) b1_3++;
      else if (val <= 5) b3_5++;
      else if (val <= 8) b5_8++;
      else if (val <= 12) b8_12++;
      else b12_plus++;
    }

    return [
      { bracket: "0-1 Yr", count: b0_1, pct: Math.round((b0_1 / total) * 100) },
      { bracket: "1-3 Yrs", count: b1_3, pct: Math.round((b1_3 / total) * 100) },
      { bracket: "3-5 Yrs", count: b3_5, pct: Math.round((b3_5 / total) * 100) },
      { bracket: "5-8 Yrs", count: b5_8, pct: Math.round((b5_8 / total) * 100) },
      { bracket: "8-12 Yrs", count: b8_12, pct: Math.round((b8_12 / total) * 100) },
      { bracket: "12+ Yrs", count: b12_plus, pct: Math.round((b12_plus / total) * 100) },
    ];
  }, [activeAnalyticsJobs, jobs]);

  // Search submission handler (handles city switching and cross-location filtering)
  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchInput.trim();
    setSearchQuery(query);
    if (!query) return;

    const lower = query.toLowerCase();
    const matchedCity = CITY_NODES.find(
      (c) =>
        c.name.toLowerCase() === lower ||
        (c.name === "Bengaluru" && lower === "bangalore")
    );

    if (matchedCity) {
      handleCitySelect(matchedCity.name);
    } else if (lower === "all india" || lower === "india") {
      handleResetToNational();
    }
  };

  // Filter jobs by city/state, skill pill, and search query
  const filteredJobs = useMemo(() => {
    let list = activeAnalyticsJobs;

    // 1. Skill pill filter
    if (selectedSkillFilter) {
      const sf = selectedSkillFilter.toLowerCase();
      list = list.filter((j) => {
        const skillsText = ((j.skills || "") + " " + (j.title || "")).toLowerCase();
        return skillsText.includes(sf);
      });
    }

    // 2. Search query keywords
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((j) => {
        const haystack = (
          (j.title || "") +
          " " +
          (j.company || "") +
          " " +
          (j.skills || "") +
          " " +
          (j.city || "") +
          " " +
          (j.state || "") +
          " " +
          (j.search_keyword || "") +
          " " +
          (j.full_description || "")
        ).toLowerCase();
        return haystack.includes(q);
      });
    }

    // 3. Source filter (LinkedIn, Indeed, Naukri)
    if (selectedSourceFilter && selectedSourceFilter !== "all") {
      const s = selectedSourceFilter.toLowerCase();
      list = list.filter((j) => (j.source || "").toLowerCase().includes(s));
    }

    // 4. Experience filter (0-2 Yrs, 3-5 Yrs, 6-8 Yrs, 8+ Yrs)
    if (selectedExpFilter && selectedExpFilter !== "all") {
      list = list.filter((j) => {
        const minExp = j.min_exp_num !== undefined && j.min_exp_num !== null
          ? j.min_exp_num
          : parseExpNumber(j.min_experience_years);
        const maxExp = j.max_exp_num !== undefined && j.max_exp_num !== null
          ? j.max_exp_num
          : parseExpNumber(j.max_experience_years);
        const exp = minExp !== null ? minExp : maxExp;
        if (exp === null) return false;
        if (selectedExpFilter === "0-2") return exp <= 2.0;
        if (selectedExpFilter === "3-5") return exp >= 3.0 && exp <= 5.0;
        if (selectedExpFilter === "6-8") return exp >= 6.0 && exp <= 8.0;
        if (selectedExpFilter === "8+") return exp >= 8.0;
        return true;
      });
    }

    return list;
  }, [activeAnalyticsJobs, selectedSkillFilter, searchQuery, selectedSourceFilter, selectedExpFilter]);

  // Authentic display jobs: returns filteredJobs, or DEMO jobs only if DB is 100% empty
  const displayJobs = useMemo(() => {
    if (jobs.length > 0) {
      return filteredJobs;
    }

    // High fidelity realistic fallback items if database is completely empty
    return [
      {
        job_id: "demo-chn-1",
        title: "Senior Full Stack Engineer (Python)",
        company: "Freshworks Inc.",
        city: selectedCity === "All India" ? "Chennai" : selectedCity,
        state: "TN",
        country: "India",
        min_experience_years: "4",
        max_experience_years: "7",
        exp_display: "4 - 7 Years",
        source: "LinkedIn",
        link: "https://freshworks.com/careers",
        skills: "Python, Django, React, AWS, PostgreSQL",
        degree_required: "B.Tech / B.E. in Computer Science",
        specialization_required: "Computer Science",
        collected_at: "Today",
        search_keyword: "Python developer",
        experience_review: "Strong OOP and cloud systems required",
        full_description: "Freshworks is looking for an experienced Senior Full Stack Engineer proficient in Python and React.",
        min_exp_num: 4,
        max_exp_num: 7,
        career_tier: "Mid-Senior",
        normalized_location: `${selectedCity}, TN`,
        edu_cluster: "Engineering",
        edu_subcluster: "CS / IT",
        edu_degrees: ["B.Tech", "B.E."],
      },
    ] as UnifiedJobRecord[];
  }, [filteredJobs, jobs, selectedCity]);

  // Metric counts
  const totalLiveJobs = initialStats?.totalJobs || totalJobsCount || jobs.length;

  // Total count for current view: server-exact count when searching/filtering, otherwise totalLiveJobs
  const totalDisplayCount = serverTotalCount !== null ? serverTotalCount : (displayJobs.length || totalLiveJobs);
  const totalPages = Math.max(1, Math.ceil(totalDisplayCount / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, totalDisplayCount);

  const currentPaginatedJobs = useMemo(() => {
    if (serverJobs !== null) {
      return serverJobs;
    }
    return displayJobs.slice(startIndex, startIndex + PAGE_SIZE);
  }, [serverJobs, displayJobs, startIndex]);
  const currentCityCount =
    selectedCity !== "All India"
      ? (cityCounts[selectedCity] !== undefined
          ? cityCounts[selectedCity]
          : activeAnalyticsJobs.length)
      : selectedState
      ? selectedState.totalJobs
      : totalLiveJobs;
  const percentageOfIndia =
    totalLiveJobs > 0 ? ((currentCityCount / totalLiveJobs) * 100).toFixed(1) : "0.0";

  // Dynamically compute today's additions and accurate growth percentage from database timestamps
  const todayStats = useMemo(() => {
    const totalCount = initialStats?.totalJobs || totalJobsCount || (jobs ? jobs.length : 0);
    if (totalCount === 0) {
      return { count: 0, percentage: 0, formatted: "0.0% today" };
    }

    const now = new Date();
    // UTC and Local date string (e.g. 2026-11-12)
    const todayUtc = now.toISOString().slice(0, 10);
    const todayLocal = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    let todayCount = 0;
    // 1. Check pre-aggregated daily trend from Supabase materialized view
    if (initialStats?.dailyTrend && Array.isArray(initialStats.dailyTrend)) {
      const todayMatch = initialStats.dailyTrend.find(
        (d) => d.date.startsWith(todayUtc) || d.date.startsWith(todayLocal)
      );
      if (todayMatch && typeof todayMatch.count === "number") {
        todayCount = todayMatch.count;
      }
    }

    // 2. Fallback to scanning catalog if dailyTrend had no entry
    if (todayCount === 0 && jobs) {
      for (const j of jobs) {
        if (j.collected_at) {
          const col = String(j.collected_at);
          if (col.startsWith(todayUtc) || col.startsWith(todayLocal)) {
            todayCount++;
          }
        }
      }
    }

    // Option B: Real percentage = today's additions divided by the full database count
    const growth = (todayCount / totalCount) * 100;

    return {
      count: todayCount,
      percentage: growth,
      formatted: todayCount > 0 ? `↑ +${growth.toFixed(1)}% today` : `0.0% today`,
    };
  }, [jobs, initialStats, totalJobsCount]);

  // Trigger live crawler extraction and automatically sync database afterwards
  const handleTriggerExtraction = async () => {
    setIsExtracting(true);
    setExtractStatus(`Connecting to crawler pipeline for ${selectedCity}...`);
    try {
      await fetch("/api/scraper/live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sources: ["LinkedIn", "Naukri", "Indeed"],
          location: selectedCity === "All India" ? "India" : selectedCity,
          keywords: "Python developer",
          freshness: 24,
          maxJobs: 15,
          enableDetails: true,
        }),
      });
      setExtractStatus(`Scraper pipeline active! Updating live catalog...`);
      await refreshFromDatabase(true);
    } catch (err) {
      console.warn("Crawler trigger note:", err);
    } finally {
      setTimeout(async () => {
        await refreshFromDatabase(true);
        setIsExtracting(false);
        setExtractStatus(null);
      }, 3000);
    }
  };

  // Export current city jobs to CSV directly from Supabase Cloud with active time window and city filters
  const handleExportCityCsv = () => {
    const selectedWindow = TIME_WINDOWS.find((w) => w.key === timeWindow);
    const params = new URLSearchParams({ batch: "all" });

    if (selectedWindow?.hours) {
      params.set("hours", String(selectedWindow.hours));
    }
    if (selectedCity && selectedCity !== "All India") {
      params.set("city", selectedCity);
    }
    if (selectedState) {
      params.set("state", selectedState.name);
    }
    if (selectedSourceFilter && selectedSourceFilter !== "all") {
      params.set("source", selectedSourceFilter);
    }
    if (selectedExpFilter && selectedExpFilter !== "all") {
      params.set("experience", selectedExpFilter);
    }

    const exportUrl = `/api/scraper/export?${params.toString()}`;
    const a = document.createElement("a");
    a.href = exportUrl;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="flex-1 p-6 lg:p-8 space-y-6 max-w-[1600px] w-full mx-auto" id="dashboard-container">
      {/* ==================================================================== */}
      {/* TOP HEADER SECTION */}
      {/* ==================================================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight font-sans">
            India Talent Intelligence & Extraction Hub
          </h1>
          <p className="text-xs text-slate-600 mt-1 font-medium">
            Real-time multi-channel aggregation across LinkedIn, Naukri & Indeed
            {isCloudSupabase && (
              <span className="ml-2 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100/70 px-2.5 py-0.5 rounded-full border border-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                Supabase Cloud Connected
              </span>
            )}
          </p>
        </div>

        {/* Search & Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <form
            onSubmit={handleSearchSubmit}
            className="flex items-center gap-2"
          >
            <div className="relative min-w-[240px] sm:min-w-[280px]">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                id="global-search-input"
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  setSearchQuery(e.target.value);
                }}
                placeholder="Search city, skill, role, location..."
                className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-white border border-slate-300 shadow-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-600 transition-all text-slate-900 placeholder:text-slate-500 font-semibold"
              />
              {searchInput && (
                <button
                  type="button"
                  id="clear-search-btn"
                  onClick={() => {
                    setSearchInput("");
                    setSearchQuery("");
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              type="submit"
              id="global-search-btn"
              className="px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search</span>
            </button>
          </form>

          {/* Sync DB Button to check database on demand */}
          <button
            type="button"
            id="sync-database-btn"
            onClick={() => refreshFromDatabase(true)}
            disabled={isSyncing}
            title="Check database and automatically update statistics"
            className="px-3.5 py-2 text-xs font-bold rounded-xl bg-white hover:bg-slate-50 text-slate-800 hover:text-slate-950 border border-slate-300 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${isSyncing ? "animate-spin" : ""}`} />
            <span>{isSyncing ? "Syncing..." : "Sync DB"}</span>
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 4 KPI METRIC CARDS ROW */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: TOTAL LIVE JOBS */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              TOTAL LIVE JOBS
            </span>
            {isSyncing && (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-indigo-600">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Syncing...
              </span>
            )}
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-black text-slate-900 tracking-tight" id="kpi-total-live-jobs">
              {totalLiveJobs.toLocaleString()}
            </span>
            <span
              id="kpi-today-growth-badge"
              title={`${todayStats.count.toLocaleString()} jobs collected today out of ${totalLiveJobs.toLocaleString()} total`}
              className="text-xs font-bold text-emerald-800 bg-emerald-100/80 border border-emerald-200 px-2 py-0.5 rounded-full transition-all"
            >
              {todayStats.formatted}
            </span>
          </div>
        </div>

        {/* Card 2: SELECTED REGION */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
            SELECTED REGION
          </span>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-black text-indigo-700 tracking-tight" id="kpi-selected-region">
              {selectedCity !== "All India"
                ? `${activeCityNode.name}, ${activeCityNode.state}`
                : selectedState
                ? `${selectedState.name}, IN`
                : "Pan-India"}
            </span>
            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full">
              {selectedState ? "State Focus" : "Tech Hub"}
            </span>
          </div>
        </div>

        {/* Card 3: JOBS IN [REGION] */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600 truncate">
            {selectedCity !== "All India"
              ? `JOBS IN ${selectedCity.toUpperCase()}`
              : selectedState
              ? `JOBS IN ${selectedState.name.toUpperCase()}`
              : "ALL INDIA JOBS"}
          </span>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-black text-slate-900 tracking-tight" id="kpi-city-jobs-count">
              {currentCityCount.toLocaleString()}
            </span>
            <span className="text-xs font-semibold text-slate-600">
              {percentageOfIndia}% of India
            </span>
          </div>
        </div>

        {/* Card 4: LAST EXTRACTION RUN */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
            LAST EXTRACTION RUN
          </span>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900 tracking-tight" id="kpi-last-extraction-run">
              {lastExtractionText}
            </span>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-100/80 border border-emerald-200 px-2.5 py-1 rounded-full flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
              100% Sync
            </span>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* MIDDLE SECTION: MAP (LEFT) & DRILLDOWN (RIGHT) */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT CARD: Pure Minimal Interactive India Map */}
        <div className="lg:col-span-7 xl:col-span-7 bg-white rounded-2xl p-2.5 sm:p-3 border border-slate-200 shadow-xs flex flex-col justify-center relative overflow-hidden">
          <div
            className="w-full h-full min-h-[580px] sm:min-h-[620px] rounded-xl border border-slate-200/80 bg-[#FAFAFC] relative overflow-hidden select-none flex items-center justify-center p-2 cursor-default"
            onClick={handleResetToNational}
            title={selectedState || selectedCity !== "All India" ? "Click map canvas outside to reset to full India map" : undefined}
          >
            {/* 1-Click Floating Return Control (visible only when drilled into a state or city) */}
            {(selectedState || selectedCity !== "All India") && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleResetToNational();
                }}
                id="reset-to-india-btn"
                className="absolute top-3.5 left-3.5 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/95 hover:bg-white text-indigo-700 hover:text-indigo-950 border border-indigo-200/90 shadow-md text-xs font-bold transition-all cursor-pointer backdrop-blur-xs hover:scale-105 active:scale-95"
                title="Reset view back to Full India Map"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Reset to India</span>
                <span className="text-[10px] text-slate-500 font-semibold ml-0.5">
                  • {selectedCity !== "All India" ? selectedCity : selectedState?.name}
                </span>
              </button>
            )}

            <svg
              viewBox={INDIA_MAP_VIEWBOX}
              className="w-full h-full min-h-[540px] max-h-[620px]"
              preserveAspectRatio="xMidYMid meet"
              onClick={handleResetToNational}
            >
              <defs>
                <filter id="city-badge-shadow" x="-10%" y="-20%" width="120%" height="140%">
                  <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.08" />
                </filter>
                <filter id="city-active-glow" x="-30%" y="-30%" width="160%" height="160%">
                  <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#4F46E5" floodOpacity="0.35" />
                </filter>
                <linearGradient id="activeNodeGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#4F46E5" />
                  <stop offset="100%" stopColor="#3730A3" />
                </linearGradient>
                <pattern id="india-dot-grid" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
                  <circle cx="2" cy="2" r="1" fill="#E2E8F0" />
                </pattern>
              </defs>

              {/* Background Coordinate Grid */}
              <rect
                width="100%"
                height="100%"
                fill="url(#india-dot-grid)"
                className="cursor-pointer"
                onClick={handleResetToNational}
              />

              {/* Fixed Compass Rose HUD */}
              <g transform="translate(560, 45)" opacity="0.85" pointerEvents="none">
                <circle cx="0" cy="0" r="14" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="1.2" />
                <path d="M0,-11 L3,-2 L0,0 L-3,-2 Z" fill="#EF4444" />
                <path d="M0,11 L3,2 L0,0 L-3,2 Z" fill="#64748B" />
                <text x="0" y="-14" textAnchor="middle" fontSize="9" fontWeight="900" fill="#0F172A">N</text>
              </g>

              {/* Camera Zoom Layer - smoothly translates and scales to focused state bounding box */}
              <g
                id="map-camera-layer"
                style={{
                  transform: cameraTransform.transform,
                  transition: "transform 450ms cubic-bezier(0.4, 0, 0.2, 1)",
                  transformOrigin: "0 0",
                }}
              >
                {/* Water Body Annotations */}
                <text x="70" y="520" fill="#64748B" fontSize="11" fontWeight="800" letterSpacing="3" opacity={selectedState ? 0.3 : 0.8}>ARABIAN SEA</text>
                <text x="400" y="530" fill="#64748B" fontSize="11" fontWeight="800" letterSpacing="3" opacity={selectedState ? 0.3 : 0.8}>BAY OF BENGAL</text>
                <text x="210" y="682" fill="#64748B" fontSize="10.5" fontWeight="800" letterSpacing="3" opacity={selectedState ? 0.3 : 0.75}>INDIAN OCEAN</text>

                {/* Authentic India State Vector Contours */}
                <g id="india-states">
                  {INDIA_STATES.map((state) => {
                    const isSelectedState = selectedState?.id === state.id;
                    const isHovered = hoveredStateId === state.id;
                    const stateJobCount = stateJobCounts[state.id] || 0;

                    // When a state is selected:
                    // Selected state: opacity 1, fill #EEF2FF, stroke #4F46E5, strokeWidth 2.2
                    // Other states: dim to 20% opacity (opacity: 0.2)
                    const opacity = selectedState
                      ? isSelectedState
                        ? 1
                        : 0.2
                      : 1;

                    const fill = isSelectedState
                      ? "#EEF2FF"
                      : isHovered
                      ? "#F5F3FF"
                      : "#FFFFFF";

                    const stroke = isSelectedState
                      ? "#4F46E5"
                      : isHovered
                      ? "#6366F1"
                      : "#94A3B8";

                    const strokeWidth = isSelectedState ? "2.2" : isHovered ? "1.8" : "1";

                    return (
                      <path
                        key={state.id}
                        id={`state-${state.id}`}
                        d={state.path}
                        className="cursor-pointer transition-all duration-200"
                        fill={fill}
                        stroke={stroke}
                        strokeWidth={strokeWidth}
                        opacity={opacity}
                        style={{
                          transition: "opacity 350ms ease, fill 200ms ease, stroke 200ms ease",
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStateClick(state);
                        }}
                        onMouseEnter={() => setHoveredStateId(state.id)}
                        onMouseLeave={() => setHoveredStateId(null)}
                      >
                        <title>
                          {isSelectedState
                            ? `${state.name} (${stateJobCount} Jobs)`
                            : `Click to view all ${state.name} locations (${stateJobCount} Jobs)`}
                        </title>
                      </path>
                    );
                  })}
                </g>

                {/* Inter-City Talent Corridors: strictly illuminate on node hover */}
                {activeCorridors.length > 0 && (
                  <g id="talent-corridors" opacity="0.6" pointerEvents="none" className="transition-opacity duration-300">
                    {activeCorridors.map((c, idx) => (
                      <line
                        key={idx}
                        x1={c.x1}
                        y1={c.y1}
                        x2={c.x2}
                        y2={c.y2}
                        stroke="#6366F1"
                        strokeWidth="1.5"
                        strokeDasharray="3 3"
                      />
                    ))}
                  </g>
                )}

                {/* CONCEPT 2: Interactive City Hub Clusters & Proportional Density Bubbles */}
                <g id="city-nodes">
                  {displayedCityNodes.map((city) => {
                    const count = cityCounts[city.name] || 0;
                    // Strictly hide any location that has 0 jobs
                    if (count <= 0) return null;

                    const isSelected = selectedCity.toLowerCase() === city.name.toLowerCase();
                    const isHovered = hoveredCity === city.name;
                    const formatted = count >= 1000 ? `${(count / 1000).toFixed(1)}k` : count;

                    // Proportional Density Bubble Radius Scaling
                    // Mathematical square-root scale tuned for high-contrast visibility:
                    // count 0 -> 4.5px
                    // count 1-10 -> 5.5px - 7px
                    // count 50 -> 8.5px
                    // count 250 -> 12px
                    // count 1000+ -> 19-22px
                    const bubbleRadius = count > 0 ? Math.max(5, Math.min(22, 5 + Math.sqrt(count) * 0.45)) : 4.5;
                    const coreRadius = Math.max(2.5, Math.min(6, bubbleRadius * 0.35));

                    // Label Display Logic:
                    // Top 10, count >= 25, in state drill-down, or selected show badge; others show tooltip on hover
                    const isTop10 = top10CityNamesSet.has(city.name.toLowerCase());
                    const showBadge =
                      isSelected ||
                      Boolean(selectedState) ||
                      isTop10 ||
                      count >= 25 ||
                      isHovered;

                    const labelText = isSelected
                      ? `★ ${city.name} (${formatted})`
                      : `${city.name} (${formatted})`;

                    // Counter-scale badges when camera zooms in so labels never collide
                    const counterScale = cameraTransform.scale > 1
                      ? Math.min(1, (1 / cameraTransform.scale) * 1.45)
                      : 1;

                    return (
                      <g
                        key={city.name}
                        id={`city-cluster-${city.name.toLowerCase()}`}
                        className="cursor-pointer group transition-all duration-200"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCitySelect(city.name);
                        }}
                        onMouseEnter={() => setHoveredCity(city.name)}
                        onMouseLeave={() => setHoveredCity(null)}
                      >
                        <g
                          transform={
                            counterScale !== 1
                              ? `translate(${city.x}, ${city.y}) scale(${counterScale.toFixed(3)}) translate(${-city.x}, ${-city.y})`
                              : undefined
                          }
                        >
                          {/* 1. Proportional Outer Halo (Cartographic Density Bubble) */}
                          <circle
                            cx={city.x}
                            cy={city.y}
                            r={isHovered ? bubbleRadius + 3 : bubbleRadius}
                            fill={
                              isSelected
                                ? "rgba(79, 70, 229, 0.28)"
                                : isHovered
                                ? "rgba(99, 102, 241, 0.32)"
                                : "rgba(79, 70, 229, 0.18)"
                            }
                            stroke={isSelected ? "#4F46E5" : isHovered ? "#4338CA" : "#6366F1"}
                            strokeWidth={isSelected ? 2 : isHovered ? 1.6 : 1.2}
                            className="transition-all duration-200"
                            style={{ transformOrigin: `${city.x}px ${city.y}px` }}
                          />

                          {/* 2. Solid Inner Core Beacon */}
                          <circle
                            cx={city.x}
                            cy={city.y}
                            r={coreRadius}
                            fill={isSelected ? "url(#activeNodeGrad)" : "#4F46E5"}
                            stroke="#FFFFFF"
                            strokeWidth={isHovered || isSelected ? 2 : 1.4}
                            className="transition-all duration-200"
                            style={{ transformOrigin: `${city.x}px ${city.y}px` }}
                          />

                          {/* 3. Selected Active Radar Ripple */}
                          {isSelected && (
                            <>
                              <circle
                                cx={city.x}
                                cy={city.y}
                                r={bubbleRadius + 8}
                                fill="none"
                                stroke="#4F46E5"
                                strokeWidth="1.8"
                                strokeDasharray="3 3"
                                opacity="0.85"
                                className="animate-spin"
                                style={{ transformOrigin: `${city.x}px ${city.y}px`, animationDuration: "14s" }}
                              />
                              <circle
                                cx={city.x}
                                cy={city.y}
                                r={bubbleRadius + 4}
                                fill="#818CF8"
                                opacity="0.25"
                              />
                              <text
                                x={city.x}
                                y={city.y + 3.5}
                                textAnchor="middle"
                                fontSize="9"
                                fill="#FBBF24"
                                fontWeight="900"
                                className="pointer-events-none"
                              >
                                ★
                              </text>
                            </>
                          )}

                          {/* 4. Badges and Tooltips */}
                          {isSelected ? (
                            /* Dark Sleek Active Pill Label */
                            <>
                              <rect
                                x={city.lx}
                                y={city.ly}
                                width={city.lw}
                                height="24"
                                rx="6"
                                fill="#0F172A"
                                stroke="#312E81"
                                strokeWidth="1.5"
                                filter="url(#city-badge-shadow)"
                                className="transition-all duration-200 group-hover:scale-105 cursor-pointer"
                                style={{ transformOrigin: `${city.lx + city.lw / 2}px ${city.ly + 12}px` }}
                              />
                              <text
                                x={city.lx + city.lw / 2}
                                y={city.ly + 16}
                                textAnchor="middle"
                                fill="#FFFFFF"
                                fontSize="11.5"
                                fontWeight="900"
                                letterSpacing="-0.2px"
                                className="select-none cursor-pointer"
                              >
                                {labelText}
                              </text>
                            </>
                          ) : showBadge ? (
                            /* Rectangular Floating Count Badge */
                            <>
                              <rect
                                x={city.lx}
                                y={city.ly}
                                width={city.lw}
                                height="22"
                                rx="6"
                                fill="#FFFFFF"
                                stroke={isHovered ? "#4F46E5" : "#64748B"}
                                strokeWidth={isHovered ? "1.6" : "1.2"}
                                filter="url(#city-badge-shadow)"
                                className="transition-all duration-200 group-hover:stroke-indigo-600 group-hover:scale-105 cursor-pointer"
                                style={{ transformOrigin: `${city.lx + city.lw / 2}px ${city.ly + 11}px` }}
                              />
                              <text
                                x={city.lx + city.lw / 2}
                                y={city.ly + 15}
                                textAnchor="middle"
                                fill="#0F172A"
                                fontSize="11"
                                fontWeight="800"
                                letterSpacing="-0.2px"
                                className="select-none cursor-pointer transition-colors group-hover:fill-indigo-600"
                              >
                                {labelText}
                              </text>
                            </>
                          ) : (
                            /* Hover Tooltip Card for Bubbles when badge is hidden */
                            isHovered && (
                              <g
                                transform={`translate(${city.x}, ${city.y - bubbleRadius - 16})`}
                                className="pointer-events-none transition-all duration-150"
                              >
                                <rect
                                  x="-60"
                                  y="-14"
                                  width="120"
                                  height="28"
                                  rx="6"
                                  fill="#0F172A"
                                  stroke="#4F46E5"
                                  strokeWidth="1.2"
                                  filter="url(#city-badge-shadow)"
                                />
                                <text
                                  x="0"
                                  y="4"
                                  textAnchor="middle"
                                  fill="#FFFFFF"
                                  fontSize="10.5"
                                  fontWeight="800"
                                >
                                  {city.name} ({formatted} Jobs)
                                </text>
                              </g>
                            )
                          )}
                        </g>
                      </g>
                    );
                  })}
                </g>
              </g>
            </svg>
          </div>
        </div>

        {/* RIGHT COLUMN: LOCATION SKILLS PIE & EXPERIENCE POINT CHARTS + EXPORT BUTTON */}
        <div id="sidebar-analytics-column" className="lg:col-span-5 xl:col-span-5 flex flex-col gap-5">
          {/* Chart 1: Location-wise Skills Donut Chart (Clean White Theme matching Dashboard) */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors">
            <div className="pb-1 flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight" id="skills-pie-chart-title">
                  {activeAnalyticsTitle} Skills Breakdown
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                  {selectedCity !== "All India"
                    ? `Top in-demand technical skills in ${selectedCity}`
                    : selectedState
                    ? `Top in-demand technical skills in ${selectedState.name}`
                    : "Top in-demand technical skills across India"}
                </p>
              </div>
              <span className="text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                Donut Share
              </span>
            </div>

            <div className="h-[210px] w-full flex items-center justify-center relative my-1">
              {isMounted ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip content={<CustomPieTooltip />} />
                    <Pie
                      data={locationSkillsPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={46}
                      outerRadius={78}
                      paddingAngle={3}
                      stroke="#ffffff"
                      strokeWidth={3}
                    >
                      {locationSkillsPieData.map((slice, index) => (
                        <Cell key={`slice-${index}`} fill={slice.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                  Loading visualization...
                </div>
              )}
            </div>

            {/* Bottom Horizontal Legend - Clean White Dashboard Theme */}
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 pt-2.5 border-t border-slate-100 text-[11px]">
              {locationSkillsPieData.map((item) => (
                <button
                  key={item.name}
                  onClick={() => {
                    if (item.name !== "Others") {
                      setSelectedSkillFilter(
                        selectedSkillFilter?.toLowerCase() === item.name.toLowerCase()
                          ? null
                          : item.name
                      );
                    }
                  }}
                  className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md transition-colors ${
                    selectedSkillFilter?.toLowerCase() === item.name.toLowerCase()
                      ? "bg-indigo-50 border border-indigo-200 text-indigo-900 font-bold shadow-2xs"
                      : "text-slate-700 hover:text-slate-950 hover:bg-slate-50 border border-transparent"
                  }`}
                  title={`Filter by ${item.name}`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-[3px] shrink-0 inline-block"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="font-semibold">{item.name}</span>
                  <span className="text-slate-500 font-medium">({item.percentage}%)</span>
                </button>
              ))}
            </div>
          </div>

          {/* Chart 2: Experience Demand Point Chart (Clean White Minimalist - Image 3) */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors">
            <div className="pb-1 flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight" id="experience-chart-title">
                  Experience Demand ({activeAnalyticsTitle === "India" ? "All India" : activeAnalyticsTitle})
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                  {selectedCity !== "All India"
                    ? `Active hiring breakdown across career seniority tiers in ${selectedCity}`
                    : selectedState
                    ? `Active hiring breakdown across career seniority tiers in ${selectedState.name}`
                    : "Active hiring breakdown across career seniority tiers across India"}
                </p>
              </div>
              <span className="text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                Point Curve
              </span>
            </div>

            <div className="h-[210px] w-full flex items-center justify-center relative my-1">
              {isMounted ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={experienceCurveData}
                    margin={{ top: 12, right: 15, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#E2E8F0"
                      vertical={true}
                      horizontal={true}
                    />
                    <XAxis
                      dataKey="bracket"
                      tick={{ fill: "#64748B", fontSize: 10, fontWeight: 600 }}
                      stroke="#CBD5E1"
                      tickLine={false}
                      axisLine={{ stroke: "#E2E8F0" }}
                    />
                    <YAxis
                      tick={{ fill: "#64748B", fontSize: 10, fontWeight: 600 }}
                      stroke="#CBD5E1"
                      tickLine={false}
                      axisLine={{ stroke: "#E2E8F0" }}
                      allowDecimals={false}
                    />
                    <Tooltip content={<CustomExpTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#09090B"
                      strokeWidth={2.5}
                      dot={{
                        r: 4,
                        fill: "#09090B",
                        stroke: "#FFFFFF",
                        strokeWidth: 1.5,
                      }}
                      activeDot={{
                        r: 6,
                        fill: "#4F46E5",
                        stroke: "#FFFFFF",
                        strokeWidth: 2,
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                  Loading visualization...
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-600 font-medium">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-900 inline-block"></span>
                Peak Demand:{" "}
                <strong className="text-slate-900">
                  {[...experienceCurveData].sort((a, b) => b.count - a.count)[0]?.bracket || "Mid"}
                </strong>
              </span>
              <span className="text-[10px] text-slate-500 font-medium">
                Total {experienceCurveData.reduce((acc, d) => acc + d.count, 0).toLocaleString()} Roles
              </span>
            </div>
          </div>

          {/* Export CSV Button at the end */}
          <button
            onClick={handleExportCityCsv}
            id="export-city-csv-btn"
            className="w-full py-3 px-4 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 hover:border-slate-400 text-slate-800 hover:text-slate-950 font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>
              Export {activeAnalyticsTitle.toLowerCase().replace(/\s+/g, "_")}_jobs.csv
            </span>
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* BOTTOM SECTION: [CITY] LIVE OPENINGS TABLE */}
      {/* ==================================================================== */}
      <div id="directory" className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4 hover:border-slate-300 transition-colors">
        {/* Table Title Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
          <div className="flex items-baseline gap-2">
            <h3 className="text-base font-black text-slate-900" id="table-title">
              {selectedCity !== "All India"
                ? `${selectedCity} Live Openings`
                : selectedState
                ? `${selectedState.name} Live Openings`
                : "All India Live Openings"}
            </h3>
            <span className="text-xs font-semibold text-slate-600" id="table-count-label">
              (Showing {totalDisplayCount > 0 ? `${startIndex + 1}–${endIndex}` : "0"} of{" "}
              {totalDisplayCount.toLocaleString()} matching records
              • Page {safeCurrentPage} of {totalPages})
              {isServerLoading && <span className="ml-2 text-indigo-600 animate-pulse text-[11px] font-bold">Searching...</span>}
            </span>
          </div>

          {/* Action Controls: Export CSV Button placed directly on the table header */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCityCsv}
              id="export-csv-btn"
              className="px-3.5 py-2 text-xs font-bold rounded-xl bg-white hover:bg-slate-50 text-slate-800 hover:text-slate-950 border border-slate-300 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
              title="Export current filtered jobs to CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* COLUMN FILTER TOOLBAR: LOCATION, EXPERIENCE, SOURCES, TIME WINDOW */}
        {/* ==================================================================== */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3 bg-slate-50/90 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mr-1">
              <Filter className="w-3.5 h-3.5 text-slate-400" /> Filter:
            </span>

            {/* 1. Location Filter Dropdown */}
            <div className="relative" data-dropdown-id="location-filter">
              <button
                type="button"
                onClick={() => {
                  setLocationDropdownOpen(!locationDropdownOpen);
                  setExpDropdownOpen(false);
                  setSourceDropdownOpen(false);
                  setTimeWindowOpen(false);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer ${
                  selectedCity !== "All India" || selectedState
                    ? "bg-indigo-50 border-indigo-300 text-indigo-700 shadow-2xs"
                    : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                <span>
                  {selectedCity !== "All India"
                    ? selectedCity
                    : selectedState
                    ? selectedState.name
                    : "Location: All India"}
                </span>
                <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${locationDropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {locationDropdownOpen && (
                <div className="absolute left-0 top-full mt-1.5 w-72 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-50 space-y-1.5">
                  <div className="px-1 py-1">
                    <input
                      type="text"
                      placeholder="Search city or hub..."
                      value={locationSearchText}
                      onChange={(e) => setLocationSearchText(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900"
                      autoFocus
                    />
                  </div>
                  <div className="max-h-56 overflow-y-auto space-y-0.5 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        handleResetToNational();
                        setLocationDropdownOpen(false);
                        setLocationSearchText("");
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg font-bold flex items-center justify-between transition-colors cursor-pointer ${
                        selectedCity === "All India" && !selectedState
                          ? "bg-indigo-50 text-indigo-700"
                          : "hover:bg-slate-100 text-slate-700"
                      }`}
                    >
                      <span>All India (Pan-National)</span>
                      <span className="text-[11px] font-semibold text-slate-400">11k+ Jobs</span>
                    </button>
                    {filteredLocationList.map((loc) => {
                      const isSelected = selectedCity.toLowerCase() === loc.name.toLowerCase();
                      return (
                        <button
                          key={loc.name}
                          type="button"
                          onClick={() => {
                            handleCitySelect(loc.name);
                            setLocationDropdownOpen(false);
                            setLocationSearchText("");
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg font-bold flex items-center justify-between transition-colors cursor-pointer ${
                            isSelected
                              ? "bg-indigo-50 text-indigo-700"
                              : "hover:bg-slate-100 text-slate-700"
                          }`}
                        >
                          <span className="truncate">{loc.name}</span>
                          <span className="text-[11px] font-semibold text-slate-400 ml-2">
                            {loc.count > 0 ? `${loc.count.toLocaleString()}` : ""}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Experience Filter Dropdown */}
            <div className="relative" data-dropdown-id="exp-filter">
              <button
                type="button"
                onClick={() => {
                  setExpDropdownOpen(!expDropdownOpen);
                  setLocationDropdownOpen(false);
                  setSourceDropdownOpen(false);
                  setTimeWindowOpen(false);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer ${
                  selectedExpFilter !== "all"
                    ? "bg-indigo-50 border-indigo-300 text-indigo-700 shadow-2xs"
                    : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <Briefcase className="w-3.5 h-3.5 text-indigo-500" />
                <span>
                  {selectedExpFilter === "all"
                    ? "Experience: All"
                    : `Exp: ${EXPERIENCE_FILTER_OPTIONS.find((o) => o.key === selectedExpFilter)?.label}`}
                </span>
                <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${expDropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {expDropdownOpen && (
                <div className="absolute left-0 top-full mt-1.5 w-60 bg-white rounded-xl shadow-xl border border-slate-200 p-1.5 z-50 space-y-0.5 text-xs">
                  {EXPERIENCE_FILTER_OPTIONS.map((opt) => {
                    const isSelected = selectedExpFilter === opt.key;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => {
                          setSelectedExpFilter(opt.key);
                          setExpDropdownOpen(false);
                          setCurrentPage(1);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg font-bold flex flex-col transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-indigo-50 text-indigo-700"
                            : "hover:bg-slate-100 text-slate-700"
                        }`}
                      >
                        <span className="font-bold">{opt.label}</span>
                        <span className="text-[10px] font-normal text-slate-500">{opt.subtitle}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 3. Source Filter Dropdown */}
            <div className="relative" data-dropdown-id="source-filter">
              <button
                type="button"
                onClick={() => {
                  setSourceDropdownOpen(!sourceDropdownOpen);
                  setLocationDropdownOpen(false);
                  setExpDropdownOpen(false);
                  setTimeWindowOpen(false);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer ${
                  selectedSourceFilter !== "all"
                    ? "bg-indigo-50 border-indigo-300 text-indigo-700 shadow-2xs"
                    : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-indigo-500" />
                <span>
                  {selectedSourceFilter === "all"
                    ? "Source: All"
                    : `Source: ${selectedSourceFilter}`}
                </span>
                <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${sourceDropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {sourceDropdownOpen && (
                <div className="absolute left-0 top-full mt-1.5 w-56 bg-white rounded-xl shadow-xl border border-slate-200 p-1.5 z-50 space-y-0.5 text-xs">
                  {SOURCE_FILTER_OPTIONS.map((opt) => {
                    const isSelected = selectedSourceFilter === opt.key;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => {
                          setSelectedSourceFilter(opt.key);
                          setSourceDropdownOpen(false);
                          setCurrentPage(1);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg font-bold flex items-center justify-between transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-indigo-50 text-indigo-700"
                            : "hover:bg-slate-100 text-slate-700"
                        }`}
                      >
                        <span>{opt.label}</span>
                        <span className="text-[10px] font-semibold text-slate-400">{opt.countLabel}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 4. Extraction Recency Time-Window (All Time / Calendar) Dropdown */}
            <div className="relative" data-dropdown-id="time-window-filter">
              <button
                type="button"
                id="time-window-dropdown-btn"
                onClick={() => {
                  setTimeWindowOpen(!timeWindowOpen);
                  setLocationDropdownOpen(false);
                  setExpDropdownOpen(false);
                  setSourceDropdownOpen(false);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer ${
                  timeWindow !== "all"
                    ? "bg-indigo-50 border-indigo-300 text-indigo-700 shadow-2xs"
                    : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                }`}
                title="Filter jobs by extraction recency"
              >
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <span>
                  {TIME_WINDOWS.find((w) => w.key === timeWindow)?.label || "All Time"}
                </span>
                <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${timeWindowOpen ? "rotate-180" : ""}`} />
              </button>

              {timeWindowOpen && (
                <div className="absolute left-0 top-full mt-1.5 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-indigo-600" />
                    <span>Extraction Recency</span>
                  </div>
                  {TIME_WINDOWS.map((w) => {
                    const active = timeWindow === w.key;
                    return (
                      <button
                        key={w.key}
                        type="button"
                        onClick={() => {
                          setTimeWindow(w.key);
                          setTimeWindowOpen(false);
                          setCurrentPage(1);
                        }}
                        className={`w-full text-left px-3.5 py-2 text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                          active
                            ? "bg-indigo-50 text-indigo-700 font-bold"
                            : "text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              active ? "bg-indigo-600" : "bg-slate-300"
                            }`}
                          />
                          {w.label}
                        </span>
                        {active && (
                          <span className="text-[10px] font-bold text-indigo-600">Active</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Active Filter Badges & Reset All */}
          <div className="flex items-center gap-2 flex-wrap">
            {selectedCity !== "All India" && (
              <span className="inline-flex items-center gap-1 text-[11px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-md border border-indigo-200">
                <span>City: {selectedCity}</span>
                <button
                  type="button"
                  onClick={() => setSelectedCity("All India")}
                  className="hover:text-indigo-950 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedExpFilter !== "all" && (
              <span className="inline-flex items-center gap-1 text-[11px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-md border border-indigo-200">
                <span>Exp: {EXPERIENCE_FILTER_OPTIONS.find((o) => o.key === selectedExpFilter)?.label}</span>
                <button
                  type="button"
                  onClick={() => setSelectedExpFilter("all")}
                  className="hover:text-indigo-950 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedSourceFilter !== "all" && (
              <span className="inline-flex items-center gap-1 text-[11px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-md border border-indigo-200">
                <span>Source: {selectedSourceFilter}</span>
                <button
                  type="button"
                  onClick={() => setSelectedSourceFilter("all")}
                  className="hover:text-indigo-950 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {timeWindow !== "all" && (
              <span className="inline-flex items-center gap-1 text-[11px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-md border border-indigo-200">
                <span>Recency: {TIME_WINDOWS.find((w) => w.key === timeWindow)?.label}</span>
                <button
                  type="button"
                  onClick={() => setTimeWindow("all")}
                  className="hover:text-indigo-950 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedSkillFilter && (
              <span className="inline-flex items-center gap-1 text-[11px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-md border border-indigo-200">
                <span>Skill: {selectedSkillFilter}</span>
                <button
                  type="button"
                  onClick={() => setSelectedSkillFilter(null)}
                  className="hover:text-indigo-950 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {(selectedCity !== "All India" || selectedState || selectedExpFilter !== "all" || selectedSourceFilter !== "all" || selectedSkillFilter || timeWindow !== "all") && (
              <button
                type="button"
                onClick={handleClearAllFilters}
                className="text-xs font-bold text-slate-500 hover:text-indigo-600 px-2 py-1 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                Clear All
              </button>
            )}
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/90 text-slate-700 font-bold uppercase tracking-wider text-xs">
                <th className="py-3.5 px-4">Job Title</th>
                <th className="py-3.5 px-4">Company</th>
                <th className="py-3.5 px-4">Location</th>
                <th className="py-3.5 px-4">Experience</th>
                <th className="py-3.5 px-4">Source</th>
                <th className="py-3.5 px-4 text-right">Canonical Link</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayJobs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 px-4 text-center">
                    <div className="max-w-md mx-auto space-y-2">
                      <Search className="w-8 h-8 text-slate-400 mx-auto mb-1" />
                      <p className="text-sm font-bold text-slate-800">
                        No matching jobs found
                        {searchQuery ? ` for "${searchQuery}"` : ""}
                        {selectedCity !== "All India" ? ` in ${selectedCity}` : ""}
                      </p>
                      <p className="text-xs text-slate-500">
                        Try searching for another role, skill, or location, or switch to Pan-India view.
                      </p>
                      <div className="pt-2 flex items-center justify-center gap-2">
                        {searchQuery && (
                          <button
                            type="button"
                            onClick={() => {
                              setSearchInput("");
                              setSearchQuery("");
                            }}
                            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors cursor-pointer"
                          >
                            Clear Search
                          </button>
                        )}
                        {(selectedCity !== "All India" || selectedExpFilter !== "all" || selectedSourceFilter !== "all" || selectedSkillFilter || timeWindow !== "all") && (
                          <button
                            type="button"
                            onClick={handleClearAllFilters}
                            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors cursor-pointer"
                          >
                            Reset All Filters
                          </button>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                currentPaginatedJobs.map((job) => {
                  const src = (job.source || "LinkedIn").toLowerCase();
                  return (
                    <tr
                      key={job.job_id}
                      className="hover:bg-indigo-50/40 transition-colors group cursor-pointer"
                      onClick={() => handleSelectJob(job)}
                    >
                      {/* Job Title */}
                      <td className="py-4 px-4 font-bold text-slate-900 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="group-hover:text-indigo-700 transition-colors">
                            {job.title}
                          </span>
                        </div>
                      </td>

                      {/* Company */}
                      <td className="py-4 px-4 font-semibold text-slate-800 text-xs">
                        {job.company || "Not Specified"}
                      </td>

                      {/* Location */}
                      <td className="py-4 px-4 text-slate-600 font-medium text-xs">
                        {selectedCity !== "All India"
                          ? (job.city && job.city.toLowerCase().includes("hybrid") ? `Hybrid - ${selectedCity}` : selectedCity)
                          : (job.city && job.city !== "Not Specified"
                              ? `${job.city}${job.state && job.state !== "Not Specified" ? `, ${job.state}` : ""}`
                              : job.normalized_location || "India")}
                      </td>

                      {/* Experience */}
                      <td className="py-4 px-4">
                        <span className="text-slate-800 font-semibold text-xs bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200 inline-block">
                          {job.exp_display || `${job.min_experience_years || 0} - ${job.max_experience_years || 5} Years`}
                        </span>
                      </td>

                      {/* Source Badge */}
                      <td className="py-4 px-4">
                        {src.includes("linkedin") ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#EBF5FF] text-[#0A66C2] border border-[#B3D7FF]">
                            LinkedIn
                          </span>
                        ) : src.includes("naukri") ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
                            Naukri
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-900 border border-blue-200">
                            Indeed
                          </span>
                        )}
                      </td>

                      {/* Canonical Link */}
                      <td className="py-4 px-4 text-right">
                        {job.link && job.link !== "Not Specified" ? (
                          <a
                            href={job.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-indigo-700 hover:text-indigo-950 font-bold text-xs transition-colors hover:underline"
                          >
                            <span>View Listing</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </a>
                        ) : (
                          <span className="text-slate-400 font-medium text-xs">View Listing ↗</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Page Navigation Controls (Navigates to Next / Prev Page instead of expanding on same page) */}
        {displayJobs.length > 0 && (
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4" id="table-pagination-bar">
            {/* Results count text */}
            <div className="text-xs font-semibold text-slate-600">
              Showing <span className="font-bold text-slate-900">{startIndex + 1}</span> to{" "}
              <span className="font-bold text-slate-900">{endIndex}</span> of{" "}
              <span className="font-bold text-slate-900">{displayJobs.length.toLocaleString()}</span> jobs
            </div>

            {/* Pagination Buttons */}
            <div className="flex items-center gap-2">
              {/* Previous Page Button */}
              <button
                onClick={() => {
                  setCurrentPage((prev) => Math.max(1, prev - 1));
                  document.getElementById("directory")?.scrollIntoView({ behavior: "smooth" });
                }}
                disabled={safeCurrentPage <= 1}
                id="prev-page-btn"
                className="px-3.5 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:text-slate-950 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                title="Previous Page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>

              {/* Numbered Page Buttons */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (safeCurrentPage <= 3) {
                    pageNum = i + 1;
                  } else if (safeCurrentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = safeCurrentPage - 2 + i;
                  }

                  const isActive = pageNum === safeCurrentPage;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => {
                        setCurrentPage(pageNum);
                        document.getElementById("directory")?.scrollIntoView({ behavior: "smooth" });
                      }}
                      className={`min-w-[32px] h-8 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isActive
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "bg-white text-slate-700 hover:text-slate-950 hover:bg-slate-100 border border-slate-200"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                {totalPages > 5 && safeCurrentPage < totalPages - 2 && (
                  <>
                    <span className="text-slate-400 px-1 text-xs select-none">...</span>
                    <button
                      onClick={() => {
                        setCurrentPage(totalPages);
                        document.getElementById("directory")?.scrollIntoView({ behavior: "smooth" });
                      }}
                      className="min-w-[32px] h-8 px-2 rounded-xl text-xs font-bold bg-white text-slate-700 hover:text-slate-950 hover:bg-slate-100 border border-slate-200 cursor-pointer"
                    >
                      {totalPages}
                    </button>
                  </>
                )}
              </div>

              {/* Next Page Button */}
              <button
                onClick={() => {
                  setCurrentPage((prev) => Math.min(totalPages, prev + 1));
                  document.getElementById("directory")?.scrollIntoView({ behavior: "smooth" });
                }}
                disabled={safeCurrentPage >= totalPages}
                id="next-page-btn"
                className="px-3.5 py-1.5 rounded-xl border border-indigo-600 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:border-slate-300 disabled:text-slate-500 cursor-pointer"
                title="Next Page"
              >
                <span>Next Page</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ==================================================================== */}
      {/* JOB DETAIL POPUP MODAL */}
      {/* ==================================================================== */}
      {selectedJob && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setSelectedJob(null)}
              className="absolute right-4 top-4 p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-4">
              <div>
                <span className="text-xs uppercase font-bold tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-200 inline-block">
                  {selectedJob.source}
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-2">
                  {selectedJob.title}
                </h3>
                <p className="text-sm font-semibold text-slate-700 mt-0.5">
                  {selectedJob.company} • {selectedCity !== "All India" ? selectedCity : (selectedJob.city || activeCityNode.name)},{" "}
                  {selectedCity !== "All India" ? activeCityNode.state : (selectedJob.state || activeCityNode.state)}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-500 font-semibold text-xs">Experience:</span>
                  <p className="font-bold text-slate-900 text-xs mt-0.5">
                    {selectedJob.exp_display || "Not specified"}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold text-xs">Education:</span>
                  <p className="font-bold text-slate-900 text-xs mt-0.5">
                    {selectedJob.degree_required || "Any Graduate"}
                  </p>
                </div>
              </div>

              {selectedJob.skills && (
                <div>
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Skills / Keywords:</span>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {selectedJob.skills.split(",").map((sk, i) => (
                      <span
                        key={i}
                        className="text-xs bg-indigo-50 text-indigo-900 px-2.5 py-1 rounded-md font-bold border border-indigo-200 shadow-2xs"
                      >
                        {sk.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedJob && (
                <div>
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Description Overview:</span>
                  {loadingDescription ? (
                    <div className="flex items-center gap-2 mt-1 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                      Loading detailed job description from database...
                    </div>
                  ) : (
                    <p className="text-xs text-slate-800 mt-1 leading-relaxed max-h-48 overflow-y-auto bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                      {selectedJob.full_description || "No full description available for this position."}
                    </p>
                  )}
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  onClick={() => setSelectedJob(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
                >
                  Close
                </button>
                {selectedJob.link && selectedJob.link !== "Not Specified" && (
                  <a
                    href={selectedJob.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-colors"
                  >
                    <span>Open Original Job Posting</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
