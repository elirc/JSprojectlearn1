// Two tools for "the return type depends on the arguments":
// overloads (several exact signatures) and lookup-type generics
// (one signature that computes). Know both; prefer the computed one
// when a table of the relationship exists.

// ==== Tool 1: the DOM already ships the table =====================
// HTMLElementTagNameMap maps 'input' -> HTMLInputElement etc.
// One generic signature reads the relationship out of it (ts#18):
export function makeElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
): HTMLElementTagNameMap[K] {
  return document.createElement(tag);
}

export const input = makeElement('input');   // HTMLInputElement
input.value = 'hello';                       // no cast

export const canvas = makeElement('canvas'); // HTMLCanvasElement
export const ctx = canvas.getContext('2d');  // knows it's a canvas

// ==== Tool 2: overloads, for when the cases are FEW and unlike ====
// The config getter has exactly two truths:
//   no fallback  -> string | undefined
//   fallback     -> string, guaranteed
// Write each truth as its own signature; implement once below:
export function getConfig(key: string): string | undefined;
export function getConfig(key: string, fallback: string): string;
export function getConfig(key: string, fallback?: string): string | undefined {
  const store: Record<string, string> = { theme: 'dark' };
  return store[key] ?? fallback;
}
// (Callers see ONLY the two overload signatures; the implementation
// signature is private plumbing and may be looser.)

export const theme = getConfig('theme', 'light'); // string — no ! needed
export const themeUpper = theme.toUpperCase();

export const maybe = getConfig('nope'); // string | undefined — honesty kept
export const shown = maybe ?? '(unset)';

// ==== type tests ==================================================
// @ts-expect-error — unknown tags are rejected (bonus of the map version)
makeElement('blink');

declare const el: HTMLElement;
// @ts-expect-error — plain HTMLElement still has no .value (the cast is dead)
el.value = 'x';

// @ts-expect-error — the no-fallback overload's result must be checked
export const careless: string = getConfig('theme').toUpperCase();
