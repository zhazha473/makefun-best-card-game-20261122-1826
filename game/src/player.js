// One cook's side of the table: hand, pot, Favour (life), Heat (energy) and Stars.
export const START_FAVOUR = 20;
export const START_HAND = 5;
export const HAND_LIMIT = 7;
export const HEAT_PER_TURN = 3;
export const POT_LIMIT = 3;
export const STARS_TO_WIN = 2;

export function createCook() {
  return {
    hand: [],
    pot: [],
    favour: START_FAVOUR,
    heat: HEAT_PER_TURN,
    shield: false,
    stars: 0,
  };
}

// A cook may hold at most HAND_LIMIT cards; extra draws are skipped, never lost to nowhere.
export function handHasRoom(cook) {
  return cook.hand.length < HAND_LIMIT;
}

export function findInHand(cook, cardId) {
  return cook.hand.find((card) => card.id === cardId) ?? null;
}

export function removeFromHand(cook, cardId) {
  const index = cook.hand.findIndex((card) => card.id === cardId);
  if (index === -1) return null;
  return cook.hand.splice(index, 1)[0];
}
