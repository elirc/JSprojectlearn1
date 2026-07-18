// Branded types: a compile-time label glued onto a primitive.
// `Cents` IS a number at runtime (zero cost, erases completely) but
// the compiler treats it as its own species — dollars, ids, and
// naked numbers can't impersonate it.

// The brand: intersect the primitive with a phantom marker property.
// No value ever HAS __brand — it exists only in the type.
export type Cents = number & { readonly __brand: 'cents' };
export type Dollars = number & { readonly __brand: 'dollars' };
export type UserId = number & { readonly __brand: 'userId' };

// Constructors are the ONLY doors (js#29's encapsulation, for
// primitives). Each is one honest cast, sealed with validation:
export function cents(value: number): Cents {
  if (!Number.isInteger(value)) {
    throw new RangeError(`cents must be integers, got ${value}`); // js#32!
  }
  return value as Cents;
}

export function dollars(value: number): Dollars {
  return value as Dollars;
}

export function userId(value: number): UserId {
  return value as UserId;
}

// Unit CONVERSION is explicit — the only path from dollars to cents:
export function dollarsToCents(amount: Dollars): Cents {
  return cents(Math.round((amount as number) * 100));
}

// ---- the js#32 API, branded ----
export function formatCents(amount: Cents): string {
  return `$${(amount / 100).toFixed(2)}`; // brands ARE numbers: math just works
}

export function refund(user: UserId, amount: Cents): string {
  return `refunding ${formatCents(amount)} to user ${user}`;
}

// ---- usage ----
const price = cents(1035);
const formPrice = dollars(10.35);
const ada = userId(7);

export const label = formatCents(dollarsToCents(formPrice)); // "$10.35" — via the door
export const receipt = refund(ada, price);

// ==== type tests: both original bugs, now impossible ==============
// @ts-expect-error — dollars can't walk into a cents slot (the $0.10 bug)
formatCents(formPrice);

// @ts-expect-error — naked numbers can't either; go through cents()
formatCents(1035);

// @ts-expect-error — the swapped arguments: an amount is not a UserId
export const swapped = refund(price, ada);

// (and fractional cents are stopped at RUNTIME by the constructor —
// cents(10.35) throws. Division of labor: the BRAND handles identity
// at compile time; the DOOR handles validity at runtime. ts#13's
// boundary pattern, applied to a single number.)
