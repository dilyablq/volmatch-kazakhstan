// Acceptance tests TC-01 … TC-23 (report, Appendix G, Table G1) — API level.
// Run: npm test   (starts its own server with an empty embedded PostgreSQL database; all data are invented)
// Screen-level checks (TC-04, TC-14, TC-16, TC-17 and the screen parts of TC-01, TC-13, TC-15) are in tests/ui-check.mjs.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, Client, as, record, saveResults, RESULTS_FILE } from './helpers.mjs';
import { matchScore } from '../server/index.js';

let srv, base;
const V = 'volunteer@volmatch.demo', V2 = 'volunteer2@volmatch.demo', V3 = 'volunteer3@volmatch.demo';
const O = 'organizer@volmatch.demo', O2 = 'organizer2@volmatch.demo', M = 'moderator@volmatch.demo', A = 'admin@volmatch.demo';
const byTitle = (events, t) => events.find((e) => e.title === t);
const inDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };

before(async () => { srv = await startServer(); base = srv.base; });
after(async () => { saveResults(RESULTS_FILE); await srv.stop(); });

test('TC-01 FR-01: sign-up creates a volunteer account', async () => {
  const c = new Client(base);
  const r = await c.call('POST', '/api/auth/register', { email: 'new.volunteer@volmatch.demo', password: 'Volunteer2026', name: 'Test Volunteer', role: 'volunteer' });
  const d = await c.boot();
  const ok = r.status === 201 && d.user && d.user.role === 'volunteer';
  record('TC-01', ok, `HTTP ${r.status}; account created with role ${d.user && d.user.role}; signed in at once`);
  assert.ok(ok);
});

test('TC-02 FR-01: the same e-mail is rejected', async () => {
  const c = new Client(base);
  const r = await c.call('POST', '/api/auth/register', { email: 'new.volunteer@volmatch.demo', password: 'Volunteer2026', name: 'Test Volunteer', role: 'volunteer' });
  const admin = await as(base, A);
  const n = (await admin.boot()).users.filter((u) => u.email === 'new.volunteer@volmatch.demo').length;
  const ok = r.status === 409 && n === 1;
  record('TC-02', ok, `HTTP ${r.status} “${r.data && r.data.message}”; ${n} account with this e-mail`);
  assert.ok(ok);
});

test('TC-03 FR-02, FR-21: a moderator cannot change a role', async () => {
  const mod = await as(base, M);
  const r = await mod.call('PATCH', '/api/admin/users/' + V, { role: 'admin' });
  const s = await mod.call('PUT', '/api/admin/settings', { maintenanceMode: true });
  const anon = await new Client(base).call('PUT', '/api/me', { name: 'x' });
  const admin = await as(base, A);
  const role = (await admin.boot()).users.find((u) => u.email === V).role;
  const ok = r.status === 403 && s.status === 403 && anon.status === 401 && role === 'volunteer';
  record('TC-03', ok, `Role change HTTP ${r.status}, settings HTTP ${s.status}, no session HTTP ${anon.status}; role still ${role}`);
  assert.ok(ok);
});

let newEventId;
test('TC-05 FR-10, FR-11: a verified organizer publishes an event', async () => {
  const org = await as(base, O);
  const miss = await org.call('POST', '/api/events', { title: '', category: 'Environment', date: inDays(20), time: '10:00–13:00', area: 'Yesil', location: 'Test Square', needed: 8 });
  const r = await org.call('POST', '/api/events', {
    title: 'Test Tree Planting', category: 'Environment', date: inDays(20), time: '10:00–13:00', area: 'Yesil', location: 'Test Square, Astana',
    needed: 8, skills: 'Teamwork, Outdoor activities', description: 'Invented test event.', images: [], status: 'pending'
  });
  newEventId = r.data && r.data.id;
  const visitor = await new Client(base).boot();
  const ev = visitor.events.find((e) => e.id === newEventId);
  const ok = miss.status === 400 && r.status === 201 && r.data.status === 'approved' && ev && ev.lat !== null && ev.lon !== null;
  record('TC-05', ok, `Missing title: HTTP ${miss.status}, nothing saved; valid form: HTTP ${r.status}, status ${r.data && r.data.status}; visible to visitors with map coordinates`);
  assert.ok(ok);
});

test('TC-06 FR-12: another organizer cannot edit the event', async () => {
  const org2 = await as(base, O2);
  const r = await org2.call('PUT', '/api/events/' + newEventId, { title: 'Changed by someone else' });
  const ev = (await new Client(base).boot()).events.find((e) => e.id === newEventId);
  const ok = r.status === 403 && ev.title === 'Test Tree Planting';
  record('TC-06', ok, `HTTP ${r.status}; title unchanged (“${ev.title}”)`);
  assert.ok(ok);
});

let digitalId;
test('TC-07 FR-13, FR-25: registration is stored and survives a new session', async () => {
  const vol = await as(base, V);
  const before = byTitle((await vol.boot()).events, 'Digital Skills for Seniors');
  digitalId = before.id;
  const r = await vol.call('POST', `/api/events/${digitalId}/signup`);
  const again = await as(base, V); // new session = reload
  const after = byTitle((await again.boot()).events, 'Digital Skills for Seniors');
  const ok = before.spots === 5 && r.status === 201 && after.joined && after.spots === 4;
  record('TC-07', ok, `Free places ${before.spots} → ${after.spots}; HTTP ${r.status}; registration still shown after a new sign-in`);
  assert.ok(ok);
});

test('TC-08 FR-13: a second registration is refused', async () => {
  const vol = await as(base, V);
  const r = await vol.call('POST', `/api/events/${digitalId}/signup`);
  const ev = byTitle((await vol.boot()).events, 'Digital Skills for Seniors');
  const ok = r.status === 409 && ev.spots === 4;
  record('TC-08', ok, `HTTP ${r.status} “${r.data && r.data.message}”; still one registration (${ev.spots} free places)`);
  assert.ok(ok);
});

let riverId, v2Id;
test('TC-09 FR-14: only the owner confirms attendance after the start', async () => {
  const org = await as(base, O);
  const d = await org.boot();
  const river = byTitle(d.events, 'Riverside Litter Pick');
  riverId = river.id;
  v2Id = river.registrations.find((x) => x.email === V2).userId;
  const r = await org.call('POST', `/api/events/${riverId}/attendance`, { userId: v2Id, attended: true });
  const other = await (await as(base, O2)).call('POST', `/api/events/${riverId}/attendance`, { userId: v2Id, attended: true });
  const future = byTitle(d.events, 'Green City Park Cleanup');
  const early = await org.call('POST', `/api/events/${future.id}/attendance`, { userId: v2Id, attended: true });
  const saved = byTitle((await org.boot()).events, 'Riverside Litter Pick').registrations.find((x) => x.email === V2).attended;
  const ok = r.status === 200 && saved === true && other.status === 403 && early.status === 409;
  record('TC-09', ok, `Owner: HTTP ${r.status}, attendance saved; other organizer: HTTP ${other.status}; before the start: HTTP ${early.status}`);
  assert.ok(ok);
});

test('TC-10 FR-15, FR-16: hours are counted once; planned hours separate', async () => {
  const org = await as(base, O);
  await org.call('POST', `/api/events/${riverId}/attendance`, { userId: v2Id, attended: true }); // second confirmation
  const vol2 = await as(base, V2);
  const h = (await vol2.boot()).hours;
  const ok = h.confirmed === 3 && h.planned === 6;
  record('TC-10', ok, `Confirmed hours ${h.confirmed} (not 6) after two confirmations of a 3-hour event; planned hours ${h.planned} shown separately`);
  assert.ok(ok);
});

test('TC-11 FR-18, FR-19: only the two participants read a conversation', async () => {
  const vol = await as(base, V);
  const conv = (await vol.boot()).conversations.find((c) => c.name === 'Aigerim Tulegenova');
  const s = await vol.call('POST', `/api/conversations/${conv.id}/messages`, { text: 'See you at the cleanup!' });
  const org = await as(base, O);
  const seen = (await org.boot()).conversations.find((c) => c.id === conv.id).messages.some((m) => m.text === 'See you at the cleanup!');
  const third = await (await as(base, V3)).call('GET', `/api/conversations/${conv.id}`);
  const thirdPost = await (await as(base, V3)).call('POST', `/api/conversations/${conv.id}/messages`, { text: 'hi' });
  const mod = await (await as(base, M)).call('GET', `/api/conversations/${conv.id}`);
  const ok = s.status === 201 && seen && third.status === 403 && thirdPost.status === 403 && mod.status === 403;
  record('TC-11', ok, `Message sent (HTTP ${s.status}) and seen by the organizer; third user: read HTTP ${third.status}, write HTTP ${thirdPost.status}; moderator without complaint: HTTP ${mod.status}`);
  assert.ok(ok);
});

test('TC-12 FR-20: a moderator approves a pending event', async () => {
  const mod = await as(base, M);
  const ev = byTitle((await mod.boot()).events, 'Winter Essentials Packing Day');
  const r = await mod.call('POST', `/api/events/${ev.id}/status`, { status: 'approved' });
  const d = await mod.boot();
  const now = byTitle(d.events, 'Winter Essentials Packing Day').status;
  const logged = d.audit.some((a) => a.action === 'approved' && a.eventId === ev.id && a.by === M);
  const ok = r.status === 200 && now === 'approved' && logged;
  record('TC-12', ok, `Status pending → ${now}; audit-log entry by ${M}`);
  assert.ok(ok);
});

test('TC-13 FR-03, FR-04: optional profile fields can be empty', async () => {
  const vol = await as(base, V);
  const r = await vol.call('PUT', '/api/me', { name: 'Amina Sadykova', city: '', availability: '', about: '', skills: '', interests: [], photo: '', hideName: false });
  const u = (await vol.boot()).user;
  const ok = r.status === 200 && u.name === 'Amina Sadykova' && u.email === V && u.ageBand === '18_plus' && !u.about && !u.city && !u.skills && u.interests.length === 0 && !u.photo;
  record('TC-13', ok, `HTTP ${r.status}; profile saved with name, e-mail and age band only; no photo stored`);
  assert.ok(ok);
});

test('TC-15 FR-17: match score is the weighted sum and low scores stay listed', async () => {
  const vol = await as(base, V);
  await vol.call('PUT', '/api/me', { name: 'Amina Sadykova', city: 'Astana', availability: 'Weekends', about: '', skills: 'Teamwork', interests: ['Environment'], photo: '' });
  const d = await vol.boot();
  const visitorCount = (await new Client(base).boot()).events.length;
  const profile = { interests: ['Environment'], skills: ['Teamwork'], availability: 'Weekends' };
  let wrong = 0;
  for (const e of d.events) {
    const exp = matchScore(profile, { category: e.category, skills: e.skills, start: new Date(e.startsAt) });
    if (exp.score !== e.match) wrong++;
  }
  const withReason = d.events.filter((e) => e.match > 0).every((e) => e.matchReasons.length > 0);
  const low = d.events.filter((e) => e.match < 20 && e.status === 'approved').length;
  const ok = wrong === 0 && withReason && d.events.length >= visitorCount;
  record('TC-15', ok, `${d.events.length - wrong} of ${d.events.length} scores equal the weighted sum; every score above 0 has a reason; ${low} low-score events still listed`);
  assert.ok(ok);
});

test('TC-18 FR-32: organizer verification request and approval', async () => {
  const c = new Client(base);
  await c.call('POST', '/api/auth/register', { email: 'new.organizer@volmatch.demo', password: 'Organizer2026', name: 'Test Organizer', role: 'organizer', org: 'Test Help Group' });
  const r = await c.call('POST', '/api/organizer/verification', { kind: 'organization', legalName: 'Test Help Group', contact: 'Test Organizer', website: '', about: 'Invented organization' });
  const mod = await as(base, M);
  const queued = (await mod.boot()).verifications.find((v) => v.email === 'new.organizer@volmatch.demo');
  const v = await mod.call('POST', '/api/moderation/verifications/new.organizer@volmatch.demo', { status: 'verified' });
  const d = await mod.boot();
  const status = d.verifications.find((x) => x.email === 'new.organizer@volmatch.demo').statusCode;
  const logged = d.audit.some((a) => a.action === 'organizer_verified' && a.by === M);
  const ok = r.status === 200 && queued && queued.statusCode === 'pending' && v.status === 200 && status === 'verified' && logged;
  record('TC-18', ok, `Request in the queue (${queued && queued.statusCode}); after approval: ${status}; audit-log entry written`);
  assert.ok(ok);
});

test('TC-19 FR-34: administrator statistics match the data', async () => {
  const admin = await as(base, A);
  const d = await admin.boot();
  const s = (await admin.call('GET', '/api/admin/stats')).data;
  const byRole = {};
  d.users.forEach((u) => (byRole[u.role] = (byRole[u.role] || 0) + 1));
  const statuses = {};
  d.events.forEach((e) => (statuses[e.status] = (statuses[e.status] || 0) + 1));
  const ok = JSON.stringify(byRole) === JSON.stringify(Object.fromEntries(Object.keys(byRole).map((k) => [k, s.users.byRole[k]]))) &&
    Object.keys(statuses).every((k) => statuses[k] === s.events.byStatus[k]) && s.users.total === d.users.length && typeof s.signups.total === 'number' && typeof s.openComplaints === 'number';
  record('TC-19', ok, `Users ${s.users.total} by role ${JSON.stringify(s.users.byRole)}; events by status ${JSON.stringify(s.events.byStatus)}; sign-ups ${s.signups.total}; open complaints ${s.openComplaints} — equal to the seed data`);
  assert.ok(ok);
});

test('TC-20 FR-35: a complaint reaches the moderator queue within 1 minute', async () => {
  const vol = await as(base, V);
  const ev = byTitle((await vol.boot()).events, 'Paws & Care Shelter Day');
  const t0 = Date.now();
  const r = await vol.call('POST', `/api/events/${ev.id}/report`, { category: 'Inaccurate information', body: 'The address on the page looks wrong (test).' });
  const rep = (await (await as(base, M)).boot()).reports.find((x) => x.id === r.data.id);
  const secs = (Date.now() - t0) / 1000;
  const ok = r.status === 201 && rep && rep.status === 'new' && secs < 60;
  record('TC-20', ok, `HTTP ${r.status}; complaint #${r.data && r.data.id} in the queue after ${secs.toFixed(1)} s`);
  assert.ok(ok);
});

test('TC-21 FR-36: save and remove a favorite', async () => {
  const vol = await as(base, V);
  const ev = byTitle((await vol.boot()).events, 'Urban Garden Planting');
  await vol.call('POST', `/api/favorites/${ev.id}`);
  const saved = (await vol.boot()).favorites.includes(ev.id);
  await vol.call('DELETE', `/api/favorites/${ev.id}`);
  const removed = !(await vol.boot()).favorites.includes(ev.id);
  const ok = saved && removed;
  record('TC-21', ok, `Event in the saved list: ${saved}; removed: ${removed}`);
  assert.ok(ok);
});

test('TC-22 FR-37: moderation and administrator actions are logged', async () => {
  const admin = await as(base, A);
  const r = await admin.call('PATCH', '/api/admin/users/' + V3, { role: 'organizer' });
  await admin.call('PATCH', '/api/admin/users/' + V3, { role: 'volunteer' });
  const log = (await admin.call('GET', '/api/admin/audit-log')).data.entries;
  const approved = log.find((a) => a.action === 'approved' && a.by === M);
  const role = log.find((a) => a.action === 'role_changed' && a.by === A);
  const ok = !!(r.status === 200 && approved && role && approved.at && role.at);
  record('TC-22', ok, `Entries found: “approved” by ${approved && approved.by} at ${approved && approved.at}; “role_changed” by ${role && role.by} at ${role && role.at}`);
  assert.ok(ok);
});

test('TC-23 FR-28: cancellation more than 24 h before the start', async () => {
  const vol = await as(base, V);
  const before = byTitle((await vol.boot()).events, 'Digital Skills for Seniors');
  const r = await vol.call('DELETE', `/api/events/${before.id}/signup`);
  const after = byTitle((await vol.boot()).events, 'Digital Skills for Seniors');
  const ok = r.status === 200 && !after.joined && after.spots === before.spots + 1;
  record('TC-23', ok, `HTTP ${r.status}; registration cancelled; free places ${before.spots} → ${after.spots}`);
  assert.ok(ok);
});

test('TC-24 FR-39: a support ticket is answered by the administrator and logged', async () => {
  const vol = await as(base, V);
  const r = await vol.call('POST', '/api/support/tickets', { subject: 'Cannot find my hours', category: 'Account', body: 'Where do I see confirmed hours? (test)' });
  const admin = await as(base, A);
  const modReply = await (await as(base, M)).call('POST', `/api/support/tickets/${r.data.id}/messages`, { body: 'Moderator reply (must be refused).' });
  const a = await admin.call('POST', `/api/support/tickets/${r.data.id}/messages`, { body: 'Open Dashboard → Hours.' });
  const log = (await admin.call('GET', '/api/admin/audit-log')).data.entries.some((x) => x.action === 'ticket_replied' && x.by === A);
  const d = await vol.boot();
  const t = d.myTickets.find((x) => x.id === r.data.id);
  const seen = t && t.messages.some((m) => m.staff && m.body === 'Open Dashboard → Hours.');
  const ok = r.status === 201 && a.status === 201 && modReply.status === 403 && log && seen;
  record('TC-24', ok, `Ticket #${r.data && r.data.id} created (HTTP ${r.status}); moderator reply HTTP ${modReply.status}; administrator answer HTTP ${a.status}, shown to the user; audit-log entry: ${log}`);
  assert.ok(ok);
});
