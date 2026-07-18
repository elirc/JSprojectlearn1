// THE RULE: annotate the BOUNDARIES (function params, exported API,
// empty containers); let inference do the middles. TypeScript's
// inference is not a fallback — it's usually SMARTER than your
// annotation, because it can't go stale.

// Locals: no annotations. Hover any of these in an editor — the
// types are all there, inferred, exact:
const port = 3000;                 // number (in fact: 3000, see project 31)
const appName = 'shipit';
const isProd = false;
const retries = Number('3');       // number
const flags = ['a', 'b'].map((s) => s.toUpperCase()); // string[]
// (the callback's `s` is inferred from the array — no annotation)

const config = {
  url: 'https://api.example.com',
  timeout: 5000,
  // add a field: ONE edit. The type follows the value automatically.
};

// BOUNDARIES get annotated — parameters have no right-hand side to
// infer from, so this is where types are load-bearing:
export function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`;
}
// Return types on exported functions are a judgment call: annotating
// them (as here) turns "I accidentally changed my return type" into
// an error at the DEFINITION instead of confusing errors at call
// sites. For internal helpers, inferred returns are fine.

// The other place annotation is REQUIRED: empty containers, where
// there's nothing to infer from:
export const pendingJobs: string[] = []; // without this: never[]

// ==== type tests ==================================================
// @ts-expect-error — the original's crash, now caught: strings don't format
formatPrice('12');

export const summary = `${appName}:${port}:${isProd}:${retries}:${flags.join('')}:${config.url}`;
