-- VolMatch database schema (PostgreSQL).
-- Educational project for the course Business Analysis, Astana IT University. All data are fictional.
-- Entities follow the ERD in the report (Appendix B.5, Figure B5).

CREATE TABLE IF NOT EXISTS users (
  user_id        SERIAL PRIMARY KEY,
  email          TEXT NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,
  full_name      TEXT NOT NULL,
  role           TEXT NOT NULL CHECK (role IN ('volunteer', 'organizer', 'moderator', 'admin')),
  age_band       TEXT NOT NULL DEFAULT '18_plus' CHECK (age_band IN ('under_18', '18_plus')),
  city           TEXT NOT NULL DEFAULT '',
  availability   TEXT NOT NULL DEFAULT '',
  about          TEXT NOT NULL DEFAULT '',
  photo          TEXT NOT NULL DEFAULT '',
  hide_name      BOOLEAN NOT NULL DEFAULT FALSE,
  is_blocked     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login     TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS sessions (
  token       TEXT PRIMARY KEY,
  user_id     INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS tags (
  tag_id  SERIAL PRIMARY KEY,
  name    TEXT NOT NULL,
  type    TEXT NOT NULL CHECK (type IN ('interest', 'skill')),
  UNIQUE (name, type)
);

CREATE TABLE IF NOT EXISTS user_tags (
  user_id  INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  tag_id   INT NOT NULL REFERENCES tags(tag_id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, tag_id)
);

CREATE TABLE IF NOT EXISTS organizations (
  organization_id      SERIAL PRIMARY KEY,
  owner_user_id        INT NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
  name                 TEXT NOT NULL,
  org_type             TEXT NOT NULL DEFAULT 'organization' CHECK (org_type IN ('organization', 'person')),
  contact_person       TEXT NOT NULL DEFAULT '',
  website              TEXT NOT NULL DEFAULT '',
  about                TEXT NOT NULL DEFAULT '',
  verification_status  TEXT NOT NULL DEFAULT 'none' CHECK (verification_status IN ('none', 'pending', 'verified', 'needs_info')),
  verification_note    TEXT NOT NULL DEFAULT '',
  submitted_at         TIMESTAMPTZ,
  reviewed_at          TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS events (
  event_id         SERIAL PRIMARY KEY,
  organization_id  INT NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  category         TEXT NOT NULL,
  description      TEXT NOT NULL DEFAULT '',
  location         TEXT NOT NULL,
  area             TEXT NOT NULL DEFAULT '',
  latitude         NUMERIC(9,6),
  longitude        NUMERIC(9,6),
  start_time       TIMESTAMP NOT NULL,
  end_time         TIMESTAMP NOT NULL,
  capacity         INT NOT NULL CHECK (capacity > 0),
  min_age          INT NOT NULL DEFAULT 0,
  status           TEXT NOT NULL CHECK (status IN ('draft', 'pending', 'approved', 'rejected', 'suspended')),
  review_reason    TEXT NOT NULL DEFAULT '',
  emoji            TEXT NOT NULL DEFAULT '',
  cover            TEXT NOT NULL DEFAULT 'green',
  images           JSONB NOT NULL DEFAULT '[]',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_time > start_time)
);

CREATE TABLE IF NOT EXISTS event_tags (
  event_id  INT NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
  tag_id    INT NOT NULL REFERENCES tags(tag_id) ON DELETE CASCADE,
  PRIMARY KEY (event_id, tag_id)
);

-- One row per volunteer and event: the primary key makes a second active registration impossible (FR-13, NFR-16).
CREATE TABLE IF NOT EXISTS participations (
  user_id        INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  event_id       INT NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
  status         TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'cancelled')),
  attended       BOOLEAN NOT NULL DEFAULT FALSE,
  registered_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at   TIMESTAMPTZ,
  PRIMARY KEY (user_id, event_id)
);

CREATE TABLE IF NOT EXISTS saved_events (
  user_id   INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  event_id  INT NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
  saved_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, event_id)
);

CREATE TABLE IF NOT EXISTS conversations (
  conversation_id  SERIAL PRIMARY KEY,
  user_id          INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  other_user_id    INT REFERENCES users(user_id) ON DELETE CASCADE,
  kind             TEXT NOT NULL DEFAULT 'direct' CHECK (kind IN ('direct', 'system')),
  event_title      TEXT NOT NULL DEFAULT '',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messages (
  message_id       SERIAL PRIMARY KEY,
  conversation_id  INT NOT NULL REFERENCES conversations(conversation_id) ON DELETE CASCADE,
  sender_user_id   INT REFERENCES users(user_id) ON DELETE SET NULL,
  content          TEXT NOT NULL,
  sent_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Complaints about events (FR-35). conversation_id is set when a complaint refers to a conversation (FR-19).
CREATE TABLE IF NOT EXISTS reports (
  report_id        SERIAL PRIMARY KEY,
  reporter_id      INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  event_id         INT REFERENCES events(event_id) ON DELETE SET NULL,
  conversation_id  INT REFERENCES conversations(conversation_id) ON DELETE SET NULL,
  category         TEXT NOT NULL,
  message          TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_review', 'resolved', 'rejected')),
  resolution       TEXT NOT NULL DEFAULT '',
  handled_by       INT REFERENCES users(user_id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Support tickets (FR-39) and their replies.
CREATE TABLE IF NOT EXISTS support_tickets (
  ticket_id   SERIAL PRIMARY KEY,
  user_id     INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  subject     TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT '',
  message     TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ticket_messages (
  ticket_message_id  SERIAL PRIMARY KEY,
  ticket_id          INT NOT NULL REFERENCES support_tickets(ticket_id) ON DELETE CASCADE,
  author_user_id     INT REFERENCES users(user_id) ON DELETE SET NULL,
  is_staff           BOOLEAN NOT NULL DEFAULT FALSE,
  content            TEXT NOT NULL,
  sent_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit log (FR-37, NFR-09): the target is stored as a type and an id without a foreign key.
CREATE TABLE IF NOT EXISTS audit_log (
  log_id         SERIAL PRIMARY KEY,
  actor_user_id  INT REFERENCES users(user_id) ON DELETE SET NULL,
  action         TEXT NOT NULL,
  target_type    TEXT NOT NULL,
  target_id      TEXT NOT NULL,
  reason         TEXT NOT NULL DEFAULT '',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS platform_settings (
  setting_key  TEXT PRIMARY KEY,
  value        TEXT NOT NULL
);
