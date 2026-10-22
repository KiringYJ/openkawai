/**
 * Small, seedable PRNG used for reproducible boards and tests.
 *
 * mulberry32 is not cryptographic. That is deliberate: game shuffles should be
 * cheap, deterministic when a seed is supplied, and easy to replay from an
 * investigation note.
 */
export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomSeed(): number {
  return (Date.now() ^ Math.floor(Math.random() * 0x100000000)) >>> 0;
}

export function shuffleInPlace<T>(items: T[], rng: Rng): T[] {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    const item = items[index];
    const other = items[swapIndex];
    if (item === undefined || other === undefined) {
      continue;
    }
    items[index] = other;
    items[swapIndex] = item;
  }
  return items;
}
