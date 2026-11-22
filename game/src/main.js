// SIMMER bootstrap and state machine: title, playing, round end, match win/loss,
// pause and how-to. Input arrives here, the rules decide, the renderer paints, and
// the HUD keeps the numbers. ?shot=title|play|win|loss&seed=N stages a screenshot
// scene instead of running the loop, then sets window.__shotReady.
import { createRandom } from './random.js';
import { createDeck } from './deck.js';
import {
  CHEF_BRINE, CHEF_YOU, createMatch, dealRound, nextRound,
  canPlayDish, canPlayIngredient, canPlaySpice,
  playDish, playIngredient, playSpice, endTurn,
} from './rules.js';
import { aiTakeTurn, aiIntentLine } from './ai.js';
import {
  createRenderer, layoutFor,
  SCREEN_TITLE, SCREEN_PLAY, SCREEN_ROUND_END, SCREEN_WIN, SCREEN_LOSS,
  SCREEN_PAUSED, SCREEN_HOWTO,
} from './render.js';
import { createHud } from './hud.js';
import {
  ACTION_CONFIRM, ACTION_END_TURN, ACTION_PAUSE, ACTION_HOWTO,
  ACTION_MUTE, ACTION_RESTART, createInput,
} from './input.js';
import { playSound, setMuted, isMuted, unlockAudio } from './audio.js';
import { stageShot } from './shots.js';

const BEST_KEY = 'simmer-matches-won';
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const renderer = createRenderer(canvas);
const hud = createHud(document);
const rng = createRandom(seed);

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off: the best score then lasts this visit only.
  }
}

// Confetti for the win screen: 120 coloured flakes that fall and spin.
function makeConfetti() {
  const colours = ['#f2b705', '#d64541', '#7fb069', '#ffd34d', '#fff8e6'];
  const flakes = [];
  for (let i = 0; i < 120; i += 1) {
    flakes.push({
      x: Math.random() * 1280,
      y: -20 - Math.random() * 300,
      vy: 1.2 + Math.random() * 2.2,
      rotation: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.1,
      colour: colours[i % colours.length],
    });
  }
  return flakes;
}

function updateConfetti(flakes) {
  for (const flake of flakes) {
    flake.y += flake.vy;
    flake.rotation += flake.vr;
    if (flake.y > 820) flake.y = -20;
  }
}

// --- Screenshot mode: stage, paint twice, signal readiness --------------------
if (shot) {
  const staged = stageShot(shot, rng);
  const state = staged.state;
  const playable = new Set();
  if (staged.screen === SCREEN_PLAY) {
    for (const card of state.you.hand) {
      if (card.kind === 'ingredient' && canPlayIngredient(state, CHEF_YOU, card.id)) playable.add(card.id);
      if (card.kind === 'dish' && canPlayDish(state, CHEF_YOU, card.id)) playable.add(card.id);
      if (card.kind === 'spice' && canPlaySpice(state, CHEF_YOU, card.id)) playable.add(card.id);
    }
  }
  const ui = {
    selectedId: null,
    playableIds: playable,
    revealedBrineId: staged.revealedBrineId,
    thinking: null,
    particles: staged.screen === SCREEN_WIN ? makeConfetti() : [],
    best: readBest(),
  };
  let painted = 0;
  function paint() {
    if (ui.particles.length > 0) updateConfetti(ui.particles);
    renderer.draw(state, staged.screen, ui, performance.now());
    hud.update(state);
    painted += 1;
    if (painted < 3) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
} else {
  runGame();
}

function runGame() {
  let state = createMatch(rng);
  let deck = createDeck(rng);
  dealRound(state, deck);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let selectedId = null;
  let revealedBrineId = null;
  let thinking = null;
  let aiTimer = null;
  let particles = [];
  let lastLayout = layoutFor(state);

  function playableIds() {
    const ids = new Set();
    if (screen !== SCREEN_PLAY || state.phase !== 'playing' || state.turn !== CHEF_YOU) return ids;
    for (const card of state.you.hand) {
      if (card.kind === 'ingredient' && canPlayIngredient(state, CHEF_YOU, card.id)) ids.add(card.id);
      if (card.kind === 'dish' && canPlayDish(state, CHEF_YOU, card.id)) ids.add(card.id);
      if (card.kind === 'spice' && canPlaySpice(state, CHEF_YOU, card.id)) ids.add(card.id);
    }
    return ids;
  }

  function refreshHud() {
    hud.update(state);
  }

  function startMatch() {
    state = createMatch(rng);
    deck = createDeck(rng);
    dealRound(state, deck);
    selectedId = null;
    thinking = null;
    particles = [];
    screen = SCREEN_PLAY;
    hud.announce('Playing. Your turn — play a card, then End Turn.');
    playSound('click');
  }

  function playSelected() {
    if (screen !== SCREEN_PLAY || state.phase !== 'playing' || state.turn !== CHEF_YOU) return;
    if (!selectedId) return;
    const card = state.you.hand.find((c) => c.id === selectedId);
    if (!card) {
      selectedId = null;
      return;
    }
    let result = { ok: false };
    if (card.kind === 'ingredient') result = playIngredient(state, CHEF_YOU, card.id);
    else if (card.kind === 'dish') result = playDish(state, CHEF_YOU, card.id);
    else result = playSpice(state, CHEF_YOU, card.id);
    if (result.ok) {
      playSound(result.sound);
      selectedId = null;
      afterPlayerAction();
    } else {
      hud.announce(`Cannot play ${card.name} right now.`);
    }
  }

  function afterPlayerAction() {
    refreshHud();
    if (state.phase === 'roundEnd') {
      screen = SCREEN_ROUND_END;
      return;
    }
    if (state.phase === 'matchWin') {
      screen = SCREEN_WIN;
      particles = makeConfetti();
      best += 1;
      saveBest(best);
      playSound('win');
      return;
    }
    if (state.phase === 'matchLoss') {
      screen = SCREEN_LOSS;
      playSound('lose');
    }
  }

  function endPlayerTurn() {
    if (screen !== SCREEN_PLAY || state.phase !== 'playing' || state.turn !== CHEF_YOU) return;
    selectedId = null;
    const result = endTurn(state);
    playSound('sizzle');
    if (result.next === CHEF_BRINE && state.phase === 'playing') {
      thinking = aiIntentLine(state);
      refreshHud();
      aiTimer = window.setTimeout(() => {
        thinking = null;
        const moves = aiTakeTurn(state);
        for (const move of moves) playSound(move.sound);
        if (state.phase === 'roundEnd') screen = SCREEN_ROUND_END;
        else if (state.phase === 'matchWin') {
          screen = SCREEN_WIN;
          particles = makeConfetti();
          best += 1;
          saveBest(best);
          playSound('win');
        } else if (state.phase === 'matchLoss') {
          screen = SCREEN_LOSS;
          playSound('lose');
        }
        refreshHud();
      }, 750);
    } else {
      afterPlayerAction();
    }
    refreshHud();
  }

  function continueFromRoundEnd() {
    if (state.phase === 'matchWin' || state.phase === 'matchLoss') return;
    if (nextRound(state, createDeck(rng))) {
      deck = state.deck;
      screen = SCREEN_PLAY;
      hud.announce(`Round ${state.round}. Your turn.`);
    }
    refreshHud();
  }

  function handleAction(action) {
    unlockAudio();
    if (action === ACTION_MUTE) {
      setMuted(!isMuted());
      hud.announce(isMuted() ? 'Sound off.' : 'Sound on.');
      return;
    }
    if (action === ACTION_RESTART) {
      if (aiTimer) window.clearTimeout(aiTimer);
      thinking = null;
      state = createMatch(rng);
      deck = createDeck(rng);
      dealRound(state, deck);
      screen = SCREEN_TITLE;
      selectedId = null;
      particles = [];
      refreshHud();
      return;
    }
    if (screen === SCREEN_TITLE) {
      if (action === ACTION_CONFIRM) startMatch();
      else if (action === ACTION_HOWTO) screen = SCREEN_HOWTO;
      return;
    }
    if (screen === SCREEN_HOWTO) {
      if (action === ACTION_CONFIRM || action === ACTION_HOWTO || action === ACTION_PAUSE) screen = SCREEN_TITLE;
      return;
    }
    if (screen === SCREEN_PAUSED) {
      if (action === ACTION_PAUSE || action === ACTION_CONFIRM) screen = SCREEN_PLAY;
      return;
    }
    if (screen === SCREEN_ROUND_END) {
      if (action === ACTION_CONFIRM) continueFromRoundEnd();
      return;
    }
    if (screen === SCREEN_WIN || screen === SCREEN_LOSS) {
      if (action === ACTION_CONFIRM) {
        screen = SCREEN_TITLE;
        state = createMatch(rng);
        deck = createDeck(rng);
        dealRound(state, deck);
        particles = [];
      }
      return;
    }
    // Playing screen.
    if (action === ACTION_PAUSE) {
      screen = SCREEN_PAUSED;
      hud.announce('Paused.');
    } else if (action === ACTION_HOWTO) {
      screen = SCREEN_HOWTO;
    } else if (action === ACTION_CONFIRM) {
      playSelected();
    } else if (action === ACTION_END_TURN) {
      endPlayerTurn();
    }
  }

  function handleClick(point) {
    unlockAudio();
    if (screen === SCREEN_TITLE) {
      // The title's "Click to cook" area, or anywhere on the title, starts the match.
      if (point.y > 500) startMatch();
      else if (point.y > 440) screen = SCREEN_HOWTO;
      else startMatch();
      return;
    }
    if (screen === SCREEN_HOWTO) {
      screen = SCREEN_TITLE;
      return;
    }
    if (screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      return;
    }
    if (screen === SCREEN_ROUND_END) {
      continueFromRoundEnd();
      return;
    }
    if (screen === SCREEN_WIN || screen === SCREEN_LOSS) {
      screen = SCREEN_TITLE;
      state = createMatch(rng);
      deck = createDeck(rng);
      dealRound(state, deck);
      particles = [];
      refreshHud();
      return;
    }
    if (screen !== SCREEN_PLAY || state.phase !== 'playing' || state.turn !== CHEF_YOU) return;
    // Hand cards: first click selects, second click on the same card plays it.
    for (const slot of lastLayout.hand) {
      if (point.x >= slot.x && point.x <= slot.x + slot.w && point.y >= slot.y - 26 && point.y <= slot.y + slot.h) {
        if (selectedId === slot.card.id) playSelected();
        else {
          selectedId = slot.card.id;
          playSound('click');
        }
        refreshHud();
        return;
      }
    }
    // Clicking your pot plays the selected ingredient into it.
    const pot = lastLayout.youPot;
    if (selectedId && point.x >= pot.x && point.x <= pot.x + pot.w && point.y >= pot.y && point.y <= pot.y + pot.h) {
      const card = state.you.hand.find((c) => c.id === selectedId);
      if (card && card.kind === 'ingredient') playSelected();
      return;
    }
    selectedId = null;
    refreshHud();
  }

  function handleSelect(index) {
    if (screen !== SCREEN_PLAY || state.turn !== CHEF_YOU) return;
    const card = state.you.hand[index];
    if (!card) return;
    selectedId = selectedId === card.id ? null : card.id;
    playSound('click');
    refreshHud();
  }

  const input = createInput(canvas, {
    onClick: handleClick,
    onSelect: handleSelect,
    onAction: handleAction,
  });
  void input;

  document.getElementById('end-turn').addEventListener('click', () => {
    unlockAudio();
    endPlayerTurn();
  });
  document.getElementById('how-to').addEventListener('click', () => {
    if (screen === SCREEN_PLAY) screen = SCREEN_HOWTO;
    else if (screen === SCREEN_HOWTO) screen = SCREEN_TITLE;
  });
  document.getElementById('mute').addEventListener('click', () => {
    setMuted(!isMuted());
    document.getElementById('mute').textContent = isMuted() ? 'Sound: off' : 'Sound: on';
  });
  document.getElementById('restart').addEventListener('click', () => handleAction(ACTION_RESTART));

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      hud.announce('Paused.');
    }
  });

  function frame(now) {
    requestAnimationFrame(frame);
    if (particles.length > 0) updateConfetti(particles);
    const ui = {
      selectedId,
      playableIds: playableIds(),
      revealedBrineId,
      thinking,
      particles,
      best,
    };
    const drawn = renderer.draw(state, screen, ui, now);
    lastLayout = drawn.layout;
    refreshHud();
  }

  hud.announce('SIMMER. Press Enter or click to cook.');
  requestAnimationFrame(frame);
}
