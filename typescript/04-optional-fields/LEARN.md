# 📘 Learning Guide: Optional Fields

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What is this exercise about?

The code manages user settings — theme, font size, email, notification preferences — and builds a one-line description of them.

The type-level problem: every field in the `Settings` interface is marked optional with `?`, so an empty object `{}` counts as valid settings. Then, to read those maybe-missing fields without the compiler complaining, the author used `!` — an operator that tells the compiler "trust me, it's there." It wasn't. The code crashes on `.toUpperCase()` and computes `NaN`, all with the compiler's blessing. The lesson: `?` was being used to mean three different things, and the fix is to model each one honestly.

## 2. Concepts you need first

### Optional properties (`?`)

A `?` after a property name means "this property may be omitted entirely":

```ts
interface Profile {
  name: string;
  nickname?: string;   // may be left out
}
const a: Profile = { name: "Ada" };                    // ✅ OK — nickname omitted
const b: Profile = { name: "Ada", nickname: "ada" };   // ✅ OK
```

When you *read* an optional property, its type includes `undefined` — JavaScript's value meaning "nothing here." So `a.nickname` has type `string | undefined` (the `|` means "or" — more below).

### `undefined` (a JavaScript refresher)

`undefined` is what you get when you read a property that doesn't exist. Doing math or calling methods on it breaks things:

```ts
undefined + 2          // NaN — "Not a Number", poisons all later math
undefined.toUpperCase() // 💥 CRASH: TypeError at runtime
```

### Union types (`|`)

A **union type** means "one of these": `string | undefined` is "a string, OR undefined." The compiler then insists you handle both possibilities before using string-only features:

```ts
let maybe: string | undefined;
maybe.toUpperCase();              // ❌ Error: 'maybe' is possibly 'undefined'
if (maybe !== undefined) {
  maybe.toUpperCase();            // ✅ OK — undefined ruled out (this is "narrowing")
}
```

That `if` check shrinking the type is called **narrowing** — the compiler tracks your checks.

### The non-null assertion (`!`)

A `!` after an expression tells the compiler: "I promise this is not null/undefined — stop asking."

```ts
let maybe: string | undefined;
maybe!.toUpperCase();   // ✅ Compiles... but if maybe IS undefined: 💥 runtime crash
```

The compiler takes your word for it and checks nothing. If your promise is wrong, you get exactly the crash strict mode existed to prevent. Treat every `!` as a red flag.

### Safe alternatives: `?.` and `??`

**Optional chaining** `?.` reads a property only if the thing before it exists (otherwise the whole expression is `undefined`, no crash):

```ts
settings.notifications?.push   // undefined if notifications is missing — no crash
```

**Nullish coalescing** `??` supplies a default when a value is `null` or `undefined`:

```ts
const theme = settings.theme ?? 'light';   // 'light' only if theme is null/undefined
```

### `?` vs `| undefined` — a subtle but real difference

These look similar but say different things:

```ts
interface A { email?: string }             // email MAY BE OMITTED from the object
interface B { email: string | undefined }  // email MUST BE WRITTEN, but may be undefined
const a: A = {};                            // ✅ OK
const b: B = {};                            // ❌ Error: Property 'email' is missing
const b2: B = { email: undefined };         // ✅ OK — present, explicitly empty
```

`B` forces every construction site to *consciously decide* about email. That deliberateness is a tool the solution uses.

## 3. Walking through the original code

Open `original.ts`. The interface:

```ts
export interface Settings {
  theme?: string;
  fontSize?: number;
  email?: string;
  notifications?: { email?: boolean; push?: boolean };
}
```

Every field optional — so `{}` is a perfectly legal `Settings`. Every read, anywhere in the app, must now cope with absence.

The reads:

```ts
const size = settings.fontSize! + 2;            // undefined + 2 = NaN
const emailUpper = settings.email!.toUpperCase(); // CRASH if absent
const wantsPush = settings.notifications!.push!;
```

Strict mode *did* flag the naked accesses — "fontSize is possibly undefined." The author silenced each warning with `!`. If `fontSize` is missing, `undefined + 2` yields `NaN` (silent). If `email` is missing, `.toUpperCase()` throws (loud). The nested `notifications!.push!` needs TWO lies stacked up.

The comment at the bottom names the deeper issue: `?` is covering three *different* situations —

- `theme`: optional **with a default** (absence just means `'light'`),
- `email`: **genuinely maybe-absent** (some users have no email, ever),
- `fontSize`: **required by the app**, someone just planned to "fill it in later."

The type says `?` for all three, so a caller can't tell which is which.

## 4. What's wrong with it (in beginner terms)

**Flaw 1 — the crash the compiler tried to stop.** Runtime story: a new user signs up, no settings saved yet, so the app calls `describeSettings({})`. The `!` on `email` promised it would be there. It isn't. `undefined.toUpperCase()` throws a `TypeError`, the settings page white-screens. The compiler *saw this coming* — the `!` overruled it.

**Flaw 2 — the silent NaN.** `fontSize! + 2` with a missing fontSize is `NaN`. No crash — worse: the UI renders "NaNpx" somewhere. Silent wrong values travel further than crashes.

**Flaw 3 — the type teaches callers nothing.** Reading the interface, you can't tell that `theme` has a safe default while `email` truly might not exist. The type is the documentation other developers read — and this one mumbles "shrug, everything's maybe."

**Flaw 4 — `!` scattered everywhere is a smell.** Each `!` marks a spot where the type model disagrees with what the author believes. The fix is never "add `!`" — it's "fix the model so the belief becomes provable."

## 5. Try it yourself first!

1. **Vague hint:** The bug isn't any single line — it's that ONE interface is doing a job that needs TWO interfaces.
2. **Warmer:** For each field, decide which of the three situations it's in: has-a-default, genuinely-maybe-absent, or required. (The comment at the bottom of original.ts helps.)
3. **Warmer still:** Sketch two interfaces: what callers are allowed to *pass in* (lenient, lots of `?`), and what the app *works with internally* (strict, no `?`).
4. **Specific:** Write a function `resolveSettings(input) -> full settings` that applies every default in one place (`??` is your friend). After it runs, reads need no `!` at all.
5. **The subtle one:** `email` has no sensible default. Keep it maybe-absent in the internal type — but use `string | undefined` instead of `email?:` so nobody can *forget* it, and every read is forced to branch.

## 6. Understanding the refactored solution

Open `refactored/settings.ts`. The central move: **two types and a boundary function.**

**`SettingsInput`** — the lenient edge shape. Everything callers might omit is `?`. This is the truthful description of what arrives from outside.

**`Settings`** — the strict inside shape:

```ts
export interface Settings {
  theme: 'light' | 'dark';
  fontSize: number;
  email: string | undefined;   // still maybe-absent — but EXPLICITLY, forever
  notifications: { email: boolean; push: boolean };
}
```

No `?` anywhere. `theme` and `fontSize` are simply present. `email` uses `| undefined` — present as a field, possibly empty as a value — so builders of this object must consciously supply it, and readers must consciously check it.

**`resolveSettings`** — the boundary where defaults are decided ONCE:

```ts
theme: input.theme ?? 'light',
fontSize: input.fontSize ?? 16,
email: input.email,   // no default exists for an email — stays maybe
```

After this function, the rest of the app touches only strict `Settings`. `settings.fontSize + 2` is plain access — no `!`, `?.`, or `??` sprinkled through the codebase, because the *type* now guarantees presence.

**The one genuine maybe forces a branch:**

```ts
const emailPart =
  settings.email === undefined ? 'no email' : settings.email.toUpperCase();
```

The compiler narrows `string | undefined` to `string` in the second arm of the ternary. This branch isn't ceremony — "user has no email" is a real product case that needed real handling.

**Every `!` is gone.** Not silenced — *unnecessary*, because the model now matches reality.

**The type tests** pin both properties: you can't build a `Settings` with fields missing, and you can't call `.toUpperCase()` on `email` without checking first.

## 7. Words you learned (glossary)

- **Optional property (`?`)** — a property that may be omitted from an object entirely.
- **`undefined`** — JavaScript's "nothing here" value; reading a missing property gives you this.
- **Union type (`|`)** — a type that is one of several options, e.g. `string | undefined`.
- **Narrowing** — the compiler shrinking a union after a check like `if (x !== undefined)`.
- **Non-null assertion (`!`)** — "trust me, it's not null/undefined." Unchecked; crashes if wrong.
- **Optional chaining (`?.`)** — safe property access that yields `undefined` instead of crashing.
- **Nullish coalescing (`??`)** — supplies a default only for `null`/`undefined` (unlike `||`, which also overrides `0` and `''`).
- **Boundary / edge** — the place where outside data is converted into your app's trusted internal shape.
- **Resolve** — applying defaults and checks to turn a lenient input into a strict internal value.
- **`NaN`** — Not a Number; the silent result of math on `undefined`.
- **Ternary (`cond ? a : b`)** — inline if/else expression.

## 8. Experiments to try on the plane (no internet needed)

Run `npm run typecheck` from the `typescript/` folder after each change. Undo between experiments.

1. **In `refactored/settings.ts`**, in `resolveSettings`, delete the line `fontSize: input.fontSize ?? 16,`. Expected: ❌ error — "Property 'fontSize' is missing" — the strict `Settings` type refuses an incomplete build. The boundary function can't silently skip a default.
2. **In `refactored/settings.ts`**, in `describeSettings`, replace the email ternary with `const emailPart = settings.email.toUpperCase();`. Expected: ❌ error — "'settings.email' is possibly 'undefined'." The one genuine maybe still forces its branch.
3. **In `refactored/settings.ts`**, change `email: string | undefined` to `email?: string` in `Settings`. Expected: ✅ it still compiles (`?` is more lenient)... but now in `resolveSettings` you could delete the `email:` line entirely and nothing would complain. That's the difference: `| undefined` makes forgetting impossible; `?` doesn't. Restore it.
4. **In `refactored/settings.ts`**, call `describeSettings({})` directly at the bottom (instead of going through `resolveSettings`). Expected: ❌ error — `{}` is not a `Settings`; the strict type only accepts fully-resolved objects. The boundary is mandatory.
5. **In `refactored/settings.ts`**, try `theme: input.theme ?? 'blue'` in `resolveSettings`. Expected: ❌ error — `'blue'` is not `'light' | 'dark'`. Even the defaults are checked against the literal union.
