// js#26's utilities with their TRUE types: generic over the item
// type T, with key types flowing through keyOf functions (ts#16's
// flow-through + ts#18's correlations). The bodies are UNCHANGED
// from the JS track — only knowledge was added.

export function unique<T>(items: readonly T[]): T[] {
  return [...new Set(items)];
}

export function sortBy<T, K extends string | number>(
  items: readonly T[],
  keyOf: (item: T) => K,
  { descending = false }: { descending?: boolean } = {},
): T[] {
  const order = descending ? -1 : 1;
  return [...items].sort((a, b) => {
    const ka = keyOf(a), kb = keyOf(b);
    return ka < kb ? -order : ka > kb ? order : 0;
  });
}

export function groupBy<T, K>(
  items: readonly T[],
  keyOf: (item: T) => K,
): Map<K, T[]> {
  const groups = new Map<K, T[]>();
  for (const item of items) {
    const key = keyOf(item);
    const group = groups.get(key);
    if (group) group.push(item);
    else groups.set(key, [item]);
  }
  return groups;
}

export function countBy<T, K>(items: readonly T[], keyOf: (item: T) => K): Map<K, number> {
  const counts = new Map<K, number>();
  for (const item of items) {
    const key = keyOf(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

export function chunk<T>(items: readonly T[], size: number): T[][] {
  if (!Number.isInteger(size) || size < 1) {
    throw new RangeError(`chunk size must be a positive integer, got ${size}`);
  }
  const chunks: T[][] = [];
  for (let start = 0; start < items.length; start += size) {
    chunks.push(items.slice(start, start + size));
  }
  return chunks;
}

// ==== usage: inference does everything =============================
interface Player { name: string; score: number }

const players: Player[] = [
  { name: 'ada', score: 120 },
  { name: 'bo', score: 95 },
];

export const sorted = sortBy(players, (p) => p.score); // p: Player, inferred
export const topName = sorted[0]!.name;                // string, real

export const byScore = groupBy(players, (p) => p.score); // Map<number, Player[]>

// ==== type tests: the original's downstream fictions, rejected ====
// @ts-expect-error — the sort-scrambling typo: 'scroe' not on Player
sortBy(players, (p) => p.scroe);

// @ts-expect-error — 'nmae' not on Player
export const fiction = sorted[0]!.nmae;

// @ts-expect-error — the Map's keys are numbers; string lookups can't compile
byScore.get('95');

// @ts-expect-error — objects aren't orderable sort keys (the < would lie)
sortBy(players, (p) => p);
