// Invented seed data. All people, organizations, e-mails and events are fictional.
import crypto from 'node:crypto';
import { tx } from './db.js';
import { hashPassword } from './auth.js';

const pad = (n) => String(n).padStart(2, '0');
// Local timestamp (no time zone) N days from today at HH:MM.
function at(days, hhmm) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${hhmm}:00`;
}

const USERS = [
  // email, name, role, organization, city, availability, about, skills, interests
  ['volunteer@volmatch.demo', 'Amina Sadykova', 'volunteer', null, 'Astana', 'Weekends', 'I enjoy bringing people together and supporting causes that make our community stronger.', ['Communication', 'Event planning', 'Social media'], ['Environment', 'Education', 'Community']],
  ['volunteer2@volmatch.demo', 'Timur Bekov', 'volunteer', null, 'Astana', 'Weekday evenings', 'Helps people learn digital skills.', ['Technology', 'Teaching', 'Communication'], ['Education']],
  ['volunteer3@volmatch.demo', 'Aizhan Omarova', 'volunteer', null, 'Astana', 'Weekends', 'Animal lover and reliable weekend volunteer.', ['Animal care', 'Teamwork'], ['Animals']],
  ['organizer@volmatch.demo', 'Aigerim Tulegenova', 'organizer', 'Astana Green Initiative', 'Astana', '', '', [], []],
  ['organizer2@volmatch.demo', 'Daniyar Seitkali', 'organizer', 'Kind Paws Foundation', 'Astana', '', '', [], []],
  ['expo.guides@volmatch.demo', 'Saule Ospanova', 'organizer', 'Astana EXPO Guides', 'Astana', '', '', [], []],
  ['warm.table@volmatch.demo', 'Madina Sarsenova', 'organizer', 'Warm Table Community', 'Astana', '', '', [], []],
  ['generations@volmatch.demo', 'Erlan Abenov', 'organizer', 'Connected Generations', 'Astana', '', '', [], []],
  ['active@volmatch.demo', 'Dana Mukasheva', 'organizer', 'Astana Active', 'Astana', '', '', [], []],
  ['bright.futures@volmatch.demo', 'Arman Zhunusov', 'organizer', 'Bright Futures NGO', 'Astana', '', '', [], []],
  ['donor.team@volmatch.demo', 'Gulnar Iskakova', 'organizer', 'Astana Blood Center', 'Astana', '', '', [], []],
  ['moderator@volmatch.demo', 'Nurlan Tleubay', 'moderator', null, 'Astana', '', '', [], []],
  ['admin@volmatch.demo', 'Asel Bekturova', 'admin', null, 'Astana', '', '', [], []]
];
const UNVERIFIED = ['Astana Blood Center'];
// District of an event = the nearest district centre (same centres as the event form).
const AREAS = { Yesil: [51.095, 71.42], Saryarka: [51.175, 71.405], Almaty: [51.16, 71.475], Baikonur: [51.14, 71.33] };
function nearestArea(lat, lon) {
  let best = 'Yesil', dist = Infinity;
  for (const [name, [a, b]] of Object.entries(AREAS)) {
    const d = (a - lat) ** 2 + (b - lon) ** 2;
    if (d < dist) { dist = d; best = name; }
  }
  return best;
}

// [title, organization, category, days from today, time, location, capacity, skills, emoji, cover, lat, lon, description, status, image]
const EVENTS = [
  ['Green City Park Cleanup', 'Astana Green Initiative', 'Environment', 9, '09:00-12:00', 'Presidential Park, Astana', 12, ['Teamwork', 'Outdoor activities'], '🌳', 'green', 51.128, 71.43, 'Join Astana residents for a park clean-up, waste sorting and careful care for the city’s green spaces.', 'approved', 'cleanup_astana.jpg'],
  ['Nūr Alem Discovery Day Volunteers', 'Astana EXPO Guides', 'Education', 15, '11:00-14:00', 'Nūr Alem Museum, EXPO Park, Astana', 6, ['Communication', 'Event planning'], '🌐', 'blue', 51.09, 71.412, 'Welcome visitors at the Nūr Alem pavilion, share directions and help guests discover the energy exhibits at Astana’s EXPO park.', 'approved', 'expo_nuralem.webp'],
  ['Paws & Care Shelter Day', 'Kind Paws Foundation', 'Animals', 16, '10:00-13:00', 'Kind Paws Animal Shelter', 4, ['Animal care', 'Teamwork'], '🐾', 'pink', 51.16, 71.475, 'Support shelter staff with feeding, dog walking and enrichment activities.', 'approved', 'animal_shelter_care.jpg'],
  ['Community Food Box Packing', 'Warm Table Community', 'Community', 2, '13:00-16:00', 'Community Hub, Saryarka', 18, ['Organization', 'Teamwork'], '🥫', 'yellow', 51.175, 71.405, 'Pack essential food boxes for families and help with distribution.', 'approved', 'food_aid_packing.png'],
  ['Digital Skills for Seniors', 'Connected Generations', 'Education', 5, '15:00-17:00', 'Public Library No. 3', 5, ['Communication', 'Technology'], '💻', 'blue', 51.118, 71.448, 'Help older adults use smartphones and online public services.', 'approved', 'senior_digital_training.jpg'],
  ['Run for Wellbeing — Event Crew', 'Astana Active', 'Health', 23, '07:30-11:30', 'Botanical Garden Entrance', 20, ['Event planning', 'Communication'], '🏃', 'lilac', 51.09, 71.405, 'Welcome participants, guide runners and support the finish area.', 'approved', 'charity_run.jpg'],
  ['Urban Garden Planting', 'Astana Green Initiative', 'Environment', 29, '10:00-13:00', 'Expo Community Garden', 9, ['Outdoor activities', 'Teamwork'], '🪴', 'green', 51.091, 71.417, 'Plant seasonal greens in a shared urban garden.', 'approved', 'expo_planting_astana.jpg'],
  ['Warm Clothes Sorting Drive', 'Warm Table Community', 'Community', 8, '12:00-15:00', 'Volunteer Center, Astana', 14, ['Organization', 'Communication'], '🧣', 'orange', 51.147, 71.43, 'Sort donated clothing and prepare bundles for distribution.', 'approved', 'clothing_sorting.webp'],
  ['Animal Wellness Support', 'Kind Paws Foundation', 'Animals', 30, '09:30-12:30', 'Kind Paws Animal Shelter', 3, ['Animal care', 'Social media'], '🐶', 'pink', 51.154, 71.463, 'Support shelter enrichment and share adoptable pets’ stories.', 'approved', 'animal_shelter_visit.jpg'],
  ['Winter Essentials Packing Day', 'Warm Table Community', 'Community', 36, '10:00-13:00', 'Astana Winter Support Center', 16, ['Organization', 'Teamwork'], '🧤', 'yellow', 51.147, 71.43, 'Pack warm clothing, thermoses and hygiene kits with a local community group for families before winter.', 'pending', 'winter_aid.jpg'],
  ['Library Reading and Craft Circle', 'Bright Futures NGO', 'Education', 43, '11:00-14:00', 'Community Library No. 3, Yesil', 8, ['Teaching', 'Communication'], '📖', 'orange', 51.118, 71.448, 'Read short stories, help children with crafts and prepare take-home book kits at the neighborhood library.', 'approved', 'children_workshop.jpg'],
  ['Community Blood Donation Welcome Team', 'Astana Blood Center', 'Health', 50, '08:30-12:30', 'Astana Blood Donation Center', 10, ['Communication', 'Organization'], '🩸', 'blue', 51.145, 71.43, 'Welcome donors, help with registration and guide visitors through the waiting area; medical staff handle all clinical care.', 'pending', 'blood_donation.jpg'],
  // Past events: confirmed hours for the demo volunteer and one event waiting for attendance confirmation.
  ['Autumn Leaf Cleanup', 'Astana Green Initiative', 'Environment', -14, '10:00-13:00', 'Presidential Park, Astana', 15, ['Teamwork', 'Outdoor activities'], '🍂', 'green', 51.128, 71.43, 'Rake leaves and sort green waste along the park paths.', 'approved', 'cleanup_astana.jpg'],
  ['Book Kits for Children', 'Bright Futures NGO', 'Education', -7, '14:00-17:00', 'Community Library No. 3, Yesil', 8, ['Teaching', 'Communication'], '📚', 'orange', 51.118, 71.448, 'Sort donated books and prepare reading kits for children.', 'approved', 'children_workshop.jpg'],
  ['Riverside Litter Pick', 'Astana Green Initiative', 'Environment', -1, '09:00-12:00', 'Esil River Embankment, Astana', 10, ['Teamwork', 'Outdoor activities'], '🏞', 'green', 51.13, 71.44, 'Collect litter along the embankment and sort it for recycling.', 'approved', 'expo_planting_astana.jpg']
];
// [volunteer e-mail, event title, attended]
const PARTICIPATIONS = [
  ['volunteer@volmatch.demo', 'Community Food Box Packing', false],
  ['volunteer@volmatch.demo', 'Run for Wellbeing — Event Crew', false],
  ['volunteer@volmatch.demo', 'Autumn Leaf Cleanup', true],
  ['volunteer@volmatch.demo', 'Book Kits for Children', true],
  ['volunteer@volmatch.demo', 'Riverside Litter Pick', false],
  ['volunteer2@volmatch.demo', 'Riverside Litter Pick', false],
  ['volunteer2@volmatch.demo', 'Nūr Alem Discovery Day Volunteers', false],
  ['volunteer2@volmatch.demo', 'Green City Park Cleanup', false],
  ['volunteer3@volmatch.demo', 'Paws & Care Shelter Day', false],
  ['volunteer3@volmatch.demo', 'Green City Park Cleanup', false]
];

export async function seed(demoPassword) {
  await tx(async (q) => {
    const has = await q('SELECT count(*)::int AS n FROM users');
    if (has.rows[0].n > 0) return;
    const hash = await hashPassword(demoPassword);
    const ids = {};
    const orgIds = {};
    const tagId = async (name, type) => {
      const r = await q('INSERT INTO tags (name, type) VALUES ($1, $2) ON CONFLICT (name, type) DO UPDATE SET name = EXCLUDED.name RETURNING tag_id', [name, type]);
      return r.rows[0].tag_id;
    };
    for (const [email, name, role, org, city, avail, about, skills, interests] of USERS) {
      const r = await q('INSERT INTO users (email, password_hash, full_name, role, city, availability, about) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING user_id',
        [email, hash, name, role, city, avail, about]);
      ids[email] = r.rows[0].user_id;
      for (const s of skills) await q('INSERT INTO user_tags VALUES ($1, $2)', [ids[email], await tagId(s, 'skill')]);
      for (const i of interests) await q('INSERT INTO user_tags VALUES ($1, $2)', [ids[email], await tagId(i, 'interest')]);
      if (org) {
        const verified = !UNVERIFIED.includes(org);
        const o = await q(`INSERT INTO organizations (owner_user_id, name, org_type, contact_person, verification_status, submitted_at, reviewed_at)
          VALUES ($1,$2,'organization',$3,$4, now() - interval '20 days', $5) RETURNING organization_id`,
          [ids[email], org, name, verified ? 'verified' : 'pending', verified ? new Date(Date.now() - 18 * 864e5) : null]);
        orgIds[org] = o.rows[0].organization_id;
      }
    }
    const evIds = {};
    for (const [title, org, cat, days, time, loc, cap, skills, emoji, cover, lat, lon, desc, status, img] of EVENTS) {
      const [t1, t2] = time.split('-');
      const area = nearestArea(lat, lon);
      const r = await q(`INSERT INTO events (organization_id, title, category, description, location, area, latitude, longitude, start_time, end_time, capacity, status, emoji, cover, images, created_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15, now() - interval '3 days') RETURNING event_id`,
        [orgIds[org], title, cat, desc, loc, area, lat, lon, at(days, t1), at(days, t2), cap, status, emoji, cover, JSON.stringify(['volmatch-assets/' + img])]);
      evIds[title] = r.rows[0].event_id;
      for (const s of skills) await q('INSERT INTO event_tags VALUES ($1, $2)', [evIds[title], await tagId(s, 'skill')]);
    }
    for (const [email, title, attended] of PARTICIPATIONS) {
      await q('INSERT INTO participations (user_id, event_id, attended, confirmed_at, registered_at) VALUES ($1,$2,$3,$4, now() - interval \'5 days\')',
        [ids[email], evIds[title], attended, attended ? new Date() : null]);
    }
    const chat = async (a, b, ev, lines) => {
      const c = await q('INSERT INTO conversations (user_id, other_user_id, event_title) VALUES ($1,$2,$3) RETURNING conversation_id', [ids[a], ids[b], ev]);
      for (const [from, text] of lines) await q('INSERT INTO messages (conversation_id, sender_user_id, content) VALUES ($1,$2,$3)', [c.rows[0].conversation_id, ids[from], text]);
    };
    await chat('volunteer@volmatch.demo', 'organizer@volmatch.demo', 'Green City Park Cleanup', [['organizer@volmatch.demo', 'Hi! Thanks for your interest in the park cleanup 🌱']]);
    await chat('volunteer@volmatch.demo', 'warm.table@volmatch.demo', 'Community Food Box Packing', [['warm.table@volmatch.demo', 'Welcome to the team! Happy to have you.']]);
    await q("INSERT INTO platform_settings VALUES ('registrationOpen', 'true'), ('maintenanceMode', 'false') ON CONFLICT DO NOTHING");
    await q("INSERT INTO audit_log (actor_user_id, action, target_type, target_id, reason) VALUES ($1, 'organizer_verified', 'organization', $2, 'Seed data')", [ids['moderator@volmatch.demo'], String(orgIds['Astana Green Initiative'])]);
  });
}

export function randomToken() {
  return crypto.randomBytes(32).toString('hex');
}
