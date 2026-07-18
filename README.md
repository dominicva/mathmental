# MathMental 🧮

A two-player mental math quiz game for players at different levels. Every
question is solvable in your head — hard questions require *seeing the trick*
(difference of squares, Vieta's formulas, units-digit cycles, telescoping…),
never grinding bigger arithmetic. See [DESIGN.md](DESIGN.md) for the full design.

## How to play

Open the app, set each player's name, **level (1–10)**, and optional per-player
**timer**, then:

- **Duel** — pass-and-play. Each round, both players get one question at their
  own level, worth the same points, so the race is fair across levels.
  About 1 in 4 rounds is a **showdown**: the same trick instantiated at each
  player's level. Timed players earn a +1 speed bonus for fast answers.
- **Streak** — solo warm-up: how many in a row can you get right? Personal
  bests are saved on the device.

Answers are typed free-form. Whole numbers, decimals, and fractions (`5/36`)
are accepted; fractions don't need to be reduced.

## Running it

It's a static site with no build step. Serve the folder any way you like:

```sh
python3 -m http.server 8080   # or: npx serve
```

then open http://localhost:8080. To put it online, enable GitHub Pages for this
repository (Settings → Pages → deploy from branch) and play from your phones.

## Development

```sh
node --test   # generator correctness tests
```

### Adding a question type

Add one `def(id, category, minLevel, gen)` call in `js/questions.js`. The
generator receives the player's level and returns
`{ prompt, answer, explain, answerFormat?, meta? }`:

- Constrain parameters so a mental technique cracks the question — that's the
  whole game.
- Compute `answer` the straightforward way (brute force, `modpow`, direct
  multiplication); put the trick in `explain` only, so a slip in the trick
  can't corrupt the answer.
- `answer` is a number or a fraction `{ num, den }` (set
  `answerFormat: 'fraction'` to hint the input UI).
- Put raw parameters in `meta` and add a re-derivation test in
  `test/questions.test.js` if the answer computation is at all subtle.

`minLevel` gates when the template unlocks; question selection is weighted
toward recently-unlocked techniques, so higher levels feel different in kind,
not just in size.
