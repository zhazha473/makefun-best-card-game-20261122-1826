// Chef Brine, the AI rival: five readable rules, applied in order every turn, so a
// player can learn to read him and play around him — never a hidden random choice.
//  1. Finish a dish when the pot is ready and the dish in hand pays the most.
//  2. Raise a Taster's Shield when you are one ingredient from a big simmer.
//  3. Take a Second Serving when his hand is nearly empty.
//  4. Fill his own pot with ingredients while Heat lasts.
//  5. Throw a Chilli Blast when your Favour is low enough to finish you.
import { FLAVOURS } from './cards.js';
import {
  CHEF_BRINE, CHEF_YOU, canPlayDish, canPlayIngredient, canPlaySpice,
  playDish, playIngredient, playSpice, endTurn,
} from './rules.js';

function bestDishInHand(state) {
  const brine = state.brine;
  let best = null;
  for (const card of brine.hand) {
    if (card.kind === 'dish' && canPlayDish(state, CHEF_BRINE, card.id)) {
      if (!best || card.value > best.value) best = card;
    }
  }
  return best;
}

function spiceInHand(state, spiceId) {
  return state.brine.hand.find((card) => card.kind === 'spice' && card.spice === spiceId) ?? null;
}

// One AI move: the single best action right now, or null when Brine is done.
function nextAiMove(state) {
  const brine = state.brine;
  const you = state.you;

  const dish = bestDishInHand(state);
  if (dish) return { action: 'dish', card: dish };

  const shield = spiceInHand(state, 'tasters-shield');
  if (shield && you.pot.length === 2 && you.pot[0].flavour === you.pot[1].flavour
    && canPlaySpice(state, CHEF_BRINE, shield.id)) {
    // You are two of one flavour into your pot; a third simmers hard. Block it.
    return { action: 'spice', card: shield };
  }

  const serving = spiceInHand(state, 'second-serving');
  if (serving && brine.hand.length <= 2 && canPlaySpice(state, CHEF_BRINE, serving.id)) {
    return { action: 'spice', card: serving };
  }

  const blast = spiceInHand(state, 'chilli-blast');
  if (blast && you.favour <= 6 && canPlaySpice(state, CHEF_BRINE, blast.id)) {
    return { action: 'spice', card: blast };
  }

  const glaze = spiceInHand(state, 'honey-glaze');
  if (glaze && brine.favour <= 8 && canPlaySpice(state, CHEF_BRINE, glaze.id)) {
    return { action: 'spice', card: glaze };
  }

  const rush = spiceInHand(state, 'market-rush');
  if (rush && brine.hand.some((card) => card.kind === 'ingredient') && brine.heat <= 1 && canPlaySpice(state, CHEF_BRINE, rush.id)) {
    return { action: 'spice', card: rush };
  }

  // Fill the pot: prefer the flavour already cooking, then the highest value.
  // Hold a two-card pot when a matching dish is in hand, so next turn the
  // third ingredient and the dish (1 + 2 Heat) fit in one turn.
  const heldDish = brine.hand.find((card) => card.kind === 'dish');
  if (heldDish && brine.pot.length === 2 && brine.pot[0].flavour === brine.pot[1].flavour
    && brine.pot[0].flavour === heldDish.flavour) {
    if (!state.hold.brine) {
      state.hold.brine = true;
      return null; // Wait one turn for the third ingredient, then cook anyway.
    }
  }
  if (brine.pot.length < 3 && brine.heat >= 1) {
    const potFlavour = brine.pot.length > 0 ? brine.pot[0].flavour : (heldDish ? heldDish.flavour : null);
    const candidates = brine.hand.filter((card) => card.kind === 'ingredient');
    candidates.sort((a, b) => {
      const aMatch = a.flavour === potFlavour ? 1 : 0;
      const bMatch = b.flavour === potFlavour ? 1 : 0;
      if (aMatch !== bMatch) return bMatch - aMatch;
      return b.value - a.value;
    });
    for (const card of candidates) {
      if (canPlayIngredient(state, CHEF_BRINE, card.id)) return { action: 'ingredient', card };
    }
  }

  return null;
}

// Play Brine's whole turn at once (the UI replays the returned moves with pauses).
// Returns the list of moves made, in order, so the log reads like a real opponent.
export function aiTakeTurn(state) {
  const moves = [];
  for (let guard = 0; guard < 12; guard += 1) {
    if (state.phase !== 'playing' || state.turn !== CHEF_BRINE) break;
    const move = nextAiMove(state);
    if (!move) break;
    let result = { ok: false };
    if (move.action === 'dish') result = playDish(state, CHEF_BRINE, move.card.id);
    else if (move.action === 'spice') result = playSpice(state, CHEF_BRINE, move.card.id);
    else result = playIngredient(state, CHEF_BRINE, move.card.id);
    if (!result.ok) break;
    moves.push({ action: move.action, card: move.card, sound: result.sound });
    if (state.phase !== 'playing') break;
  }
  if (state.phase === 'playing' && state.turn === CHEF_BRINE) {
    state.log.push('Brine ends his turn.');
    endTurn(state);
  }
  return moves;
}

// A one-line read of what Brine is about to do, shown while he "thinks".
export function aiIntentLine(state) {
  const move = nextAiMove(state);
  if (!move) return 'Brine is thinking…';
  if (move.action === 'dish') return `Brine eyes his ${FLAVOURS[move.card.flavour].name} dish…`;
  if (move.action === 'spice') return `Brine reaches for ${move.card.name}…`;
  return `Brine stirs his ${FLAVOURS[move.card.flavour].name} pot…`;
}
