// Database connection.
// If DATABASE_URL is set (for example postgres://user:pass@localhost:5432/volmatch), that PostgreSQL server is used.
// Otherwise the server starts a local embedded PostgreSQL in the folder .pgdata, so no separate installation is needed.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const here = path.dirname(fileURLToPath(import.meta.url));
let pool = null;
let embedded = null;

export async function connect() {
  if (pool) return pool;
  if (process.env.DATABASE_URL) {
    pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  } else {
    const { default: EmbeddedPostgres } = await import('embedded-postgres');
    const dir = path.resolve(process.env.PG_DATA_DIR || path.resolve(here, '..', '.pgdata'));
    const port = Number(process.env.PG_PORT) || 54329;
    const password = process.env.PG_PASSWORD || 'volmatch-local-only';
    const isRoot = typeof process.getuid === 'function' && process.getuid() === 0;
    embedded = new EmbeddedPostgres({ databaseDir: dir, user: 'volmatch', password, port, persistent: true, createPostgresUser: isRoot, onLog: () => {} });
    const fresh = !fs.existsSync(path.join(dir, 'PG_VERSION'));
    if (fresh) await embedded.initialise();
    await embedded.start();
    if (fresh) await embedded.createDatabase('volmatch');
    pool = new pg.Pool({ host: 'localhost', port, user: 'volmatch', password, database: 'volmatch' });
  }
  await pool.query(fs.readFileSync(path.join(here, 'schema.sql'), 'utf8'));
  return pool;
}

export function q(text, params) {
  return pool.query(text, params);
}

export async function tx(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const out = await fn((text, params) => client.query(text, params));
    await client.query('COMMIT');
    return out;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function close() {
  if (pool) await pool.end();
  pool = null;
  if (embedded) await embedded.stop();
  embedded = null;
}
