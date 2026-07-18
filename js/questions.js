// Procedural question generation.
//
// Every question comes from a template: { id, cat, minLevel, gen(level) }.
// gen(level) returns { prompt, answer, explain, answerFormat?, meta? }.
//
// Rules for templates:
//  - Parameters must be constrained so a known mental technique cracks the
//    question. Hard means "see the trick", never "grind bigger arithmetic".
//  - Compute the answer the straightforward way in code (brute force, modpow,
//    direct multiplication) — the trick belongs in `explain`, not in the
//    answer computation, so a typo in the trick can't corrupt the answer.
//  - `meta` carries raw parameters so tests can re-derive answers independently.

import {
  randInt, choice, gcd, lcm, modpow, countDivisors, factorString,
  comb, frac, sup, fmt,
} from './util.js';

export const CATEGORY_NAMES = {
  arith: 'Arithmetic',
  nt: 'Number theory',
  alg: 'Algebra',
  count: 'Counting & probability',
  seq: 'Sequences & series',
};

export const TEMPLATES = [];

function def(id, cat, minLevel, gen) {
  TEMPLATES.push({ id, cat, minLevel, gen });
}

/* ---------------- Arithmetic with structure ---------------- */

def('add-sub', 'arith', 1, level => {
  const max = level <= 1 ? 20 : level <= 2 ? 60 : level <= 4 ? 99 : 999;
  let a = randInt(level <= 1 ? 3 : 12, max);
  let b = randInt(level <= 1 ? 3 : 12, max);
  if (a === b) a += randInt(1, 5);
  if (Math.random() < 0.45) {
    if (b > a) [a, b] = [b, a];
    return {
      prompt: `${fmt(a)} − ${fmt(b)}`,
      answer: a - b,
      explain: `Subtract in parts: first the tens/hundreds, then the rest. ${fmt(a)} − ${fmt(b)} = ${fmt(a - b)}.`,
      meta: { a, b, op: 'sub' },
    };
  }
  return {
    prompt: `${fmt(a)} + ${fmt(b)}`,
    answer: a + b,
    explain: `Add the big parts first, then the small parts. ${fmt(a)} + ${fmt(b)} = ${fmt(a + b)}.`,
    meta: { a, b, op: 'add' },
  };
});

def('times-table', 'arith', 1, level => {
  const a = level <= 1 ? randInt(2, 10) : level <= 2 ? randInt(3, 12) : randInt(13, 25);
  const b = level <= 1 ? randInt(2, 6) : randInt(3, 9);
  return {
    prompt: `${a} × ${b}`,
    answer: a * b,
    explain: a > 12
      ? `Split it: ${a} × ${b} = (${a - a % 10} + ${a % 10}) × ${b} = ${(a - a % 10) * b} + ${(a % 10) * b} = ${a * b}.`
      : `${a} × ${b} = ${a * b}.`,
    meta: { a, b, op: 'mul' },
  };
});

def('times-11', 'arith', 2, level => {
  const a = level >= 5 ? randInt(112, 989) : randInt(23, 98);
  return {
    prompt: `${a} × 11`,
    answer: a * 11,
    explain: `To multiply by 11, add each pair of neighbouring digits between the outer digits (carry if needed). E.g. 43 × 11: 4, 4+3, 3 → 473. Here: ${a} × 11 = ${fmt(a * 11)}.`,
    meta: { a, b: 11, op: 'mul' },
  };
});

def('square-end-5', 'arith', 3, level => {
  const n = level >= 6 ? choice([15, 25, 35, 45, 55, 65, 75, 85, 95, 105, 115, 125, 195]) : choice([15, 25, 35, 45, 55, 65, 75, 85, 95]);
  const k = (n - 5) / 10;
  return {
    prompt: `${n}²`,
    answer: n * n,
    explain: `A number ending in 5: take the part before the 5, multiply by one more, append 25. ${k} × ${k + 1} = ${k * (k + 1)}, so ${n}² = ${fmt(n * n)}.`,
    meta: { a: n, b: n, op: 'mul' },
  };
});

def('near-base', 'arith', 4, level => {
  const base = level >= 7 && Math.random() < 0.5 ? 1000 : 100;
  const spread = base === 1000 ? 9 : 8;
  let x = randInt(-spread, spread);
  let y = randInt(-spread, spread);
  if (x === 0) x = 3;
  if (y === 0) y = -4;
  const a = base + x;
  const b = base + y;
  return {
    prompt: `${fmt(a)} × ${fmt(b)}`,
    answer: a * b,
    explain: `Both are near ${fmt(base)}. (${fmt(base)}${x >= 0 ? '+' : '−'}${Math.abs(x)})(${fmt(base)}${y >= 0 ? '+' : '−'}${Math.abs(y)}) = ${fmt(base)} × (${fmt(base + x + y)}) + (${x >= 0 ? '' : '−'}${Math.abs(x)})(${y >= 0 ? '' : '−'}${Math.abs(y)}) = ${fmt(base * (base + x + y))} + ${x * y} = ${fmt(a * b)}.`,
    meta: { a, b, op: 'mul' },
  };
});

def('diff-squares-product', 'arith', 5, level => {
  const c = level >= 7 ? choice([30, 40, 50, 60, 70, 80, 90, 45, 55, 65, 75, 85, 110, 120]) : choice([30, 40, 50, 60, 70, 80, 90]);
  const d = randInt(1, level >= 7 ? 9 : 6);
  const a = c - d;
  const b = c + d;
  return {
    prompt: `${a} × ${b}`,
    answer: a * b,
    explain: `The numbers straddle ${c}: (${c} − ${d})(${c} + ${d}) = ${c}² − ${d}² = ${fmt(c * c)} − ${d * d} = ${fmt(a * b)}.`,
    meta: { a, b, op: 'mul' },
  };
});

def('square-diff', 'arith', 6, level => {
  const b = level >= 8 ? randInt(500, 3000) : randInt(100, 500);
  const d = randInt(2, 9);
  const a = b + d;
  return {
    prompt: `${fmt(a)}² − ${fmt(b)}²`,
    answer: a * a - b * b,
    explain: `Difference of squares: ${fmt(a)}² − ${fmt(b)}² = (${fmt(a)} + ${fmt(b)})(${fmt(a)} − ${fmt(b)}) = ${fmt(a + b)} × ${d} = ${fmt(a * a - b * b)}.`,
    meta: { a, b, op: 'square-diff' },
  };
});

def('square-near-base', 'arith', 6, level => {
  const base = level >= 8 && Math.random() < 0.5 ? 1000 : 100;
  let e = randInt(-8, 8);
  if (e === 0) e = 4;
  const n = base + e;
  return {
    prompt: `${fmt(n)}²`,
    answer: n * n,
    explain: `(${fmt(base)} ${e >= 0 ? '+' : '−'} ${Math.abs(e)})² = ${fmt(base * base)} ${e >= 0 ? '+' : '−'} ${fmt(2 * base * Math.abs(e))} + ${e * e} = ${fmt(n * n)}.`,
    meta: { a: n, b: n, op: 'mul' },
  };
});

def('percent', 'arith', 3, level => {
  const p = choice(level >= 6 ? [15, 25, 30, 40, 60, 75, 80, 90, 5] : [10, 20, 25, 50, 5]);
  const unit = 100 / gcd(p, 100);
  const N = unit * randInt(2, level >= 6 ? 60 : 20);
  return {
    prompt: `What is ${p}% of ${fmt(N)}?`,
    answer: (p * N) / 100,
    explain: `10% of ${fmt(N)} is ${fmt(N / 10)}. Build ${p}% from easy pieces (10%, 5%, 1%): ${p}% of ${fmt(N)} = ${fmt((p * N) / 100)}.`,
    meta: { p, N },
  };
});

/* ---------------- Number theory ---------------- */

def('small-remainder', 'nt', 1, level => {
  const d = randInt(2, level >= 3 ? 9 : 5);
  const N = randInt(d + 1, level >= 3 ? 100 : 50);
  return {
    prompt: `What is the remainder when ${N} is divided by ${d}?`,
    answer: N % d,
    explain: `${d} × ${Math.floor(N / d)} = ${d * Math.floor(N / d)}, leaving ${N % d} over.`,
    meta: { N, d },
  };
});

def('last-digit-product', 'nt', 3, level => {
  const max = level <= 4 ? 99 : 999;
  const a = randInt(12, max);
  const b = randInt(12, max);
  return {
    prompt: `What is the last digit of ${fmt(a)} × ${fmt(b)}?`,
    answer: (a * b) % 10,
    explain: `Only the last digits matter: ${a % 10} × ${b % 10} = ${(a % 10) * (b % 10)}, so the last digit is ${(a * b) % 10}.`,
    meta: { a, b },
  };
});

def('digit-sum-remainder', 'nt', 3, level => {
  const N = level >= 5 ? randInt(10000, 999999) : randInt(100, 9999);
  const m = choice([3, 9]);
  const digitSum = String(N).split('').reduce((s, d) => s + Number(d), 0);
  return {
    prompt: `What is the remainder when ${fmt(N)} is divided by ${m}?`,
    answer: N % m,
    explain: `A number and its digit sum leave the same remainder mod ${m}. Digits of ${fmt(N)} sum to ${digitSum}, and ${digitSum} mod ${m} = ${N % m}.`,
    meta: { N, m },
  };
});

def('remainder-last-digits', 'nt', 3, level => {
  const N = level >= 6 ? randInt(10000, 99999) : randInt(200, 9999);
  const m = choice([4, 5, 10]);
  const rule = m === 4
    ? `Only the last two digits matter mod 4: ${String(N).slice(-2)} mod 4 = ${N % m}.`
    : `Only the last digit matters mod ${m}: ${N % 10} mod ${m} = ${N % m}.`;
  return {
    prompt: `What is the remainder when ${fmt(N)} is divided by ${m}?`,
    answer: N % m,
    explain: rule,
    meta: { N, m },
  };
});

def('last-digit-power', 'nt', 5, level => {
  const a = choice([2, 3, 4, 7, 8, 9, 12, 13]);
  const b = level >= 7 ? randInt(50, 2030) : randInt(10, 50);
  const cycle = [];
  let d = a % 10;
  do { cycle.push(d); d = (d * (a % 10)) % 10; } while (d !== cycle[0]);
  return {
    prompt: `What is the last digit of ${a}${sup(b)}?`,
    answer: modpow(a, b, 10),
    explain: `Last digits of powers of ${a} cycle: ${cycle.join(', ')} (length ${cycle.length}). ${b} mod ${cycle.length} tells you where in the cycle you land → ${modpow(a, b, 10)}.`,
    meta: { a, b, m: 10 },
  };
});

def('divisor-count', 'nt', 6, level => {
  const n = choice(level >= 8
    ? [120, 180, 210, 240, 360, 420, 720, 840, 900, 1000]
    : [36, 48, 60, 72, 96, 100, 120]);
  const parts = factorString(n);
  const exps = factorString(n); // display only
  return {
    prompt: `How many positive divisors does ${fmt(n)} have?`,
    answer: countDivisors(n),
    explain: `${fmt(n)} = ${parts}. Add 1 to each exponent and multiply: that gives ${countDivisors(n)} divisors.`,
    meta: { n },
  };
});

def('gcd-pair', 'nt', 4, level => {
  const [m, n] = choice([[2, 3], [3, 4], [2, 5], [3, 5], [4, 5], [5, 6], [2, 7], [3, 7]]);
  const g = randInt(4, level >= 6 ? 25 : 12);
  const a = g * m;
  const b = g * n;
  return {
    prompt: `What is the greatest common divisor of ${a} and ${b}?`,
    answer: gcd(a, b),
    explain: `${a} = ${gcd(a, b)} × ${a / gcd(a, b)} and ${b} = ${gcd(a, b)} × ${b / gcd(a, b)}, and ${a / gcd(a, b)} and ${b / gcd(a, b)} share no factor. GCD = ${gcd(a, b)}.`,
    meta: { a, b },
  };
});

def('lcm-pair', 'nt', 5, level => {
  const a = randInt(4, level >= 7 ? 36 : 20);
  const b = randInt(4, level >= 7 ? 36 : 20);
  return {
    prompt: `What is the least common multiple of ${a} and ${b}?`,
    answer: lcm(a, b),
    explain: `GCD(${a}, ${b}) = ${gcd(a, b)}, and LCM = ${a} × ${b} ÷ GCD = ${fmt(lcm(a, b))}.`,
    meta: { a, b },
  };
});

def('pow-mod', 'nt', 7, level => {
  // Pairs (base, modulus) with a short power cycle, so it's genuinely mental.
  const [a, m] = choice([[3, 8], [5, 8], [7, 8], [2, 7], [4, 7], [3, 10], [7, 10], [9, 10], [4, 6]]);
  const b = randInt(20, 500);
  return {
    prompt: `What is the remainder when ${a}${sup(b)} is divided by ${m}?`,
    answer: modpow(a, b, m),
    explain: `Powers of ${a} mod ${m} cycle quickly (check ${a}¹, ${a}², ${a}³ mod ${m}). Find where ${b} lands in the cycle → ${modpow(a, b, m)}.`,
    meta: { a, b, m },
  };
});

/* ---------------- Algebra ---------------- */

def('one-step', 'alg', 1, level => {
  if (Math.random() < 0.5) {
    const a = randInt(3, 30);
    const x = randInt(2, 40);
    return {
      prompt: `If x + ${a} = ${a + x}, what is x?`,
      answer: x,
      explain: `x = ${a + x} − ${a} = ${x}.`,
      meta: { x },
    };
  }
  const a = randInt(3, 12);
  const x = randInt(2, 12);
  return {
    prompt: `If ${a}x = ${a * x}, what is x?`,
    answer: x,
    explain: `x = ${a * x} ÷ ${a} = ${x}.`,
    meta: { x },
  };
});

def('two-step', 'alg', 2, level => {
  const a = randInt(2, level >= 4 ? 12 : 6);
  const x = randInt(2, level >= 4 ? 20 : 10);
  const b = randInt(1, 15);
  return {
    prompt: `If ${a}x + ${b} = ${a * x + b}, what is x?`,
    answer: x,
    explain: `Subtract ${b}: ${a}x = ${a * x}. Divide by ${a}: x = ${x}.`,
    meta: { x },
  };
});

def('sum-diff-system', 'alg', 3, level => {
  const y = randInt(2, level >= 5 ? 40 : 15);
  const x = y + randInt(1, level >= 5 ? 30 : 10);
  return {
    prompt: `If x + y = ${x + y} and x − y = ${x - y}, what is x?`,
    answer: x,
    explain: `Add the equations: 2x = ${2 * x}, so x = ${x}.`,
    meta: { x, y },
  };
});

def('linear-combo', 'alg', 4, level => {
  const p = randInt(2, 5);
  const qq = randInt(2, 7);
  const v = randInt(8, 30);
  const k = randInt(2, 4);
  const c = randInt(0, 9);
  return {
    prompt: `If ${p}x + ${qq}y = ${v}, what is ${k * p}x + ${k * qq}y${c ? ` + ${c}` : ''}?`,
    answer: k * v + c,
    explain: `${k * p}x + ${k * qq}y is exactly ${k} × (${p}x + ${qq}y) = ${k} × ${v} = ${k * v}${c ? `, plus ${c} gives ${k * v + c}` : ''}. No need to find x or y.`,
    meta: { v, k, c },
  };
});

def('symmetric-squares', 'alg', 5, level => {
  const s = randInt(5, 14);
  const p = randInt(1, Math.floor((s * s) / 4));
  return {
    prompt: `If a + b = ${s} and ab = ${p}, what is a² + b²?`,
    answer: s * s - 2 * p,
    explain: `(a + b)² = a² + 2ab + b², so a² + b² = ${s}² − 2 × ${p} = ${s * s} − ${2 * p} = ${s * s - 2 * p}.`,
    meta: { s, p },
  };
});

def('x-plus-inv-x', 'alg', 6, level => {
  const k = randInt(3, 9);
  if (level >= 8 && Math.random() < 0.5) {
    return {
      prompt: `If x + 1/x = ${k}, what is x³ + 1/x³?`,
      answer: k * k * k - 3 * k,
      explain: `Cube it: (x + 1/x)³ = x³ + 1/x³ + 3(x + 1/x). So x³ + 1/x³ = ${k}³ − 3 × ${k} = ${k * k * k} − ${3 * k} = ${k * k * k - 3 * k}.`,
      meta: { k, power: 3 },
    };
  }
  return {
    prompt: `If x + 1/x = ${k}, what is x² + 1/x²?`,
    answer: k * k - 2,
    explain: `Square it: (x + 1/x)² = x² + 2 + 1/x². So x² + 1/x² = ${k}² − 2 = ${k * k - 2}.`,
    meta: { k, power: 2 },
  };
});

def('vieta', 'alg', 6, level => {
  let b = 0;
  let c = 0;
  do {
    b = choice([-1, 1]) * randInt(2, 12);
    c = choice([-1, 1]) * randInt(2, 12);
  } while (b * b < 4 * c);
  const askSum = Math.random() < 0.5;
  const poly = `x² ${b >= 0 ? '+' : '−'} ${Math.abs(b)}x ${c >= 0 ? '+' : '−'} ${Math.abs(c)} = 0`;
  return {
    prompt: `What is the ${askSum ? 'sum' : 'product'} of the roots of ${poly}?`,
    answer: askSum ? -b : c,
    explain: `Vieta's formulas for x² + bx + c: the roots sum to −b and multiply to c. Here ${askSum ? `sum = ${-b}` : `product = ${c}`}.`,
    meta: { b, c, askSum },
  };
});

/* ---------------- Counting & probability ---------------- */

def('arrangements', 'count', 1, level => {
  const n = level >= 5 ? randInt(4, 6) : level >= 3 ? randInt(3, 5) : level >= 2 ? randInt(3, 4) : 3;
  let f = 1;
  for (let i = 2; i <= n; i++) f *= i;
  return {
    prompt: `How many ways can you arrange ${n} different books in a row on a shelf?`,
    answer: f,
    explain: `${n} choices for the first spot, ${n - 1} for the next, and so on: ${n}! = ${fmt(f)}.`,
    meta: { n },
  };
});

def('handshakes', 'count', 3, level => {
  const n = level >= 6 ? randInt(10, 20) : randInt(5, 10);
  return {
    prompt: `${n} people each shake hands with every other person exactly once. How many handshakes happen?`,
    answer: (n * (n - 1)) / 2,
    explain: `Each pair shakes once: ${n} × ${n - 1} ÷ 2 = ${fmt((n * (n - 1)) / 2)}.`,
    meta: { n },
  };
});

def('choose-k', 'count', 4, level => {
  const k = level >= 6 ? choice([2, 3]) : 2;
  const n = randInt(k + 3, level >= 6 ? 10 : 8);
  return {
    prompt: `How many ways can you choose a team of ${k} people from a group of ${n}?`,
    answer: comb(n, k),
    explain: k === 2
      ? `C(${n}, 2) = ${n} × ${n - 1} ÷ 2 = ${comb(n, 2)}.`
      : `C(${n}, 3) = ${n} × ${n - 1} × ${n - 2} ÷ 6 = ${comb(n, 3)}.`,
    meta: { n, k },
  };
});

def('dice-sum', 'count', 4, level => {
  const atLeast = level >= 6 && Math.random() < 0.5;
  let ways = 0;
  let k = 0;
  if (atLeast) {
    k = randInt(9, 11);
    for (let i = 1; i <= 6; i++) for (let j = 1; j <= 6; j++) if (i + j >= k) ways++;
  } else {
    k = randInt(4, 10);
    for (let i = 1; i <= 6; i++) for (let j = 1; j <= 6; j++) if (i + j === k) ways++;
  }
  return {
    prompt: `Two fair dice are rolled. What is the probability the sum is ${atLeast ? `at least ${k}` : `exactly ${k}`}?`,
    answer: frac(ways, 36),
    answerFormat: 'fraction',
    explain: `Count favourable outcomes out of 36: there are ${ways}, so the probability is ${ways}/36 = ${frac(ways, 36).num}/${frac(ways, 36).den}.`,
    meta: { k, atLeast },
  };
});

def('coin-flips', 'count', 5, level => {
  const n = level >= 7 ? 4 : 3;
  const k = randInt(0, n);
  return {
    prompt: `A fair coin is flipped ${n} times. What is the probability of exactly ${k} head${k === 1 ? '' : 's'}?`,
    answer: frac(comb(n, k), 2 ** n),
    answerFormat: 'fraction',
    explain: `There are 2${sup(n)} = ${2 ** n} equally likely sequences, and C(${n}, ${k}) = ${comb(n, k)} of them have exactly ${k} heads.`,
    meta: { n, k },
  };
});

def('distinct-digits', 'count', 6, level => {
  const k = level >= 8 ? choice([3, 4]) : choice([2, 3]);
  // Brute force the count — cheap for k ≤ 4 and immune to off-by-one slips.
  let count = 0;
  for (let n = 10 ** (k - 1); n < 10 ** k; n++) {
    const s = String(n);
    if (new Set(s).size === k) count++;
  }
  const steps = [9];
  for (let i = 1; i < k; i++) steps.push(10 - i);
  return {
    prompt: `How many ${k}-digit numbers have all distinct digits?`,
    answer: count,
    explain: `First digit: 9 choices (not 0). Each next digit: anything unused. ${steps.join(' × ')} = ${fmt(count)}.`,
    meta: { k },
  };
});

def('at-least-one', 'count', 7, level => {
  if (Math.random() < 0.5) {
    const n = randInt(3, 6);
    return {
      prompt: `A fair coin is flipped ${n} times. What is the probability of at least one head?`,
      answer: frac(2 ** n - 1, 2 ** n),
      answerFormat: 'fraction',
      explain: `Complementary counting: P(no heads) = 1/2${sup(n)} = 1/${2 ** n}, so P(at least one) = ${2 ** n - 1}/${2 ** n}.`,
      meta: { kind: 'coins', n },
    };
  }
  const n = level >= 8 ? choice([2, 3]) : 2;
  const num = 6 ** n - 5 ** n;
  return {
    prompt: `A fair die is rolled ${n === 2 ? 'twice' : `${n} times`}. What is the probability of at least one six?`,
    answer: frac(num, 6 ** n),
    answerFormat: 'fraction',
    explain: `Complementary counting: P(no six) = (5/6)${sup(n)} = ${5 ** n}/${6 ** n}, so P(at least one) = ${num}/${6 ** n}.`,
    meta: { kind: 'dice', n },
  };
});

/* ---------------- Sequences & series ---------------- */

def('next-arith', 'seq', 1, level => {
  const d = level >= 3 ? choice([-1, 1]) * randInt(3, 12) : randInt(2, level >= 2 ? 9 : 5);
  const start = level >= 3 ? randInt(-20, 40) : randInt(1, level >= 2 ? 20 : 10);
  const terms = [0, 1, 2, 3].map(i => start + i * d);
  return {
    prompt: `What is the next term: ${terms.join(', ')}, …?`,
    answer: start + 4 * d,
    explain: `Each term ${d >= 0 ? 'increases' : 'decreases'} by ${Math.abs(d)}, so the next term is ${start + 4 * d}.`,
    meta: { start, d },
  };
});

def('next-geom', 'seq', 2, level => {
  const r = choice(level >= 4 ? [2, 3, 4] : [2, 3]);
  const start = choice([1, 2, 3, 4, 5]);
  const terms = [0, 1, 2, 3].map(i => start * r ** i);
  return {
    prompt: `What is the next term: ${terms.map(fmt).join(', ')}, …?`,
    answer: start * r ** 4,
    explain: `Each term is ${r} times the previous one: ${fmt(start * r ** 3)} × ${r} = ${fmt(start * r ** 4)}.`,
    meta: { start, r },
  };
});

def('gauss-sum', 'seq', 4, level => {
  const n = choice(level >= 6 ? [50, 100, 200] : [20, 30, 40, 50]);
  return {
    prompt: `What is 1 + 2 + 3 + ⋯ + ${n}?`,
    answer: (n * (n + 1)) / 2,
    explain: `Pair the ends (Gauss): 1 + ${n}, 2 + ${n - 1}, … Sum = ${n} × ${n + 1} ÷ 2 = ${fmt((n * (n + 1)) / 2)}.`,
    meta: { n },
  };
});

def('odd-even-sum', 'seq', 5, level => {
  const n = randInt(5, level >= 7 ? 30 : 15);
  if (level >= 6 && Math.random() < 0.4) {
    return {
      prompt: `What is the sum of the first ${n} even numbers (2 + 4 + ⋯ + ${2 * n})?`,
      answer: n * (n + 1),
      explain: `2 + 4 + ⋯ + 2n = 2(1 + 2 + ⋯ + n) = n(n+1) = ${n} × ${n + 1} = ${fmt(n * (n + 1))}.`,
      meta: { n, kind: 'even' },
    };
  }
  return {
    prompt: `What is the sum of the first ${n} odd numbers (1 + 3 + ⋯ + ${2 * n - 1})?`,
    answer: n * n,
    explain: `The first n odd numbers always sum to n²: ${n}² = ${fmt(n * n)}.`,
    meta: { n, kind: 'odd' },
  };
});

def('multiples-sum', 'seq', 6, level => {
  const m = randInt(3, 9);
  const k = randInt(10, level >= 8 ? 20 : 14);
  return {
    prompt: `What is the sum of all multiples of ${m} from ${m} up to ${m * k}?`,
    answer: (m * k * (k + 1)) / 2,
    explain: `Factor out ${m}: ${m}(1 + 2 + ⋯ + ${k}) = ${m} × ${(k * (k + 1)) / 2} = ${fmt((m * k * (k + 1)) / 2)}.`,
    meta: { m, k },
  };
});

def('telescope', 'seq', 7, level => {
  const n = randInt(5, level >= 9 ? 20 : 12);
  return {
    prompt: `What is 1/(1×2) + 1/(2×3) + 1/(3×4) + ⋯ + 1/(${n}×${n + 1})?`,
    answer: frac(n, n + 1),
    answerFormat: 'fraction',
    explain: `Each term telescopes: 1/(k(k+1)) = 1/k − 1/(k+1). Everything cancels except 1 − 1/${n + 1} = ${n}/${n + 1}.`,
    meta: { n },
  };
});

/* ---------------- Selection ---------------- */

const CATEGORY_KEYS = Object.keys(CATEGORY_NAMES);

function pickTemplate(level, category, lastId) {
  const pool = TEMPLATES.filter(t => t.cat === category && t.minLevel <= level);
  // Weight toward recently-unlocked techniques so higher levels feel different,
  // not just bigger; keep old templates around at low weight for variety.
  const weights = pool.map(t => {
    const staleness = level - t.minLevel;
    return (1 + t.minLevel) * (staleness >= 5 ? 0.3 : 1);
  });
  const pick = () => {
    let r = Math.random() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < pool.length; i++) {
      r -= weights[i];
      if (r <= 0) return pool[i];
    }
    return pool[pool.length - 1];
  };
  let t = pick();
  if (t.id === lastId && pool.length > 1) t = pick();
  return t;
}

export function generateQuestion(level, { category, lastId } = {}) {
  const cat = category ?? choice(CATEGORY_KEYS);
  const t = pickTemplate(level, cat, lastId);
  return { ...t.gen(level), category: t.cat, templateId: t.id, level };
}

// Same template instantiated at two (possibly different) levels.
export function generateShowdown(levelA, levelB, lastIds = []) {
  const minLevel = Math.min(levelA, levelB);
  const cat = choice(CATEGORY_KEYS);
  const t = pickTemplate(minLevel, cat, lastIds[0]);
  const qa = { ...t.gen(levelA), category: t.cat, templateId: t.id, level: levelA };
  let qb = { ...t.gen(levelB), category: t.cat, templateId: t.id, level: levelB };
  // If both players are at similar levels the params can collide; avoid the
  // second player having just seen the first player's answer.
  for (let i = 0; i < 5 && qb.prompt === qa.prompt; i++) {
    qb = { ...t.gen(levelB), category: t.cat, templateId: t.id, level: levelB };
  }
  return { templateId: t.id, questions: [qa, qb] };
}

export function timerSeconds(level) {
  return 10 + 6 * level;
}
