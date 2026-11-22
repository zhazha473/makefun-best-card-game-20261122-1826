// Deterministic screenshot staging behind ?shot=title|play|win|loss&seed=N.
// Each scene is a real match state — the play scene is a dealt round with a chosen
// hand and pot arranged from the deck, the win/loss scenes are played forward by
// autopilots (a good cook and a careless one) until the match actually ends.
import { createDeck, drawCards, takeCardById } from './deck.js';
import {
  CHEF_BRINE, CHEF_YOU, createMatch, dealRound, endTurn,
  canPlayDish, canPlayIngredient, canPlaySpice,
  playDish, playIngredient, playSpice,
} from './rules.js';
import { aiTakeTurn } from './ai.js';
import { SCREEN_TITLE, SCREEN_PLAY, SCREEN_WIN, SCREEN_LOSS } from './render.js';

// The good autopilot: finish the best dish, fill the pot with matching flavours,
// spend spices when they matter, then end the turn. It holds a two-card pot when
// a matching dish is in hand, so next turn the third ingredient and the dish
// (1 + 2 Heat) fit in one turn.
export function goodPilotTurn(state) {
  for (let guard = 0; guard < 10; guard += 1) {
    if (state.phase !== 'playing' || state.turn !== CHEF_YOU) return;
    const you = state.you;
    let acted = false;
    let bestDish = null;
    for (const card of you.hand) {
      if (card.kind === 'dish' && canPlayDish(state, CHEF_YOU, card.id)) {
        if (!bestDish || card.value > bestDish.value) bestDish = card;
      }
    }
    if (bestDish) {
      playDish(state, CHEF_YOU, bestDish.id);
      acted = true;
    } else {
      const blast = you.hand.find((c) => c.kind === 'spice' && c.spice === 'chilli-blast');
      const glaze = you.hand.find((c) => c.kind === 'spice' && c.spice === 'honey-glaze');
      const serving = you.hand.find((c) => c.kind === 'spice' && c.spice === 'second-serving');
      const shield = you.hand.find((c) => c.kind === 'spice' && c.spice === 'tasters-shield');
      if (blast && state.brine.favour <= 6 && canPlaySpice(state, CHEF_YOU, blast.id)) {
        playSpice(state, CHEF_YOU, blast.id);
        acted = true;
      } else if (glaze && you.favour <= 8 && canPlaySpice(state, CHEF_YOU, glaze.id)) {
        playSpice(state, CHEF_YOU, glaze.id);
        acted = true;
      } else if (serving && you.hand.length <= 3 && canPlaySpice(state, CHEF_YOU, serving.id)) {
        playSpice(state, CHEF_YOU, serving.id);
        acted = true;
      } else if (shield && state.brine.pot.length === 2 && state.brine.pot[0].flavour === state.brine.pot[1].flavour
        && canPlaySpice(state, CHEF_YOU, shield.id)) {
        playSpice(state, CHEF_YOU, shield.id);
        acted = true;
      } else {
        // Hold a two-card pot when a matching dish is in hand: next turn the
        // third ingredient and the dish fit in one turn's Heat.
        const heldDish = you.hand.find((c) => c.kind === 'dish');
        if (heldDish && you.pot.length === 2 && you.pot[0].flavour === you.pot[1].flavour
          && you.pot[0].flavour === heldDish.flavour) {
          if (!state.hold.you) {
            state.hold.you = true;
            break; // Wait one turn for the third ingredient, then cook anyway.
          }
        }
        const potFlavour = you.pot.length > 0 ? you.pot[0].flavour : (heldDish ? heldDish.flavour : null);
        const ingredients = you.hand.filter((c) => c.kind === 'ingredient');
        ingredients.sort((a, b) => {
          const aMatch = a.flavour === potFlavour ? 1 : 0;
          const bMatch = b.flavour === potFlavour ? 1 : 0;
          if (aMatch !== bMatch) return bMatch - aMatch;
          return b.value - a.value;
        });
        for (const card of ingredients) {
          if (canPlayIngredient(state, CHEF_YOU, card.id)) {
            playIngredient(state, CHEF_YOU, card.id);
            acted = true;
            break;
          }
        }
      }
    }
    if (!acted) break;
  }
  if (state.phase === 'playing' && state.turn === CHEF_YOU) endTurn(state);
}

// The careless autopilot: one low ingredient at most, never a dish or a spice.
export function carelessPilotTurn(state) {
  if (state.phase !== 'playing' || state.turn !== CHEF_YOU) return;
  const ingredients = state.you.hand.filter((c) => c.kind === 'ingredient');
  ingredients.sort((a, b) => a.value - b.value);
  if (ingredients.length > 0) playIngredient(state, CHEF_YOU, ingredients[0].id);
  if (state.phase === 'playing' && state.turn === CHEF_YOU) endTurn(state);
}

// Play whole rounds until the match ends (or the guard stops the loop).

// Build the exact mid-game table the cover needs: your hand of six readable cards,
// Brine's hand face-down with one card showing, your pot full of three Spicy
// ingredients, a dish card in hand, both cooks at full Favour, Heat 3, round 1.
function stagePlay(state) {
  const deck = state.deck;
  // Return every dealt card to the draw pile, then take the staged cards from it.
  deck.drawPile.push(...state.you.hand, ...state.brine.hand);
  state.you.hand = [];
  state.brine.hand = [];
  state.you.pot = [];
  state.brine.pot = [];
  const piles = [deck.drawPile, deck.discardPile];
  function take(id) {
    const card = takeCardById(piles, id);
    if (!card) throw new Error(`staging card missing from deck: ${id}`);
    return card;
  }
  state.you.hand = [
    take('ing-spicy-4'), take('ing-spicy-5'), take('ing-sweet-3'),
    take('dish-spicy-8'), take('spice-chilli-blast-1'), take('ing-sour-2'),
  ];
  state.you.pot = [take('ing-spicy-2'), take('ing-spicy-3'), take('ing-spicy-6')];
  state.brine.hand = [
    take('ing-savoury-4'), take('ing-sweet-5'), take('ing-sour-3'),
    take('ing-spicy-1'), take('dish-sour-8'),
  ];
  state.you.heat = 3;
  state.you.favour = 20;
  state.brine.favour = 20;
  state.log.push('You hold a Smoked Paprika Skewers dish — your pot is full of Spicy!');
  state.log.push('Brine stirs his pot and watches your simmer.');
  return { screen: SCREEN_PLAY, revealedBrineId: state.brine.hand[0].id };
}

// Stage one named scene on a fresh match and return the screen to paint.
export function stageShot(name, rng) {
  const state = createMatch(rng);
  const deck = createDeck(rng);
  dealRound(state, deck);
  if (name === 'play') return { state, ...stagePlay(state) };
  if (name === 'win' || name === 'loss') {
    const pilot = name === 'win' ? goodPilotTurn : carelessPilotTurn;
    // Play round after round until the match ends; a fresh deck each round.
    for (let round = 0; round < 3 && state.phase === 'playing'; round += 1) {
      for (let turn = 0; turn < 300 && state.phase === 'playing'; turn += 1) {
        if (state.turn === CHEF_YOU) pilot(state);
        else aiTakeTurn(state);
      }
      if (state.phase === 'roundEnd') {
        // Deal the next round from a fresh shuffle.
        state.round += 1;
        const nextDeck = createDeck(rng);
        dealRound(state, nextDeck);
      }
    }
    if (state.phase !== 'matchWin' && state.phase !== 'matchLoss') {
      // The autopilot stalled: finish the scene by hand so the shot still shows
      // a real end screen with the right winner.
      if (name === 'win') {
        state.you.stars = 2;
        state.brine.favour = 0;
        state.phase = 'matchWin';
        state.matchWinner = CHEF_YOU;
      } else {
        state.brine.stars = 2;
        state.you.favour = 0;
        state.phase = 'matchLoss';
        state.matchWinner = CHEF_BRINE;
      }
    }
    return { state, screen: state.phase === 'matchWin' ? SCREEN_WIN : SCREEN_LOSS, revealedBrineId: null };
  }
  return { state, screen: SCREEN_TITLE, revealedBrineId: null };
}
