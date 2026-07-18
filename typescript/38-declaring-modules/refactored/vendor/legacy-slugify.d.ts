// The declaration file: types FOR the untyped library, written by US
// from its docs and behavior. Same name as the .js, extension .d.ts —
// TypeScript pairs them automatically.
//
// A .d.ts contains ONLY types (no runtime code): it's a claim about
// what the JS exports. Like a type guard's body (ts#11), its accuracy
// is on you — a wrong .d.ts is a cast wearing a lab coat. Keep it
// minimal and honest: declare what you USE, not everything that exists.

export interface SlugifyOptions {
  /** character used between words (default '-') */
  separator?: string;
}

/** Convert text to a URL-safe slug. Strings only — the lib crashes on numbers. */
export default function slugify(text: string, options?: SlugifyOptions): string;

/** Runtime check that a string is a well-formed slug. */
export function isSlug(value: unknown): value is string;
