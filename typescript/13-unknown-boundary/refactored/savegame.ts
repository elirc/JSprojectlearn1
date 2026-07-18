// The boundary pattern, complete: parse to `unknown`, VALIDATE with
// checks the compiler can see, and only then let the data wear the
// type. Runtime validation is what MAKES the compile-time type true.

export interface SaveGame {
  playerName: string;
  level: number;
  inventory: string[];
}

// Small composable checkers (js#31's rule functions, aimed at types):
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

export function isSaveGame(value: unknown): value is SaveGame {
  return (
    isRecord(value) &&
    typeof value.playerName === 'string' &&
    typeof value.level === 'number' &&
    Number.isInteger(value.level) &&
    isStringArray(value.inventory)
  );
}

/**
 * The safe loader. Note the honest signature: parsing CAN fail, so
 * the type says so (SaveGame | null — project 36 upgrades this to a
 * Result carrying the reason). No cast anywhere: the guard's checks
 * are what earn the type.
 */
export function loadGame(json: string): SaveGame | null {
  let data: unknown;
  try {
    data = JSON.parse(json) as unknown; // the ONE assertion: any -> unknown,
  } catch {                             // which REMOVES capability (always safe)
    return null; // malformed JSON
  }
  return isSaveGame(data) ? data : null; // wrong shape
}

export function levelUpMessage(save: SaveGame): string {
  // inside the boundary: plain, trusting code — the trust is EARNED
  return `${save.playerName} reached level ${save.level + 1}! ` +
    `Carrying: ${save.inventory.join(', ')}`;
}

// The original's poisoned payload, handled:
export const attempt = loadGame(
  '{"playerName":"Ada","level":"nine","inventory":"sword"}',
); // null — rejected at the door, not exploded in the living room

export const good = loadGame(
  '{"playerName":"Ada","level":9,"inventory":["sword","towel"]}',
); // SaveGame

export const message = good ? levelUpMessage(good) : 'no valid save';

// ==== type tests ==================================================
declare const parsed: unknown;

// @ts-expect-error — unknown grants no field access without a guard
export const sneak: string = parsed.playerName;

// @ts-expect-error — loadGame's result must be null-checked before use
export const careless: string = loadGame('{}').playerName;
