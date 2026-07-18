// A "typed" order-processing module. It compiles under strict mode
// with zero errors. It is also wrong in four places. `any` doesn't
// just skip checking — it VACCINATES everything it touches against
// checking, and it spreads through assignments and returns.

// One `any` at the entry point...
function parseOrder(json: string): any {
  return JSON.parse(json);
}

// ...and everything downstream is unchecked, silently:
function orderTotal(order: any): number {
  // typo: 'quantety'. any[any] is any — no complaint:
  return order.items.reduce(
    (sum: number, item: any) => sum + item.price * item.quantety,
    0,
  );
}

function shippingLabel(order: any): string {
  // customer.adress (typo) — fine, says the compiler:
  return `${order.customer.name} — ${order.customer.adress}`;
}

const order = parseOrder(
  '{"items":[{"price":10,"quantity":3}],"customer":{"name":"Ada","address":"12 Row"}}',
);

// total is NaN (10 * undefined), the label says "Ada — undefined" —
// and TypeScript approved every line of it. Strict mode is ON.
export const total: number = orderTotal(order); // NaN, "typed" as number
export const label: string = shippingLabel(order);

// The epidemic part: `total` claims to be a number and is NaN;
// anything computed FROM it inherits the lie. any flows through the
// program the way the original NaN flows through arithmetic.
