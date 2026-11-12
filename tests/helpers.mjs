// Test helpers: start a VolMatch server with an empty database and call the API like the browser does.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// A new random password for every test run (the tests use their own temporary database).
export const PASSWORD = 'T' + crypto.randomBytes(9).toString('hex');

export async function startServer({ port = 3999, pgPort = 54339 } = {}) {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'volmatch-test-'));
  fs.rmSync(dataDir, { recursive: true, force: true });
  const proc = spawn(process.execPath, ['server/index.js'], {
    cwd: root,
    env: { ...process.env, PORT: String(port), PG_PORT: String(pgPort), PG_DATA_DIR: dataDir, DEMO_PASSWORD: PASSWORD, DATABASE_URL: '' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let log = '';
  proc.stdout.on('data', (d) => (log += d));
  proc.stderr.on('data', (d) => (log += d));
  const base = `http://localhost:${port}`;
  for (let i = 0; i < 240; i++) {
    try {
      const r = await fetch(base + '/api/bootstrap');
      if (r.ok) return { base, stop: () => stop(proc, dataDir) };
    } catch { /* not ready yet */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  proc.kill('SIGTERM');
  throw new Error('Server did not start:\n' + log);
}

function stop(proc, dataDir) {
  return new Promise((resolve) => {
    proc.on('exit', () => { fs.rmSync(dataDir, { recursive: true, force: true }); resolve(); });
    proc.kill('SIGTERM');
  });
}

export class Client {
  constructor(base) { this.base = base; this.cookie = ''; }
  async call(method, url, body) {
    const res = await fetch(this.base + url, {
      method,
      headers: { 'Content-Type': 'application/json', 'X-VolMatch': '1', ...(this.cookie ? { Cookie: this.cookie } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const set = res.headers.get('set-cookie');
    if (set) this.cookie = set.split(';')[0];
    let data = null;
    try { data = await res.json(); } catch { /* no body */ }
    return { status: res.status, data, headers: res.headers };
  }
  login(email, password = PASSWORD) { return this.call('POST', '/api/auth/login', { email, password }); }
  boot() { return this.call('GET', '/api/bootstrap').then((r) => r.data); }
}

export async function as(base, email) {
  const c = new Client(base);
  const r = await c.login(email);
  if (r.status !== 200) throw new Error(`Login failed for ${email}: ${r.status}`);
  return c;
}

const results = {};
export function record(id, pass, actual) { results[id] = { pass, actual }; }
export function saveResults(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const old = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
  fs.writeFileSync(file, JSON.stringify({ ...old, ...results, runAt: new Date().toISOString() }, null, 2));
}
export const RESULTS_FILE = path.join(root, 'tests', 'results', 'acceptance-results.json');
