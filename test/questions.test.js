import test from 'node:test';
import assert from 'node:assert/strict';
import { TEMPLATES, generateQuestion, generateShowdown, CATEGORY_NAMES } from '../js/questions.js';
import { parseAnswer, answersEqual, modpow } from '../js/util.js';

function isValidAnswer(a) {
  if (typeof a === 'number') return Number.isFinite(a);
  return a && Number.isInteger(a.num) && Number.isInteger(a.den) && a.den > 0;
}

test('every template generates valid questions at every unlocked level', () => {
  for (const t of TEMPLATES) {
    for (let level = t.minLevel; level <= 10; level++) {
      for (let i = 0; i < 30; i++) {
        const q = t.gen(level);
        assert.ok(typeof q.prompt === 'string' && q.prompt.length > 0, `${t.id} L${level}: empty prompt`);
        assert.ok(typeof q.explain === 'string' && q.explain.length > 0, `${t.id} L${level}: empty explain`);
        assert.ok(isValidAnswer(q.answer), `${t.id} L${level}: bad answer ${JSON.stringify(q.answer)}`);
      }
    }
  }
});

test('every category has a template available at level 1', () => {
  for (const cat of Object.keys(CATEGORY_NAMES)) {
    assert.ok(
      TEMPLATES.some(t => t.cat === cat && t.minLevel === 1),
      `category ${cat} has no level-1 template`,
    );
  }
});

test('generateQuestion respects level gating', () => {
  for (let i = 0; i < 300; i++) {
    const level = 1 + (i % 10);
    const q = generateQuestion(level);
    const t = TEMPLATES.find(x => x.id === q.templateId);
    assert.ok(t.minLevel <= level, `${q.templateId} (min ${t.minLevel}) served at level ${level}`);
  }
});

test('showdown uses one template for both players at their own levels', () => {
  for (let i = 0; i < 100; i++) {
    const { templateId, questions } = generateShowdown(2, 9);
    assert.equal(questions.length, 2);
    assert.ok(questions.every(q => q.templateId === templateId));
    assert.equal(questions[0].level, 2);
    assert.equal(questions[1].level, 9);
    const t = TEMPLATES.find(x => x.id === templateId);
    assert.ok(t.minLevel <= 2, 'showdown template must be unlocked for the lower-level player');
  }
});

// Independent re-derivations for templates whose explanation uses a trick
// formula — make sure the served answer matches brute force.

function genMany(id, n = 200) {
  const t = TEMPLATES.find(x => x.id === id);
  const out = [];
  for (let i = 0; i < n; i++) out.push(t.gen(t.minLevel + (i % (11 - t.minLevel))));
  return out;
}

test('square-diff answers match direct computation', () => {
  for (const q of genMany('square-diff')) {
    assert.equal(q.answer, q.meta.a ** 2 - q.meta.b ** 2);
  }
});

test('last-digit-power and pow-mod match modpow brute force', () => {
  for (const id of ['last-digit-power', 'pow-mod']) {
    for (const q of genMany(id)) {
      assert.equal(q.answer, modpow(q.meta.a, q.meta.b, q.meta.m));
    }
  }
});

test('dice-sum probabilities match brute force over 36 outcomes', () => {
  for (const q of genMany('dice-sum')) {
    let ways = 0;
    for (let i = 1; i <= 6; i++) {
      for (let j = 1; j <= 6; j++) {
        if (q.meta.atLeast ? i + j >= q.meta.k : i + j === q.meta.k) ways++;
      }
    }
    assert.ok(answersEqual(q.answer, { num: ways, den: 36 }), `${q.prompt}: got ${JSON.stringify(q.answer)}`);
  }
});

test('telescope sums match term-by-term addition', () => {
  for (const q of genMany('telescope')) {
    let sum = 0;
    for (let k = 1; k <= q.meta.n; k++) sum += 1 / (k * (k + 1));
    assert.ok(Math.abs(q.answer.num / q.answer.den - sum) < 1e-9, q.prompt);
  }
});

test('odd/even and multiples sums match loops', () => {
  for (const q of genMany('odd-even-sum')) {
    let sum = 0;
    for (let i = 1; i <= q.meta.n; i++) sum += q.meta.kind === 'odd' ? 2 * i - 1 : 2 * i;
    assert.equal(q.answer, sum, q.prompt);
  }
  for (const q of genMany('multiples-sum')) {
    let sum = 0;
    for (let i = 1; i <= q.meta.k; i++) sum += q.meta.m * i;
    assert.equal(q.answer, sum, q.prompt);
  }
});

test('answer parsing and equality', () => {
  assert.equal(parseAnswer('  1,234 '), 1234);
  assert.equal(parseAnswer('-17'), -17);
  assert.deepEqual(parseAnswer('5/36'), { num: 5, den: 36 });
  assert.equal(parseAnswer('abc'), null);
  assert.equal(parseAnswer('1/0'), null);
  assert.ok(answersEqual(0.5, { num: 1, den: 2 }));
  assert.ok(answersEqual({ num: 10, den: 72 }, { num: 5, den: 36 }));
  assert.ok(!answersEqual(0.33, { num: 1, den: 3 }));
  assert.ok(answersEqual(-4, -4));
});

test('fraction answers are always reduced', () => {
  for (const id of ['dice-sum', 'coin-flips', 'at-least-one', 'telescope']) {
    for (const q of genMany(id)) {
      const g = (a, b) => (b ? g(b, a % b) : a);
      assert.equal(g(Math.abs(q.answer.num), q.answer.den), 1, `${id}: ${q.answer.num}/${q.answer.den} not reduced`);
    }
  }
});
