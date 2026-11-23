'use strict';
/**
 * Rule engine: JSON predicate trees evaluated with three-valued logic.
 * Node status: 'pass' | 'fail' | 'unknown' (profile data missing).
 * Hard eligibility is decided ONLY by the tree. Scoring runs afterwards and
 * can never turn a failed rule into an eligible result.
 */
const PASS = 'pass', FAIL = 'fail', UNKNOWN = 'unknown';
const missing = v => v === undefined || v === null || v === '';
const norm = x => (typeof x === 'string' ? x.trim().toLowerCase() : x);
const getField = (p, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), p);

function compare(op, a, v) {
  const A = norm(a);
  switch (op) {
    case '=': return A === norm(v);
    case '!=': return A !== norm(v);
    case '<': return Number(a) < Number(v);
    case '<=': return Number(a) <= Number(v);
    case '>': return Number(a) > Number(v);
    case '>=': return Number(a) >= Number(v);
    case 'in': return v.map(norm).includes(A);
    case 'notIn': return !v.map(norm).includes(A);
    case 'between': return Number(a) >= Number(v[0]) && Number(a) <= Number(v[1]);
    default: throw new Error(`Unknown operator: ${op}`);
  }
}

/** Evaluate a node; pushes leaf results into `trace`. */
function evaluate(node, profile, trace = []) {
  if (node.all || node.any) {
    const kids = node.all || node.any;
    const results = kids.map(k => evaluate(k, profile, trace));
    if (node.all) {
      if (results.includes(FAIL)) return FAIL;
      return results.includes(UNKNOWN) ? UNKNOWN : PASS;
    }
    if (results.includes(PASS)) return PASS;
    return results.includes(UNKNOWN) ? UNKNOWN : FAIL;
  }
  if (node.not) {
    const sub = [];
    const r = evaluate(node.not, profile, sub);
    const status = r === UNKNOWN ? UNKNOWN : r === PASS ? FAIL : PASS;
    trace.push({ field: sub[0] && sub[0].field, label: node.label || 'Exclusion', status });
    return status;
  }
  const value = getField(profile, node.field);
  let status;
  if (missing(value)) status = node.optional ? PASS : UNKNOWN;
  else status = compare(node.operator, value, node.value) ? PASS : FAIL;
  trace.push({ field: node.field, label: node.label || `${node.field} ${node.operator} ${JSON.stringify(node.value)}`,
    status, optional: !!node.optional && missing(value) });
  return status;
}

function normalizeProfile(p) {
  const out = { ...p };
  const gpa = Number(p.gpa), scale = Number(p.gpaScale);
  if (!missing(p.gpa) && !isNaN(gpa)) {
    out.percentage = p.gpaType === 'percentage' ? gpa : (scale > 0 ? (gpa / scale) * 100 : undefined);
  }
  return out;
}

function score(s, p, status) {
  let sc = status === 'eligible' ? 70 : 40;
  const m = s.meta || {};
  if (m.incomeMax && !missing(p.annualIncome)) sc += Math.max(0, Math.min(15, ((m.incomeMax - p.annualIncome) / m.incomeMax) * 15));
  if (m.minPercent != null && p.percentage != null) sc += Math.max(0, Math.min(15, ((p.percentage - m.minPercent) / (100 - m.minPercent)) * 15));
  return Math.round(Math.min(100, sc));
}

function matchOne(s, rawProfile, today = new Date()) {
  const profile = normalizeProfile(rawProfile);
  const trace = [];
  const result = evaluate(s.rule, profile, trace);
  const status = result === PASS ? 'eligible' : result === FAIL ? 'ineligible' : 'needs_info';
  const deadline = s.deadline ? new Date(s.deadline) : null;
  const daysLeft = deadline ? Math.ceil((deadline - today) / 864e5) : null;
  return {
    id: s.id, name: s.name, status,
    score: status === 'ineligible' ? 0 : score(s, profile, status),
    meets: trace.filter(t => t.status === PASS && !t.optional).map(t => t.label),
    unmet: trace.filter(t => t.status === FAIL).map(t => t.label),
    missingInfo: [...new Set(trace.filter(t => t.status === UNKNOWN).map(t => t.field).filter(Boolean))],
    amount: s.amount, deadline: s.deadline, daysLeft, expired: daysLeft !== null && daysLeft < 0
  };
}

const ORDER = { eligible: 0, needs_info: 1, ineligible: 2 };
function matchAll(scholarships, profile, today = new Date()) {
  return scholarships.map(s => matchOne(s, profile, today)).sort((a, b) =>
    ORDER[a.status] - ORDER[b.status] || b.score - a.score || b.amount - a.amount);
}

/** Scholarships sharing an exclusiveGroup cannot be held together. */
function findConflicts(scholarships, ids) {
  const groups = {};
  scholarships.filter(s => ids.includes(s.id) && s.exclusiveGroup)
    .forEach(s => (groups[s.exclusiveGroup] = groups[s.exclusiveGroup] || []).push(s.name));
  return Object.entries(groups).filter(([, v]) => v.length > 1).map(([group, names]) => ({ group, names }));
}

module.exports = { evaluate, matchOne, matchAll, findConflicts, normalizeProfile, compare };
