// The import is now clean — no @ts-ignore, no casts. TypeScript
// found vendor/legacy-slugify.d.ts sitting next to the .js and
// believes it. The library didn't change; our KNOWLEDGE of it got
// written down.

import slugify, { isSlug } from './vendor/legacy-slugify.js';

export const slug1 = slugify('Hello World!');                    // string, typed
export const slug2 = slugify('Hello World', { separator: '_' }); // real option name
export const upper = slug1.toUpperCase();                        // string — no any epidemic

export const checked = isSlug(slug1); // the guard came typed, usable for narrowing

// ==== type tests: the original's silent failures, now loud ========
// @ts-expect-error — 'sep' is not an option; it's 'separator' (was silently ignored)
slugify('Hello', { sep: '_' });

// @ts-expect-error — strings only: the runtime crash is now a squiggle
slugify(42);

// @ts-expect-error — the return is a string, not any: no epidemic downstream
export const wrong: number = slugify('x');

// For UNVENDORED npm packages the mechanism is the same, one level up:
//   1. check for @types/<pkg> on DefinitelyTyped first;
//   2. else, a file in your project:
//        declare module 'legacy-slugify' {
//          export default function slugify(text: string, ...): string;
//        }
//   Same skill, different address.
