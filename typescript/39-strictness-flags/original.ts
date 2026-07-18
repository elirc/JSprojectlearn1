// This file compiles CLEAN under our strict tsconfig — and contains
// four latent bugs that STRICTER flags would catch. "strict: true"
// is the floor, not the ceiling; each bug below names the flag that
// catches it. (See tsconfig.stricter.json in refactored/ — pointing
// it at this file produces four errors.)

// ---- Bug 1: noUncheckedIndexedAccess -----------------------------
const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri'];

export function weekdayName(index: number): string {
  return WEEKDAYS[index].toUpperCase();
  // WEEKDAYS[index] is typed `string` — but weekdayName(9) is
  // undefined at runtime: crash. Default indexing PRETENDS arrays
  // have no edges. noUncheckedIndexedAccess types it
  // `string | undefined` and demands the check (ts#05 for indexes).
}

// ---- Bug 2: exactOptionalPropertyTypes ----------------------------
interface Prefs {
  nickname?: string;
}

export function setNickname(prefs: Prefs, value: string | undefined): Prefs {
  return { ...prefs, nickname: value };
  // writes nickname: undefined EXPLICITLY — so 'nickname' in prefs
  // is true while prefs.nickname is undefined. js#25's missing-vs-
  // present-undefined distinction, silently blurred. The flag keeps
  // `?` (absent) and `| undefined` (present) as different claims.
}

// ---- Bug 3: noImplicitReturns -------------------------------------
export function gradeFor(score: number) {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  // forgot the else — gradeFor(50) returns undefined. With no return
  // annotation, strict quietly infers `string | undefined` and moves
  // on; every caller inherits the maybe. noImplicitReturns makes the
  // missing path itself the error, at the function, where the bug is.
}

// ---- Bug 4: noFallthroughCasesInSwitch ----------------------------
export function describeKey(key: string): string {
  let result = '';
  switch (key) {
    case 'Enter':
      result = 'submit';
    // no break — falls through: 'Enter' ALSO gets 'cancel'
    case 'Escape':
      result = 'cancel';
      break;
    default:
      result = 'other';
  }
  return result;
}

export const oops = describeKey('Enter'); // 'cancel'. Yes, really.
