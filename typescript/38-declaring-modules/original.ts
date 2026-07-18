// The team depends on "legacy-slugify" — an ancient, reliable,
// UNTYPED JS library (vendored below as ./vendor/legacy-slugify.js).
// TypeScript can't see into it, so the team reached for the usual
// hammers.

// Hammer 1: @ts-ignore the import (or on some setups the import
// errors outright with TS7016 "could not find a declaration file"):
// @ts-ignore
import slugifyIgnored from './vendor/legacy-slugify.js';

// Hammer 2: require-and-cast (defeats module resolution AND types):
// const slugify = require('legacy-slugify') as any;

// Either way the library's whole surface is any:
export const slug1 = slugifyIgnored('Hello World!');       // works: 'hello-world'
export const slug2 = slugifyIgnored('Hello', { sep: '_' }); // ...option is
// actually called `separator` — silently ignored, output uses '-'
export const slug3 = slugifyIgnored(42);                    // crashes at
// runtime (.toLowerCase on a number) — the lib's docs SAY strings
// only, but docs aren't types

export const upper = slug1.toUpperCase(); // slug1: any — the epidemic
// (ts#01) enters through the vendor door and spreads from here.

// The team's position: "the lib has no types, nothing we can do."
// Wrong — types don't have to come FROM the library. You can declare
// what you know about it, once, in a .d.ts file.
