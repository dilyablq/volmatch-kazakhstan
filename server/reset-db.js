// Deletes all data and loads the invented seed data again: npm run reset-db
import { connect, q, close } from './db.js';

await connect();
await q(`DROP TABLE IF EXISTS sessions, ticket_messages, support_tickets, reports, messages, conversations, saved_events,
  participations, event_tags, events, organizations, user_tags, tags, audit_log, platform_settings, users CASCADE`);
await close();
console.log('Database cleared. Run "npm start": the seed data are loaded again on start.');
