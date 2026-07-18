// UI + game flow. Screens: home/setup → duel (pass → question → feedback)* →
// results, plus a solo streak mode.

import { generateQuestion, generateShowdown, timerSeconds, CATEGORY_NAMES } from './questions.js';
import { parseAnswer, answersEqual, formatAnswer } from './util.js';

const app = document.getElementById('app');

const DEFAULT_SETTINGS = {
  players: [
    { name: 'Player 1', level: 3, timed: false },
    { name: 'Player 2', level: 6, timed: false },
  ],
  rounds: 10,
};

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(`mathmental.${key}`);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function save(key, value) {
  try {
    localStorage.setItem(`mathmental.${key}`, JSON.stringify(value));
  } catch { /* private browsing etc. — play on without persistence */ }
}

let settings = load('settings', DEFAULT_SETTINGS);
let stats = load('stats', { bestStreaks: {} });

let duel = null;
let streak = null;
let timerHandle = null;
let questionShownAt = 0;

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function stopTimer() {
  if (timerHandle) { clearInterval(timerHandle); timerHandle = null; }
}

/* ---------------- Home / setup ---------------- */

function renderHome() {
  stopTimer();
  duel = null;
  streak = null;
  const bests = Object.entries(stats.bestStreaks);
  app.innerHTML = `
    <header class="hero">
      <h1>MathMental</h1>
      <p class="tagline">All in your head. Even when it hurts.</p>
    </header>
    <section class="card">
      <h2>Players</h2>
      ${settings.players.map((p, i) => `
        <div class="player-setup" data-player="${i}">
          <input class="name-input" type="text" value="${esc(p.name)}" aria-label="Player ${i + 1} name" maxlength="20">
          <label class="level-row">
            <span>Level <output class="level-out">${p.level}</output>/10</span>
            <input class="level-input" type="range" min="1" max="10" value="${p.level}">
          </label>
          <label class="timed-row">
            <input class="timed-input" type="checkbox" ${p.timed ? 'checked' : ''}>
            <span>Timer</span>
          </label>
        </div>
      `).join('')}
      <label class="rounds-row">
        <span>Rounds</span>
        <select class="rounds-input">
          ${[5, 10, 15].map(r => `<option value="${r}" ${settings.rounds === r ? 'selected' : ''}>${r}</option>`).join('')}
        </select>
      </label>
    </section>
    <div class="btn-col">
      <button class="btn primary" id="start-duel">Start duel</button>
      <div class="streak-btns">
        ${settings.players.map((p, i) => `<button class="btn" data-streak="${i}">Streak: ${esc(p.name)}</button>`).join('')}
      </div>
    </div>
    ${bests.length ? `
      <section class="card subtle">
        <h2>Best streaks</h2>
        ${bests.map(([name, n]) => `<div class="streak-line"><span>${esc(name)}</span><strong>${n}</strong></div>`).join('')}
      </section>` : ''}
  `;

  app.querySelectorAll('.level-input').forEach(el => {
    el.addEventListener('input', () => {
      el.closest('.player-setup').querySelector('.level-out').textContent = el.value;
    });
  });

  const readSettings = () => {
    app.querySelectorAll('.player-setup').forEach(div => {
      const i = Number(div.dataset.player);
      settings.players[i].name = div.querySelector('.name-input').value.trim() || `Player ${i + 1}`;
      settings.players[i].level = Number(div.querySelector('.level-input').value);
      settings.players[i].timed = div.querySelector('.timed-input').checked;
    });
    settings.rounds = Number(app.querySelector('.rounds-input').value);
    save('settings', settings);
  };

  app.querySelector('#start-duel').addEventListener('click', () => {
    readSettings();
    startDuel();
  });
  app.querySelectorAll('[data-streak]').forEach(btn => {
    btn.addEventListener('click', () => {
      readSettings();
      startStreak(Number(btn.dataset.streak));
    });
  });
}

/* ---------------- Duel ---------------- */

function startDuel() {
  duel = {
    players: settings.players.map(p => ({
      ...p, score: 0, correct: 0, answered: 0,
      lastTemplate: null,
    })),
    rounds: settings.rounds,
    round: 1,
    turn: 0,
    phase: 'pass',
    showdown: false,
    questions: [null, null],
  };
  prepareRound();
  renderDuel();
}

function prepareRound() {
  const [a, b] = duel.players;
  duel.showdown = Math.random() < 0.25;
  if (duel.showdown) {
    const pair = generateShowdown(a.level, b.level, [a.lastTemplate, b.lastTemplate]);
    duel.questions = pair.questions;
  } else {
    duel.questions = duel.players.map(p =>
      generateQuestion(p.level, { lastId: p.lastTemplate }));
  }
  duel.players.forEach((p, i) => { p.lastTemplate = duel.questions[i].templateId; });
}

function renderDuel() {
  const p = duel.players[duel.turn];
  if (duel.phase === 'pass') {
    renderPassScreen(p);
  } else if (duel.phase === 'question') {
    renderQuestion({
      question: duel.questions[duel.turn],
      player: p,
      header: duelHeader(),
      badge: duel.showdown ? 'Showdown — same trick, your level' : null,
      onSubmit: handleDuelAnswer,
    });
  } else if (duel.phase === 'feedback') {
    renderFeedback(duel.feedback, () => {
      if (duel.turn === 0) {
        duel.turn = 1;
        duel.phase = 'pass';
        renderDuel();
      } else if (duel.round < duel.rounds) {
        duel.round += 1;
        duel.turn = 0;
        duel.phase = 'pass';
        prepareRound();
        renderDuel();
      } else {
        renderDuelResults();
      }
    }, duelHeader());
  }
}

function duelHeader() {
  const [a, b] = duel.players;
  return `
    <div class="score-bar">
      <span class="score ${duel.turn === 0 ? 'active' : ''}">${esc(a.name)} <strong>${a.score}</strong></span>
      <span class="round-ind">Round ${duel.round}/${duel.rounds}</span>
      <span class="score ${duel.turn === 1 ? 'active' : ''}"><strong>${b.score}</strong> ${esc(b.name)}</span>
    </div>`;
}

function renderPassScreen(player) {
  stopTimer();
  app.innerHTML = `
    ${duelHeader()}
    <section class="card center pass-card">
      <p class="pass-label">Pass the device to</p>
      <h2 class="pass-name">${esc(player.name)}</h2>
      <p class="pass-meta">Level ${player.level}${player.timed ? ` · ${timerSeconds(player.level)}s timer` : ''}</p>
      <button class="btn primary" id="ready">I'm ready</button>
    </section>
    <button class="btn link" id="quit">Quit duel</button>
  `;
  app.querySelector('#ready').addEventListener('click', () => {
    duel.phase = 'question';
    renderDuel();
  });
  app.querySelector('#quit').addEventListener('click', renderHome);
}

function handleDuelAnswer(rawInput, expired) {
  stopTimer();
  const p = duel.players[duel.turn];
  const question = duel.questions[duel.turn];
  const elapsed = (performance.now() - questionShownAt) / 1000;
  const parsed = expired ? null : parseAnswer(rawInput);
  const correct = parsed !== null && answersEqual(parsed, question.answer);
  const total = timerSeconds(p.level);
  const speedBonus = correct && p.timed && elapsed < total / 3 ? 1 : 0;
  p.answered += 1;
  if (correct) {
    p.correct += 1;
    p.score += 1 + speedBonus;
  }
  duel.feedback = { question, correct, expired, speedBonus, playerName: p.name };
  duel.phase = 'feedback';
  renderDuel();
}

function renderDuelResults() {
  stopTimer();
  const [a, b] = duel.players;
  const winner = a.score > b.score ? a : b.score > a.score ? b : null;
  const nudge = p => {
    if (p.answered < 5) return '';
    const acc = p.correct / p.answered;
    if (acc >= 0.85 && p.level < 10) return `On fire — try level ${p.level + 1} next time?`;
    if (acc <= 0.4 && p.level > 1) return `Tough round — level ${p.level - 1} might be more fun.`;
    return '';
  };
  app.innerHTML = `
    <section class="card center">
      <h2 class="result-title">${winner ? `${esc(winner.name)} wins! 🏆` : 'It’s a tie! 🤝'}</h2>
      <div class="final-scores">
        ${duel.players.map(p => `
          <div class="final-score">
            <div class="fs-name">${esc(p.name)}</div>
            <div class="fs-points">${p.score}</div>
            <div class="fs-acc">${p.correct}/${p.answered} correct · level ${p.level}</div>
            ${nudge(p) ? `<div class="fs-nudge">${nudge(p)}</div>` : ''}
          </div>
        `).join('')}
      </div>
      <div class="btn-col">
        <button class="btn primary" id="rematch">Rematch</button>
        <button class="btn" id="home">Back to setup</button>
      </div>
    </section>
  `;
  app.querySelector('#rematch').addEventListener('click', startDuel);
  app.querySelector('#home').addEventListener('click', renderHome);
}

/* ---------------- Streak mode ---------------- */

function startStreak(playerIndex) {
  const p = settings.players[playerIndex];
  streak = { player: { ...p }, count: 0, lastTemplate: null };
  nextStreakQuestion();
}

function nextStreakQuestion() {
  streak.question = generateQuestion(streak.player.level, { lastId: streak.lastTemplate });
  streak.lastTemplate = streak.question.templateId;
  renderQuestion({
    question: streak.question,
    player: streak.player,
    header: `
      <div class="score-bar">
        <span class="score active">${esc(streak.player.name)} · level ${streak.player.level}</span>
        <span class="round-ind">Streak: <strong>${streak.count}</strong></span>
        <span></span>
      </div>`,
    badge: null,
    onSubmit: handleStreakAnswer,
  });
}

function handleStreakAnswer(rawInput, expired) {
  stopTimer();
  const parsed = expired ? null : parseAnswer(rawInput);
  const correct = parsed !== null && answersEqual(parsed, streak.question.answer);
  if (correct) {
    streak.count += 1;
    renderFeedback(
      { question: streak.question, correct, expired, speedBonus: 0, playerName: streak.player.name },
      nextStreakQuestion,
      '',
    );
  } else {
    const name = streak.player.name;
    const best = Math.max(stats.bestStreaks[name] || 0, streak.count);
    const isRecord = streak.count > 0 && streak.count >= (stats.bestStreaks[name] || 0);
    stats.bestStreaks[name] = best;
    save('stats', stats);
    renderFeedback(
      { question: streak.question, correct, expired, speedBonus: 0, playerName: name },
      () => {
        app.innerHTML = `
          <section class="card center">
            <h2 class="result-title">Streak over</h2>
            <div class="big-number">${streak.count}</div>
            <p>${isRecord ? '🎉 New personal best!' : `Best: ${best}`}</p>
            <div class="btn-col">
              <button class="btn primary" id="again">Go again</button>
              <button class="btn" id="home">Back to setup</button>
            </div>
          </section>`;
        const idx = settings.players.findIndex(p => p.name === name);
        app.querySelector('#again').addEventListener('click', () => startStreak(Math.max(0, idx)));
        app.querySelector('#home').addEventListener('click', renderHome);
      },
      '',
    );
  }
}

/* ---------------- Shared question + feedback screens ---------------- */

function renderQuestion({ question, player, header, badge, onSubmit }) {
  stopTimer();
  const total = timerSeconds(player.level);
  app.innerHTML = `
    ${header}
    <section class="card question-card">
      <div class="q-meta">
        <span class="chip">${CATEGORY_NAMES[question.category]}</span>
        ${badge ? `<span class="chip showdown">${badge}</span>` : ''}
      </div>
      ${player.timed ? `<div class="timer"><div class="timer-fill"></div></div>` : ''}
      <p class="prompt">${esc(question.prompt)}</p>
      <form id="answer-form" autocomplete="off">
        <input id="answer-input" type="text" inputmode="${question.answerFormat === 'fraction' ? 'text' : 'numeric'}"
          placeholder="${question.answerFormat === 'fraction' ? 'e.g. 5/36' : 'Your answer'}"
          autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="Your answer">
        ${question.answerFormat === 'fraction' ? '<p class="hint">Answer as a fraction</p>' : ''}
        <button class="btn primary" type="submit">Submit</button>
      </form>
    </section>
  `;
  const input = app.querySelector('#answer-input');
  input.focus();
  questionShownAt = performance.now();

  app.querySelector('#answer-form').addEventListener('submit', e => {
    e.preventDefault();
    if (!input.value.trim()) return;
    onSubmit(input.value, false);
  });

  if (player.timed) {
    const fill = app.querySelector('.timer-fill');
    fill.style.width = '100%';
    timerHandle = setInterval(() => {
      const elapsed = (performance.now() - questionShownAt) / 1000;
      const left = Math.max(0, total - elapsed);
      fill.style.width = `${(left / total) * 100}%`;
      if (left <= total / 4) fill.classList.add('low');
      if (left <= 0) onSubmit(null, true);
    }, 100);
  }
}

function renderFeedback(fb, onNext, header) {
  stopTimer();
  const { question, correct, expired, speedBonus } = fb;
  app.innerHTML = `
    ${header}
    <section class="card feedback-card ${correct ? 'good' : 'bad'}">
      <h2 class="fb-verdict">${correct ? '✓ Correct' : expired ? '⏱ Time’s up' : '✗ Not quite'}</h2>
      ${speedBonus ? '<p class="fb-bonus">⚡ Speed bonus +1</p>' : ''}
      <p class="fb-answer">Answer: <strong>${formatAnswer(question.answer)}</strong></p>
      <div class="fb-explain">
        <p class="fb-q">${esc(question.prompt)}</p>
        <p>${esc(question.explain)}</p>
      </div>
      <button class="btn primary" id="next">Next</button>
    </section>
  `;
  const btn = app.querySelector('#next');
  btn.focus();
  btn.addEventListener('click', onNext);
}

renderHome();
