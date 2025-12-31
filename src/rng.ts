export type SeedInput = string | number;

export interface Prng {
  next(): number;
  int(minInclusive: number, maxExclusive: number): number;
  choice<T>(items: readonly T[]): T;
  shuffle<T>(items: readonly T[]): T[];
}

export function hashSeed(seed: SeedInput): number {
  const str = typeof seed === "number" ? seed.toString(36) : String(seed);
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h ^= h >>> 13;
  h = Math.imul(h, 3266489909);
  h ^= h >>> 16;
  return h >>> 0;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createPrng(seed: SeedInput): Prng {
  const nextFloat = mulberry32(hashSeed(seed));

  const next = () => nextFloat();

  const int = (minInclusive: number, maxExclusive: number) => {
    if (!Number.isFinite(minInclusive) || !Number.isFinite(maxExclusive)) {
      throw new Error("Bounds must be finite numbers.");
    }
    if (maxExclusive <= minInclusive) {
      throw new Error("Upper bound must be greater than lower bound.");
    }
    const span = maxExclusive - minInclusive;
    return Math.floor(nextFloat() * span + minInclusive);
  };

  const choice = <T>(items: readonly T[]): T => {
    if (items.length === 0)
      throw new Error("Cannot choose from an empty array.");
    return items[int(0, items.length)]!;
  };

  const shuffle = <T>(items: readonly T[]): T[] => {
    const arr = [...items];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = int(0, i + 1);
      [arr[i], arr[j]] = [arr[j]!, arr[i]!];
    }
    return arr;
  };

  return { next, int, choice, shuffle };
}

export function combineSeeds(...seeds: SeedInput[]): number {
  let combined = 0x9e3779b1;
  for (const seed of seeds) {
    const h = hashSeed(seed);
    combined ^= h + 0x9e3779b9 + ((combined << 6) >>> 0) + (combined >>> 2);
    combined >>>= 0;
  }
  return combined >>> 0;
}
