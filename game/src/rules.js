// The rules of SIMMER: turns, Heat, the simmering pot, dishes, spices, rounds and Stars.
// Every function here is pure table logic — it changes the match state and returns the
// events the UI should announce (log lines and sounds). The renderer never changes rules.
import { FLAVOURS } from './cards.js';
import { drawCards, discardCard } from './deck.js';
import {
  createCook, findInHand, removeFromHand, handHasRoom,
  START_FAVOUR, START_HAND, HEAT_PER_TURN, POT_LIMIT, STARS_TO_WIN,
} from './player.js';

export const CHEF_YOU = 'you';
export const CHEF_BRINE = 'brine';
export const CHEF_NAMES = { you: 'Chef Basil', brine: 'Chef Brine' };
export const DRAW_PER_TURN = 2;

export function createMatch(rng) {
  return {
    rng,
    deck: null,
    round: 1,
    turn: CHEF_YOU,
    phase: 'playing', // playing | roundEnd | matchWin | matchLoss
    roundWinner: null,
    matchWinner: null,
    you: createCook(),
    brine: createCook(),
    log: [],
    // One-turn "hold" flags: a cook who waits one turn for the third ingredient
    // of a dish must not wait forever — the flag is spent after a single hold.
    hold: { you: false, brine: false },
    stats: { dishesYou: 0, dishesBrine: 0, damageYou: 0, damageBrine: 0, turns: 0, fusions: 0 },
    lastSimmer: null,
  };
}

export function otherSide(side) {
  return side === CHEF_YOU ? CHEF_BRINE : CHEF_YOU;
}

function cookOf(state, side) {
  return side === CHEF_YOU ? state.you : state.brine;
}

function say(state, text) {
  state.log.push(text);
  if (state.log.length > 40) state.log.splice(0, state.log.length - 40);
}

// Deal a fresh round: Favour back to 20, a shuffled deck, five cards each, you to move.
// Stars carry over between rounds — the match is first to 2, not first to 1.
export function startRound(state) {
  const youStars = state.you.stars;
  const brineStars = state.brine.stars;
  state.you = createCook();
  state.brine = createCook();
  state.you.stars = youStars;
  state.brine.stars = brineStars;
  state.hold.you = false;
  state.hold.brine = false;
  state.turn = CHEF_YOU;
  state.phase = 'playing';
  state.roundWinner = null;
  state.lastSimmer = null;
  return state;
}

// startRound needs the deck module; kept here so the match owns its own shuffle.
export function dealRound(state, deck) {
  state.deck = deck;
  startRound(state);
  state.you.hand = drawCards(deck, state.rng, START_HAND);
  state.brine.hand = drawCards(deck, state.rng, START_HAND);
  state.you.heat = HEAT_PER_TURN;
  say(state, `Round ${state.round} — ${CHEF_NAMES.you} vs ${CHEF_NAMES.brine}. First to ${STARS_TO_WIN} Stars takes the Golden Ladle.`);
  return state;
}

function beginTurn(state, side) {
  const cook = cookOf(state, side);
  cook.heat = HEAT_PER_TURN;
  const drawn = [];
  for (let i = 0; i < DRAW_PER_TURN && handHasRoom(cook); i += 1) {
    drawn.push(...drawCards(state.deck, state.rng, 1));
  }
  if (drawn.length > 0) cook.hand.push(...drawn);
  state.stats.turns += 1;
  return drawn;
}

// --- Damage, shields and round ends ----------------------------------------

function applyDamage(state, targetSide, amount, source) {
  const target = cookOf(state, targetSide);
  if (amount <= 0) return { blocked: false, dealt: 0 };
  if (target.shield) {
    target.shield = false;
    say(state, `${CHEF_NAMES[targetSide]}'s Taster's Shield blocks ${amount} damage from ${source}!`);
    return { blocked: true, dealt: 0 };
  }
  target.favour = Math.max(0, target.favour - amount);
  if (targetSide === CHEF_YOU) state.stats.damageBrine += amount;
  else state.stats.damageYou += amount;
  say(state, `${source} deals ${amount} damage to ${CHEF_NAMES[targetSide]} (Favour ${target.favour}).`);
  if (target.favour <= 0) endRound(state, otherSide(targetSide));
  return { blocked: false, dealt: amount };
}

function endRound(state, winner) {
  if (state.phase !== 'playing') return;
  state.roundWinner = winner;
  state.phase = 'roundEnd';
  const cook = cookOf(state, winner);
  cook.stars += 1;
  say(state, `${CHEF_NAMES[winner]} takes round ${state.round}! Stars — Basil ${state.you.stars}, Brine ${state.brine.stars}.`);
  if (cook.stars >= STARS_TO_WIN) {
    state.phase = winner === CHEF_YOU ? 'matchWin' : 'matchLoss';
    state.matchWinner = winner;
  }
}

// --- Playing cards ------------------------------------------------------------

export function canPlayIngredient(state, side, cardId) {
  const cook = cookOf(state, side);
  const card = findInHand(cook, cardId);
  if (!card || card.kind !== 'ingredient') return false;
  return cook.heat >= 1 && cook.pot.length < POT_LIMIT;
}

export function playIngredient(state, side, cardId) {
  const cook = cookOf(state, side);
  if (!canPlayIngredient(state, side, cardId)) return { ok: false };
  const card = removeFromHand(cook, cardId);
  cook.heat -= 1;
  cook.pot.push(card);
  state.hold[side] = false; // The pot changed, so any earlier hold is spent.
  say(state, `${CHEF_NAMES[side]} adds ${card.name} (${FLAVOURS[card.flavour].name} ${card.value}) to the pot.`);
  return { ok: true, card, sound: 'place' };
}

function potFlavours(cook) {
  return cook.pot.map((card) => card.flavour);
}

export function potIsReady(cook) {
  return cook.pot.length === POT_LIMIT;
}

export function potIsSingleFlavour(cook) {
  if (cook.pot.length !== POT_LIMIT) return false;
  return cook.pot.every((card) => card.flavour === cook.pot[0].flavour);
}

export function potIsFusion(cook) {
  if (cook.pot.length !== POT_LIMIT) return false;
  return new Set(potFlavours(cook)).size === POT_LIMIT;
}

export function canPlayDish(state, side, cardId) {
  const cook = cookOf(state, side);
  const card = findInHand(cook, cardId);
  if (!card || card.kind !== 'dish') return false;
  if (cook.heat < 2) return false;
  if (!potIsSingleFlavour(cook)) return false;
  return cook.pot[0].flavour === card.flavour;
}

export function playDish(state, side, cardId) {
  const cook = cookOf(state, side);
  if (!canPlayDish(state, side, cardId)) return { ok: false };
  const card = removeFromHand(cook, cardId);
  cook.heat -= 2;
  const potCards = cook.pot.splice(0, cook.pot.length);
  state.hold[side] = false; // The pot is empty again, so any earlier hold is spent.
  for (const potCard of potCards) discardCard(state.deck, potCard);
  discardCard(state.deck, card);
  if (side === CHEF_YOU) state.stats.dishesYou += 1;
  else state.stats.dishesBrine += 1;
  say(state, `${CHEF_NAMES[side]} serves ${card.name}! The crowd roars — draw 1 card.`);
  const drawn = drawCards(state.deck, state.rng, 1);
  if (drawn.length > 0 && handHasRoom(cook)) cook.hand.push(...drawn);
  applyDamage(state, otherSide(side), card.value, card.name);
  return { ok: true, card, sound: 'dish' };
}

export function canPlaySpice(state, side, cardId) {
  const cook = cookOf(state, side);
  const card = findInHand(cook, cardId);
  if (!card || card.kind !== 'spice') return false;
  return cook.heat >= 1;
}

export function playSpice(state, side, cardId) {
  const cook = cookOf(state, side);
  if (!canPlaySpice(state, side, cardId)) return { ok: false };
  const card = removeFromHand(cook, cardId);
  cook.heat -= 1;
  discardCard(state.deck, card);
  const foe = otherSide(side);
  if (card.spice === 'chilli-blast') {
    applyDamage(state, foe, 3, 'Chilli Blast');
  } else if (card.spice === 'honey-glaze') {
    cook.favour = Math.min(START_FAVOUR, cook.favour + 4);
    say(state, `${CHEF_NAMES[side]} tastes Honey Glaze and recovers 4 Favour (now ${cook.favour}).`);
  } else if (card.spice === 'second-serving') {
    const drawn = [];
    for (let i = 0; i < 2 && handHasRoom(cook); i += 1) drawn.push(...drawCards(state.deck, state.rng, 1));
    if (drawn.length > 0) cook.hand.push(...drawn);
    say(state, `${CHEF_NAMES[side]} takes a Second Serving and draws ${drawn.length}.`);
  } else if (card.spice === 'tasters-shield') {
    cook.shield = true;
    say(state, `${CHEF_NAMES[side]} raises a Taster's Shield — the next damage is blocked.`);
  } else if (card.spice === 'market-rush') {
    cook.heat += 2;
    say(state, `${CHEF_NAMES[side]} dashes to the market: +2 Heat this turn.`);
  }
  return { ok: true, card, sound: 'spice' };
}

// --- Simmering and ending a turn ----------------------------------------------

// A full pot simmers when its cook ends the turn: three of one flavour simmer for
// the sum of their values; three different flavours fuse for the sum too, and the
// crowd loves a Fusion most of all. A pot of fewer than three cards keeps cooking.
export function simmerPot(state, side) {
  const cook = cookOf(state, side);
  if (cook.pot.length !== POT_LIMIT) return { ok: false };
  const sum = cook.pot.reduce((total, card) => total + card.value, 0);
  const fusion = potIsFusion(cook);
  const label = fusion ? 'Fusion' : 'Simmer';
  if (fusion) state.stats.fusions += 1;
  const potCards = cook.pot.splice(0, cook.pot.length);
  state.hold[side] = false; // The pot is empty again, so any earlier hold is spent.
  for (const potCard of potCards) discardCard(state.deck, potCard);
  state.lastSimmer = { side, label, amount: sum };
  say(state, `${CHEF_NAMES[side]}'s pot ${fusion ? 'FUSES' : 'simmers'} — ${sum} damage!`);
  applyDamage(state, otherSide(side), sum, `${label} pot`);
  return { ok: true, amount: sum, fusion, sound: 'sizzle' };
}

// End the current cook's turn: simmer their pot, then hand over to the other cook.
export function endTurn(state) {
  const side = state.turn;
  simmerPot(state, side);
  if (state.phase !== 'playing') return { ok: true, next: null };
  state.turn = otherSide(side);
  const drawn = beginTurn(state, state.turn);
  say(state, `${CHEF_NAMES[state.turn]} draws ${drawn.length} and gains ${HEAT_PER_TURN} Heat.`);
  return { ok: true, next: state.turn };
}

// Move to the next round after a round-end screen (or start round 1 of a new match).
export function nextRound(state, deck) {
  if (state.phase === 'matchWin' || state.phase === 'matchLoss') return false;
  state.round += 1;
  dealRound(state, deck);
  return true;
}

export function favourOf(state, side) {
  return cookOf(state, side).favour;
}
