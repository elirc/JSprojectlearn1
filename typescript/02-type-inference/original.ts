// A developer who just learned annotations... annotates EVERYTHING.
// Compiles fine. Reads like static from a broken radio.

const port: number = 3000;
const appName: string = 'shipit';
const isProd: boolean = false;

// annotating what the right side already says, times N:
const retries: number = Number('3');
const flags: string[] = ['a', 'b'].map((s: string): string => s.toUpperCase());

// worse than noise — the annotation can be WRONG in a way inference
// never is. This one says number[], hiding that parseInt of 'x'
// produces NaN... which IS a number, so fine, but this one:
const config: { url: string; timeout: number } = {
  url: 'https://api.example.com',
  timeout: 5000,
  // add a `retries` field here and you must edit TWO places —
  // annotation and value — for one fact.
};

// And the flip side: where annotations MATTER, they're missing.
// This exported function's parameter defaults to implicit any-shaped
// inference from usage... no wait, it can't: parameters have no
// right-hand side. Without an annotation, this is an ERROR under
// strict... so the author wrote the laziest type that compiles:
export function formatPrice(price: any): string {
  return `$${price.toFixed(2)}`;
  // formatPrice("12") compiles and crashes at runtime:
  // price.toFixed is not a function
}

export const summary: string = `${appName}:${port}:${isProd}:${retries}:${flags.join('')}:${config.url}`;
