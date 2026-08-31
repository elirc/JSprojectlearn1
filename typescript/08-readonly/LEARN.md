# 📘 Learning Guide: Readonly

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What is this exercise about?

The code keeps a game roster — players with names and scores, stored in the order they joined. It offers three operations: get the roster, find the top scorers, and apply a score bonus to a player.

The type-level problem: every one of those "read-ish" operations secretly *modifies* data it doesn't own. `topScorers` reorders the caller's array. `applyBonus` edits the caller's player object. `getRoster` hands out the module's real internal array for anyone to scramble. Nothing in any function signature warns about this — because in TypeScript, `Player[]` means a *mutable* (changeable) array by default. The lesson: the `readonly` keyword turns "please don't mutate my data" from a team custom into a compiler-enforced contract.

## 2. Concepts you need first

### Mutation and references (a JavaScript refresher)

In JavaScript, objects and arrays are passed by **reference** — a function receiving an array gets the SAME array, not a copy. Changing it changes it for everyone holding that reference:

```ts
const nums = [3, 1, 2];
function sortem(list: number[]) { return list.sort(); }
const sorted = sortem(nums);
// nums is now [1, 2, 3] TOO — sort() rearranged the original, in place
```

`sort()`, `push()`, `splice()`, `reverse()` all modify the array **in place** (they change the original rather than returning a new one). This "action at a distance" — a function quietly changing data its caller still uses — is one of the classic JavaScript bug families.

### The copy-first idiom

The polite version copies before mutating:

```ts
const sorted = [...nums].sort();   // spread (...) copies the array; sort the COPY
// nums is untouched
```

Same for objects: `{ ...player, score: 99 }` builds a NEW object with one field changed, leaving the original alone. Without the type system, remembering to do this is pure discipline.

### `readonly` on interface fields

Marking a property `readonly` means: once the object exists, this field cannot be assigned to:

```ts
interface Player {
  readonly name: string;
  readonly score: number;
}
declare const p: Player;
p.score = 200;    // ❌ Error: Cannot assign to 'score' because it is a read-only property
const q = { ...p, score: 200 };  // ✅ OK — make a NEW object instead
```

Note `declare const` in examples like this: it announces "assume a value of this type exists" without building one — handy for demos and type tests.

### `readonly T[]` — read-only arrays

An array type can be readonly too: `readonly Player[]`. On this type, the mutating methods *do not exist* — not "are forbidden," they're simply absent from the type:

```ts
declare const view: readonly number[];
view.push(4);          // ❌ Error: Property 'push' does not exist on type 'readonly number[]'
view.sort();           // ❌ Error: Property 'sort' does not exist ...
view.map((n) => n*2);  // ✅ OK — non-mutating methods are all still there
const copy = [...view].sort();   // ✅ OK — copy first, then sort the copy
```

Reading (`view[0]`, `.length`, `.map`, `.filter`, `.slice`) all work fine. Only the mutators are gone.

### The assignability asymmetry (why this is practical)

Here's the clever part that makes `readonly` cheap to adopt:

```ts
const mutable: number[] = [1, 2, 3];
const view: readonly number[] = mutable;   // ✅ OK — promising LESS is always safe
const back: number[] = view;               // ❌ Error — can't promise MORE than you have
```

A normal array is happily accepted where `readonly` is expected — a function that promises "I won't touch this" can receive anything. But a readonly view can't be laundered back into a mutable array. So the rule of thumb costs callers nothing: **accept readonly, return what you own.**

### What `readonly` does NOT do

`readonly` is compile-time only. It erases at runtime like all types — it's a contract checked by the compiler, not a lock on the object. (JavaScript's `Object.freeze` is the runtime tool; different thing.) Also, `readonly Player[]` is **shallow**: it stops you replacing/removing *elements*, but not editing fields *inside* an element — which is exactly why `Player`'s own fields carry their own `readonly` in this exercise.

## 3. Walking through the original code

Open `original.ts`. The module keeps state:

```ts
const roster: Player[] = [
  { name: 'ada', score: 120 },
  { name: 'bo', score: 95 },
  { name: 'cy', score: 240 },
];
```

Insertion order is meaningful — it's join order. Then three leaks:

```ts
export function getRoster(): Player[] {
  return roster; // hands out THE array — callers can rearrange our state
}
```

Not a copy — the actual internal array. Any caller can `push`, `sort`, or `splice` the module's canonical state.

```ts
export function topScorers(players: Player[]): Player[] {
  return players.sort((a, b) => b.score - a.score).slice(0, 2);
}
```

`.sort()` mutates in place — it reorders the *caller's* array, then `.slice(0, 2)` takes the top two. The return value looks innocent; the side effect is invisible.

```ts
export function applyBonus(player: Player): Player {
  player.score += 50; // "apply" = quietly edit the caller's object
  return player;
}
```

Edits the caller's object AND returns it — the return value disguises the mutation.

Then the file shows the damage: after `topScorers(getRoster())`, the module's roster is score-sorted — join order destroyed for every later reader. `joinOrder` at the bottom expects `['ada', 'bo', 'cy']` and gets `['cy', 'ada', 'bo']`.

## 4. What's wrong with it (in beginner terms)

**Flaw 1 — the leaderboard that rewrote history.** Runtime story: the profile page shows "members in join order." The leaderboard page calls `topScorers(getRoster())` to show the top two. From that moment, the profile page shows members in *score* order — a completely different page broke, because `sort()` rearranged the shared array. Whoever debugs the profile page will find nothing wrong in the profile code. That's what makes mutation bugs expensive: the crime scene and the culprit are in different files.

**Flaw 2 — the bonus that hit the database.** `applyBonus` looks like it returns a new player with a higher score. It actually edits the one true roster entry. Call it twice while "previewing" a bonus and the player has permanently gained 100 points.

**Flaw 3 — signatures that don't warn.** The deep issue: `Player[]` and `Player` are *mutable by default* in TypeScript. Every signature in this file silently grants permission to mutate. Nobody reading `topScorers(players: Player[])` can tell whether it mutates — the type says it may.

**Flaw 4 — discipline doesn't scale.** "Always copy before sorting" is a house rule. House rules are forgotten by new teammates, at 2 a.m., during hotfixes. Compiler rules aren't.

## 5. Try it yourself first!

1. **Vague hint:** Three functions touch data they don't own. Find each mutation (one method call, one operator, one return statement).
2. **Warmer:** For `topScorers`, the fix is one idiom: copy, THEN sort. The spread syntax `[...players]` makes the copy.
3. **Warmer still:** For `applyBonus`, "apply" should mean "return a new player": `{ ...player, score: player.score + 50 }`.
4. **Specific:** Now make the compiler enforce all this forever: put `readonly` on both `Player` fields, change `topScorers` to accept `readonly Player[]`, and make `getRoster` return `readonly Player[]`. Try re-introducing each original mutation — each should now be a compile error.
5. **Check the asymmetry:** After your changes, can callers still pass a normal `Player[]` into `topScorers`? (They should — try it.) Can they assign `getRoster()`'s result to a `Player[]` variable? (They shouldn't — try it.)

## 6. Understanding the refactored solution

Open `refactored/roster.ts`.

**Readonly fields on the interface:**

```ts
export interface Player {
  readonly name: string;
  readonly score: number;
}
```

`player.score += 50` is now impossible to compile, anywhere in the program. "Apply a bonus" *must* mean building a new object — the copy idiom is no longer a convention but the only version that typechecks.

**Readonly views at the boundary:**

```ts
export function getRoster(): readonly Player[] {
  return roster;
}
export function topScorers(players: readonly Player[]): Player[] {
```

`getRoster` still returns the internal array (no copying cost!) but as a *view*: callers can read, map, filter — not sort, push, or splice. `topScorers` promises in its signature that it won't touch your array; internally it does `[...players].sort(...)` — the copy-first idiom, now compiler-mandated, since `readonly Player[]` has no `.sort` at all.

Note the module's own `roster` stays a plain `Player[]` — the module *owns* it and may legitimately update it. Readonly is for what you *share*, not what you own. That's "accept readonly, return what you own."

**`applyBonus` builds instead of edits:**

```ts
return { ...player, score: player.score + 50 };
```

**The demo now proves join order survives** — `joinOrder` is `['ada', 'bo', 'cy']` — and **the honest notes** remind you `readonly` costs nothing at runtime (it erases) and array-readonly is shallow (hence the field-level `readonly`s).

**The type tests** pin all three original mutations (sort, push, `score +=`) as must-not-compile, plus the asymmetry: a readonly view can't sneak into a mutable variable.

## 7. Words you learned (glossary)

- **Mutation** — changing existing data in place, rather than making changed copies.
- **Reference** — how objects/arrays are passed: the same underlying data, not a copy.
- **In-place method** — an array method that modifies the original: `sort`, `push`, `splice`, `reverse`.
- **Side effect** — a change a function makes beyond returning a value; invisible in the call.
- **Spread (`...`)** — syntax to copy an array (`[...arr]`) or object (`{...obj}`), optionally with changes.
- **`readonly` (field)** — a property that cannot be reassigned after creation.
- **`readonly T[]`** — an array type without the mutating methods.
- **View** — shared read access to data you still own; here, a readonly array reference.
- **Assignability asymmetry** — mutable fits into readonly; readonly does not fit into mutable.
- **Shallow** — applying one level deep only; readonly arrays don't protect fields inside elements.
- **`Object.freeze`** — the *runtime* mechanism for immutability; unrelated to the type-level `readonly`.
- **`declare const`** — "assume a value of this type exists" without constructing it; used in type tests.

## 8. Experiments to try on the plane (no internet needed)

Run `npm run typecheck` from the `typescript/` folder after each change. Undo between experiments.

1. **In `refactored/roster.ts`**, inside `topScorers`, remove the spread: change `[...players].sort(...)` to `players.sort(...)`. Expected: ❌ error — "Property 'sort' does not exist on type 'readonly Player[]'." The compiler forces the copy-first idiom.
2. **In `refactored/roster.ts`**, change `applyBonus`'s body to `player.score += 50; return player;` (the original's version). Expected: ❌ error — "Cannot assign to 'score' because it is a read-only property."
3. **In `refactored/roster.ts`**, add at the bottom: `export const raw: Player[] = getRoster();`. Expected: ❌ error — "The type 'readonly Player[]' is 'readonly' and cannot be assigned to the mutable type 'Player[]'." The view can't be laundered.
4. **In `refactored/roster.ts`**, add: `export const names = getRoster().map((p) => p.name.toUpperCase());`. Expected: ✅ no error — reading, mapping, filtering all work on readonly arrays. Only mutators are gone.
5. **The shallow-ness demo:** in `refactored/roster.ts`, temporarily remove `readonly` from `score` in the `Player` interface (leave the arrays readonly). Then add: `const v = getRoster(); v[0]!.score = 999;`. Expected: ✅ it compiles! A readonly ARRAY doesn't protect fields INSIDE elements — that's why the interface needs its own `readonly`s. (Also expect the `player.score += 50` type test to now complain its `@ts-expect-error` is unused.) Restore everything.
