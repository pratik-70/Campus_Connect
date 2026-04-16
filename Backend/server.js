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
  ADMIN_EMAIL = "",
  ADMIN_PASSWORD = "",
  RESEND_API_KEY,
  RESEND_FROM_EMAIL,
  RESEND_AUDIENCE_NAME = "Campus Connect"
} = process.env;

const emailOtpEnabled = String(REQUIRE_EMAIL_OTP).toLowerCase() === "true";

if (!JWT_SECRET || !OTP_PEPPER) {
  console.error("Missing required env vars. Check backend/.env.example");
  process.exit(1);
}

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error("ADMIN_EMAIL and ADMIN_PASSWORD are required in .env");
  process.exit(1);
}

if (emailOtpEnabled && (!RESEND_API_KEY || !RESEND_FROM_EMAIL)) {
  console.error("REQUIRE_EMAIL_OTP=true requires RESEND_API_KEY and RESEND_FROM_EMAIL.");
  process.exit(1);
}

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;
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
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  } catch (_error) {
    return false;
  }
}

function isPrivateNetworkOrigin(origin) {
  try {
    const parsed = new URL(origin);
    const hostname = (parsed.hostname || "").toLowerCase();

    if (/^10\./.test(hostname)) return true;
    if (/^192\.168\./.test(hostname)) return true;

    const match172 = hostname.match(/^172\.(\d{1,3})\./);
    if (match172) {
      const secondOctet = Number(match172[1]);
      if (secondOctet >= 16 && secondOctet <= 31) return true;
    }

    return false;
  } catch (_error) {
    return false;
  }
}

app.use(express.json({ limit: "5mb" }));
app.use(
  cors({
    origin(origin, callback) {
      if (
        !origin ||
        origin === "null" ||
        allowedOrigins.includes(origin) ||
        isLoopbackOrigin(origin) ||
        isPrivateNetworkOrigin(origin)
      ) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    methods: ["GET", "POST", "PATCH"],
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

function isValidDataImage(value) {
  if (!value) return true;
  if (typeof value !== "string") return false;
  if (!value.startsWith("data:image/")) return false;
  if (!value.includes(";base64,")) return false;

  // Keep inline poster payloads bounded so event POST requests remain lightweight.
  return Buffer.byteLength(value, "utf8") <= 2 * 1024 * 1024;
}

function normalizeApprovalStatus(value) {
  const status = String(value || "").trim().toLowerCase();
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Rejected";
  return "Pending";
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
  // Check for valid admin JWT token first
  const authHeader = String(req.headers.authorization || "");
  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      if (payload && payload.role === "admin") {
        return next();
      }
    } catch (_error) {
      // Fall through to check x-admin-key
    }
  }

  // Fall back to checking dev admin key
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
      event_price TEXT NOT NULL DEFAULT 'Free',
      poster_image TEXT,
      approval_status TEXT NOT NULL DEFAULT 'Pending',
      edit_change_summary TEXT,
      edit_requested_at INTEGER,
      delete_request_reason TEXT,
      delete_requested_at INTEGER,
      organizer_id INTEGER NOT NULL,
      created_by TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (organizer_id) REFERENCES users(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS event_registrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      year_or_designation TEXT,
      notes TEXT,
      pricing_label TEXT NOT NULL DEFAULT 'Free Entry',
      payment_path TEXT,
      created_at INTEGER NOT NULL,
      UNIQUE(event_id, user_id),
      FOREIGN KEY (event_id) REFERENCES events(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  await run(`CREATE INDEX IF NOT EXISTS idx_event_registrations_event_id ON event_registrations(event_id)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_event_registrations_user_id ON event_registrations(user_id)`);

  const eventColumns = await all(`PRAGMA table_info(events)`);
  const registrationColumns = await all(`PRAGMA table_info(event_registrations)`);
  const hasPosterImage = eventColumns.some((column) => column.name === "poster_image");
  const hasApprovalStatus = eventColumns.some((column) => column.name === "approval_status");
  const hasEventPrice = eventColumns.some((column) => column.name === "event_price");
  const hasEditChangeSummary = eventColumns.some((column) => column.name === "edit_change_summary");
  const hasEditRequestedAt = eventColumns.some((column) => column.name === "edit_requested_at");
  const hasDeleteRequestReason = eventColumns.some((column) => column.name === "delete_request_reason");
  const hasDeleteRequestedAt = eventColumns.some((column) => column.name === "delete_requested_at");
  const hasPaymentPath = registrationColumns.some((column) => column.name === "payment_path");
  if (!hasPosterImage) {
    await run(`ALTER TABLE events ADD COLUMN poster_image TEXT`);
  }
  if (!hasApprovalStatus) {
    await run(`ALTER TABLE events ADD COLUMN approval_status TEXT NOT NULL DEFAULT 'Pending'`);
    await run(`UPDATE events SET approval_status = 'Pending' WHERE approval_status IS NULL OR approval_status = ''`);
  }
  if (!hasEventPrice) {
    await run(`ALTER TABLE events ADD COLUMN event_price TEXT NOT NULL DEFAULT 'Free'`);
    await run(`UPDATE events SET event_price = 'Free' WHERE event_price IS NULL OR event_price = ''`);
  }
  if (!hasEditChangeSummary) {
    await run(`ALTER TABLE events ADD COLUMN edit_change_summary TEXT`);
  }
  if (!hasEditRequestedAt) {
    await run(`ALTER TABLE events ADD COLUMN edit_requested_at INTEGER`);
  }
  if (!hasDeleteRequestReason) {
    await run(`ALTER TABLE events ADD COLUMN delete_request_reason TEXT`);
  }
  if (!hasDeleteRequestedAt) {
    await run(`ALTER TABLE events ADD COLUMN delete_requested_at INTEGER`);
  }
  if (!hasPaymentPath) {
    await run(`ALTER TABLE event_registrations ADD COLUMN payment_path TEXT`);
  }
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

    const { title, eventType, department, date, time, location, description, eventPrice = "Free", posterImage = "" } = req.body;

    if (!title || !eventType || !department || !date || !time || !location || !description) {
      return jsonError(res, 400, "Missing required event fields.");
    }

    const normalizedEventPrice = String(eventPrice || "Free").trim() || "Free";

    if (!isValidDataImage(posterImage)) {
      return jsonError(res, 400, "Poster image must be a valid image upload under 2MB.");
    }

    await run(
      `INSERT INTO events (title, event_type, department, date, time, location, description, event_price, poster_image, approval_status, organizer_id, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, eventType, department, date, time, location, description, normalizedEventPrice, posterImage || null, "Pending", user.id, user.username, Date.now()]
    );

    return res.status(201).json({ message: "Event created successfully." });
  } catch (error) {
    console.error("Create event error:", error);
    return jsonError(res, 500, "Could not create event right now.");
  }
});

app.patch("/api/organizer/events/:id", authLimiter, async (req, res) => {
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
      return jsonError(res, 403, "Only organizers can edit events.");
    }

    const eventId = Number(req.params.id);
    if (!Number.isInteger(eventId) || eventId <= 0) {
      return jsonError(res, 400, "Invalid event id.");
    }

    const {
      title,
      eventType,
      department,
      date,
      time,
      location,
      description,
      eventPrice = "Free",
      posterImage = ""
    } = req.body;

    if (!title || !eventType || !department || !date || !time || !location || !description) {
      return jsonError(res, 400, "Missing required event fields.");
    }

    if (!isValidDataImage(posterImage)) {
      return jsonError(res, 400, "Poster image must be a valid image upload under 2MB.");
    }

    const ownedEvent = await get(
      `SELECT id, title, event_type AS eventType, department, date, time, location, description, event_price AS price, poster_image AS posterImage
       FROM events WHERE id = ? AND organizer_id = ?`,
      [eventId, user.id]
    );

    if (!ownedEvent) {
      return jsonError(res, 404, "Event not found.");
    }

    const normalizedEventPrice = String(eventPrice || "Free").trim() || "Free";
    const normalizedPoster = posterImage || null;

    const changes = [];
    const comparisons = [
      ["Title", String(ownedEvent.title || ""), String(title || "")],
      ["Event Type", String(ownedEvent.eventType || ""), String(eventType || "")],
      ["Department", String(ownedEvent.department || ""), String(department || "")],
      ["Date", String(ownedEvent.date || ""), String(date || "")],
      ["Time", String(ownedEvent.time || ""), String(time || "")],
      ["Location", String(ownedEvent.location || ""), String(location || "")],
      ["Description", String(ownedEvent.description || ""), String(description || "")],
      ["Price", String(ownedEvent.price || "Free"), String(normalizedEventPrice || "Free")]
    ];

    for (const [field, previousValue, nextValue] of comparisons) {
      if (previousValue !== nextValue) {
        changes.push({ field, from: previousValue, to: nextValue });
      }
    }

    const previousPoster = String(ownedEvent.posterImage || "").trim();
    const nextPoster = String(normalizedPoster || "").trim();
    if (previousPoster !== nextPoster) {
      changes.push({
        field: "Poster Image",
        from: previousPoster ? "Uploaded" : "None",
        to: nextPoster ? "Uploaded" : "None"
      });
    }

    if (!changes.length) {
      return jsonError(res, 400, "No changes detected to submit for approval.");
    }

    const editChangeSummary = JSON.stringify({
      requestedAt: Date.now(),
      changes
    });

    await run(
      `UPDATE events
       SET title = ?, event_type = ?, department = ?, date = ?, time = ?, location = ?, description = ?, event_price = ?, poster_image = ?, approval_status = 'Pending', edit_change_summary = ?, edit_requested_at = ?
       WHERE id = ? AND organizer_id = ?`,
      [
        title,
        eventType,
        department,
        date,
        time,
        location,
        description,
        normalizedEventPrice,
        normalizedPoster,
        editChangeSummary,
        Date.now(),
        eventId,
        user.id
      ]
    );

    return res.json({ message: "Event updated successfully. Status moved to Pending for review." });
  } catch (error) {
    console.error("Update organizer event error:", error);
    return jsonError(res, 500, "Could not update event right now.");
  }
});

app.get("/api/events", async (req, res) => {
  try {
    const { department = "", eventType = "" } = req.query;
    let sql = `SELECT id, title, event_type AS eventType, department, date, time, location, description, event_price AS price, poster_image AS posterImage, poster_image AS image, approval_status AS approvalStatus, created_by AS createdBy, created_at AS createdAt FROM events`;
    const params = [];
    const conditions = [`approval_status = 'Approved'`];

    if (department && department !== "All") {
      conditions.push(`department = ?`);
      params.push(department);
    }

    if (eventType && eventType !== "All") {
      conditions.push(`event_type = ?`);
      params.push(eventType);
    }

    sql += ` WHERE ${conditions.join(" AND ")}`;

    sql += ` ORDER BY created_at DESC`;

    const events = await all(sql, params);
    console.log("Events fetched:", { count: events.length, filters: { department, eventType } });
    return res.json({ events });
  } catch (error) {
    console.error("List events error:", error);
    return jsonError(res, 500, "Could not fetch events right now.");
  }
});

app.post("/api/events/:id/register", authLimiter, async (req, res) => {
  try {
    const session = getSessionPayload(req);
    if (!session || !session.userId) {
      return jsonError(res, 401, "Unauthorized.");
    }

    const user = await get(
      `SELECT id, account_type, first_name, last_name, email, year_or_designation
       FROM users
       WHERE id = ?`,
      [session.userId]
    );

    if (!user) {
      return jsonError(res, 401, "User not found.");
    }

    if (user.account_type !== "Student") {
      return jsonError(res, 403, "Only student accounts can register for events.");
    }

    const eventId = Number(req.params.id);
    if (!Number.isInteger(eventId) || eventId <= 0) {
      return jsonError(res, 400, "Invalid event id.");
    }

    const event = await get(
      `SELECT id, title, approval_status AS approvalStatus
       FROM events
       WHERE id = ?`,
      [eventId]
    );

    if (!event || event.approvalStatus !== "Approved") {
      return jsonError(res, 404, "Event not found or unavailable.");
    }

    const fullName = String(req.body.name || `${user.first_name || ""} ${user.last_name || ""}`).trim();
    const email = String(req.body.email || user.email || "").trim().toLowerCase();
    const phone = String(req.body.phone || "").trim();
    const yearOrDesignation = String(req.body.year || user.year_or_designation || "").trim();
    const notes = String(req.body.notes || "").trim();
    const pricingLabel = String(req.body.pricingLabel || "Free Entry").trim() || "Free Entry";
    const paymentPath = String(req.body.paymentPath || "").trim();

    if (!fullName || !email || !phone) {
      return jsonError(res, 400, "Name, email, and phone are required.");
    }

    if (!isValidEmail(email)) {
      return jsonError(res, 400, "Please provide a valid email address.");
    }

    if (!/^\+?[0-9\-\s]{7,15}$/.test(phone)) {
      return jsonError(res, 400, "Please provide a valid phone number.");
    }

    // Payment collection is temporarily disabled, so registrations proceed without a payment reference.

    const existing = await get(
      `SELECT id FROM event_registrations WHERE event_id = ? AND user_id = ?`,
      [eventId, user.id]
    );

    if (existing) {
      return jsonError(res, 409, "You are already registered for this event.");
    }

    const insertResult = await run(
      `INSERT INTO event_registrations (
        event_id, user_id, full_name, email, phone, year_or_designation, notes, pricing_label, payment_path, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [eventId, user.id, fullName, email, phone, yearOrDesignation, notes, pricingLabel, paymentPath || null, Date.now()]
    );

    return res.status(201).json({
      message: "Registration successful.",
      registration: {
        id: insertResult.lastID,
        eventId,
        eventTitle: event.title,
        paymentPath: paymentPath || null
      }
    });
  } catch (error) {
    console.error("Event registration error:", error);
    return jsonError(res, 500, "Could not complete registration right now.");
  }
});

app.get("/api/me/registrations", authLimiter, async (req, res) => {
  try {
    const session = getSessionPayload(req);
    if (!session || !session.userId) {
      return jsonError(res, 401, "Unauthorized.");
    }

    const user = await get(
      `SELECT id, account_type FROM users WHERE id = ?`,
      [session.userId]
    );

    if (!user) {
      return jsonError(res, 401, "User not found.");
    }

    if (user.account_type !== "Student") {
      return jsonError(res, 403, "Only student accounts can access registrations.");
    }

    const registrations = await all(
      `SELECT
          r.id,
          r.event_id AS eventId,
          r.full_name AS fullName,
          r.email,
          r.phone,
          r.year_or_designation AS yearOrDesignation,
          r.notes,
          r.pricing_label AS pricingLabel,
          r.payment_path AS paymentPath,
          r.created_at AS createdAt,
          e.title AS eventTitle,
          e.event_type AS eventType,
          e.department,
          e.date,
          e.time,
          e.location,
          e.poster_image AS posterImage,
          e.poster_image AS image
       FROM event_registrations r
       INNER JOIN events e ON e.id = r.event_id
       WHERE r.user_id = ?
       ORDER BY r.created_at DESC`,
      [user.id]
    );

    return res.json({ count: registrations.length, registrations });
  } catch (error) {
    console.error("My registrations error:", error);
    return jsonError(res, 500, "Could not fetch your registrations right now.");
  }
});

app.get("/api/organizer/events", async (req, res) => {
  try {
    const session = getSessionPayload(req);
    if (!session || !session.userId) {
      return jsonError(res, 401, "Unauthorized.");
    }

    const user = await get(`SELECT id, account_type FROM users WHERE id = ?`, [session.userId]);
    if (!user || user.account_type !== "Organizer") {
      return jsonError(res, 403, "Only organizers can access this data.");
    }

    const events = await all(
      `SELECT
          e.id,
          e.title,
          e.event_type AS eventType,
          e.department,
          e.date,
          e.time,
          e.location,
          e.description,
          e.poster_image AS posterImage,
          e.poster_image AS image,
          e.approval_status AS approvalStatus,
          e.delete_request_reason AS deleteRequestReason,
          e.delete_requested_at AS deleteRequestedAt,
          e.created_by AS createdBy,
          e.created_at AS createdAt,
           e.event_price AS price,
          COUNT(r.id) AS registrationCount
       FROM events e
       LEFT JOIN event_registrations r ON r.event_id = e.id
       WHERE e.organizer_id = ?
       GROUP BY e.id
       ORDER BY e.created_at DESC`,
      [user.id]
    );

    return res.json({ events });
  } catch (error) {
    console.error("Organizer events error:", error);
    return jsonError(res, 500, "Could not fetch organizer events right now.");
  }
});

app.post("/api/organizer/events/:id/delete-request", authLimiter, async (req, res) => {
  try {
    const session = getSessionPayload(req);
    if (!session || !session.userId) {
      return jsonError(res, 401, "Unauthorized.");
    }

    const user = await get(`SELECT id, account_type FROM users WHERE id = ?`, [session.userId]);
    if (!user || user.account_type !== "Organizer") {
      return jsonError(res, 403, "Only organizers can request event deletion.");
    }

    const eventId = Number(req.params.id);
    if (!Number.isInteger(eventId) || eventId <= 0) {
      return jsonError(res, 400, "Invalid event id.");
    }

    const reason = String(req.body.reason || "").trim();
    if (reason.length < 10) {
      return jsonError(res, 400, "Please provide a proper deletion reason (at least 10 characters).");
    }

    const event = await get(
      `SELECT id, approval_status AS approvalStatus, delete_requested_at AS deleteRequestedAt
       FROM events
       WHERE id = ? AND organizer_id = ?`,
      [eventId, user.id]
    );

    if (!event) {
      return jsonError(res, 404, "Event not found.");
    }

    if (event.deleteRequestedAt) {
      return jsonError(res, 409, "A deletion request is already pending for this event.");
    }

    if (String(event.approvalStatus || "").toLowerCase() !== "approved") {
      return jsonError(res, 400, "Only approved events can be submitted for deletion approval.");
    }

    await run(
      `UPDATE events
       SET delete_request_reason = ?, delete_requested_at = ?
       WHERE id = ? AND organizer_id = ?`,
      [reason, Date.now(), eventId, user.id]
    );

    return res.json({ message: "Deletion request submitted for admin approval." });
  } catch (error) {
    console.error("Organizer delete request error:", error);
    return jsonError(res, 500, "Could not submit deletion request right now.");
  }
});

app.get("/api/organizer/events/:id/registrations", authLimiter, async (req, res) => {
  try {
    const session = getSessionPayload(req);
    if (!session || !session.userId) {
      return jsonError(res, 401, "Unauthorized.");
    }

    const user = await get(`SELECT id, account_type FROM users WHERE id = ?`, [session.userId]);
    if (!user || user.account_type !== "Organizer") {
      return jsonError(res, 403, "Only organizers can access this data.");
    }

    const eventId = Number(req.params.id);
    if (!Number.isInteger(eventId) || eventId <= 0) {
      return jsonError(res, 400, "Invalid event id.");
    }

    const event = await get(
      `SELECT id, title FROM events WHERE id = ? AND organizer_id = ?`,
      [eventId, user.id]
    );

    if (!event) {
      return jsonError(res, 404, "Event not found.");
    }

    const registrations = await all(
      `SELECT
          id,
          event_id AS eventId,
          user_id AS userId,
          full_name AS fullName,
          email,
          phone,
          year_or_designation AS yearOrDesignation,
          notes,
          pricing_label AS pricingLabel,
           payment_path AS paymentPath,
          created_at AS createdAt
       FROM event_registrations
       WHERE event_id = ?
       ORDER BY created_at DESC`,
      [eventId]
    );

    return res.json({ event: { id: event.id, title: event.title }, count: registrations.length, registrations });
  } catch (error) {
    console.error("Organizer registrations error:", error);
    return jsonError(res, 500, "Could not fetch event registrations right now.");
  }
});

app.get("/api/admin/events", adminLimiter, requireDeveloper, async (req, res) => {
  try {
    const { status = "Pending" } = req.query;
    const normalizedStatus = normalizeApprovalStatus(status);
    const params = [];
    let sql = `SELECT
      e.id,
      e.title,
      e.event_type AS eventType,
      e.department,
      e.date,
      e.time,
      e.location,
      e.description,
      e.event_price AS price,
      e.poster_image AS posterImage,
      e.poster_image AS image,
      e.approval_status AS approvalStatus,
      e.edit_change_summary AS editChangeSummary,
      e.edit_requested_at AS editRequestedAt,
      e.delete_request_reason AS deleteRequestReason,
      e.delete_requested_at AS deleteRequestedAt,
      e.organizer_id AS organizerId,
      e.created_by AS createdBy,
      e.created_at AS createdAt,
      COUNT(r.id) AS registrationCount
      FROM events e
      LEFT JOIN event_registrations r ON r.event_id = e.id`;

    if (normalizedStatus !== "Pending" || String(status || "").trim().toLowerCase() === "pending") {
      sql += ` WHERE e.approval_status = ?`;
      params.push(normalizedStatus);
    }

    sql += ` GROUP BY e.id ORDER BY e.created_at DESC`;

    const events = await all(sql, params);
    return res.json({ count: events.length, events });
  } catch (error) {
    console.error("Admin events error:", error);
    return jsonError(res, 500, "Could not fetch events right now.");
  }
});

app.get("/api/admin/events/deletion-requests", adminLimiter, requireDeveloper, async (_req, res) => {
  try {
    const events = await all(
      `SELECT
          e.id,
          e.title,
          e.event_type AS eventType,
          e.department,
          e.date,
          e.time,
          e.location,
          e.description,
          e.event_price AS price,
          e.approval_status AS approvalStatus,
          e.delete_request_reason AS deleteRequestReason,
          e.delete_requested_at AS deleteRequestedAt,
          e.created_by AS createdBy,
          e.created_at AS createdAt,
          COUNT(r.id) AS registrationCount
       FROM events e
       LEFT JOIN event_registrations r ON r.event_id = e.id
       WHERE e.delete_requested_at IS NOT NULL
       GROUP BY e.id
       ORDER BY e.delete_requested_at DESC`
    );

    return res.json({ count: events.length, events });
  } catch (error) {
    console.error("Admin deletion requests error:", error);
    return jsonError(res, 500, "Could not fetch deletion requests right now.");
  }
});

app.get("/api/admin/registrations", adminLimiter, requireDeveloper, async (req, res) => {
  try {
    const requestedLimit = Number(req.query.limit);
    const limit = Number.isFinite(requestedLimit)
      ? Math.max(1, Math.min(500, Math.floor(requestedLimit)))
      : 100;

    const registrations = await all(
      `SELECT
          r.id,
          r.event_id AS eventId,
          r.user_id AS userId,
          r.full_name AS fullName,
          r.email,
          r.phone,
          r.year_or_designation AS yearOrDesignation,
          r.notes,
          r.pricing_label AS pricingLabel,
          r.payment_path AS paymentPath,
          r.created_at AS createdAt,
          e.title AS eventTitle,
          e.department,
          e.date,
          e.time,
          e.created_by AS organizerUsername
       FROM event_registrations r
       INNER JOIN events e ON e.id = r.event_id
       ORDER BY r.created_at DESC
       LIMIT ?`,
      [limit]
    );

    return res.json({ count: registrations.length, registrations });
  } catch (error) {
    console.error("Admin registrations error:", error);
    return jsonError(res, 500, "Could not fetch registrations right now.");
  }
});

app.patch("/api/admin/events/:id/approve", adminLimiter, requireDeveloper, async (req, res) => {
  try {
    const eventId = Number(req.params.id);
    if (!Number.isInteger(eventId) || eventId <= 0) {
      return jsonError(res, 400, "Invalid event id.");
    }

    const event = await get(`SELECT id, approval_status AS approvalStatus FROM events WHERE id = ?`, [eventId]);
    if (!event) {
      return jsonError(res, 404, "Event not found.");
    }

    if (event.approvalStatus === "Approved") {
      return res.json({ message: "Event is already approved." });
    }

    await run(`UPDATE events SET approval_status = 'Approved', edit_change_summary = NULL, edit_requested_at = NULL WHERE id = ?`, [eventId]);
    return res.json({ message: "Event approved successfully." });
  } catch (error) {
    console.error("Approve event error:", error);
    return jsonError(res, 500, "Could not approve event right now.");
  }
});

app.patch("/api/admin/events/:id/approve-delete", adminLimiter, requireDeveloper, async (req, res) => {
  try {
    const eventId = Number(req.params.id);
    if (!Number.isInteger(eventId) || eventId <= 0) {
      return jsonError(res, 400, "Invalid event id.");
    }

    const event = await get(`SELECT id, delete_requested_at AS deleteRequestedAt FROM events WHERE id = ?`, [eventId]);
    if (!event) {
      return jsonError(res, 404, "Event not found.");
    }

    if (!event.deleteRequestedAt) {
      return jsonError(res, 400, "No pending deletion request found for this event.");
    }

    await run(`DELETE FROM event_registrations WHERE event_id = ?`, [eventId]);
    await run(`DELETE FROM events WHERE id = ?`, [eventId]);
    return res.json({ message: "Event deleted after admin approval." });
  } catch (error) {
    console.error("Approve delete event error:", error);
    return jsonError(res, 500, "Could not approve deletion right now.");
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
      return jsonError(res, 403, "Only organizers can access this action.");
    }

    const eventId = Number(req.params.id);
    const event = await get(`SELECT organizer_id FROM events WHERE id = ?`, [eventId]);

    if (!event) {
      return jsonError(res, 404, "Event not found.");
    }

    if (event.organizer_id !== user.id) {
      return jsonError(res, 403, "You can only delete your own events.");
    }

    return jsonError(res, 403, "Direct deletion is disabled. Submit a deletion request for admin approval.");
  } catch (error) {
    console.error("Delete event error:", error);
    return jsonError(res, 500, "Could not delete event right now.");
  }
});

app.post("/api/admin/login", adminLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return jsonError(res, 400, "Email and password are required.");
    }

    if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
      return jsonError(res, 401, "Invalid email or password.");
    }

    const adminToken = jwt.sign(
      { role: "admin", email: ADMIN_EMAIL },
      JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.json({ token: adminToken, email: ADMIN_EMAIL });
  } catch (error) {
    console.error("Admin login error:", error);
    return jsonError(res, 500, "Login failed. Please try again.");
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

    if (resend && RESEND_FROM_EMAIL) {
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
    }

    console.log(`[DEV OTP] ${email} -> ${code}`);
    return res.json({
      message: "Verification code sent.",
      providerMessageId: null
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