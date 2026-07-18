// js#40's order lifecycle, with a switch that renders each state.
// Then the business added a state — and the compiler said nothing.

export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'shipped'
  | 'delivered'
  | 'refunded'; // <- added last sprint

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
    default:
      return 'unknown status';
      // The default clause: the switch's "shouldn't happen" bucket
      // (ts#06 had one too). It compiles for ANY missing case —
      // which means it HIDES every missing case. 'refunded' orders
      // have shown "unknown status" to customers since last sprint,
      // and nothing — no error, no test, no squiggle — said so.
  }
}

export function nextAction(status: OrderStatus): string {
  // Same switch, different file in real life. Also missing
  // 'refunded'. Every switch over the union is a copy that must be
  // found BY A HUMAN when the union grows:
  switch (status) {
    case 'pending': return 'send payment reminder';
    case 'paid': return 'ship it';
    case 'shipped': return 'track the parcel';
    case 'delivered': return 'ask for a review';
    default: return '???';
  }
}

export const labels = (['paid', 'refunded'] as OrderStatus[]).map(statusLabel);
// ['💳 paid', 'unknown status'] — the second one is the quiet bug
