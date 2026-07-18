// js#32 taught money-as-integer-cents. The team adopted it... and
// typed every amount `number`. The compiler can't tell cents from
// dollars from euros from a user id — they're all just number.

export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function applyDiscountCents(cents: number, percent: number): number {
  return cents - Math.round((cents * percent) / 100);
}

// A price from the DB (cents), a price from a form (dollars):
const priceCents = 1035;
const priceDollarsFromForm = 10.35;

// The bug js#32's DISCIPLINE prevented, which `number` re-enables:
export const label = formatCents(priceDollarsFromForm);
// "$0.10" — a $10.35 item priced at ten cents, because a dollars
// value walked into a cents slot. Both are `number`; the compiler
// waved it through.

// And units aren't the only confusion `number` invites:
export function refund(userId: number, amountCents: number): string {
  return `refunding ${formatCents(amountCents)} to user ${userId}`;
}

const userId = 7;
const amountCents = 1035;
export const receipt = refund(amountCents, userId);
//                             ^ ARGUMENTS SWAPPED. Refunding $0.07
// to user 1035. Compiles, of course — number, number.

// js#32 solved the ARITHMETIC problem (floats). The IDENTITY problem
// — this number is cents, that one is dollars, that one is an id —
// needs the type system... if only `number` could carry a label.
