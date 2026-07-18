# MathMental — Design Document

A two-player mental math quiz game for players at substantially different levels.
All questions must be solvable "in your head" — no paper, no calculator — even when
they're hard. The difficulty ceiling is AoPS-competition-flavored: hard questions
should reward *technique and insight*, not bigger arithmetic grinding.

## Core principles

1. **Mental-computable by construction.** Every question is generated from a template
   whose parameters are chosen so a known mental technique cracks it. Hard ≠ long
   division of 7-digit numbers. Hard = "you need to see the trick."
2. **Difficulty is per-player, fairness is by design.** Both players play the same
   round, but each receives questions at their own level. A correct answer is worth
   the same for both players, so the race is fair even at different levels.
3. **Infinite questions.** Procedural generation from templates + parameter ranges,
   so no question bank to exhaust and no memorizing answers.

## Question categories (proposed)

Each category spans the full difficulty range. Examples below show roughly
level 2 vs. level 8 on a 1–10 scale.

### 1. Arithmetic with structure ("see the trick")
Multiplication/squaring where the numbers are chosen to have exploitable structure.
- L2: `35 × 11` (the 11-trick), `18 + 47`
- L8: `47 × 53` (= 50² − 3²), `995²` (= (1000−5)²), `2026² − 2024²` (difference of squares → 2 × 4050)
- Techniques rewarded: difference of squares, (a±b)², squaring numbers ending in 5,
  multiplying near a round base, distributing cleverly.

### 2. Number theory & number sense
- L2: "Is 342 divisible by 9?", "What is the last digit of 34 × 27?"
- L8: "What is the last digit of 7^2026?" (cycle length 4), "How many positive
  divisors does 360 have?" (prime factorize → (3+1)(2+1)(1+1) = 24),
  "What is 3^100 mod 8?"
- Techniques: divisibility rules, digit sums, units-digit cycles, divisor counting,
  small modular arithmetic, GCD/LCM via factorization.

### 3. Algebra in your head
- L2: "If 3x + 4 = 19, what is x?"
- L8: "If x + 1/x = 4, what is x² + 1/x²?" (square it → 14),
  "The roots of x² − 7x + 11 sum to what? Multiply to what?" (Vieta's),
  "If a + b = 10 and ab = 21, what is a² + b²?" (= 100 − 42)
- Techniques: Vieta's formulas, symmetric expressions, clever substitution,
  systems solved by adding/subtracting equations.

### 4. Counting & probability
- L2: "How many ways can you arrange 3 books on a shelf?"
- L8: "8 people shake hands with everyone else once — how many handshakes?" (C(8,2)),
  "Two dice are rolled; what is the probability the sum is at least 10?" (6/36),
  "How many 3-digit numbers have all distinct digits?" (9×9×8)
- Techniques: complementary counting, small binomial coefficients, symmetry.

### 5. Sequences & series
- L2: "What is the next term: 3, 7, 11, 15, …?"
- L8: "What is 1 + 2 + ⋯ + 100?", "Sum of the first 10 odd numbers?" (= 10²),
  "What is 1 − 1/2 + 1/2 − 1/3 + ⋯ (telescoping, small cases)"
- Techniques: Gauss pairing, arithmetic/geometric sum formulas, telescoping.

### 6. Word problems with nice numbers
- L2: "Apples cost 30p each. How much do 4 apples cost?"
- L8: "I drive to work at 30 mph and return at 60 mph. What is my average speed?"
  (harmonic mean → 40, the classic trap), work-rate problems ("A does it in 3 hours,
  B in 6 — together?"), age problems.
- Techniques: harmonic mean, rate addition, setting up the right single equation.

### 7. Geometry without paper
- L2: "A rectangle is 6 by 4. What is its area?"
- L8: "What is the interior angle of a regular nonagon?", "A right triangle has legs
  9 and 12 — what is the hypotenuse?" (3-4-5 scaled), "What is the sum of interior
  angles of a hexagon?"
- Techniques: Pythagorean triples, angle formulas, decomposition into known shapes.

### 8. Estimation (optional mode, answer-within-tolerance)
- "Roughly what is 17% of 8,200?" — accepted if within ±5%.
- Good as a change of pace; scoring by closeness.

## Difficulty model

A 1–10 scale per player. Difficulty controls **two independent knobs**:

1. **Parameter size** — bigger/uglier numbers within the same template.
2. **Technique tier** — which templates are unlocked. Low levels draw only from
   direct-computation templates; high levels draw mostly from insight-required
   templates (Vieta's, units-digit cycles, harmonic mean, …).

This is the key to "substantially different levels": the gap between level 2 and
level 8 isn't just bigger numbers — it's a different *kind* of question, while both
remain genuinely mental.

Optional: adaptive nudging — after a round, suggest moving a player ±1 level based
on accuracy and speed (e.g. >85% correct and fast → nudge up).

## Game modes

1. **Duel (the main mode).** N rounds (default 10). Each round, both players get one
   question at their own level, same point value. Pass-and-play on one device, or
   side-by-side on two. Optional per-question timer (difficulty-scaled, e.g. 20s at
   L2, 60s at L8).
2. **Streak.** Solo warm-up: how many in a row can you get right at your level?
3. **Same-problem showdown (occasional spice).** One shared template, instantiated
   at each player's level — "you both got a 'last digit of a power' question, hers
   was 3^5, yours was 7^2026."

## Scoring

- 1 point per correct answer (level-fair by design — see principle 2).
- Optional speed bonus: +1 if answered in the first third of the timer.
- Estimation mode: points scale with closeness.

## Tech approach (proposal)

A single-page web app with **no backend**: plain HTML/CSS/JS (or a small Vite +
TypeScript setup), all question generation client-side, state in localStorage
(player names, levels, win history). Playable on a phone or laptop, pass-and-play.
This keeps it trivially hostable (GitHub Pages) and hackable — adding a new
question template is just adding one generator function.

Question generators produce `{ prompt, answer, acceptedForms, category, level }`,
with answers checked as exact values (fractions accepted as `a/b` or decimal where
sensible).

## Open questions for discussion

1. **Category mix** — which of the 8 categories above make the cut for v1? My
   suggestion: 1–5 for v1 (arithmetic-with-structure, number theory, algebra,
   counting, sequences), add geometry/word problems/estimation later.
2. **Timer or no timer?** Timed feels more game-like but can stress a newer player;
   could make it a per-player toggle.
3. **Answer entry** — free-form numeric entry (purer, my lean) vs. multiple choice
   (faster, but AoPS-style guessing-from-options changes the skill).
4. **Platform** — is a browser pass-and-play app right, or would you rather have a
   CLI you run in a terminal?
