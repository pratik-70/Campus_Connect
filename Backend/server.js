const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const crypto = require("crypto");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const { Resend } = require("resend");
require("dotenv").config();

const {
  PORT = 4000,
  FRONTEND_ORIGIN = "http://127.0.0.1:5500,http://localhost:5500",
  JWT_SECRET,
  JWT_SIGNUP_PROOF_EXPIRY = "15m",
  OTP_EXPIRY_MINUTES = "10",
  OTP_PEPPER,
  REQUIRE_EMAIL_OTP = "false",
  DEV_ADMIN_KEY = "",
  RESEND_API_KEY,
  RESEND_FROM_EMAIL,
  RESEND_AUDIENCE_NAME = "Campus Connect"
} = process.env;

if (!JWT_SECRET || !OTP_PEPPER || !RESEND_API_KEY || !RESEND_FROM_EMAIL) {
  console.error("Missing required env vars. Check backend/.env.example");
  process.exit(1);
}

const resend = new Resend(RESEND_API_KEY);
const app = express();
const dbPath = path.join(__dirname, "auth.db");
const db = new sqlite3.Database(dbPath);
const allowedOrigins = String(FRONTEND_ORIGIN)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

function isLoopbackOrigin(origin) {
  try {
    const parsed = new URL(origin);
    const hostname = (parsed.hostname || "").toLowerCase();
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch (_error) {
    return false;
  }
}

app.use(express.json({ limit: "1mb" }));
app.use(
  cors({
    origin(origin, callback) {
      if (
        !origin ||
        origin === "null" ||
        allowedOrigins.includes(origin) ||
        isLoopbackOrigin(origin)
      ) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    methods: ["GET", "POST"],
    credentials: false
  })
);

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 250,
  standardHeaders: true,
  legacyHeaders: false
});

const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many OTP requests. Try again shortly." }
});

const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts. Please slow down." }
});

const adminLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many admin requests. Please slow down." }
});

app.use(globalLimiter);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) {
        reject(err);
        return;
      }
      resolve(this);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows || []);
    });
  });
}

function hashOtp(code) {
  return crypto.createHash("sha256").update(`${code}:${OTP_PEPPER}`).digest("hex");
}

function createOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function isValidEmail(email) {
  return /^\S+@\S+\.\S+$/.test(email || "");
}

function isValidUsername(username) {
  return /^[a-z0-9_]{4,16}$/.test(username || "");
}

function jsonError(res, status, message) {
  res.status(status).json({ message });
}

function constantTimeEqual(a, b) {
  const left = Buffer.from(String(a || ""));
  const right = Buffer.from(String(b || ""));
  if (left.length !== right.length) {
    return false;
  }
  return crypto.timingSafeEqual(left, right);
}

function getAdminKeyFromRequest(req) {
  const headerKey = String(req.headers["x-admin-key"] || "").trim();
  if (headerKey) {
    return headerKey;
  }

  const authHeader = String(req.headers.authorization || "");
  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }

  return "";
}

function requireDeveloper(req, res, next) {
  if (!String(DEV_ADMIN_KEY || "").trim()) {
    return jsonError(res, 503, "Admin access is not configured on this server.");
  }

  const provided = getAdminKeyFromRequest(req);
  if (!provided || !constantTimeEqual(provided, DEV_ADMIN_KEY)) {
    return jsonError(res, 403, "Developer access denied.");
  }

  return next();
}

function getSessionPayload(req) {
  const authHeader = String(req.headers.authorization || "");
  if (!authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return null;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (!payload || payload.scope !== "session") {
      return null;
    }
    return payload;
  } catch (_error) {
    return null;
  }
}

async function initializeDatabase() {
  await run(`
    CREATE TABLE IF NOT EXISTS otp_challenges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      code_hash TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      verified INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_type TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      reg_no TEXT NOT NULL,
      department TEXT NOT NULL,
      program_or_unit TEXT NOT NULL,
      year_or_designation TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      event_type TEXT NOT NULL,
      department TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      location TEXT NOT NULL,
      description TEXT NOT NULL,
      organizer_id INTEGER NOT NULL,
      created_by TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (organizer_id) REFERENCES users(id)
    )
  `);
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "campus-connect-auth-api" });
});

app.get("/api/debug/events", async (_req, res) => {
  try {
    const events = await all(`SELECT * FROM events`);
    return res.json({ count: events.length, events });
  } catch (error) {
    console.error("Debug events error:", error);
    return jsonError(res, 500, "Could not fetch debug events.");
  }
});

app.post("/api/events", authLimiter, async (req, res) => {
  try {
    const session = getSessionPayload(req);
    if (!session || !session.userId) {
      return jsonError(res, 401, "Unauthorized.");
    }

    const user = await get(
      `SELECT id, account_type, username FROM users WHERE id = ?`,
      [session.userId]
    );

    if (!user) {
      return jsonError(res, 401, "User not found.");
    }

    if (user.account_type !== "Organizer") {
      return jsonError(res, 403, "Only organizers can create events.");
    }

    const { title, eventType, department, date, time, location, description } = req.body;

    if (!title || !eventType || !department || !date || !time || !location || !description) {
      return jsonError(res, 400, "Missing required event fields.");
    }

    await run(
      `INSERT INTO events (title, event_type, department, date, time, location, description, organizer_id, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, eventType, department, date, time, location, description, user.id, user.username, Date.now()]
    );

    return res.status(201).json({ message: "Event created successfully." });
  } catch (error) {
    console.error("Create event error:", error);
    return jsonError(res, 500, "Could not create event right now.");
  }
});

app.get("/api/events", async (req, res) => {
  try {
    const { department = "", eventType = "" } = req.query;
    let sql = `SELECT id, title, event_type AS eventType, department, date, time, location, description, created_by AS createdBy, created_at AS createdAt FROM events`;
    const params = [];
    const conditions = [];

    if (department && department !== "All") {
      conditions.push(`department = ?`);
      params.push(department);
    }

    if (eventType && eventType !== "All") {
      conditions.push(`event_type = ?`);
      params.push(eventType);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(" AND ")}`;
    }

    sql += ` ORDER BY created_at DESC`;

    const events = await all(sql, params);
    console.log("Events fetched:", { count: events.length, filters: { department, eventType } });
    return res.json({ events });
  } catch (error) {
    console.error("List events error:", error);
    return jsonError(res, 500, "Could not fetch events right now.");
  }
});

app.delete("/api/events/:id", authLimiter, async (req, res) => {
  try {
    const session = getSessionPayload(req);
    if (!session || !session.userId) {
      return jsonError(res, 401, "Unauthorized.");
    }

    const user = await get(
      `SELECT id, account_type FROM users WHERE id = ?`,
      [session.userId]
    );

    if (!user || user.account_type !== "Organizer") {
      return jsonError(res, 403, "Only the organizer can delete this event.");
    }

    const eventId = Number(req.params.id);
    const event = await get(`SELECT organizer_id FROM events WHERE id = ?`, [eventId]);

    if (!event) {
      return jsonError(res, 404, "Event not found.");
    }

    if (event.organizer_id !== user.id) {
      return jsonError(res, 403, "You can only delete your own events.");
    }

    await run(`DELETE FROM events WHERE id = ?`, [eventId]);
    return res.json({ message: "Event deleted successfully." });
  } catch (error) {
    console.error("Delete event error:", error);
    return jsonError(res, 500, "Could not delete event right now.");
  }
});

app.get("/api/admin/users", adminLimiter, requireDeveloper, async (_req, res) => {
  try {
    const users = await all(
      `SELECT
        id,
        account_type AS accountType,
        first_name AS firstName,
        last_name AS lastName,
        reg_no AS regNo,
        department,
        program_or_unit AS programOrUnit,
        year_or_designation AS yearOrDesignation,
        email,
        username,
        created_at AS createdAt
       FROM users
       ORDER BY id DESC`
    );

    res.json({ count: users.length, users });
  } catch (error) {
    console.error("Admin list users error:", error);
    return jsonError(res, 500, "Could not fetch users right now.");
  }
});

app.post("/api/auth/otp/send", otpLimiter, async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    if (!isValidEmail(email)) {
      return jsonError(res, 400, "Please provide a valid email address.");
    }

    const code = createOtpCode();
    const codeHash = hashOtp(code);
    const now = Date.now();
    const expiresAt = now + Number(OTP_EXPIRY_MINUTES) * 60 * 1000;

    await run(
      `INSERT INTO otp_challenges (email, code_hash, expires_at, attempts, verified, created_at)
       VALUES (?, ?, ?, 0, 0, ?)`,
      [email, codeHash, expiresAt, now]
    );

    const sendResult = await resend.emails.send({
      from: RESEND_FROM_EMAIL,
      to: email,
      subject: `${RESEND_AUDIENCE_NAME} email verification code`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827">
          <h2 style="margin-bottom:8px">Verify Your Email</h2>
          <p>Your one-time verification code is:</p>
          <p style="font-size:28px;font-weight:700;letter-spacing:4px;margin:12px 0">${code}</p>
          <p>This code expires in ${OTP_EXPIRY_MINUTES} minutes.</p>
          <p>If you did not request this, you can ignore this email.</p>
        </div>
      `
    });

    if (sendResult && sendResult.error) {
      console.error("Resend provider error:", sendResult.error);
      return jsonError(
        res,
        502,
        sendResult.error.message || "Email provider rejected the message."
      );
    }

    return res.json({
      message: "Verification code sent.",
      providerMessageId: sendResult && sendResult.data ? sendResult.data.id : null
    });
  } catch (error) {
    console.error("OTP send error:", error);
    return jsonError(
      res,
      500,
      error && error.message ? error.message : "Could not send verification code right now."
    );
  }
});

app.post("/api/auth/otp/verify", authLimiter, async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const code = String(req.body.code || "").trim();

    if (!isValidEmail(email) || !/^\d{6}$/.test(code)) {
      return jsonError(res, 400, "Invalid email or verification code format.");
    }

    const now = Date.now();
    const challenge = await get(
      `SELECT * FROM otp_challenges
       WHERE email = ? AND verified = 0 AND expires_at > ?
       ORDER BY id DESC
       LIMIT 1`,
      [email, now]
    );

    if (!challenge) {
      return jsonError(res, 400, "No active verification challenge found.");
    }

    if (challenge.attempts >= 5) {
      return jsonError(res, 429, "Too many incorrect attempts. Request a new code.");
    }

    const incomingHash = hashOtp(code);
    if (incomingHash !== challenge.code_hash) {
      await run(`UPDATE otp_challenges SET attempts = attempts + 1 WHERE id = ?`, [challenge.id]);
      return jsonError(res, 400, "Incorrect verification code.");
    }

    await run(`UPDATE otp_challenges SET verified = 1 WHERE id = ?`, [challenge.id]);

    const signupProofToken = jwt.sign(
      {
        email,
        challengeId: challenge.id,
        scope: "signup-proof"
      },
      JWT_SECRET,
      { expiresIn: JWT_SIGNUP_PROOF_EXPIRY }
    );

    return res.json({ message: "Email verified.", signupProofToken });
  } catch (error) {
    console.error("OTP verify error:", error);
    return jsonError(res, 500, "Could not verify code right now.");
  }
});

app.post("/api/auth/register", authLimiter, async (req, res) => {
  try {
    const {
      signupProofToken,
      accountType,
      firstName,
      lastName,
      regNo,
      department,
      programOrUnit,
      yearOrDesignation,
      email,
      username,
      password
    } = req.body;

    const requireEmailOtp = String(REQUIRE_EMAIL_OTP).toLowerCase() === "true";

    const normalizedEmail = String(email || "").trim().toLowerCase();
    const normalizedUsername = String(username || "").trim().toLowerCase();

    if (requireEmailOtp) {
      if (!signupProofToken) {
        return jsonError(res, 400, "Missing signup proof token.");
      }

      const payload = jwt.verify(signupProofToken, JWT_SECRET);
      if (!payload || payload.scope !== "signup-proof") {
        return jsonError(res, 401, "Invalid signup proof token.");
      }

      if (payload.email !== normalizedEmail) {
        return jsonError(res, 400, "Email does not match verified email.");
      }
    }

    const allowedTypes = ["Student", "Organizer"];
    if (!allowedTypes.includes(accountType)) {
      return jsonError(res, 400, "Account type must be Student or Organizer.");
    }

    if (!isValidEmail(normalizedEmail)) {
      return jsonError(res, 400, "Invalid email.");
    }

    if (!isValidUsername(normalizedUsername)) {
      return jsonError(res, 400, "Invalid username format.");
    }

    if (!String(password || "").trim() || String(password).length < 8) {
      return jsonError(res, 400, "Password must be at least 8 characters.");
    }

    if (!firstName || !lastName || !regNo || !department || !programOrUnit || !yearOrDesignation) {
      return jsonError(res, 400, "Missing required profile fields.");
    }

    const existingByEmail = await get(`SELECT id FROM users WHERE email = ?`, [normalizedEmail]);
    if (existingByEmail) {
      return jsonError(res, 409, "An account with this email already exists.");
    }

    const existingByUsername = await get(`SELECT id FROM users WHERE username = ?`, [normalizedUsername]);
    if (existingByUsername) {
      return jsonError(res, 409, "This username is already taken.");
    }

    const passwordHash = await bcrypt.hash(String(password), 12);

    await run(
      `INSERT INTO users (
        account_type, first_name, last_name, reg_no, department,
        program_or_unit, year_or_designation, email, username, password_hash, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        accountType,
        String(firstName).trim(),
        String(lastName).trim(),
        String(regNo).trim(),
        String(department).trim(),
        String(programOrUnit).trim(),
        String(yearOrDesignation).trim(),
        normalizedEmail,
        normalizedUsername,
        passwordHash,
        Date.now()
      ]
    );

    const token = jwt.sign(
      {
        email: normalizedEmail,
        username: normalizedUsername,
        scope: "session"
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(201).json({ message: "Account created successfully.", token });
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return jsonError(res, 401, "Signup verification expired. Verify email again.");
    }

    console.error("Register error:", error);
    return jsonError(res, 500, "Could not create account right now.");
  }
});

app.post("/api/auth/signin", authLimiter, async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!isValidEmail(email) || !password) {
      return jsonError(res, 400, "Invalid sign-in credentials.");
    }

    const user = await get(`SELECT * FROM users WHERE email = ?`, [email]);
    if (!user) {
      return jsonError(res, 401, "Invalid sign-in credentials.");
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return jsonError(res, 401, "Invalid sign-in credentials.");
    }

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        username: user.username,
        scope: "session"
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      message: "Signed in successfully.",
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        accountType: user.account_type
      }
    });
  } catch (error) {
    console.error("Sign-in error:", error);
    return jsonError(res, 500, "Could not sign in right now.");
  }
});

app.get("/api/auth/me", async (req, res) => {
  try {
    const session = getSessionPayload(req);
    if (!session || !session.userId) {
      return jsonError(res, 401, "Unauthorized.");
    }

    const user = await get(
      `SELECT id, email, username, first_name, last_name, account_type
       FROM users
       WHERE id = ?`,
      [session.userId]
    );

    if (!user) {
      return jsonError(res, 401, "Session no longer valid.");
    }

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        accountType: user.account_type
      }
    });
  } catch (error) {
    console.error("Profile fetch error:", error);
    return jsonError(res, 500, "Could not fetch profile right now.");
  }
});

initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Auth API listening on http://127.0.0.1:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize database:", error);
    process.exit(1);
  });