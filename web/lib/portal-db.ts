import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import crypto from "node:crypto";
import fs from "node:fs";

const DATA_DIR = path.resolve(process.cwd(), "..", "Data");
const LOCAL_DATA_DIR = path.resolve(process.cwd(), "Data");

// Ensure Data directory exists
const activeDataDir = fs.existsSync(DATA_DIR) ? DATA_DIR : LOCAL_DATA_DIR;
if (!fs.existsSync(activeDataDir)) {
  fs.mkdirSync(activeDataDir, { recursive: true });
}

const DB_PATH = path.join(activeDataDir, "portal.db");

let dbInstance: DatabaseSync | null = null;

export function getPortalDb(): DatabaseSync {
  if (!dbInstance) {
    dbInstance = new DatabaseSync(DB_PATH);
    initDatabase(dbInstance);
  }
  return dbInstance;
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
      status TEXT NOT NULL DEFAULT 'Active'
    );
  `);

  // Migration for status column
  try {
    db.exec("ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'Active';");
  } catch {}

  // 2. Admin Codes Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_codes (
      code_id TEXT PRIMARY KEY,
      unique_admin_code TEXT UNIQUE NOT NULL,
      status TEXT NOT NULL DEFAULT 'Unused', -- 'Unused', 'Used', 'Expired'
      created_date TEXT NOT NULL,
      used_by_user_id TEXT,
      FOREIGN KEY(used_by_user_id) REFERENCES users(user_id)
    );
  `);

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
      INSERT INTO admin_codes (code_id, unique_admin_code, status, created_date)
      VALUES (?, ?, 'Unused', ?)
    `);
    const now = new Date().toISOString();
    for (const code of defaultCodes) {
      insertCode.run(`code_${crypto.randomBytes(6).toString("hex")}`, code, now);
    }
  }
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

// 2. Register New User (Atomic with Admin Code mark-as-used)
export function registerUser(params: {
  adminCode: string;
  fullName: string;
  email: string;
  mobileNumber?: string;
  username: string;
  password: string;
  address?: string;
  qualification?: string;
  dateOfBirth?: string;
}): { success: boolean; user?: PortalUser; error?: string } {
  const db = getPortalDb();

  // Validate Code first
  const codeCheck = verifyAdminCode(params.adminCode);
  if (!codeCheck.valid) {
    return { success: false, error: codeCheck.message };
  }

  // Check username uniqueness
  const cleanUsername = params.username.trim().toLowerCase();
  const existingUsername = db.prepare("SELECT user_id FROM users WHERE LOWER(username) = ?").get(cleanUsername);
  if (existingUsername) {
    return { success: false, error: "Username is already registered. Please choose another." };
  }

  // Check email uniqueness
  const cleanEmail = params.email.trim().toLowerCase();
  const existingEmail = db.prepare("SELECT user_id FROM users WHERE LOWER(email) = ?").get(cleanEmail);
  if (existingEmail) {
    return { success: false, error: "Email address is already registered. Please log in instead." };
  }

  const userId = `usr_${crypto.randomBytes(8).toString("hex")}`;
  const passwordHash = hashPassword(params.password);
  const now = new Date().toISOString();

  // Run as atomic transaction
  try {
    db.exec("BEGIN TRANSACTION;");

    // Double check admin code inside transaction to prevent race conditions
    const codeRow = db
      .prepare("SELECT code_id FROM admin_codes WHERE UPPER(unique_admin_code) = ? AND status = 'Unused'")
      .get(params.adminCode.trim().toUpperCase()) as any;

    if (!codeRow) {
      db.exec("ROLLBACK;");
      return { success: false, error: "Admin Code was just used by another session. Please request a new code." };
    }

    // Insert user
    db.prepare(`
      INSERT INTO users (
        user_id, full_name, email, mobile_number, username, password_hash,
        address, qualification, date_of_birth, created_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      params.fullName.trim(),
      cleanEmail,
      params.mobileNumber?.trim() || null,
      cleanUsername,
      passwordHash,
      params.address?.trim() || null,
      params.qualification?.trim() || null,
      params.dateOfBirth?.trim() || null,
      now
    );

    // Mark admin code as used
    db.prepare(`
      UPDATE admin_codes
      SET status = 'Used', used_by_user_id = ?
      WHERE code_id = ?
    `).run(userId, codeRow.code_id);

    db.exec("COMMIT;");

    const createdUser: PortalUser = {
      user_id: userId,
      full_name: params.fullName.trim(),
      email: cleanEmail,
      mobile_number: params.mobileNumber?.trim() || null,
      username: cleanUsername,
      address: params.address?.trim() || null,
      qualification: params.qualification?.trim() || null,
      date_of_birth: params.dateOfBirth?.trim() || null,
      created_date: now,
      status: "Active",
    };

    return { success: true, user: createdUser };
  } catch (err: any) {
    try {
      db.exec("ROLLBACK;");
    } catch {}
    return { success: false, error: err?.message || "Failed to create user account." };
  }
}

// 3. Authenticate User Login
export function authenticateUser(identifier: string, password: string): { success: boolean; user?: PortalUser; error?: string } {
  if (!identifier || !password) {
    return { success: false, error: "Please enter your username/email and password." };
  }
  const db = getPortalDb();
  const cleanId = identifier.trim().toLowerCase();

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

  if (userRow.status === "Stopped") {
    return {
      success: false,
      error: "Your candidate account access has been stopped by the administrator. Please contact support.",
    };
  }

  const user: PortalUser = {
    user_id: userRow.user_id,
    full_name: userRow.full_name,
    email: userRow.email,
    mobile_number: userRow.mobile_number,
    username: userRow.username,
    address: userRow.address,
    qualification: userRow.qualification,
    date_of_birth: userRow.date_of_birth,
    created_date: userRow.created_date,
    status: userRow.status || "Active",
  };

  return { success: true, user };
}

// 4. Session Management
export function createPortalSession(userId: string): string {
  const db = getPortalDb();
  const token = crypto.randomBytes(32).toString("hex");
  const now = new Date();
  const expires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

  db.prepare(`
    INSERT INTO portal_sessions (token, user_id, created_at, expires_at)
    VALUES (?, ?, ?, ?)
  `).run(token, userId, now.toISOString(), expires.toISOString());

  return token;
}

export function getUserBySessionToken(token: string): PortalUser | null {
  if (!token) return null;
  const db = getPortalDb();
  const now = new Date().toISOString();

  const row = db
    .prepare(`
      SELECT u.* FROM portal_sessions s
      JOIN users u ON s.user_id = u.user_id
      WHERE s.token = ? AND s.expires_at > ?
    `)
    .get(token, now) as any;

  if (!row) return null;

  if (row.status === "Stopped") {
    destroySession(token);
    return null;
  }

  return {
    user_id: row.user_id,
    full_name: row.full_name,
    email: row.email,
    mobile_number: row.mobile_number,
    username: row.username,
    address: row.address,
    qualification: row.qualification,
    date_of_birth: row.date_of_birth,
    created_date: row.created_date,
    status: row.status || "Active",
  };
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

// 6. Admin Code Generation & Listing (for Admin/Recruiter visibility)
export function listAdminCodes(): any[] {
  const db = getPortalDb();
  return db
    .prepare(`
      SELECT c.*, u.full_name as used_by_name, u.username as used_by_username
      FROM admin_codes c
      LEFT JOIN users u ON c.used_by_user_id = u.user_id
      ORDER BY c.created_date DESC
    `)
    .all() as any[];
}

export function generateAdminCode(customPrefix = "ADM-2026"): string {
  const db = getPortalDb();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const code = `${customPrefix}-${randomSuffix}`;
  const id = `code_${crypto.randomBytes(6).toString("hex")}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO admin_codes (code_id, unique_admin_code, status, created_date)
    VALUES (?, ?, 'Unused', ?)
  `).run(id, code, now);

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

export function getSystemMetrics(): {
  totalUsers: number;
  activeUsers: number;
  stoppedUsers: number;
  totalApplications: number;
  totalCodes: number;
  unusedCodes: number;
  usedCodes: number;
} {
  const db = getPortalDb();
  const usersCount = (db.prepare("SELECT COUNT(*) as count FROM users").get() as any)?.count || 0;
  const activeCount = (db.prepare("SELECT COUNT(*) as count FROM users WHERE status != 'Stopped'").get() as any)?.count || 0;
  const stoppedCount = (db.prepare("SELECT COUNT(*) as count FROM users WHERE status = 'Stopped'").get() as any)?.count || 0;
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

// 8. Registered Candidates Directory (Admin Live Visibility)
export function listRegisteredUsers(): any[] {
  const db = getPortalDb();
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
        u.date_of_birth,
        u.created_date,
        COALESCE(u.status, 'Active') as status,
        c.unique_admin_code as used_admin_code,
        (SELECT COUNT(*) FROM job_applications a WHERE a.user_id = u.user_id) as total_applications
      FROM users u
      LEFT JOIN admin_codes c ON c.used_by_user_id = u.user_id
      ORDER BY u.created_date DESC
    `)
    .all() as any[];
}

// 9. Candidate Access Governance: Stop & Edit
export function toggleUserAccess(userId: string, newStatus: "Active" | "Stopped"): { success: boolean; error?: string } {
  const db = getPortalDb();
  db.prepare("UPDATE users SET status = ? WHERE user_id = ?").run(newStatus, userId);
  if (newStatus === "Stopped") {
    db.prepare("DELETE FROM portal_sessions WHERE user_id = ?").run(userId);
  }
  return { success: true };
}

export function updateCandidateUser(
  userId: string,
  data: {
    fullName: string;
    email: string;
    mobileNumber?: string;
    qualification?: string;
    address?: string;
    status?: "Active" | "Stopped";
  }
): { success: boolean; error?: string } {
  const db = getPortalDb();
  const cleanEmail = data.email.trim().toLowerCase();
  const existing = db
    .prepare("SELECT user_id FROM users WHERE LOWER(email) = ? AND user_id != ?")
    .get(cleanEmail, userId);

  if (existing) {
    return { success: false, error: "Email address is already in use by another account." };
  }

  db.prepare(`
    UPDATE users SET
      full_name = ?,
      email = ?,
      mobile_number = ?,
      qualification = ?,
      address = ?,
      status = COALESCE(?, status)
    WHERE user_id = ?
  `).run(
    data.fullName.trim(),
    cleanEmail,
    data.mobileNumber?.trim() || null,
    data.qualification?.trim() || null,
    data.address?.trim() || null,
    data.status || null,
    userId
  );

  if (data.status === "Stopped") {
    db.prepare("DELETE FROM portal_sessions WHERE user_id = ?").run(userId);
  }

  return { success: true };
}
