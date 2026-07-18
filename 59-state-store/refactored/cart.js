/**
 * The cart, rebuilt as a reducer: every business rule about carts
 * lives HERE, in one pure function, tested without a store or a UI.
 *
 * Immutability discipline: never state.x = ..., always build new
 * objects around unchanged pieces (project 26's no-mutation
 * contracts). Same references in = same data; new references = "this
 * part changed" — which is what makes cheap change-detection
 * possible downstream.
 */

export const initialCart = { items: [], coupon: null };

const VALID_COUPONS = { SAVE10: 0.9, SAVE25: 0.75 };

export function cartReducer(state = initialCart, action) {
  switch (action.type) {
    case 'item/added':
      return {
        ...state,
        items: [...state.items, { name: action.name, priceCents: action.priceCents }],
      };
    case 'item/removed':
      return {
        ...state,
        items: state.items.filter((i) => i.name !== action.name),
      };
    case 'coupon/applied':
      // THE rule about coupons, in exactly one place:
      return action.code in VALID_COUPONS
        ? { ...state, coupon: VALID_COUPONS[action.code] }
        : state;
    default:
      return state; // unknown actions change nothing (forward compat)
  }
}

/** Derived data is COMPUTED from state, never stored beside it. */
export function totalCents(state) {
  const subtotal = state.items.reduce((sum, i) => sum + i.priceCents, 0);
  return state.coupon ? Math.round(subtotal * state.coupon) : subtotal;
}
