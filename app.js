'use strict';
/* GrantGlide frontend: hash-routed vanilla JS SPA. */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const inr = n => '₹' + Number(n || 0).toLocaleString('en-IN');
const api = async (url, opt = {}) => {
  const r = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...opt, body: opt.body ? JSON.stringify(opt.body) : undefined });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(data.error || 'Request failed'), { data });
  return data;
};
const toast = m => { const t = $('#toast'); t.textContent = m; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2600); };

const I18N = {
  en: { dashboard: 'Dashboard', find: 'Find Scholarships', profile: 'My Profile', documents: 'My Documents', saved: 'Saved Scholarships', applications: 'My Applications', calculator: 'Financial Aid Calculator', notifications: 'Notifications', settings: 'Settings' },
  hi: { dashboard: 'डैशबोर्ड', find: 'छात्रवृत्ति खोजें', profile: 'मेरी प्रोफ़ाइल', documents: 'मेरे दस्तावेज़', saved: 'सहेजी गई छात्रवृत्तियाँ', applications: 'मेरे आवेदन', calculator: 'वित्तीय सहायता कैलकुलेटर', notifications: 'सूचनाएँ', settings: 'सेटिंग्स' },
  te: { dashboard: 'డాష్‌బోర్డ్', find: 'స్కాలర్‌షిప్‌లు వెతకండి', profile: 'నా ప్రొఫైల్', documents: 'నా పత్రాలు', saved: 'సేవ్ చేసినవి', applications: 'నా దరఖాస్తులు', calculator: 'ఆర్థిక సహాయ కాలిక్యులేటర్', notifications: 'నోటిఫికేషన్లు', settings: 'సెట్టింగ్‌లు' }
};
const ROUTES = ['dashboard', 'find', 'profile', 'documents', 'saved', 'applications', 'calculator', 'notifications', 'settings'];
const STATES = ['Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'];
const DEGREES = ['Engineering', 'Medicine', 'Pharmacy', 'Architecture', 'Science', 'Commerce', 'Management', 'Law', 'Arts', 'Other'];
const state = { profile: null, matches: [], saved: [], apps: [], lang: localStorage.getItem('gg-lang') || 'en', step: 0, draft: {}, charts: [] };
const t = k => (I18N[state.lang] || I18N.en)[k];

async function loadAll() {
  state.profile = await api('/api/profile');
  state.saved = await api('/api/saved');
  state.apps = await api('/api/applications');
  state.matches = state.profile ? await api('/api/matches') : [];
}
function renderNav(active) {
  $('#nav').innerHTML = ROUTES.map(r => `<a href="#/${r}" class="${r === active ? 'active' : ''}">${esc(t(r))}${r === 'saved' && state.saved.length ? `<span class="badge">${state.saved.length}</span>` : ''}</a>`).join('');
}
function countdown(m) {
  if (m.daysLeft === null) return '<span>No deadline listed</span>';
  if (m.expired) return '<span class="count danger">Deadline passed</span>';
  const cls = m.daysLeft <= 7 ? 'danger' : m.daysLeft <= 30 ? 'warn' : '';
  return `<span class="count ${cls}" data-deadline="${esc(m.deadline)}">${m.daysLeft} day${m.daysLeft === 1 ? '' : 's'} left</span> <small>(${esc(m.deadline)})</small>`;
}
const STATUS_TXT = { eligible: 'Eligible', needs_info: 'More info needed', ineligible: 'Not eligible' };

function card(m) {
  const saved = state.saved.includes(m.id), app = state.apps.find(a => a.sid === m.id);
  return `<article class="card">
    <div class="row space"><strong>${esc(m.name)}</strong><span class="pill p-${m.status}">${STATUS_TXT[m.status]}</span></div>
    <small>${esc(m.provider)} · ${esc(m.type)}${m.verified ? '' : ' · verify details on the official portal'}</small>
    <div class="amount">${inr(m.amount)} <small style="font-weight:400;color:var(--mute)">per year (approx.)</small></div>
    ${m.status !== 'ineligible' ? `<div>Match ${m.score}%</div><div class="score"><i style="width:${m.score}%"></i></div>` : ''}
    <div>${countdown(m)}</div>
    <ul class="tight">${m.meets.map(x => `<li class="ok">✓ ${esc(x)}</li>`).join('')}${m.unmet.map(x => `<li class="no">✗ ${esc(x)}</li>`).join('')}${m.missingInfo.map(x => `<li class="miss">? Add "${esc(x)}" to your profile to confirm</li>`).join('')}</ul>
    <details><summary>Documents &amp; renewal</summary>
      <ul class="tight">${m.documents.map(d => `<li><label><input type="checkbox" data-sid="${m.id}" data-doc="${esc(d)}" class="chk"> ${esc(d)}</label></li>`).join('')}</ul>
      <small>${esc(m.renewal)}</small><br><a href="${esc(m.url)}" target="_blank" rel="noopener">Official portal</a>
    </details>
    <div class="row" style="margin-top:10px">
      <button class="btn sm ${saved ? 'alt' : ''}" data-save="${m.id}">${saved ? 'Remove from saved' : 'Save'}</button>
      ${m.status !== 'ineligible' ? (app ? `<span class="pill p-plain">${esc(app.status)}</span>` : `<button class="btn sm good" data-apply="${m.id}">Start application</button>`) : ''}
    </div></article>`;
}
async function wireCards(root) {
  root.querySelectorAll('[data-save]').forEach(b => b.onclick = async () => {
    const id = b.dataset.save;
    await api(`/api/saved/${id}`, { method: state.saved.includes(id) ? 'DELETE' : 'POST' });
    state.saved = await api('/api/saved'); toast('Saved list updated'); route();
  });
  root.querySelectorAll('[data-apply]').forEach(b => b.onclick = async () => {
    await api(`/api/applications/${b.dataset.apply}`, { method: 'PUT', body: { status: 'In progress' } });
    state.apps = await api('/api/applications'); toast('Application started'); route();
  });
  for (const c of root.querySelectorAll('.chk')) {
    c.onchange = () => api(`/api/checklist/${c.dataset.sid}`, { method: 'PUT', body: { doc: c.dataset.doc, done: c.checked } });
  }
  for (const sid of new Set([...root.querySelectorAll('.chk')].map(c => c.dataset.sid))) {
    api(`/api/checklist/${sid}`).then(rows => rows.forEach(r => { const el = root.querySelector(`.chk[data-sid="${sid}"][data-doc="${CSS.escape(r.doc)}"]`); if (el) el.checked = !!r.done; }));
  }
}
const needProfile = () => `<div class="card empty"><h2>Create your profile first</h2><p>Scholarship matching needs your income, category, state and academics.</p><a class="btn" href="#/profile">Create profile</a></div>`;
const kill = () => { state.charts.forEach(c => c.destroy()); state.charts = []; };

const views = {
  async dashboard(v) {
    if (!state.profile) return v.innerHTML = `<h1>Welcome to GrantGlide</h1><p class="sub">Discover Opportunities. Unlock Your Future.</p>` + needProfile();
    const el = state.matches.filter(m => m.status === 'eligible' && !m.expired), ni = state.matches.filter(m => m.status === 'needs_info');
    const total = el.reduce((s, m) => s + m.amount, 0);
    const urgent = el.filter(m => m.daysLeft <= 30).sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 3);
    const conflicts = await api('/api/conflicts');
    v.innerHTML = `<h1>Hello, ${esc(state.profile.fullName.split(' ')[0])}</h1><p class="sub">Here is where your scholarship search stands.</p>
    <div class="grid g4"><div class="card stat"><b>${el.length}</b><span>Scholarships you qualify for</span></div>
    <div class="card stat"><b>${inr(total)}</b><span>Potential yearly funding (before conflicts)</span></div>
    <div class="card stat"><b>${ni.length}</b><span>Need more profile information</span></div>
    <div class="card stat"><b>${state.saved.length} / ${state.apps.length}</b><span>Saved / applications</span></div></div>
    ${conflicts.map(c => `<div class="alert warn" style="margin-top:14px">You cannot hold these together: ${c.names.map(esc).join(' and ')}. Pick one before you apply.</div>`).join('')}
    ${urgent.length ? `<div class="card" style="margin-top:16px"><h2>Closing soon</h2>${urgent.map(m => `<div class="row space"><span>${esc(m.name)}</span>${countdown(m)}</div>`).join('')}</div>` : ''}
    <div class="grid g2" style="margin-top:16px"><div class="card"><h2>Eligibility breakdown</h2><canvas id="c1" height="200"></canvas></div>
    <div class="card"><h2>Top eligible by funding</h2><canvas id="c2" height="200"></canvas></div></div>`;
    kill();
    if (window.Chart) {
      const cnt = s => state.matches.filter(m => m.status === s).length;
      state.charts.push(new Chart($('#c1'), { type: 'doughnut', data: { labels: ['Eligible', 'Need info', 'Not eligible'], datasets: [{ data: [cnt('eligible'), cnt('needs_info'), cnt('ineligible')], backgroundColor: ['#0f9d8a', '#e0a526', '#c9d0e4'] }] } }));
      const top = [...el].sort((a, b) => b.amount - a.amount).slice(0, 6);
      state.charts.push(new Chart($('#c2'), { type: 'bar', data: { labels: top.map(m => m.name.slice(0, 22)), datasets: [{ label: '₹ per year', data: top.map(m => m.amount), backgroundColor: '#3b46c4' }] }, options: { plugins: { legend: { display: false } } } }));
    }
  },
  async find(v) {
    if (!state.profile) return v.innerHTML = needProfile();
    v.innerHTML = `<h1>Find Scholarships</h1><p class="sub">Every result shows why you qualify, or what blocks you.</p>
    <div class="filters"><input id="q" placeholder="Search by name or provider" aria-label="Search"><select id="fs"><option value="">All results</option><option value="eligible">Eligible</option><option value="needs_info">Need info</option><option value="ineligible">Not eligible</option></select>
    <select id="ft"><option value="">All types</option><option>Government</option><option>State</option><option>Private</option></select></div><div id="res" class="grid g2"></div>`;
    const draw = () => {
      const q = $('#q').value.toLowerCase(), s = $('#fs').value, ty = $('#ft').value;
      const list = state.matches.filter(m => (!s || m.status === s) && (!ty || m.type === ty) && (m.name + m.provider).toLowerCase().includes(q));
      $('#res').innerHTML = list.length ? list.map(card).join('') : '<div class="card empty">No scholarships match these filters.</div>';
      wireCards($('#res'));
    };
    ['q', 'fs', 'ft'].forEach(i => $('#' + i).oninput = draw); $('#fs').value = 'eligible'; draw();
  },
  profile(v) { renderProfileForm(v); },
  async documents(v) {
    const docs = await api('/api/documents'), now = new Date();
    v.innerHTML = `<h1>My Documents</h1><p class="sub">Track certificates and their expiry dates. Tick required documents on each scholarship card.</p>
    <div class="card"><form id="df" class="row"><label class="f">Document name<input id="dn" required maxlength="80" placeholder="e.g. Income certificate"></label>
    <label class="f">Expiry date (optional)<input id="de" type="date"></label><button class="btn" style="align-self:end">Add document</button></form></div>
    <div class="card" style="margin-top:16px">${docs.length ? `<table><tr><th>Document</th><th>Expiry</th><th>Status</th><th></th></tr>${docs.map(d => {
      const days = d.expiry ? Math.ceil((new Date(d.expiry) - now) / 864e5) : null;
      const st = days === null ? '<span class="pill p-plain">No expiry</span>' : days < 0 ? '<span class="pill p-ineligible">Expired</span>' : days <= 45 ? `<span class="pill p-needs_info">Expires in ${days} days</span>` : '<span class="pill p-eligible">Valid</span>';
      return `<tr><td>${esc(d.name)}</td><td>${esc(d.expiry || '-')}</td><td>${st}</td><td><button class="btn sm danger" data-del="${d.id}">Remove</button></td></tr>`; }).join('')}</table>` : '<div class="empty">No documents yet. Add your income and caste certificates to start tracking expiry.</div>'}</div>`;
    $('#df').onsubmit = async e => { e.preventDefault(); try { await api('/api/documents', { method: 'POST', body: { name: $('#dn').value, expiry: $('#de').value } }); toast('Document added'); route(); } catch (x) { toast(x.message); } };
    v.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => { await api('/api/documents/' + b.dataset.del, { method: 'DELETE' }); toast('Document removed'); route(); });
  },
  async saved(v) {
    const list = state.matches.filter(m => state.saved.includes(m.id));
    const conflicts = await api('/api/conflicts');
    v.innerHTML = `<h1>Saved Scholarships</h1><p class="sub">Your shortlist.</p>${conflicts.map(c => `<div class="alert warn">Conflict: ${c.names.map(esc).join(' and ')} cannot be held together.</div>`).join('')}
    <div class="grid g2">${list.length ? list.map(card).join('') : '<div class="card empty">Nothing saved yet. Save scholarships from Find Scholarships.</div>'}</div>`;
    wireCards(v);
  },
  async applications(v) {
    const rows = state.apps.map(a => ({ ...a, m: state.matches.find(m => m.id === a.sid) })).filter(r => r.m);
    v.innerHTML = `<h1>My Applications</h1><p class="sub">Update the status as you go.</p>${rows.length ? `<div class="card"><table><tr><th>Scholarship</th><th>Deadline</th><th>Status</th><th></th></tr>${rows.map(r => `<tr><td>${esc(r.m.name)}</td><td>${countdown(r.m)}</td>
    <td><select data-st="${r.sid}">${['In progress', 'Submitted', 'Approved', 'Rejected'].map(s => `<option ${s === r.status ? 'selected' : ''}>${s}</option>`).join('')}</select></td>
    <td><button class="btn sm danger" data-rm="${r.sid}">Remove</button></td></tr>`).join('')}</table></div>` : '<div class="card empty">No applications yet. Start one from an eligible scholarship.</div>'}`;
    v.querySelectorAll('[data-st]').forEach(s => s.onchange = async () => { await api('/api/applications/' + s.dataset.st, { method: 'PUT', body: { status: s.value } }); state.apps = await api('/api/applications'); toast('Status updated'); });
    v.querySelectorAll('[data-rm]').forEach(b => b.onclick = async () => { await api('/api/applications/' + b.dataset.rm, { method: 'DELETE' }); state.apps = await api('/api/applications'); route(); });
  },
  async calculator(v) {
    const pool = state.matches.filter(m => state.saved.includes(m.id) && m.status === 'eligible');
    v.innerHTML = `<h1>Financial Aid Calculator</h1><p class="sub">Compare yearly costs with the eligible scholarships you saved.</p><div class="grid g2">
    <div class="card"><h2>Yearly costs</h2><div class="grid"><label class="f">Tuition (₹)<input id="k1" type="number" min="0" value="0"></label><label class="f">Hostel and food (₹)<input id="k2" type="number" min="0" value="0"></label><label class="f">Books and other (₹)<input id="k3" type="number" min="0" value="0"></label></div></div>
    <div class="card"><h2>Scholarships to count</h2>${pool.length ? pool.map(m => `<label style="display:block"><input type="checkbox" class="ck" value="${m.amount}" data-g="${esc(m.id)}" checked> ${esc(m.name)} (${inr(m.amount)})</label>`).join('') : '<div class="empty">Save eligible scholarships to include them here.</div>'}<p id="warn" class="miss"></p></div></div>
    <div class="card" style="margin-top:16px"><div class="row space"><div class="stat"><b id="r1">₹0</b><span>Total yearly cost</span></div><div class="stat"><b id="r2">₹0</b><span>Scholarship total</span></div><div class="stat"><b id="r3">₹0</b><span>You still need to cover</span></div></div></div>`;
    const calc = () => {
      const cost = [1, 2, 3].reduce((s, i) => s + Number($('#k' + i).value || 0), 0);
      const picked = [...v.querySelectorAll('.ck:checked')], aid = picked.reduce((s, c) => s + Number(c.value), 0);
      $('#r1').textContent = inr(cost); $('#r2').textContent = inr(aid); $('#r3').textContent = inr(Math.max(0, cost - aid));
    };
    v.querySelectorAll('input').forEach(i => i.oninput = calc); calc();
  },
  async notifications(v) {
    const n = await api('/api/notifications');
    v.innerHTML = `<h1>Notifications</h1><p class="sub">Deadlines for saved scholarships and expiring documents.</p>${n.length ? n.map(x => `<div class="alert ${x.level}">${esc(x.text)}</div>`).join('') : '<div class="card empty">You are all caught up.</div>'}
    <button class="btn alt" id="perm">Turn on browser alerts</button>`;
    $('#perm').onclick = async () => { if (!('Notification' in window)) return toast('This browser does not support alerts'); const p = await Notification.requestPermission(); if (p === 'granted') { n.forEach(x => new Notification('GrantGlide', { body: x.text })); toast('Browser alerts on'); } else toast('Alerts were blocked'); };
  },
  settings(v) {
    v.innerHTML = `<h1>Settings</h1><p class="sub">Preferences are stored on this device.</p><div class="card"><label class="f" style="max-width:260px">Language<select id="sl">${[['en', 'English'], ['hi', 'हिन्दी'], ['te', 'తెలుగు']].map(([k, n]) => `<option value="${k}" ${k === state.lang ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
    <p class="sub" style="margin-top:14px">GrantGlide stores only the details you enter. It never asks for Aadhaar or bank numbers.</p></div>`;
    $('#sl').onchange = e => setLang(e.target.value);
  }
};

function renderProfileForm(v) {
  const p = { gpaType: 'cgpa', gpaScale: 10, ...(state.profile || {}), ...state.draft };
  const steps = ['Personal', 'Background', 'Academics'];
  const opt = (arr, cur) => `<option value="">Select</option>` + arr.map(a => `<option ${String(a) === String(cur) ? 'selected' : ''}>${esc(a)}</option>`).join('');
  const field = (id, label, input, req = true) => `<label class="f"><span class="${req ? 'req' : ''}">${label}</span>${input}<span class="err" id="e-${id}"></span></label>`;
  const body = [
    `<div class="grid g2">${field('fullName', 'Full name', `<input id="fullName" maxlength="100" value="${esc(p.fullName)}">`)}${field('email', 'Email address', `<input id="email" type="email" value="${esc(p.email)}">`)}
     ${field('gender', 'Gender', `<select id="gender">${opt(['Female', 'Male', 'Other'], p.gender)}</select>`)}${field('domicile', 'State of domicile', `<select id="domicile">${opt(STATES, p.domicile)}</select>`)}
     ${field('district', 'District', `<input id="district" value="${esc(p.district)}">`, false)}</div>`,
    `<div class="grid g2">${field('category', 'Category', `<select id="category">${opt(['General', 'OBC', 'BC', 'SC', 'ST', 'EWS'], p.category)}</select>`)}
     ${field('annualIncome', 'Annual family income (₹)', `<input id="annualIncome" type="number" min="0" value="${esc(p.annualIncome)}"><small id="incfmt">${p.annualIncome !== undefined && p.annualIncome !== '' ? inr(p.annualIncome) : ''}</small>`)}
     ${field('disability', 'Disability of 40% or more?', `<select id="disability">${opt(['yes', 'no'], p.disability)}</select>`, false)}
     ${field('orphan', 'Orphan or ward of deceased parent?', `<select id="orphan">${opt(['yes', 'no'], p.orphan)}</select>`, false)}
     ${field('singleGirlChild', 'Only girl child of your parents?', `<select id="singleGirlChild">${opt(['yes', 'no'], p.singleGirlChild)}</select>`, false)}</div>`,
    `<div class="grid g2">${field('level', 'Education level', `<select id="level">${opt(['UG', 'PG', 'Diploma'], p.level)}</select>`)}${field('degree', 'Degree', `<select id="degree">${opt(DEGREES, p.degree)}</select>`)}
     ${field('course', 'Course or branch', `<input id="course" value="${esc(p.course)}">`, false)}${field('college', 'College or institution', `<input id="college" value="${esc(p.college)}">`, false)}
     ${field('academicYear', 'Current academic year', `<input id="academicYear" type="number" min="1" max="6" value="${esc(p.academicYear)}">`)}
     ${field('gpaType', 'Score type', `<select id="gpaType"><option value="cgpa" ${p.gpaType === 'cgpa' ? 'selected' : ''}>GPA / CGPA</option><option value="percentage" ${p.gpaType === 'percentage' ? 'selected' : ''}>Percentage</option></select>`)}
     ${field('gpa', 'Score', `<input id="gpa" type="number" step="0.01" min="0" value="${esc(p.gpa)}">`)}${field('gpaScale', 'Maximum GPA scale', `<select id="gpaScale">${[10, 5, 4].map(s => `<option ${+p.gpaScale === s ? 'selected' : ''}>${s}</option>`).join('')}</select>`, false)}</div>`
  ];
  const ids = [['fullName', 'email', 'gender', 'domicile', 'district'], ['category', 'annualIncome', 'disability', 'orphan', 'singleGirlChild'], ['level', 'degree', 'course', 'college', 'academicYear', 'gpaType', 'gpa', 'gpaScale']];
  v.innerHTML = `<h1>${state.profile ? 'Edit your profile' : 'Create your profile'}</h1><p class="sub">Fields marked * are required. We never ask for Aadhaar or bank details.</p>
  <div class="steps">${steps.map((s, i) => `<div class="${i === state.step ? 'on' : i < state.step ? 'done' : ''}">${s}</div>`).join('')}</div><div class="card">${body[state.step]}
  <div class="row space" style="margin-top:16px"><button class="btn alt" id="back" ${state.step === 0 ? 'disabled' : ''}>Back</button><button class="btn" id="next">${state.step === 2 ? 'Save profile' : 'Next'}</button></div></div>`;
  const collect = () => ids[state.step].forEach(i => { state.draft[i] = $('#' + i).value; });
  const inc = $('#annualIncome'); if (inc) inc.oninput = () => $('#incfmt').textContent = inc.value === '' ? '' : inr(inc.value);
  $('#back').onclick = () => { collect(); state.step--; renderProfileForm(v); };
  $('#next').onclick = async () => {
    collect();
    if (state.step < 2) { const miss = { 0: ['fullName', 'email', 'gender', 'domicile'], 1: ['category', 'annualIncome'] }[state.step].filter(i => !state.draft[i]);
      if (miss.length) return miss.forEach(i => $('#e-' + i).textContent = 'This field is required.'); state.step++; return renderProfileForm(v); }
    const data = { ...(state.profile || {}), ...state.draft, annualIncome: Number(state.draft.annualIncome), academicYear: Number(state.draft.academicYear), gpa: Number(state.draft.gpa), gpaScale: Number(state.draft.gpaScale) };
    try { state.profile = await api('/api/profile', { method: 'PUT', body: data }); state.draft = {}; state.step = 0; await loadAll(); toast('Profile saved'); location.hash = '#/find'; }
    catch (e) { const errs = e.data && e.data.errors || {}; Object.entries(errs).forEach(([k, m]) => { const el = $('#e-' + k); if (el) el.textContent = m; });
      const first = Object.keys(errs).find(k => !ids[state.step].includes(k)); if (first) toast('Some earlier fields need fixing: ' + errs[first]); }
  };
}

function setLang(l) { state.lang = l; localStorage.setItem('gg-lang', l); $('#lang').value = l; route(); }
async function route() {
  const r = (location.hash.replace('#/', '') || 'dashboard'), name = ROUTES.includes(r) ? r : 'dashboard';
  kill(); renderNav(name); $('#sidebar').classList.remove('open');
  const v = $('#view'); try { await views[name](v); } catch (e) { v.innerHTML = `<div class="alert danger">${esc(e.message)}</div>`; }
  v.focus({ preventScroll: true });
}
$('#lang').onchange = e => setLang(e.target.value);
$('#menuBtn').onclick = () => $('#sidebar').classList.toggle('open');
window.addEventListener('hashchange', route);
loadAll().then(() => { $('#lang').value = state.lang; route(); }).catch(() => $('#view').innerHTML = '<div class="alert danger">Cannot reach the server. Start it with <code>npm start</code>.</div>');
