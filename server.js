'use strict';
const express = require('express');
const path = require('path');
const Database = require('better-sqlite3');
const scholarships = require('./src/scholarships');
const { matchAll, findConflicts } = require('./src/engine');

const db = new Database(process.env.DB_FILE || path.join(__dirname, 'grantglide.db'));
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS profile (id INTEGER PRIMARY KEY CHECK (id = 1), data TEXT NOT NULL, updated_at TEXT);
  CREATE TABLE IF NOT EXISTS saved (sid TEXT PRIMARY KEY, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
  CREATE TABLE IF NOT EXISTS applications (sid TEXT PRIMARY KEY, status TEXT NOT NULL DEFAULT 'In progress', updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
  CREATE TABLE IF NOT EXISTS documents (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, expiry TEXT, held INTEGER NOT NULL DEFAULT 1);
  CREATE TABLE IF NOT EXISTS checklist (sid TEXT NOT NULL, doc TEXT NOT NULL, done INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (sid, doc));
`);

const CATEGORIES = ['General', 'OBC', 'BC', 'SC', 'ST', 'EWS'];
const GENDERS = ['Female', 'Male', 'Other'];
const STATUSES = ['In progress', 'Submitted', 'Approved', 'Rejected'];
const sById = id => scholarships.find(s => s.id === id);

function validateProfile(p) {
  const e = {};
  const str = v => typeof v === 'string' && v.trim().length > 0;
  if (!str(p.fullName) || p.fullName.length > 100) e.fullName = 'Enter your full name (max 100 characters).';
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(p.email || '')) e.email = 'Enter a valid email address.';
  if (!GENDERS.includes(p.gender)) e.gender = 'Select a gender.';
  if (!str(p.domicile)) e.domicile = 'Select your state of domicile.';
  if (!CATEGORIES.includes(p.category)) e.category = 'Select a category.';
  const inc = Number(p.annualIncome);
  if (p.annualIncome === '' || p.annualIncome == null || isNaN(inc) || inc < 0 || inc > 1e8) e.annualIncome = 'Enter annual family income in rupees (0 or more).';
  if (!['UG', 'PG', 'Diploma'].includes(p.level)) e.level = 'Select your education level.';
  if (!str(p.degree)) e.degree = 'Select your degree.';
  const yr = Number(p.academicYear);
  if (!Number.isInteger(yr) || yr < 1 || yr > 6) e.academicYear = 'Academic year must be between 1 and 6.';
  const gpa = Number(p.gpa);
  if (p.gpa === '' || p.gpa == null || isNaN(gpa) || gpa < 0) e.gpa = 'Enter your GPA or percentage.';
  else if (p.gpaType === 'percentage' ? gpa > 100 : gpa > Number(p.gpaScale)) e.gpa = 'Score cannot exceed the maximum.';
  if (p.gpaType !== 'percentage' && ![4, 5, 10].includes(Number(p.gpaScale))) e.gpaScale = 'Choose a GPA scale (4, 5 or 10).';
  return e;
}

const app = express();
app.use(express.json({ limit: '50kb' }));
app.use(express.static(path.join(__dirname, 'public')));

const getProfile = () => { const r = db.prepare('SELECT data FROM profile WHERE id = 1').get(); return r ? JSON.parse(r.data) : null; };

app.get('/api/profile', (req, res) => res.json(getProfile()));
app.put('/api/profile', (req, res) => {
  const errors = validateProfile(req.body || {});
  if (Object.keys(errors).length) return res.status(400).json({ errors });
  db.prepare(`INSERT INTO profile (id, data, updated_at) VALUES (1, ?, ?)
    ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`)
    .run(JSON.stringify(req.body), new Date().toISOString());
  res.json(req.body);
});

app.get('/api/scholarships', (req, res) => res.json(scholarships.map(({ rule, ...s }) => s)));

app.get('/api/matches', (req, res) => {
  const p = getProfile();
  if (!p) return res.status(409).json({ error: 'Complete your profile first.' });
  const byId = Object.fromEntries(scholarships.map(s => [s.id, s]));
  res.json(matchAll(scholarships, p).map(m => ({ ...m, provider: byId[m.id].provider, type: byId[m.id].type,
    documents: byId[m.id].documents, renewal: byId[m.id].renewal, url: byId[m.id].url, verified: byId[m.id].verified })));
});

// saved
app.get('/api/saved', (req, res) => res.json(db.prepare('SELECT sid FROM saved').all().map(r => r.sid)));
app.post('/api/saved/:sid', (req, res) => {
  if (!sById(req.params.sid)) return res.status(404).json({ error: 'Unknown scholarship.' });
  db.prepare('INSERT OR IGNORE INTO saved (sid) VALUES (?)').run(req.params.sid); res.status(201).json({ ok: true });
});
app.delete('/api/saved/:sid', (req, res) => { db.prepare('DELETE FROM saved WHERE sid = ?').run(req.params.sid); res.json({ ok: true }); });

// applications
app.get('/api/applications', (req, res) => res.json(db.prepare('SELECT sid, status FROM applications').all()));
app.put('/api/applications/:sid', (req, res) => {
  if (!sById(req.params.sid)) return res.status(404).json({ error: 'Unknown scholarship.' });
  const status = req.body && req.body.status;
  if (!STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status.' });
  db.prepare(`INSERT INTO applications (sid, status) VALUES (?, ?) ON CONFLICT(sid) DO UPDATE SET status = excluded.status, updated_at = CURRENT_TIMESTAMP`).run(req.params.sid, status);
  res.json({ ok: true });
});
app.delete('/api/applications/:sid', (req, res) => { db.prepare('DELETE FROM applications WHERE sid = ?').run(req.params.sid); res.json({ ok: true }); });

// documents + per-scholarship checklist
app.get('/api/documents', (req, res) => res.json(db.prepare('SELECT * FROM documents ORDER BY name').all()));
app.post('/api/documents', (req, res) => {
  const { name, expiry } = req.body || {};
  if (typeof name !== 'string' || !name.trim() || name.length > 80) return res.status(400).json({ error: 'Document name is required (max 80 characters).' });
  if (expiry && isNaN(Date.parse(expiry))) return res.status(400).json({ error: 'Expiry must be a valid date.' });
  const r = db.prepare('INSERT INTO documents (name, expiry) VALUES (?, ?)').run(name.trim(), expiry || null);
  res.status(201).json({ id: r.lastInsertRowid });
});
app.delete('/api/documents/:id', (req, res) => { db.prepare('DELETE FROM documents WHERE id = ?').run(Number(req.params.id)); res.json({ ok: true }); });
app.get('/api/checklist/:sid', (req, res) => res.json(db.prepare('SELECT doc, done FROM checklist WHERE sid = ?').all(req.params.sid)));
app.put('/api/checklist/:sid', (req, res) => {
  const { doc, done } = req.body || {};
  if (typeof doc !== 'string' || !sById(req.params.sid)) return res.status(400).json({ error: 'Invalid checklist item.' });
  db.prepare(`INSERT INTO checklist (sid, doc, done) VALUES (?, ?, ?) ON CONFLICT(sid, doc) DO UPDATE SET done = excluded.done`).run(req.params.sid, doc, done ? 1 : 0);
  res.json({ ok: true });
});

// conflicts + notifications
app.get('/api/conflicts', (req, res) => {
  const ids = [...db.prepare('SELECT sid FROM saved').all(), ...db.prepare('SELECT sid FROM applications').all()].map(r => r.sid);
  res.json(findConflicts(scholarships, [...new Set(ids)]));
});
app.get('/api/notifications', (req, res) => {
  const out = [], now = new Date();
  const track = [...db.prepare('SELECT sid FROM saved').all(), ...db.prepare('SELECT sid FROM applications WHERE status = \'In progress\'').all()].map(r => r.sid);
  [...new Set(track)].forEach(sid => {
    const s = sById(sid); const d = Math.ceil((new Date(s.deadline) - now) / 864e5);
    if (d < 0) out.push({ level: 'danger', text: `${s.name}: deadline has passed.` });
    else if (d <= 30) out.push({ level: d <= 7 ? 'danger' : 'warn', text: `${s.name}: ${d} day${d === 1 ? '' : 's'} left to apply.` });
  });
  db.prepare('SELECT name, expiry FROM documents WHERE expiry IS NOT NULL').all().forEach(doc => {
    const d = Math.ceil((new Date(doc.expiry) - now) / 864e5);
    if (d < 0) out.push({ level: 'danger', text: `${doc.name} has expired. Get a fresh copy before applying.` });
    else if (d <= 45) out.push({ level: 'warn', text: `${doc.name} expires in ${d} days.` });
  });
  res.json(out);
});

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));
app.use((err, req, res, next) => { console.error(err); res.status(err.status || 500).json({ error: err.status === 400 ? 'Invalid request body.' : 'Something went wrong.' }); });

if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`GrantGlide running at http://localhost:${port}`));
}
module.exports = app;
