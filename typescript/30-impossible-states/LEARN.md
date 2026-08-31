# 📘 Learning Guide: Impossible States

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What is this exercise about?

The code models a music player's state: is it playing? paused? buffering? what track? how far in?

The original models this as one big object — "The Big Bag Of Fields": three booleans, a nullable track name, and numbers that only mean something some of the time. The problem: most *combinations* of those fields are nonsense (playing AND paused; playing with no track), yet the type happily allows building them. The fix is a **discriminated union** where each real state is its own variant — and, the extra lesson of this exercise, where **each field exists only on the variants where it means something**. Nonsense states stop being bugs to check for and become shapes that *cannot be written down*.

## 2. Concepts you need first

### "State" in an app
State is the data describing what your program is doing right now. A player might be stopped, playing a track at some position, buffering, or showing an error. Code reads the state to render UI and writes it when things happen.

### Booleans multiply
Each boolean has 2 values. Three booleans = 2 × 2 × 2 = 8 combinations. If your player really has ~5 meaningful situations, the other 3+ combinations are junk your type still allows:

```ts
interface Flags { isPlaying: boolean; isPaused: boolean }
const nonsense: Flags = { isPlaying: true, isPaused: true }; // ✅ compiles. Ugh.
```

### Nullable fields (`string | null`)
`currentTrack: string | null` means "sometimes there's a track, sometimes not." The *rule* for when it's null (only when stopped) lives in the author's head, not in the type. The compiler can't connect "isPlaying is true" with "currentTrack isn't null."

### Discriminated unions (the star tool)
A union of object shapes, each carrying a shared literal field (the **discriminant**, here `status`) that identifies which shape you have:

```ts
type State =
  | { status: 'stopped' }
  | { status: 'playing'; track: string };

function show(s: State) {
  if (s.status === 'playing') {
    s.track;   // ✅ narrowed — track exists here
  }
  // s.track;  // ❌ Error: track doesn't exist on 'stopped'
}
```

Exercise 10's LEARN.md teaches this fully. What THIS exercise adds: think hard about **which variant each field lives on**. `track` above exists *only* on `'playing'` — there's no `track: string | null` anywhere.

### Narrowing with `switch`
A `switch` on the discriminant narrows each `case` to one variant. If the switch covers every variant and the function must return something, you don't even need a `default` — coverage is checkable (exercise 12's LEARN.md explains exhaustiveness).

```ts
switch (s.status) {
  case 'stopped': return 'nothing on';
  case 'playing': return s.track; // narrowed here
}
```

### State transitions
A transition is a function from old state to new state ("pause the player"). With a union, transitions read naturally: check which variant you're in, build a *whole new variant* out.

### Excess property checks
When you write an object literal directly against a type, TypeScript rejects properties that don't belong:

```ts
type Stopped = { status: 'stopped' };
const s: Stopped = { status: 'stopped', volume: 5 };
// ❌ Error: 'volume' does not exist in type 'Stopped'
```

This is why "smuggling a field onto the wrong variant" fails to compile — several type tests below depend on it.

### `@ts-expect-error`
A comment asserting the next line must fail to compile — a type test (explained in exercise 19's LEARN.md).

## 3. Walking through the original code

```ts
export interface PlayerState {
  isPlaying: boolean;
  isPaused: boolean;
  isBuffering: boolean;
  currentTrack: string | null;   // null when stopped... supposedly
  positionSeconds: number;        // meaningless when stopped... but present
  bufferPercent: number;          // only means anything while buffering
  error: string | null;           // and errors, orthogonal to everything?
}
```

Every field alone looks reasonable. The lies live in the *combinations*: nothing ties `currentTrack`'s null-ness to stopped-ness, nothing says `bufferPercent` only matters while buffering, and the three booleans allow 8 flag combos for about 5 real situations.

```ts
if (state.isPlaying) {
  return `▶ ${state.currentTrack} @ ${state.positionSeconds}s`;
}
```

Inside this branch, `currentTrack` is still `string | null` — the `isPlaying` check tells the *compiler* nothing about the track. So this line can render `"▶ null @ 42s"`. The connection "playing implies a track" exists only in the author's head.

```ts
export const impossible1: PlayerState = {
  isPlaying: true,
  isPaused: true,      // playing AND paused
  ...
};
```

And there it is: a state that should not exist, existing, compiling. `impossible2` follows — `isPlaying: true` with `currentTrack: null`: playing *nothing*.

## 4. What's wrong with it (in beginner terms)

**Flaw 1: contradictory flags are representable.** `isPlaying: true, isPaused: true` — what should the UI show, ▶ or ⏸? Whichever `if` runs first wins. **Runtime bug story:** the pause handler sets `isPaused = true` but forgets to clear `isPlaying`. Every render after that shows the player as playing (that branch is checked first), while the audio is paused. QA files "player shows wrong icon sometimes"; "sometimes" takes a week to reproduce because it depends on the order handlers ran.

**Flaw 2: the nullable track isn't tied to anything.** `"▶ null @ 42s"` renders — the string `"null"`, in production UI. The compiler saw `currentTrack: string | null` and template strings accept both, so no error.

**Flaw 3 (this exercise's special addition): fields that only apply *sometimes* but exist *always*.** A stopped player still has `positionSeconds: 42` sitting there. Is that leftover data? Meaningful? Every consumer must know which fields to ignore under which flag combos — and each consumer writes (or forgets) those rules separately. A dashboard widget innocently reads `state.bufferPercent` while playing and shows "0% buffered" over a happily playing track.

**Flaw 4: the checks multiply.** With N consumers each hand-writing "which fields count right now" logic, you don't have one bug, you have N chances of one.

## 5. Try it yourself first!

1. **Vague hint:** Stop describing the player with independent knobs. List the *situations* the player can actually be in. Count them.
2. **Less vague:** Five situations: stopped, playing, paused, buffering, error. Make each its own object type with a `status` literal, and union them.
3. **The key move:** for each field, ask "in which situations does this even mean anything?" Put `track` only on variants with a track. Put `bufferPercent` only on `'buffering'`. Put `message` only on `'error'`. NOTHING should be nullable, and nothing should be "present but meaningless."
4. **Rewrite `describePlayer`** as a `switch` on `status`. Inside `case 'playing'`, `state.track` should be a plain `string` — if it's `string | null`, a field is on the wrong variant.
5. **Test your design:** try to write the original's `impossible1` and `impossible2` against your union. Both should refuse to compile. Also try reading `state.positionSeconds` *before* any narrowing — that should fail too.

## 6. Understanding the refactored solution

```ts
export type PlayerState =
  | { status: 'stopped' }
  | { status: 'playing'; track: string; positionSeconds: number }
  | { status: 'paused'; track: string; positionSeconds: number }
  | { status: 'buffering'; track: string; bufferPercent: number }
  | { status: 'error'; message: string };
```

Read the field placement like a design document: `'stopped'` carries nothing — there is no position to be meaningless. `track` is `string`, never `string | null`, because it only appears on variants that *have* a track. `bufferPercent` exists in exactly one place. Three booleans became one `status` field with five values — 8 flag combos collapsed to exactly the 5 real states.

```ts
case 'playing':
  return `▶ ${state.track} @ ${state.positionSeconds}s`;
```

Inside this `case`, narrowing has done its work: `state.track` is `string`. The `"▶ null"` render isn't just avoided — it's *inexpressible*, because a playing state without a track can't be constructed in the first place. Notice also: the `switch` has no `default`. All five cases are covered, so the function returns a `string` on every path; add a sixth variant and this function stops compiling until you handle it.

```ts
export function pause(state: PlayerState): PlayerState {
  if (state.status !== 'playing') return state; // only playing can pause
  return { status: 'paused', track: state.track, positionSeconds: state.positionSeconds };
}
```

Transitions build whole new variants. `pause` narrows first (only `'playing'` can pause), then *explicitly* carries `track` and `positionSeconds` across into the `'paused'` shape. No flag-flipping, no chance of forgetting to clear a boolean — the old contradictory-flags bug has no equivalent here, because there's exactly one `status`.

The four type tests pin it all down: playing-AND-paused fails (excess property `isPaused`), playing-without-track fails (missing required field), `bufferPercent` while playing fails (excess property), and reading `positionSeconds` on an unnarrowed `PlayerState` fails — the type *forces* every consumer to ask "which state am I in?" before touching state-specific fields.

The recipe, reusable anywhere: list the real states → one variant per state → **assign each field to exactly the variants where it's meaningful** → discriminate with a literal field → narrow before reading.

## 7. Words you learned (glossary)

- **State**: the data describing what the program is doing right now.
- **Big Bag Of Fields**: anti-pattern — one flat object of flags and maybe-relevant fields.
- **Impossible state**: a field combination the type allows but reality forbids.
- **Nullable field**: a field typed `T | null` — often a smell that it belongs on fewer variants.
- **Discriminated union**: a union of shapes sharing a literal tag field.
- **Discriminant**: that tag field (`status` here).
- **Variant**: one branch of the union; one real state.
- **Narrowing**: the compiler shrinking a union to one variant after a check.
- **Exhaustiveness**: covering every variant, checkable by the compiler (exercise 12).
- **State transition**: a function old-state → new-state.
- **Excess property check**: object literals can't include fields their target type lacks.
- **Field bleed**: a field readable in states where it's meaningless (what this design kills).
- **Unrepresentable**: cannot even be written in the type — stronger than "checked at runtime."

## 8. Experiments to try on the plane (no internet needed)

Run `npm run typecheck` from the `typescript/` folder after each change; undo afterward.

1. In `refactored/player.ts`, add a sixth variant: `| { status: 'seeking'; track: string; targetSeconds: number }`. Expect: ❌ `describePlayer` stops compiling — its `switch` no longer returns a string on every path. Add a `case 'seeking'` and watch it go green. That's exhaustiveness protecting you.
2. Change the `'playing'` variant's `track` to `track: string | null`. Expect: it compiles (the compiler doesn't know your intent!) — but now the `▶` line can render null again. Types encode design decisions only if you make them. Undo and appreciate the original choice.
3. In `pause`, delete the `if (state.status !== 'playing')` guard line. Expect: ❌ error building the `'paused'` object — `state.track` doesn't exist on the full union. The narrowing wasn't decoration; it was what made the field readable.
4. Try building `{ status: 'error' }` with no message: `const e: PlayerState = { status: 'error' };`. Expect: ❌ error — `message` is required. An error state without a message is one more impossible state that can't exist.
5. Write a new transition `stop(state: PlayerState): PlayerState` that returns `{ status: 'stopped' }` from anywhere. Expect: ✅ compiles with no narrowing needed — because `'stopped'` needs nothing from the old state. Notice how the *shape of the data* told you how much checking the function needed.
