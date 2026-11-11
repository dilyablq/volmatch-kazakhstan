Educational project for the course Business Analysis, Astana IT University. Not a real product or service. All data are fictional.

# VolMatch – volunteer matching prototype (Team 03)

VolMatch connects volunteers in Astana with organizations that run community events. This repository contains the working
prototype for the Final Project of the course *Requirements. Business Analysis* (Software Requirements Specification, Team 03).
All people, organizations, e-mail addresses and events in the database are invented.

**Demo video:** [OneDrive link – to be added by the team]

## What the prototype does

Main use case, end to end (UC-02 → UC-01 → UC-03 → UC-11):

1. An organizer publishes an event (a verified organizer's event is published at once, others wait for a moderator).
2. A volunteer finds the event and registers.
3. After the event has started, the organizer confirms who attended.
4. The volunteer sees the confirmed hours; planned hours are shown separately.

Four user roles with different access rights: volunteer, organizer, moderator and administrator. Every permission is checked
on the server (HTTP 401 without a session, HTTP 403 for a role that is not allowed).

## Implemented requirements (IDs from the SRS)

| Status | Functional requirements |
|---|---|
| Implemented | FR-01 – FR-21, FR-23 – FR-25, FR-27, FR-28, FR-32, FR-34 – FR-37, FR-39 |
| Partial | FR-22 (all labels exist in Kazakh, Russian and English; some messages are in one language only), FR-33 (age band stored and checked on the server; not asked in the sign-up form; no parental-consent flag), FR-38 (Full and Completed are derived from free places and the date, not stored as statuses) |
| Not implemented (next release) | FR-26 accessibility fields, FR-29 waiting list, FR-30 QR check-in, FR-31 CSV export of hours |

Nonfunctional requirements supported in code: NFR-06 (scrypt password hashes), NFR-07 (role checks on every protected endpoint),
NFR-08 (HttpOnly session cookie), NFR-09 (audit log), NFR-16 (primary key prevents duplicate registrations and hour credits).
Out-of-scope screens (leaderboard, points, organizer comparison, paid promotion – BR-05) are hidden; the promotion endpoint returns HTTP 410.

## Technology stack

- Frontend: HTML, CSS and JavaScript (`public/`), map with Leaflet 1.9.4 and OpenStreetMap tiles.
- Backend: Node.js 18+ with Express (`server/index.js`), REST API under `/api`.
- Database: PostgreSQL (`server/schema.sql`). By default the server starts an embedded PostgreSQL in the folder `.pgdata`,
  so no separate database installation is needed. To use your own PostgreSQL, set `DATABASE_URL` in `.env`.

## Install and run on localhost

Requirements: Node.js 18 or newer (https://nodejs.org).

```bash
npm install
cp .env.example .env      # then set DEMO_PASSWORD in .env
npm start                 # open http://localhost:3000
```

The first start creates the database and loads the invented seed data. To start again with clean data:

```bash
npm run reset-db
npm start
```

Without the server (for example on the static Netlify copy) the page runs in **demo mode**: data stay in the browser and are
not shared between users. Use full mode (`npm start`) for the tests, the demo video and the defense.

## Test accounts (invented)

| Role | E-mail |
|---|---|
| Volunteer | volunteer@volmatch.demo (also volunteer2@…, volunteer3@…) |
| Organizer (verified) | organizer@volmatch.demo |
| Second organizer (for the HTTP 403 test) | organizer2@volmatch.demo |
| Moderator | moderator@volmatch.demo |
| Administrator | admin@volmatch.demo |

All demo accounts use the password set in `DEMO_PASSWORD` in your `.env` file. The password is not published in the report;
the team gives it to the examiner on request.

## Acceptance tests

```bash
npm test                  # TC-01 … TC-24 at API level, with their own empty database
```

Optional screen-level checks in a real browser (TC-01, TC-04, TC-13 – TC-17):

```bash
npm install --no-save playwright && npx playwright install chromium
npm run test:ui
```

Results are written to `tests/results/acceptance-results.json`.

## Security notes

- Passwords are stored only as salted scrypt hashes; sessions use HttpOnly cookies.
- Secrets (`DEMO_PASSWORD`, `DATABASE_URL`) are kept in `.env`, which is listed in `.gitignore` and never committed.
- Mutating API calls require the header `X-VolMatch: 1` (simple CSRF protection).

## Credits and licences

- Leaflet 1.9.4 – BSD-2-Clause, https://leafletjs.com
- Map data © OpenStreetMap contributors, ODbL, https://www.openstreetmap.org/copyright
- Express (MIT), node-postgres `pg` (MIT), `embedded-postgres` (MIT), PostgreSQL (PostgreSQL Licence)
- Event photos in `public/volmatch-assets/` are open stock images used for the demo only.
- Parts of the server code, the tests and this README were written with the help of Claude (Anthropic); see the AI Disclosure
  Statement in the report.

Project code: MIT licence (see `LICENSE`).
