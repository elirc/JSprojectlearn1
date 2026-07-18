// The same module with real types. The two typos the compiler
// swallowed in the original are now compile errors — proven by the
// expect-error type tests at the bottom of this file.

export interface OrderItem {
  price: number;
  quantity: number;
}

export interface Customer {
  name: string;
  address: string;
}

export interface Order {
  items: OrderItem[];
  customer: Customer;
}

/**
 * The boundary: JSON.parse returns data we DON'T KNOW the shape of.
 * `unknown` is the honest type for that — unlike `any`, it infects
 * nothing, because you can't USE an unknown until you've checked it.
 * (Project 13 builds the full validator; a shape check does for now.)
 */
export function parseOrder(json: string): Order {
  const data: unknown = JSON.parse(json);
  if (!isOrder(data)) {
    throw new Error('Not a valid order'); // js#30: fail loudly at the edge
  }
  return data; // narrowing: inside this branch, data IS an Order
}

function isOrder(value: unknown): value is Order {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return Array.isArray(candidate.items) && typeof candidate.customer === 'object';
}

export function orderTotal(order: Order): number {
  return order.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  // note: sum and item needed NO annotations — reduce's types flow
  // from Order. Fix the boundary and inference does the middle.
}

export function shippingLabel(order: Order): string {
  return `${order.customer.name} — ${order.customer.address}`;
}

// ==== type tests: the ORIGINAL'S BUGS, now compile errors =========
declare const testOrder: Order;

// @ts-expect-error — 'quantety' does not exist on OrderItem (the NaN bug)
testOrder.items[0]!.quantety;

// @ts-expect-error — 'adress' does not exist on Customer (the label bug)
testOrder.customer.adress;

// unknown refuses to be used unchecked (any would have allowed this):
const data: unknown = JSON.parse('1');
// @ts-expect-error — operator '+' cannot be applied to 'unknown'
const sneaky: number = data + 1;
void sneaky;
