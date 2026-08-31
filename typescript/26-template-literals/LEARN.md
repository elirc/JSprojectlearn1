# 📘 Learning Guide: Template Literal Types

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What is this exercise about?

Some strings have *structure*. An analytics event name like `"cart:add"` isn't just any string — it follows a pattern: an area, a colon, an action. A CSS length like `"12px"` is a number followed by a unit.

The original code types all of these as plain `string`. So `"cartadd"` (missing colon), `"Cart:Add"` (wrong case), and `"12 px"` (broken CSS) all compile — and each one breaks something far away, silently.

**Template literal types** let you write the string's *pattern* as a type: `` `${Area}:${Action}` ``. Then any string that doesn't match the pattern is a compile error. A naming convention that used to live on a wiki page becomes something the compiler enforces.

## 2. Concepts you need first

### 2.1 Literal types — a type that is one exact string

Recap from exercise 06 (see its LEARN.md for the full story): `'cart'` can be a *type*, and only the exact string `'cart'` fits it.

```ts
type Area = 'cart' | 'checkout' | 'profile';
const a: Area = 'cart';    // ✅ OK
const b: Area = 'basket';  // ❌ Error: not one of the three
```

### 2.2 Template literal *values* (the JavaScript feature)

In JavaScript, backtick strings interpolate values: `` `hello ${name}` ``. This is runtime string building. Keep it in mind, because TypeScript borrowed the syntax for types.

### 2.3 Template literal *types* (the star of this exercise)

Put the same backtick syntax in **type position**, and the `${...}` slots hold *types* instead of values:

```ts
type Greeting = `hello ${string}`;
const g1: Greeting = 'hello world'; // ✅ OK — matches the pattern
const g2: Greeting = 'goodbye';     // ❌ Error: doesn't start with 'hello '
```

`` `hello ${string}` `` means "any string that starts with `hello ` followed by anything."

### 2.4 The cross product — unions in slots multiply

When a slot holds a *union*, TypeScript expands the template into every combination:

```ts
type Size = 'small' | 'large';
type Color = 'red' | 'blue';
type Variant = `${Size}-${Color}`;
// 'small-red' | 'small-blue' | 'large-red' | 'large-blue'
const v: Variant = 'small-red';  // ✅ OK
const w: Variant = 'small-pink'; // ❌ Error
```

Two options times two options = four exact strings, all derived. You maintain the small pieces; the compiler maintains the combinations.

### 2.5 `${number}` — a shape slot for numerals

The slot can hold `number`, meaning "the text form of some number":

```ts
type Px = `${number}px`;
const a: Px = '12px';    // ✅ OK
const b: Px = '1.5px';   // ✅ OK — decimals count
const c: Px = 'twelvepx'; // ❌ Error: 'twelve' is not a number
```

### 2.6 The built-in string manipulation types

TypeScript ships four helpers that transform string *types*:

```ts
type A = Capitalize<'click'>;   // 'Click'
type B = Uppercase<'click'>;    // 'CLICK'
type C = Lowercase<'CLICK'>;    // 'click'
type D = Uncapitalize<'Click'>; // 'click'
```

Combined with templates, they derive names from names — the `'click'` → `'onClick'` convention many libraries use:

```ts
type HandlerName<E extends string> = `on${Capitalize<E>}`;
type H = HandlerName<'click'>; // 'onClick'
```

(`E extends string` is a generic constraint — exercise 17 — meaning "E must be some string type.")

### 2.7 Autocomplete as a feature

When a parameter's type is a finite union of literals, your editor lists all valid options as you type. A template literal type of six event names means typing `track('` shows those six. Types are documentation your editor reads back to you.

## 3. Walking through the original code

The tracker:

```ts
export function track(eventName: string, payload?: unknown): void {
  console.log(`[analytics] ${eventName}`, payload ?? '');
}
```

`eventName: string` — any string at all. The `?` on `payload` makes it optional; `unknown` is the "could be anything, check before using" type (exercise 13 covers it). The real convention — `"<area>:<action>"` — lives in a comment and on a wiki.

Then the three decay modes, each compiling happily:

```ts
track('cartadd');       // missing the colon
track('Cart:Add');      // wrong case
track('profil:update'); // typo'd area
```

Each is a valid `string`, so the compiler waves them through. The comments explain what actually happens downstream: the dashboard's parser drops the colon-less one, the wrong-case one becomes a *new* event splitting the real one's numbers, and the typo creates a third shadow category.

The CSS version of the same disease:

```ts
export function setSpacing(value: string): void {
  document.documentElement.style.setProperty('--spacing', value);
}
setSpacing('12 px');  // silently invalid CSS — property ignored
```

Browsers don't throw on bad CSS values; they ignore them. So `'12 px'` and `'twelve'` produce... nothing. No error, no spacing.

## 4. What's wrong with it (in beginner terms)

**Bug story — the split dashboard.** A teammate writes `track('Cart:Add')`. It compiles, ships, runs. For three months, half the add-to-cart events are logged under `Cart:Add` and half under `cart:add`. The analytics dashboard shows add-to-cart numbers mysteriously down 50%. Someone investigates for a day and finds... a capital letter. The compiler could have caught it in one second — if the type had said which strings are legal.

**Bug story — the invisible spacing.** `setSpacing('12 px')` runs without any error, but the browser silently rejects `12 px` (CSS forbids the space). The layout looks subtly wrong on one page. Nobody connects it to a string with a space in it.

The shared root cause: `string` can't say "this *shape* of string." So every structured string — event names, CSS values, route paths, ID formats like `user_123` — is checked by nothing until it breaks something far away.

## 5. Try it yourself first!

1. **Vague hint:** the wiki convention (`area:action`, specific areas, specific actions) can be written *as a type*. What TypeScript feature builds string types with slots?
2. **Warmer:** define small unions first — `Area`, and an action union per area. Then combine them with a template: `` `${...}:${...}` ``.
3. **Watch out:** if you write one template `` `${Area}:${AllActions}` `` you'll get the *full* cross product — including nonsense like `'cart:complete'` (a checkout action on cart). Can you pair each area with only *its* actions? Hint: a union of three templates.
4. **For the CSS one:** what patterns should be legal? A number followed by `px`, a number followed by `rem`, and plain `'0'`. Write that as a three-way union using `${number}`.

## 6. Understanding the refactored solution

The pieces, then the pattern:

```ts
export type Area = 'cart' | 'checkout' | 'profile';
type CartAction = 'add' | 'remove' | 'clear';
type CheckoutAction = 'start' | 'complete';
type ProfileAction = 'update';

export type EventName =
  | `cart:${CartAction}`
  | `checkout:${CheckoutAction}`
  | `profile:${ProfileAction}`;
```

Notice it's *three* templates, not one. This pairs each area with only its own actions — so `'cart:complete'` (valid area, valid action, wrong pairing) is rejected. TypeScript expands this into exactly six legal strings: `'cart:add' | 'cart:remove' | 'cart:clear' | 'checkout:start' | 'checkout:complete' | 'profile:update'`.

Now `track(eventName: EventName, ...)` rejects all three decay modes from the original, plus the wrong-pairing case. The wiki page became a type — and typing `track('` in an editor lists the six real events.

The CSS type:

```ts
export type CssLength = `${number}px` | `${number}rem` | '0';
```

`'12px'` ✅, `'1.5rem'` ✅ (decimals match `${number}`), `'0'` ✅, `'12vh'` ❌, `'twelve'` ❌.

And the honest quirk, preserved right in the file:

```ts
export const quirk: CssLength = '12 px'; // compiles!
```

TypeScript's `${number}` matching tolerates surrounding whitespace (mirroring how JavaScript's `Number()` would parse it), so `'12 px'` slips through. The lesson attached: type-level string checking is *strong, not perfect* — keep runtime validation at real boundaries (exercise 13's lesson). Good engineering means knowing your tool's edges.

Finally, the derivation helper:

```ts
export type HandlerName<E extends string> = `on${Capitalize<E>}`;
export type ClickHandler = HandlerName<'click'>; // 'onClick'
```

This is how libraries type `'click'` → `'onClick'` conventions without listing every pair by hand. Exercise 28 pushes further: `infer` will let you *parse* strings at the type level, not just build them.

## 7. Words you learned (glossary)

- **Template literal type** — a string type with a pattern, e.g. `` `${Area}:${Action}` ``.
- **Literal type** — a type that is one exact value, like `'cart'`.
- **Union type** — a type that is one of several options (`A | B`).
- **Cross product** — every combination of union members when a template has union slots.
- **`${number}`** — a template slot matching the string form of any number.
- **`Capitalize` / `Uppercase` / `Lowercase` / `Uncapitalize`** — built-in types that transform string types.
- **Generic constraint (`extends string`)** — restricting a type parameter to strings.
- **`unknown`** — the safe "anything" type: must be checked before use (exercise 13).
- **Optional parameter (`?`)** — a parameter callers may omit.
- **Convention** — a rule enforced only by agreement (wikis, code review) — until you make it a type.
- **Boundary validation** — checking data at runtime where it enters your program.

## 8. Experiments to try on the plane (no internet needed)

Run `npm run typecheck` from the `typescript/` folder after each change, then undo it.

1. In `refactored/events.ts`, add `'apply-coupon'` to `CartAction`. **Expected:** still compiles — and `track('cart:apply-coupon')` now works if you add a call. One union member, one new legal event; the template updated itself.
2. Collapse the three templates into one: `` type EventName = `${Area}:${CartAction | CheckoutAction | ProfileAction}` ``. **Expected:** the `'cart:complete'` type test errors with "Unused '@ts-expect-error'" — you just legalized the wrong pairing. That's why the refactor uses three templates.
3. Add `'0'`-like flexibility to CSS: change `CssLength` to add `` `${number}%` ``. Then `setSpacing('50%')` compiles. **Expected:** clean; the `'12vh'` test still fails as intended.
4. Hover over `EventName` in your editor (no typecheck needed). **Expected:** you'll see the expanded union of six exact strings — the cross product made visible.
5. Build a key format: `` type CacheKey = `user_${number}` ``, then `const k1: CacheKey = 'user_42';` and `const k2: CacheKey = 'user_abc';`. **Expected:** k1 ✅ OK, k2 ❌ Error. You've just typed an ID convention.
