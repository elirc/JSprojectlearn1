// An analytics wrapper: events are namespaced strings like
// "cart:add" — enforced by convention, code review, and hope.

export function track(eventName: string, payload?: unknown): void {
  console.log(`[analytics] ${eventName}`, payload ?? '');
}

// The convention (from the team wiki): "<area>:<action>", where
// area is cart|checkout|profile and action is a short verb.
track('cart:add', { sku: 'A1' });        // follows the convention
track('checkout:complete');               // follows it
track('cartadd');                         // missing the colon — logged,
                                          // dropped by the dashboard's
                                          // parser, never seen again
track('Cart:Add');                        // wrong case — becomes a NEW
                                          // event in the dashboard,
                                          // splitting cart:add's numbers
track('profil:update');                   // typo'd area — a third
                                          // shadow-category of data

// CSS-flavored version of the same disease:
export function setSpacing(value: string): void {
  document.documentElement.style.setProperty('--spacing', value);
}

setSpacing('12px');   // fine
setSpacing('12 px');  // silently invalid CSS — property ignored
setSpacing('twelve'); // same

// `string` can't say "this shape of string". So every string with
// internal STRUCTURE — event names, CSS values, route paths, ids
// like 'user_123' — is checked by nothing until it breaks a
// dashboard three teams away.
