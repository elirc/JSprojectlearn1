// The modern idiom: a const object + a derived literal union.
// Enum ergonomics (named constants, one source of truth), zero
// enum surprises (no emitted code, no numeric lies, readable wire
// format).

export const ORDER_STATUS = {
  Pending: 'pending',
  Paid: 'paid',
  Shipped: 'shipped',
  Delivered: 'delivered',
} as const;
// `as const` freezes the values as LITERAL types ('pending', not
// string) — project 31 is all about this.

// The union, DERIVED from the object (one source of truth):
//   'pending' | 'paid' | 'shipped' | 'delivered'
export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

export function isActionRequired(status: OrderStatus): boolean {
  // no falsy-zero trap: statuses are strings, comparisons are honest
  return status === ORDER_STATUS.Pending || status === ORDER_STATUS.Paid;
}

export function describe(status: OrderStatus): string {
  return `status: ${status}`; // "status: shipped" — logs you can read
}

// Wire format is the value itself: {"status": "shipped"} — readable,
// reorder-safe (no implicit numbering), and adding 'cancelled' is a
// new entry, not a data migration.

export const report = describe(ORDER_STATUS.Shipped);

// Values arrive from outside? Narrow with a guard (project 11):
const ALL_STATUSES = Object.values(ORDER_STATUS);
export function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === 'string' && (ALL_STATUSES as string[]).includes(value);
}

// ==== type tests ==================================================
// @ts-expect-error — arbitrary numbers can't impersonate a status
export const mystery: OrderStatus = 99;

// @ts-expect-error — nor can arbitrary strings
export const fake: OrderStatus = 'refunded';

// @ts-expect-error — raw literals must MATCH (typo protection)
export const typo: OrderStatus = 'shiped';
