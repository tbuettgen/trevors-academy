/* Trevor's Academy — single-page app (vanilla JS, no build step).
   All course content arrives AES-GCM encrypted; the password-derived key decrypts it in the browser. */

// ============================================================ utilities
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const app = document.getElementById('app');
const LETTERS = 'ABCDEFGHIJKL';
const PALETTE = ['#1865f2', '#12a150', '#7148f2', '#d9720b', '#0b9fa8', '#d42a1a', '#c2187a', '#4f5bd5', '#5f8a00', '#b45309', '#0e7c66', '#8e44ad'];
const fmtMin = m => { m = Math.round(m); const h = Math.floor(m / 60), r = m % 60; return h ? `${h}h ${String(r).padStart(2, '0')}m` : `${r} min`; };
const fmtClock = sec => { const s = Math.max(0, Math.floor(sec)); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(r).padStart(2, '0'); };
const pct = x => Math.round((x || 0) * 100);
const sum = a => a.reduce((x, y) => x + y, 0);
let cleanups = [];
const onCleanup = fn => cleanups.push(fn);

const store = {
  get(k, d) { try { const v = localStorage.getItem('ta:' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('ta:' + k, JSON.stringify(v)); } catch { } },
  del(k) { try { localStorage.removeItem('ta:' + k); } catch { } },
};
const settings = Object.assign({ theme: 'light', rate: 1, autoAdvance: true, transcript: false, voiceMode: 'auto', voice: '' }, store.get('settings', {}));
const saveSettings = () => store.set('settings', settings);
// one-time migration: the old default was 'auto' (follow device); light is now the default
if (!settings.themeV2) { if (settings.theme === 'auto') settings.theme = 'light'; settings.themeV2 = 1; saveSettings(); }

function toast(msg, ms = 2400) {
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t);
  setTimeout(() => t.remove(), ms);
}

// ============================================================ icons
const ICONS = {
  play: '<path d="M7 4.5v15l12.5-7.5z" fill="currentColor" stroke="none"/>',
  pause: '<rect x="6" y="4.5" width="4" height="15" rx="1" fill="currentColor" stroke="none"/><rect x="14" y="4.5" width="4" height="15" rx="1" fill="currentColor" stroke="none"/>',
  prev: '<polyline points="15 18 9 12 15 6"/>', next: '<polyline points="9 18 15 12 9 6"/>',
  check: '<polyline points="20 6 9 17 4 12"/>', x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  clock: '<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/>',
  flag: '<path d="M5 21V4h12l-2 4 2 4H5"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  cc: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M10.5 10.2a2.2 2.2 0 1 0 0 3.6M17 10.2a2.2 2.2 0 1 0 0 3.6"/>',
  expand: '<path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/>',
  list: '<line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
  print: '<polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  bulb: '<path d="M9 18h6M10 21.5h4M12 2.5a6.8 6.8 0 0 0-4 12.3V17h8v-2.2a6.8 6.8 0 0 0-4-12.3z"/>',
  eye: '<path d="M1.5 12S5.5 4.5 12 4.5 22.5 12 22.5 12 18.5 19.5 12 19.5 1.5 12 1.5 12z"/><circle cx="12" cy="12" r="3"/>',
  vol: '<path d="M11 5 6 9H2v6h4l5 4z" fill="currentColor"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
  redo: '<polyline points="1 4 1 10 7 10"/><path d="M3.5 15a9 9 0 1 0 2.1-9.4L1 10"/>',
  home: '<path d="M3 11 12 3l9 8v9a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
  bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
  sheet: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="14" y2="17"/>',
  mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4M8 22h8"/>',
  headset: '<path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="2.5" y="14" width="4" height="7" rx="1.5"/><rect x="17.5" y="14" width="4" height="7" rx="1.5"/>',
  sigma: '<path d="M18 5V4H6l6 8-6 8h12v-1"/>',
  pausec: '<circle cx="12" cy="12" r="9"/><line x1="10" y1="9" x2="10" y2="15"/><line x1="14" y1="9" x2="14" y2="15"/>',
};
const icon = (n, cls = 'i') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ''}</svg>`;
const LOGO = `<svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="15" fill="#fff" fill-opacity=".1"/><path d="M12 26 32 16l20 10-20 10z" fill="#fff"/><path d="M20 31v9.5c0 3.4 5.4 6.5 12 6.5s12-3.1 12-6.5V31l-12 6z" fill="#63a4ff"/><path d="M52 26v11" stroke="#ffc94d" stroke-width="3" stroke-linecap="round"/><circle cx="52" cy="39" r="2.6" fill="#ffc94d"/></svg>`;
const CREST = `<svg class="crest" viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="16" fill="#041e42"/><path d="M12 26 32 16l20 10-20 10z" fill="#fff"/><path d="M20 31v9.5c0 3.4 5.4 6.5 12 6.5s12-3.1 12-6.5V31l-12 6z" fill="#63a4ff"/><path d="M52 26v11" stroke="#ffc94d" stroke-width="3" stroke-linecap="round"/><circle cx="52" cy="39" r="2.6" fill="#ffc94d"/></svg>`;

// ============================================================ math / rich text
function tex(s) {
  if (s == null) return '';
  s = String(s);
  if (!window.katex) return s;
  return s.replace(/\\\(([\s\S]*?)\\\)|\\\[([\s\S]*?)\\\]/g, (m, a, b) => {
    try { return katex.renderToString(a ?? b, { displayMode: b != null, throwOnError: false, output: 'html' }); } catch { return esc(m); }
  });
}
const rich = (html, cls = '') => `<div class="rich ${cls}">${tex(html)}</div>`;
const texBlock = t => { try { return katex.renderToString(t, { displayMode: true, throwOnError: false }); } catch { return esc(t); } };
const plain = html => String(html ?? '').replace(/<[^>]+>/g, ' ').replace(/\\\(|\\\)|\\\[|\\\]/g, '').replace(/\s+/g, ' ').trim();

// ============================================================ crypto
const b64 = { dec: s => Uint8Array.from(atob(s), c => c.charCodeAt(0)), enc: u8 => btoa(String.fromCharCode(...u8)) };
let KEY = null, DATA = null, META = null, RAW = null;
async function deriveRaw(password, meta) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: b64.dec(meta.salt), iterations: meta.iter, hash: 'SHA-256' }, base, 256);
  return new Uint8Array(bits);
}
async function decryptBuf(key, buf) {
  const u = new Uint8Array(buf);
  return crypto.subtle.decrypt({ name: 'AES-GCM', iv: u.slice(0, 12) }, key, u.slice(12));
}
async function gunzip(buf) {
  const ds = new DecompressionStream('gzip');
  return new Response(new Blob([buf]).stream().pipeThrough(ds)).arrayBuffer();
}
// network failures surface as Error('fetch') so a dropped connection never clears the remembered key
const getBuf = url => fetch(url).then(r => r.ok ? r.arrayBuffer() : null).catch(() => { throw new Error('fetch'); });
const getMeta = () => fetch('data/meta.json?t=' + Date.now(), { cache: 'no-store' }).then(r => r.json());
async function loadBundle(key, meta) {
  // bundle-<version>.bin is a new URL per deploy, so GitHub Pages' CDN (which ignores ?v=) can't hand back an older bundle
  const buf = await getBuf(`data/bundle-${meta.version}.bin`) || await getBuf('data/bundle.bin?v=' + meta.version);
  if (!buf) throw new Error('fetch');
  const plainBuf = await decryptBuf(key, buf); // throws on wrong password (GCM auth)
  return JSON.parse(new TextDecoder().decode(await gunzip(plainBuf)));
}
async function unlock(raw) {
  const key = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['decrypt']);
  DATA = await loadBundle(key, META);
  KEY = key; RAW = raw;
}

// ---- new deploys reach open tabs: a tab can stay open for days and the CDN caches meta.json for ~10 minutes,
// so look for a newer version when the tab comes back, every few minutes, and whenever an encrypted file fails to load
let updating = null, lastCheck = Date.now(), badVersion = null;
function checkForUpdate(force) {
  if (!KEY) return Promise.resolve(false);
  if (updating) return updating;
  if (!force && Date.now() - lastCheck < 60000) return Promise.resolve(false);
  lastCheck = Date.now();
  updating = (async () => {
    try {
      const m = await getMeta();
      if (!m || m.version === META.version || m.version === badVersion) return false;
      if (m.built && META.built && m.built < META.built) return false; // a CDN edge still serving an older deploy
      try { DATA = await loadBundle(KEY, m); META = m; return true; }
      catch (e) {
        if (e && e.message === 'fetch') return false; // offline: try again next time
        // the new bundle doesn't open with this key, so the password changed: reload once to reach the login screen
        // (once per version, in case a CDN edge hands the reloaded page the previous meta.json)
        badVersion = m.version;
        let seen = null; try { seen = sessionStorage.getItem('ta:pwchange'); sessionStorage.setItem('ta:pwchange', m.version); } catch { }
        if (seen !== m.version) location.reload();
        return false;
      }
    } catch { return false; } finally { updating = null; }
  })();
  return updating;
}
// pages that show bundle content without in-progress state are redrawn at once; lessons, practice and exams pick up
// the new content on the next navigation
function refreshIfIdle() {
  const kind = location.hash.replace(/^#\/?/, '').split('/')[1];
  if (kind === 'cheatsheet' && !$('#tutor')) route();
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkForUpdate().then(u => u && refreshIfIdle()); });
setInterval(() => { if (document.visibilityState === 'visible') checkForUpdate().then(u => u && refreshIfIdle()); }, 5 * 60000);

async function boot() {
  applyTheme();
  try { META = await getMeta(); }
  catch { app.innerHTML = `<div class="boot"><p class="muted">Couldn't load the site data. Check your connection and refresh.</p></div>`; return; }
  const saved = store.get('key');
  if (saved && saved.salt === META.salt) {
    try { await unlock(b64.dec(saved.k)); return start(); } catch (e) { if (!(e && e.message === 'fetch')) store.del('key'); }
  }
  renderLogin();
}

function renderLogin(msg = '') {
  app.innerHTML = `<div class="login"><div class="login-card">${CREST}
    <h1>Trevor's Academy</h1><p>Private study hub for the MSB Scholars. Enter the password to unlock the courses.</p>
    <form id="lf" autocomplete="on">
      <input class="field" id="pw" name="password" type="password" autocomplete="current-password" placeholder="Password" aria-label="Password" required>
      <label class="check"><input type="checkbox" id="rem" checked> Remember this device</label>
      <div class="login-err" id="lerr">${esc(msg)}</div>
      <button class="btn big" type="submit" id="lbtn">${icon('lock')} Unlock</button>
    </form></div></div>`;
  const f = $('#lf'), btn = $('#lbtn');
  setTimeout(() => $('#pw')?.focus(), 50);
  f.addEventListener('submit', async e => {
    e.preventDefault();
    btn.disabled = true; btn.innerHTML = `<span class="spinner" style="width:18px;height:18px;border-width:2px"></span> Unlocking…`;
    try {
      const raw = await deriveRaw($('#pw').value, META);
      await unlock(raw);
      if ($('#rem').checked) store.set('key', { salt: META.salt, k: b64.enc(raw) });
      start();
    } catch (err) {
      btn.disabled = false; btn.innerHTML = `${icon('lock')} Unlock`;
      $('#lerr').textContent = err && err.message === 'fetch' ? 'Network error, please try again.' : 'Wrong password. Try again.';
      $('.login-card').classList.remove('shake'); void $('.login-card').offsetWidth; $('.login-card').classList.add('shake');
      $('#pw').select();
    }
  });
}

function applyTheme() {
  const t = settings.theme;
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme;
}
const isDark = () => document.documentElement.dataset.theme === 'dark' || (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);

async function start() {
  for (let i = 0; i < 100 && !window.katex; i++) await new Promise(r => setTimeout(r, 50));
  if (!store.get('email')) return renderEmailGate();
  flushLog();
  window.addEventListener('hashchange', route);
  route();
}
// ---- usage log on Trevor's Mac mini (who uses the site); failures are silent
let tokenPromise = null;
function accessToken() {
  return tokenPromise || (tokenPromise = crypto.subtle.digest('SHA-256', new TextEncoder().encode('trevors-academy|' + b64.enc(RAW)))
    .then(h => [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join('')));
}
const serverUrl = () => DATA && DATA.server && DATA.server.url;
// events queue on the device until Trevor's server is reachable, so no sign-in is lost
async function logUsage(event, course = '', detail = '') {
  const email = store.get('email'); if (!email) return;
  const q = store.get('logq', []); q.push({ email, event, course, detail, at: new Date().toISOString() }); store.set('logq', q.slice(-200));
  flushLog();
}
let flushing = false;
async function flushLog() {
  if (flushing || !serverUrl() || !RAW || !(DATA.server && DATA.server.live)) return;
  flushing = true;
  try {
    const tok = await accessToken();
    for (let q = store.get('logq', []); q.length; q = store.get('logq', [])) {
      const ev = q[0];
      const r = await fetch(serverUrl() + '/api/log', { method: 'POST', headers: { 'content-type': 'application/json', 'x-academy-token': tok }, body: JSON.stringify({ ...ev, detail: (ev.detail ? ev.detail + ' · ' : '') + 'at ' + ev.at }) });
      if (!r.ok && r.status !== 400) break;
      store.set('logq', store.get('logq', []).slice(1));
    }
  } catch { } finally { flushing = false; }
}
function logVisit(cid) {
  const k = 'visit:' + new Date().toISOString().slice(0, 10) + ':' + cid;
  if (store.get(k)) return; store.set(k, 1); logUsage('visit', cid);
}
function renderEmailGate(msg = '') {
  app.innerHTML = `<div class="login"><div class="login-card">${CREST}
    <h1>One more step</h1><p>Enter your email to continue. Trevor uses it only to see who's studying with the site.</p>
    <form id="ef"><input class="field" id="em" type="email" autocomplete="email" placeholder="you@georgetown.edu" aria-label="Email" required>
      <div class="login-err" id="eerr">${esc(msg)}</div>
      <button class="btn big" type="submit">Continue ${icon('next')}</button></form>
    <p class="small muted" style="margin-top:14px">Saved on this device only, so you won't be asked again.</p></div></div>`;
  setTimeout(() => $('#em')?.focus(), 50);
  $('#ef').onsubmit = e => {
    e.preventDefault();
    const v = $('#em').value.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) { $('#eerr').textContent = 'That doesn\'t look like an email address.'; return; }
    store.set('email', v); logUsage('signin'); start();
  };
}

// ============================================================ course data helpers
const courseById = id => DATA.courses.find(c => c.id === id);
const unitColor = u => u.color || PALETTE[((u.num || 1) - 1) % PALETTE.length];
function allLessons(c) { return c.units.flatMap(u => u.lessons.map(l => ({ ...l, unit: u }))); }
function findLesson(c, lid) { for (const u of (c.cram ? [...c.units, c.cram] : c.units)) { const l = u.lessons.find(x => x.id === lid); if (l) return { u, l }; } return {}; }
function walkQ(q, fn) { fn(q); (q.parts || []).forEach(p => walkQ(p, fn)); }
function allQuestions(c) {
  const out = [];
  c.units.forEach(u => { u.lessons.forEach(l => (l.practice || []).forEach(q => out.push({ q, u, l }))); (u.unitQuiz || []).forEach(q => out.push({ q, u, quiz: true })); });
  return out;
}
// Quick check = up to 3 exam-representative questions per lesson (flagged "core" by the authors, else the first auto-graded ones)
function coreQs(l) {
  const qs = l.practice || [];
  const marked = qs.filter(q => q.core);
  if (marked.length) return marked;
  const auto = qs.filter(q => q.type !== 'open'), rest = qs.filter(q => q.type === 'open');
  return [...auto, ...rest].slice(0, 3);
}
const words = s => String(s || '').split(/\s+/).filter(Boolean).length;
// minutes: narration at 1.25x (150 wpm base) + a few seconds per slide + a per-type estimate per quick-check question
const Q_MIN = { mc: 0.8, tf: 0.6, tfgroup: 1.2, numeric: 1.6, open: 2, group: 2.5 };
const qMin = q => Q_MIN[q.type] || 1;
function lessonMinutes(l) { return sum(l.slides.map(s => words(s.narration) / 150 / 1.25 + 0.12)) + sum(coreQs(l).map(qMin)); }
function unitMinutes(u) { return sum(u.lessons.map(lessonMinutes)); }
function unitAllMinutes(u) { return sum(u.lessons.map(l => sum(l.slides.map(s => words(s.narration) / 150 + 0.15)) + sum((l.practice || []).map(qMin)))) + sum((u.unitQuiz || []).map(qMin)); }
const slideCount = c => sum(c.units.map(u => sum(u.lessons.map(l => l.slides.length))));
const qCount = c => sum(c.units.map(u => sum(u.lessons.map(l => (l.practice || []).length)) + (u.unitQuiz || []).length));
const courseMinutes = c => sum(c.units.map(unitMinutes));

// ============================================================ progress
const progCache = {};
function P(cid) { return progCache[cid] || (progCache[cid] = Object.assign({ seen: {}, q: {}, quiz: {}, exams: [], last: null }, store.get('p:' + cid, {}))); }
function saveP(cid) { store.set('p:' + cid, P(cid)); }
function markSeen(cid, lid, sid) { const p = P(cid); const a = p.seen[lid] || (p.seen[lid] = []); if (!a.includes(sid)) { a.push(sid); saveP(cid); } }
function lessonSeenFrac(cid, l) { return Math.min(1, (P(cid).seen[l.id] || []).filter(id => l.slides.some(s => s.id === id)).length / Math.max(1, l.slides.length)); }
function qScore(cid, qid) { const r = P(cid).q[qid]; if (!r) return null; return r.c ? 1 : r.s ? 0.5 : 0; }
function recordQ(cid, qid, firstCorrect, solved, revealed) {
  const p = P(cid); const r = p.q[qid];
  if (!r) p.q[qid] = { c: !!firstCorrect, s: !!solved, r: !!revealed, t: Date.now() };
  else { r.c = r.c || !!firstCorrect; r.s = r.s || !!solved; r.r = r.r || !!revealed; r.t = Date.now(); }
  saveP(cid);
}
function lessonPracticeFrac(cid, l) {
  const qs = coreQs(l); if (!qs.length) return lessonSeenFrac(cid, l);
  return sum(qs.map(q => qScore(cid, q.id) || 0)) / qs.length;
}
function lessonMastery(cid, l) { return 0.4 * lessonSeenFrac(cid, l) + 0.6 * lessonPracticeFrac(cid, l); }
function unitMastery(cid, u) {
  const ls = u.lessons.length ? sum(u.lessons.map(l => lessonMastery(cid, l))) / u.lessons.length : 0;
  const qz = (u.unitQuiz || []).length ? (P(cid).quiz[u.id] || 0) : ls;
  return 0.75 * ls + 0.25 * qz;
}
function courseMastery(c) { return c.units.length ? sum(c.units.map(u => unitMastery(c.id, u))) / c.units.length : 0; }
// mixed-review checkpoints: interleave everything learned so far (spaced retrieval)
function checkpointsFor(c) {
  const n = c.units.length, every = n >= 9 ? 2 : 3, out = [];
  for (let k = every; k < n; k += every) out.push({ upto: k, n: 6, title: `Checkpoint: mixed review of Units 1–${k}` });
  out.push({ upto: n, n: 12, title: 'Pre-exam mixed review: all units', final: true });
  return out;
}
function mixedPool(c, upto) {
  const p = P(c.id), now = Date.now(), pool = [];
  c.units.slice(0, upto).forEach(u => {
    const core = new Set(u.lessons.flatMap(l => coreQs(l).map(q => q.id)));
    [...u.lessons.flatMap(l => l.practice || []), ...(u.unitQuiz || [])].forEach(q => {
      const r = p.q[q.id];
      const w = r ? (!r.c ? 3 : (now - (r.t || 0) > 3600e3 ? 1 : 0.4)) : (core.has(q.id) ? 1.2 : 2);
      pool.push({ q, w });
    });
  });
  return pool;
}
function sampleWeighted(pool, n) {
  const a = pool.slice(), out = [];
  while (out.length < n && a.length) {
    const tot = sum(a.map(x => x.w)); let r = Math.random() * tot, i = 0;
    for (; i < a.length - 1; i++) { r -= a[i].w; if (r <= 0) break; }
    out.push(a[i].q); a.splice(i, 1);
  }
  return out;
}
function upNext(c) {
  const cps = checkpointsFor(c);
  for (const [ui, u] of c.units.entries()) {
    const due = cps.find(cp => !cp.final && cp.upto === ui && P(c.id).checkpoints?.[cp.upto] == null);
    if (due) return { kind: 'quiz', href: `#/${c.id}/mixed/${due.upto}`, label: 'Checkpoint', title: due.title };
    for (const l of u.lessons) {
      if (lessonSeenFrac(c.id, l) < 1) return { kind: 'learn', u, l, href: `#/${c.id}/learn/${l.id}`, label: 'Watch', title: l.title };
      if (coreQs(l).some(q => qScore(c.id, q.id) == null)) return { kind: 'practice', u, l, href: `#/${c.id}/practice/${l.id}`, label: 'Quick check', title: l.title };
    }
  }
  const fin = cps.find(cp => cp.final);
  if (fin && P(c.id).checkpoints?.[fin.upto] == null) return { kind: 'quiz', href: `#/${c.id}/mixed/${fin.upto}`, label: 'Pre-exam mixed review', title: fin.title };
  return { kind: 'exam', href: `#/${c.id}/exams`, label: 'Practice exams', title: 'Take a timed practice final' };
}

// ============================================================ layout chrome
function crumbs(parts) { return parts.filter(Boolean).map(([t, h]) => h ? `<a href="${h}">${esc(t)}</a>` : `<span>${esc(t)}</span>`).join('<span class="sep">/</span>'); }
function shell(c, crumbParts, inner) {
  const themeIcon = isDark() ? 'sun' : 'moon';
  app.innerHTML = `<header class="topbar">
      <a class="logo" href="#/">${LOGO}<span class="logo-text">Trevor's Academy</span></a>
      <nav class="crumbs">${crumbs(crumbParts || [])}</nav>
      <div class="top-actions">
        ${c ? `<a class="btn ghost sm" href="#/${c.id}/exams" title="Practice exams">${icon('clock')}<span class="lbl">Exams</span></a>
        <button class="btn ghost sm" id="fxBtn" title="Formulas for this section">${icon('sigma')}<span class="lbl">Formulas</span></button>
        <a class="btn ghost sm" href="#/${c.id}/cheatsheet" title="${esc(c.sheetLabel || 'Cheat sheet')}">${icon('sheet')}<span class="lbl">${esc(c.sheetLabel || 'Cheat sheet')}</span></a>` : ''}
        <button class="icon-btn" id="themeBtn" title="Toggle dark mode" aria-label="Toggle dark mode">${icon(themeIcon)}</button>
        <button class="icon-btn" id="setBtn" title="Settings" aria-label="Settings">${icon('gear')}</button>
      </div></header>
    <main id="view">${inner}</main>`;
  $('#themeBtn').onclick = () => { settings.theme = isDark() ? 'light' : 'dark'; saveSettings(); applyTheme(); $('#themeBtn').innerHTML = icon(isDark() ? 'sun' : 'moon'); };
  $('#setBtn').onclick = () => openSettings(c);
  if ($('#fxBtn')) $('#fxBtn').onclick = () => ($('#fx') ? closeFormulas() : openFormulas(c));
  if ($("#fx")) { if (c) openFormulas(c, true); else closeFormulas(); } // keep the window open across pages, refreshed for the new section
  window.scrollTo(0, 0);
}
function sideNav(c, activeUnit) {
  return `<aside class="side"><h4>${esc(c.code)} · Units</h4>
    <a class="item ${!activeUnit ? 'active' : ''}" href="#/${c.id}"><span class="num" style="background:var(--brand)">${icon('home')}</span>Course overview</a>
    ${c.units.map(u => `<a class="item ${activeUnit === u.id ? 'active' : ''}" href="#/${c.id}/unit/${u.id}"><span class="num" style="background:${unitColor(u)}">${u.num}</span><span style="flex:1">${esc(u.title)}</span><span class="ring" style="--p:${pct(unitMastery(c.id, u))};width:26px;height:26px"><span></span></span></a>`).join('')}
    ${c.cram ? `<a class="item ${activeUnit === 'cram' ? 'active' : ''}" href="#/${c.id}/cram"><span class="num" style="background:var(--bad)">${icon('bolt')}</span>30-minute cram</a>` : ''}
    <h4>Test yourself</h4>
    <a class="item" href="#/${c.id}/exams"><span class="num" style="background:var(--accent4)">${icon('clock')}</span>Practice exams</a>
    <a class="item" href="#/${c.id}/review"><span class="num" style="background:var(--bad)">${icon('redo')}</span>Review my mistakes</a>
    <a class="item" href="#/${c.id}/cheatsheet"><span class="num" style="background:var(--accent3)">${icon('sheet')}</span>${esc(c.sheetLabel || 'Cheat sheet')}</a>
  </aside>`;
}
const footer = () => `<div class="footer">Trevor's Academy · study notes built from course materials for personal review · not an official Georgetown resource</div>`;

// ============================================================ router
function route() {
  cleanups.forEach(f => { try { f(); } catch { } }); cleanups = [];
  closeTutor();
  narrator.stop();
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  const c = parts[0] && courseById(parts[0]);
  if (!c) return viewHome();
  if (c.status !== 'live' || !c.units) return viewComingSoon(c);
  const [, kind, id] = parts;
  P(c.id).last = location.hash; saveP(c.id); logVisit(c.id);
  switch (kind) {
    case undefined: return viewCourse(c);
    case 'unit': return viewUnit(c, id);
    case 'cram': return c.cram ? viewUnit(c, 'cram') : viewCourse(c);
    case 'learn': return viewLesson(c, id, parts[3]);
    case 'practice': return viewPractice(c, parts[3] === 'testout' ? 'testout' : 'lesson', id, parts[3] === 'all');
    case 'mixed': return viewPractice(c, 'mixed', id);
    case 'quiz': return viewPractice(c, 'quiz', id);
    case 'review': return viewPractice(c, 'review');
    case 'exams': return viewExams(c);
    case 'exam': return viewExam(c, id);
    case 'cheatsheet': return viewCheatsheet(c);
    default: return viewCourse(c);
  }
}

// ============================================================ home
function viewHome() {
  const cards = DATA.courses.map(c => {
    if (c.status !== 'live' || !c.units) return `<div class="card course-card soon"><div class="band" style="background:${c.color}"></div><div class="body">
      <div class="code">${esc(c.code)} · coming soon</div><h3>${esc(c.title)}</h3><p class="muted">${esc(c.description)}</p>
      <div class="stats"><span class="chip">${icon('bolt')} In production</span></div></div></div>`;
    const m = courseMastery(c), nx = upNext(c);
    return `<a class="card course-card" href="#/${c.id}"><div class="band" style="background:${c.color}"></div><div class="body">
      <div class="code">${esc(c.code)}</div><h3>${esc(c.title)}</h3><div class="muted small">${esc(c.subtitle || '')}</div>
      <p class="muted" style="margin-top:6px">${esc(c.description)}</p>
      <div class="row" style="margin-top:4px"><div class="bar" style="flex:1"><i style="width:${pct(m)}%"></i></div><b class="small">${pct(m)}%</b></div>
      <div class="stats"><span class="chip core">${c.units.length} units</span><span class="chip">${slideCount(c)} slides</span><span class="chip">${qCount(c)} practice Qs</span><span class="chip high">${c.exams.length} exams</span><span class="chip">≈ ${fmtMin(courseMinutes(c))} core</span>${c.cram ? '<span class="chip bad">30-min cram</span>' : ''}</div>
      <div class="row" style="margin-top:10px"><span class="btn sm">${m > 0 ? 'Continue' : 'Start'}: ${esc(nx.label)}</span></div>
    </div></a>`;
  }).join('');
  shell(null, [], `<div class="page">
    <section class="hero">
      <div class="small" style="font-weight:800;letter-spacing:.1em;text-transform:uppercase;opacity:.8">MSB Scholars · Final exam week</div>
      <h1>Cram smarter. One course, one day, every topic.</h1>
      <p>Narrated lessons built from the professors' slides, practice after every lesson, and timed practice finals, with your progress saved on this device.</p>
      <svg class="deco" viewBox="0 0 200 200" fill="none" stroke="#fff" stroke-width="2"><path d="M10 170 L60 120 L95 140 L150 60 L190 30"/><circle cx="60" cy="120" r="5"/><circle cx="95" cy="140" r="5"/><circle cx="150" cy="60" r="5"/><path d="M10 190h180M10 190V10"/></svg>
    </section>
    <div class="section-title"><h2>Your courses</h2></div>
    <div class="grid cols2">${cards}</div>
    ${footer()}</div>`);
}
function viewComingSoon(c) {
  shell(null, [[c.title]], `<div class="page narrow"><div class="card pad empty"><h2>${esc(c.title)}</h2><p>${esc(c.description)}</p><a class="btn" href="#/">Back home</a></div></div>`);
}

// ============================================================ course overview
function viewCourse(c) {
  const p = P(c.id), m = courseMastery(c), nx = upNext(c);
  const seenSlides = sum(c.units.map(u => sum(u.lessons.map(l => Math.round(lessonSeenFrac(c.id, l) * l.slides.length)))));
  const attempted = Object.keys(p.q).length, correct = Object.values(p.q).filter(r => r.c).length;
  let t = 0;
  const cps = checkpointsFor(c);
  const cpRow = cp => { const start = t; t += cp.n * 1.1; const done = P(c.id).checkpoints?.[cp.upto];
    return `<a class="plan-row cp" href="#/${c.id}/mixed/${cp.upto}"><div class="when"><b style="background:var(--accent3)">${icon('redo')}</b>+${fmtClock(start * 60).replace(/:00$/, '')}</div>
      <div><h3>${esc(cp.title)}</h3><div class="muted small">${cp.n} interleaved questions from everything so far, weighted toward your misses · ~${fmtMin(cp.n * 1.1)}${done != null ? ` · last score <b>${pct(done)}%</b>` : ''}</div></div><span class="btn ${done != null ? 'secondary' : 'good'} sm">${done != null ? 'Redo' : 'Start'}</span></a>`; };
  const rows = c.units.map((u, ui) => {
    const cp = cps.find(x => !x.final && x.upto === ui); const pre = cp ? cpRow(cp) : '';
    const start = t; t += unitMinutes(u); const um = unitMastery(c.id, u);
    return `<a class="plan-row" href="#/${c.id}/unit/${u.id}">
      <div class="when"><b style="background:${unitColor(u)}">${u.num}</b>+${fmtClock(start * 60).replace(/:00$/, '')}</div>
      <div><h3>${esc(u.title)}</h3><div class="muted small">${esc(u.tagline || '')}</div>
        <div class="meta">${u.priority ? `<span class="chip ${u.priority}">${u.priority === 'core' ? 'Core' : u.priority === 'high' ? 'High yield' : 'Know it'}</span>` : ''}<span class="chip">${fmtMin(unitMinutes(u))}</span><span class="chip">${u.lessons.length} lessons</span><div class="bar"><i style="width:${pct(um)}%"></i></div></div></div>
      <div class="ring" style="--p:${pct(um)}"><span>${pct(um)}%</span></div></a>`.replace(/^/, pre);
  }).join('') + cpRow(cps.find(x => x.final));
  const ex = c.exam || {};
  shell(c, [[c.code + ' ' + c.title]], `<div class="page"><div class="with-side">${sideNav(c, null)}<div>
    <section class="course-head">
      <div><div class="muted small" style="font-weight:800;letter-spacing:.08em;text-transform:uppercase">${esc(c.code)} · ${esc(c.school || '')}</div>
        <h1 style="margin:.2em 0 .25em">${esc(c.title)}: ${esc(c.subtitle || '')}</h1><p class="muted" style="margin:0">${esc(c.description)}</p>
        <div class="exam-facts">${ex.dates ? `<div><b>Exam</b>${esc(ex.dates)}</div>` : ''}${ex.minutes ? `<div><b>Time</b>${ex.minutes} minutes</div>` : ''}${ex.questions ? `<div><b>Format</b>${esc(ex.questions)}</div>` : ''}${ex.allowed ? `<div><b>Allowed</b>${esc(ex.allowed)}</div>` : ''}${ex.rule ? `<div><b>Scoring</b>${esc(ex.rule)}</div>` : ''}</div></div>
      <div class="ring" style="--p:${pct(m)};width:96px;height:96px"><span style="font-size:1.2rem">${pct(m)}%</span></div>
    </section>
    <div style="height:16px"></div>
    <a class="upnext" href="${nx.href}" style="text-decoration:none;color:inherit">
      <div class="playbtn">${icon(nx.kind === 'learn' ? 'play' : nx.kind === 'exam' ? 'clock' : 'target')}</div>
      <div style="flex:1"><div class="lbl">Up next · ${esc(nx.label)}</div><h3>${esc(nx.title)}</h3>${nx.u ? `<div class="muted small">Unit ${nx.u.num}: ${esc(nx.u.title)}</div>` : ''}</div>
      <span class="btn">${m > 0 ? 'Continue' : 'Start'} ${icon('next')}</span></a>
    ${c.cram ? `<a class="upnext cram" href="#/${c.id}/cram" style="text-decoration:none;color:inherit;margin-top:12px">
      <div class="playbtn" style="background:var(--bad)">${icon('bolt')}</div>
      <div style="flex:1"><div class="lbl" style="color:var(--bad)">Short on time?</div><h3>30-minute cram: everything for the final</h3><div class="muted small">${sum(c.cram.lessons.map(l => l.slides.length))} narrated slides in ${c.cram.lessons.length} parts · auto-plays like a podcast · quick checks after each part</div></div>
      <span class="btn" style="background:var(--bad)">${icon('play')} Cram</span></a>` : ''}
    <div style="height:16px"></div>
    <div class="stat-tiles">
      <div class="tile"><div class="v">${seenSlides}/${slideCount(c)}</div><div class="k">slides watched</div></div>
      <div class="tile"><div class="v">${attempted ? pct(correct / attempted) + '%' : '—'}</div><div class="k">first-try accuracy (${attempted} Qs)</div></div>
      <div class="tile"><div class="v">${p.exams.length}</div><div class="k">practice exams taken</div></div>
      <div class="tile"><div class="v">≈ ${fmtMin(courseMinutes(c) + (c.exam?.minutes || 75))}</div><div class="k">cram time incl. one practice final</div></div>
    </div>
    <div class="section-title"><h2>Your cram plan</h2><span class="muted small">Go in order. Times are cumulative (narration at 1.25× + each lesson's 3-question quick check). Short on time? Use <b>Test out</b> on lessons you already know and play narration at 1.5×. Unit quizzes and full practice sets are optional extra reps.</span></div>
    <div class="plan">${rows}
      <a class="plan-row" href="#/${c.id}/exams"><div class="when"><b style="background:var(--accent4)">${icon('clock')}</b>+${fmtClock(t * 60).replace(/:00$/, '')}</div>
        <div><h3>Timed practice finals</h3><div class="muted small">${c.exams.filter(e => e.kind === 'real').length} real past finals + ${c.exams.filter(e => e.kind !== 'real').length} more · on-screen timer with 1.5× extended option</div></div><span class="btn purple sm">Open</span></a>
      <a class="plan-row" href="#/${c.id}/cheatsheet"><div class="when"><b style="background:var(--accent3)">${icon('sheet')}</b>last</div>
        <div><h3>Print your ${esc((c.sheetLabel || 'Cheat sheet').toLowerCase())}</h3><div class="muted small">${c.sheetLabel ? 'Every must-memorize definition, list and number on two pages' : 'Every key formula and fact, sized to fit the allowed sheet'}</div></div><span class="btn secondary sm">Open</span></a>
    </div>${footer()}</div></div></div>`);
}

// ============================================================ unit page
const isCram = u => u && u.id === 'cram';
const unitLabel = u => isCram(u) ? '30-min cram' : `Unit ${u.num}`;
const unitHref = (c, u) => isCram(u) ? `#/${c.id}/cram` : `#/${c.id}/unit/${u.id}`;
function viewUnit(c, uid) {
  const u = uid === 'cram' ? c.cram : c.units.find(x => x.id === uid); if (!u) return viewCourse(c);
  const col = unitColor(u), idx = c.units.indexOf(u), prevU = c.units[idx - 1], nextU = c.units[idx + 1];
  const lessons = u.lessons.map((l, i) => {
    const seen = lessonSeenFrac(c.id, l), pf = lessonPracticeFrac(c.id, l), done = seen >= 1 && coreQs(l).every(q => qScore(c.id, q.id) != null);
    const nq = (l.practice || []).length, nc = coreQs(l).length, nAllDone = (l.practice || []).filter(q => qScore(c.id, q.id) != null).length;
    return `<div class="card lesson-card"><div class="idx ${done ? 'done' : ''}">${done ? icon('check') : i + 1}</div>
      <div><h3>${esc(l.title)}</h3><div class="row small muted"><span>${l.slides.length} slides · ~${fmtMin(lessonMinutes(l))} with quick check · ${nq} practice questions in all</span></div>
        <div class="row" style="margin-top:8px"><div class="bar" style="width:160px"><i style="width:${pct(lessonMastery(c.id, l))}%"></i></div><span class="small muted">${pct(seen)}% watched${nq ? ` · quick check ${pct(pf)}% · ${nAllDone}/${nq} tried` : ''}</span></div></div>
      <div class="acts"><a class="btn ${seen < 1 ? '' : 'secondary'}" href="#/${c.id}/learn/${l.id}">${icon('play')} ${seen > 0 && seen < 1 ? 'Resume' : seen >= 1 ? 'Rewatch' : 'Watch'}</a>
        ${nq ? `<a class="btn ${seen >= 1 && pf < 1 ? 'good' : 'secondary'}" href="#/${c.id}/practice/${l.id}">${icon('target')} Quick check (${nc})</a>` : ''}
        ${nq > nc ? `<a class="btn ghost" href="#/${c.id}/practice/${l.id}/all">All ${nq}</a>` : ''}
        ${seen === 0 && nc ? `<a class="btn ghost" href="#/${c.id}/practice/${l.id}/testout" title="Already know this? Answer the ${nc} quick-check questions first. All right = lesson marked done.">${icon('bolt')} Test out</a>` : ''}</div></div>`;
  }).join('');
  const qz = (u.unitQuiz || []).length, best = P(c.id).quiz[u.id];
  shell(c, [[c.code, `#/${c.id}`], [unitLabel(u)]], `<div class="page"><div class="with-side">${sideNav(c, u.id)}<div>
    <section class="unit-head" style="background:linear-gradient(135deg, ${col}, color-mix(in srgb, ${col} 55%, #041e42))">
      <div class="kick">${isCram(u) ? 'Short on time? The whole course in ~30 minutes' : `Unit ${u.num} of ${c.units.length}`}</div><h1>${esc(u.title)}</h1><p>${esc(u.tagline || '')}</p>
      <div class="chips"><span class="chip">${icon('clock')} ~${fmtMin(unitMinutes(u))} core · ${fmtMin(unitAllMinutes(u))} with everything</span><span class="chip">${u.lessons.length} lessons</span><span class="chip">${pct(unitMastery(c.id, u))}% mastered</span>${(u.sources || []).length ? `<span class="chip">From: ${esc(u.sources.slice(0, 3).join(' · '))}</span>` : ''}</div>
    </section>
    ${(u.objectives || []).length ? `<div class="card pad" style="margin-top:16px"><h3>By the end of this unit you can…</h3><ul class="objectives">${u.objectives.map(o => `<li>${tex(o)}</li>`).join('')}</ul></div>` : ''}
    <div class="section-title"><h2>Lessons</h2></div>
    <div class="grid">${lessons}
      ${qz ? `<div class="card lesson-card" style="border-color:color-mix(in srgb, var(--accent4) 40%, var(--line))"><div class="idx" style="background:var(--exam-soft);color:var(--accent4)">${icon('trophy')}</div>
        <div><h3>Unit ${u.num} quiz <span class="chip">optional</span></h3><div class="small muted">${qz} exam-style questions, about ${fmtMin(sum(u.unitQuiz.map(qMin)))}${best != null ? ` · best score <b>${pct(best)}%</b>` : ''}</div></div>
        <div class="acts"><a class="btn purple" href="#/${c.id}/quiz/${u.id}">${best != null ? 'Retake' : 'Take'} quiz</a></div></div>` : ''}
    </div>
    ${(u.keyFormulas || []).length || (u.keyFacts || []).length ? `<div class="section-title"><h2>Key formulas &amp; facts</h2><span class="muted small">These also go on your cheat sheet</span></div>
      <div class="grid cols2">
        ${(u.keyFormulas || []).length ? `<div class="card pad"><h3>Formulas</h3><div class="formula-list">${u.keyFormulas.map(k => `<div class="formula-item"><div class="name">${tex(esc(k.name))}</div>${texBlock(k.tex)}${k.note ? `<div class="note">${tex(k.note)}</div>` : ''}</div>`).join('')}</div></div>` : ''}
        ${(u.keyFacts || []).length ? `<div class="card pad"><h3>Must-know facts</h3><ul class="facts">${u.keyFacts.map(f => `<li>${tex(f)}</li>`).join('')}</ul></div>` : ''}
      </div>` : ''}
    <div class="row" style="margin-top:24px">${prevU ? `<a class="btn secondary" href="#/${c.id}/unit/${prevU.id}">${icon('prev')} Unit ${prevU.num}</a>` : ''}<span class="spacer"></span>${nextU ? `<a class="btn" href="#/${c.id}/unit/${nextU.id}">Unit ${nextU.num}: ${esc(nextU.title)} ${icon('next')}</a>` : `<a class="btn purple" href="#/${c.id}/exams">Practice exams ${icon('next')}</a>`}</div>
    ${footer()}</div></div></div>`);
}

// ============================================================ narration
function pickVoice() {
  const vs = (window.speechSynthesis && speechSynthesis.getVoices()) || [];
  if (!vs.length) return null;
  if (settings.voice) { const v = vs.find(v => v.name === settings.voice); if (v) return v; }
  const en = vs.filter(v => /^en(-|_)?(US|GB)?/i.test(v.lang));
  const pref = [/natural/i, /neural/i, /premium/i, /enhanced/i, /Samantha/, /Google US English/, /Aria/, /Jenny/, /Ava/, /Allison/, /Daniel/];
  for (const re of pref) { const v = en.find(v => re.test(v.name)); if (v) return v; }
  return en[0] || vs[0];
}
class Narrator {
  constructor() { this.audio = new Audio(); this.audio.preload = 'auto'; this.tok = 0; this.cache = new Map(); this.playing = false; this.mode = null; }
  useAudio(c, s) { return settings.voiceMode !== 'browser' && !!(c.audio && c.audio[s.id]); }
  url(c, sid) {
    const h = c.audio && c.audio[sid]; if (!h) return Promise.resolve(null);
    if (!this.cache.has(h)) {
      const p = fetch(`audio/${h}.bin`).then(r => { if (!r.ok) throw new Error('audio'); return r.arrayBuffer(); })
        .then(b => decryptBuf(KEY, b)).then(pl => URL.createObjectURL(new Blob([pl], { type: 'audio/mpeg' })));
      p.catch(() => this.cache.delete(h)); this.cache.set(h, p);
    }
    return this.cache.get(h);
  }
  prefetch(c, s) { if (s && this.useAudio(c, s)) this.url(c, s.id).catch(() => { }); }
  async start(c, s, { onProgress, onEnd }) {
    this.stop(); const tok = ++this.tok; this.onProgress = onProgress; this.onEnd = onEnd; this.playing = true;
    let u = null;
    if (this.useAudio(c, s)) { try { u = await this.url(c, s.id); } catch { u = null; checkForUpdate(true); } } // browser voice this slide; newer audio from the next page on
    if (tok !== this.tok) return;
    if (u) {
      this.mode = 'audio'; const a = this.audio; a.src = u; a.playbackRate = settings.rate;
      a.ontimeupdate = () => tok === this.tok && a.duration && onProgress?.(a.currentTime / a.duration);
      a.onended = () => { if (tok === this.tok) { this.playing = false; onEnd?.(); } };
      try { await a.play(); } catch (e) { this.playing = false; throw e; }
    } else {
      this.mode = 'tts'; this.chunks = (s.narration || '').match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g) || [s.narration || '']; this.ci = 0; this.speakNext(tok);
    }
  }
  speakNext(tok) {
    if (tok !== this.tok || !this.playing) return;
    if (!window.speechSynthesis) { this.playing = false; this.onEnd?.(); return; }
    if (this.ci >= this.chunks.length) { this.playing = false; this.onEnd?.(); return; }
    const u = new SpeechSynthesisUtterance(this.chunks[this.ci].trim()); u.rate = settings.rate; const v = pickVoice(); if (v) { u.voice = v; u.lang = v.lang; }
    u.onend = () => { if (tok !== this.tok || this.paused) return; this.ci++; this.onProgress?.(this.ci / this.chunks.length); this.speakNext(tok); };
    u.onerror = e => { if (tok !== this.tok || this.paused || e.error === 'interrupted' || e.error === 'canceled') return; this.ci++; this.speakNext(tok); };
    speechSynthesis.speak(u);
  }
  pause() { this.paused = true; if (this.mode === 'audio') this.audio.pause(); else { this.tok++; this.pausedTok = this.tok; speechSynthesis.cancel(); } }
  resume() {
    this.paused = false; this.playing = true;
    if (this.mode === 'audio') this.audio.play().catch(() => { }); else { const tok = ++this.tok; this.speakNext(tok); }
  }
  setRate(r) { if (this.mode === 'audio') this.audio.playbackRate = r; }
  stop() { this.tok++; this.playing = false; this.paused = false; try { this.audio.pause(); } catch { } this.audio.ontimeupdate = this.audio.onended = null; if (window.speechSynthesis) speechSynthesis.cancel(); }
}
const narrator = new Narrator();
window.__ta = { narrator, get data() { return DATA; }, fitSlide, slideHTML, route: () => route(), choiceWhy, rubricOf, lessonForQuestion, checkpointsFor }; // debug hooks for QA
if (window.speechSynthesis) speechSynthesis.onvoiceschanged = () => { };

// ============================================================ lesson player
function slideHTML(c, u, s, revealed) {
  const steps = (s.steps || []).length ? `<div class="steps">${s.steps.slice(0, revealed).map(x => `<div class="stp">${tex(x)}</div>`).join('')}${revealed < s.steps.length ? `<div class="muted" style="font-size:.8em">▸ ${s.steps.length - revealed} more step${s.steps.length - revealed > 1 ? 's' : ''} — press → or play</div>` : ''}</div>` : '';
  const body = `<div class="html">${tex(s.html || '')}</div>${steps}`;
  const inner = s.svg ? `<div class="cols ${s.layout === 'diagram' ? 'svg-big' : ''}"><div class="svgbox">${s.svg}</div><div class="htmlcol">${body}</div></div>` : body;
  return `<div class="slide layout-${esc(s.layout || 'content')}"><div class="accentbar" style="background:${unitColor(u)}"></div>
    ${s.kicker ? `<div class="kicker">${tex(esc(s.kicker))}</div>` : ''}<h2 class="st">${tex(s.title || '')}</h2>
    <div class="sbody">${inner}</div>
    ${s.examTip ? `<div class="exam-tip">${icon('target')}<span><b>Exam tip:</b> ${tex(s.examTip)}</span></div>` : ''}
    <div class="watermark">Trevor's Academy · ${esc(c.code)} · ${unitLabel(u)}</div></div>`;
}
function fitSlide(stage) {
  const sl = $('.slide', stage); if (!sl || matchMedia('(max-width: 760px)').matches) return;
  let f = 1; sl.style.setProperty('--fs', f);
  const over = () => { const b = $('.sbody', sl); return b && (b.scrollHeight > b.clientHeight + 2 || sl.scrollHeight > sl.clientHeight + 2); };
  while (over() && f > 0.6) { f -= 0.05; sl.style.setProperty('--fs', f.toFixed(2)); }
  sl.classList.toggle('scroll', over()); // last resort: scroll rather than clip
}
function viewLesson(c, lid, startAt) {
  const { u, l } = findLesson(c, lid); if (!l) return viewCourse(c);
  const lessons = isCram(u) ? u.lessons.map(x => ({ ...x, unit: u })) : allLessons(c), li = lessons.findIndex(x => x.id === lid), nextL = lessons[li + 1];
  const seen = P(c.id).seen[l.id] || [];
  let i = startAt != null ? Math.max(0, Math.min(l.slides.length - 1, +startAt - 1)) : Math.max(0, l.slides.findIndex(s => !seen.includes(s.id)));
  if (i < 0) i = 0;
  let rev = 0, playing = false, ended = false;
  const nq = (l.practice || []).length;
  const hasEleven = l.slides.some(s => c.audio && c.audio[s.id]);
  const voiced = l.slides.find(s => c.audio && c.audio[s.id]), voiceName = (voiced && c.voices && c.voices[voiced.id]) || c.voice || 'ElevenLabs';
  shell(c, [[c.code, `#/${c.id}`], [unitLabel(u), unitHref(c, u)], [l.title]], `<div class="page">
    <div class="row" style="margin-bottom:14px"><div><div class="muted small" style="font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:${unitColor(u)}">${isCram(u) ? '30-min cram · Part' : `Unit ${u.num} · Lesson`} ${u.lessons.indexOf(l) + 1} of ${u.lessons.length}</div><h1 style="margin:.15em 0 0;font-size:1.5rem">${esc(l.title)}</h1></div></div>
    <div class="player"><div>
      <div class="stage-wrap"><div class="stage" id="stage"></div></div>
      <div class="controls">
        <button class="icon-btn" id="pv" title="Previous (←)" aria-label="Previous slide">${icon('prev')}</button>
        <button class="playbtn" id="pp" title="Play narration (space)" aria-label="Play narration">${icon('play')}</button>
        <button class="icon-btn" id="nx" title="Next (→)" aria-label="Next slide">${icon('next')}</button>
        <span class="count" id="cnt"></span>
        <div class="progress-dots" id="dots">${l.slides.map((s, k) => `<i data-k="${k}" title="${esc(plain(s.title))}"></i>`).join('')}</div>
        <select id="rate" title="Narration speed" aria-label="Narration speed">${[0.9, 1, 1.15, 1.25, 1.5, 1.75, 2].map(r => `<option value="${r}" ${+settings.rate === r ? 'selected' : ''}>${r}×</option>`).join('')}</select>
        <button class="icon-btn ${settings.autoAdvance ? 'on' : ''}" id="aa" title="Auto-advance after narration" aria-label="Auto-advance">${icon('bolt')}</button>
        <button class="icon-btn ${settings.transcript ? 'on' : ''}" id="tr" title="Transcript (T)" aria-label="Transcript">${icon('cc')}</button>
        <button class="icon-btn" id="fs" title="Fullscreen (F)" aria-label="Fullscreen">${icon('expand')}</button>
        ${tutorOn() ? `<button class="btn secondary sm" id="ask" title="Ask the tutor about this slide">${icon('bulb')} Ask</button>` : ''}
      </div>
      <div class="transcript ${settings.transcript ? '' : 'hidden'}" id="trbox"><div class="lbl">Narration</div><div id="trtext"></div></div>
      <div class="voice-note">${hasEleven && settings.voiceMode !== 'browser' ? `${icon('vol')} Narrated by ${esc(voiceName)}` : `${icon('vol')} Using your browser's voice${hasEleven ? '' : ' (studio narration coming soon)'} · change voice in ${icon('gear')} settings`} <span class="kbd"> · ← → to move · space to play/pause</span></div>
    </div>
    <div class="card outline" id="outline"><div class="muted small" style="font-weight:800;padding:6px 10px">In this lesson</div>${l.slides.map((s, k) => `<a href="#" data-k="${k}"><span class="n">${k + 1}</span><span>${tex(s.title)}</span></a>`).join('')}
      <div style="padding:10px">${nq ? `<a class="btn good" style="width:100%" href="#/${c.id}/practice/${l.id}">${icon('target')} Quick check (${coreQs(l).length})</a>` : ''}</div></div>
    </div>${footer()}</div>`);
  const stage = $('#stage'), pp = $('#pp');

  function setPlayIcon() { pp.innerHTML = icon(playing ? 'pause' : 'play'); pp.title = playing ? 'Pause (space)' : 'Play narration (space)'; }
  function render(anim = true) {
    ended = false;
    const s = l.slides[i]; markSeen(c.id, l.id, s.id);
    stage.innerHTML = slideHTML(c, u, s, rev);
    if (!anim) $('.slide', stage).style.animation = 'none';
    requestAnimationFrame(() => fitSlide(stage));
    $('#cnt').textContent = `${i + 1} / ${l.slides.length}`;
    const sn = P(c.id).seen[l.id] || [];
    $$('#dots i').forEach((d, k) => { d.className = k === i ? 'cur' : sn.includes(l.slides[k].id) ? 'seen' : ''; });
    $$('#outline a[data-k]').forEach((a, k) => { a.className = (k === i ? 'cur ' : '') + (sn.includes(l.slides[k].id) ? 'seen' : ''); });
    $('#trtext').textContent = s.narration || '';
    narrator.prefetch(c, l.slides[i + 1]);
  }
  function revealSteps(n) { const s = l.slides[i]; const tot = (s.steps || []).length; if (n > rev && rev < tot) { rev = Math.min(tot, n); render(false); } }
  function play() {
    if (ended) return;
    playing = true; setPlayIcon();
    const s = l.slides[i], tot = (s.steps || []).length;
    // worked examples: hold back the final step so the student computes it (generation effect)
    const yourTurn = s.layout === 'example' && tot >= 2;
    const cap = yourTurn ? tot - 1 : tot;
    narrator.start(c, s, {
      onProgress: f => { if (tot) revealSteps(Math.min(cap, Math.floor(f * (tot + 1) + 0.0001))); },
      onEnd: () => {
        if (tot) revealSteps(cap);
        if (yourTurn && rev < tot) {
          playing = false; setPlayIcon();
          const tip = document.createElement('div'); tip.className = 'yourturn';
          tip.innerHTML = `${icon('target')} <b>Your turn:</b> work out the last step on your calculator, then press → to check it.`;
          $('.slide', stage)?.appendChild(tip);
          return;
        }
        if (settings.autoAdvance && playing) { const k = i; setTimeout(() => { if (playing && i === k) go(1, true); }, 900); }
        else { playing = false; setPlayIcon(); }
      },
    }).catch(() => { playing = false; setPlayIcon(); toast('Audio could not start — tap play again'); });
  }
  function pause() { playing = false; setPlayIcon(); narrator.pause(); }
  function go(d, auto = false) {
    const s = l.slides[i], tot = (s.steps || []).length;
    if (d > 0 && !auto && rev < tot) { revealSteps(rev + 1); return; }
    const j = i + d;
    if (j < 0) return;
    if (j >= l.slides.length) { narrator.stop(); playing = false; setPlayIcon(); return showEnd(); }
    narrator.stop(); i = j; rev = d < 0 ? (l.slides[i].steps || []).length : 0; render();
    if (playing) play();
  }
  function showEnd() {
    ended = true;
    const card = document.createElement('div'); card.className = 'endcard';
    card.innerHTML = `<div><div style="font-size:2.4rem">🎉</div><h2>Lesson complete!</h2><p class="muted">${esc(l.title)}</p>
      <div class="row" style="justify-content:center;margin-top:14px">
        ${nq ? `<a class="btn good big" href="#/${c.id}/practice/${l.id}">${icon('target')} Quick check (${coreQs(l).length} questions)</a>` : ''}
        ${nextL ? `<a class="btn ${nq ? 'secondary' : ''} big" href="#/${c.id}/learn/${nextL.id}">Next lesson ${icon('next')}</a>` : `<a class="btn secondary big" href="#/${c.id}/exams">Practice exams</a>`}
        <button class="btn ghost" id="again">${icon('redo')} Replay</button></div></div>`;
    stage.appendChild(card);
    $('#again', card).onclick = () => { i = 0; rev = 0; render(); };
  }
  pp.onclick = () => { if (ended) { i = 0; rev = 0; render(); } playing ? pause() : (narrator.paused && narrator.mode ? (playing = true, setPlayIcon(), narrator.resume()) : play()); };
  $('#pv').onclick = () => go(-1); $('#nx').onclick = () => go(1);
  if ($('#ask')) $('#ask').onclick = () => { const s = l.slides[i]; if (playing) pause(); openTutor(c, u, { kind: 'slide', label: plain(s.title), text: `Slide "${plain(s.title)}": ${plain(s.html)} ${(s.steps || []).map(plain).join(' ')} ${s.examTip ? 'Exam tip: ' + plain(s.examTip) : ''}\nNarration: ${s.narration || ''}` }); };
  $('#dots').onclick = e => { const k = e.target.dataset.k; if (k != null) { narrator.stop(); i = +k; rev = 0; render(); if (playing) play(); } };
  $('#outline').onclick = e => { const a = e.target.closest('a[data-k]'); if (a) { e.preventDefault(); narrator.stop(); i = +a.dataset.k; rev = 0; render(); if (playing) play(); } };
  $('#rate').onchange = e => { settings.rate = +e.target.value; saveSettings(); narrator.setRate(settings.rate); };
  $('#aa').onclick = e => { settings.autoAdvance = !settings.autoAdvance; saveSettings(); e.currentTarget.classList.toggle('on', settings.autoAdvance); toast(settings.autoAdvance ? 'Auto-advance on' : 'Auto-advance off'); };
  $('#tr').onclick = e => { settings.transcript = !settings.transcript; saveSettings(); e.currentTarget.classList.toggle('on', settings.transcript); $('#trbox').classList.toggle('hidden', !settings.transcript); };
  $('#fs').onclick = () => { if (document.fullscreenElement) document.exitFullscreen(); else stage.requestFullscreen?.().then(() => setTimeout(() => fitSlide(stage), 120)).catch(() => { }); };
  const onKey = e => {
    if (e.target.closest('input,textarea,select')) return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); go(1); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); go(-1); }
    else if (e.key === ' ') { e.preventDefault(); pp.click(); }
    else if (e.key === 't' || e.key === 'T') $('#tr').click();
    else if (e.key === 'f' || e.key === 'F') $('#fs').click();
  };
  const onResize = () => fitSlide(stage);
  document.addEventListener('keydown', onKey); window.addEventListener('resize', onResize);
  document.addEventListener('fullscreenchange', onResize);
  onCleanup(() => { document.removeEventListener('keydown', onKey); window.removeEventListener('resize', onResize); document.removeEventListener('fullscreenchange', onResize); if (document.fullscreenElement) document.exitFullscreen().catch(() => { }); });
  render();
  // start the narration right away when the lesson was opened by a click (browsers allow audio after a user gesture)
  const activated = navigator.userActivation ? navigator.userActivation.hasBeenActive : true;
  if (activated && settings.autoplay !== false) setTimeout(() => { if (!playing && $('#stage')) play(); }, 350);
}

// ============================================================ question engine
function parseNum(raw) {
  let s = String(raw ?? '').trim().toLowerCase().replace(/[\s,$]/g, '').replace(/[−–]/g, '-');
  if (!s) return null;
  let pc = false;
  if (s.endsWith('%')) { pc = true; s = s.slice(0, -1); }
  s = s.replace(/(years?|yrs?|x)$/, '');
  if (!/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/.test(s)) return null;
  return { v: parseFloat(s), pc, dec: (s.split('.')[1] || '').replace(/e.*$/, '').length };
}
function numericOk(q, raw) {
  const p = parseNum(raw); if (!p) return false;
  const a = Number(q.answer), tol = q.tolerance || { rel: 0.01 };
  const near = (v, dec) => {
    const d = Math.abs(v - a);
    if (tol.abs != null && d <= tol.abs + 1e-9) return true;
    if (tol.rel != null && d <= Math.abs(a) * tol.rel + 1e-9) return true;
    if (dec > 0 && d <= 0.5 * Math.pow(10, -dec) + 1e-9 && d <= Math.abs(a) * 0.05) return true; // rounded to the digits typed
    return false;
  };
  const cands = [[p.v, p.dec]];
  if (q.format === 'percent' && !p.pc) cands.push([p.v * 100, Math.max(0, p.dec - 2)]);
  if (q.format === 'decimal' && p.pc) cands.push([p.v / 100, p.dec + 2]);
  if (q.format === 'decimal' && !p.pc && Math.abs(a) < 1 && Math.abs(p.v) >= 1) cands.push([p.v / 100, p.dec + 2]);
  return cands.some(([v, d]) => near(v, d));
}
function fmtAnswer(q) {
  const a = Number(q.answer);
  const n = Math.abs(a) >= 1000 ? a.toLocaleString(undefined, { maximumFractionDigits: 2 }) : String(+a.toPrecision(10));
  return q.format === 'percent' ? n + '%' : q.format === 'dollars' ? (a < 0 ? '−$' + n.replace('-', '') : '$' + n) : q.format === 'years' ? n + ' years' : n;
}
function initResp(q) {
  switch (q.type) {
    case 'mc': return null; case 'numeric': return ''; case 'tf': return null;
    case 'tfgroup': return q.statements.map(() => null);
    case 'open': return { text: '', self: null };
    case 'group': return q.parts.map(initResp);
  }
  return null;
}
// returns fraction 0..1, or null if ungraded (open not self-graded)
function grade(q, r) {
  switch (q.type) {
    case 'mc': return r === q.answer ? 1 : 0;
    case 'numeric': return numericOk(q, r) ? 1 : 0;
    case 'tf': return r === q.answer ? 1 : 0;
    case 'tfgroup': return q.statements.filter((s, k) => r && r[k] === s.answer).length / q.statements.length;
    case 'open': return r && r.self != null ? r.self : null;
    case 'group': {
      const gs = q.parts.map((p, k) => grade(p, r ? r[k] : initResp(p)));
      if (gs.some(g => g == null)) return gs.every(g => g == null) ? null : sum(gs.map(g => g || 0)) / gs.length;
      return sum(gs) / gs.length;
    }
  }
  return 0;
}
function answered(q, r) {
  switch (q.type) {
    case 'mc': case 'tf': return r != null;
    case 'numeric': return String(r ?? '').trim() !== '';
    case 'tfgroup': return r && r.every(x => x != null);
    case 'open': return r && (r.text || '').trim() !== '';
    case 'group': return r && q.parts.every((p, k) => answered(p, r[k]));
  }
  return false;
}
const hasOpen = q => q.type === 'open' || (q.parts || []).some(hasOpen);
// explanation of why choice k is wrong: explicit q.choiceWhy[k], else parsed from "<strong>B</strong> — …" rationales in the solution
function choiceWhy(q, k) {
  if (q.choiceWhy && q.choiceWhy[k]) return q.choiceWhy[k];
  const L = LETTERS[k], sol = q.solution || '';
  const lab = `<(?:strong|b)>\\s*\\(?[${L}${L.toLowerCase()}]\\)?[.):]?\\s*(?:</(?:strong|b)>)`;
  const re = new RegExp(lab + `\\s*(?:[—–:-]|is\\s+wrong|\\(wrong\\))?\\s*([\\s\\S]*?)(?=</li>|<br\\s*/?>|</p>|<(?:strong|b)>\\s*\\(?[A-Ha-h]\\)?[.):]?\\s*</(?:strong|b)>)`);
  const m = sol.match(re); if (!m) return null;
  // never leak the key: cut anything from "Answer:" / "Correct" onward
  const t = m[1].replace(/^\s*[—–:-]\s*/, '').split(/(?:<(?:strong|b)>\s*)?(?:Answer\s*:|The answer is|Correct answer|So the answer)/i)[0].trim();
  return plain(t).length > 10 ? t : null;
}
// key points of a model answer (its list items) → self-grading rubric
function rubricOf(q) {
  if (Array.isArray(q.rubric) && q.rubric.length) return q.rubric;
  const items = [...String(q.modelAnswer || q.solution || '').matchAll(/<li>([\s\S]*?)<\/li>/g)].map(m => m[1].trim()).filter(x => plain(x).length > 3);
  return items.length >= 2 && items.length <= 8 ? items : null;
}
function numericSlip(q, raw) {
  const p = parseNum(raw); if (!p) return 'That doesn\'t look like a number. Use digits, a decimal point, and optionally %.';
  const a = Number(q.answer), close = v => Math.abs(v - a) <= Math.max(Math.abs(a) * 0.02, 1e-9);
  if (close(-p.v)) return 'Check your sign: the magnitude is right.';
  if (close(p.v * 100) || close(p.v / 100)) return `Check your units: ${q.format === 'percent' ? 'answer in percent (e.g. 5.4 for 5.4%)' : q.format === 'decimal' ? 'answer as a decimal (e.g. 0.054)' : 'the scale is off by 100×'}.`;
  if (close(p.v * 10) || close(p.v / 10)) return 'Off by a factor of 10: check a decimal place.';
  return null;
}
// grade ignoring written (open) parts; null if nothing is auto-gradable
function gradeAuto(q, r) {
  if (q.type === 'open') return null;
  if (q.type !== 'group') return grade(q, r);
  const gs = q.parts.map((p, k) => gradeAuto(p, r ? r[k] : initResp(p))).filter(g => g != null);
  return gs.length ? sum(gs) / gs.length : null;
}
const answeredAuto = (q, r) => q.type === 'open' ? true : q.type === 'group' ? q.parts.every((p, k) => answeredAuto(p, r ? r[k] : null)) : answered(q, r);

/* QuestionView: renders one question with its interactions.
   mode: 'practice' (check/hints/solution, retries) | 'exam' (just inputs) | 'review' (read-only + solution + self-grade) */
function QuestionView(q, { mode = 'practice', resp, onResp, onChecked, onSelfGrade, label, tutorCtx } = {}) {
  const root = document.createElement('div'); root.className = 'card qcard';
  const st = { r: resp !== undefined && resp !== null ? structuredClone(resp) : initResp(q), checked: mode === 'review', hints: 0, sol: mode === 'review', tries: 0, wrong: {}, first: null, done: false, phints: {}, psol: {}, reasons: {} };
  function getAt(path) { let o = st.r; for (const k of path) o = o == null ? null : o[k]; return o; }
  function setAt(path, v) {
    if (!path.length) { st.r = v; return; }
    let o = st.r; for (let k = 0; k < path.length - 1; k++) o = o[path[k]]; o[path[path.length - 1]] = v;
  }
  function inputs(qq, path) {
    const r = getAt(path), key = path.join('.'), reveal = mode === 'review' || st.sol, checked = st.checked;
    const g = (checked || reveal) && qq.type !== 'open' ? grade(qq, r) : null;
    switch (qq.type) {
      case 'mc': return `<div class="choices">${qq.choices.map((ch, k) => {
        let cls = r === k ? 'sel' : '';
        if (reveal && k === qq.answer) cls = 'right';
        else if (checked && r === k) cls = k === qq.answer ? 'right' : 'wrong';
        if (st.wrong[key + ':' + k] && mode === 'practice') cls = 'wrong';
        if (reveal && r === k && k !== qq.answer) cls = 'wrong';
        return `<button class="choice ${cls}" data-act="mc" data-path="${key}" data-k="${k}" ${mode === 'review' ? 'disabled' : ''}><span class="letter">${LETTERS[k]}</span>${rich(ch)}</button>`;
      }).join('')}</div>`;
      case 'numeric': {
        const cls = (checked || reveal) && String(r ?? '').trim() ? (g ? 'right' : 'wrong') : '';
        return `<div class="numwrap ${cls}"><input class="field" inputmode="decimal" autocomplete="off" data-act="num" data-path="${key}" value="${esc(r ?? '')}" placeholder="${qq.format === 'percent' ? 'percent, e.g. 5.4' : qq.format === 'dollars' ? 'dollars, e.g. 1050.25' : qq.format === 'decimal' ? 'decimal, e.g. 0.136' : qq.format === 'years' ? 'years, e.g. 4.62' : 'e.g. 2.38'}" ${mode === 'review' ? 'disabled' : ''}>
          ${qq.format === 'percent' ? '<span class="unit">%</span>' : qq.format === 'years' ? '<span class="unit">years</span>' : ''}
          ${reveal || (checked && g) ? `<span class="chip ${g ? 'good' : 'bad'}">Answer: ${esc(fmtAnswer(qq))}</span>` : ''}</div>`;
      }
      case 'tf': return `<div class="tfbtns" style="margin:14px 0">${[true, false].map(v => {
        let cls = r === v ? 'sel' : ''; if ((checked || reveal) && r === v) cls = v === qq.answer ? 'right' : 'wrong'; if (reveal && v === qq.answer) cls = 'right';
        return `<button class="${cls}" data-act="tf" data-path="${key}" data-v="${v}" ${mode === 'review' ? 'disabled' : ''}>${v ? 'TRUE' : 'FALSE'}</button>`;
      }).join('')}</div>`;
      case 'tfgroup': return `<div style="margin-top:8px">${qq.statements.map((s, k) => {
        const rv = r ? r[k] : null;
        return `<div class="tfrow"><div>${rich(s.text)}</div><div class="tfbtns">${[true, false].map(v => {
          let cls = rv === v ? 'sel' : ''; if ((checked || reveal) && rv === v) cls = v === s.answer ? 'right' : 'wrong'; if (reveal && v === s.answer) cls = 'right';
          return `<button class="${cls}" data-act="tfg" data-path="${key}" data-k="${k}" data-v="${v}" ${mode === 'review' ? 'disabled' : ''}>${v ? 'TRUE' : 'FALSE'}</button>`;
        }).join('')}</div>
        ${mode === 'practice' && !st.done && !st.sol ? `<input class="field tfwhy" data-act="why" data-path="${key}" data-k="${k}" value="${esc(st.reasons[key + ':' + k] || '')}" placeholder="Because… (justify in a few words: that's half the points)">` : ''}
        ${(mode === 'practice' ? (st.done || st.sol) : (checked || reveal)) ? `<div class="tfexp callout ${rv === s.answer ? 'tip' : 'warn'}">${st.reasons[key + ':' + k] ? `<div class="small muted">Your reason: ${esc(st.reasons[key + ':' + k])}</div>` : ''}<b>${s.answer ? 'TRUE' : 'FALSE'}.</b> ${tex(s.explanation)}</div>` : ''}</div>`;
      }).join('')}</div>`;
      case 'open': {
        const rr = r || { text: '', self: null }, showModel = reveal || rr.revealed, rub = rubricOf(qq);
        const grading = rub ? `<div class="rubric"><div class="lbl">Grade yourself: tick each key point your answer included</div>${rub.map((it, i) => `<label class="rub"><input type="checkbox" data-act="rub" data-path="${key}" data-i="${i}" ${(rr.rub || [])[i] ? 'checked' : ''}> <span>${tex(it)}</span></label>`).join('')}
            <div class="row" style="margin-top:6px"><button class="btn sm" data-act="rubscore" data-path="${key}">${icon('check')} Score it</button>${rr.self != null ? `<span class="chip ${rr.self >= 0.99 ? 'good' : rr.self > 0 ? 'warn' : 'bad'}">${pct(rr.self)}%</span>` : ''}</div></div>`
          : `<div class="selfgrade"><span class="small muted" style="align-self:center">Compare to the model answer. How did you do?</span>${[[1, 'Nailed it'], [0.5, 'Partly'], [0, 'Missed it']].map(([v, t]) => `<button class="btn sm ${rr.self === v ? '' : 'secondary'}" data-act="self" data-path="${key}" data-v="${v}">${t}</button>`).join('')}</div>`;
        return `<textarea class="field" data-act="open" data-path="${key}" placeholder="Write your answer like you would on the exam (key terms + reasoning)…" ${mode === 'review' && onSelfGrade == null ? 'disabled' : ''}>${esc(rr.text || '')}</textarea>
          ${mode !== 'exam' ? (showModel ? `<div class="solbox"><div class="lbl">Model answer</div>${rich(qq.modelAnswer || qq.solution || '')}</div>${grading}`
            : `<div class="qactions"><button class="btn secondary sm" data-act="reveal" data-path="${key}">${icon('eye')} Show model answer</button><label class="small muted" style="display:flex;gap:6px;align-items:center"><input type="checkbox" data-act="paper" data-path="${key}" ${rr.paper ? 'checked' : ''}> I answered on paper</label></div>`) : ''}`;
      }
      case 'group': return qq.parts.map((p, k) => {
        const pk = [...path, k].join('.'), nh = st.phints[pk] || 0, ph = p.hints || [], L = String.fromCharCode(97 + k);
        const showSol = (mode === 'review' || st.sol || st.psol[pk]) && p.type !== 'open' && p.solution;
        return `<div class="part"><div class="plabel">Part ${L}</div>${rich(p.prompt || '')}${inputs(p, [...path, k])}
        ${mode === 'practice' ? ph.slice(0, nh).map((h, i) => `<div class="hintbox"><div class="lbl">Part ${L} · hint ${i + 1}</div>${rich(h)}</div>`).join('') : ''}
        ${mode === 'practice' && !st.done && !st.sol ? `<div class="row" style="margin-top:6px">${ph.length > nh ? `<button class="btn ghost sm" data-act="phint" data-path="${pk}">${icon('bulb')} Hint for part ${L}</button>` : ''}${p.type !== 'open' && p.solution && !st.psol[pk] && (st.tries > 0 || nh >= ph.length && ph.length) ? `<button class="btn ghost sm" data-act="psol" data-path="${pk}">${icon('eye')} Part ${L} solution</button>` : ''}</div>` : ''}
        ${showSol ? (mode === 'practice' && st.psol[pk] && !st.sol ? `<div class="solbox"><div class="lbl">Part ${L} solution</div>${rich(p.solution)}</div>` : `<details class="small" style="margin-top:8px"><summary class="muted" style="cursor:pointer;font-weight:700">Part ${L} solution</summary>${rich(p.solution)}</details>`) : ''}</div>`;
      }).join('');
    }
    return '';
  }
  function render() {
    const g = (st.checked || mode === 'review') ? grade(q, st.r) : null;
    const showOpenOnly = q.type === 'open';
    root.innerHTML = `
      <div class="qmeta">${label ? `<span class="chip core">${esc(label)}</span>` : ''}${q.number ? `<span class="chip">${esc(q.number)}</span>` : ''}${q.points ? `<span class="chip">${q.points} pts</span>` : ''}
        ${q.source ? `<span class="source">${esc(q.source)}</span>` : ''}${q.outOfScope ? `<span class="chip warn" title="${esc(q.scopeNote || '')}">Not on this year's topic list</span>` : ''}${q.answerConfidence === 'low' ? `<span class="chip warn" title="${esc(q.answerNote || '')}">Answer inferred</span>` : ''}</div>
      <div class="prompt">${rich(q.prompt || '')}</div>
      ${inputs(q, [])}
      ${mode === 'practice' ? `
        ${st.feedback ? `<div class="feedback ${st.feedback.cls}" role="status" aria-live="polite">${icon(st.feedback.cls === 'ok' ? 'check' : st.feedback.cls === 'bad' ? 'x' : 'bulb')}<span>${st.feedback.msg}</span></div>` : ''}
        ${st.feedback && st.feedback.why ? `<div class="whybox"><div class="lbl">Why ${st.feedback.whyLabel} is tempting but wrong</div>${rich(st.feedback.why)}</div>` : ''}
        ${(q.hints || []).slice(0, st.hints).map((h, k) => `<div class="hintbox"><div class="lbl">Hint ${k + 1}</div>${rich(h)}</div>`).join('')}
        ${st.sol && q.solution && !showOpenOnly ? `<div class="solbox"><div class="lbl">Worked solution</div>${rich(q.solution)}</div>` : ''}
        <div class="qactions">
          ${!showOpenOnly && !st.done && gradeAuto(q, initResp(q)) !== null ? `<button class="btn" data-act="check">${icon('check')} Check</button>` : ''}
          ${(q.hints || []).length > st.hints && !st.done && !st.sol ? `<button class="btn secondary" data-act="hint">${icon('bulb')} Get a hint</button>` : ''}
          ${!st.sol && !showOpenOnly ? (st.tries > 0 || st.done || ((q.hints || []).length && st.hints >= q.hints.length) ? `<button class="btn ghost" data-act="sol">${icon('eye')} Show solution</button>` : `<span class="small muted">Solution unlocks after your first try</span>`) : ''}
          <span class="spacer"></span>${tutorCtx && tutorOn() ? `<button class="btn ghost" data-act="ask">${icon('bulb')} Ask tutor</button>` : ''}<span id="qnext"></span>
        </div>` : ''}
      ${mode === 'review' && q.solution && !showOpenOnly ? `<div class="solbox"><div class="lbl">Worked solution</div>${rich(q.solution)}</div>` : ''}
      ${mode === 'review' && tutorCtx && tutorOn() ? `<div class="qactions"><button class="btn ghost sm" data-act="ask">${icon('bulb')} Ask the tutor about this question</button></div>` : ''}
      ${mode === 'review' && q.type === 'tfgroup' && q.solution ? '' : ''}`;
    if (root._afterRender) root._afterRender();
  }
  function emit() { onResp && onResp(structuredClone(st.r)); }
  function finishIfDone() {
    const g = grade(q, st.r);
    if (q.type === 'open' || (q.type === 'group' && hasOpen(q))) {
      if (g != null && (q.type === 'open' ? true : q.parts.every((p, k) => grade(p, st.r[k]) != null || p.type !== 'open'))) {
        if (!st.done) { st.done = true; onChecked && onChecked({ first: g >= 0.99, solved: g >= 0.99, score: g, revealed: true }); }
      }
    }
  }
  root.addEventListener('click', e => {
    const b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
    const act = b.dataset.act, path = b.dataset.path ? b.dataset.path.split('.').filter(x => x !== '').map(Number) : [];
    if (act === 'mc') { if (mode === 'practice' && st.done) return; setAt(path, +b.dataset.k); st.checked = false; st.feedback = null; emit(); render(); }
    else if (act === 'tf') { if (mode === 'practice' && st.done) return; setAt(path, b.dataset.v === 'true'); st.checked = false; st.feedback = null; emit(); render(); }
    else if (act === 'tfg') { if (mode === 'practice' && st.done) return; const arr = getAt(path) || []; arr[+b.dataset.k] = b.dataset.v === 'true'; setAt(path, arr); st.checked = false; st.feedback = null; emit(); render(); }
    else if (act === 'reveal') {
      const o = getAt(path) || { text: '', self: null };
      if (mode === 'practice' && words(o.text) < 12 && !o.paper) { toast('Write your answer first (a few sentences), or tick "I answered on paper".'); return; }
      o.revealed = true; setAt(path, o); emit(); render();
    }
    else if (act === 'paper') { const o = getAt(path) || { text: '', self: null }; o.paper = b.checked; setAt(path, o); emit(); return; }
    else if (act === 'rub') { const o = getAt(path) || { text: '', self: null }; o.rub = o.rub || []; o.rub[+b.dataset.i] = b.checked; setAt(path, o); emit(); return; }
    else if (act === 'rubscore') {
      const o = getAt(path) || { text: '', self: null }; let qq = q; for (const k of path) qq = qq.parts[k];
      const n = (rubricOf(qq) || []).length; o.self = n ? Math.round(((o.rub || []).filter(Boolean).length / n) * 100) / 100 : 0; o.revealed = true;
      setAt(path, o); emit(); render(); onSelfGrade && onSelfGrade(structuredClone(st.r)); if (mode === 'practice') finishIfDone();
    }
    else if (act === 'phint') { st.phints[b.dataset.path] = (st.phints[b.dataset.path] || 0) + 1; render(); }
    else if (act === 'psol') { st.psol[b.dataset.path] = true; render(); }
    else if (act === 'self') { const o = getAt(path) || { text: '', self: null }; o.self = +b.dataset.v; o.revealed = true; setAt(path, o); emit(); render(); onSelfGrade && onSelfGrade(structuredClone(st.r)); if (mode === 'practice') finishIfDone(); }
    else if (act === 'hint') { st.hints++; render(); }
    else if (act === 'ask' && tutorCtx) {
      const qText = q => [plain(q.prompt), ...(q.choices || []).map((ch, k) => `${LETTERS[k]}. ${plain(ch)}`), ...(q.statements || []).map((x, k) => `(${k + 1}) ${plain(x.text)}`), ...(q.parts || []).map((p, k) => `Part ${String.fromCharCode(97 + k)}: ` + qText(p))].join('\n');
      const attempted = st.tries > 0 || st.sol || st.done || mode === 'review';
      openTutor(tutorCtx.c, tutorCtx.u, { kind: 'question', attempted, label: q.number || label || 'this question', text: qText(q) + (attempted ? `\nOfficial solution: ${plain(q.solution || q.modelAnswer || '')}` : '') });
    }
    else if (act === 'sol') {
      st.sol = true; st.checked = true;
      if (!st.done) { st.done = true; const g = grade(q, st.r) || 0; onChecked && onChecked({ first: st.first === true, solved: g >= 0.99, score: g, revealed: true }); }
      render();
    }
    else if (act === 'check') {
      if (!answeredAuto(q, st.r)) { st.feedback = { cls: 'info', msg: q.type === 'group' ? 'Answer every part first.' : 'Pick or enter an answer first.' }; render(); return; }
      st.checked = true; st.tries++;
      const g = gradeAuto(q, st.r) ?? 0, ok = g >= 0.99;
      if (st.first == null) st.first = ok;
      if (ok) { st.done = true; st.feedback = { cls: 'ok', msg: st.tries === 1 ? ['Nice work!', 'Correct!', 'Nailed it!', 'Exactly right!'][Math.floor(Math.random() * 4)] : 'Correct — got there!' }; st.sol = st.sol || false; onChecked && onChecked({ first: st.first, solved: true, score: 1, revealed: false }); }
      else {
        if (st.tries === 1) onChecked && onChecked({ first: false, solved: false, score: g, revealed: false });
        if (q.type === 'mc') st.wrong[':' + st.r] = true;
        const why = q.type === 'mc' ? choiceWhy(q, st.r) : null;
        const slip = q.type === 'numeric' ? numericSlip(q, st.r) : null;
        st.feedback = { cls: 'bad', msg: q.type === 'tfgroup' || q.type === 'group' ? `Partly right (${pct(g)}%). Fix the red ones and try again${q.type === 'tfgroup' ? ' (explanations appear once you have it right, or open the solution)' : ''}.` : (slip ? `Not quite. ${slip}` : 'Not quite. Try again, use a hint, or see the solution.'), why, whyLabel: q.type === 'mc' ? LETTERS[st.r] : '' };
      }
      render();
    }
  });
  root.addEventListener('input', e => {
    const t = e.target; const act = t.dataset.act; if (!act) return;
    const path = t.dataset.path ? t.dataset.path.split('.').filter(x => x !== '').map(Number) : [];
    if (act === 'num') { setAt(path, t.value); if (st.checked && mode === 'practice' && !st.done) { st.checked = false; st.feedback = null; t.closest('.numwrap')?.classList.remove('right', 'wrong'); } emit(); }
    if (act === 'open') { const o = getAt(path) || { text: '', self: null }; o.text = t.value; setAt(path, o); emit(); }
    if (act === 'why') st.reasons[t.dataset.path + ':' + t.dataset.k] = t.value;
  });
  root.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.dataset.act === 'num' && mode === 'practice') { e.preventDefault(); $('[data-act="check"]', root)?.click(); } });
  render();
  root.state = st; root.rerender = render;
  return root;
}

// ============================================================ practice / quiz / mistakes runner
function viewPractice(c, kind, id, all = false) {
  let qs = [], title = '', back = `#/${c.id}`, u = null, l = null, sub = '';
  if (kind === 'testout') {
    ({ u, l } = findLesson(c, id)); if (!l) return viewCourse(c);
    qs = coreQs(l).slice(); title = `Test out: ${l.title}`; back = unitHref(c, u);
    sub = `${unitLabel(u)} · get all ${qs.length} right on the first try to skip this lesson`;
  } else if (kind === 'mixed') {
    const cp = checkpointsFor(c).find(x => String(x.upto) === String(id)) || checkpointsFor(c).slice(-1)[0];
    qs = sampleWeighted(mixedPool(c, cp.upto), cp.n); title = cp.title; sub = 'Interleaved retrieval practice · weighted toward what you missed or haven\'t tried';
    u = null; id = cp.upto;
  } else if (kind === 'lesson') {
    ({ u, l } = findLesson(c, id)); if (!l) return viewCourse(c);
    const full = (l.practice || []).slice(), core = coreQs(l);
    qs = all || full.length <= core.length ? full : core;
    title = qs === full ? `Practice: ${l.title}` : `Quick check: ${l.title}`; back = unitHref(c, u);
    sub = `${unitLabel(u)} · ${isCram(u) ? 'Part' : 'Lesson'} ${u.lessons.indexOf(l) + 1}` + (qs === core ? ` · ${core.length} of ${full.length} questions` : '');
  } else if (kind === 'quiz') {
    u = c.units.find(x => x.id === id); if (!u) return viewCourse(c);
    qs = (u.unitQuiz || []).slice(); title = `Unit ${u.num} quiz: ${u.title}`; back = `#/${c.id}/unit/${u.id}`; sub = 'Exam-style questions';
  } else {
    const p = P(c.id), missed = new Set([...Object.entries(p.q).filter(([, r]) => !r.c).map(([k]) => k), ...(p.examMissed || [])]);
    const pool = [...allQuestions(c).map(x => x.q), ...c.exams.flatMap(e => e.questions)];
    const seenIds = new Set(); const all = pool.filter(q => missed.has(q.id) && !seenIds.has(q.id) && seenIds.add(q.id));
    const examSet = new Set(p.examMissed || []);
    all.sort((a, b) => (examSet.has(b.id) - examSet.has(a.id)) || (Math.random() - 0.5));
    qs = all.slice(0, 12);
    title = 'Review my mistakes'; sub = `${qs.length} of ${all.length} missed questions this round · exam misses first · a question leaves the list once you get it right first try`;
  }
  const crumbsArr = [[c.code, `#/${c.id}`], u ? [unitLabel(u), unitHref(c, u)] : null, [kind === 'quiz' ? 'Quiz' : kind === 'review' ? 'Mistakes' : kind === 'mixed' ? 'Mixed review' : kind === 'testout' ? 'Test out' : 'Practice']];
  if (!qs.length) {
    shell(c, crumbsArr, `<div class="page narrow"><div class="card pad empty"><h2>${kind === 'review' ? 'No mistakes yet 🎯' : 'No questions here'}</h2><p>${kind === 'review' ? 'Questions you miss on the first try will collect here so you can drill them before the exam.' : ''}</p><a class="btn" href="${back}">Back</a></div></div>`);
    return;
  }
  const results = qs.map(() => null); let idx = 0, streak = 0;
  shell(c, crumbsArr, `<div class="page"><div class="qwrap">
    <div class="qhead"><div><div class="muted small" style="font-weight:800;text-transform:uppercase;letter-spacing:.08em">${esc(sub)}</div><h1 style="font-size:1.45rem;margin:.15em 0 0">${tex(esc(title))}</h1></div>
      <span class="spacer"></span><span class="streak" id="streak"></span></div>
    <div class="qdots" id="qdots"></div><div style="height:14px"></div>
    <div id="qslot"></div>
    <div class="row" style="margin-top:14px"><button class="btn secondary" id="qprev">${icon('prev')} Previous</button><span class="spacer"></span><button class="btn" id="qnextb">Next ${icon('next')}</button></div>
    ${footer()}</div></div>`);
  function dots() {
    $('#qdots').innerHTML = qs.map((q, k) => `<button class="${k === idx ? 'cur ' : ''}${results[k] == null ? '' : results[k] >= 0.99 ? 'ok' : 'bad'}" data-k="${k}" aria-label="Question ${k + 1}">${k + 1}</button>`).join('');
    $('#streak').innerHTML = streak >= 2 ? `${icon('bolt')} ${streak} in a row` : '';
  }
  function show() {
    const q = qs[idx];
    const owner = u || c.units.find(x => [...x.lessons.flatMap(y => y.practice || []), ...(x.unitQuiz || [])].some(z => z.id === q.id)) || lessonForQuestion(c, q).u;
    const v = QuestionView(q, {
      mode: 'practice', label: `Question ${idx + 1} of ${qs.length}`, tutorCtx: owner ? { c, u: owner } : null,
      onChecked: ({ first, solved, score }) => {
        if (results[idx] == null) {
          results[idx] = first ? 1 : 0;
          streak = first ? streak + 1 : 0;
          if (kind === 'review' && first) { const pp = P(c.id); if (pp.q[q.id]) pp.q[q.id].c = true; pp.examMissed = (pp.examMissed || []).filter(x => x !== q.id); saveP(c.id); }
        }
        if (kind !== 'review' && kind !== 'mixed') recordQ(c.id, q.id, first, solved, !first);
        if (kind === 'mixed') { const pp = P(c.id); const r = pp.q[q.id]; if (r) { r.c = r.c || first; r.t = Date.now(); } else pp.q[q.id] = { c: !!first, s: !!solved, r: !first, t: Date.now() }; saveP(c.id); }
        dots();
      },
    });
    $('#qslot').innerHTML = ''; $('#qslot').appendChild(v);
    $('#qprev').disabled = idx === 0; $('#qnextb').innerHTML = idx === qs.length - 1 ? `Finish ${icon('check')}` : `Next ${icon('next')}`;
    dots(); window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function finish() {
    const done = results.filter(r => r != null).length, right = results.filter(r => r >= 0.99).length;
    const score = qs.length ? right / qs.length : 0;
    if (kind === 'quiz') { const p = P(c.id); p.quiz[u.id] = Math.max(p.quiz[u.id] || 0, score); saveP(c.id); }
    if (kind === 'mixed') { const p = P(c.id); p.checkpoints = p.checkpoints || {}; p.checkpoints[id] = score; saveP(c.id); }
    let testedOut = false;
    if (kind === 'testout' && right === qs.length) { l.slides.forEach(s => markSeen(c.id, l.id, s.id)); testedOut = true; }
    const lessons = u && isCram(u) ? u.lessons.map(x => ({ ...x, unit: u })) : allLessons(c), li = l ? lessons.findIndex(x => x.id === l.id) : -1, nextL = li >= 0 ? lessons[li + 1] : null;
    const unitIdx = u ? c.units.indexOf(u) : -1, nextU = unitIdx >= 0 ? c.units[unitIdx + 1] : null;
    $('#view').innerHTML = `<div class="page narrow"><div class="card summary-hero">
      <div style="font-size:2.4rem">${score >= 0.8 ? '🏆' : score >= 0.5 ? '💪' : '📚'}</div>
      <div class="muted small" style="font-weight:800;text-transform:uppercase;letter-spacing:.08em">${esc(title)}</div>
      <div class="score">${right}/${qs.length}</div>
      <p class="muted">${done < qs.length ? `${qs.length - done} skipped · ` : ''}first-try correct ${kind === 'testout' ? (testedOut ? '— tested out! The lesson is marked done; skim its recap slide if you like.' : '— not quite. Watch the lesson: answering these first already primed you for it.') : score >= 0.8 ? '— excellent, you own this.' : score >= 0.5 ? '— solid. Redo the misses below.' : '— rewatch the lesson, then try again.'}</p>
      <div class="qdots" style="justify-content:center;margin:12px 0">${qs.map((q, k) => `<button class="${results[k] == null ? '' : results[k] >= 0.99 ? 'ok' : 'bad'}" disabled>${k + 1}</button>`).join('')}</div>
      <div class="row" style="justify-content:center;margin-top:10px">
        <button class="btn secondary" id="retry">${icon('redo')} Try again</button>
        ${kind === 'lesson' && !all && (l.practice || []).length > qs.length ? `<a class="btn secondary" href="#/${c.id}/practice/${l.id}/all">${icon('target')} All ${(l.practice || []).length} questions</a>` : ''}
        ${(kind === 'lesson' && score < 0.5) || (kind === 'testout' && !testedOut) ? `<a class="btn" href="#/${c.id}/learn/${l.id}">${icon('play')} ${kind === 'testout' ? 'Watch the lesson' : 'Rewatch the lesson'}</a>` : ''}
        ${kind === 'testout' && testedOut && nextL ? `<a class="btn" href="#/${c.id}/learn/${nextL.id}">Next lesson: ${esc(nextL.title)} ${icon('next')}</a>` : ''}
        ${kind === 'lesson' && nextL ? `<a class="btn" href="#/${c.id}/learn/${nextL.id}">Next lesson: ${esc(nextL.title)} ${icon('next')}</a>` : ''}
        ${kind === 'mixed' ? `<a class="btn" href="#/${c.id}">${icon('home')} Back to the plan</a><a class="btn secondary" href="#/${c.id}/review">Drill my mistakes</a>` : ''}
        ${kind === 'lesson' && !nextL ? `<a class="btn purple" href="#/${c.id}/exams">Practice exams</a>` : ''}
        ${kind === 'quiz' && nextU ? `<a class="btn" href="#/${c.id}/unit/${nextU.id}">Unit ${nextU.num}: ${esc(nextU.title)} ${icon('next')}</a>` : ''}
        ${kind === 'quiz' && !nextU ? `<a class="btn purple" href="#/${c.id}/exams">Practice exams</a>` : ''}
        <a class="btn ghost" href="${back}">Back</a></div></div>${footer()}</div>`;
    $('#retry').onclick = () => route();
  }
  $('#qdots').onclick = e => { const k = e.target.closest('button')?.dataset.k; if (k != null) { idx = +k; show(); } };
  $('#qprev').onclick = () => { if (idx > 0) { idx--; show(); } };
  $('#qnextb').onclick = () => { if (idx < qs.length - 1) { idx++; show(); } else finish(); };
  const onKey = e => {
    if (e.target.closest('input,textarea,select') || e.metaKey || e.ctrlKey || e.altKey || !$('#qslot')) return;
    const k = e.key.toLowerCase(), choices = $$('#qslot .choices:first-of-type .choice');
    const i = '123456'.indexOf(k) >= 0 ? '123456'.indexOf(k) : 'abcdef'.indexOf(k);
    if (i >= 0 && choices[i]) { e.preventDefault(); choices[i].click(); }
    else if (k === 'enter') { const b = $('#qslot [data-act="check"]'); if (b) { e.preventDefault(); b.click(); } }
    else if (k === 'n' || k === 'arrowright') { e.preventDefault(); $('#qnextb')?.click(); }
    else if (k === 'arrowleft') { e.preventDefault(); $('#qprev')?.click(); }
  };
  document.addEventListener('keydown', onKey); onCleanup(() => document.removeEventListener('keydown', onKey));
  show();
}

// ============================================================ exam center
const KIND = { real: ['Real past final', 'var(--accent4)'], problems: ['Official extra practice', 'var(--accent3)'], mock: ["Trevor's Academy mock", 'var(--accent)'] };
function examQuestions(e, includeOOS) { return e.questions.filter(q => includeOOS || !q.outOfScope); }
function examPoints(qs) { return sum(qs.map(q => q.points || 10)); }
const examKey = (c, eid) => `exam:${c.id}:${eid}`;
function examSession(c, eid) { const s = store.get(examKey(c, eid)); if (s) return s; const old = store.get('exam:' + c.id); return old && old.examId === eid ? old : null; }
function viewExams(c) {
  const p = P(c.id), live = c.exams.map(e => examSession(c, e.id)).filter(s => s && !s.submitted);
  const cards = c.exams.map(e => { const sess = examSession(c, e.id);
    const att = p.exams.filter(a => a.examId === e.id), best = att.length ? Math.max(...att.map(a => a.pct)) : null;
    const nIn = examQuestions(e, false).length, nOut = e.questions.length - nIn;
    const [kl, kc] = KIND[e.kind] || KIND.mock;
    return `<div class="card exam-card"><div class="kind" style="color:${kc}">${kl}</div><h3>${esc(e.title)}</h3>
      <div class="muted small">${esc(e.description || '')}</div>
      <div class="row small"><span class="chip">${nIn} questions</span>${nOut ? `<span class="chip warn" title="Topics not on this year's list">+${nOut} off-syllabus</span>` : ''}<span class="chip">${examPoints(examQuestions(e, false))} pts</span>${best != null ? `<span class="chip good">Best ${best}%</span>` : ''}${att.length ? `<span class="chip">${att.length} attempt${att.length > 1 ? 's' : ''}</span>` : ''}</div>
      <div class="row" style="margin-top:auto;padding-top:8px">${sess && sess.examId === e.id && !sess.submitted ? `<a class="btn good" href="#/${c.id}/exam/${e.id}">${icon('play')} Resume</a>` : `<a class="btn ${e.kind === 'real' ? 'purple' : ''}" href="#/${c.id}/exam/${e.id}">${icon('clock')} Start</a>`}</div></div>`;
  }).join('');
  const hist = p.exams.slice().reverse().slice(0, 12).map(a => {
    const e = c.exams.find(x => x.id === a.examId);
    return `<tr><td>${new Date(a.at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</td><td>${esc(e ? e.title : a.examId)}</td><td class="num"><b>${a.pct}%</b></td><td class="num">${a.score}/${a.max}</td><td class="num">${fmtClock(a.secs)}${a.over > 0 ? ` <span class="chip bad">+${fmtClock(a.over)}</span>` : ''}</td></tr>`;
  }).join('');
  shell(c, [[c.code, `#/${c.id}`], ['Practice exams']], `<div class="page"><div class="with-side">${sideNav(c, null)}<div>
    <h1>Practice exams</h1>
    <p class="muted">The on-screen timer defaults to the official ${c.exam?.minutes || 75} minutes. You can switch to 60 minutes or turn on 1.5× extended time. It never locks you out: when time runs out, it keeps counting your overtime so you know where you stand.</p>
    ${c.examsNote ? `<div class="callout tip" style="margin:14px 0">${icon('bulb')} ${esc(c.examsNote)}</div>` : ''}
    ${live.map(sess => `<div class="callout exam" style="margin:14px 0">Exam in progress: <b>${esc(c.exams.find(e => e.id === sess.examId)?.title || '')}</b>. <a href="#/${c.id}/exam/${sess.examId}">Resume →</a></div>`).join('')}
    <div class="grid cols3" style="margin-top:16px">${cards}</div>
    ${hist ? `<div class="section-title"><h2>Your attempts</h2></div><div class="card pad" style="overflow-x:auto"><table class="topic-table"><tbody>${hist}</tbody></table></div>` : ''}
    ${footer()}</div></div></div>`);
}

// ============================================================ exam runner
function viewExam(c, eid) {
  const e = c.exams.find(x => x.id === eid); if (!e) return viewExams(c);
  const skey = examKey(c, eid);
  let sess = examSession(c, eid);
  if (sess && !sess.submitted) return runExam(c, e, sess);
  if (sess && sess.submitted) return examResults(c, e, sess);
  // setup screen
  const base = c.exam?.minutes || 75, nOut = e.questions.filter(q => q.outOfScope).length;
  const opts = { minutes: base, extended: false, mode: e.kind === 'problems' ? 'study' : 'exam', oos: false };
  shell(c, [[c.code, `#/${c.id}`], ['Exams', `#/${c.id}/exams`], [e.title]], `<div class="page"><div class="exam-setup card pad">
    <div class="kind small" style="font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:${(KIND[e.kind] || KIND.mock)[1]}">${(KIND[e.kind] || KIND.mock)[0]}</div>
    <h1 style="margin-top:.2em">${esc(e.title)}</h1>
    ${e.instructions ? rich(e.instructions, 'muted') : ''}
    ${sess && sess.examId !== eid && !sess.submitted ? `<div class="callout warn">Starting this will discard your unfinished attempt at <b>${esc(c.exams.find(x => x.id === sess.examId)?.title || 'another exam')}</b>.</div>` : ''}
    <div class="opt-group"><div class="lbl">Time limit</div><div class="seg" id="tmin">${[[base, `${base} min (official)`], ...(base !== 60 ? [[60, '60 min']] : []), ...(base !== 75 ? [[75, '75 min']] : [])].map(([m, t]) => `<button data-m="${m}" class="${m === base ? 'on' : ''}">${t}</button>`).join('')}</div>
      <label class="switch"><input type="checkbox" id="ext"> 1.5× extended time</label><div class="small muted" id="tsum"></div></div>
    <div class="opt-group"><div class="lbl">Mode</div><div class="seg" id="tmode"><button data-v="exam" class="${opts.mode === 'exam' ? 'on' : ''}">Exam mode: see answers at the end</button><button data-v="study" class="${opts.mode === 'study' ? 'on' : ''}">Study mode: check as you go</button></div></div>
    ${nOut ? `<div class="opt-group"><label class="switch"><input type="checkbox" id="oos"> Include ${nOut} question${nOut > 1 ? 's' : ''} on topics not on this year's list</label></div>` : ''}
    <div class="row"><button class="btn big purple" id="go">${icon('clock')} Start exam</button><a class="btn ghost" href="#/${c.id}/exams">Cancel</a></div>
    <p class="small muted" style="margin-top:14px">Tip: work on paper as if it were the real thing, then enter your final answers. There's an optional scratch box under each question for writing out your justification.</p>
  </div>${footer()}</div>`);
  const tsum = () => { const m = opts.minutes * (opts.extended ? 1.5 : 1); $('#tsum').textContent = `Total: ${fmtClock(m * 60)} for ${examQuestions(e, opts.oos).length} questions (${examPoints(examQuestions(e, opts.oos))} pts)`; };
  $('#tmin').onclick = ev => { const b = ev.target.closest('button'); if (!b) return; opts.minutes = +b.dataset.m; $$('#tmin button').forEach(x => x.classList.toggle('on', x === b)); tsum(); };
  $('#ext').onchange = ev => { opts.extended = ev.target.checked; tsum(); };
  $('#tmode').onclick = ev => { const b = ev.target.closest('button'); if (!b) return; opts.mode = b.dataset.v; $$('#tmode button').forEach(x => x.classList.toggle('on', x === b)); };
  if ($('#oos')) $('#oos').onchange = ev => { opts.oos = ev.target.checked; tsum(); };
  tsum();
  $('#go').onclick = () => {
    const qs = examQuestions(e, opts.oos);
    sess = { examId: eid, qids: qs.map(q => q.id), limit: opts.minutes * 60 * (opts.extended ? 1.5 : 1), extended: opts.extended, mode: opts.mode, startedAt: Date.now(), pausedMs: 0, pausedAt: null, resp: {}, flags: {}, checked: {}, scratch: {}, idx: 0, submitted: false };
    store.set(skey, sess); runExam(c, e, sess);
  };
}
function elapsed(sess) { return ((sess.pausedAt || sess.submittedAt || Date.now()) - sess.startedAt - sess.pausedMs) / 1000; }
function runExam(c, e, sess) {
  const skey = examKey(c, e.id), save = () => store.set(skey, sess);
  const qs = sess.qids.map(id => e.questions.find(q => q.id === id)).filter(Boolean);
  shell(c, [[c.code, `#/${c.id}`], ['Exams', `#/${c.id}/exams`], [e.title]], `<div class="page">
    <div class="examhead"><b style="font-family:var(--display)">${esc(e.title)}</b><span class="chip">${sess.mode === 'study' ? 'Study mode' : 'Exam mode'}</span>${sess.extended ? '<span class="chip high">1.5× time</span>' : ''}
      <span class="spacer"></span><span class="timer" id="timer">${icon('clock')}<span id="tt"></span></span>
      <button class="btn secondary sm" id="pause">${icon('pausec')} Pause</button>
      <button class="btn purple sm" id="submit">Submit</button></div>
    <div id="overban"></div>
    <div class="qwrap"><div class="qdots" id="qdots"></div><div style="height:14px"></div><div id="qslot"></div>
      <details class="scratch card pad" style="margin-top:14px"><summary>Scratch work / justification (optional, saved with your attempt)</summary><textarea class="field" id="scr" style="margin-top:10px" placeholder="Show your work here, the same way you'd justify it on paper."></textarea></details>
      <div class="row" style="margin-top:14px"><button class="btn secondary" id="qprev">${icon('prev')} Previous</button><button class="btn ghost" id="flag">${icon('flag')} Flag</button><span class="spacer"></span><button class="btn" id="qnextb">Next ${icon('next')}</button></div></div>${footer()}</div>`);
  const tick = () => {
    const el = elapsed(sess), rem = sess.limit - el, t = $('#timer'); if (!t) return;
    if (rem >= 0) { $('#tt').textContent = fmtClock(rem) + ' left'; t.className = 'timer' + (rem < 300 ? ' low' : '') + (sess.pausedAt ? ' paused' : ''); }
    else { $('#tt').textContent = '+' + fmtClock(-rem) + ' over'; t.className = 'timer over' + (sess.pausedAt ? ' paused' : ''); if (!$('#overban').innerHTML) $('#overban').innerHTML = `<div class="overbanner">${icon('clock')}<span>Time's up! On the real exam you'd be handing it in now. Keep going if you want: nothing is locked, and your overtime is tracked.</span></div>`; }
  };
  const iv = setInterval(tick, 250); onCleanup(() => clearInterval(iv)); tick();
  $('#pause').onclick = () => {
    if (sess.pausedAt) { sess.pausedMs += Date.now() - sess.pausedAt; sess.pausedAt = null; $('#pause').innerHTML = `${icon('pausec')} Pause`; $('#qslot').style.filter = ''; }
    else { sess.pausedAt = Date.now(); $('#pause').innerHTML = `${icon('play')} Resume`; $('#qslot').style.filter = 'blur(7px)'; }
    save(); tick();
  };
  if (sess.pausedAt) { $('#pause').innerHTML = `${icon('play')} Resume`; $('#qslot').style.filter = 'blur(7px)'; }
  function dots() {
    $('#qdots').innerHTML = qs.map((q, k) => {
      const r = sess.resp[q.id], ch = sess.checked[q.id];
      let cls = k === sess.idx ? 'cur ' : '';
      if (sess.mode === 'study' && ch != null) cls += ch >= 0.99 ? 'ok' : 'bad'; else if (answered(q, r)) cls += 'ans';
      if (sess.flags[q.id]) cls += ' flag';
      return `<button class="${cls}" data-k="${k}" title="${sess.flags[q.id] ? 'Flagged' : ''}">${k + 1}</button>`;
    }).join('');
  }
  function show() {
    const q = qs[sess.idx];
    const v = QuestionView(q, {
      mode: sess.mode === 'study' ? 'practice' : 'exam', resp: sess.resp[q.id], label: `Question ${sess.idx + 1} of ${qs.length}`,
      onResp: r => { sess.resp[q.id] = r; save(); dots(); },
      onChecked: ({ first, score }) => { if (sess.checked[q.id] == null) { sess.checked[q.id] = first ? 1 : 0; save(); dots(); } },
    });
    $('#qslot').innerHTML = ''; $('#qslot').appendChild(v);
    $('#scr').value = sess.scratch[q.id] || '';
    $('#qprev').disabled = sess.idx === 0;
    $('#qnextb').innerHTML = sess.idx === qs.length - 1 ? `Review & submit ${icon('check')}` : `Next ${icon('next')}`;
    $('#flag').classList.toggle('on', !!sess.flags[q.id]); $('#flag').innerHTML = `${icon('flag')} ${sess.flags[q.id] ? 'Flagged' : 'Flag'}`;
    dots(); save();
  }
  $('#scr').oninput = ev => { sess.scratch[qs[sess.idx].id] = ev.target.value; save(); };
  $('#qdots').onclick = ev => { const k = ev.target.closest('button')?.dataset.k; if (k != null) { sess.idx = +k; show(); } };
  $('#qprev').onclick = () => { if (sess.idx > 0) { sess.idx--; show(); window.scrollTo({ top: 0 }); } };
  $('#qnextb').onclick = () => { if (sess.idx < qs.length - 1) { sess.idx++; show(); window.scrollTo({ top: 0 }); } else $('#submit').click(); };
  $('#flag').onclick = () => { sess.flags[qs[sess.idx].id] = !sess.flags[qs[sess.idx].id]; show(); };
  $('#submit').onclick = () => {
    const un = qs.filter(q => !answered(q, sess.resp[q.id])).length, fl = qs.filter(q => sess.flags[q.id]).length;
    if ((un || fl) && !confirm(`${un ? `${un} question${un > 1 ? 's are' : ' is'} unanswered. ` : ''}${fl ? `${fl} flagged. ` : ''}Submit anyway?`)) return;
    if (sess.pausedAt) { sess.pausedMs += Date.now() - sess.pausedAt; sess.pausedAt = null; }
    sess.submitted = true; sess.submittedAt = Date.now(); save();
    recordAttempt(c, e, sess); examResults(c, e, sess);
  };
  show();
}
function scoreExam(e, sess) {
  const qs = sess.qids.map(id => e.questions.find(q => q.id === id)).filter(Boolean);
  let score = 0, max = 0, pending = 0; const per = {};
  qs.forEach(q => { const pts = q.points || 10, g = grade(q, sess.resp[q.id] ?? initResp(q)); max += pts; if (g == null) pending++; score += (g || 0) * pts; per[q.id] = g; });
  return { qs, score: Math.round(score * 10) / 10, max, pending, per, pct: max ? Math.round(score / max * 100) : 0 };
}
function recordAttempt(c, e, sess) {
  const s = scoreExam(e, sess), p = P(c.id), el = elapsed(sess);
  const a = { examId: e.id, at: sess.startedAt, score: s.score, max: s.max, pct: s.pct, secs: Math.round(el), over: Math.max(0, Math.round(el - sess.limit)), mode: sess.mode };
  const k = p.exams.findIndex(x => x.examId === e.id && x.at === sess.startedAt);
  if (k >= 0) p.exams[k] = a; else p.exams.push(a);
  p.examMissed = [...new Set([...(p.examMissed || []), ...s.qs.filter(q => s.per[q.id] != null && s.per[q.id] < 0.99).map(q => q.id)])];
  saveP(c.id);
}
// map an exam question to the lesson that teaches it: shared topic tags, rarer tags count more
const tagIndexCache = {};
function lessonForQuestion(c, q) {
  let idx = tagIndexCache[c.id];
  if (!idx) {
    idx = { tag: {}, n: 0 };
    c.units.forEach(u => u.lessons.forEach(l => [...(l.practice || []), ...(u.unitQuiz || []).filter(() => u.lessons[0] === l)].forEach(x => walkQ(x, y => (y.tags || []).forEach(t => { const m = idx.tag[t] || (idx.tag[t] = {}); m[l.id] = (m[l.id] || 0) + 1; })))));
    tagIndexCache[c.id] = idx;
  }
  const score = {};
  const tags = new Set(); walkQ(q, y => (y.tags || []).forEach(t => tags.add(t)));
  tags.forEach(t => { const m = idx.tag[t]; if (!m) return; const spread = Object.keys(m).length; Object.entries(m).forEach(([lid, n]) => { score[lid] = (score[lid] || 0) + (1 + Math.log(1 + n)) / spread; }); });
  const best = Object.entries(score).sort((a, b) => b[1] - a[1])[0];
  return best ? findLesson(c, best[0]) : {};
}
function examResults(c, e, sess) {
  const s = scoreExam(e, sess), el = elapsed(sess), over = el - sess.limit;
  const groups = {};
  s.qs.forEach((q, k) => { const { u, l } = lessonForQuestion(c, q); const key = l ? l.id : '_'; const o = groups[key] || (groups[key] = { u, l, got: 0, max: 0, qn: [] }); o.max += q.points || 10; o.got += (s.per[q.id] || 0) * (q.points || 10); o.qn.push(k + 1); });
  const trows = Object.values(groups).sort((a, b) => a.got / a.max - b.got / b.max).map(o => { const f = o.got / o.max;
    return `<tr><td>${o.l ? `<b>Unit ${o.u.num}:</b> ${esc(o.l.title)}` : 'Other'}<div class="small muted">Q${o.qn.join(', Q')}</div></td><td style="width:30%"><div class="bar"><i style="width:${pct(f)}%;background:${f >= 0.7 ? 'var(--accent2)' : f >= 0.4 ? 'var(--accent3)' : 'var(--bad)'}"></i></div></td><td class="num">${Math.round(o.got * 10) / 10}/${o.max}</td>
      <td class="num" style="white-space:nowrap">${o.l && f < 0.99 ? `<a class="btn ghost sm" href="#/${c.id}/learn/${o.l.id}">${icon('play')} Rewatch</a><a class="btn ghost sm" href="#/${c.id}/practice/${o.l.id}/all">${icon('target')} Practice</a>` : ''}</td></tr>`; }).join('');
  shell(c, [[c.code, `#/${c.id}`], ['Exams', `#/${c.id}/exams`], [e.title, null], ['Results']], `<div class="page"><div class="qwrap">
    <div class="card summary-hero"><div class="muted small" style="font-weight:800;text-transform:uppercase;letter-spacing:.08em">${esc(e.title)} · results</div>
      <div class="score" id="bigscore">${s.pct}%</div><div class="muted" id="ptsline">${s.score} / ${s.max} points${s.pending ? ` · <b>${s.pending}</b> written answer${s.pending > 1 ? 's' : ''} to self-grade below` : ''}</div>
      <div class="row" style="justify-content:center;margin-top:12px"><span class="chip">${icon('clock')} ${fmtClock(el)} used of ${fmtClock(sess.limit)}</span>${over > 0 ? `<span class="chip bad">+${fmtClock(over)} overtime</span>` : `<span class="chip good">Finished in time</span>`}${sess.extended ? '<span class="chip high">1.5× time</span>' : ''}</div>
      <div class="row" style="justify-content:center;margin-top:16px"><button class="btn purple" id="retake">${icon('redo')} Retake</button><a class="btn secondary" href="#/${c.id}/review">Drill my mistakes</a><a class="btn ghost" href="#/${c.id}/exams">All exams</a></div></div>
    <div class="section-title"><h2>By lesson</h2><span class="muted small">weakest first: rewatch these, then practice similar questions</span></div>
    <div class="card pad" style="overflow-x:auto"><table class="topic-table"><tbody>${trows}</tbody></table></div>
    <div class="section-title"><h2>Question review</h2><span class="spacer"></span><div class="seg" id="rf"><button data-v="need" class="on">Needs attention</button><button data-v="all">All</button></div></div><div class="grid" id="rev"></div>${footer()}</div></div>`);
  const rev = $('#rev');
  const needs = q => { const g = s.per[q.id]; return g == null || g < 0.99 || sess.flags[q.id]; };
  const applyFilter = v => { $$('#rev > .qcard').forEach(el => { el.style.display = v === 'all' || el.dataset.need === '1' ? '' : 'none'; }); $$('#rf button').forEach(b => b.classList.toggle('on', b.dataset.v === v)); };
  s.qs.forEach((q, k) => {
    const g = s.per[q.id];
    const head = document.createElement('div'); head.className = 'rhead';
    head.innerHTML = `<b>Q${k + 1}</b>${g == null ? '<span class="chip warn">Self-grade</span>' : g >= 0.99 ? '<span class="chip good">Correct</span>' : g > 0 ? `<span class="chip warn">Partial ${pct(g)}%</span>` : '<span class="chip bad">Missed</span>'}<span class="pts">${Math.round((g || 0) * (q.points || 10) * 10) / 10}/${q.points || 10}</span>`;
    const v = QuestionView(q, {
      mode: 'review', resp: sess.resp[q.id] ?? initResp(q), tutorCtx: lessonForQuestion(c, q).u ? { c, u: lessonForQuestion(c, q).u } : null,
      onSelfGrade: r => { sess.resp[q.id] = r; store.set(examKey(c, e.id), sess); recordAttempt(c, e, sess); const ns = scoreExam(e, sess); $('#bigscore').textContent = ns.pct + '%'; $('#ptsline').innerHTML = `${ns.score} / ${ns.max} points${ns.pending ? ` · <b>${ns.pending}</b> to self-grade` : ''}`; },
    });
    v.prepend(head);
    if (sess.scratch[q.id]) { const d = document.createElement('details'); d.className = 'scratch'; d.innerHTML = `<summary>Your scratch work</summary><div class="callout" style="white-space:pre-wrap">${esc(sess.scratch[q.id])}</div>`; v.appendChild(d); }
    const { l: tl } = lessonForQuestion(c, q);
    if (tl && (g == null || g < 0.99)) { const a = document.createElement('div'); a.className = 'row small'; a.style.marginTop = '10px'; a.innerHTML = `<span class="muted">Taught in:</span> <a href="#/${c.id}/learn/${tl.id}">${esc(tl.title)}</a>`; v.appendChild(a); }
    v.dataset.need = needs(q) ? '1' : '0';
    rev.appendChild(v);
  });
  applyFilter(s.qs.some(needs) ? 'need' : 'all');
  $('#rf').onclick = ev => { const b = ev.target.closest('button'); if (b) applyFilter(b.dataset.v); };
  $('#retake').onclick = () => { store.del(examKey(c, e.id)); store.del('exam:' + c.id); route(); };
}

// ============================================================ cheat sheet
function cheatData(c) {
  if (c.cheatsheet && (c.cheatsheet.sections || []).length) return c.cheatsheet;
  return { title: `${c.code} cheat sheet`, sections: c.units.map(u => ({ title: `${u.num}. ${u.title}`, items: [...(u.keyFormulas || []).map(k => ({ name: k.name, tex: k.tex, note: k.note })), ...(u.keyFacts || []).map(f => ({ html: f }))] })).filter(s => s.items.length) };
}
// encrypted course files (sheet PDF / page images) → object URLs
const fileCache = new Map();
function fileUrl(hash, type) {
  if (!fileCache.has(hash)) {
    const p = fetch(`files/${hash}.bin`).then(r => { if (!r.ok) throw new Error('file'); return r.arrayBuffer(); })
      .then(b => decryptBuf(KEY, b)).then(pl => URL.createObjectURL(new Blob([pl], { type })));
    p.catch(() => fileCache.delete(hash)); fileCache.set(hash, p);
  }
  return fileCache.get(hash);
}
function viewSheet(c) {
  const sh = c.sheet, label = c.sheetLabel || 'Cheat sheet';
  const fname = `${c.code} ${c.title} - ${label}.pdf`;
  shell(c, [[c.code, `#/${c.id}`], [label]], `<div class="page">
    <div class="cs-toolbar"><div><h1 style="margin:0">${esc(sh.title || label)}</h1>
      <div class="muted small">${c.exam?.allowed ? esc(c.exam.allowed) + ' · ' : ''}Print it double-sided (flip on the short edge for landscape) and write your name on both sides.</div></div>
      <span class="spacer"></span>
      <button class="btn" id="dl">${icon('print')} Download PDF</button>
      <button class="btn secondary" id="op">${icon('eye')} Open PDF</button></div>
    <div class="sheet-pages" id="sp">${sh.pages.map((_, i) => `<figure class="sheet-page ${sh.orientation}"><div class="spinner"></div><figcaption>Side ${i + 1} of ${sh.pages.length}</figcaption></figure>`).join('')}</div>
    <p class="small muted" style="margin-top:12px">Tip: click a page to open it full size. The PDF prints at exactly two pages on US Letter; choose "Actual size" (not "Fit") in the print dialog.</p>
    ${footer()}</div>`);
  // a file that won't load usually means a newer sheet was deployed after this tab loaded: fetch it and redraw
  let healing = null;
  const heal = () => (healing ||= checkForUpdate(true).then(u => { if (u && location.hash === `#/${c.id}/cheatsheet`) route(); return u; }));
  sh.pages.forEach((h, i) => fileUrl(h, 'image/png').then(u => {
    const fig = $$('#sp figure')[i]; if (!fig) return;
    fig.innerHTML = `<a href="${u}" target="_blank" rel="noopener"><img alt="${esc(label)} side ${i + 1}" src="${u}"></a><figcaption>Side ${i + 1} of ${sh.pages.length}</figcaption>`;
  }).catch(() => heal().then(u => {
    const fig = $$('#sp figure')[i];
    if (!u && fig) fig.innerHTML = `<p class="muted small" style="padding:24px">Couldn't load side ${i + 1}. Check your connection and refresh the page.</p><figcaption>Side ${i + 1} of ${sh.pages.length}</figcaption>`;
  })));
  const getPdf = () => fileUrl(sh.pdf, 'application/pdf');
  const pdfFailed = msg => heal().then(u => toast(u ? 'The sheet was just updated. Try again.' : msg));
  $('#dl').onclick = () => getPdf().then(u => { const a = document.createElement('a'); a.href = u; a.download = fname; document.body.appendChild(a); a.click(); a.remove(); }).catch(() => pdfFailed('Download failed'));
  $('#op').onclick = () => getPdf().then(u => window.open(u, '_blank', 'noopener')).catch(() => pdfFailed('Could not open the PDF'));
}
function viewCheatsheet(c) {
  if (c.sheet && (c.sheet.pages || []).length) return viewSheet(c);
  const d = cheatData(c);
  const size = store.get('cs-size:' + c.id, 8.2);
  const secs = d.sections.map(s => `<div class="cs-sec"><h4>${tex(esc(s.title))}</h4>${s.items.map(it => `<div class="cs-item">${it.name ? `<span class="n">${tex(esc(it.name))}</span> ` : ''}${it.tex ? `<div class="t">${texBlock(it.tex)}</div>` : ''}${it.html ? tex(it.html) : ''}${it.note ? `<div class="note">${tex(it.note)}</div>` : ''}</div>`).join('')}</div>`).join('');
  shell(c, [[c.code, `#/${c.id}`], [c.sheetLabel || 'Cheat sheet']], `<div class="page">
    <div class="cs-toolbar"><div><h1 style="margin:0">${esc(d.title || c.sheetLabel || 'Cheat sheet')}</h1><div class="muted small">${esc(d.subtitle || (c.exam?.allowed ? c.exam.allowed + '. Print it, then add your own notes in the margins.' : 'Print it, then add your own notes in the margins.'))}</div></div>
      <span class="spacer"></span>
      <label class="small muted row" style="gap:6px">Print size <input type="range" id="csz" min="6.5" max="10" step="0.1" value="${size}"><b id="cszv">${size}pt</b></label>
      <button class="btn" id="pr">${icon('print')} Print / save PDF</button></div>
    <div class="callout tip no-print" style="margin-bottom:14px">Print double-sided on letter paper. If it spills onto a third page, nudge the print size down. Write your name on both sides; the exam rules require it.</div>
    <div class="cheatsheet" id="cs" style="--cs-size:${size}pt"><div class="cs-name-line">Name: ________________________ · ${esc(c.code)} ${esc(c.title)}</div>${secs}</div>${footer()}</div>`);
  $('#csz').oninput = ev => { const v = +ev.target.value; $('#cs').style.setProperty('--cs-size', v + 'pt'); $('#cszv').textContent = v + 'pt'; store.set('cs-size:' + c.id, v); };
  $('#pr').onclick = () => window.print();
}


// ============================================================ AI tutor (Claude via the Anthropic JS SDK)
const serverLive = () => !!(DATA && DATA.server && DATA.server.live);
const tutorOn = () => serverLive() || !!(DATA && DATA.tutor && DATA.tutor.key);
// ---- direct mode (until the Mac mini server is reachable): Anthropic JS SDK in the browser
const SDK_URL = 'https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@0.129.0/+esm';
let sdkPromise = null, tutorClient = null;
async function getTutorClient() {
  if (tutorClient) return tutorClient;
  sdkPromise = sdkPromise || import(SDK_URL);
  const mod = await sdkPromise; const Anthropic = mod.default || mod.Anthropic;
  return (tutorClient = new Anthropic({ apiKey: DATA.tutor.key, dangerouslyAllowBrowser: true }));
}
const unitCtxCache = {};
function unitContext(c, u) {
  const k = c.id + ':' + u.id; if (unitCtxCache[k]) return unitCtxCache[k];
  const lines = [`UNIT ${u.num}: ${u.title}`, u.tagline || '', 'Objectives: ' + (u.objectives || []).map(plain).join(' | ')];
  u.lessons.forEach((l, li) => {
    lines.push(`\n## Lesson ${li + 1}: ${l.title}`);
    l.slides.forEach(sl => lines.push(`### ${plain(sl.title)}${sl.kicker ? ' [' + plain(sl.kicker) + ']' : ''}\n${plain(sl.html)}${(sl.steps || []).length ? '\nSteps: ' + sl.steps.map(plain).join(' → ') : ''}${sl.examTip ? '\nExam tip: ' + plain(sl.examTip) : ''}`));
  });
  if ((u.keyFormulas || []).length) lines.push('\n## Key formulas\n' + u.keyFormulas.map(f => `- ${plain(f.name)}: ${f.tex}${f.note ? ' (' + plain(f.note) + ')' : ''}`).join('\n'));
  if ((u.keyFacts || []).length) lines.push('\n## Key facts\n' + u.keyFacts.map(f => '- ' + plain(f)).join('\n'));
  return (unitCtxCache[k] = lines.join('\n'));
}
function tutorSystem(c, u) {
  return `You are the tutor inside Trevor's Academy, a one-day cram course for ${c.code} ${c.title} (${c.school || ''}). The final exam is ${c.exam?.dates || 'soon'}; format: ${c.exam?.questions || ''}; ${c.exam?.rule || ''}.
How to tutor:
- Teach like a great TA the night before the exam: short, clear, exam-focused. Lead with the direct answer or next step, then the why. Usually under 180 words unless asked for more.
- Use the course's own notation, conventions and wording from the material below${c.id === 'gfi' ? " (this exam re-uses the professor's slide wording, so quote it when it matters)" : ''}. If something isn't covered in the material, say so and give the standard textbook view briefly.
- Math in LaTeX with \\( ... \\) inline or \\[ ... \\] display (never $). Show calculations step by step with numbers.
- If the student is asking about a practice question they have NOT attempted yet, do not give the final answer or the correct option: give a hint or the method, and invite them to try.
- Stay on this course. Politely decline requests unrelated to studying for it.
- Plain formatting only: short paragraphs, "- " bullets, **bold** for key terms. No headings, no tables.

COURSE MATERIAL FOR THIS UNIT (from the professors' slides, problem sets and the course's lessons):
${unitContext(c, u)}`;
}
async function streamDirect(c, u, msgs, reply, S) {
  const client = await getTutorClient();
  const stream = client.beta.messages.stream({
    model: DATA.tutor.model, max_tokens: 4000,
    betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default',
    output_config: { effort: 'low' },
    system: [{ type: 'text', text: tutorSystem(c, u), cache_control: { type: 'ephemeral' } }],
    messages: msgs,
  }, { signal: S.abort.signal });
  for await (const ev of stream) if (ev.type === 'content_block_delta' && ev.delta.type === 'text_delta') { reply.content += ev.delta.text; renderTutorLog(); }
  const fin = await stream.finalMessage();
  if (fin.stop_reason === 'refusal' && !reply.content) reply.content = "I can't help with that one. Try rephrasing it as a question about the course material.";
}
function mdLite(t) {
  const out = []; let list = [];
  const flush = () => { if (list.length) { out.push('<ul>' + list.map(x => `<li>${x}</li>`).join('') + '</ul>'); list = []; } };
  const inline = x => esc(x).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '<code>$1</code>');
  String(t).split(/\n/).forEach(line => {
    const m = line.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)$/);
    if (m) list.push(inline(m[1]));
    else { flush(); if (line.trim()) out.push(`<p>${inline(line)}</p>`); }
  });
  flush(); return tex(out.join(''));
}
// ---- voice input: ask questions by microphone (Web Speech recognition); answers stay text
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
const voiceIn = !!SR;
let recog = null;
function listen(c, u) {
  if (!voiceIn) { toast('Voice input needs Chrome, Edge or Safari.'); return; }
  if (recog) { recog.stop(); return; }
  if (window.speechSynthesis) speechSynthesis.cancel();
  recog = new SR(); recog.lang = 'en-US'; recog.interimResults = true; recog.continuous = false;
  const tin = $('#tin'), mic = $('#tmic'); let final = '';
  mic && mic.classList.add('rec'); if (tin) tin.placeholder = 'Listening… speak your question';
  recog.onresult = e => { let interim = ''; for (const r of e.results) { if (r.isFinal) final = r[0].transcript; else interim += r[0].transcript; } if (tin) tin.value = final || interim; };
  recog.onerror = e => { if (e.error === 'not-allowed') toast('Microphone permission was blocked. Allow it in the browser to talk to the tutor.'); };
  recog.onend = () => {
    recog = null; mic && mic.classList.remove('rec'); if (tin) tin.placeholder = 'Ask anything about this…';
    const q = (tin && tin.value || '').trim(); if (q) { tin.value = ''; askTutor(c, u, q); }
  };
  try { recog.start(); } catch { recog = null; }
}
let tutorState = null;
function closeTutor() { const d = $('#tutor'); if (d) d.remove(); if (tutorState) tutorState.abort?.abort(); tutorState = null; if (recog) { recog.abort(); recog = null; } if (window.speechSynthesis) speechSynthesis.cancel(); }
function openTutor(c, u, focus) {
  if (!tutorOn()) { toast('The tutor is not enabled on this site yet.'); return; }
  if (!u) return;
  if (!tutorState || tutorState.key !== c.id + ':' + u.id) tutorState = { key: c.id + ':' + u.id, msgs: [], focus: null };
  tutorState.focus = focus;
  let d = $('#tutor');
  if (!d) {
    d = document.createElement('aside'); d.id = 'tutor'; d.className = 'tutor'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-label', 'Ask the tutor');
    d.innerHTML = `<div class="tutor-head">${icon('bulb')}<b>Ask the tutor</b><span class="chip">${esc(u.title.slice(0, 34))}</span><span class="spacer"></span><button class="icon-btn" id="tclose" aria-label="Close">${icon('x')}</button></div>
      <div class="tutor-focus" id="tfocus"></div><div class="tutor-log" id="tlog"></div>
      <div class="tutor-sugg" id="tsugg"></div>
      <form class="tutor-form" id="tform"><textarea class="field" id="tin" rows="2" placeholder="Ask anything about this…"></textarea>${voiceIn ? `<button type="button" class="icon-btn mic" id="tmic" title="Ask by voice" aria-label="Ask by voice">${icon('mic')}</button>` : ''}<button class="btn" id="tsend">${icon('next')}</button></form>
      <div class="tutor-foot">Claude (Sonnet 5.5) answers from this unit's material. It can make mistakes; check against the slides.${voiceIn ? ' Voice input is transcribed by your browser.' : ''}</div>`;
    document.body.appendChild(d);
    $('#tclose').onclick = closeTutor;
    if ($('#tmic')) $('#tmic').onclick = () => listen(c, u);
    $('#tform').onsubmit = ev => { ev.preventDefault(); const v = $('#tin').value.trim(); if (v) { $('#tin').value = ''; askTutor(c, u, v); } };
    $('#tin').addEventListener('keydown', ev => { if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); $('#tform').requestSubmit(); } });
  }
  $('#tfocus').innerHTML = focus ? `<span class="muted small">Looking at:</span> <b>${esc(focus.label)}</b>` : '';
  const sugg = focus && focus.kind === 'question'
    ? (focus.attempted ? ['Why is my answer wrong?', 'Explain the solution step by step', 'Give me a similar practice problem'] : ['Give me a hint', 'What concept is this testing?', 'How should I start?'])
    : ['Explain this more simply', 'Give me an example with numbers', 'How does the exam test this?', 'Quiz me on this'];
  $('#tsugg').innerHTML = sugg.map(t => `<button class="btn ghost sm" data-q="${esc(t)}">${esc(t)}</button>`).join('');
  $('#tsugg').onclick = ev => { const b = ev.target.closest('[data-q]'); if (b) askTutor(c, u, b.dataset.q); };
  renderTutorLog();
  setTimeout(() => $('#tin')?.focus(), 30);
}
function renderTutorLog() {
  const log = $('#tlog'); if (!log || !tutorState) return;
  log.innerHTML = tutorState.msgs.map(m => m.role === 'user' ? `<div class="tmsg u">${esc(m.shown || m.content)}</div>` : `<div class="tmsg a rich">${m.content ? mdLite(m.content) : '<span class="muted">Thinking…</span>'}</div>`).join('') || `<div class="muted small" style="padding:8px">Ask about the slide or question you're on, or anything in this unit.</div>`;
  log.scrollTop = log.scrollHeight;
}
async function askTutor(c, u, text) {
  const S = tutorState; if (!S || S.busy) return;
  const f = S.focus;
  const ctx = f ? `[The student is looking at ${f.kind === 'question' ? 'this practice question' : 'this slide'}]\n${f.text}\n${f.kind === 'question' ? (f.attempted ? '[They have already attempted it.]' : '[They have NOT attempted it yet: hints only, no final answer.]') : ''}\n\n` : '';
  S.msgs.push({ role: 'user', content: ctx + text, shown: text });
  const reply = { role: 'assistant', content: '' }; S.msgs.push(reply); S.busy = true; renderTutorLog();
  $('#tsend') && ($('#tsend').disabled = true);
  try {
    S.abort = new AbortController();
    if (!serverLive()) { await streamDirect(c, u, S.msgs.filter(m => m !== reply).map(m => ({ role: m.role, content: m.content })), reply, S); if (!reply.content) reply.content = 'Sorry, I came back empty. Try asking again.'; return; }
    const r = await fetch(serverUrl() + '/api/tutor', { method: 'POST', signal: S.abort.signal, headers: { 'content-type': 'application/json', 'x-academy-token': await accessToken() },
      body: JSON.stringify({ email: store.get('email'), course: c.id, unit: u.id, messages: S.msgs.filter(m => m !== reply).map(m => ({ role: m.role, content: m.content })) }) });
    if (!r.ok) { let m = ''; try { m = (await r.json()).error; } catch { } const err = new Error(m || 'HTTP ' + r.status); err.status = r.status; err.friendly = m; throw err; }
    const reader = r.body.getReader(), dec = new TextDecoder(); let buf = '';
    for (;;) {
      const { value, done } = await reader.read(); if (done) break;
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf('\n\n')) >= 0) {
        const chunk = buf.slice(0, i); buf = buf.slice(i + 2);
        const ev = (chunk.match(/^event: (.*)$/m) || [])[1], data = (chunk.match(/^data: (.*)$/m) || [])[1];
        if (!ev || data == null) continue;
        const d = JSON.parse(data);
        if (ev === 'text') { reply.content += d; renderTutorLog(); }
        else if (ev === 'error') { const err = new Error(d.message); err.status = d.status; err.friendly = d.message; throw err; }
        else if (ev === 'done' && d.stop === 'refusal' && !reply.content) reply.content = "I can't help with that one. Try rephrasing it as a question about the course material.";
      }
    }
    if (!reply.content) reply.content = 'Sorry, I came back empty. Try asking again.';
  } catch (e) {
    if (e.name === 'AbortError' || /abort/i.test(e.message || '')) return;
    const st = e.status;
    reply.content = e.friendly || (st === 401 ? 'The tutor could not verify this site session. Lock and unlock the site in Settings, then try again.' : st >= 500 ? 'The tutor is temporarily unavailable. Try again shortly.' : "Couldn't reach the tutor (Trevor's server may be offline). Try again later.");
  } finally {
    S.busy = false; $('#tsend') && ($('#tsend').disabled = false); renderTutorLog();
  }
}

// ============================================================ formulas window
function currentUnit(c) {
  const parts = location.hash.replace(/^#\/?/, '').split('/');
  const [, kind, id] = parts;
  if (kind === 'unit' || kind === 'quiz') return c.units.find(u => u.id === id) || null;
  if (kind === 'learn' || kind === 'practice') return findLesson(c, id).u || null;
  return null;
}
function fxItems(u) {
  const f = (u.keyFormulas || []).map(k => `<div class="fx-item" data-s="${esc((k.name + ' ' + (k.note || '') + ' ' + k.tex).toLowerCase())}"><div class="fx-name">${tex(esc(k.name))}</div><div class="fx-tex">${texBlock(k.tex)}</div>${k.note ? `<div class="fx-note">${tex(k.note)}</div>` : ''}</div>`).join('');
  const facts = (u.keyFacts || []).map(k => `<li class="fx-fact" data-s="${esc(plain(k).toLowerCase())}">${tex(k)}</li>`).join('');
  return f ? f + (facts ? `<details class="fx-facts"><summary>Must-know facts (${u.keyFacts.length})</summary><ul>${facts}</ul></details>` : '')
    : (facts ? `<div class="muted small" style="margin:2px 0 6px">No formulas in this unit. Here's its must-know list:</div><ul class="fx-factlist">${facts}</ul>` : '<div class="muted small">Nothing listed for this unit.</div>');
}
function closeFormulas() { $('#fx')?.remove(); $('#fxBtn')?.classList.remove('on'); }
function openFormulas(c, refresh = false) {
  const cur = currentUnit(c);
  let d = $('#fx');
  const q = d ? ($('#fxq')?.value || '') : '';
  if (!d) { d = document.createElement('aside'); d.id = 'fx'; d.className = 'fx'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-label', 'Formulas'); document.body.appendChild(d); }
  const others = c.units.filter(u => u !== cur);
  d.innerHTML = `<div class="fx-head">${icon('sigma')}<b>Formulas</b><span class="spacer"></span><button class="icon-btn" id="fxClose" aria-label="Close">${icon('x')}</button></div>
    <div class="fx-search"><input class="field" id="fxq" placeholder="Search formulas (e.g. Sharpe, duration, leverage)" value="${esc(q)}"></div>
    <div class="fx-body" id="fxBody">
      ${cur ? `<section class="fx-sec cur"><div class="fx-sh" style="--c:${unitColor(cur)}">This section · Unit ${cur.num}: ${esc(cur.title)}</div>${fxItems(cur)}</section>` : `<div class="muted small" style="padding:4px 2px 10px">Open a unit or lesson to see its formulas at the top. All units are below.</div>`}
      <div class="fx-sh small-sh">${cur ? 'Other units' : 'All units'}</div>
      ${others.map(u => `<details class="fx-unit"><summary><span class="num" style="background:${unitColor(u)}">${u.num}</span>${esc(u.title)} <span class="muted small">(${(u.keyFormulas || []).length || (u.keyFacts || []).length + ' facts'}${(u.keyFormulas || []).length ? ' formulas' : ''})</span></summary>${fxItems(u)}</details>`).join('')}
    </div>`;
  $('#fxBtn')?.classList.add('on');
  $('#fxClose').onclick = closeFormulas;
  const filter = () => {
    const t = $('#fxq').value.trim().toLowerCase();
    $$('#fxBody .fx-item, #fxBody .fx-fact').forEach(el => { el.style.display = !t || el.dataset.s.includes(t) ? '' : 'none'; });
    $$('#fxBody details').forEach(det => { const hit = t && det.querySelector('.fx-item:not([style*="none"]), .fx-fact:not([style*="none"])'); if (t) det.open = !!hit; det.style.display = t && !hit ? 'none' : ''; });
    $$('#fxBody .fx-sec.cur').forEach(sec => { sec.style.display = t && !sec.querySelector('.fx-item:not([style*="none"]), .fx-fact:not([style*="none"])') ? 'none' : ''; });
  };
  $('#fxq').oninput = filter; if (q) filter();
  if (!refresh) setTimeout(() => $('#fxq')?.focus(), 30);
}
document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('#fx')) closeFormulas(); });

// ============================================================ settings
function openSettings(c) {
  const vs = (window.speechSynthesis && speechSynthesis.getVoices().filter(v => /^en/i.test(v.lang))) || [];
  const back = document.createElement('div'); back.className = 'modal-back';
  back.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-label="Settings"><h2>Settings <button class="icon-btn close" aria-label="Close">${icon('x')}</button></h2>
    <div class="setting"><div class="lbl">Theme</div><div class="seg" id="sth">${['auto', 'light', 'dark'].map(t => `<button data-v="${t}" class="${settings.theme === t ? 'on' : ''}">${t[0].toUpperCase() + t.slice(1)}</button>`).join('')}</div></div>
    <div class="setting"><div class="lbl">Narration voice</div><div class="seg" id="svm"><button data-v="auto" class="${settings.voiceMode !== 'browser' ? 'on' : ''}">Studio voice when available</button><button data-v="browser" class="${settings.voiceMode === 'browser' ? 'on' : ''}">Always browser voice</button></div>
      <select id="svoice"><option value="">Browser voice: automatic (best available)</option>${vs.map(v => `<option ${settings.voice === v.name ? 'selected' : ''}>${esc(v.name)}</option>`).join('')}</select>
      <button class="btn secondary sm" id="stest" style="justify-self:start">${icon('vol')} Test browser voice</button></div>
    <div class="setting"><div class="lbl">Default narration speed</div><select id="srate">${[0.9, 1, 1.15, 1.25, 1.5, 1.75, 2].map(r => `<option value="${r}" ${+settings.rate === r ? 'selected' : ''}>${r}×</option>`).join('')}</select></div>
    <div class="setting"><label class="switch"><input type="checkbox" id="sauto" ${settings.autoAdvance ? 'checked' : ''}> Auto-advance slides after narration</label></div>
    ${c ? `<div class="setting"><div class="lbl">Progress</div><button class="btn secondary sm" id="sreset" style="justify-self:start">${icon('redo')} Reset my ${esc(c.code)} progress</button></div>` : ''}
    <div class="setting"><div class="lbl">Signed in as</div><div class="row"><span>${esc(store.get('email') || '—')}</span><button class="btn ghost sm" id="semail">Change email</button></div></div>
    <div class="setting"><button class="btn ghost sm" id="slock" style="justify-self:start">${icon('logout')} Lock this device (forget password)</button></div></div>`;
  document.body.appendChild(back);
  const close = () => back.remove();
  back.onclick = e => { if (e.target === back) close(); };
  $('.close', back).onclick = close;
  $('#sth', back).onclick = e => { const b = e.target.closest('button'); if (!b) return; settings.theme = b.dataset.v; saveSettings(); applyTheme(); $$('#sth button', back).forEach(x => x.classList.toggle('on', x === b)); };
  $('#svm', back).onclick = e => { const b = e.target.closest('button'); if (!b) return; settings.voiceMode = b.dataset.v; saveSettings(); $$('#svm button', back).forEach(x => x.classList.toggle('on', x === b)); };
  $('#svoice', back).onchange = e => { settings.voice = e.target.value; saveSettings(); };
  $('#stest', back).onclick = () => { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance("Hi! This is how your lessons will sound. Let's ace this final."); const v = pickVoice(); if (v) u.voice = v; u.rate = settings.rate; speechSynthesis.speak(u); };
  $('#srate', back).onchange = e => { settings.rate = +e.target.value; saveSettings(); };
  $('#sauto', back).onchange = e => { settings.autoAdvance = e.target.checked; saveSettings(); };
  if ($('#sreset', back)) $('#sreset', back).onclick = () => { if (confirm(`Reset all ${c.code} progress on this device? This can't be undone.`)) { store.del('p:' + c.id); store.del('exam:' + c.id); c.exams.forEach(x => store.del(examKey(c, x.id))); delete progCache[c.id]; close(); route(); toast('Progress reset'); } };
  $('#slock', back).onclick = () => { store.del('key'); location.reload(); };
  $('#semail', back).onclick = () => { store.del('email'); close(); cleanups.forEach(f => { try { f(); } catch { } }); cleanups = []; renderEmailGate(); };
  const onEsc = e => { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onEsc); } };
  document.addEventListener('keydown', onEsc);
}

boot();
