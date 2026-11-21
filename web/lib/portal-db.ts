import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import { createClient as createSupabaseClient, SupabaseClient } from "@supabase/supabase-js";

// Supabase Cloud Configuration
const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://wzixisxbeshiiarjlgnr.supabase.co";

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_KEY ||
  "";

let supabaseAdminInstance: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient | null {
  if (!supabaseAdminInstance && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    try {
      supabaseAdminInstance = createSupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
    } catch (e) {
      console.warn("[Supabase Admin] Init warning:", e);
    }
  }
  return supabaseAdminInstance;
}

function resolvePortalDbPath(): string {
  // Check if running on Vercel or AWS Lambda Serverless
  const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

  if (isServerless) {
    const tmpDataDir = path.join(os.tmpdir(), "job_scraper_portal");
    try {
      if (!fs.existsSync(tmpDataDir)) {
        fs.mkdirSync(tmpDataDir, { recursive: true });
      }
    } catch {}

    const tmpDbPath = path.join(tmpDataDir, "portal.db");

    // Copy bundled portal.db into /tmp if available
    if (!fs.existsSync(tmpDbPath)) {
      const candidates = [
        path.resolve(process.cwd(), "..", "Data", "portal.db"),
        path.resolve(process.cwd(), "Data", "portal.db"),
        path.resolve(process.cwd(), "portal.db"),
      ];
      for (const cand of candidates) {
        if (fs.existsSync(cand)) {
          try {
            fs.copyFileSync(cand, tmpDbPath);
            break;
          } catch {}
        }
      }
    }
    return tmpDbPath;
  }

  // Local development
  const DATA_DIR = path.resolve(process.cwd(), "..", "Data");
  const LOCAL_DATA_DIR = path.resolve(process.cwd(), "Data");

  let activeDir = fs.existsSync(DATA_DIR) ? DATA_DIR : LOCAL_DATA_DIR;
  try {
    if (!fs.existsSync(activeDir)) {
      fs.mkdirSync(activeDir, { recursive: true });
    }
  } catch {
    activeDir = os.tmpdir();
  }

  return path.join(activeDir, "portal.db");
}

let dbInstance: DatabaseSync | null = null;

export function getPortalDb(): DatabaseSync {
  if (!dbInstance) {
    const dbPath = resolvePortalDbPath();
    dbInstance = new DatabaseSync(dbPath);
    initDatabase(dbInstance);
  }
  return dbInstance;
}

// Password utilities
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, combinedHash: string): boolean {
  if (!combinedHash || !combinedHash.includes(":")) return false;
  const [salt, originalHash] = combinedHash.split(":");
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return hash === originalHash;
}

function initDatabase(db: DatabaseSync) {
  // 1. Users Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      user_id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      mobile_number TEXT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      address TEXT,
      qualification TEXT,
      date_of_birth TEXT,
      created_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Active',
      data_scope_hours TEXT NOT NULL DEFAULT 'all',
      daily_apply_limit INTEGER NOT NULL DEFAULT 10,
      college_name TEXT
    );
  `);

  // 2. Admin Codes Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_codes (
      code_id TEXT PRIMARY KEY,
      unique_admin_code TEXT UNIQUE NOT NULL,
      status TEXT NOT NULL DEFAULT 'Unused', -- 'Unused', 'Used', 'Expired'
      created_date TEXT NOT NULL,
      used_by_user_id TEXT,
      data_scope_hours TEXT NOT NULL DEFAULT 'all',
      daily_apply_limit INTEGER NOT NULL DEFAULT 10,
      FOREIGN KEY(used_by_user_id) REFERENCES users(user_id)
    );
  `);

  // Safe migrations for pre-existing databases
  try {
    db.exec("ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'Active';");
  } catch {}
  try {
    db.exec("ALTER TABLE users ADD COLUMN data_scope_hours TEXT NOT NULL DEFAULT 'all';");
  } catch {}
  try {
    db.exec("ALTER TABLE users ADD COLUMN daily_apply_limit INTEGER NOT NULL DEFAULT 10;");
  } catch {}
  try {
    db.exec("ALTER TABLE users ADD COLUMN college_name TEXT;");
  } catch {}
  try {
    db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'candidate';");
  } catch {}
  try {
    db.exec("ALTER TABLE admin_codes ADD COLUMN data_scope_hours TEXT NOT NULL DEFAULT 'all';");
  } catch {}
  try {
    db.exec("ALTER TABLE admin_codes ADD COLUMN daily_apply_limit INTEGER NOT NULL DEFAULT 10;");
  } catch {}
  try {
    db.exec("ALTER TABLE admin_codes ADD COLUMN role TEXT NOT NULL DEFAULT 'candidate';");
  } catch {}
  try {
    db.exec("ALTER TABLE users ADD COLUMN is_hidden_from_dashboard INTEGER NOT NULL DEFAULT 0;");
  } catch {}
  try {
    db.exec(`
      UPDATE users SET role = 'master_admin' WHERE email = 'admin@talentpulse.com' OR qualification = 'Master Administrator';
      UPDATE users SET role = 'system_admin' WHERE email = 'kokilam653@gmail.com' OR qualification = 'System Administrator';
    `);
  } catch {}

  // 3. Job Applications Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS job_applications (
      application_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      job_id TEXT NOT NULL,
      application_date TEXT NOT NULL,
      application_status TEXT NOT NULL DEFAULT 'Submitted',
      notes TEXT,
      UNIQUE(user_id, job_id),
      FOREIGN KEY(user_id) REFERENCES users(user_id)
    );
  `);

  // 4. Active Sessions Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS portal_sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(user_id)
    );
  `);

  // 5. System Settings Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS system_settings (
      setting_key TEXT PRIMARY KEY,
      setting_value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Seed default system settings
  const defaultSettings: Record<string, string> = {
    require_admin_code: "true",
    session_duration_days: "7",
    default_location: "India",
    default_freshness_hours: "72",
    default_results_limit: "50",
    enable_source_linkedin: "true",
    enable_source_naukri: "true",
    enable_source_indeed: "true",
    allow_duplicate_apply: "false",
  };

  const insertSetting = db.prepare(`
    INSERT OR IGNORE INTO system_settings (setting_key, setting_value, updated_at)
    VALUES (?, ?, ?)
  `);
  const settingsNow = new Date().toISOString();
  for (const [key, value] of Object.entries(defaultSettings)) {
    insertSetting.run(key, value, settingsNow);
  }

  // Seed default admin codes if table is empty
  const countRow = db.prepare("SELECT COUNT(*) as count FROM admin_codes").get() as { count: number };
  if (countRow.count === 0) {
    const defaultCodes = [
      "ADM-2026-7890",
      "ADM-2026-4321",
      "ADM-2026-9901",
      "TALENT-2026-VIP",
      "THOORIGAI-2026",
      "RECRUIT-9021",
      "CAREER-8844",
      "PLACEMENT-2026",
    ];
    const insertCode = db.prepare(`
      INSERT INTO admin_codes (code_id, unique_admin_code, status, created_date, data_scope_hours, daily_apply_limit)
      VALUES (?, ?, 'Unused', ?, 'all', 10)
    `);
    const now = new Date().toISOString();
    for (const code of defaultCodes) {
      insertCode.run(`code_${crypto.randomBytes(6).toString("hex")}`, code, now);
    }
  }

  // Seed master administrators
  try {
    const adminHash = hashPassword("Admin@2026Secure!");
    const seedAdmin = db.prepare(`
      INSERT INTO users (
        user_id, full_name, email, mobile_number, username, password_hash,
        address, qualification, date_of_birth, created_date, status, data_scope_hours, daily_apply_limit, role
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), 'Active', 'all', 9999, ?)
      ON CONFLICT(email) DO UPDATE SET password_hash = excluded.password_hash, status = 'Active', role = excluded.role;
    `);

    seedAdmin.run(
      "usr_admin_master",
      "System Administrator",
      "admin@talentpulse.com",
      "9876543210",
      "admin",
      adminHash,
      "Headquarters",
      "Master Administrator",
      "1990-01-01",
      "master_admin"
    );

    seedAdmin.run(
      "usr_admin_kokila",
      "Kokila",
      "kokilam653@gmail.com",
      "9876543210",
      "kokila_admin",
      adminHash,
      "Headquarters",
      "System Administrator",
      "1995-01-01",
      "system_admin"
    );
  } catch {}
}

// User types
export type PortalUser = {
  user_id: string;
  full_name: string;
  email: string;
  mobile_number: string | null;
  username: string;
  address: string | null;
  qualification: string | null;
  date_of_birth: string | null;
  created_date: string;
  status: "Active" | "Stopped";
  data_scope_hours: string;
  daily_apply_limit: number;
  college_name?: string | null;
  role?: string;
};

// 1. Verify Admin Code
export function verifyAdminCode(code: string): { valid: boolean; message: string } {
  if (!code || !code.trim()) {
    return { valid: false, message: "Admin Code is required." };
  }
  const db = getPortalDb();
  const normalized = code.trim().toUpperCase();
  const row = db.prepare("SELECT * FROM admin_codes WHERE UPPER(unique_admin_code) = ?").get(normalized) as any;

  if (!row) {
    return { valid: false, message: "Invalid Admin Code. Please check and try again." };
  }
  if (row.status === "Used") {
    return { valid: false, message: "This Admin Code has already been used." };
  }
  if (row.status === "Expired") {
    return { valid: false, message: "This Admin Code has expired." };
  }
  return { valid: true, message: "Admin Code verified successfully!" };
}

// 2. Register New User (Atomic with Admin Code mark-as-used & Supabase Cloud Storage)
export async function registerUser(params: {
  adminCode: string;
  fullName: string;
  email: string;
  mobileNumber?: string;
  username: string;
  password: string;
  address?: string;
  qualification?: string;
  dateOfBirth?: string;
  collegeName?: string;
}): Promise<{ success: boolean; user?: PortalUser; error?: string }> {
  const db = getPortalDb();

  // Validate Code first
  const codeCheck = verifyAdminCode(params.adminCode);
  if (!codeCheck.valid) {
    return { success: false, error: codeCheck.message };
  }

  const cleanUsername = params.username.trim().toLowerCase();
  const cleanEmail = params.email.trim().toLowerCase();
  const now = new Date().toISOString();

  // Read admin code properties from local DB or defaults
  const codeRow = db
    .prepare("SELECT code_id, COALESCE(data_scope_hours, 'all') as data_scope_hours, COALESCE(daily_apply_limit, 10) as daily_apply_limit, COALESCE(role, 'candidate') as role FROM admin_codes WHERE UPPER(unique_admin_code) = ?")
    .get(params.adminCode.trim().toUpperCase()) as any;

  const assignedRole = codeRow?.role || "candidate";
  const isAdmin = assignedRole === "system_admin" || assignedRole === "master_admin";
  const scopeHours = isAdmin ? "all" : (codeRow?.data_scope_hours || "all");
  const applyLimit = isAdmin ? 9999 : Number(codeRow?.daily_apply_limit ?? 10);
  const qualification = isAdmin
    ? (assignedRole === "master_admin" ? "Master Administrator" : "System Administrator")
    : (params.qualification?.trim() || null);

  let userId = `usr_${crypto.randomBytes(8).toString("hex")}`;
  const supabase = getSupabaseAdmin();

  // 1. Primary Save to Supabase Cloud Database (auth.users & portal_users)
  if (supabase) {
    try {
      const { data: supaResult, error: supaErr } = await supabase.auth.admin.createUser({
        email: cleanEmail,
        password: params.password,
        email_confirm: true,
        user_metadata: {
          full_name: params.fullName.trim(),
          username: cleanUsername,
          mobile_number: params.mobileNumber?.trim() || null,
          qualification,
          college_name: params.collegeName?.trim() || null,
          date_of_birth: params.dateOfBirth?.trim() || null,
          address: params.address?.trim() || null,
          role: assignedRole,
          status: "Active",
          data_scope_hours: scopeHours,
          daily_apply_limit: applyLimit,
          admin_code: params.adminCode.trim().toUpperCase(),
          is_hidden_from_dashboard: 0,
          created_date: now,
        },
      });

      if (supaErr) {
        if (
          supaErr.message.includes("already been registered") ||
          supaErr.message.includes("already registered") ||
          supaErr.message.includes("already exists")
        ) {
          return { success: false, error: "Email address is already registered in Supabase Cloud. Please sign in instead." };
        }
        return { success: false, error: supaErr.message };
      }

      if (supaResult?.user) {
        userId = supaResult.user.id;
        try {
          await supabase.from("portal_users").upsert({
            user_id: supaResult.user.id,
            full_name: params.fullName.trim(),
            username: cleanUsername,
            email: cleanEmail,
            mobile_number: params.mobileNumber?.trim() || null,
            qualification,
            college_name: params.collegeName?.trim() || null,
            date_of_birth: params.dateOfBirth?.trim() || null,
            address: params.address?.trim() || null,
            role: assignedRole,
            status: "Active",
            data_scope_hours: scopeHours,
            daily_apply_limit: applyLimit,
            admin_code: params.adminCode.trim().toUpperCase(),
            is_hidden_from_dashboard: 0,
            created_date: now,
          });
        } catch {}
      }
    } catch (err: any) {
      console.warn("[Supabase Cloud User Creation] Warning:", err);
    }
  }

  // 2. Also save to local SQLite cache
  try {
    const passwordHash = hashPassword(params.password);
    db.prepare(`
      INSERT OR REPLACE INTO users (
        user_id, full_name, email, mobile_number, username, password_hash,
        address, qualification, date_of_birth, created_date, status, data_scope_hours, daily_apply_limit, college_name, role, is_hidden_from_dashboard
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active', ?, ?, ?, ?, 0)
    `).run(
      userId,
      params.fullName.trim(),
      cleanEmail,
      params.mobileNumber?.trim() || null,
      cleanUsername,
      passwordHash,
      params.address?.trim() || null,
      qualification,
      params.dateOfBirth?.trim() || null,
      now,
      scopeHours,
      applyLimit,
      params.collegeName?.trim() || null,
      assignedRole
    );

    if (codeRow?.code_id) {
      db.prepare(`
        UPDATE admin_codes
        SET status = 'Used', used_by_user_id = ?
        WHERE code_id = ?
      `).run(userId, codeRow.code_id);
    }
  } catch {}

  const createdUser: PortalUser = {
    user_id: userId,
    full_name: params.fullName.trim(),
    email: cleanEmail,
    mobile_number: params.mobileNumber?.trim() || null,
    username: cleanUsername,
    address: params.address?.trim() || null,
    qualification,
    date_of_birth: params.dateOfBirth?.trim() || null,
    created_date: now,
    status: "Active",
    data_scope_hours: scopeHours,
    daily_apply_limit: applyLimit,
    college_name: params.collegeName?.trim() || null,
    role: assignedRole,
  };

  return { success: true, user: createdUser };
}

// 3. Authenticate User Login (Supabase Cloud Primary with local fallback)
export async function authenticateUser(
  identifier: string,
  password: string
): Promise<{ success: boolean; user?: PortalUser; error?: string }> {
  if (!identifier || !password) {
    return { success: false, error: "Please enter your username/email and password." };
  }
  const cleanId = identifier.trim().toLowerCase();
  const supabase = getSupabaseAdmin();

  if (supabase) {
    try {
      let targetEmail = cleanId;

      // If user typed username instead of email, find their email in Supabase
      if (!cleanId.includes("@")) {
        const { data: userList } = await supabase.auth.admin.listUsers({ perPage: 1000 });
        const matched = userList?.users?.find(
          (u) =>
            u.user_metadata?.username?.toLowerCase() === cleanId ||
            u.email?.toLowerCase().startsWith(cleanId + "@")
        );
        if (matched?.email) {
          targetEmail = matched.email.toLowerCase();
        } else {
          const db = getPortalDb();
          const localUser = db.prepare("SELECT email FROM users WHERE LOWER(username) = ?").get(cleanId) as any;
          if (localUser?.email) {
            targetEmail = localUser.email.toLowerCase();
          }
        }
      }

      // 1. Authenticate against Supabase Cloud Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: targetEmail,
        password: password,
      });

      if (!authError && authData?.user) {
        const supaUser = authData.user;
        const meta = supaUser.user_metadata || {};
        const isAdmin =
          meta.role === "master_admin" ||
          meta.role === "system_admin" ||
          meta.role === "admin" ||
          supaUser.email === "admin@talentpulse.com" ||
          supaUser.email === "kokilam653@gmail.com";

        if (meta.status === "Stopped") {
          return {
            success: false,
            error: isAdmin
              ? "Your administrator account access has been revoked."
              : "Your candidate account access has been stopped by the administrator.",
          };
        }

        const effectiveRole =
          meta.role ||
          (supaUser.email === "admin@talentpulse.com" ? "master_admin" : isAdmin ? "system_admin" : "candidate");

        const portalUser: PortalUser = {
          user_id: supaUser.id,
          full_name: meta.full_name || supaUser.email?.split("@")[0] || "User",
          email: supaUser.email!,
          mobile_number: meta.mobile_number || null,
          username: meta.username || cleanId,
          address: meta.address || null,
          qualification: meta.qualification || null,
          date_of_birth: meta.date_of_birth || null,
          created_date: meta.created_date || supaUser.created_at,
          status: meta.status || "Active",
          data_scope_hours: meta.data_scope_hours || "all",
          daily_apply_limit: Number(meta.daily_apply_limit ?? (isAdmin ? 9999 : 10)),
          college_name: meta.college_name || null,
          role: effectiveRole,
        };

        // Cache into local SQLite
        try {
          const db = getPortalDb();
          db.prepare(`
            INSERT OR REPLACE INTO users (
              user_id, full_name, email, mobile_number, username, password_hash,
              address, qualification, date_of_birth, created_date, status, data_scope_hours, daily_apply_limit, college_name, role
            ) VALUES (?, ?, ?, ?, ?, '', ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            portalUser.user_id,
            portalUser.full_name,
            portalUser.email,
            portalUser.mobile_number || null,
            portalUser.username,
            portalUser.address || null,
            portalUser.qualification || null,
            portalUser.date_of_birth || null,
            portalUser.created_date,
            portalUser.status,
            portalUser.data_scope_hours,
            portalUser.daily_apply_limit,
            portalUser.college_name || null,
            portalUser.role || "candidate"
          );
        } catch {}

        return { success: true, user: portalUser };
      }
    } catch (e) {
      console.warn("[Supabase Auth] Fallback to local auth:", e);
    }
  }

  // 2. Fallback to local SQLite auth
  const db = getPortalDb();
  const userRow = db
    .prepare("SELECT * FROM users WHERE LOWER(username) = ? OR LOWER(email) = ?")
    .get(cleanId, cleanId) as any;

  if (!userRow) {
    return { success: false, error: "Invalid username or password." };
  }

  const isValid = verifyPassword(password, userRow.password_hash);
  if (!isValid) {
    return { success: false, error: "Invalid username or password." };
  }

  const isAdmin =
    userRow.role === "master_admin" ||
    userRow.role === "system_admin" ||
    userRow.role === "admin" ||
    userRow.email === "admin@talentpulse.com" ||
    userRow.username === "admin" ||
    userRow.email === "kokilam653@gmail.com" ||
    String(userRow.user_id || "").startsWith("usr_admin");

  if (userRow.status === "Stopped") {
    return {
      success: false,
      error: isAdmin
        ? "Your administrator account access has been revoked. Please contact the Master Administrator."
        : "Your candidate account access has been stopped by the administrator. Please contact support.",
    };
  }

  return { success: true, user: mapRowToPortalUser(userRow) };
}

function mapRowToPortalUser(row: any): PortalUser {
  const isAdmin =
    row.role === "master_admin" ||
    row.role === "system_admin" ||
    row.role === "admin" ||
    row.email === "admin@talentpulse.com" ||
    row.username === "admin" ||
    row.email === "kokilam653@gmail.com" ||
    String(row.user_id || "").startsWith("usr_admin");

  const effectiveRole =
    row.role ||
    (row.email === "admin@talentpulse.com" ? "master_admin" : isAdmin ? "system_admin" : "candidate");

  return {
    user_id: row.user_id,
    full_name: row.full_name,
    email: row.email,
    mobile_number: row.mobile_number || null,
    username: row.username,
    address: row.address || null,
    qualification: row.qualification || null,
    date_of_birth: row.date_of_birth || null,
    created_date: row.created_date || new Date().toISOString(),
    status: row.status || "Active",
    data_scope_hours: row.data_scope_hours || "all",
    daily_apply_limit: Number(row.daily_apply_limit ?? 10),
    college_name: row.college_name || null,
    role: effectiveRole,
  };
}

// 4. Session Management
const PORTAL_SESSION_SECRET =
  process.env.PORTAL_SESSION_SECRET ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "talentpulse_secure_session_key_2026_fixed";

export function createPortalSession(input: PortalUser | string): string {
  const db = getPortalDb();
  const now = new Date();
  const expires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const expiresMs = expires.getTime();

  let user: PortalUser | null = null;
  if (typeof input === "string") {
    try {
      const row = db.prepare("SELECT * FROM users WHERE user_id = ?").get(input) as any;
      if (row) {
        user = mapRowToPortalUser(row);
      }
    } catch {}
  } else {
    user = input;
  }

  const userId = user?.user_id || (typeof input === "string" ? input : "usr_unknown");

  // Create signed token with self-contained identity
  const claims = {
    uid: userId,
    name: user?.full_name || "",
    email: user?.email || "",
    user: user?.username || "",
    role: user?.role || "candidate",
    st: user?.status || "Active",
    sc: user?.data_scope_hours || "all",
    lim: user?.daily_apply_limit ?? 10,
    q: user?.qualification || "",
    col: user?.college_name || "",
    exp: expiresMs,
  };

  const payloadStr = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const hmac = crypto.createHmac("sha256", PORTAL_SESSION_SECRET).update(payloadStr).digest("hex");
  const token = `tp_${payloadStr}.${hmac}`;

  try {
    db.prepare(`
      INSERT OR REPLACE INTO portal_sessions (token, user_id, created_at, expires_at)
      VALUES (?, ?, ?, ?)
    `).run(token, userId, now.toISOString(), expires.toISOString());
  } catch {}

  return token;
}

export function getUserBySessionToken(token: string): PortalUser | null {
  if (!token) return null;
  const db = getPortalDb();
  const now = new Date().toISOString();

  // 1. Check self-contained signed token (tp_<payload>.<hmac>)
  if (token.startsWith("tp_")) {
    const raw = token.slice(3);
    const dotIndex = raw.indexOf(".");
    if (dotIndex > 0) {
      const payloadStr = raw.slice(0, dotIndex);
      const sig = raw.slice(dotIndex + 1);
      const expectedSig = crypto
        .createHmac("sha256", PORTAL_SESSION_SECRET)
        .update(payloadStr)
        .digest("hex");

      if (sig === expectedSig) {
        try {
          const claims = JSON.parse(Buffer.from(payloadStr, "base64url").toString("utf-8"));
          if (claims.exp && Date.now() <= claims.exp) {
            // Check local DB if user was modified or stopped
            let row: any = null;
            try {
              row = db.prepare("SELECT * FROM users WHERE user_id = ?").get(claims.uid) as any;
            } catch {}

            if (row) {
              if (row.status === "Stopped") return null;
              return mapRowToPortalUser(row);
            }

            // User not in this lambda's local SQLite yet; check claims status
            if (claims.st === "Stopped") return null;

            // Cache/insert into this lambda's SQLite so subsequent queries/FKs succeed
            try {
              db.prepare(`
                INSERT OR IGNORE INTO users (
                  user_id, full_name, email, mobile_number, username, password_hash,
                  address, qualification, date_of_birth, created_date, status, data_scope_hours, daily_apply_limit, college_name, role
                ) VALUES (?, ?, ?, null, ?, '', null, ?, null, datetime('now'), ?, ?, ?, ?, ?)
              `).run(
                claims.uid,
                claims.name || claims.user || "User",
                claims.email || `${claims.user}@candidate.portal`,
                claims.user || claims.uid,
                claims.q || null,
                claims.st || "Active",
                claims.sc || "all",
                Number(claims.lim ?? 10),
                claims.col || null,
                claims.role || "candidate"
              );
            } catch {}

            const isAdmin =
              claims.role === "master_admin" ||
              claims.role === "system_admin" ||
              claims.role === "admin" ||
              claims.email === "admin@talentpulse.com" ||
              claims.email === "kokilam653@gmail.com";

            return {
              user_id: claims.uid,
              full_name: claims.name || claims.user,
              email: claims.email,
              mobile_number: null,
              username: claims.user,
              address: null,
              qualification: claims.q || null,
              date_of_birth: null,
              created_date: new Date().toISOString(),
              status: (claims.st as any) || "Active",
              data_scope_hours: claims.sc || "all",
              daily_apply_limit: Number(claims.lim ?? 10),
              college_name: claims.col || null,
              role: claims.role || (isAdmin ? "system_admin" : "candidate"),
            };
          }
        } catch {}
      }
    }
  }

  // 2. Database session lookup fallback
  let row: any = null;
  try {
    row = db
      .prepare(`
        SELECT u.* FROM portal_sessions s
        JOIN users u ON s.user_id = u.user_id
        WHERE s.token = ? AND s.expires_at > ?
      `)
      .get(token, now) as any;
  } catch {}

  // 3. Fallback for legacy format (userId.expiresMs.hmac)
  if (!row) {
    const parts = token.split(".");
    if (parts.length === 3) {
      const [userId, expiresMsStr, sig] = parts;
      const expiresMs = Number(expiresMsStr);
      if (!isNaN(expiresMs) && Date.now() <= expiresMs) {
        const expectedSig = crypto
          .createHmac("sha256", PORTAL_SESSION_SECRET)
          .update(`${userId}.${expiresMsStr}`)
          .digest("hex");
        if (sig === expectedSig) {
          try {
            row = db.prepare("SELECT * FROM users WHERE user_id = ?").get(userId) as any;
          } catch {}
        }
      }
    }
  }

  if (!row) return null;
  if (row.status === "Stopped") {
    destroySession(token);
    return null;
  }

  return mapRowToPortalUser(row);
}

export function destroySession(token: string): void {
  if (!token) return;
  const db = getPortalDb();
  db.prepare("DELETE FROM portal_sessions WHERE token = ?").run(token);
}

// 5. Job Applications
export function applyToJob(userId: string, jobId: string, notes?: string): { success: boolean; error?: string; application?: any } {
  if (!userId || !jobId) {
    return { success: false, error: "Invalid user or job identifier." };
  }
  const db = getPortalDb();

  // Check user status and daily application limit
  const userRow = db.prepare("SELECT daily_apply_limit, status FROM users WHERE user_id = ?").get(userId) as any;
  if (!userRow) {
    return { success: false, error: "Candidate user not found." };
  }
  if (userRow.status === "Stopped") {
    return { success: false, error: "Your candidate account access has been stopped by the administrator." };
  }

  const limit = userRow.daily_apply_limit !== undefined && userRow.daily_apply_limit !== null ? Number(userRow.daily_apply_limit) : 10;
  if (limit > 0) {
    const todayCount = getUserTodayAppliedCount(userId);
    if (todayCount >= limit) {
      return {
        success: false,
        error: `Daily application limit reached (${limit}/${limit} jobs applied today). Verified Job Openings are locked until tomorrow.`,
      };
    }
  }

  // Check duplicate
  const existing = db
    .prepare("SELECT application_id FROM job_applications WHERE user_id = ? AND job_id = ?")
    .get(userId, jobId);

  if (existing) {
    return { success: false, error: "You have already applied for this job." };
  }

  const appId = `app_${crypto.randomBytes(8).toString("hex")}`;
  const now = new Date().toISOString();

  try {
    db.prepare(`
      INSERT INTO job_applications (application_id, user_id, job_id, application_date, application_status, notes)
      VALUES (?, ?, ?, ?, 'Submitted', ?)
    `).run(appId, userId, jobId, now, notes || null);

    return {
      success: true,
      application: {
        application_id: appId,
        user_id: userId,
        job_id: jobId,
        application_date: now,
        application_status: "Submitted",
      },
    };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to submit job application." };
  }
}

export function getUserApplications(userId: string): any[] {
  if (!userId) return [];
  const db = getPortalDb();
  return db
    .prepare(`
      SELECT application_id, user_id, job_id, application_date, application_status, notes
      FROM job_applications
      WHERE user_id = ?
      ORDER BY application_date DESC
    `)
    .all(userId) as any[];
}

export function getUserAppliedJobIds(userId: string): string[] {
  if (!userId) return [];
  const db = getPortalDb();
  const rows = db
    .prepare("SELECT job_id FROM job_applications WHERE user_id = ?")
    .all(userId) as any[];
  return rows.map((r) => r.job_id);
}

export function getUserAppliedCount(userId: string): number {
  if (!userId) return 0;
  const db = getPortalDb();
  const row = db
    .prepare("SELECT COUNT(*) as count FROM job_applications WHERE user_id = ?")
    .get(userId) as any;
  return row?.count || 0;
}

export function getUserTodayAppliedCount(userId: string): number {
  if (!userId) return 0;
  const db = getPortalDb();
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const row = db
    .prepare("SELECT COUNT(*) as count FROM job_applications WHERE user_id = ? AND application_date >= ?")
    .get(userId, startOfDay) as any;
  return row?.count || 0;
}

// 6. Admin Code Generation & Listing (for Admin/Recruiter visibility)
export function listAdminCodes(): any[] {
  const db = getPortalDb();
  return db
    .prepare(`
      SELECT 
        c.code_id,
        c.unique_admin_code,
        c.status,
        c.created_date,
        c.used_by_user_id,
        COALESCE(c.data_scope_hours, 'all') as data_scope_hours,
        COALESCE(c.daily_apply_limit, 10) as daily_apply_limit,
        u.full_name as used_by_name,
        u.username as used_by_username
      FROM admin_codes c
      LEFT JOIN users u ON c.used_by_user_id = u.user_id
      ORDER BY c.created_date DESC
    `)
    .all() as any[];
}

export function generateAdminCode(customPrefix = "ADM-2026", dataScopeHours = "all", dailyApplyLimit = 10, role = "candidate"): string {
  const db = getPortalDb();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const code = `${customPrefix}-${randomSuffix}`;
  const id = `code_${crypto.randomBytes(6).toString("hex")}`;
  const now = new Date().toISOString();
  const scope = role === "candidate" ? (dataScopeHours || "all").trim() : "all";
  const limit = role === "candidate" ? Math.max(0, Number(dailyApplyLimit ?? 10)) : 9999;

  db.prepare(`
    INSERT INTO admin_codes (code_id, unique_admin_code, status, created_date, data_scope_hours, daily_apply_limit, role)
    VALUES (?, ?, 'Unused', ?, ?, ?, ?)
  `).run(id, code, now, scope, limit, role);

  return code;
}

// 7. System Settings & Diagnostics
export function getSystemSettings(): Record<string, string> {
  const db = getPortalDb();
  const rows = db.prepare("SELECT setting_key, setting_value FROM system_settings").all() as any[];
  const result: Record<string, string> = {};
  for (const row of rows) {
    result[row.setting_key] = row.setting_value;
  }
  return result;
}

export function updateSystemSettings(settings: Record<string, string>): void {
  const db = getPortalDb();
  const upsert = db.prepare(`
    INSERT INTO system_settings (setting_key, setting_value, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(setting_key) DO UPDATE SET
      setting_value = excluded.setting_value,
      updated_at = excluded.updated_at
  `);
  const now = new Date().toISOString();
  for (const [key, value] of Object.entries(settings)) {
    upsert.run(key, String(value), now);
  }
}

export async function getSystemMetrics(): Promise<{
  totalUsers: number;
  activeUsers: number;
  stoppedUsers: number;
  totalApplications: number;
  totalCodes: number;
  unusedCodes: number;
  usedCodes: number;
}> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      const { data } = await supabase.auth.admin.listUsers({ perPage: 1000 });
      if (data?.users) {
        const visible = data.users.filter(
          (u) => !u.user_metadata?.is_hidden_from_dashboard
        );
        const active = visible.filter(
          (u) => (u.user_metadata?.status || "Active") !== "Stopped"
        );
        const stopped = visible.filter(
          (u) => u.user_metadata?.status === "Stopped"
        );

        const db = getPortalDb();
        const appCount = (db.prepare("SELECT COUNT(*) as count FROM job_applications").get() as any)?.count || 0;
        const codesCount = (db.prepare("SELECT COUNT(*) as count FROM admin_codes").get() as any)?.count || 0;
        const unusedCount = (db.prepare("SELECT COUNT(*) as count FROM admin_codes WHERE status = 'Unused'").get() as any)?.count || 0;
        const usedCount = (db.prepare("SELECT COUNT(*) as count FROM admin_codes WHERE status = 'Used'").get() as any)?.count || 0;

        return {
          totalUsers: visible.length,
          activeUsers: active.length,
          stoppedUsers: stopped.length,
          totalApplications: appCount,
          totalCodes: codesCount,
          unusedCodes: unusedCount,
          usedCodes: usedCount,
        };
      }
    } catch {}
  }

  const db = getPortalDb();
  const usersCount = (db.prepare("SELECT COUNT(*) as count FROM users WHERE COALESCE(is_hidden_from_dashboard, 0) = 0").get() as any)?.count || 0;
  const activeCount = (db.prepare("SELECT COUNT(*) as count FROM users WHERE COALESCE(is_hidden_from_dashboard, 0) = 0 AND status != 'Stopped'").get() as any)?.count || 0;
  const stoppedCount = (db.prepare("SELECT COUNT(*) as count FROM users WHERE COALESCE(is_hidden_from_dashboard, 0) = 0 AND status = 'Stopped'").get() as any)?.count || 0;
  const appCount = (db.prepare("SELECT COUNT(*) as count FROM job_applications").get() as any)?.count || 0;
  const codesCount = (db.prepare("SELECT COUNT(*) as count FROM admin_codes").get() as any)?.count || 0;
  const unusedCount = (db.prepare("SELECT COUNT(*) as count FROM admin_codes WHERE status = 'Unused'").get() as any)?.count || 0;
  const usedCount = (db.prepare("SELECT COUNT(*) as count FROM admin_codes WHERE status = 'Used'").get() as any)?.count || 0;

  return {
    totalUsers: usersCount,
    activeUsers: activeCount,
    stoppedUsers: stoppedCount,
    totalApplications: appCount,
    totalCodes: codesCount,
    unusedCodes: unusedCount,
    usedCodes: usedCount,
  };
}

// 8. Registered Candidates Directory (Supabase Cloud Live User Directory)
export async function listRegisteredUsers(): Promise<any[]> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
      if (!error && data?.users) {
        const usersList: any[] = [];
        for (const u of data.users) {
          const meta = u.user_metadata || {};
          if (meta.is_hidden_from_dashboard === 1 || meta.is_hidden_from_dashboard === true) {
            continue;
          }

          const isAdmin =
            meta.role === "master_admin" ||
            meta.role === "system_admin" ||
            meta.role === "admin" ||
            u.email === "admin@talentpulse.com" ||
            u.email === "kokilam653@gmail.com";

          const effectiveRole =
            meta.role ||
            (u.email === "admin@talentpulse.com" ? "master_admin" : isAdmin ? "system_admin" : "candidate");

          usersList.push({
            user_id: u.id,
            full_name: meta.full_name || u.email?.split("@")[0] || "User",
            email: u.email,
            mobile_number: meta.mobile_number || null,
            username: meta.username || u.email?.split("@")[0] || u.id,
            address: meta.address || null,
            qualification: meta.qualification || null,
            college_name: meta.college_name || null,
            date_of_birth: meta.date_of_birth || null,
            created_date: meta.created_date || u.created_at,
            status: meta.status || "Active",
            data_scope_hours: meta.data_scope_hours || "all",
            daily_apply_limit: Number(meta.daily_apply_limit ?? (isAdmin ? 9999 : 10)),
            role: effectiveRole,
            used_admin_code: meta.admin_code || null,
            total_applications: 0,
            today_applications: 0,
          });
        }

        usersList.sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime());
        return usersList;
      }
    } catch (e) {
      console.warn("[Supabase listUsers] Fallback to local SQLite:", e);
    }
  }

  const db = getPortalDb();
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

  return db
    .prepare(`
      SELECT 
        u.user_id,
        u.full_name,
        u.email,
        u.mobile_number,
        u.username,
        u.address,
        u.qualification,
        u.college_name,
        u.date_of_birth,
        u.created_date,
        COALESCE(u.status, 'Active') as status,
        COALESCE(u.data_scope_hours, 'all') as data_scope_hours,
        COALESCE(u.daily_apply_limit, 10) as daily_apply_limit,
        COALESCE(u.role, CASE WHEN u.email = 'admin@talentpulse.com' THEN 'master_admin' WHEN u.email = 'kokilam653@gmail.com' THEN 'system_admin' ELSE 'candidate' END) as role,
        c.unique_admin_code as used_admin_code,
        (SELECT COUNT(*) FROM job_applications a WHERE a.user_id = u.user_id) as total_applications,
        (SELECT COUNT(*) FROM job_applications a WHERE a.user_id = u.user_id AND a.application_date >= ?) as today_applications
      FROM users u
      LEFT JOIN admin_codes c ON c.used_by_user_id = u.user_id
      WHERE COALESCE(u.is_hidden_from_dashboard, 0) = 0
      ORDER BY u.created_date DESC
    `)
    .all(startOfDay) as any[];
}

// 9. Candidate Access Governance: Stop & Edit (Supabase Cloud + local sync)
export async function toggleUserAccess(userId: string, newStatus: "Active" | "Stopped"): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      const { data: supaUser } = await supabase.auth.admin.getUserById(userId);
      if (supaUser?.user) {
        if (supaUser.user.email === "admin@talentpulse.com" || supaUser.user.user_metadata?.role === "master_admin") {
          return { success: false, error: "Master Root Administrator cannot be stopped." };
        }
        await supabase.auth.admin.updateUserById(userId, {
          user_metadata: {
            ...supaUser.user.user_metadata,
            status: newStatus,
          },
        });
      }
      try {
        await supabase.from("portal_users").update({ status: newStatus }).eq("user_id", userId);
      } catch {}
    }

    const db = getPortalDb();
    const user = db.prepare("SELECT user_id, email, role FROM users WHERE user_id = ?").get(userId) as any;
    if (user && (user.email === "admin@talentpulse.com" || user.role === "master_admin") && newStatus === "Stopped") {
      return { success: false, error: "Master Root Administrator cannot be stopped." };
    }
    db.prepare("UPDATE users SET status = ? WHERE user_id = ?").run(newStatus, userId);
    if (newStatus === "Stopped") {
      db.prepare("DELETE FROM portal_sessions WHERE user_id = ?").run(userId);
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to toggle user access." };
  }
}

export async function updateCandidateUser(
  userId: string,
  data: {
    fullName: string;
    email: string;
    mobileNumber?: string | null;
    qualification?: string | null;
    collegeName?: string | null;
    address?: string | null;
    status?: "Active" | "Stopped";
    dataScopeHours?: string | null;
    dailyApplyLimit?: number | null;
    role?: string | null;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseAdmin();
    const cleanEmail = (data.email || "").trim().toLowerCase();

    if (supabase) {
      const { data: supaUser } = await supabase.auth.admin.getUserById(userId);
      if (supaUser?.user) {
        const currentMeta = supaUser.user.user_metadata || {};
        const assignedRole = data.role ? String(data.role).trim() : (currentMeta.role || "candidate");
        const isAdmin = assignedRole === "system_admin" || assignedRole === "master_admin";
        const scopeHours = isAdmin ? "all" : (data.dataScopeHours ? String(data.dataScopeHours).trim() : currentMeta.data_scope_hours || "all");
        const applyLimit = isAdmin ? 9999 : (data.dailyApplyLimit !== undefined && data.dailyApplyLimit !== null ? Number(data.dailyApplyLimit) : (currentMeta.daily_apply_limit ?? 10));

        await supabase.auth.admin.updateUserById(userId, {
          email: cleanEmail,
          user_metadata: {
            ...currentMeta,
            full_name: (data.fullName || "").trim(),
            mobile_number: data.mobileNumber ? String(data.mobileNumber).trim() : currentMeta.mobile_number,
            qualification: data.qualification ? String(data.qualification).trim() : currentMeta.qualification,
            college_name: data.collegeName ? String(data.collegeName).trim() : currentMeta.college_name,
            address: data.address ? String(data.address).trim() : currentMeta.address,
            status: data.status || currentMeta.status || "Active",
            role: assignedRole,
            data_scope_hours: scopeHours,
            daily_apply_limit: applyLimit,
          },
        });
      }
      try {
        await supabase.from("portal_users").update({
          full_name: (data.fullName || "").trim(),
          email: cleanEmail,
          mobile_number: data.mobileNumber ? String(data.mobileNumber).trim() : null,
          qualification: data.qualification ? String(data.qualification).trim() : null,
          college_name: data.collegeName ? String(data.collegeName).trim() : null,
          address: data.address ? String(data.address).trim() : null,
          status: data.status || "Active",
          role: data.role || "candidate",
        }).eq("user_id", userId);
      } catch {}
    }

    const db = getPortalDb();
    const assignedRole = data.role ? String(data.role).trim() : null;
    const isAdmin = assignedRole === "system_admin" || assignedRole === "master_admin";
    const scopeHours = isAdmin ? "all" : (data.dataScopeHours ? String(data.dataScopeHours).trim() : null);
    const applyLimit = isAdmin ? 9999 : (data.dailyApplyLimit !== undefined && data.dailyApplyLimit !== null ? Number(data.dailyApplyLimit) : null);

    db.prepare(`
      UPDATE users SET
        full_name = ?,
        email = ?,
        mobile_number = ?,
        qualification = ?,
        college_name = COALESCE(?, college_name),
        address = ?,
        status = COALESCE(?, status),
        data_scope_hours = COALESCE(?, data_scope_hours),
        daily_apply_limit = COALESCE(?, daily_apply_limit),
        role = COALESCE(?, role)
      WHERE user_id = ?
    `).run(
      (data.fullName || "").trim(),
      cleanEmail,
      data.mobileNumber ? String(data.mobileNumber).trim() : null,
      data.qualification ? String(data.qualification).trim() : null,
      data.collegeName ? String(data.collegeName).trim() : null,
      data.address ? String(data.address).trim() : null,
      data.status || null,
      scopeHours,
      applyLimit,
      assignedRole,
      userId
    );

    if (data.status === "Stopped") {
      db.prepare("DELETE FROM portal_sessions WHERE user_id = ?").run(userId);
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to update candidate user." };
  }
}

// 10. Hide candidate from dashboard view (Soft Delete in Supabase Cloud - Preserves all student data)
export async function hideUserFromDashboard(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      const { data: supaUser } = await supabase.auth.admin.getUserById(userId);
      if (supaUser?.user) {
        if (supaUser.user.email === "admin@talentpulse.com" || supaUser.user.user_metadata?.role === "master_admin") {
          return { success: false, error: "Master Root Administrator cannot be removed from dashboard." };
        }
        await supabase.auth.admin.updateUserById(userId, {
          user_metadata: {
            ...supaUser.user.user_metadata,
            is_hidden_from_dashboard: 1,
          },
        });
      }
      try {
        await supabase.from("portal_users").update({ is_hidden_from_dashboard: 1 }).eq("user_id", userId);
      } catch {}
    }

    const db = getPortalDb();
    const user = db.prepare("SELECT user_id, email, role FROM users WHERE user_id = ?").get(userId) as any;
    if (user && (user.email === "admin@talentpulse.com" || user.role === "master_admin")) {
      return { success: false, error: "Master Root Administrator cannot be removed from dashboard." };
    }
    db.prepare("UPDATE users SET is_hidden_from_dashboard = 1 WHERE user_id = ?").run(userId);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to remove user from dashboard view." };
  }
}
