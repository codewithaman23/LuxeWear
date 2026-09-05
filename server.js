require("dotenv").config();
const express = require("express");
const path = require("path");
const crypto = require("crypto");
const Database = require("better-sqlite3");
const nodemailer = require("nodemailer");

const app = express();
const port = Number(process.env.PORT || 3000);
const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) throw new Error("SESSION_SECRET is required");
const database = new Database(path.join(__dirname, "data", "noir.sqlite"));
database.pragma("journal_mode = WAL");
database.exec(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT UNIQUE,
  phone TEXT UNIQUE, password_hash TEXT, provider TEXT NOT NULL DEFAULT 'password',
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS otp_challenges (
  id INTEGER PRIMARY KEY AUTOINCREMENT, destination TEXT NOT NULL, channel TEXT NOT NULL,
  code_hash TEXT NOT NULL, expires_at INTEGER NOT NULL, attempts INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL, consumed_at INTEGER
);`);
const sessions = new Map();
const otpRate = new Map();
const loginRate = new Map();
const json = express.json({ limit: "20kb" });
app.use(json);
app.use(express.static(__dirname));

const hash = (value, salt = crypto.randomBytes(16).toString("hex")) =>
  new Promise((resolve, reject) => crypto.scrypt(value, salt, 64, (error, derived) =>
    error ? reject(error) : resolve(`${salt}:${derived.toString("hex")}`)));
const verifyHash = async (value, stored) => {
  if (!stored) return false;
  const [salt, key] = stored.split(":");
  const derived = await hash(value, salt);
  return crypto.timingSafeEqual(Buffer.from(derived.split(":")[1], "hex"), Buffer.from(key, "hex"));
};
const validEmail = (value) => typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const publicUser = (user) => ({ id: user.id, name: user.name, email: user.email, phone: user.phone });
const tokenFor = (userId) => {
  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, { userId, expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 7 });
  return token;
};
const currentUser = (request) => {
  const token = request.headers.cookie?.match(/noir_session=([^;]+)/)?.[1];
  const session = token && sessions.get(token);
  if (!session || session.expiresAt < Date.now()) return null;
  return database.prepare("SELECT * FROM users WHERE id = ?").get(session.userId);
};
const requireUser = (request, response, next) => {
  const user = currentUser(request);
  if (!user) return response.status(401).json({ error: "Authentication required" });
  request.user = user;
  next();
};
const cookie = (token, maxAge) => `noir_session=${token}; Max-Age=${maxAge}; HttpOnly; SameSite=Lax; Path=/`;
const mailer = process.env.SMTP_HOST && process.env.SMTP_USER ? nodemailer.createTransport({
  host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587),
  secure: Number(process.env.SMTP_PORT) === 465, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
}) : null;

app.post("/api/auth/register", async (request, response) => {
  const { name, email, password } = request.body;
  if (!name || !validEmail(email) || typeof password !== "string" || password.length < 8)
    return response.status(400).json({ error: "Enter a name, valid email, and password of at least 8 characters." });
  const normalizedEmail = email.toLowerCase().trim();
  if (database.prepare("SELECT id FROM users WHERE email = ?").get(normalizedEmail))
    return response.status(409).json({ error: "An account with that email already exists." });
  const now = new Date().toISOString();
  const result = database.prepare("INSERT INTO users (name,email,password_hash,provider,created_at,updated_at) VALUES (?,?,?,?,?,?)")
    .run(name.trim(), normalizedEmail, await hash(password), "password", now, now);
  const user = database.prepare("SELECT * FROM users WHERE id = ?").get(result.lastInsertRowid);
  response.setHeader("Set-Cookie", cookie(tokenFor(user.id), 60 * 60 * 24 * 7));
  response.status(201).json({ user: publicUser(user) });
});

app.post("/api/auth/login", async (request, response) => {
  const { email, password } = request.body;
  const key = `${request.ip}:${String(email || "").toLowerCase()}`;
  const attempts = (loginRate.get(key) || []).filter((time) => time > Date.now() - 15 * 60 * 1000);
  if (attempts.length >= 10) return response.status(429).json({ error: "Too many login attempts. Try again later." });
  const user = validEmail(email) && database.prepare("SELECT * FROM users WHERE email = ?").get(email.toLowerCase().trim());
  if (!user || !(await verifyHash(password, user.password_hash))) {
    loginRate.set(key, [...attempts, Date.now()]);
    return response.status(401).json({ error: "Email or password is incorrect." });
  }
  loginRate.delete(key);
  response.setHeader("Set-Cookie", cookie(tokenFor(user.id), 60 * 60 * 24 * 7));
  response.json({ user: publicUser(user) });
});

app.post("/api/auth/otp/request", async (request, response) => {
  const { email } = request.body;
  if (!validEmail(email)) return response.status(400).json({ error: "Enter a valid email address." });
  if (!mailer) return response.status(503).json({ error: "Email verification is unavailable until SMTP is configured." });
  const destination = email.toLowerCase().trim();
  const recent = otpRate.get(destination) || [];
  const active = recent.filter((time) => time > Date.now() - 15 * 60 * 1000);
  if (active.length >= 3) return response.status(429).json({ error: "Too many code requests. Try again later." });
  const code = String(crypto.randomInt(100000, 1000000));
  const challenge = await hash(code);
  database.prepare("INSERT INTO otp_challenges (destination,channel,code_hash,expires_at,created_at) VALUES (?,?,?,?,?)")
    .run(destination, "email", challenge, Date.now() + 10 * 60 * 1000, Date.now());
  otpRate.set(destination, [...active, Date.now()]);
  await mailer.sendMail({ from: process.env.SMTP_FROM, to: destination, subject: "Your NOIR verification code", text: `Your NOIR verification code is ${code}. It expires in 10 minutes. If you did not request this, you can ignore this email.` });
  response.status(202).json({ message: "Verification code sent." });
});

app.post("/api/auth/otp/verify", async (request, response) => {
  const { email, code, name = "NOIR member" } = request.body;
  const challenge = database.prepare("SELECT * FROM otp_challenges WHERE destination = ? AND channel = ? AND consumed_at IS NULL ORDER BY id DESC").get(email?.toLowerCase().trim(), "email");
  if (!challenge || challenge.expires_at < Date.now() || challenge.attempts >= 5)
    return response.status(401).json({ error: "That verification code is invalid or expired." });
  database.prepare("UPDATE otp_challenges SET attempts = attempts + 1 WHERE id = ?").run(challenge.id);
  if (!(await verifyHash(code, challenge.code_hash)))
    return response.status(401).json({ error: "That verification code is invalid or expired." });
  database.prepare("UPDATE otp_challenges SET consumed_at = ? WHERE id = ?").run(Date.now(), challenge.id);
  let user = database.prepare("SELECT * FROM users WHERE email = ?").get(email.toLowerCase().trim());
  if (!user) {
    const now = new Date().toISOString();
    const result = database.prepare("INSERT INTO users (name,email,provider,created_at,updated_at) VALUES (?,?,?,?,?)").run(name.trim(), email.toLowerCase().trim(), "email-otp", now, now);
    user = database.prepare("SELECT * FROM users WHERE id = ?").get(result.lastInsertRowid);
  }
  response.setHeader("Set-Cookie", cookie(tokenFor(user.id), 60 * 60 * 24 * 7));
  response.json({ user: publicUser(user) });
});

app.get("/api/auth/me", requireUser, (request, response) => response.json({ user: publicUser(request.user) }));
app.post("/api/auth/logout", (request, response) => {
  const token = request.headers.cookie?.match(/noir_session=([^;]+)/)?.[1];
  if (token) sessions.delete(token);
  response.setHeader("Set-Cookie", cookie("", 0));
  response.status(204).end();
});
app.use((error, request, response, next) => {
  if (error?.type === "entity.parse.failed") return response.status(400).json({ error: "Invalid request." });
  console.error(error);
  response.status(500).json({ error: "A server error occurred." });
});
app.use((request, response) => response.sendFile(path.join(__dirname, "index.html")));
app.listen(port, () => console.log(`NOIR server listening on http://localhost:${port}`));
