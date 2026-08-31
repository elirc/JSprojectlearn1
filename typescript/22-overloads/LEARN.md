# 📘 Learning Guide: Overloads & Computed Returns

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What is this exercise about?

Some functions return *different types depending on what you pass in*. Two examples here:

- `makeElement('input')` should give you an input element (with `.value`), while `makeElement('canvas')` should give a canvas (with `.getContext`). Same function, different return types per tag.
- `getConfig(key, fallback)` can never return `undefined` when you give a fallback — but `getConfig(key)` alone can.

The original types each function with ONE vague signature that averages all the truths together, so every caller pays: either with casts ("actually, compiler, it's an input") or with `!` ("actually, compiler, it's not undefined"). The refactor shows the two proper tools: **overloads** (write each truth as its own signature) and **lookup-type generics** (one signature that *computes* the return from a table).

## 2. Concepts you need first

### The DOM, very briefly
The DOM is the browser's tree of page elements. `document.createElement('input')` makes an `<input>` element. In TypeScript, DOM elements have types: the general `HTMLElement`, and specific ones like `HTMLInputElement` (has `.value`) or `HTMLCanvasElement` (has `.getContext`). The specific types have properties the general one lacks:

```ts
declare const el: HTMLElement;
el.value = 'x'; // ❌ Error: 'value' does not exist on HTMLElement
```

### Type assertions (`as`) as a symptom
`x as HTMLInputElement` overrides the compiler's opinion. It always compiles, even when wrong — so every `as` at a call site is a small confession: "the signature didn't tell the truth precisely enough." (Exercise 14's LEARN.md covers `as` fully.)

### Non-null assertion (`!`) as the same symptom
`theme!.toUpperCase()` means "trust me, it's not undefined." When a signature says `string | undefined` but a call is *actually* always `string`, callers scatter `!` everywhere. (Exercise 05's LEARN.md.)

### Function overloads — several exact signatures, one body
In TypeScript you can stack multiple signatures above a single implementation. Callers see only the stacked list; the compiler picks the first that matches:

```ts
function len(x: string): number;          // overload 1
function len(x: unknown[]): number;       // overload 2
function len(x: string | unknown[]): number {  // implementation (hidden)
  return x.length;
}
len('hi');    // ✅ matches overload 1
len([1, 2]);  // ✅ matches overload 2
len(42);      // ❌ Error: no overload matches
```

Key rule: the **implementation signature is invisible to callers**. It only needs to be loose enough to cover all overloads. This is what makes the pattern workable — public precision, private plumbing.

### Literal types and generics that capture them
When you pass the string `'input'` to a generic parameter, TypeScript can remember it as the *literal type* `'input'`, not just `string`:

```ts
function echo<K extends string>(k: K): K { return k; }
const a = echo('input'); // a has type 'input', not string
```

That precision is what makes the next tool possible.

### Lookup types — computing the return from a table
If a type maps names to types, you can index it (exercise 18's LEARN.md). The DOM ships such a table, `HTMLElementTagNameMap`:

```ts
type X = HTMLElementTagNameMap['input'];  // HTMLInputElement
type Y = HTMLElementTagNameMap['canvas']; // HTMLCanvasElement
```

Combine: a generic `K extends keyof HTMLElementTagNameMap` captures the tag as a literal, and the return type `HTMLElementTagNameMap[K]` *computes* the right element type per call. One signature, all the truths.

### Union returns, and why they're a trap here
`function f(): A | B` forces EVERY caller to narrow, even those who called with arguments that guarantee `A`. The union moves the vagueness around instead of removing it.

## 3. Walking through the original code

```ts
export function makeElement(tag: string): HTMLElement {
  return document.createElement(tag);
}

const input = makeElement('input');
(input as HTMLInputElement).value = 'hello';
```

`makeElement('input')` really does build an `<input>` at runtime — but the signature says every result is a plain `HTMLElement`. So to touch `.value`, the caller must cast. Every call site repeats this confession, and nothing checks the cast is right: `(makeElement('div') as HTMLInputElement).value` would compile too, and break.

```ts
export function makeElement2(tag: string): HTMLInputElement | HTMLCanvasElement | HTMLElement {
  return document.createElement(tag) as any;
}
```

"Attempt 2 seen in the wild": return a union. Now it's *worse* — even `makeElement2('div')` callers must narrow a three-way union, and the body needed an `as any` just to compile. Vagueness got redistributed, not removed.

```ts
export function getConfig(key: string, fallback?: string): string | undefined {
  const store: Record<string, string> = { theme: 'dark' };
  return store[key] ?? fallback;
}
```

The non-DOM flavor of the same disease. `??` means "use the right side if the left is null/undefined." So *with* a fallback, the result can never be `undefined`. But the single signature covers both call shapes, so it must say `string | undefined` — too wide for half the calls:

```ts
const theme = getConfig('theme', 'light');
export const themeUpper = theme!.toUpperCase();
```

There's the `!`. The caller *knows* it's safe, the compiler doesn't, and the signature is the reason.

## 4. What's wrong with it (in beginner terms)

**Flaw 1: the vague return breeds unchecked casts.** Casts always compile — even wrong ones. **Runtime bug story:** a teammate copies the `(x as HTMLInputElement).value` line, changes the tag to `'span'`, forgets the cast. `(span as HTMLInputElement).value = 'hello'` compiles fine and silently does nothing useful; a later `.value` read gives `undefined` and a form submits empty. The cast didn't just fail to help — it actively signed off on a lie.

**Flaw 2: the union return punishes everyone.** Instead of the caller who wants `.value` narrowing once, EVERY caller — including plain `'div'` users — must narrow. And the union still doesn't tie the *input* to the *output*: it says "one of these three," never "input tag ⇒ input element."

**Flaw 3: `string | undefined` for a call that's never undefined.** Each `!` is a small bet with no compiler backing. One day someone changes the fallback logic, the bet goes bad, and `theme!.toUpperCase()` crashes with "Cannot read properties of undefined" — precisely the crash the type system was hired to prevent.

The common thread: the input→output relationship is *real*, the runtime honors it, but the signature can't *say* it. Whenever a signature is "sometimes too wide," every call site pays a tax of casts or `!`s.

## 5. Try it yourself first!

1. **Vague hint:** There are two different tools for "return type depends on the argument." One writes each case out; one computes the case. Try to fix `getConfig` with the first and `makeElement` with the second.
2. **`getConfig`, less vague:** It has exactly two truths: no fallback → `string | undefined`; fallback → `string`. Write those as two stacked signatures above the existing body.
3. **`getConfig`, specific:** The implementation signature (the one with the body) keeps `fallback?: string` and return `string | undefined`. Callers never see it — only the two overloads above it.
4. **`makeElement`, less vague:** TypeScript already ships a table from tag name to element type, called `HTMLElementTagNameMap`. You need a generic `K` constrained to its keys.
5. **`makeElement`, specific:** `function makeElement<K extends keyof HTMLElementTagNameMap>(tag: K): HTMLElementTagNameMap[K]`. Then delete every cast at the call sites and watch `.value` and `.getContext` just work.

## 6. Understanding the refactored solution

**Tool 1 — lookup-type generics for `makeElement`:**

```ts
export function makeElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
): HTMLElementTagNameMap[K] {
  return document.createElement(tag);
}
```

Call it with `'input'` and `K` becomes the literal type `'input'`; the return type is computed: `HTMLElementTagNameMap['input']` = `HTMLInputElement`. No cast, and `input.value = 'hello'` just compiles. Bonus: `makeElement('blink')` is now an error — `'blink'` isn't a key of the table, so unknown tags are caught for free (there's a type test for it).

When to prefer this tool: whenever a *table* of the input→output relationship exists or you can write one (the event map in exercise 20 was exactly such a table). N cases, one signature, zero repetition.

**Tool 2 — overloads for `getConfig`:**

```ts
export function getConfig(key: string): string | undefined;
export function getConfig(key: string, fallback: string): string;
export function getConfig(key: string, fallback?: string): string | undefined {
  const store: Record<string, string> = { theme: 'dark' };
  return store[key] ?? fallback;
}
```

Two public signatures — one per truth — and a private implementation signature underneath. Now:

```ts
export const theme = getConfig('theme', 'light'); // string — the ! is dead
export const maybe = getConfig('nope');           // string | undefined — honesty kept
```

Fallback'd calls get plain `string`; bare calls keep the honest `| undefined`, and a type test confirms careless use of a bare call still errors. Notice the order of virtues: precision where it's safe, *preserved* caution where it isn't. Overloads shine when the cases are few and structurally different (argument present vs. absent).

Choosing between the tools: relationship expressible as a type table → generic + lookup. A handful of structurally different cases → overloads. Both beat the vague single signature and the everyone-narrows union.

## 7. Words you learned (glossary)

- **DOM**: the browser's tree of page elements, with typed element classes.
- **`HTMLElement` / `HTMLInputElement` / `HTMLCanvasElement`**: general vs. specific element types; specific ones carry extra properties.
- **Type assertion (`as`)**: overriding the compiler's view — always compiles, even when wrong.
- **Non-null assertion (`!`)**: "trust me, not undefined" — unchecked.
- **Overload**: one of several exact public signatures stacked above a single implementation.
- **Implementation signature**: the signature on the function body; invisible to callers, may be looser.
- **Literal type**: a type that is one exact value, like `'input'`.
- **`keyof`**: the union of a type's keys (exercise 18).
- **Lookup type (`T[K]`)**: indexing a type by a key type to get the value type.
- **`HTMLElementTagNameMap`**: the DOM's built-in table mapping tag names to element types.
- **Computed return**: a return type that the compiler derives per call from the argument's type.
- **`??` (nullish coalescing)**: "use the right side if the left is null or undefined."
- **Union return**: returning `A | B` — forces every caller to narrow; usually a smell here.

## 8. Experiments to try on the plane (no internet needed)

Run `npm run typecheck` from the `typescript/` folder after each change; undo afterward.

1. In `refactored/overloads.ts`, hover-free test: write `const d = makeElement('div'); d.value = 'x';`. Expect: ❌ error — a `HTMLDivElement` has no `.value`. The computed return is *specific per tag*, not one-size-fits-all.
2. Swap the order of the two `getConfig` overloads. Expect: still compiles — but now try `const t = getConfig('theme', 'light'); const u: string = t;` and confirm it still picks the right one. Overload order matters when signatures overlap; these two don't (different parameter counts).
3. Delete the first overload (`(key: string): string | undefined`). Expect: the type test `getConfig('theme').toUpperCase()` now errors differently — the call itself fails ("expected 2 arguments"). Callers can only use signatures you published.
4. Change the implementation signature's return to just `string`. Expect: ❌ error — the body can return `undefined`, and the implementation signature must be honest with the *body* even though callers never see it.
5. Write your own mini-table version of `getConfig`: `type ConfigMap = { theme: string; retries: number }`, then `function get<K extends keyof ConfigMap>(key: K): ConfigMap[K]` (you can `declare` it without a body: `declare function get...`). Expect: `get('retries')` types as `number`, `get('nope')` errors. You just rebuilt tool 1 for config keys.
