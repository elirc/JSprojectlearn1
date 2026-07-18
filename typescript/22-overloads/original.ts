// A `createElement`-style helper: give it a tag, get the right kind
// of element... except the type says you always get the vague kind.

// One signature to rule them all:
export function makeElement(tag: string): HTMLElement {
  return document.createElement(tag);
}

const input = makeElement('input');
// input is HTMLElement — the compiler forgot it's an <input>.
// So the useful properties need... casts (ts#09's confession):
(input as HTMLInputElement).value = 'hello';

const canvas = makeElement('canvas');
const ctx = (canvas as HTMLCanvasElement).getContext('2d');
void ctx;

// Attempt 2 seen in the wild — the union return:
export function makeElement2(tag: string): HTMLInputElement | HTMLCanvasElement | HTMLElement {
  return document.createElement(tag) as any;
}
// worse: now EVERY caller must narrow, even makeElement2('div').

// Same problem, non-DOM flavor: a config getter where the RETURN
// TYPE depends on whether the caller passed a fallback:
export function getConfig(key: string, fallback?: string): string | undefined {
  const store: Record<string, string> = { theme: 'dark' };
  return store[key] ?? fallback;
}

const theme = getConfig('theme', 'light');
// theme: string | undefined — but with a fallback provided it can
// NEVER be undefined. The type is too vague for half the calls, so
// callers scatter `!` (ts#05) after every fallback'd call:
export const themeUpper = theme!.toUpperCase();

// One signature is describing SEVERAL truths badly. The relationship
// between input and output is real — the type just can't say it.
