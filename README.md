# SIMMER — a street-food card duel

Two rival street-food cooks, one shared deck, one hot pot. Play ingredient cards
into your pot, finish dishes, and bring Chef Brine's Favour to zero — first to
2 Stars takes the Golden Ladle.

## How to play

- **Deck:** 44 cards shared by both cooks — 24 ingredients (4 flavours × values
  1–6), 12 dishes, 8 spices.
- **Flavours:** Sweet (honey drop, gold), Sour (citrus slice, green), Spicy
  (chilli, red), Savoury (mushroom, purple-brown) — told apart by colour *and*
  shape, never by text alone.
- **Turn:** draw 2 cards, gain 3 Heat. Ingredients cost 1 Heat, dishes 2 Heat,
  spices 1 Heat. Hand limit 7.
- **Pot:** play up to 3 ingredients into your pot. At the end of your turn a full
  pot simmers: 3 of one flavour, or a Fusion of 3 different flavours, deals
  damage equal to the sum of their values.
- **Dishes:** with 3 of one flavour in the pot, play a matching dish card for
  6–10 damage — and draw 1 card, because the crowd loves a finished dish.
- **Spices:** Chilli Blast (3 damage), Honey Glaze (+4 Favour), Second Serving
  (draw 2), Taster's Shield (block the next damage), Market Rush (+2 Heat).
- **Match:** best of 3 rounds. Favour 0 loses the round; first to 2 Stars wins.

Chef Brine plays by five readable rules: he finishes his best dish, shields when
you are about to simmer big, draws when his hand runs dry, fills his own pot,
and throws Chilli Blast when your Favour is low. Read him — and cook around him.

## Controls

- Mouse: click a card to select it, click again (or click your pot) to play it.
- Keyboard: `1–7` select a card, `Enter`/`Space` plays it, `E` ends your turn,
  `P`/`Esc` pauses, `H` shows how to play, `M` toggles sound, `R` starts a new match.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network request — static files under `game/`, all art drawn
procedurally on canvas, all sounds synthesised with WebAudio.

## Screenshots

`?shot=title|play|win|loss&seed=1` stages a deterministic scene for screenshots;
`play` shows the full table mid-game, `win` and `loss` are played forward by
autopilots until the match really ends.

## Hand in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```
