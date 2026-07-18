// js#26's utility belt, ported to TS by someone in a hurry:
// every signature is any-flavored, so the utilities THEMSELVES are
// fine but everything typed downstream of them is fiction.

export function unique(items: any[]): any[] {
  return [...new Set(items)];
}

export function sortBy(items: any[], keyOf: (item: any) => any): any[] {
  return [...items].sort((a, b) => {
    const ka = keyOf(a), kb = keyOf(b);
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  });
}

export function groupBy(items: any[], keyOf: (item: any) => any): Map<any, any[]> {
  const groups = new Map<any, any[]>();
  for (const item of items) {
    const key = keyOf(item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }
  return groups;
}

interface Player { name: string; score: number }

const players: Player[] = [
  { name: 'ada', score: 120 },
  { name: 'bo', score: 95 },
];

// The damage is downstream:
const sorted = sortBy(players, (p) => p.scroe);
//                                       ^ typo. keyOf is (any)=>any,
// so p.scroe is fine; every comparison is undefined<undefined; the
// "sorted" array is in ARBITRARY order. Compiles.

export const topName: string = sorted[0].nmae;
// another typo, another any, another undefined-typed-as-string.

const byScore = groupBy(players, (p) => p.score);
export const group = byScore.get('95');
// keys are numbers, '95' is a string — Map<any,...> can't tell you
// you'll ALWAYS get undefined here. (js#26 chose Maps for exactly
// this key-type honesty; any threw it away.)
