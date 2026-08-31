# 🏋️ Practice: Readonly

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

Write your code in a scratch file inside this folder (e.g. `practice.ts`) — `npm run typecheck` from the `typescript/` folder picks it up. Import `Player` with `import type { Player } from './refactored/roster.js';` or copy the interface.

## Exercises

### ⭐ 1. A view-only helper (warm-up)

Write `names(players: readonly Player[]): string[]` returning every player's name. Then convince yourself the parameter really is untouchable: inside the function, try `players.reverse()` and read the error before deleting the line.

**Practices:** working comfortably on a readonly array — the reading methods are all still there.
**Hint:** `map` is not a mutator; it lives on readonly arrays.
**Check:** the function must compile; the `reverse()` attempt must error with roughly `Property 'reverse' does not exist on type 'readonly Player[]'`.

### ⭐⭐ 2. Add without push (core)

Write `addPlayer(players: readonly Player[], player: Player): Player[]` that returns a *new* array with the player appended. The signature makes the polite version the only version: `push` doesn't exist on the input.

**Practices:** the copy-and-extend idiom as the type-mandated replacement for `push`.
**Hint:** `[...players, player]`.
**Check:** must compile; `players.push(player)` inside must error with roughly `Property 'push' does not exist on type 'readonly Player[]'`.

### ⭐⭐ 3. Boost everyone (core)

Write `boostAll(players: readonly Player[], by: number): Player[]` that gives every player `by` extra points — without touching any original `Player` object. Both layers of `readonly` are working against the lazy version: the array blocks in-place edits of the list, and `Player`'s readonly fields block `p.score += by`.

**Practices:** map + object spread — new array, new objects, originals untouched.
**Hint:** `players.map((p) => ({ ...p, score: p.score + by }))` — note the parentheses around the object literal.
**Check:** must compile; a `for` loop doing `p.score += by` must error with roughly `Cannot assign to 'score' because it is a read-only property`.

### ⭐⭐ 4. Readonly all the way down (core)

Model a match: `interface Match { readonly id: string; readonly teams: readonly string[] }` — note *both* readonlys: the field can't be reassigned, and the array it holds can't be mutated. Write `addTeam(match: Match, team: string): Match` returning a new match with the team appended.

**Practices:** composing field-level and array-level `readonly`, and rebuilding nested immutable data.
**Hint:** spread twice — once for the match, once for the teams array.
**Check:** must compile; `match.teams.push('dragons')` must error (`'push' does not exist`), and `match.teams = []` must error (`Cannot assign to 'teams'`). Two different readonlys, two different errors.

### ⭐⭐⭐ 5. Own mutable, share readonly (challenge)

Build a tiny chat-log module: a private `const log: Message[]` (with `Message` having readonly `author`/`text`), `post(author, text)` that pushes (the owner may mutate!), `history(): readonly Message[]` exposing the log as a view, and `lastN(messages: readonly Message[], n: number): Message[]`. Then demonstrate the asymmetry with three lines: pass `history()` into `lastN` (works), pass the raw `log` into `lastN` (also works), and try `const stolen: Message[] = history()` (must fail).

**Practices:** "accept readonly, return what you own" as a whole module design.
**Hint:** the internal `log` stays `Message[]` on purpose — readonly is for what you *share*, not what you own.
**Check:** the two calls must compile; the `stolen` line must error with roughly `The type 'readonly Message[]' is 'readonly' and cannot be assigned to the mutable type 'Message[]'`.

## Solutions

### Solution 1

```ts
import type { Player } from './refactored/roster.js';

function names(players: readonly Player[]): string[] {
  return players.map((p) => p.name);
}
```

WHY: `readonly Player[]` removes only the mutators — `map`, `filter`, `slice`, indexing, and `.length` all remain, so read-only helpers cost nothing to write. Declaring the parameter readonly is the function *signing a promise* in the one place callers actually read: the signature.

### Solution 2

```ts
function addPlayer(players: readonly Player[], player: Player): Player[] {
  return [...players, player];
}
```

WHY: with no `push` on the type, "add" can only mean "build a bigger copy" — the js#26 house rule turned structural. The return type is a plain mutable `Player[]` because the function *owns* the array it built; the caller receives it free and clear.

### Solution 3

```ts
function boostAll(players: readonly Player[], by: number): Player[] {
  return players.map((p) => ({ ...p, score: p.score + by }));
}
```

WHY: two mutation routes exist and the types block both — the readonly array stops list surgery, and `Player`'s readonly `score` stops `p.score += by` even inside an innocent-looking loop. The map-plus-spread version creates a new object per player, so callers holding references to the originals (a leaderboard, an undo stack) see no spooky changes.

### Solution 4

```ts
interface Match {
  readonly id: string;
  readonly teams: readonly string[];
}

function addTeam(match: Match, team: string): Match {
  return { ...match, teams: [...match.teams, team] };
}
```

WHY: readonly is shallow, so each layer must state its own promise — `readonly teams` stops *reassigning the field*, while `readonly string[]` stops *mutating the array the field points at*. Drop either one and a mutation path reopens (that's LEARN.md's shallow-ness lesson applied at design time). The rebuild mirrors the structure: outer spread for the match, inner spread for the list.

### Solution 5

```ts
interface Message {
  readonly author: string;
  readonly text: string;
}

const log: Message[] = []; // owned here: mutable INSIDE the module

function post(author: string, text: string): void {
  log.push({ author, text }); // the owner may mutate what it owns
}

function history(): readonly Message[] {
  return log; // no copy — shared as a VIEW
}

function lastN(messages: readonly Message[], n: number): Message[] {
  return messages.slice(-n);
}

post('ada', 'hello');
const recent = lastN(history(), 5);  // ✅ view into readonly param
const alsoOk = lastN(log, 5);        // ✅ mutable into readonly param

// @ts-expect-error — the view can't be laundered into a mutable array
const stolen: Message[] = history();
```

WHY: the module keeps one mutable array because *someone* must legitimately update state — readonly is about who else gets to. `history()` shares the very same array (zero copying cost) but as a type-level view, so outsiders can read and derive but never `push` or `sort` the canonical log. The asymmetry makes this cheap for everyone: mutable flows *into* readonly parameters freely (promising less is safe), while the `stolen` line fails because a view can't be upgraded back into permission to mutate.
