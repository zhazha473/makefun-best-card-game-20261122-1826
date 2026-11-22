// Seeded random numbers for SIMMER, so a screenshot seed always stages the same table.
// A tiny mulberry32 generator: deterministic, fast, and good enough for shuffling a deck.
export function createRandom(seed) {
  let value = (seed >>> 0) || 0x9e3779b9;
  function next() {
    value = (value + 0x6d2b79f5) >>> 0;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  return {
    next,
    // Integer in [0, max).
    int(max) {
      return Math.floor(next() * max);
    },
    // Pick one element of a non-empty array.
    pick(list) {
      return list[Math.floor(next() * list.length)];
    },
    // Fisher-Yates shuffle that returns a new array and leaves the input alone.
    shuffle(list) {
      const out = list.slice();
      for (let i = out.length - 1; i > 0; i -= 1) {
        const j = Math.floor(next() * (i + 1));
        const tmp = out[i];
        out[i] = out[j];
        out[j] = tmp;
      }
      return out;
    },
  };
}
