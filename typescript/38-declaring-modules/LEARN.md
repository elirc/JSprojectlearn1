# 📘 Learning Guide: Declaring Modules

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What is this exercise about?

Sooner or later you'll depend on a JavaScript library that ships **no types at all** — old, reliable, untyped. TypeScript can't see inside it, so importing it either errors ("could not find a declaration file") or gets silenced with `// @ts-ignore`, at which point the entire library becomes `any` and every value flowing out of it is unchecked.

This exercise's library is `legacy-slugify`, a tiny function that turns `'Hello World!'` into `'hello-world'` (a **slug** — a lowercase, hyphen-separated string safe to put in a URL). The team's position is "the lib has no types, nothing we can do." The refactor shows that position is the actual bug: **you can write the types yourself**, in a **declaration file** (`.d.ts`), once, and the untyped door closes.

## 2. Concepts you need first

### Modules and imports (quick refresher)
A **module** is a file that `export`s things; another file `import`s them:

```ts
// vendor/legacy-slugify.js
export default function slugify(text, options) { ... }
export function isSlug(value) { ... }

// your file
import slugify, { isSlug } from './vendor/legacy-slugify.js';
```

A **default export** is the module's main thing (imported without braces); **named exports** are imported with braces. "**Vendored**" means the library's source is copied into your repo (in a `vendor/` folder) instead of installed from a package manager.

### Why TypeScript can't type plain JS
The vendored file is `.js` with no type annotations. TypeScript sees parameters `text, options` and knows nothing about them. Importing an untyped module in strict mode produces error TS7016: *"Could not find a declaration file for module ..."*. The compiler is asking: "what are this thing's types?"

### `@ts-ignore` — the wrong hammer
`// @ts-ignore` suppresses whatever error the next line has. The import "works" — by making the imported value `any`:

```ts
// @ts-ignore
import slugify from './vendor/legacy-slugify.js';
slugify(42);            // compiles ✅ ... crashes at runtime 💥
slugify('x', { sep: '_' }); // compiles ✅ ... option silently ignored
```

`any` doesn't stay put: everything computed from an `any` is `any` too. One ignored import infects downstream code — exercise 01 calls this the epidemic.

### Declaration files (`.d.ts`)
A **declaration file** contains *only type information* — no runtime code. It describes what some JavaScript exports, without being that JavaScript:

```ts
// math-helpers.d.ts — types only, nothing runs
export function add(a: number, b: number): number;
```

Notice the signature ends in `;` — no body. That's a **declaration**: "this exists, and this is its type." All the types your editor shows for built-in JavaScript (`Array`, `Promise`) and for typed npm packages come from `.d.ts` files exactly like this.

### Automatic pairing by filename
Put `legacy-slugify.d.ts` next to `legacy-slugify.js` — same name, declaration extension — and TypeScript pairs them automatically: imports of the `.js` file get the `.d.ts`'s types. No config, no registration. (For libraries you *haven't* vendored, the same skill has a different address: `declare module 'package-name' { ... }` in any `.d.ts` of yours — the refactor's closing comment shows the shape. And for popular npm packages, someone may have already done the work: the community project DefinitelyTyped publishes types as `@types/<package>` packages you can install.)

### The honesty contract
Here is the crucial warning: **TypeScript believes your `.d.ts` without checking it.** It cannot verify your claims against the JS. If you declare `slugify(text: number)`, the compiler will happily enforce a lie. A wrong `.d.ts` is a cast wearing a lab coat — it has the *costume* of safety with none of the substance. Two disciplines follow:
1. **Declare only what you use.** Small claims are easy to audit against the library's docs and behavior.
2. **Encode the docs' constraints.** If the docs say "strings only," write `text: string` — now the compiler enforces what the README could only mention.

### Optional parameters and optional properties
`options?: SlugifyOptions` means the caller may omit the argument entirely. Inside an interface, `separator?: string` means the property may be absent. The `?` is how the declaration mirrors the JS's `(options && options.separator) || '-'` defaulting behavior.

### Declared type guards
A `.d.ts` can declare a guard signature: `export function isSlug(value: unknown): value is string;`. The *claim* "returns true only for well-formed slug strings" lives in the declaration; the *check* lives in the JS. Same trust rules as any guard (exercise 11): accuracy is on the author.

## 3. Walking through the original code

The vendored library itself (`vendor/legacy-slugify.js`) is fine — small, working, just untyped:

```js
export default function slugify(text, options) {
  const separator = (options && options.separator) || '-';
  return String(text).toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, separator)...
}
```

Note two facts for later: the option is called `separator`, and although `String(text)` coerces numbers without crashing *here*, the docs say strings only (in the exercise's story, the number call crashes — docs aren't types, and neither are lucky implementations).

The original's import:

```ts
// @ts-ignore
import slugifyIgnored from './vendor/legacy-slugify.js';
```

One comment, and the compiler stops asking questions. Everything about `slugifyIgnored` is now `any`.

The three casualties:

```ts
export const slug2 = slugifyIgnored('Hello', { sep: '_' }); // option is
// actually called `separator` — silently ignored, output uses '-'
export const slug3 = slugifyIgnored(42);                    // crashes at runtime
export const upper = slug1.toUpperCase(); // slug1: any — the epidemic spreads
```

A misnamed option, a wrong argument type, and an `any` return value flowing downstream. All three compile without a murmur.

## 4. What's wrong with it (in beginner terms)

**Flaw 1: the misnamed option fails *silently*.** Runtime story: you want underscores, so you pass `{ sep: '_' }`. The library only reads `options.separator`, finds nothing, defaults to `'-'`. Your URLs come out `hello-world` instead of `hello_world`. No crash, no warning — just quietly wrong output that someone notices in production URLs weeks later. With a typed options interface, `sep` would be flagged the moment you typed it.

**Flaw 2: the wrong argument type crashes at runtime.** The library's docs say strings only. Docs aren't enforced by anything. Someone passes a numeric id — `slugify(42)` — and gets a crash (or garbage) at runtime, in whatever code path first ran it. A one-line declaration (`text: string`) turns that into a red squiggle at the keyboard.

**Flaw 3: the epidemic.** `slug1` is `any`, so `slug1.toUpperCase()` is unchecked, and so is everything computed from *that*. Misspell it `toUperCase()` and the compiler shrugs. One `@ts-ignore` at the vendor door un-types a widening cone of your own, otherwise-careful code.

**Flaw 4 (the root): learned helplessness.** "The lib has no types, nothing we can do" treats types as something only library authors may produce. False — a `.d.ts` is *your knowledge of the library, written down*, and it takes twenty minutes.

## 5. Try it yourself first!

1. **Vague hint:** the library can't change (upstream is frozen). Where else could type information live?
2. **Warmer:** TypeScript pairs a `.js` file with a types-only file automatically, if you name it right. What filename, in what folder?
3. **Warmer still:** create `vendor/legacy-slugify.d.ts` (next to the `.js`). What does it need to declare? Look at what `slugs.ts` actually *uses*: the default export and `isSlug`. Nothing more.
4. **Specific:** declare an interface `SlugifyOptions` with an optional `separator?: string`; then `export default function slugify(text: string, options?: SlugifyOptions): string;` — signature only, semicolon, no body.
5. **Finish:** declare `export function isSlug(value: unknown): value is string;`. Then delete the `@ts-ignore` from the import and typecheck — the three original failures should all be compile errors now.

## 6. Understanding the refactored solution

The declaration file (`refactored/vendor/legacy-slugify.d.ts`):

```ts
export interface SlugifyOptions {
  /** character used between words (default '-') */
  separator?: string;
}

/** Convert text to a URL-safe slug. Strings only — the lib crashes on numbers. */
export default function slugify(text: string, options?: SlugifyOptions): string;

export function isSlug(value: unknown): value is string;
```

Every line is a *claim*, sourced from the library's docs and observed behavior. `separator?: string` names the real option — so `{ sep: '_' }` no longer typechecks. `text: string` encodes the docs' "strings only" rule — so `slugify(42)` no longer typechecks. The return `string` means the output is a real string — no epidemic. The `/** ... */` comments are **JSDoc**: editors show them in tooltips, so the declaration doubles as inline documentation.

The consumer (`refactored/slugs.ts`) is the payoff:

```ts
import slugify, { isSlug } from './vendor/legacy-slugify.js';

export const slug1 = slugify('Hello World!');                    // string, typed
export const slug2 = slugify('Hello World', { separator: '_' }); // real option name
export const upper = slug1.toUpperCase();                        // string — no any
```

No `@ts-ignore`, no casts. The import found the `.d.ts` sitting beside the `.js` and believed it. The library didn't change one byte — your *knowledge* of it got written down. The three `@ts-expect-error` type tests then pin each original failure as permanently uncompilable: the `sep` typo, the number argument, and assigning the return to a `number`.

The closing comment sketches the unvendored version: for npm packages, first check whether `@types/<pkg>` already exists; if not, `declare module 'pkg' { ... }` in your own `.d.ts` does the same job at a different address. Writing these is also exactly the skill used to contribute types upstream.

One more time, because it's the exercise's sharpest edge: the `.d.ts` is trusted, not verified. If the library's next version renames `separator`, your declaration is now wrong and the compiler will keep enforcing the stale claim. Keep declarations minimal, and treat them like guard bodies — code you personally vouch for.

## 7. Words you learned (glossary)

- **Module** — a file that exports values for others to import.
- **Default export / named export** — the main export (no braces) vs. braced, named ones.
- **Vendored** — a dependency copied into your repo (here, `vendor/`).
- **Slug** — a lowercase, hyphen-separated string safe for URLs.
- **Declaration file (`.d.ts`)** — a types-only file describing what some JS exports; contains no runtime code.
- **Declaration** — a signature ending in `;` with no body: "this exists, with this type."
- **TS7016** — the "could not find a declaration file" error for untyped imports.
- **`@ts-ignore`** — a comment suppressing the next line's error; here, the wrong hammer.
- **`any` epidemic** — un-typed values spreading unchecked through code computed from them.
- **Automatic pairing** — TypeScript matching `foo.d.ts` to `foo.js` by filename.
- **`declare module 'pkg'`** — the same skill for unvendored packages, written in your own `.d.ts`.
- **DefinitelyTyped / `@types/<pkg>`** — a community collection of ready-made declaration packages.
- **Optional parameter / property (`?`)** — may be omitted entirely.
- **Type guard declaration** — a declared `value is T` signature; the claim is in the `.d.ts`, the check in the JS.
- **JSDoc comment** — `/** ... */` documentation editors show in tooltips.
- **Honesty contract** — the `.d.ts` is trusted without verification; its accuracy is on you.

## 8. Experiments to try on the plane (no internet needed)

Run `npm run typecheck` from the `typescript/` folder after each change (then undo it).

1. **Feel the pairing.** Rename `refactored/vendor/legacy-slugify.d.ts` to `slugify-types.d.ts` (breaking the name match). Expected: ❌ the import in `slugs.ts` errors (no declaration file found) — pairing is by filename, nothing else. Rename it back.
2. **Tell a lie, watch it enforced.** In the `.d.ts`, change `text: string` to `text: number`. Expected: ❌ every existing *correct* call like `slugify('Hello World!')` now errors — proof the compiler enforces your claims, right or wrong. A `.d.ts` bug breaks consumers, not the library.
3. **Grow the declaration honestly.** Add a second option to `SlugifyOptions`: `maxLength?: number`. Expected: ✅ compiles — but pause: the JS ignores unknown options, so this claim is *false advertising*. This is why "declare what you use" beats "declare what you wish."
4. **Break a type test.** Remove the `// @ts-expect-error` above `slugify(42)` in `slugs.ts`. Expected: ❌ the call itself errors — the docs' strings-only rule is now compiler law.
5. **Use the declared guard.** In `slugs.ts`, add:
   `const mystery: unknown = 'hello-world'; if (isSlug(mystery)) { const n = mystery.length; }`
   Expected: ✅ compiles — inside the `if`, `mystery` narrowed from `unknown` to `string` purely on the strength of the declared `value is string`.
