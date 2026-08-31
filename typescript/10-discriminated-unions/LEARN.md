# 📘 Learning Guide: Discriminated Unions

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What is this exercise about?

The code models the lifecycle of a network request — the kind every app has: nothing has started yet (*idle*), we're waiting (*loading*), it worked and we have data (*success*), or it failed and we have an error message (*error*). A render function turns the current state into display text.

The type-level problem: the original models this as ONE object with a boolean and two optional fields: `{ isLoading, data?, error? }`. That type can represent combinations that make no sense — loading *while also* having data *and* an error, or finished with *neither*. The compiler happily accepts nonsense because the type describes *fields*, not *states*. The lesson — the single most important pattern in TypeScript — is to model each state as its own variant, tagged with a label the compiler can switch on. This is called a **discriminated union**.

## 2. Concepts you need first

### Optional fields recap (`?`)

`data?: string` means the field may be absent; reading it gives `string | undefined`. (Exercise 04 covers this deeply.) The relevant curse here: if a field is optional in the type, it's optional *everywhere* — even in code paths where you "know" it must exist, the compiler doesn't, so every read needs a fallback.

### Counting what a type can represent

A useful habit: count how many value-shapes a type allows versus how many are *meaningful*.

```ts
interface RequestState {
  isLoading: boolean;   // 2 possibilities
  data?: string;        // present or absent: 2
  error?: string;       // present or absent: 2
}
// 2 × 2 × 2 = 8 representable combinations. Real states: 4.
```

Four of the eight are lies — like `{ isLoading: true, data: "old", error: "boom" }`. Every lie the type permits is a bug that can exist at runtime and a defensive check someone must write. The design goal has a name: **make impossible states unrepresentable** — choose types so nonsense doesn't compile.

### Object types in a union

You can union object types just like primitives:

```ts
type Shape =
  | { kind: 'circle'; radius: number }
  | { kind: 'square'; side: number };
```

The leading `|` on the first line is optional style; it just makes the list line up. Each line is one **variant** — a complete object type of its own, carrying exactly the fields that variant needs. A circle has a radius and NO side; a square has a side and NO radius.

### The discriminant (the tag field)

Notice each variant above has a `kind` field with a different **literal type** (`'circle'` vs `'square'`). A shared field whose type is a different literal in each variant is called the **discriminant** — the tag that identifies which variant you're holding.

### Narrowing on the discriminant

Check the tag, and the compiler narrows the whole object to that variant:

```ts
function area(s: Shape): number {
  switch (s.kind) {
    case 'circle':
      return Math.PI * s.radius ** 2;  // ✅ s is the circle variant — radius exists
    case 'square':
      return s.side ** 2;              // ✅ s is the square variant — side exists
  }
}
```

Inside `case 'circle'`, `s.radius` is a plain `number` — not optional, no fallback needed — because the *circle variant* declares it. And `s.side` would be an error there, because circles don't have one. An `if (s.kind === 'circle')` works exactly the same way; `switch` just reads nicely when there are several variants.

### Why this beats optional fields

With optionals, presence is a *runtime hope*. With a discriminated union, presence is *guaranteed by which variant you're in*. The compiler enforces both directions: you can't build a success without data, and you can't read data until you've proven you're in success.

```ts
declare const s: Shape;
s.radius;   // ❌ Error: Property 'radius' does not exist on type 'Shape'
            //    (it only exists after narrowing to the circle variant)
```

## 3. Walking through the original code

Open `original.ts`. The type:

```ts
export interface RequestState {
  isLoading: boolean;
  data?: string;
  error?: string;
}
```

One bag of fields for all four situations. The render function does its best:

```ts
if (state.isLoading) return 'loading…';
if (state.error) return `error: ${state.error}`;
if (state.data) return `data: ${state.data}`;
return 'idle';
```

Looks reasonable — but notice it *decides* precedence: what should render for `{ isLoading: true, error: 'boom' }`? The type forced the function to invent an answer to a question that shouldn't exist.

Then the file constructs two nonsense states, and the compiler approves both:

```ts
export const nonsense1: RequestState = {
  isLoading: true,
  data: 'stale results',
  error: 'also an error??',
}; // loading AND data AND error — compiles.

export const nonsense2: RequestState = { isLoading: false };
// finished with neither data nor error — compiles.
```

And the second-order cost:

```ts
if (!state.isLoading && !state.error) {
  return state.data ?? '(data missing in success state??)';
}
```

Logically this is the success branch — data "must" exist. But the type says `data` is optional everywhere, so the code needs a `??` fallback for a case the author believes is impossible. When you're writing fallback text with `??` in it, the type has failed you.

## 4. What's wrong with it (in beginner terms)

**Flaw 1 — stale data on screen.** Runtime story: the user searches for "cats," results arrive, then they search for "dogs." The code sets `isLoading: true` — but nobody cleared `data`, because the type doesn't require it. The screen (or any code reading `state.data`) still has "cats" results *during* the dogs load. Users see stale results flash; sometimes stale results get *submitted*. The type permitted `loading + data` to coexist, so eventually they did.

**Flaw 2 — the impossible error+success.** A retry path sets `error` but an old `data` survives from before. Now `{ data, error }` both exist. Which one does the UI show? Depends on branch order in each render function — different components may disagree on the SAME state.

**Flaw 3 — finished-with-nothing.** `{ isLoading: false }` — is that idle? Success with empty data? A bug? The type can't say, so every reader guesses.

**Flaw 4 — defensive code as a symptom.** The `?? '(data missing??)'` fallback exists purely because the type can't express "in success, data is always present." Multiply that fallback across every component that reads request state, and the type's imprecision becomes a tax on the whole codebase.

## 5. Try it yourself first!

1. **Vague hint:** Stop asking "what fields might this object have?" and ask "what STATES can this request be in?" List them. There are four.
2. **Warmer:** For each state, list exactly the data that state carries. Idle: nothing. Loading: nothing. Success: the data. Error: the error message. Nothing overlaps!
3. **Warmer still:** Write one object type per state, each with a `status` field holding a distinct literal: `{ status: 'idle' }`, `{ status: 'loading' }`, `{ status: 'success'; data: string }`, `{ status: 'error'; error: string }`. Join them with `|` into one type.
4. **Specific:** Rewrite `renderRequest` as a `switch (state.status)` with four cases. Notice: no optionals, no `??`, no precedence decisions — each case has exactly its own fields.
5. **The victory lap:** try to construct `nonsense1` against your new type (`{ status: 'loading', data: 'stale' }`). It should refuse to compile. You didn't add a check — you made the bug *unwritable*.

## 6. Understanding the refactored solution

Open `refactored/request.ts`.

**The union of states:**

```ts
export type RequestState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: string }
  | { status: 'error'; error: string };
```

Four variants, one per real state. Count the representable values: exactly the four meaningful ones. The nonsense combinations aren't *checked against* — they're *inexpressible*. Note what's absent: the loading variant has no `data` field at all, so "stale data during load" cannot be written.

**The discriminant switch:**

```ts
switch (state.status) {
  case 'success':
    return `data: ${state.data}`;   // data: string. present. certain.
```

Inside each case, the compiler has narrowed `state` to that exact variant. `state.data` in the success case is a plain, guaranteed `string`. The fallbacks disappeared because the *uncertainty* disappeared.

**`summarize` shows `if` narrowing too:**

```ts
if (state.status === 'success') {
  return state.data;   // no ?? fallback — the type PROVES it's there
}
```

**Transitions replace whole states:** `toSuccess(data)` returns a fresh `{ status: 'success', data }` object. You don't *edit* a loading state into a success state (that's how stale fields survive) — you replace it wholesale.

**The type tests** pin all four nonsense shapes as must-not-compile, including the subtle one: `state.data` without narrowing first is an error, because `data` only exists on one variant.

**Why this is THE lesson:** this same shape — a `status`/`kind`/`type` tag plus per-variant fields — models order lifecycles, wizard steps, reducer actions, parser nodes, and success/failure results. The recipe is mechanical: list the real states → one variant per state → each variant carries exactly its own data → tag with a literal field → narrow with `switch`. Learn it once, use it for a career.

## 7. Words you learned (glossary)

- **Variant** — one alternative object shape inside a union; represents one state.
- **Discriminant** — the shared tag field (`status`, `kind`, `type`) whose literal type differs per variant.
- **Discriminated union** — a union of variants distinguishable by their discriminant; also called a "tagged union."
- **Narrowing on the discriminant** — checking the tag so the compiler resolves which variant you hold.
- **Impossible state** — a value combination that's representable in the type but meaningless in reality.
- **"Make impossible states unrepresentable"** — design types so nonsense fails to compile instead of needing runtime checks.
- **Literal type** — a type of exactly one value, like `'loading'`; what makes discriminants work.
- **Exhaustive switch** — a switch covering every variant; exercise 12 makes the compiler enforce this.
- **Defensive code** — checks/fallbacks written against states you believe can't happen; a symptom of loose types.
- **Wholesale replacement** — building a new state object instead of mutating fields of the old one.

## 8. Experiments to try on the plane (no internet needed)

Run `npm run typecheck` from the `typescript/` folder after each change. Undo between experiments.

1. **In `refactored/request.ts`**, in `renderRequest`, inside `case 'loading':`, change the return to `return \`loading… \${state.data}\`;`. Expected: ❌ error — "Property 'data' does not exist on type '{ status: "loading"; }'." The loading variant simply has no data — stale-data bugs can't be typed.
2. **In `refactored/request.ts`**, delete the entire `case 'error':` block from the switch. Expected: ❌ error at the function — with no case handling `'error'`, the function can fall through without returning, so TypeScript complains the function doesn't always return a string (roughly: "Function lacks ending return statement and return type does not include 'undefined'"). A missing state is a compile error — and exercise 12 sharpens this further.
3. **In `refactored/request.ts`**, add a fifth variant to the union: `| { status: 'cancelled' }`. Expected: ❌ same "lacks ending return" error in `renderRequest` — adding a state instantly flags every switch that doesn't handle it. This is the maintenance superpower: the compiler generates your todo list.
4. **In `refactored/request.ts`**, in `summarize`, change the condition to `if (state.status !== 'success')` and swap the two returns. Expected: ✅ compiles — narrowing works by exclusion too: in the `else`-side, only success remains. Hover `state` after the early return to see it.
5. **In `refactored/request.ts`**, change the success variant to make data optional: `{ status: 'success'; data?: string }`. Expected: ❌ two errors — `summarize`'s `return state.data;` now returns `string | undefined` (not `string`), and the `nonsense2` type test (`{ status: 'success' }`) now COMPILES, so its `@ts-expect-error` reports as unused. The type tests are guarding the design itself. Restore.
