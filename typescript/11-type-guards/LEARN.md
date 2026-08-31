# 📘 Learning Guide: Type Guards

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What is this exercise about?

The code is a message dispatcher for a chat app. Messages arrive over a websocket (a live network connection) as parsed JSON — so at the door, each message is just "some value, shape unknown." Three shapes are possible: a chat message, a join announcement, and a ping. The dispatcher decides which one arrived and formats a response.

The type-level problem: the original "checks" the incoming value with a **cast** — `raw as ChatMessage | JoinMessage | PingMessage` — which verifies nothing. Garbage flows straight through: a chat message with no text renders `"ada: undefined"`, a message with a number for a username sails through, a plain string quietly becomes `'?'`. The lesson: TypeScript lets you write a function that *performs a real runtime check* AND *teaches the compiler its result* — a **user-defined type guard**, marked by the special return type `value is T`.

## 2. Concepts you need first

### `unknown` — the honest type for outside data (recap)

Data from a network could be anything, so its true type is `unknown`: usable only after you check it.

```ts
declare const raw: unknown;
raw.kind;             // ❌ Error: 'raw' is of type 'unknown'
if (typeof raw === "string") {
  raw.toUpperCase();  // ✅ OK — checked first
}
```

`unknown` is a locked door. The whole question of this exercise is: what's the *right key*?

### The wrong key: `as` (recap from exercise 09)

`raw as SomeType` relabels the value with no runtime check at all. Against `unknown` it's especially destructive — one cast and the lock is gone, whatever the value really is. A cast *claims*; it never *proves*.

### Narrowing works within a function… but doesn't travel

You could check the shape inline with `typeof`/`in` (exercise 09's tools). But real apps need the SAME check at many places, and inline checks get copy-pasted and drift apart. What you want is the check *packaged in a function*. Problem: an ordinary boolean function doesn't narrow —

```ts
function isString(v: unknown): boolean {
  return typeof v === "string";
}
declare const raw: unknown;
if (isString(raw)) {
  raw.toUpperCase();   // ❌ Error: still 'unknown' — the compiler doesn't
}                      //    look inside isString; 'boolean' says nothing
```

The check happened at runtime, but the *type knowledge* stayed trapped inside the helper.

### The right key: the type predicate `value is T`

Change the return type from `boolean` to a **type predicate** — `parameterName is Type`:

```ts
function isString(v: unknown): v is string {
  return typeof v === "string";
}
declare const raw: unknown;
if (isString(raw)) {
  raw.toUpperCase();   // ✅ OK — the compiler narrows raw to string here
}
```

`v is string` is a contract with the compiler: "when this function returns `true`, treat the argument as `string`." Now the check is written ONCE, and every call site gets both the runtime rejection and the compile-time narrowing. This is a **user-defined type guard**.

### The responsibility that comes with it

The compiler trusts your guard's *signature* — it does NOT verify your *body* does an honest job:

```ts
function isString(v: unknown): v is string {
  return true;   // ✅ compiles!! — and now every caller is lied to
}
```

A guard that returns `true` without checking is just a cast with extra steps. The value of a guard is exactly as good as the checks in its body. Write them honestly: check the tag AND the field types.

### `Record<string, unknown>` — "some object, fields unknown"

Before you can ask `value.kind === 'chat'`, you must know `value` is an object at all (and not `null` — JavaScript quirk: `typeof null === 'object'`). The type `Record<string, unknown>` means "an object with string keys whose values are unknown" — perfect for a just-verified object whose fields you'll check next:

```ts
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
```

Guards **compose**: little guards like this become building blocks inside bigger guards.

### Discriminated unions (recap from exercise 10)

The three message shapes share a `kind` field with a different literal in each — a discriminant. After a value is *proven* to be a `Message`, an ordinary `switch (msg.kind)` narrows to the exact variant. Guard at the boundary, discriminant inside: the two patterns click together.

## 3. Walking through the original code

Open `original.ts`. Three honest interfaces (`ChatMessage` with `kind: 'chat'`, `user`, `text`; `JoinMessage`; `PingMessage`). Then the dispatcher:

```ts
export function handleMessage(raw: unknown): string {
  const msg = raw as ChatMessage | JoinMessage | PingMessage;
```

The right instinct — the parameter is honestly `unknown`! — defeated in one line by the wrong tool. Nothing verified `raw` is even an object.

```ts
switch (msg.kind) {
  case 'chat':
    return `${msg.user}: ${msg.text}`;
```

The switch itself is fine — it's exercise 10's pattern. But it's running on unverified beliefs. The demo lines show the consequences, and every one *compiles*:

```ts
export const a = handleMessage({ kind: 'chat', user: 'ada' });
// text is missing -> "ada: undefined"

export const b = handleMessage({ kind: 'chat', user: 42, text: null });
// wrong types entirely -> "42: null"

export const c = handleMessage('not even an object');
// msg.kind on a string -> undefined -> '?' ... silently
```

The closing comment names the alternative trap: re-writing `typeof x === 'object' && x !== null && (x as any).kind === 'chat'` at every call site — the same check, copy-pasted with slight variations, drifting apart over time.

## 4. What's wrong with it (in beginner terms)

**Flaw 1 — garbage renders as chat.** Runtime story: a buggy client (or a malicious one — websockets receive whatever the other end sends) omits `text`. The server renders `"ada: undefined"` into the chat room for everyone. Another sends `user: 42, text: null` → `"42: null"` appears. Nothing crashed, so no alarms — the garbage just shipped to users' screens.

**Flaw 2 — the silent `'?'`.** A plain string arrives. `msg.kind` on a string is `undefined`, no case matches, and the default returns `'?'`. No log, no count, no trace — malformed input vanishes into a shrug. If 5% of messages are garbage, you'd never know.

**Flaw 3 — the cast checked nothing, by design.** `as` cannot fail at runtime. It's not a weak check; it is NOT a check. The type system was told a story and repeated it downstream as fact — `msg.user` typed `string` while holding `42`.

**Flaw 4 — the copy-paste alternative rots.** Without a shared guard, each place needing "is this a chat message?" writes its own probe. One forgets the null check, one forgets to verify `text`'s type, one uses `as any`. Same intended rule, N divergent implementations — validation logic drifting exactly like the duplicated interfaces of exercise 03.

## 5. Try it yourself first!

1. **Vague hint:** The fix is a function whose *return type* contains the word `is`. What should that function verify before saying yes?
2. **Warmer:** Layer the checks: (1) is it an object and not null? (2) does its `kind` match a known tag? (3) do that variant's fields have the right types? Each layer only makes sense after the previous.
3. **Warmer still:** Write the little base guard first: `isRecord(value: unknown): value is Record<string, unknown>`. Then build `isMessage(value: unknown): value is Message` on top of it (make a `type Message =` union of the three interfaces).
4. **Specific:** Inside `isMessage`, after `isRecord`, use `switch (value.kind)`: for `'chat'`, require `typeof value.user === 'string' && typeof value.text === 'string'`; for `'join'`, require the user; for `'ping'`, true; default false.
5. **Finish:** In `handleMessage`, start with `if (!isMessage(raw)) return 'dropped malformed message';` — then the original's switch works UNCHANGED below it, minus the `default` case. Verify the three garbage demo calls now produce "dropped" instead of nonsense.

## 6. Understanding the refactored solution

Open `refactored/messages.ts`.

**The union gets a name:** `type Message = ChatMessage | JoinMessage | PingMessage;` — one name for "any valid message," used by the guard and everyone else.

**The composable base guard:**

```ts
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
```

Every object-shaped guard needs this preamble; writing it once means no guard ever forgets the null check.

**The main guard earns its signature:**

```ts
export function isMessage(value: unknown): value is Message {
  if (!isRecord(value)) return false;
  switch (value.kind) {
    case 'chat':
      return typeof value.user === 'string' && typeof value.text === 'string';
    case 'join':
      return typeof value.user === 'string';
    case 'ping':
      return true;
    default:
      return false;
  }
}
```

Note it verifies the discriminant AND each variant's field types — precisely the holes the demo attacks poked (missing `text`, numeric `user`, non-object). The check and the type knowledge are now ONE artifact: they cannot drift apart, because they're the same function.

**The dispatcher, with a real rejection path:**

```ts
if (!isMessage(raw)) {
  return `dropped malformed message`;
}
switch (raw.kind) { ... }
```

Malformed input gets an explicit, countable outcome — not an accidental `'?'`. After the guard, `raw` is `Message`, and the discriminant switch runs on certainty; the `default` case is gone because no unknown kinds can arrive.

**The demo lines** replay the original's three attacks — all now "dropped." **The type tests** pin both directions: `unknown` stays locked without the guard, and inside an `if (isMessage(checked))` branch, `.kind` access typechecks.

**Where this leads:** at big API boundaries with dozens of shapes, hand-written guards get tedious — validation libraries (like zod) generate the same guard-plus-type pairing from a schema. Exercise 34 builds that bridge. The concept is identical: runtime validation that *produces* compile-time trust.

## 7. Words you learned (glossary)

- **Websocket** — a persistent two-way network connection; delivers arbitrary data from the other end.
- **Boundary** — where unverified outside data enters your typed program.
- **`unknown`** — the type for unverified data; unusable until narrowed.
- **Type assertion / cast (`as`)** — relabels a type with zero runtime checking; a claim, not a proof.
- **User-defined type guard** — a function returning `param is T` whose `true` result narrows the argument.
- **Type predicate** — the `value is T` return-type syntax itself.
- **Narrowing** — the compiler shrinking a type based on checks it can see.
- **`Record<string, unknown>`** — "an object with string keys, values unchecked" — the type after an is-it-an-object test.
- **Guard composition** — building bigger guards out of smaller ones (`isMessage` uses `isRecord`).
- **Discriminant** — the literal-typed tag field (`kind`) that distinguishes union variants.
- **Rejection path** — the explicit branch handling invalid input (log/drop/count), instead of silent fallthrough.
- **Schema validation library** — a tool (e.g. zod) that industrializes the guard pattern for large APIs.

## 8. Experiments to try on the plane (no internet needed)

Run `npm run typecheck` from the `typescript/` folder after each change. Undo between experiments.

1. **In `refactored/messages.ts`**, in `isMessage`, change the chat case to `return true;` (drop the field checks). Expected: ✅ still compiles — the compiler trusts your body! This is the "responsibility" point: the guard now lies, `handleMessage({kind:'chat'})` would render `"undefined: undefined"` again, and no tool catches it. The honesty of a guard is on you. Restore it.
2. **In `refactored/messages.ts`**, in `handleMessage`, delete the `if (!isMessage(raw))` block. Expected: ❌ error on `switch (raw.kind)` — "'raw' is of type 'unknown'." Without the guard, the door stays locked.
3. **In `refactored/messages.ts`**, change `isRecord`'s body to just `return typeof value === 'object';` (drop the null check). Expected: ✅ compiles (the compiler can't tell) — but now `isMessage(null)` would crash at runtime reading `value.kind`... actually try following the logic: `typeof null === 'object'` is true, so `null` passes `isRecord`, then `value.kind` on `null` throws. A guard bug = a boundary breach. Restore the null check.
4. **In `refactored/messages.ts`**, add a new message shape: `interface LeaveMessage { kind: 'leave'; user: string }`, add it to the `Message` union. Expected: ❌ error in `handleMessage`'s switch — the function no longer returns in all cases ("Function lacks ending return statement..."). Fix by adding a `case 'leave':` in BOTH `isMessage` and `handleMessage`. Notice the compiler walked you to the dispatcher but NOT to the guard's switch (its `default: return false` swallows new kinds silently — a guard maintenance gotcha worth remembering).
5. **In `refactored/messages.ts`**, at the bottom, add: `const v: unknown = { kind: 'ping' }; if (isMessage(v)) { const k: 'chat' | 'join' | 'ping' = v.kind; }`. Expected: ✅ no error — inside the guarded branch, `v` is a full `Message` and its `kind` is exactly the union of the three tags. The guard's promise, visible in miniature.
