// The shared deck: build, shuffle, draw and discard for SIMMER.
// Both cooks draw from the same 44-card deck, so counting what has gone matters.
import { buildDeckCards } from './cards.js';

export function createDeck(rng) {
  return {
    drawPile: rng.shuffle(buildDeckCards()),
    discardPile: [],
  };
}

// Draw up to `count` cards, reshuffling the discard pile when the draw pile runs dry.
export function drawCards(deck, rng, count) {
  const drawn = [];
  for (let i = 0; i < count; i += 1) {
    if (deck.drawPile.length === 0) {
      if (deck.discardPile.length === 0) break;
      deck.drawPile = rng.shuffle(deck.discardPile);
      deck.discardPile = [];
    }
    drawn.push(deck.drawPile.pop());
  }
  return drawn;
}

export function discardCard(deck, card) {
  deck.discardPile.push(card);
}

// Remove one card by id from wherever it sits (hand, pot or pile) and return it.
export function takeCardById(piles, id) {
  for (const pile of piles) {
    const index = pile.findIndex((card) => card.id === id);
    if (index !== -1) return pile.splice(index, 1)[0];
  }
  return null;
}

export function cardsLeft(deck) {
  return deck.drawPile.length + deck.discardPile.length;
}
