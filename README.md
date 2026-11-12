Educational project for the course Business Analysis, Astana IT University. Not a real product or service. All data are fictional.

# VolMatch – volunteer matching platform (Team 03)

Working prototype for the Final Project (Software Requirements Specification) of the course *Requirements. Business Analysis*.
Supervisor: Nurkhat Ibadildin.

## Team

| Student | Group | SRS sections |
|---|---|---|
| Zhakzhan Alina | ITM-2402 | 1 – 4.1 |
| Abylkassym Korkem | ITM-2402 | 4.1 – 4.8 |
| Kuttybay Dilnaz | ITM-2402 | 4.8 – 5.4 |
| Balykbay Dilnaz | ITM-2402 | 5.5 – 7 |

## Links

- Demo video: *to be added*
- Demo deployment (demo mode, no server): https://volmatch-kazakhstan.netlify.app

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

```bash
npm install
cp .env.example .env      # set DEMO_PASSWORD
npm start                 # http://localhost:3000
```

`npm run reset-db` restores the seed data. `npm test` runs the acceptance tests TC-01 – TC-24
(results in `tests/results/acceptance-results.json`).

## Test accounts (invented)

`volunteer@volmatch.demo`, `organizer@volmatch.demo`, `moderator@volmatch.demo`, `admin@volmatch.demo`.
Password: the value of `DEMO_PASSWORD` in `.env` (not published; given to the examiner on request).

## Licences

Code: MIT (`LICENSE`). Leaflet – BSD-2-Clause; map data © OpenStreetMap contributors (ODbL); Express, pg,
embedded-postgres – MIT. Event photos are open stock images. AI use is described in the AI Disclosure Statement of the report.
