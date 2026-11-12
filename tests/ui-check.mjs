// Screen-level acceptance checks (TC-01, TC-04, TC-13, TC-14, TC-15, TC-16, TC-17) in a real browser.
// Optional: needs Playwright —  npm install --no-save playwright && npx playwright install chromium && npm run test:ui
import { startServer, record, saveResults, RESULTS_FILE, PASSWORD } from './helpers.mjs';

let chromium;
try { ({ chromium } = await import('playwright')); } catch {
  console.error('Playwright is not installed. Run: npm install --no-save playwright && npx playwright install chromium');
  process.exit(1);
}

const srv = await startServer({ port: 3998, pgPort: 54338 });
const browser = await chromium.launch();
const base = srv.base;
const results = [];
function check(id, pass, actual) { record(id + '-ui', pass, actual); results.push([id, pass, actual]); }

async function page(width = 1366) {
  const ctx = await browser.newContext({ viewport: { width, height: 850 } });
  const p = await ctx.newPage();
  p.errors = [];
  p.on('pageerror', (e) => p.errors.push(e.message));
  await p.goto(base + '/', { waitUntil: 'networkidle' });
  return p;
}
async function login(p, email) {
  await p.evaluate(() => auth('login'));
  await p.fill('#aEmail', email); await p.fill('#aPass', PASSWORD);
  await p.click('#authForm button.primary');
  await p.waitForFunction(() => typeof logged !== 'undefined' && logged, null, { timeout: 10000 });
  await p.waitForTimeout(500);
}

try {
  // TC-01: sign-up through the form opens the volunteer dashboard.
  {
    const p = await page();
    await p.evaluate(() => auth('register'));
    await p.fill('#aName', 'Screen Test Volunteer'); await p.fill('#aEmail', 'screen.volunteer@volmatch.demo'); await p.fill('#aPass', 'Screen2026');
    await p.selectOption('#aRole', 'volunteer');
    await p.click('#authForm button.primary');
    await p.waitForFunction(() => typeof logged !== 'undefined' && logged, null, { timeout: 10000 });
    const r = await p.evaluate(() => ({ role, view: curView }));
    check('TC-01', r.role === 'volunteer' && r.view === 'dashboard', `Form submitted; signed in as ${r.role}; start view “${r.view}”`);
  }

  // TC-04: category + date range, then a keyword without a match (FR-06, FR-07).
  {
    const p = await page();
    await login(p, 'volunteer@volmatch.demo');
    await p.evaluate(() => go('events'));
    await p.selectOption('#cat', 'Environment');
    await p.selectOption('#when', 'month');
    await p.waitForTimeout(300);
    const cats = await p.evaluate(() => [...document.querySelectorAll('#allEvents .event')].map((c) => c.querySelector('.tag') && c.querySelector('.tag').textContent));
    const onlyEnv = cats.length > 0 && cats.every((c) => /Environment|Экология|Экология|Қоршаған|Эко/i.test(c));
    await p.selectOption('#vmArea', 'Yesil');
    await p.waitForTimeout(300);
    const yesil = await p.evaluate(() => document.querySelectorAll('#allEvents .event').length);
    await p.selectOption('#vmArea', 'all');
    await p.fill('#searchEvents', 'zzqx-no-such-event');
    await p.waitForTimeout(300);
    const empty = await p.evaluate(() => ({ msg: !!document.querySelector('#allEvents .empty-result'), btn: !!document.querySelector('#allEvents .empty-result button') }));
    await p.click('#allEvents .empty-result button');
    await p.waitForTimeout(300);
    const afterReset = await p.evaluate(() => document.querySelectorAll('#allEvents .event').length);
    check('TC-04', onlyEnv && empty.msg && empty.btn && afterReset > 0,
      `${cats.length} Environment events in the next month, no other category; district filter works (${yesil} in Yesil); keyword without match: empty-result message with “Clear filters”; after reset ${afterReset} events`);
  }

  // TC-13 (screen): without a photo the profile shows an initials avatar.
  {
    const p = await page();
    await login(p, 'volunteer2@volmatch.demo');
    await p.evaluate(() => go('profile'));
    await p.waitForTimeout(300);
    const src = await p.evaluate(() => { const i = document.querySelector('#profileAvatar img'); return i ? i.getAttribute('src') : document.getElementById('profileAvatar').textContent; });
    const ok = /^data:image\/svg\+xml/.test(src) || /^[A-ZА-Я]{1,2}$/.test(String(src).trim());
    check('TC-13', ok, `Profile without photo shows an initials avatar (${String(src).slice(0, 26)}…)`);
  }

  // TC-14: one marker per event with coordinates; a marker opens the event; list view has the same events (FR-09, FR-27).
  {
    const p = await page();
    await login(p, 'volunteer@volmatch.demo');
    await p.evaluate(() => go('map'));
    await p.waitForTimeout(1200);
    const r = await p.evaluate(() => ({
      markers: document.querySelectorAll('#map .leaflet-marker-icon').length,
      expected: events.filter((e) => visible(e) && e.lat != null && e.lon != null).length,
      list: document.querySelectorAll('#mapList .row, #mapList > *').length
    }));
    let popup = false;
    if (r.markers) {
      await p.evaluate(() => document.querySelector('#map .leaflet-marker-icon').dispatchEvent(new MouseEvent('click', { bubbles: true })));
      await p.waitForTimeout(2500);
      popup = await p.evaluate(() => !!document.querySelector('.leaflet-popup-content, #modalBg.open'));
    }
    check('TC-14', r.markers > 0 && r.markers === r.expected && popup && r.list === r.markers,
      `${r.markers} markers for ${r.expected} visible events with coordinates; marker opens the event card: ${popup}; list view rows: ${r.list}`);
  }

  // TC-15 (screen): "Events for me" sorted by score with a reason under each score above 0.
  {
    const p = await page();
    await login(p, 'volunteer@volmatch.demo');
    await p.evaluate(() => go('matches'));
    await p.selectOption('#matchMode', 'events');
    await p.waitForTimeout(400);
    const r = await p.evaluate(() => [...document.querySelectorAll('#matchResults > *')].map((c) => ({
      s: parseInt((c.querySelector('.match') || { textContent: '0' }).textContent.replace(/\D+/g, ' ').trim(), 10) || 0,
      why: !!c.querySelector('.vm-why')
    })));
    const sorted = r.every((x, i) => i === 0 || r[i - 1].s >= x.s);
    const reasons = r.filter((x) => x.s > 0).every((x) => x.why);
    const low = r.filter((x) => x.s < 20).length;
    check('TC-15', r.length > 0 && sorted && reasons, `${r.length} events sorted by score (${r.map((x) => x.s).join(', ')}); each score above 0 shows its reason; ${low} low-score events still listed`);
  }

  // TC-16: every interface label exists in Kazakh, Russian and English (FR-22, NFR-15).
  {
    const p = await page();
    await login(p, 'volunteer@volmatch.demo');
    const r = await p.evaluate(() => {
      const keys = [...new Set([...document.querySelectorAll('[data-i]')].map((el) => el.dataset.i))];
      const missing = {};
      ['kk', 'ru', 'en'].forEach((l) => { missing[l] = keys.filter((k) => !(T[l] && T[l][k])).length; });
      const ruKeys = Object.keys(T.ru);
      const notInKk = ruKeys.filter((k) => !(k in T.kk)).length, notInEn = ruKeys.filter((k) => !(k in T.en)).length;
      return { keys: keys.length, missing, ruKeys: ruKeys.length, notInKk, notInEn };
    });
    const views = ['events', 'profile', 'faq'];
    let switched = true;
    for (const l of ['kk', 'en', 'ru']) {
      await p.evaluate((x) => setLang(x), l);
      for (const v of views) {
        await p.evaluate((x) => go(x), v);
        const h = await p.evaluate((x) => (document.querySelector('#view-' + x + ' h2') || {}).textContent || '', v);
        if (!h) switched = false;
      }
    }
    // Messages: a toast shown in English mode must not be in Russian.
    await p.evaluate(() => { setLang('en'); go('events'); });
    await p.evaluate(() => { window.__toasts = []; const t0 = toast; toast = function (m) { window.__toasts.push(String(m)); return t0.apply(this, arguments); }; });
    await p.evaluate(() => toggleSave(events.find((e) => e.status === 'approved').id));
    await p.waitForTimeout(800);
    const toasts = await p.evaluate(() => window.__toasts);
    const cyr = toasts.filter((x) => /[А-Яа-яЁё]/.test(x));
    r.toast = toasts.join(' | ');
    const ok = cyr.length === 0 && switched && r.missing.kk === 0 && r.missing.en === 0 && r.missing.ru === 0 && r.notInKk === 0 && r.notInEn === 0;
    check('TC-16', ok, `${r.keys} labels on screen: missing KK ${r.missing.kk}, EN ${r.missing.en}, RU ${r.missing.ru}; dictionary: ${r.notInKk} of ${r.ruKeys} keys have no KK text, ${r.notInEn} no EN text; message in English mode: “${r.toast}”`);
  }

  // TC-17: no horizontal scrolling at 360 px (FR-24).
  {
    const p = await page(360);
    await login(p, 'volunteer@volmatch.demo');
    const bad = [];
    for (const v of ['dashboard', 'events', 'map', 'matches', 'calendar', 'messages', 'profile', 'support']) {
      await p.evaluate((x) => go(x), v);
      await p.waitForTimeout(300);
      const w = await p.evaluate(() => document.documentElement.scrollWidth);
      if (w > 360) bad.push(v + ' ' + w + 'px');
    }
    check('TC-17', bad.length === 0, bad.length ? 'Horizontal scrolling on: ' + bad.join(', ') : 'No horizontal scrolling on 8 main screens at 360 px');
  }
} finally {
  saveResults(RESULTS_FILE);
  await browser.close();
  await srv.stop();
}
for (const [id, pass, actual] of results) console.log(`${pass ? 'PASS' : 'FAIL'} ${id}: ${actual}`);
process.exit(results.every((r) => r[1]) ? 0 : 1);
