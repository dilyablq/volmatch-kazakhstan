Educational project for the course Business Analysis, Astana IT University. Not a real product or service. All data are fictional.

# VolMatch – volunteer matching platform (Team 03)

Working prototype for the Final Project (Software Requirements Specification) of the course *Requirements. Business Analysis*.
Supervisor: Nurkhat Ibadildin.

## Team

| Student | Group |
|---|---|
| Abylkassym Korkem | ITM-2402 |
| Balykbay Dilnaz | ITM-2402 |
| Kuttybay Dilnaz | ITM-2402 |
| Zhakzhan Alina | ITM-2402 |

## Links

- Demo video: [Team03_FP_Demo (SharePoint)](https://astanait-my.sharepoint.com/:v:/r/personal/240908_astanait_edu_kz/_layouts/15/stream.aspx?id=%2Fpersonal%2F240908_astanait_edu_kz%2FDocuments%2F%D0%92%D0%B8%D0%B4%D0%B5%D0%BE%2FClipchamp%2F%D0%92%D0%B8%D0%B4%D0%B5%D0%BE%D0%BF%D1%80%D0%BE%D0%B5%D0%BA%D1%82%2FAssets%2FTeam03_FP_Demo.mp4.MP4&nav=eyJyZWZlcnJhbEluZm8iOnsicmVmZXJyYWxBcHAiOiJPbmVEcml2ZUZvckJ1c2luZXNzIiwicmVmZXJyYWxBcHBQbGF0Zm9ybSI6IldlYiIsInJlZmVycmFsTW9kZSI6InZpZXciLCJyZWZlcnJhbFZpZXciOiJNeUZpbGVzTGlua0NvcHkifX0&share=cQqOu4Zuv4uyRpqaxAU3RvtDEgUCR4fdRO0E6oceDxWiz2ZFFQ)
- Demo deployment: https://volmatch-kazakhstan.netlify.app

## Full mode and demo mode

The prototype works fully only with the backend (`npm start`, see below): accounts, events, registrations and hours are
stored in PostgreSQL and shared between all users. Without the server (for example on Netlify) the page is a visual
demo only: data stay in one browser and nothing is saved on a server.

## Requirements coverage (IDs from the SRS)

| Status | Requirements |
|---|---|
| Implemented | FR-01 – FR-21, FR-23 – FR-25, FR-27, FR-28, FR-32, FR-34 – FR-37, FR-39 |
| Partial | FR-22, FR-33, FR-38 |
| Next release | FR-26, FR-29, FR-30, FR-31 |

Main use case: UC-02 publish event → UC-01 register → UC-03 confirm attendance → UC-11 view confirmed hours.
Roles: volunteer, organizer, moderator, administrator; access is checked on the server (HTTP 401 / 403).

## Stack

- Frontend: HTML, CSS, JavaScript (`public/`), Leaflet 1.9.4 + OpenStreetMap
- Backend: Node.js 18+, Express, REST API under `/api` (`server/`)
- Database: PostgreSQL (`server/schema.sql`); an embedded PostgreSQL starts with the server, or set `DATABASE_URL`

## Run on localhost

Anyone can run the full version on their own computer. Requirements: Node.js 18 or newer (https://nodejs.org).
Download the project (green **Code** button → **Download ZIP**), unzip it, open a terminal in the folder and run:

```bash
npm install
cp .env.example .env      # Windows: copy .env.example .env
```

Open `.env` in any text editor, replace `change-me-please` with your own password (at least 8 characters) and save. Then:

```bash
npm start                 # open http://localhost:3000, stop with Ctrl+C
```

The first start creates the database with invented data (about a minute).

## Passwords

- Every person who runs the project chooses their own password in `.env` (`DEMO_PASSWORD`). The `.env` file stays on
  that computer and is never uploaded to GitHub, so no password is published.
- This password is used by all demo accounts: `volunteer@volmatch.demo`, `organizer@volmatch.demo`,
  `moderator@volmatch.demo`, `admin@volmatch.demo` (also `volunteer2@`, `volunteer3@`, `organizer2@`).
- It is set on the first start. To change it later: edit `.env`, run `npm run reset-db`, then `npm start`
  (this also restores the original data).
- New accounts created with the sign-up form have their own password (at least 8 characters).
- Passwords are stored only as salted scrypt hashes.
- On the demo deployment (Netlify) the login screen fills in the demo password itself; nothing is stored on a server.

## Tests

`npm test` runs the acceptance tests TC-01 – TC-24 on a separate temporary database.
Screen-level checks: `npm install --no-save playwright && npx playwright install chromium && npm run test:ui`.

## Licences

Code: MIT (`LICENSE`). Leaflet – BSD-2-Clause; map data © OpenStreetMap contributors (ODbL); Express, pg,
embedded-postgres – MIT. Event photos are open stock images. AI use is described in the AI Disclosure Statement of the report.
