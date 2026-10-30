'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const base = path.resolve(__dirname, '..');
const ctx = vm.createContext({});
for (const file of ['data.js', 'engine.js']) vm.runInContext(fs.readFileSync(path.join(base, 'js', file), 'utf8'), ctx);
const D = ctx.CTX_DATA, E = ctx.CTX_ENGINE;
let checks = 0;
function check(label, fn) { fn(); checks++; console.log('PASS ' + label); }
check('Project / Work identity', () => { assert.equal(D.identity.projectId, 'CTX-ENTERPRISE-20261024'); assert.equal(D.identity.workId, 'CTX-ENTERPRISE-TRIAL-M1-20261026'); });
check('Unanswered and invalid values always require confirmation', () => {
  for (const value of [undefined, '', 'safe', null, 1, '<script>']) {
    const a = Object.fromEntries(D.themes.map(t => [t.id, value]));
    assert.equal(E.summary(a).unknown, 9); assert.equal(E.summary(a).ready, 0);
    for (const row of E.assess(a)) { assert.equal(row.status, 'unanswered'); assert.match(row.next, /利用可能と判断せず/); }
  }
});
check('Every theme / every valid choice is classified correctly', () => {
  for (const theme of D.themes) for (const choice of D.choices) {
    const row = E.assess({ [theme.id]: choice.value }).find(r => r.id === theme.id);
    assert.equal(row.status, choice.value); assert.ok(row.risk && row.action && row.decision && row.owner);
    if (choice.value === 'ready') assert.match(row.label, /申告/);
    if (choice.value === 'unknown') assert.match(row.next, /利用可能と判断せず/);
  }
});
check('Mixed fictional example has 2 declarations, 5 actions, 2 unknowns', () => {
  const a = Object.fromEntries(D.themes.map((t, i) => [t.id, D.sample[i]]));
  const s = E.summary(a); assert.equal(s.ready, 2); assert.equal(s.action, 5); assert.equal(s.unknown, 2); assert.equal(s.answered, 9);
});
check('All ready remains self-report without a safety guarantee', () => {
  const a = Object.fromEntries(D.themes.map(t => [t.id, 'ready']));
  assert.equal(E.summary(a).ready, 9); E.assess(a).forEach(r => assert.match(r.next, /証跡・有効性/));
});
check('Both product drafts reflect unknown / unanswered / changes', () => {
  for (const product of ['Codex', 'Claude Code']) {
    const before = E.draft(product, {}, {}), after = E.draft(product, { information: 'unknown' }, { review: true, strict: true, budget: true });
    assert.match(after, new RegExp(product)); assert.match(after, /不明・確認が必要/); assert.match(before, /未回答・確認が必要/);
    assert.match(after, /10,000円/); assert.match(after, /禁止指示だけでは実際のアクセス制限にならない/); assert.notEqual(before, after);
  }
});
function reconstruct(a, b) {
  const d = E.diff(a, b);
  assert.equal(d.filter(r => r.type !== 'add').map(r => r.text).join('\n'), a);
  assert.equal(d.filter(r => r.type !== 'remove').map(r => r.text).join('\n'), b);
}
check('Diff reconstructs both originals, including repeated and empty lines', () => {
  for (const [a, b] of [['', ''], ['a', 'b'], ['a\na\nb', 'a\nb\na'], ['\na\n', 'a\n\n'], ['x', 'x\ny']]) reconstruct(a, b);
  for (const p of ['Codex', 'Claude Code']) reconstruct(E.baseline(p), E.draft(p, {}, { review: true, strict: true }));
  let seed = 17;
  const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed; };
  for (let k = 0; k < 200; k++) { const s = () => Array.from({ length: rand() % 15 }, () => ['a', 'b', '', '日本語'][rand() % 4]).join('\n'); reconstruct(s(), s()); }
});
console.log(`Engine checks: ${checks} passed`);
