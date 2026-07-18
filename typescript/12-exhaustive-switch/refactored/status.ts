// Exhaustiveness: make the COMPILER find every switch when the
// union grows. Two idioms — the never-check and the Record table —
// both turn "missing case" from a quiet bug into a build failure.

export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'shipped'
  | 'delivered'
  | 'refunded';

// Idiom 1: the assertNever sentinel.
// `never` is the type with NO values. If every case is handled,
// the value in `default` has type never and this call typechecks.
// Miss a case, and that case's type flows into `status` here —
// 'refunded' is not never -> compile error AT THE SWITCH.
function assertNever(value: never): never {
  throw new Error(`Unhandled case: ${JSON.stringify(value)}`);
}

export function statusLabel(status: OrderStatus): string {
  switch (status) {
    case 'pending':
      return '⏳ awaiting payment';
    case 'paid':
      return '💳 paid';
    case 'shipped':
      return '📦 on the way';
    case 'delivered':
      return '✅ delivered';
    case 'refunded':
      return '↩️ refunded'; // found by the compiler, not a customer
    default:
      return assertNever(status);
  }
}

// Idiom 2: the Record table (ts#06) — often even better, because
// there's no switch at all. Add a status to the union and this
// object LITERALLY won't compile until it has an entry:
const NEXT_ACTION: Record<OrderStatus, string> = {
  pending: 'send payment reminder',
  paid: 'ship it',
  shipped: 'track the parcel',
  delivered: 'ask for a review',
  refunded: 'close the ticket',
};

export function nextAction(status: OrderStatus): string {
  return NEXT_ACTION[status];
}

export const labels = (['paid', 'refunded'] as OrderStatus[]).map(statusLabel);
// ['💳 paid', '↩️ refunded'] — no unknowns

// ==== type tests ==================================================
// A miniature broken switch, proving the mechanism catches it:
type Coin = 'heads' | 'tails';
function brokenLabel(coin: Coin): string {
  switch (coin) {
    case 'heads':
      return 'H';
    default:
      // @ts-expect-error — 'tails' was not handled, so coin is not never
      return assertNever(coin);
  }
}
void brokenLabel;

// @ts-expect-error — the table must cover the whole union
export const incompleteTable: Record<OrderStatus, string> = { pending: 'x' };
