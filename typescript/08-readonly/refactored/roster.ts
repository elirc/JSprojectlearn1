// readonly: js#26's "never mutate inputs" house rule, ENFORCED by
// the compiler instead of remembered by the team.

export interface Player {
  readonly name: string;
  readonly score: number;
}

const roster: Player[] = [
  { name: 'ada', score: 120 },
  { name: 'bo', score: 95 },
  { name: 'cy', score: 240 },
];

// The public view is readonly — callers can look, not touch:
export function getRoster(): readonly Player[] {
  return roster;
}

export function topScorers(players: readonly Player[]): Player[] {
  // readonly Player[] has NO .sort/.push/.splice — the mutating
  // methods simply don't exist on the type. Copy first (js#26):
  return [...players].sort((a, b) => b.score - a.score).slice(0, 2);
}

export function applyBonus(player: Player): Player {
  // fields are readonly, so "apply" MUST mean "return a new one":
  return { ...player, score: player.score + 50 };
}

export const top = topScorers(getRoster());     // roster untouched
export const bonused = applyBonus(top[0]!);      // top[0] untouched
export const joinOrder = getRoster().map((p) => p.name);
// ['ada', 'bo', 'cy'] — join order survives, provably.

// NOTE what readonly costs: nothing at runtime. It erases like all
// types — it's a compile-time contract only. (Deep freezing is
// Object.freeze, a different tool.) And readonly Player[] is shallow
// over the ARRAY — the Player fields needed their own readonly.

// ==== type tests: the original's mutations, now impossible ========
declare const view: readonly Player[];
declare const player: Player;

// @ts-expect-error — sort does not exist on readonly arrays
view.sort((a, b) => a.score - b.score);

// @ts-expect-error — neither does push
view.push({ name: 'dee', score: 0 });

// @ts-expect-error — score is readonly: the += 50 edit can't compile
player.score += 50;

// @ts-expect-error — readonly arrays don't sneak into mutable params
export const sneak: Player[] = view;
