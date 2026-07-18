// Shared helpers: randomness, number theory, fractions, answer parsing/formatting.

export function randInt(lo, hi) {
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

export function choice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
}

export function lcm(a, b) {
  return (a / gcd(a, b)) * b;
}

export function modpow(base, exp, mod) {
  let result = 1;
  base %= mod;
  while (exp > 0) {
    if (exp % 2 === 1) result = (result * base) % mod;
    base = (base * base) % mod;
    exp = Math.floor(exp / 2);
  }
  return result;
}

export function countDivisors(n) {
  let count = 0;
  for (let i = 1; i * i <= n; i++) {
    if (n % i === 0) count += i * i === n ? 1 : 2;
  }
  return count;
}

export function factorExponents(n) {
  const out = [];
  for (let p = 2; p * p <= n; p++) {
    if (n % p === 0) {
      let e = 0;
      while (n % p === 0) { n /= p; e++; }
      out.push([p, e]);
    }
  }
  if (n > 1) out.push([n, 1]);
  return out;
}

export function factorString(n) {
  return factorExponents(n)
    .map(([p, e]) => (e === 1 ? `${p}` : `${p}${sup(e)}`))
    .join('·');
}

export function comb(n, k) {
  k = Math.min(k, n - k);
  let result = 1;
  for (let i = 1; i <= k; i++) result = (result * (n - k + i)) / i;
  return Math.round(result);
}

// A fraction answer, always stored reduced.
export function frac(num, den) {
  const g = gcd(num, den) || 1;
  return { num: num / g, den: den / g };
}

const SUP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻' };
export function sup(n) {
  return String(n).split('').map(c => SUP[c] ?? c).join('');
}

export function fmt(n) {
  return n.toLocaleString('en-US');
}

// Parse user input into a number or {num, den}. Returns null if unparseable.
export function parseAnswer(text) {
  text = String(text).trim().replace(/,/g, '');
  if (!text) return null;
  const m = text.match(/^(-?\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
  if (m) {
    const den = Number(m[2]);
    if (den === 0) return null;
    return { num: Number(m[1]), den };
  }
  const val = Number(text);
  return Number.isFinite(val) ? val : null;
}

export function answersEqual(a, b) {
  const norm = x => (typeof x === 'number' ? { num: x, den: 1 } : x);
  const u = norm(a);
  const v = norm(b);
  return Math.abs(u.num * v.den - v.num * u.den) < 1e-6;
}

export function formatAnswer(a) {
  if (typeof a === 'number') return fmt(a);
  return `${fmt(a.num)}/${fmt(a.den)}`;
}
