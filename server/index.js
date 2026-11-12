// VolMatch REST API and static file server.
// Educational project for the course Business Analysis, Astana IT University. Not a real product or service. All data are fictional.
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { connect, q, tx, close } from './db.js';
import { hashPassword, verifyPassword, createSession, destroySession, sessionMiddleware } from './auth.js';
import { seed } from './seed.js';

const here = path.dirname(fileURLToPath(import.meta.url));
loadEnv(path.resolve(here, '..', '.env'));
const PORT = Number(process.env.PORT) || 3000;
const DEMO_PASSWORD = process.env.DEMO_PASSWORD;
const CANCEL_DEADLINE_HOURS = 24; // BR-07, FR-28
const STAFF = ['moderator', 'admin'];
// District centres used for the map marker of a new event (same values as the frontend form).
const AREAS = { Yesil: [51.095, 71.42], Saryarka: [51.175, 71.405], Almaty: [51.16, 71.475], Baikonur: [51.14, 71.33] };

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

// ---------- helpers ----------
class HttpError extends Error {
  constructor(status, error, message) { super(message); this.status = status; this.error = error; }
}
const bad = (msg) => new HttpError(400, 'bad_request', msg);
const forbidden = (msg = 'This action is not allowed for your role.') => new HttpError(403, 'forbidden', msg);
const notFound = (msg = 'Not found.') => new HttpError(404, 'not_found', msg);
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function needUser(req) {
  if (!req.user) throw new HttpError(401, 'unauthorized', 'Please sign in.');
  return req.user;
}
function needRole(req, roles) {
  const u = needUser(req);
  if (!roles.includes(u.role)) throw forbidden();
  return u;
}
const str = (v, max = 2000) => String(v ?? '').trim().slice(0, max);
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const hm = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const initials = (name) => String(name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0].toUpperCase()).join('') || '?';

async function audit(run, actorId, action, targetType, targetId, reason = '') {
  await run('INSERT INTO audit_log (actor_user_id, action, target_type, target_id, reason) VALUES ($1,$2,$3,$4,$5)',
    [actorId || null, action, targetType, String(targetId), str(reason, 1000)]);
}

// System notification in the user's "VolMatch" conversation (the frontend translates @@n: messages).
async function notify(run, userId, key, args = []) {
  let c = await run("SELECT conversation_id FROM conversations WHERE user_id = $1 AND kind = 'system'", [userId]);
  if (!c.rows.length) c = await run("INSERT INTO conversations (user_id, kind) VALUES ($1, 'system') RETURNING conversation_id", [userId]);
  await run('INSERT INTO messages (conversation_id, sender_user_id, content) VALUES ($1, NULL, $2)',
    [c.rows[0].conversation_id, '@@n:' + JSON.stringify({ k: key, a: args })]);
}

async function settings() {
  const r = await q('SELECT setting_key, value FROM platform_settings');
  const s = { registrationOpen: true, maintenanceMode: false };
  for (const row of r.rows) s[row.setting_key] = row.value === 'true';
  return s;
}

async function tagsOf(table, idCol, id, type) {
  const r = await q(`SELECT t.name FROM ${table} x JOIN tags t ON t.tag_id = x.tag_id WHERE x.${idCol} = $1 AND t.type = $2 ORDER BY t.name`, [id, type]);
  return r.rows.map((x) => x.name);
}
async function setTags(run, table, idCol, id, type, names) {
  await run(`DELETE FROM ${table} x USING tags t WHERE x.tag_id = t.tag_id AND x.${idCol} = $1 AND t.type = $2`, [id, type]);
  for (const name of [...new Set(names.map((n) => str(n, 60)).filter(Boolean))].slice(0, 20)) {
    const t = await run('INSERT INTO tags (name, type) VALUES ($1,$2) ON CONFLICT (name, type) DO UPDATE SET name = EXCLUDED.name RETURNING tag_id', [name, type]);
    await run(`INSERT INTO ${table} (${idCol}, tag_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [id, t.rows[0].tag_id]);
  }
}
const splitList = (v) => (Array.isArray(v) ? v : String(v || '').split(',')).map((x) => String(x).trim()).filter(Boolean);

// ---------- match score (FR-17): interests 50 %, skills 30 %, availability 20 % ----------
export function matchScore(profile, ev) {
  const interests = new Set(profile.interests || []);
  const skills = new Set((profile.skills || []).map((s) => s.toLowerCase()));
  const interest = interests.has(ev.category) ? 100 : 0;
  const evSkills = ev.skills || [];
  const common = evSkills.filter((s) => skills.has(s.toLowerCase()));
  const skill = evSkills.length ? (100 * common.length) / evSkills.length : 0;
  const start = ev.start;
  const day = start.getDay();
  const weekend = day === 0 || day === 6;
  const a = profile.availability || '';
  let avail = 0;
  if (a === 'Flexible') avail = 100;
  else if (a === 'Weekends') avail = weekend ? 100 : 0;
  else if (a === 'Weekdays') avail = weekend ? 0 : 100;
  else if (a === 'Weekday evenings') avail = !weekend && start.getHours() >= 17 ? 100 : 0;
  const score = Math.round(0.5 * interest + 0.3 * Math.round(skill) + 0.2 * avail);
  const reasons = [];
  if (interest) reasons.push({ type: 'interest', value: ev.category });
  if (common.length) reasons.push({ type: 'skills', value: common.join(', ') });
  if (avail) reasons.push({ type: 'availability', value: a });
  return { score, reasons, parts: { interest, skill: Math.round(skill), availability: avail } };
}

// ---------- events ----------
async function loadEvents(user) {
  const ev = await q(`SELECT e.*, o.name AS org_name, o.owner_user_id, o.verification_status, u.email AS owner_email
    FROM events e JOIN organizations o ON o.organization_id = e.organization_id JOIN users u ON u.user_id = o.owner_user_id ORDER BY e.start_time`);
  const tags = await q("SELECT x.event_id, t.name FROM event_tags x JOIN tags t ON t.tag_id = x.tag_id WHERE t.type = 'skill' ORDER BY t.name");
  const parts = await q(`SELECT p.*, u.email, u.full_name FROM participations p JOIN users u ON u.user_id = p.user_id WHERE p.status = 'registered' ORDER BY p.registered_at`);
  const skillsBy = {}; tags.rows.forEach((r) => (skillsBy[r.event_id] = skillsBy[r.event_id] || []).push(r.name));
  const partsBy = {}; parts.rows.forEach((r) => (partsBy[r.event_id] = partsBy[r.event_id] || []).push(r));
  let profile = null;
  if (user && user.role === 'volunteer') {
    profile = { interests: await tagsOf('user_tags', 'user_id', user.user_id, 'interest'), skills: await tagsOf('user_tags', 'user_id', user.user_id, 'skill'), availability: user.availability };
  }
  const userSkills = {}, userInterests = {}, userAvail = {};
  if (user) {
    const us = await q("SELECT x.user_id, t.name, t.type FROM user_tags x JOIN tags t ON t.tag_id = x.tag_id");
    us.rows.forEach((r) => { const m = r.type === 'skill' ? userSkills : userInterests; (m[r.user_id] = m[r.user_id] || []).push(r.name); });
    (await q('SELECT user_id, availability FROM users')).rows.forEach((r) => (userAvail[r.user_id] = r.availability));
  }
  const isStaff = user && STAFF.includes(user.role);
  const out = [];
  for (const e of ev.rows) {
    const own = user && user.role === 'organizer' && e.owner_user_id === user.user_id;
    const regs = partsBy[e.event_id] || [];
    const mine = user ? regs.find((r) => r.user_id === user.user_id) : null;
    if (!(e.status === 'approved' || own || isStaff || mine)) continue;
    const skills = skillsBy[e.event_id] || [];
    const images = Array.isArray(e.images) ? e.images : [];
    const m = profile ? matchScore(profile, { category: e.category, skills, start: e.start_time }) : { score: 0, reasons: [] };
    const dto = {
      id: e.event_id, title: e.title, org: e.org_name, category: e.category, description: e.description,
      date: ymd(e.start_time), time: hm(e.start_time) + '–' + hm(e.end_time), startsAt: e.start_time.toISOString(),
      location: e.location, area: e.area, lat: e.latitude === null ? null : Number(e.latitude), lon: e.longitude === null ? null : Number(e.longitude),
      needed: e.capacity, spots: Math.max(0, e.capacity - regs.length), attendees: regs.length, full: regs.length >= e.capacity,
      skills, emoji: e.emoji, cover: e.cover, img: images[0] || '', images, status: e.status, reviewReason: e.review_reason,
      minAge: e.min_age, createdBy: e.owner_email, createdAt: e.created_at.toISOString(), orgVerified: e.verification_status === 'verified',
      match: m.score, matchReasons: m.reasons, joined: !!mine, attended: !!(mine && mine.attended), promoted: false
    };
    if (own || isStaff) {
      dto.registrations = regs.map((r) => ({
        userId: r.user_id, email: r.email, name: r.full_name, skills: (userSkills[r.user_id] || []).join(', '),
        match: matchScore({ interests: userInterests[r.user_id] || [], skills: userSkills[r.user_id] || [], availability: userAvail[r.user_id] }, { category: e.category, skills, start: e.start_time }).score,
        status: 'registered', attended: r.attended, registeredAt: r.registered_at.toISOString()
      }));
    }
    out.push(dto);
  }
  return out;
}

async function eventRow(id) {
  const r = await q(`SELECT e.*, o.owner_user_id, o.verification_status FROM events e JOIN organizations o ON o.organization_id = e.organization_id WHERE e.event_id = $1`, [Number(id)]);
  if (!r.rows.length) throw notFound('Event not found.');
  return r.rows[0];
}

// ---------- conversations ----------
async function conversationsFor(user) {
  const c = await q(`SELECT c.*, ou.full_name AS other_name, ou.role AS other_role, oo.name AS other_org, uu.full_name AS user_name, uo.name AS user_org
    FROM conversations c
    LEFT JOIN users uu ON uu.user_id = c.user_id LEFT JOIN organizations uo ON uo.owner_user_id = c.user_id
    LEFT JOIN users ou ON ou.user_id = c.other_user_id LEFT JOIN organizations oo ON oo.owner_user_id = c.other_user_id
    WHERE c.user_id = $1 OR c.other_user_id = $1 ORDER BY c.conversation_id`, [user.user_id]);
  const ids = c.rows.map((x) => x.conversation_id);
  const msgs = ids.length ? await q('SELECT * FROM messages WHERE conversation_id = ANY($1) ORDER BY sent_at, message_id', [ids]) : { rows: [] };
  return c.rows.map((x) => {
    const iAmUser = x.user_id === user.user_id;
    const name = x.kind === 'system' ? 'VolMatch' : iAmUser ? x.other_name : x.user_name;
    const org = x.kind === 'system' ? '' : (iAmUser ? x.other_org : x.user_org) || '';
    return {
      id: x.conversation_id, kind: x.kind, name, org, avatar: initials(name), event: x.event_title,
      messages: msgs.rows.filter((m) => m.conversation_id === x.conversation_id)
        .map((m) => ({ text: m.content, mine: m.sender_user_id === user.user_id, at: m.sent_at.toISOString() }))
    };
  });
}

async function canReadConversation(user, conv) {
  if (conv.user_id === user.user_id || conv.other_user_id === user.user_id) return true;
  if (user.role === 'moderator') {
    const r = await q("SELECT 1 FROM reports WHERE conversation_id = $1", [conv.conversation_id]);
    return r.rows.length > 0;
  }
  return false;
}

// ---------- bootstrap ----------
function userDto(u, extra = {}) {
  return {
    id: u.user_id, email: u.email, name: u.full_name, role: u.role, city: u.city, availability: u.availability, about: u.about,
    photo: u.photo, hideName: u.hide_name, ageBand: u.age_band, ...extra
  };
}
const VER_TEXT = { none: 'Не подтверждён', pending: 'На проверке', verified: 'Подтверждён', needs_info: 'Нужны сведения' };
function verificationDto(o, email) {
  return {
    email, statusCode: o.verification_status, status: VER_TEXT[o.verification_status], kind: o.org_type, legalName: o.name,
    contact: o.contact_person, website: o.website, about: o.about, note: o.verification_note,
    submittedAt: o.submitted_at && o.submitted_at.toISOString(), reviewedAt: o.reviewed_at && o.reviewed_at.toISOString()
  };
}
function auditDto(a) {
  return { at: a.created_at.toISOString(), action: a.action, by: a.actor_email || 'system', reason: a.reason, targetType: a.target_type, targetId: a.target_id, eventId: a.target_type === 'event' ? Number(a.target_id) : null };
}
async function ticketsDto(where, params) {
  const t = await q(`SELECT t.*, u.email, u.full_name, u.role FROM support_tickets t JOIN users u ON u.user_id = t.user_id ${where} ORDER BY t.ticket_id DESC`, params);
  const ids = t.rows.map((x) => x.ticket_id);
  const m = ids.length ? await q('SELECT tm.*, u.full_name FROM ticket_messages tm LEFT JOIN users u ON u.user_id = tm.author_user_id WHERE ticket_id = ANY($1) ORDER BY sent_at', [ids]) : { rows: [] };
  return t.rows.map((x) => ({
    id: x.ticket_id, status: x.status, subject: x.subject, category: x.category, body: x.message, createdAt: x.created_at.toISOString(),
    user: x.email, userName: x.full_name, userRole: x.role,
    messages: m.rows.filter((y) => y.ticket_id === x.ticket_id).map((y) => ({ by: y.full_name || 'VolMatch', body: y.content, at: y.sent_at.toISOString(), staff: y.is_staff }))
  }));
}
async function reportsDto(where, params) {
  const r = await q(`SELECT r.*, u.email, u.full_name, e.title AS event_title, e.status AS event_status, h.full_name AS handler
    FROM reports r JOIN users u ON u.user_id = r.reporter_id LEFT JOIN events e ON e.event_id = r.event_id LEFT JOIN users h ON h.user_id = r.handled_by ${where} ORDER BY r.report_id DESC`, params);
  return r.rows.map((x) => ({
    id: x.report_id, status: x.status, createdAt: x.created_at.toISOString(), reporter: x.email, reporterName: x.full_name,
    eventId: x.event_id, eventTitle: x.event_title || '', eventStatus: x.event_status || '', category: x.category, body: x.message,
    resolution: x.resolution, handledBy: x.handler || '', conversationId: x.conversation_id
  }));
}

async function bootstrap(user) {
  const s = await settings();
  const out = { settings: s, events: await loadEvents(user), user: null };
  if (!user) return out;
  const interests = await tagsOf('user_tags', 'user_id', user.user_id, 'interest');
  const skills = await tagsOf('user_tags', 'user_id', user.user_id, 'skill');
  const org = (await q('SELECT * FROM organizations WHERE owner_user_id = $1', [user.user_id])).rows[0];
  out.user = userDto(user, { interests, skills: skills.join(', '), org: org ? org.name : '' });
  out.favorites = (await q('SELECT event_id FROM saved_events WHERE user_id = $1 ORDER BY saved_at', [user.user_id])).rows.map((r) => r.event_id);
  out.conversations = await conversationsFor(user);
  const photos = await q("SELECT full_name, photo FROM users WHERE photo <> ''");
  out.photos = Object.fromEntries(photos.rows.map((r) => [r.full_name, r.photo]));
  out.hours = await hoursOf(user.user_id);
  if (org) out.verification = verificationDto(org, user.email);
  out.myTickets = await ticketsDto('WHERE t.user_id = $1', [user.user_id]);
  out.myReports = await reportsDto('WHERE r.reporter_id = $1', [user.user_id]);
  if (STAFF.includes(user.role)) {
    const users = await q(`SELECT u.*, o.name AS org_name,
        (SELECT count(*)::int FROM events e WHERE e.organization_id = o.organization_id) AS events_created,
        (SELECT count(*)::int FROM participations p WHERE p.user_id = u.user_id AND p.status = 'registered') AS signups,
        (SELECT count(*)::int FROM participations p WHERE p.user_id = u.user_id AND p.attended) AS attended
      FROM users u LEFT JOIN organizations o ON o.owner_user_id = u.user_id ORDER BY u.user_id`);
    out.users = users.rows.map((u) => ({
      email: u.email, name: u.full_name, role: u.role, org: u.org_name || '', suspended: u.is_blocked, photo: u.photo,
      createdAt: u.created_at.toISOString(), lastLogin: u.last_login && u.last_login.toISOString(), eventsCreated: u.events_created, signups: u.signups, attended: u.attended
    }));
    const v = await q("SELECT o.*, u.email FROM organizations o JOIN users u ON u.user_id = o.owner_user_id WHERE o.verification_status <> 'none' ORDER BY o.submitted_at DESC NULLS LAST");
    out.verifications = v.rows.map((o) => verificationDto(o, o.email));
    // Table 17: the full audit log is for administrators; moderators see the moderation history only.
    const a = await q(`SELECT a.*, u.email AS actor_email FROM audit_log a LEFT JOIN users u ON u.user_id = a.actor_user_id
      ${user.role === 'admin' ? '' : "WHERE a.target_type IN ('event', 'report', 'organization')"} ORDER BY a.log_id DESC LIMIT 500`);
    out.audit = a.rows.map(auditDto);
    out.reports = await reportsDto('', []);
    out.tickets = user.role === 'admin' ? await ticketsDto('', []) : [];
  }
  if (user.role === 'admin') out.stats = await stats();
  return out;
}

async function hoursOf(userId) {
  // FR-15: confirmed hours only from attended records, each record counted once; FR-16: planned hours separately.
  const r = await q(`SELECT
      COALESCE(SUM(EXTRACT(EPOCH FROM (e.end_time - e.start_time)) / 3600) FILTER (WHERE p.attended), 0) AS confirmed,
      COALESCE(SUM(EXTRACT(EPOCH FROM (e.end_time - e.start_time)) / 3600) FILTER (WHERE NOT p.attended), 0) AS planned
    FROM participations p JOIN events e ON e.event_id = p.event_id WHERE p.user_id = $1 AND p.status = 'registered'`, [userId]);
  return { confirmed: Number(r.rows[0].confirmed), planned: Number(r.rows[0].planned) };
}

async function stats() {
  const one = async (sql) => (await q(sql)).rows;
  const byRole = Object.fromEntries((await one('SELECT role, count(*)::int n FROM users GROUP BY role')).map((r) => [r.role, r.n]));
  const byStatus = Object.fromEntries((await one('SELECT status, count(*)::int n FROM events GROUP BY status')).map((r) => [r.status, r.n]));
  const byCategory = Object.fromEntries((await one('SELECT category, count(*)::int n FROM events GROUP BY category')).map((r) => [r.category, r.n]));
  const u = (await one("SELECT count(*)::int total, count(*) FILTER (WHERE created_at > now() - interval '7 days')::int new7, count(*) FILTER (WHERE last_login > now() - interval '7 days')::int active7 FROM users"))[0];
  const ev = (await one("SELECT count(*) FILTER (WHERE start_time > now() AND status = 'approved')::int upcoming FROM events"))[0];
  const sg = (await one("SELECT count(*)::int total, count(*) FILTER (WHERE attended)::int attended FROM participations WHERE status = 'registered'"))[0];
  const rep = (await one("SELECT count(*) FILTER (WHERE status IN ('new','in_review'))::int open FROM reports"))[0];
  return { users: { total: u.total, new7: u.new7, active7: u.active7, byRole }, events: { byStatus, byCategory, upcoming: ev.upcoming }, signups: sg, openComplaints: rep.open };
}

// ---------- app ----------
export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '30mb' }));
  app.use(sessionMiddleware);
  // Mutating API calls must come from the VolMatch frontend (simple CSRF protection).
  app.use('/api', (req, res, next) => {
    if (req.method !== 'GET' && req.get('X-VolMatch') !== '1') return next(new HttpError(403, 'csrf', 'Missing X-VolMatch header.'));
    next();
  });

  const api = express.Router();

  api.get('/bootstrap', wrap(async (req, res) => {
    const s = await settings();
    const user = req.user && s.maintenanceMode && req.user.role !== 'admin' ? null : req.user;
    res.json(await bootstrap(user));
  }));

  // ----- auth (FR-01, FR-02) -----
  api.post('/auth/register', wrap(async (req, res) => {
    const s = await settings();
    if (!s.registrationOpen) throw forbidden('Registration is closed.');
    const email = str(req.body.email, 200).toLowerCase();
    const password = String(req.body.password || '');
    const name = str(req.body.name, 120);
    const role = req.body.role === 'organizer' ? 'organizer' : req.body.role === 'volunteer' ? 'volunteer' : null;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw bad('Enter a valid e-mail.');
    if (password.length < 8) throw bad('The password must have at least 8 characters.');
    if (!name) throw bad('Enter your name.');
    if (!role) throw bad('Choose the role volunteer or organizer.');
    const ageBand = req.body.ageBand === 'under_18' ? 'under_18' : '18_plus';
    const exists = await q('SELECT 1 FROM users WHERE email = $1', [email]);
    if (exists.rows.length) throw new HttpError(409, 'email_taken', 'This e-mail is already registered.');
    const hash = await hashPassword(password);
    const user = await tx(async (run) => {
      const r = await run('INSERT INTO users (email, password_hash, full_name, role, age_band, city, availability, last_login) VALUES ($1,$2,$3,$4,$5,$6,$7, now()) RETURNING *',
        [email, hash, name, role, ageBand, 'Astana', 'Weekends']);
      if (role === 'organizer') {
        await run('INSERT INTO organizations (owner_user_id, name, contact_person) VALUES ($1,$2,$3)', [r.rows[0].user_id, str(req.body.org, 200) || name, name]);
      }
      return r.rows[0];
    });
    await createSession(res, user.user_id);
    res.status(201).json({ user: userDto(user) });
  }));

  api.post('/auth/login', wrap(async (req, res) => {
    const email = str(req.body.email, 200).toLowerCase();
    const r = await q('SELECT * FROM users WHERE email = $1', [email]);
    const u = r.rows[0];
    // Same message for a wrong e-mail and a wrong password, so the response does not reveal which field is wrong.
    if (!u || !(await verifyPassword(String(req.body.password || ''), u.password_hash))) throw new HttpError(401, 'invalid_credentials', 'Wrong e-mail or password.');
    if (u.is_blocked) throw forbidden('This account is blocked. Contact the administrator.');
    const s = await settings();
    if (s.maintenanceMode && u.role !== 'admin') throw new HttpError(503, 'maintenance', 'The platform is in maintenance mode.');
    await q('UPDATE users SET last_login = now() WHERE user_id = $1', [u.user_id]);
    await createSession(res, u.user_id);
    res.json({ user: userDto(u) });
  }));

  api.post('/auth/logout', wrap(async (req, res) => {
    await destroySession(req, res);
    res.json({ ok: true });
  }));

  // ----- profile (FR-03) -----
  api.put('/me', wrap(async (req, res) => {
    const u = needUser(req);
    const b = req.body || {};
    const name = str(b.name, 120) || u.full_name;
    const photo = typeof b.photo === 'string' && (b.photo === '' || b.photo.startsWith('data:image/') || b.photo.startsWith('volmatch-assets/')) ? b.photo.slice(0, 3e6) : u.photo;
    await tx(async (run) => {
      await run('UPDATE users SET full_name=$2, city=$3, availability=$4, about=$5, photo=$6, hide_name=$7 WHERE user_id=$1',
        [u.user_id, name, str(b.city, 80), str(b.availability, 60), str(b.about, 1000), photo, !!b.hideName]);
      if (b.interests !== undefined) await setTags(run, 'user_tags', 'user_id', u.user_id, 'interest', splitList(b.interests));
      if (b.skills !== undefined) await setTags(run, 'user_tags', 'user_id', u.user_id, 'skill', splitList(b.skills));
    });
    const r = await q('SELECT * FROM users WHERE user_id = $1', [u.user_id]);
    const interests = await tagsOf('user_tags', 'user_id', u.user_id, 'interest');
    const skills = await tagsOf('user_tags', 'user_id', u.user_id, 'skill');
    res.json({ user: userDto(r.rows[0], { interests, skills: skills.join(', ') }) });
  }));

  // ----- events (FR-05 … FR-12, FR-38) -----
  api.get('/events', wrap(async (req, res) => res.json({ events: await loadEvents(req.user) })));

  api.post('/events', wrap(async (req, res) => {
    const u = needRole(req, ['organizer']);
    const b = req.body || {};
    const title = str(b.title, 200), category = str(b.category, 60), location = str(b.location, 300), date = str(b.date, 10);
    const [t1, t2] = String(b.time || '').split(/[–-]/).map((x) => x.trim());
    const capacity = Number(b.needed);
    const missing = [];
    if (!title) missing.push('title');
    if (!category) missing.push('category');
    if (!location) missing.push('location');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) missing.push('date');
    if (!/^\d{2}:\d{2}$/.test(t1 || '') || !/^\d{2}:\d{2}$/.test(t2 || '')) missing.push('time');
    if (!Number.isInteger(capacity) || capacity < 1) missing.push('capacity');
    if (missing.length) throw new HttpError(400, 'missing_fields', 'Required fields are missing or invalid: ' + missing.join(', ') + '.');
    if (t2 <= t1) throw bad('The end time must be after the start time.');
    const images = (Array.isArray(b.images) ? b.images : []).filter((x) => typeof x === 'string' && x.startsWith('data:image/')).slice(0, 5);
    const org = (await q('SELECT * FROM organizations WHERE owner_user_id = $1', [u.user_id])).rows[0];
    if (!org) throw forbidden('Organizer profile not found.');
    // FR-11: a verified organizer's valid event is published at once; others wait for a moderator.
    const status = b.status === 'draft' ? 'draft' : org.verification_status === 'verified' ? 'approved' : 'pending';
    const id = await tx(async (run) => {
      const area = AREAS[b.area] ? b.area : 'Yesil';
      const r = await run(`INSERT INTO events (organization_id, title, category, description, location, area, latitude, longitude, start_time, end_time, capacity, status, images, emoji, cover)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'🤝','green') RETURNING event_id`,
        [org.organization_id, title, category, str(b.description, 4000), location, area, AREAS[area][0], AREAS[area][1], `${date} ${t1}:00`, `${date} ${t2}:00`, capacity, status, JSON.stringify(images)]);
      const evId = r.rows[0].event_id;
      await setTags(run, 'event_tags', 'event_id', evId, 'skill', splitList(b.skills));
      await audit(run, u.user_id, status === 'draft' ? 'draft' : status === 'approved' ? 'approved' : 'pending', 'event', evId, status === 'approved' ? 'Verified organizer: published without review (FR-11)' : '');
      return evId;
    });
    res.status(201).json({ id, status });
  }));

  api.put('/events/:id', wrap(async (req, res) => {
    // FR-12: only the owner organizer may edit; any other user gets HTTP 403.
    const u = needUser(req);
    const e = await eventRow(req.params.id);
    if (!(u.role === 'organizer' && e.owner_user_id === u.user_id)) throw forbidden('Only the organizer who owns this event can edit it.');
    const b = req.body || {};
    const title = b.title !== undefined ? str(b.title, 200) : e.title;
    const description = b.description !== undefined ? str(b.description, 4000) : e.description;
    const location = b.location !== undefined ? str(b.location, 300) : e.location;
    const capacity = b.needed !== undefined ? Number(b.needed) : e.capacity;
    if (!title || !location || !Number.isInteger(capacity) || capacity < 1) throw bad('Required fields are missing or invalid.');
    await tx(async (run) => {
      await run('UPDATE events SET title=$2, description=$3, location=$4, capacity=$5 WHERE event_id=$1', [e.event_id, title, description, location, capacity]);
      await audit(run, u.user_id, 'edited', 'event', e.event_id);
    });
    res.json({ ok: true });
  }));

  api.delete('/events/:id', wrap(async (req, res) => {
    const u = needUser(req);
    const e = await eventRow(req.params.id);
    const owner = u.role === 'organizer' && e.owner_user_id === u.user_id;
    if (!(u.role === 'admin' || owner)) throw forbidden();
    await tx(async (run) => {
      await audit(run, u.user_id, 'deleted', 'event', e.event_id, e.title);
      await run('DELETE FROM events WHERE event_id = $1', [e.event_id]);
    });
    res.json({ ok: true });
  }));

  // FR-13: register only for a published event with a free place; the primary key allows one record per volunteer and event.
  api.post('/events/:id/signup', wrap(async (req, res) => {
    const u = needRole(req, ['volunteer']);
    const result = await tx(async (run) => {
      const r = await run('SELECT * FROM events WHERE event_id = $1 FOR UPDATE', [Number(req.params.id)]);
      const e = r.rows[0];
      if (!e) throw notFound('Event not found.');
      if (e.status !== 'approved') throw new HttpError(409, 'not_published', 'You can register only for a published event.');
      if (e.start_time <= new Date()) throw new HttpError(409, 'started', 'This event has already started.');
      if (e.min_age >= 18 && u.age_band === 'under_18') throw forbidden('This event is for participants aged 18 or older.');
      const p = await run('SELECT * FROM participations WHERE user_id = $1 AND event_id = $2', [u.user_id, e.event_id]);
      if (p.rows[0] && p.rows[0].status === 'registered') throw new HttpError(409, 'already_registered', 'You are already registered for this event.');
      const n = await run("SELECT count(*)::int AS n FROM participations WHERE event_id = $1 AND status = 'registered'", [e.event_id]);
      if (n.rows[0].n >= e.capacity) throw new HttpError(409, 'full', 'There are no free places left.');
      if (p.rows[0]) await run("UPDATE participations SET status = 'registered', attended = FALSE, confirmed_at = NULL, registered_at = now() WHERE user_id = $1 AND event_id = $2", [u.user_id, e.event_id]);
      else await run('INSERT INTO participations (user_id, event_id) VALUES ($1, $2)', [u.user_id, e.event_id]);
      return { eventId: e.event_id, freePlaces: e.capacity - n.rows[0].n - 1 };
    });
    res.status(201).json(result);
  }));

  // FR-28: cancel until the deadline (24 h before start, BR-07); the place is released at once.
  api.delete('/events/:id/signup', wrap(async (req, res) => {
    const u = needRole(req, ['volunteer']);
    const e = await eventRow(req.params.id);
    const p = await q("SELECT * FROM participations WHERE user_id = $1 AND event_id = $2 AND status = 'registered'", [u.user_id, e.event_id]);
    if (!p.rows.length) throw notFound('You are not registered for this event.');
    if (e.start_time.getTime() - Date.now() < CANCEL_DEADLINE_HOURS * 3600e3) {
      throw new HttpError(409, 'deadline_passed', `Registrations can be cancelled until ${CANCEL_DEADLINE_HOURS} hours before the event starts. Please message the organizer.`);
    }
    await q("UPDATE participations SET status = 'cancelled' WHERE user_id = $1 AND event_id = $2", [u.user_id, e.event_id]);
    res.json({ ok: true });
  }));

  // FR-14: only the owner organizer, only after the event has started. FR-15: repeating the confirmation changes nothing.
  api.post('/events/:id/attendance', wrap(async (req, res) => {
    const u = needUser(req);
    const e = await eventRow(req.params.id);
    if (!(u.role === 'organizer' && e.owner_user_id === u.user_id)) throw forbidden('Only the organizer who owns this event can confirm attendance.');
    if (e.start_time > new Date()) throw new HttpError(409, 'not_started', 'Attendance can be confirmed only after the event has started.');
    const userId = Number(req.body.userId);
    const attended = req.body.attended !== false;
    const p = await q("SELECT * FROM participations WHERE user_id = $1 AND event_id = $2 AND status = 'registered'", [userId, e.event_id]);
    if (!p.rows.length) throw notFound('This volunteer is not registered for the event.');
    if (p.rows[0].attended !== attended) {
      await tx(async (run) => {
        await run('UPDATE participations SET attended = $3, confirmed_at = CASE WHEN $3 THEN now() ELSE NULL END WHERE user_id = $1 AND event_id = $2', [userId, e.event_id, attended]);
        await audit(run, u.user_id, attended ? 'checked_in' : 'check_in_undone', 'event', e.event_id, 'user ' + userId);
      });
    }
    res.json({ ok: true, attended, hours: await hoursOf(userId) });
  }));

  // FR-20: moderators review events; every decision is written to the audit log (FR-37).
  api.post('/events/:id/status', wrap(async (req, res) => {
    const u = needRole(req, STAFF);
    const e = await eventRow(req.params.id);
    const status = req.body.status;
    if (!['approved', 'rejected', 'suspended'].includes(status)) throw bad('Unknown status.');
    const reason = str(req.body.reason, 1000);
    if ((status === 'rejected' || status === 'suspended') && !reason) throw bad('A reason is required.');
    await tx(async (run) => {
      await run('UPDATE events SET status = $2, review_reason = $3 WHERE event_id = $1', [e.event_id, status, status === 'approved' ? '' : reason]);
      await audit(run, u.user_id, status, 'event', e.event_id, reason);
      const key = status === 'approved' ? 'ev_approved' : status === 'rejected' ? 'ev_rejected' : 'ev_suspended';
      await notify(run, e.owner_user_id, key, [e.title, reason]);
    });
    res.json({ ok: true, status });
  }));

  api.post('/events/:id/resubmit', wrap(async (req, res) => {
    const u = needRole(req, ['organizer']);
    const e = await eventRow(req.params.id);
    if (e.owner_user_id !== u.user_id) throw forbidden();
    if (!['draft', 'rejected'].includes(e.status)) throw new HttpError(409, 'bad_state', 'Only drafts and rejected events can be resubmitted.');
    await tx(async (run) => {
      await run("UPDATE events SET status = 'pending' WHERE event_id = $1", [e.event_id]);
      await audit(run, u.user_id, 'resubmitted', 'event', e.event_id);
    });
    res.json({ ok: true });
  }));

  // Paid promotion is out of scope (BR-05).
  api.post('/events/:id/promote', (req, res) => res.status(410).json({ error: 'out_of_scope', message: 'Paid promotion is out of scope for release 1.0 (BR-05).' }));

  api.put('/events/:id/images', wrap(async (req, res) => {
    const u = needUser(req);
    const e = await eventRow(req.params.id);
    if (!(STAFF.includes(u.role) || (u.role === 'organizer' && e.owner_user_id === u.user_id))) throw forbidden();
    const images = (Array.isArray(req.body.images) ? req.body.images : []).filter((x) => typeof x === 'string' && (x.startsWith('data:image/') || x.startsWith('volmatch-assets/'))).slice(0, 5);
    await tx(async (run) => {
      await run('UPDATE events SET images = $2 WHERE event_id = $1', [e.event_id, JSON.stringify(images)]);
      await audit(run, u.user_id, 'photos_changed', 'event', e.event_id, req.body.reason);
    });
    res.json({ ok: true });
  }));

  // FR-35: a volunteer (or organizer) reports an event; the complaint appears in the moderator queue.
  api.post('/events/:id/report', wrap(async (req, res) => {
    const u = needRole(req, ['volunteer', 'organizer']);
    const e = await eventRow(req.params.id);
    const category = str(req.body.category, 120), body = str(req.body.body, 2000);
    if (!category || !body) throw bad('Choose a reason and describe the problem.');
    const id = await tx(async (run) => {
      const r = await run('INSERT INTO reports (reporter_id, event_id, category, message) VALUES ($1,$2,$3,$4) RETURNING report_id', [u.user_id, e.event_id, category, body]);
      await audit(run, u.user_id, 'report_created', 'report', r.rows[0].report_id, category);
      return r.rows[0].report_id;
    });
    res.status(201).json({ id });
  }));

  // ----- favorites (FR-36) -----
  api.post('/favorites/:id', wrap(async (req, res) => {
    const u = needRole(req, ['volunteer']);
    const e = await eventRow(req.params.id);
    await q('INSERT INTO saved_events (user_id, event_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [u.user_id, e.event_id]);
    res.json({ ok: true });
  }));
  api.delete('/favorites/:id', wrap(async (req, res) => {
    const u = needRole(req, ['volunteer']);
    await q('DELETE FROM saved_events WHERE user_id = $1 AND event_id = $2', [u.user_id, Number(req.params.id)]);
    res.json({ ok: true });
  }));

  // ----- messages (FR-18, FR-19) -----
  api.get('/conversations', wrap(async (req, res) => res.json({ conversations: await conversationsFor(needUser(req)) })));

  api.get('/conversations/:id', wrap(async (req, res) => {
    const u = needUser(req);
    const c = (await q('SELECT * FROM conversations WHERE conversation_id = $1', [Number(req.params.id)])).rows[0];
    if (!c) throw notFound('Conversation not found.');
    if (!(await canReadConversation(u, c))) throw forbidden('Only the two participants can read this conversation.');
    const m = await q('SELECT m.*, u.full_name FROM messages m LEFT JOIN users u ON u.user_id = m.sender_user_id WHERE conversation_id = $1 ORDER BY sent_at, message_id', [c.conversation_id]);
    res.json({ conversation: { id: c.conversation_id, kind: c.kind, event: c.event_title, messages: m.rows.map((x) => ({ text: x.content, from: x.full_name || 'VolMatch', at: x.sent_at.toISOString() })) } });
  }));

  api.post('/conversations', wrap(async (req, res) => {
    const u = needRole(req, ['volunteer', 'organizer']);
    const name = str(req.body.name, 120), org = str(req.body.org, 200);
    const target = (await q(`SELECT u.* FROM users u LEFT JOIN organizations o ON o.owner_user_id = u.user_id
      WHERE u.user_id <> $1 AND u.role = $2 AND (u.full_name = $3 OR (o.name IS NOT NULL AND o.name = $4)) ORDER BY (u.full_name = $3) DESC LIMIT 1`,
      [u.user_id, u.role === 'volunteer' ? 'organizer' : 'volunteer', name, org || name])).rows[0];
    if (!target) throw notFound('This person is not registered on VolMatch.');
    let c = (await q(`SELECT * FROM conversations WHERE kind = 'direct' AND ((user_id = $1 AND other_user_id = $2) OR (user_id = $2 AND other_user_id = $1))`, [u.user_id, target.user_id])).rows[0];
    if (!c) c = (await q('INSERT INTO conversations (user_id, other_user_id, event_title) VALUES ($1,$2,$3) RETURNING *', [u.user_id, target.user_id, str(req.body.event, 200)])).rows[0];
    res.status(201).json({ conversation: { id: c.conversation_id } });
  }));

  api.post('/conversations/:id/messages', wrap(async (req, res) => {
    const u = needUser(req);
    const c = (await q('SELECT * FROM conversations WHERE conversation_id = $1', [Number(req.params.id)])).rows[0];
    if (!c) throw notFound('Conversation not found.');
    if (!(c.user_id === u.user_id || c.other_user_id === u.user_id)) throw forbidden('Only the two participants can write in this conversation.');
    if (c.kind === 'system') throw bad('System notifications cannot be answered.');
    const text = str(req.body.text, 3000);
    if (!text) throw bad('The message is empty.');
    const r = await q('INSERT INTO messages (conversation_id, sender_user_id, content) VALUES ($1,$2,$3) RETURNING message_id, sent_at', [c.conversation_id, u.user_id, text]);
    res.status(201).json({ id: r.rows[0].message_id, at: r.rows[0].sent_at.toISOString() });
  }));

  // ----- organizer verification (FR-32) -----
  api.post('/organizer/verification', wrap(async (req, res) => {
    const u = needRole(req, ['organizer']);
    const b = req.body || {};
    const legalName = str(b.legalName, 200), contact = str(b.contact, 200);
    if (!legalName || !contact) throw bad('Legal name and contact person are required.');
    await q(`UPDATE organizations SET name=$2, org_type=$3, contact_person=$4, website=$5, about=$6,
        verification_status = CASE WHEN verification_status = 'verified' THEN 'verified' ELSE 'pending' END, submitted_at = now() WHERE owner_user_id = $1`,
      [u.user_id, legalName, b.kind === 'person' ? 'person' : 'organization', contact, str(b.website, 300), str(b.about, 2000)]);
    res.json({ ok: true });
  }));

  api.post('/moderation/verifications/:email', wrap(async (req, res) => {
    const u = needRole(req, STAFF);
    const owner = (await q('SELECT u.user_id, o.organization_id FROM users u JOIN organizations o ON o.owner_user_id = u.user_id WHERE u.email = $1', [String(req.params.email).toLowerCase()])).rows[0];
    if (!owner) throw notFound('Organizer not found.');
    const status = req.body.status === 'verified' ? 'verified' : req.body.status === 'needs_info' ? 'needs_info' : null;
    if (!status) throw bad('Unknown status.');
    const note = str(req.body.note || req.body.reason, 1000);
    await tx(async (run) => {
      await run('UPDATE organizations SET verification_status=$2, verification_note=$3, reviewed_at=now() WHERE organization_id=$1', [owner.organization_id, status, note]);
      await audit(run, u.user_id, status === 'verified' ? 'organizer_verified' : 'organizer_info_requested', 'organization', owner.organization_id, note);
      await notify(run, owner.user_id, status === 'verified' ? 'org_verified' : 'org_needs_info', [note]);
    });
    res.json({ ok: true });
  }));

  api.put('/moderation/users/:email/photo', wrap(async (req, res) => {
    const u = needRole(req, STAFF);
    const t = (await q('SELECT * FROM users WHERE email = $1', [String(req.params.email).toLowerCase()])).rows[0];
    if (!t) throw notFound('User not found.');
    if (u.role === 'moderator' && t.role === 'admin') throw forbidden();
    const photo = typeof req.body.photo === 'string' && (req.body.photo === '' || req.body.photo.startsWith('data:image/')) ? req.body.photo.slice(0, 3e6) : null;
    if (photo === null) throw bad('Invalid image.');
    await tx(async (run) => {
      await run('UPDATE users SET photo = $2 WHERE user_id = $1', [t.user_id, photo]);
      await audit(run, u.user_id, photo ? 'user_photo_changed' : 'user_photo_removed', 'user', t.user_id);
    });
    res.json({ ok: true });
  }));

  api.patch('/moderation/reports/:id', wrap(async (req, res) => {
    const u = needRole(req, STAFF);
    const r = (await q('SELECT r.*, e.title FROM reports r LEFT JOIN events e ON e.event_id = r.event_id WHERE report_id = $1', [Number(req.params.id)])).rows[0];
    if (!r) throw notFound('Complaint not found.');
    const status = req.body.status;
    if (!['new', 'in_review', 'resolved', 'rejected'].includes(status)) throw bad('Unknown status.');
    const resolution = str(req.body.resolution, 1000);
    if ((status === 'resolved' || status === 'rejected') && !resolution) throw bad('Describe the decision.');
    await tx(async (run) => {
      await run('UPDATE reports SET status=$2, resolution=$3, handled_by=$4 WHERE report_id=$1', [r.report_id, status, resolution || r.resolution, u.user_id]);
      await audit(run, u.user_id, 'report_' + status, 'report', r.report_id, resolution);
      if (status === 'resolved' || status === 'rejected') await notify(run, r.reporter_id, status === 'resolved' ? 'report_resolved' : 'report_rejected', [r.title || '', resolution]);
    });
    res.json({ ok: true });
  }));

  // ----- support tickets (FR-39) -----
  api.post('/support/tickets', wrap(async (req, res) => {
    const u = needUser(req);
    const subject = str(req.body.subject, 200), body = str(req.body.body, 3000);
    if (!subject || !body) throw bad('Subject and message are required.');
    const r = await q('INSERT INTO support_tickets (user_id, subject, category, message) VALUES ($1,$2,$3,$4) RETURNING ticket_id', [u.user_id, subject, str(req.body.category, 120), body]);
    res.status(201).json({ id: r.rows[0].ticket_id });
  }));

  api.post('/support/tickets/:id/messages', wrap(async (req, res) => {
    const u = needUser(req);
    const t = (await q('SELECT * FROM support_tickets WHERE ticket_id = $1', [Number(req.params.id)])).rows[0];
    if (!t) throw notFound('Ticket not found.');
    const staff = u.role === 'admin'; // FR-39, Table 17: support tickets are answered by administrators
    if (!staff && t.user_id !== u.user_id) throw forbidden();
    const body = str(req.body.body, 3000);
    if (!body) throw bad('The message is empty.');
    await tx(async (run) => {
      await run('INSERT INTO ticket_messages (ticket_id, author_user_id, is_staff, content) VALUES ($1,$2,$3,$4)', [t.ticket_id, u.user_id, staff, body]);
      if (staff) {
        await run("UPDATE support_tickets SET status = CASE WHEN status = 'new' THEN 'in_progress' ELSE status END WHERE ticket_id = $1", [t.ticket_id]);
        await audit(run, u.user_id, 'ticket_replied', 'ticket', t.ticket_id, body.slice(0, 200));
        await notify(run, t.user_id, 'ticket_reply', [t.subject, body.slice(0, 300)]);
      }
    });
    res.status(201).json({ ok: true });
  }));

  api.patch('/moderation/tickets/:id', wrap(async (req, res) => {
    const u = needRole(req, ['admin']);
    const t = (await q('SELECT * FROM support_tickets WHERE ticket_id = $1', [Number(req.params.id)])).rows[0];
    if (!t) throw notFound('Ticket not found.');
    const status = req.body.status;
    if (!['new', 'in_progress', 'resolved'].includes(status)) throw bad('Unknown status.');
    await tx(async (run) => {
      await run('UPDATE support_tickets SET status = $2 WHERE ticket_id = $1', [t.ticket_id, status]);
      await audit(run, u.user_id, 'ticket_' + status, 'ticket', t.ticket_id);
      if (status === 'resolved') await notify(run, t.user_id, 'ticket_resolved', [t.subject]);
    });
    res.json({ ok: true });
  }));

  // ----- administration (FR-02, FR-21, FR-34, FR-37) -----
  api.patch('/admin/users/:email', wrap(async (req, res) => {
    const u = needRole(req, ['admin']); // FR-21: moderators get HTTP 403
    const t = (await q('SELECT * FROM users WHERE email = $1', [String(req.params.email).toLowerCase()])).rows[0];
    if (!t) throw notFound('User not found.');
    if (t.user_id === u.user_id) throw bad('You cannot change your own account here.');
    const b = req.body || {};
    await tx(async (run) => {
      if (b.role !== undefined) {
        if (!['volunteer', 'organizer', 'moderator', 'admin'].includes(b.role)) throw bad('Unknown role.');
        await run('UPDATE users SET role = $2 WHERE user_id = $1', [t.user_id, b.role]);
        if (b.role === 'organizer') await run('INSERT INTO organizations (owner_user_id, name, contact_person) VALUES ($1,$2,$2) ON CONFLICT (owner_user_id) DO NOTHING', [t.user_id, t.full_name]);
        await audit(run, u.user_id, 'role_changed', 'user', t.user_id, `${t.role} → ${b.role}`);
      }
      if (b.suspended !== undefined) {
        await run('UPDATE users SET is_blocked = $2 WHERE user_id = $1', [t.user_id, !!b.suspended]);
        if (b.suspended) await run('DELETE FROM sessions WHERE user_id = $1', [t.user_id]);
        await audit(run, u.user_id, b.suspended ? 'user_suspended' : 'user_restored', 'user', t.user_id);
      }
      if (b.password !== undefined) {
        if (String(b.password).length < 8) throw bad('The password must have at least 8 characters.');
        await run('UPDATE users SET password_hash = $2 WHERE user_id = $1', [t.user_id, await hashPassword(String(b.password))]);
        await audit(run, u.user_id, 'password_reset', 'user', t.user_id);
      }
    });
    res.json({ ok: true });
  }));

  api.put('/admin/settings', wrap(async (req, res) => {
    const u = needRole(req, ['admin']);
    await tx(async (run) => {
      for (const k of ['registrationOpen', 'maintenanceMode']) {
        if (req.body[k] === undefined) continue;
        await run('INSERT INTO platform_settings VALUES ($1,$2) ON CONFLICT (setting_key) DO UPDATE SET value = EXCLUDED.value', [k, String(!!req.body[k])]);
        await audit(run, u.user_id, 'setting_changed', 'setting', k, String(!!req.body[k]));
      }
    });
    res.json(await settings());
  }));

  api.get('/admin/stats', wrap(async (req, res) => { needRole(req, ['admin']); res.json(await stats()); }));
  api.get('/admin/audit-log', wrap(async (req, res) => {
    needRole(req, ['admin']);
    const a = await q('SELECT a.*, u.email AS actor_email FROM audit_log a LEFT JOIN users u ON u.user_id = a.actor_user_id ORDER BY a.log_id DESC LIMIT 1000');
    res.json({ entries: a.rows.map(auditDto) });
  }));

  // FR-16: hours of the signed-in volunteer.
  api.get('/me/hours', wrap(async (req, res) => res.json(await hoursOf(needUser(req).user_id))));

  app.use('/api', api);
  app.use('/api', (req, res) => res.status(404).json({ error: 'not_found', message: 'Unknown API endpoint.' }));
  app.use(express.static(path.resolve(here, '..', 'public'), { extensions: ['html'] }));

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.error, message: err.message });
    if (err && err.type === 'entity.too.large') return res.status(413).json({ error: 'too_large', message: 'The request is too large.' });
    console.error(err);
    res.status(500).json({ error: 'server_error', message: 'Server error.' });
  });
  return app;
}

export async function start(port = PORT) {
  if (!DEMO_PASSWORD || DEMO_PASSWORD === 'change-me-please' || DEMO_PASSWORD.length < 8) {
    throw new Error('Set DEMO_PASSWORD in the .env file (at least 8 characters, not "change-me-please"). See README.');
  }
  await connect();
  await seed(DEMO_PASSWORD);
  const app = createApp();
  return new Promise((resolve) => {
    const server = app.listen(port, () => resolve(server));
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  start().then(() => {
    console.log(`VolMatch is running: http://localhost:${PORT}`);
    console.log('Educational project for the course Business Analysis, Astana IT University. Not a real product or service. All data are fictional.');
  }).catch((e) => { console.error(e.message || e); process.exit(1); });
  const stop = async () => { await close(); process.exit(0); };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}
