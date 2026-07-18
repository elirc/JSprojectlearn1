// js#26's mutating-sort bug — except now we have a type system that
// COULD have caught it, and the types said "mutate freely".

export interface Player {
  name: string;
  score: number;
}

// Module state: the canonical roster, insertion order = join order.
const roster: Player[] = [
  { name: 'ada', score: 120 },
  { name: 'bo', score: 95 },
  { name: 'cy', score: 240 },
];

export function getRoster(): Player[] {
  return roster; // hands out THE array — callers can rearrange our state
}

export function topScorers(players: Player[]): Player[] {
  return players.sort((a, b) => b.score - a.score).slice(0, 2);
  //             ^ sorts the CALLER'S array in place (js#26). The
  //               signature Player[] permits it — mutable is the default.
}

export function applyBonus(player: Player): Player {
  player.score += 50; // "apply" = quietly edit the caller's object
  return player;
}

// Watch the damage flow:
export const top = topScorers(getRoster());
// roster is now REORDERED by score — join order destroyed for
// everyone who reads it after this line.

export const bonused = applyBonus(getRoster()[0]!);
// ...and the (post-sort) first player just gained 50 points in the
// canonical roster. Every function that RETURNS something also
// EDITED something, and no signature warned anyone.

export const joinOrder = getRoster().map((p) => p.name);
// ['cy', 'ada', 'bo'] — supposed to be join order. It isn't anymore.
