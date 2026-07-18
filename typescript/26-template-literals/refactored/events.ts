// Template literal types: string types with STRUCTURE. The wiki
// convention becomes a type; violations become squiggles.

// The pieces (plain unions, ts#06):
export type Area = 'cart' | 'checkout' | 'profile';

type CartAction = 'add' | 'remove' | 'clear';
type CheckoutAction = 'start' | 'complete';
type ProfileAction = 'update';

// The template: TypeScript EXPANDS `${A}:${B}` into the full cross
// product of literal combinations:
export type EventName =
  | `cart:${CartAction}`
  | `checkout:${CheckoutAction}`
  | `profile:${ProfileAction}`;
// 'cart:add' | 'cart:remove' | ... — six exact strings, derived.

export function track(eventName: EventName, payload?: unknown): void {
  console.log(`[analytics] ${eventName}`, payload ?? '');
}

track('cart:add', { sku: 'A1' });
track('checkout:complete');

// CSS-flavored: a number, a dot maybe, and a unit —
export type CssLength = `${number}px` | `${number}rem` | '0';

export function setSpacing(value: CssLength): void {
  console.log(`--spacing: ${value}`);
}

setSpacing('12px');
setSpacing('1.5rem'); // `${number}` matches decimals too
setSpacing('0');

// And the built-in string MANIPULATION types, for deriving names:
// 'click' -> 'onClick' (react#-style handler names):
export type HandlerName<E extends string> = `on${Capitalize<E>}`;
export type ClickHandler = HandlerName<'click'>; // 'onClick'

// ==== type tests: every convention violation, now rejected ========
// @ts-expect-error — missing colon (the dashboard-dropped event)
track('cartadd');

// @ts-expect-error — wrong case (the number-splitting shadow event)
track('Cart:Add');

// @ts-expect-error — typo'd area (the third shadow-category)
track('profil:update');

// @ts-expect-error — cross-product is exact: cart has no 'complete'
track('cart:complete');

// @ts-expect-error — wrong unit: 'vh' isn't in the CssLength union
setSpacing('12vh');

// @ts-expect-error — words aren't lengths
setSpacing('twelve');

// (honest quirk: '12 px' actually SLIPS THROUGH — TS's `${number}`
// matching tolerates the whitespace that Number() would trim. Type-
// level string checking is strong, not perfect; keep runtime
// validation at real boundaries — ts#13.)
export const quirk: CssLength = '12 px'; // compiles! the quirk, preserved as evidence
