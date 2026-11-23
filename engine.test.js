const test = require('node:test');
const assert = require('node:assert');
const { evaluate, matchOne, matchAll, findConflicts } = require('../src/engine');
const schemes = require('../src/scholarships');
const TODAY = new Date('2026-11-20');
const base = { domicile: 'Telangana', category: 'BC', annualIncome: 150000, gender: 'Female',
  degree: 'Engineering', level: 'UG', academicYear: 2, gpa: 8.5, gpaScale: 10 };

test('all/any/not with three-valued logic', () => {
  const leaf = (f, v) => ({ field: f, operator: '=', value: v });
  assert.strictEqual(evaluate({ all: [leaf('a', 1), leaf('b', 2)] }, { a: 1 }), 'unknown');
  assert.strictEqual(evaluate({ all: [leaf('a', 9), leaf('b', 2)] }, { a: 1 }), 'fail');
  assert.strictEqual(evaluate({ any: [leaf('a', 1), leaf('b', 2)] }, { a: 1 }), 'pass');
  assert.strictEqual(evaluate({ not: leaf('a', 1) }, { a: 1 }), 'fail');
  assert.strictEqual(evaluate({ not: leaf('a', 1) }, {}), 'unknown');
});

test('operators: between, in, comparisons, optional', () => {
  assert.strictEqual(evaluate({ field: 'x', operator: 'between', value: [1, 5] }, { x: 3 }), 'pass');
  assert.strictEqual(evaluate({ field: 'x', operator: 'in', value: ['A'] }, { x: 'a' }), 'pass');
  assert.strictEqual(evaluate({ field: 'x', operator: '>=', value: 5, optional: true }, {}), 'pass');
});

test('Telangana BC female engineer matches ePASS and Pragati', () => {
  const r = matchAll(schemes, base, TODAY);
  const by = n => r.find(x => x.name.includes(n));
  assert.strictEqual(by('Telangana ePASS').status, 'eligible');
  assert.strictEqual(by('Pragati').status, 'eligible');
  assert.strictEqual(by('Karnataka').status, 'ineligible');
});

test('failed hard rule is never overridden by score', () => {
  const r = matchOne(schemes.find(s => s.name.includes('Top Class')), { ...base, annualIncome: 100 }, TODAY);
  assert.strictEqual(r.status, 'ineligible'); // category is BC, scheme needs SC
  assert.strictEqual(r.score, 0);
});

test('missing information is never labelled eligible', () => {
  const r = matchOne(schemes.find(s => s.name.includes('Pragati')), { gender: 'Female' }, TODAY);
  assert.strictEqual(r.status, 'needs_info');
  assert.ok(r.missingInfo.includes('annualIncome'));
});

test('income just over the cap fails', () => {
  const r = matchOne(schemes.find(s => s.name.includes('Telangana ePASS')), { ...base, annualIncome: 200001 }, TODAY);
  assert.strictEqual(r.status, 'ineligible');
});

test('conflict detection on shared exclusive group', () => {
  const ids = schemes.filter(s => s.exclusiveGroup === 'state-post-matric').slice(0, 2).map(s => s.id);
  assert.strictEqual(findConflicts(schemes, ids).length, 1);
});

test('dataset has 30+ schemes with unique ids', () => {
  assert.ok(schemes.length >= 30);
  assert.strictEqual(new Set(schemes.map(s => s.id)).size, schemes.length);
});
