// Loading a saved game from localStorage-shaped JSON. The type
// annotation on line one is a WISH; JSON.parse grants no wishes.

export interface SaveGame {
  playerName: string;
  level: number;
  inventory: string[];
}

export function loadGame(json: string): SaveGame {
  return JSON.parse(json);
  // JSON.parse returns `any` (the stdlib's original sin), and `any`
  // assigns to ANYTHING — so this compiles as a SaveGame no matter
  // what the string contains. The return annotation doesn't check;
  // it LAUNDERS. From here on, the whole program believes.
}

// The laundering in action:
export const looksFine = loadGame(
  '{"playerName":"Ada","level":"nine","inventory":"sword"}',
);
// level is the STRING "nine", inventory is a bare string — and
// looksFine is typed SaveGame. Every field is a lie with a type.

export function levelUpMessage(save: SaveGame): string {
  const next = save.level + 1;
  // "nine" + 1 = "nine1". Typed as number. Displayed to a player.
  return `${save.playerName} reached level ${next}! ` +
    `Carrying: ${save.inventory.join(', ')}`;
  // .join on the string "sword" -> TypeError, three functions away
  // from the parse that caused it.
}

// The type system did EXACTLY what it was told: trust JSON.parse.
// Types describe compile-time knowledge; JSON is a runtime visitor.
// Somebody has to actually look at it. (js#31 built the validator;
// this project connects it to the types.)
