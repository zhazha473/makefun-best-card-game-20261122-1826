// Every card in SIMMER's shared 44-card deck: 24 ingredients, 12 dishes, 8 spices.
// The four flavours are told apart by colour AND by a drawn shape, never by text alone:
// Sweet is a honey drop (gold), Sour a citrus slice (green), Spicy a chilli (red),
// Savoury a mushroom (brown-purple). No standard playing-card suits are used anywhere.
export const FLAVOURS = {
  sweet: { id: 'sweet', name: 'Sweet', colour: '#f2b705', dark: '#a67c00', light: '#ffe9a8', shape: 'drop' },
  sour: { id: 'sour', name: 'Sour', colour: '#7fb069', dark: '#3e6b2f', light: '#d9ecc9', shape: 'citrus' },
  spicy: { id: 'spicy', name: 'Spicy', colour: '#d64541', dark: '#8f1d1a', light: '#f6c9c7', shape: 'chilli' },
  savoury: { id: 'savoury', name: 'Savoury', colour: '#8d6e9e', dark: '#4c3a5e', light: '#ddd3e8', shape: 'mushroom' },
};

export const FLAVOUR_ORDER = ['sweet', 'sour', 'spicy', 'savoury'];

// One ingredient name per flavour per value, so every card reads as a real pantry item.
const INGREDIENT_NAMES = {
  sweet: ['Honey Drop', 'Sugar Plum', 'Maple Kiss', 'Caramel Pearl', 'Fig Jam', 'Golden Syrup'],
  sour: ['Lime Wedge', 'Green Mango', 'Tamarind Pop', 'Pickled Plum', 'Yuzu Zest', 'Sour Cherry'],
  spicy: ['Red Chilli', "Bird's Eye", 'Smoked Paprika', 'Szechuan Pop', 'Jalapeño Ring', 'Ghost Pepper'],
  savoury: ['Shiitake', 'Sea Salt', 'Truffle Shaving', 'Miso Paste', 'Roast Garlic', 'Umami Bomb'],
};

// 12 dishes: three per flavour, damage 6, 8 and 10. A dish only completes when the pot
// already holds three ingredients of its own flavour.
const DISHES = [
  { flavour: 'sweet', name: 'Maple Morning Porridge', damage: 6 },
  { flavour: 'sweet', name: 'Caramelised Fig Tart', damage: 8 },
  { flavour: 'sweet', name: 'Honey-Glazed Ember Ribs', damage: 10 },
  { flavour: 'sour', name: 'Yuzu Garden Salad', damage: 6 },
  { flavour: 'sour', name: 'Tamarind River Noodles', damage: 8 },
  { flavour: 'sour', name: 'Citrus Dawn Broth', damage: 10 },
  { flavour: 'spicy', name: 'Jalapeño Street Tacos', damage: 6 },
  { flavour: 'spicy', name: 'Smoked Paprika Skewers', damage: 8 },
  { flavour: 'spicy', name: 'Volcano Chilli Pot', damage: 10 },
  { flavour: 'savoury', name: 'Garlic Butter Mushrooms', damage: 6 },
  { flavour: 'savoury', name: 'Miso Midnight Ramen', damage: 8 },
  { flavour: 'savoury', name: 'Truffle Night Risotto', damage: 10 },
];

// 8 spice cards in 5 kinds. Spices are one-shot actions, played straight from the hand.
const SPICES = [
  { id: 'chilli-blast', name: 'Chilli Blast', count: 2, text: 'Deal 3 damage now.' },
  { id: 'honey-glaze', name: 'Honey Glaze', count: 2, text: 'Restore 4 Favour.' },
  { id: 'second-serving', name: 'Second Serving', count: 2, text: 'Draw 2 cards.' },
  { id: 'tasters-shield', name: "Taster's Shield", count: 1, text: 'Block the next damage.' },
  { id: 'market-rush', name: 'Market Rush', count: 1, text: '+2 Heat this turn.' },
];

export const HEAT_INGREDIENT = 1;
export const HEAT_DISH = 2;
export const HEAT_SPICE = 1;

// Build the full 44-card deck in a fixed order; callers shuffle it with a seeded RNG.
export function buildDeckCards() {
  const cards = [];
  for (const flavour of FLAVOUR_ORDER) {
    for (let value = 1; value <= 6; value += 1) {
      cards.push({
        id: `ing-${flavour}-${value}`,
        kind: 'ingredient',
        flavour,
        value,
        name: INGREDIENT_NAMES[flavour][value - 1],
        cost: HEAT_INGREDIENT,
        text: `Simmer in the pot.`,
      });
    }
  }
  for (const dish of DISHES) {
    cards.push({
      id: `dish-${dish.flavour}-${dish.damage}`,
      kind: 'dish',
      flavour: dish.flavour,
      value: dish.damage,
      name: dish.name,
      cost: HEAT_DISH,
      text: `Needs 3 ${FLAVOURS[dish.flavour].name} in the pot.`,
    });
  }
  for (const spice of SPICES) {
    for (let copy = 1; copy <= spice.count; copy += 1) {
      cards.push({
        id: `spice-${spice.id}-${copy}`,
        kind: 'spice',
        flavour: null,
        value: 0,
        name: spice.name,
        cost: HEAT_SPICE,
        text: spice.text,
        spice: spice.id,
      });
    }
  }
  return cards;
}

export function flavourOf(card) {
  return card.flavour ? FLAVOURS[card.flavour] : null;
}

// Short one-line summary of a card, used by the turn log and the how-to panel.
export function describeCard(card) {
  if (card.kind === 'ingredient') return `${card.name} (${FLAVOURS[card.flavour].name} ${card.value})`;
  if (card.kind === 'dish') return `${card.name} (${FLAVOURS[card.flavour].name} dish, ${card.value} damage)`;
  return `${card.name} — ${card.text}`;
}
