# 📘 Learning Guide: Strictness Flags

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What is this exercise about?

TypeScript's compiler is configurable: dozens of switches (**compiler flags**) control how suspicious it is. Most projects turn on `strict: true` and call it a day. This exercise's twist: `original.ts` compiles **completely clean under strict mode** — and still contains four real bugs. Each bug corresponds to a stricter flag, *not included in `strict`*, that would have caught it.

So this exercise isn't about fixing code the compiler flagged. It's about learning that the compiler only checks what you *ask* it to check — and that there's a second shelf of flags above `strict`, each one a whole class of bug you become unable to write. Uniquely here, the refactored folder contains a second config file, `tsconfig.stricter.json`, that deliberately points at the buggy original so you can watch it fail: the config is the test harness.

## 2. Concepts you need first

### tsconfig.json and compiler flags
`tsconfig.json` is the project file that tells `tsc` (the TypeScript compiler) what to check and how. `"compilerOptions"` holds the flags; `"include"` lists which files. This track's shared config (in the `typescript/` folder) sets `strict: true` and `noEmit: true` (**noEmit** = only type-check, don't produce JavaScript output — the compiler as pure bug-finder).

### `strict: true` — the floor
`strict` is an umbrella that switches on a bundle of checks at once: `strictNullChecks` (null/undefined must be handled), `noImplicitAny` (no silently-untyped values), `useUnknownInCatchVariables`, and several more. Everything in this track so far assumed it. But it's a floor, not a ceiling — the four flags below are *not* in the bundle.

### Flag 1: `noUncheckedIndexedAccess`
By default, indexing an array is typed as if it always succeeds:

```ts
const days = ['mon', 'tue'];
const d = days[9];    // typed: string  — but at runtime it's undefined!
d.toUpperCase();      // ✅ compiles... 💥 crashes
```

Arrays have edges; the default types pretend they don't. With the flag on, `days[9]` is typed `string | undefined`, and you must check:

```ts
const d = days[9];         // string | undefined under the flag
d.toUpperCase();           // ❌ Error: 'd' is possibly 'undefined'
if (d !== undefined) d.toUpperCase(); // ✅ OK
```

Same story for object index signatures like `Record<string, T>`. This is widely considered the highest-value flag outside `strict`.

### Flag 2: `exactOptionalPropertyTypes`
Subtle but real: for an optional property `nickname?: string`, there are two different situations JavaScript can distinguish:
- the key is **absent** — `'nickname' in obj` is `false`;
- the key is **present with the value `undefined`** — `'nickname' in obj` is `true`, but reading it gives `undefined`.

Code that iterates keys, counts properties, spreads objects, or serializes JSON behaves differently in the two cases. By default TypeScript blurs them: it lets you *assign* `undefined` to an optional property. With the flag on, `?` strictly means "may be absent," and writing `undefined` into it is an error:

```ts
interface Prefs { nickname?: string }
const p: Prefs = { nickname: undefined };
// ❌ Error (with flag): Type 'undefined' is not assignable with exactOptionalPropertyTypes
const q: Prefs = {};              // ✅ OK — actually absent
```

To say "present but maybe empty" you'd declare `nickname: string | undefined` explicitly — the flag keeps `?` and `| undefined` as different claims.

### Flag 3: `noImplicitReturns`
If a function returns a value on some paths and just "falls off the end" on others, JavaScript returns `undefined` from the missing path. By default, TypeScript quietly folds that into the inferred return type (`string | undefined`) and moves on. The flag makes the missing path an error *at the function*:

```ts
function grade(score: number) {
  if (score >= 90) return 'A';
  // ❌ Error (with flag): Not all code paths return a value.
}
```

Without the flag, every caller silently inherits the `| undefined` — the bug's cost is paid far from the bug's home.

### Flag 4: `noFallthroughCasesInSwitch`
In a `switch`, a `case` without `break` (or `return`) **falls through**: execution continues into the next case's code. Occasionally intentional, usually a forgotten `break`:

```ts
switch (key) {
  case 'Enter':
    result = 'submit';   // ❌ Error (with flag): Fallthrough case in switch.
  case 'Escape':
    result = 'cancel';
    break;
}
```

Here `'Enter'` sets `'submit'`... then immediately overwrites it with `'cancel'`. The flag rejects any non-empty case that can reach the next one.

### Multiple tsconfigs, one codebase
You can have several config files checking the same files with different strictness. `npx tsc -p <path-to-config>` runs the compiler with a specific config (`-p` = project). The refactor's `tsconfig.stricter.json` adds the four flags (plus `noImplicitOverride`, a bonus: subclass methods that override a parent must say `override`) and includes *both* `fixed.ts` and `../original.ts` — so running it is the demonstration: fixed passes, original fails with exactly four errors.

## 3. Walking through the original code

Bug 1 — the edgeless array:

```ts
const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri'];
export function weekdayName(index: number): string {
  return WEEKDAYS[index].toUpperCase();
}
```

`WEEKDAYS[index]` is typed `string` under plain strict — so `.toUpperCase()` looks fine. But `weekdayName(9)` gets `undefined` at runtime: crash. The signature even *promises* `string` for any number you throw at it.

Bug 2 — writing undefined into an optional:

```ts
export function setNickname(prefs: Prefs, value: string | undefined): Prefs {
  return { ...prefs, nickname: value };
}
```

When `value` is `undefined`, this produces `{ nickname: undefined }` — the key *present*, holding `undefined`. Any code checking `'nickname' in prefs`, or iterating/serializing the object, now sees a nickname that "exists" but is empty. Clearing a preference should *remove* the key.

Bug 3 — the ladder with no bottom rung:

```ts
export function gradeFor(score: number) {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
}
```

No `else`. `gradeFor(50)` falls off the end and returns `undefined`. Because there's no return annotation, strict infers `string | undefined` and every caller inherits the maybe — nobody is pointed at the actual omission.

Bug 4 — the missing break:

```ts
case 'Enter':
  result = 'submit';
// no break — falls through
case 'Escape':
  result = 'cancel';
  break;
```

`describeKey('Enter')` returns `'cancel'`. Yes, really: it assigns `'submit'`, then falls into the next case and overwrites it.

## 4. What's wrong with it (in beginner terms)

The headline: **all four compile clean under `strict: true`.** Each is a bug the compiler *could* catch, but only if asked.

1. **Index out of range.** Story: a date-picker somewhere computes a weekday index, an off-by-one makes it 5 on Saturdays, and `weekdayName(5)` throws `Cannot read properties of undefined (reading 'toUpperCase')` — but only on Saturdays, so it takes three weekends to reproduce. The type `string` was a promise the array never made.
2. **Present-undefined vs absent.** Story: settings are synced to a server as JSON. `JSON.stringify` *drops* keys whose value is `undefined`... but a different code path checks `'nickname' in prefs` and shows a "clear nickname" button for an already-"cleared" nickname. Two parts of the app disagree about whether a nickname exists. The distinction was real; the types blurred it.
3. **The forgotten F.** Story: `gradeFor(50)` returns `undefined`; the report card template renders "Grade: undefined" for half the class. The missing `else` was a missing *requirement* (the F grade), and nothing forced anyone to notice the fourth path existed.
4. **Fallthrough.** Story: pressing Enter cancels the dialog instead of submitting it. Users file "Enter key is broken." The diff that caused it looks completely plausible — one missing `break` in a switch nobody re-read.

## 5. Try it yourself first!

1. **Vague hint:** before touching the code — for each of the four functions, ask "what input or path did the author not think about?" Try to name each bug yourself.
2. **Warmer:** bug 1 needs a *runtime check* for the missing case. What should `weekdayName(9)` actually do — return something made up, or fail loudly? (This track's habit: loud, at the edge.)
3. **Warmer:** bug 2 — how do you produce an object with a key genuinely *removed*? Hint: destructuring with rest: `const { nickname, ...rest } = prefs;` gives you `rest` without the key.
4. **Warmer:** bugs 3 and 4 are one-liners: add the missing final `return`, and restructure the switch so there's no `break` to forget (return directly from each case).
5. **The real exercise:** fix all four, then create a stricter tsconfig with the four flags from section 2 and point it at both files. Original: exactly 4 errors. Yours: clean. The config *is* the test.

## 6. Understanding the refactored solution

Fix 1 — the edge is checked, and failure is loud:

```ts
const day = WEEKDAYS[index]; // string | undefined under the flag
if (day === undefined) {
  throw new RangeError(`no weekday at index ${index}`);
}
return day.toUpperCase();
```

Under the stricter config, the flag *forces* this shape — the index result can't be used until narrowed. The fix isn't appeasement; a `RangeError` naming the bad index at the exact edge is genuinely better than a crash four frames later.

Fix 2 — clearing means removing:

```ts
if (value === undefined) {
  const { nickname, ...rest } = prefs; // ACTUALLY absent
  void nickname;
  return rest;
}
return { ...prefs, nickname: value };
```

Destructure-and-rest builds a copy *without* the key. (`void nickname;` just tells the linter the pulled-out variable is intentionally unused.) Now `?` means what it says: may be absent — and when cleared, it *is* absent.

Fix 3 — the fourth rung: `return 'F';`. Notice this was never about pleasing a flag — half the class gets an F, and the original simply had no answer for them.

Fix 4 — return-per-case:

```ts
switch (key) {
  case 'Enter': return 'submit';
  case 'Escape': return 'cancel';
  default: return 'other';
}
```

With a `return` in every case there is no `break` to forget and no accumulator variable to overwrite — the fallthrough *category* of bug is structurally gone (exercise 12's preferred style, for exactly this reason).

The config (`tsconfig.stricter.json`) adds the four flags plus `noImplicitOverride`, and its `include` lists `./fixed.ts` **and** `../original.ts`. That second entry is the teaching device: run `npx tsc -p typescript/39-strictness-flags/refactored/tsconfig.stricter.json` and watch the original fail with exactly four errors — one per bug, each pointing at the exact line.

Finally, the adoption playbook (from the code's closing comment): on an existing codebase these flags may surface hundreds of errors. That's not noise — it's a backlog of latent bugs, generated free and prioritized for you. Enable one flag at a time; fix the genuinely-buggy hits first; scope the flag to new code if the tail is long.

## 7. Words you learned (glossary)

- **Compiler flag** — a switch in tsconfig controlling what the compiler checks.
- **`tsconfig.json`** — the project file holding flags (`compilerOptions`) and the file list (`include`).
- **`tsc` / `-p`** — the TypeScript compiler / "use this project config."
- **`noEmit`** — type-check only; produce no JavaScript output.
- **`strict: true`** — the umbrella bundle of standard checks; the floor, not the ceiling.
- **`noUncheckedIndexedAccess`** — indexing yields `T | undefined`; arrays admit they have edges.
- **Index signature** — a type like `Record<string, T>` allowing arbitrary keys; also affected by that flag.
- **`exactOptionalPropertyTypes`** — `?` means "may be absent"; writing `undefined` into it is an error.
- **Absent vs present-undefined** — key not there at all vs. key there holding `undefined`; `in`, iteration, and JSON treat them differently.
- **`noImplicitReturns`** — every code path must explicitly return.
- **Implicit return** — falling off a function's end (returns `undefined` silently).
- **`noFallthroughCasesInSwitch`** — a non-empty `case` may not run into the next one.
- **Fallthrough** — execution continuing from one `case` into the next when `break` is missing.
- **`noImplicitOverride`** — subclass methods overriding a parent must be marked `override`.
- **Rest destructuring** — `const { x, ...rest } = obj;` copies `obj` without key `x`.
- **`RangeError`** — the built-in error class for out-of-range values.
- **Latent bug** — a bug already in the code, waiting for the input that triggers it.

## 8. Experiments to try on the plane (no internet needed)

The usual `npm run typecheck` (from `typescript/`) checks everything with the *base* config — under it, even `original.ts` is clean. That's finding #1. The others need the stricter config; if `node_modules` is installed, this works offline:
`npx tsc -p typescript/39-strictness-flags/refactored/tsconfig.stricter.json`

1. **Count the failures.** Run the stricter config unchanged. Expected: exactly 4 errors, all in `original.ts` — one per section, naming lines you can match to the four bugs. `fixed.ts` contributes none.
2. **Un-fix one thing.** In `fixed.ts`, delete the `if (day === undefined)` block. Expected: ❌ the stricter run now flags `day.toUpperCase()` ("possibly 'undefined'") — while the base `npm run typecheck` still passes. Same code, two verdicts: the difference *is* the flag.
3. **Blur the optional again.** In `fixed.ts`'s `setNickname`, replace the whole body with `return { ...prefs, nickname: value };`. Expected: ❌ the stricter run rejects assigning `string | undefined` to `nickname?: string` (`exactOptionalPropertyTypes` at work).
4. **Sneak in a fallthrough.** In `fixed.ts`'s `describeKey`, change `case 'Enter': return 'submit';` to `case 'Enter': console.log('enter');` (no return/break). Expected: ❌ "Fallthrough case in switch" from the stricter config — and note `noImplicitReturns` would also complain if that path could exit the function.
5. **Read a flag's blast radius.** Add to `fixed.ts`: `const flags: Record<string, boolean> = { a: true }; const v = flags['b'];` then `const w: boolean = v;`. Expected: ❌ under stricter, `v` is `boolean | undefined` — `noUncheckedIndexedAccess` covers object index signatures too, not just arrays.
