# 📘 Learning Guide: keyof & Indexed Access

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What is this exercise about?

A settings panel reads and writes fields of a user profile *by name*: `getSetting('fontSize')`, `setSetting('darkMode', false)`. This dynamic, key-based access is a completely legitimate pattern — settings panels, form builders, and table column pickers all need it.

The type-level problem: the profile has three fields with three *different* value types (`string`, `number`, `boolean`). When the key arrives as a plain `string`, the compiler knows neither which keys are real nor which value type goes with which key. The original papers over that with `any`. The refactor teaches the two operators that type this pattern properly: `keyof` and indexed access (`T[K]`).

## 2. Concepts you need first

### Bracket access by variable (JavaScript refresher)

`obj.name` and `obj['name']` are the same read. The bracket form accepts a *variable*: `obj[key]` — which key gets read is decided at runtime. Writes work too: `obj[key] = value`. And a quirk that matters here: assigning to a key that doesn't exist **creates** it. `obj['darkMod'] = true` doesn't fail; it silently adds a new `darkMod` property.

### Why `key: string` is too loose

If `key` is typed `string`, the compiler must assume ANY string. It can't approve `profile[key]` (which property? what type comes back?), so the original forces it with `as any` — and from there, every access is unchecked. Typos, wrong value types, phantom fields: all compile.

### `keyof` — an interface's keys, as a type

`keyof T` produces a union of T's property names, as string literal types:

```ts
interface Profile { username: string; fontSize: number; darkMode: boolean }
type ProfileKey = keyof Profile;
// = 'username' | 'fontSize' | 'darkMode'

let k: ProfileKey = 'fontSize';   // ✅ OK
k = 'usrname';                    // ❌ Error: not a key of Profile
```

The type IS the list of valid names. Change the interface, and the union updates itself — no list to maintain by hand.

### Indexed access types — `T[K]` means "the type AT that key"

You can index into a *type* the way you index into an object:

```ts
type A = Profile['fontSize'];   // number
type B = Profile['darkMode'];   // boolean
type C = Profile['username' | 'darkMode'];   // string | boolean
```

Read `Profile['fontSize']` as "the type of the `fontSize` property of `Profile`." This happens entirely at compile time — it's type arithmetic, not a runtime lookup.

### The correlated pair: `K extends keyof T` + `T[K]`

Constraints (`extends`) were exercise 17; here's their signature use. Make the key a *type parameter* constrained to the real keys, and use it in both the parameter and the return:

```ts
function getProp<K extends keyof Profile>(key: K): Profile[K] { ... }

const s = getProp('fontSize');   // K = 'fontSize', returns number
const d = getProp('darkMode');   // K = 'darkMode', returns boolean
getProp('usrname');              // ❌ Error: not a key
```

Why generic instead of `key: keyof Profile`? Because with the plain union parameter, the return could only be "some value type" (`string | number | boolean`) for every call. With `K` generic, each call remembers *which* key it got (K infers as the literal type `'fontSize'`), so `Profile[K]` computes the exact value type *for that call*. The key and the value type move together — **correlated**. That correlation is the entire trick, and it's one that `string` + `any` can never express.

The same pair types writes: `setSetting<K extends keyof Profile>(key: K, value: Profile[K])` — whatever key you pass, the value must match THAT key's type.

### Reading a doubly-generic signature: `pluck<T, K extends keyof T>`

Constraints can refer to *earlier type parameters*. `<T, K extends keyof T>` reads: "T is any object type; K is one of T's keys." Then `T[K][]` is "an array of the value type at K." Both are inferred from the call: `pluck(users, 'id')` sets T from the array and K from the string you pass.

### Literal inference for generic parameters

One quiet mechanic makes this all work: when you pass `'fontSize'` to a generic parameter `K`, the compiler infers K as the *literal type* `'fontSize'`, not as `string`. Generic type parameters preserve literal precision — similar in spirit to what `satisfies` did in exercise 14.

## 3. Walking through the original code

Open `original.ts`. The data:

```ts
export interface Profile {
  username: string;
  fontSize: number;
  darkMode: boolean;
}
```

Three keys, three different value types — remember that; it's why `any` shows up next:

```ts
export function getSetting(key: string): any {
  return (profile as any)[key];
}
export function setSetting(key: string, value: any): void {
  (profile as any)[key] = value;
}
```

`key: string` admits any spelling. The `(profile as any)` cast exists because even the original author couldn't get `profile[key]` to compile with a bare string key — the cast is the confession. And the return/value types are `any` because with an unknown key, no honest single type exists.

Then four gambles, all compiling:

```ts
export const a = getSetting('username');   // 'ada' — typed any though
export const b = getSetting('usrname');    // undefined — typo, no error
setSetting('fontSize', 'sixteen');          // a STRING into a number field
setSetting('darkMod', true);                // typo CREATES a new field
```

Gamble by gamble: (1) works, but comes back `any`, poisoning downstream. (2) misspelled read → `undefined`, no complaint. (3) wrong-typed write → the profile now holds `fontSize: 'sixteen'`. (4) misspelled write → a brand-new `darkMod` field appears while the real `darkMode` sits unchanged — the user flips dark mode and nothing happens.

The last line completes the crime:

```ts
export const size: number = getSetting('fontSize');
```

After gamble (3), this is the string `'sixteen'` wearing a `number` annotation (any assigns to anything). Somewhere downstream, `fontSize + 2` renders `'sixteen2'`.

## 4. What's wrong with it (in beginner terms)

**Flaw 1 — reads can't be trusted.** A typo'd key returns `undefined` typed as `any`. Runtime story: the settings screen shows a blank username field because someone wrote `getSetting('usrname')`. QA reports "username sometimes disappears." It's not sometimes — it's that one misspelled call site, but `any` made all call sites equally suspect.

**Flaw 2 — writes can corrupt.** `setSetting('fontSize', 'sixteen')` plants a string in a numeric field. Every consumer of `fontSize` inherits the corruption: `fontSize + 2` is `'sixteen2'`, comparisons misbehave, the saved profile is malformed. The bad data outlives the bad call.

**Flaw 3 — typo'd writes invent fields.** JavaScript's bracket-assign creates missing keys. `setSetting('darkMod', true)` succeeds *from the caller's point of view* — no error, no crash — while the feature it was meant to control never changes. These "worked but did nothing" bugs are the most maddening kind to trace.

**Flaw 4 — the key↔value link is severed.** The deep issue: which value type is legal *depends on* which key you pass. `string`-plus-`any` has no way to say that. This exercise exists to teach the tool that can.

## 5. Try it yourself first!

1. **Vague hint:** The compiler needs two pieces of knowledge: which key names are real, and what value type lives at each. Both are already written down — inside `interface Profile`. Find the operator that extracts them.
2. **Warmer:** Change `key: string` to `key: keyof Profile`. Which of the four gambles die immediately? Which problem remains? (Hint: check what `getSetting('fontSize')` returns now.)
3. **Warmer still:** Make it generic: `getSetting<K extends keyof Profile>(key: K)`. What should the return type be so `'fontSize'` yields `number` but `'darkMode'` yields `boolean`?
4. **Specific:** Do `setSetting<K extends keyof Profile>(key: K, value: Profile[K])`. Verify `setSetting('fontSize', 'sixteen')` and `setSetting('darkMod', true)` both fail. Also check: does the `(profile as any)` cast in the body still need to exist?
5. **Stretch:** Write `pluck<T, K extends keyof T>(items: T[], key: K): T[K][]` and call it on an array of `{ id: number; name: string }`. Hover the results of plucking `'id'` vs `'name'`.

## 6. Understanding the refactored solution

Open `refactored/settings.ts`. The core:

```ts
export function getSetting<K extends keyof Profile>(key: K): Profile[K] {
  return profile[key];
}
export function setSetting<K extends keyof Profile>(key: K, value: Profile[K]): void {
  profile[key] = value;
}
```

Note what's gone: the `as any` casts. `profile[key]` compiles *directly* now, because the compiler knows `key` is a real key of `Profile` — the constraint made the body legal, exactly like exercise 17's "the constraint is the permission."

And note what each call computes:

```ts
export const name = getSetting('username');  // string
export const size = getSetting('fontSize');  // number, actually
export const dark = getSetting('darkMode');  // boolean
```

Three calls, three different correct return types, from ONE signature. That's `Profile[K]` doing per-call arithmetic. The write side enforces the same correlation: `setSetting('fontSize', 18)` fine; `setSetting('fontSize', 'sixteen')` rejected; `setSetting('darkMod', true)` rejected (not a key — phantom fields can no longer be born).

**`pluck` — the idiom at full genericity:**

```ts
export function pluck<T, K extends keyof T>(items: readonly T[], key: K): T[K][] {
  return items.map((item) => item[key]);
}

export const ids = pluck(users, 'id');     // number[]
export const names = pluck(users, 'name'); // string[]
```

Both T and K inferred from the call; the return `T[K][]` is "array of whatever lives at that key." `pluck(users, 'email')` is a compile error because `'email'` isn't a key of the user objects. This is the pattern exercise 19 spreads across a whole utility library, and the correlation idea scales further: exercise 20 correlates event names with payload types the same way.

**Editor dividend:** type `getSetting('` and the editor lists the three real keys — because the parameter's type literally is the list of keys. Autocomplete isn't a luxury feature; it's what a precise type looks like in the editor.

**The four type tests** are the original's four gambles, each now pinned as a must-not-compile.

## 7. Words you learned (glossary)

- **Bracket access (`obj[key]`)** — property read/write where the key is a runtime value; assigning to a missing key creates it.
- **`keyof T`** — a type: the union of T's property names as string literals.
- **Indexed access type (`T[K]`)** — a type: the value type at key K in T; compile-time lookup, no runtime cost.
- **Correlation** — key type and value type moving together per call, via a generic K used in both positions.
- **`K extends keyof T`** — a constrained type parameter admitting only T's real keys (constraints: exercise 17).
- **Literal inference** — a generic parameter inferring `'fontSize'` (the exact string type) rather than `string`.
- **Phantom field** — a property created by a typo'd bracket-assign; the real field stays untouched.
- **Stringly-typed** — using plain `string` where a precise set of names exists; the disease `keyof` cures.
- **`T[K][]`** — an array of the value type at K (indexed access, then array-of).

## 8. Experiments to try on the plane (no internet needed)

Run `npm run typecheck` from the `typescript/` folder after each change. Undo between experiments.

1. **In `refactored/settings.ts`**, add a field `theme: 'light' | 'dark'` to `Profile` (and `theme: 'dark'` to the `profile` object). Expected: ✅ compiles with zero other changes — and `getSetting('theme')` is instantly available, returning `'light' | 'dark'`. The functions grow with the interface automatically; nothing was hand-listed.
2. **In `refactored/settings.ts`**, change `getSetting`'s signature to the non-generic `(key: keyof Profile): Profile[keyof Profile]`. Expected: ✅ compiles, but hover `getSetting('fontSize')` — the return is now `string | number | boolean` for EVERY call. Un-correlated. This is why K must be generic: the union version knows the keys but forgets which one you passed.
3. **In `refactored/settings.ts`**, in `setSetting`'s body, change the line to `profile[key] = getSetting(key);` — wait, simpler: change it to `profile.fontSize = value;`. Expected: ❌ error — `value` is `Profile[K]`, which for some calls is a string or boolean, not assignable to the `number` field. The correlation protects the body from itself, too.
4. **In `refactored/settings.ts`**, call `pluck(users, Math.random() > 0.5 ? 'id' : 'name')`. Expected: ✅ compiles — K infers as the union `'id' | 'name'`, and the result is `(string | number)[]`. Correlation degrades gracefully: an uncertain key yields an honestly-uncertain value type.
5. **In `refactored/settings.ts`**, write `const k: string = 'fontSize'; getSetting(k);`. Expected: ❌ error — `string` is not assignable to `keyof Profile`. A widened variable loses the literal. Fix it with `const k = 'fontSize';` (no annotation — inference keeps the literal for `const`). The difference between those two lines is exercise 14's widening lesson resurfacing.
