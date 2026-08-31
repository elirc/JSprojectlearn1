# 📘 Learning Guide: The Unknown Boundary

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What is this exercise about?

A game saves progress as JSON text (in something like the browser's localStorage). Loading means: parse the text back into an object and use it — player name, level, inventory.

The type-level problem: `JSON.parse` will hand you *whatever the string contained*. The type system cannot see inside a string at compile time. So how do you go from "some text arrived" to "this is a `SaveGame`" *honestly*? The original just declares it so. The refactor proves it, with runtime checks the compiler understands.

## 2. Concepts you need first

### JSON and `JSON.parse` (JavaScript refresher)

**JSON** is a text format for data: `'{"level":9}'` is a *string* that describes an object. `JSON.parse(text)` turns that string into a real JavaScript value, and `JSON.stringify(value)` goes the other way. Crucially, `JSON.parse` can produce *anything* — an object, an array, a number, a string — depending on the text. It can also **throw** an error if the text is not valid JSON.

### `any` — the type that turns checking off

`any` is TypeScript's escape hatch: a value typed `any` can be assigned to anything and used in any way, with zero checking:

```ts
const x: any = 'hello';
const n: number = x;      // ✅ compiles — but n is really a string!
x.spin.around();          // ✅ compiles — crashes at runtime
```

The standard library declares `JSON.parse` as returning `any`. That single fact is this whole exercise. (Exercise 01's LEARN.md covers `any` in depth.)

### Return type annotations do NOT check anything at runtime

Writing `function f(): SaveGame` is a *compile-time claim*. If the body returns an `any`, the claim is accepted without evidence — `any` assigns to everything, remember. No code runs to verify the shape. Types are erased before the program executes; they are labels for the compiler, not guards for the machine.

### `unknown` — the honest opposite of `any`

`unknown` also means "could be anything," but with opposite manners. `any` says "do whatever you like." `unknown` says "you may do NOTHING until you check":

```ts
const u: unknown = JSON.parse('{}');
u.level;                       // ❌ Error: 'u' is of type 'unknown'
if (typeof u === 'string') {
  u.toUpperCase();             // ✅ OK — checked first, so narrowed to string
}
```

`unknown` is the right type for data arriving from outside: files, network, JSON, user input.

### Type predicates (`value is T`) — teaching the compiler your checks

A **type guard** is a function that checks a value's shape at runtime. A **type predicate** is its special return type, `value is T`, which tells the compiler: "if I return `true`, you may treat `value` as `T` from here on."

```ts
function isString(value: unknown): value is string {
  return typeof value === 'string';
}
const u: unknown = 'hi';
if (isString(u)) {
  u.toUpperCase();   // ✅ OK — the predicate narrowed unknown to string
}
```

The body is ordinary JavaScript returning a boolean; the `value is string` part is the bridge between your runtime check and the compiler's knowledge. (Exercise 11 introduced these.)

### Runtime shape-checking tools (plain JavaScript)

The guards in this exercise are built from four everyday checks:

- `typeof value === 'object'` — is it an object? (Careful: `typeof null` is also `'object'`, so you must also check `value !== null`.)
- `typeof value === 'string'` / `'number'` — primitive checks.
- `Array.isArray(value)` — is it an array?
- `arr.every(fn)` — does every element pass the test?

### `try` / `catch` (JavaScript refresher)

`JSON.parse` throws on malformed text. `try { ... } catch { ... }` runs the risky code and jumps to `catch` instead of crashing if it throws.

### Assertions that remove power are safe

`as` normally means "trust me" (dangerous — exercise 14). But `JSON.parse(x) as unknown` goes from `any` (all powers) to `unknown` (no powers). You cannot cause a bug by *giving up* capabilities. Direction matters: `any → unknown` is safe; `unknown → SaveGame` via `as` would be the original sin all over again.

## 3. Walking through the original code

Open `original.ts`. The interface is fine:

```ts
export interface SaveGame {
  playerName: string;
  level: number;
  inventory: string[];
}
```

The loader is one line, and that line is the whole bug:

```ts
export function loadGame(json: string): SaveGame {
  return JSON.parse(json);
}
```

`JSON.parse` returns `any`. `any` is assignable to `SaveGame` — to anything — so the compiler accepts the return with no questions. The annotation *launders* the value: dirty data goes in, comes out wearing a respectable type. Nothing checked anything.

The demo feeds it a poisoned payload:

```ts
export const looksFine = loadGame(
  '{"playerName":"Ada","level":"nine","inventory":"sword"}',
);
```

`level` is the string `"nine"`; `inventory` is a bare string, not an array. But `looksFine` is typed `SaveGame`, so every field is now a lie with a badge.

Downstream, honest-looking code detonates:

```ts
const next = save.level + 1;          // "nine" + 1 === "nine1"
`Carrying: ${save.inventory.join(', ')}`   // .join on a string → TypeError
```

`"nine" + 1` doesn't even crash — JavaScript happily concatenates and shows a player "reached level nine1". The `.join` call does crash — three functions away from the parse that caused it, where the stack trace points at innocent code.

## 4. What's wrong with it (in beginner terms)

**Flaw 1 — the annotation is a wish.** `: SaveGame` on the return looks like a safety feature. It checks nothing. Types exist only at compile time; the string's contents exist only at runtime; the two never meet unless *you* write code that inspects the value.

**Flaw 2 — the crash happens far from the cause.** Runtime story: an old app version wrote saves in a different format. New version reads them. `loadGame` "succeeds." The player plays for a while, opens the inventory screen, and the game crashes in `levelUpMessage` — a function that is completely correct. You debug the crash site for an hour before finding the parse. Laundered data always explodes in someone else's living room.

**Flaw 3 — the half-bugs are worse than the crash.** `"nine" + 1` producing `"nine1"` is displayed, saved back, maybe synced to a server. Silent corruption travels; crashes at least stop it.

**Flaw 4 — malformed JSON isn't handled either.** Feed `loadGame` a truncated string and `JSON.parse` throws right there. The signature `(json: string): SaveGame` claims loading always succeeds. It can't. The honest signature admits failure.

## 5. Try it yourself first!

1. **Vague hint:** The type says `SaveGame`, but nothing ever *looked* at the data. Where is the one place in the program the look should happen?
2. **Warmer:** Change the first line's local type: `const data: unknown = JSON.parse(json)`. Now the compiler blocks every use — good! Each error is a check you owe.
3. **Warmer still:** Write `isSaveGame(value: unknown): value is SaveGame`. Inside, you'll need: is it an object (and not null)? Is `playerName` a string? Is `level` a number? Is `inventory` an array of strings?
4. **Specific:** Change the return type to `SaveGame | null`. Return `null` when JSON.parse throws (wrap it in try/catch) and when `isSaveGame` says no. Watch callers get forced to handle the null (exercise 05's lesson).
5. **Check yourself:** The poisoned payload from the demo should now come back `null`, and a well-formed payload should come back fully typed — with zero `as SaveGame` anywhere.

## 6. Understanding the refactored solution

Open `refactored/savegame.ts`. It builds small guards first:

```ts
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
```

"Is this a non-null object?" — returning a type predicate so the compiler lets us index into it afterward. `Record<string, unknown>` means "object with string keys whose values we haven't checked yet" — honest at every level.

```ts
function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}
```

Then the main guard composes them:

```ts
export function isSaveGame(value: unknown): value is SaveGame {
  return (
    isRecord(value) &&
    typeof value.playerName === 'string' &&
    typeof value.level === 'number' &&
    Number.isInteger(value.level) &&
    isStringArray(value.inventory)
  );
}
```

Notice the order matters: `isRecord(value)` must come first so that `value.playerName` is even legal to write. Each `&&` narrows further. Also notice `Number.isInteger` — a *business* rule (levels are whole numbers) riding along with the type checks. Guards can be stricter than the type.

The loader does the three-step boundary dance:

```ts
let data: unknown;
try {
  data = JSON.parse(json) as unknown;
} catch {
  return null; // malformed JSON
}
return isSaveGame(data) ? data : null; // wrong shape
```

Step 1: parse, immediately demoting `any` to `unknown` (the file's ONE assertion, in the safe direction). Step 2: validate with the guard. Step 3: only then does the data get the type — the ternary's `data` is `SaveGame` *because the guard proved it*. The signature is `SaveGame | null`: failure is now visible in the type, and callers must check (the second type test pins this).

And `levelUpMessage` is unchanged, plainly trusting its `SaveGame` — the point of doing the checking *once at the door* is that the whole interior gets to relax.

## 7. Words you learned (glossary)

- **JSON** — a text format for data; strings that describe values.
- **Boundary** — any place where outside data enters your program (JSON, network, storage, forms).
- **`any`** — the type that disables checking entirely; what `JSON.parse` returns.
- **`unknown`** — "could be anything, so you may do nothing until you check"; the honest boundary type.
- **Laundering** — giving untrusted data a trusted type without checking (via annotation or `as`).
- **Type guard** — a runtime function that checks a value's shape.
- **Type predicate (`value is T`)** — a guard's return type that tells the compiler what a `true` result proves.
- **Narrowing** — the compiler shrinking a type after a check.
- **`Record<string, unknown>`** — an object with string keys and unchecked values.
- **`try` / `catch`** — run code that may throw; handle the throw instead of crashing.
- **Type erasure** — types vanish at compile time; they never inspect runtime data by themselves.

## 8. Experiments to try on the plane (no internet needed)

Run `npm run typecheck` from the `typescript/` folder after each change. Undo between experiments.

1. **In `refactored/savegame.ts`**, change the loader's line to `data = JSON.parse(json);` (drop `as unknown`). Expected: ✅ still compiles — `data` is annotated `unknown` already, so the demotion happens via the annotation. The explicit `as unknown` is documentation of intent; the annotation is what does the work here.
2. **In `refactored/savegame.ts`**, in `isSaveGame`, delete the `isRecord(value) &&` line. Expected: ❌ errors on the following lines — "'value' is of type 'unknown'". Without proving it's an object first, you may not read properties. Guards have an order, like exercise 05's guard clauses.
3. **In `refactored/savegame.ts`**, change the return type of `loadGame` to `SaveGame` and delete the two `return null`s (return `data` unconditionally... you'll need to remove the guard too). Expected: ❌ the moment `data` is `unknown` and unchecked, returning it as `SaveGame` refuses to compile. You literally cannot rebuild the original bug without writing `as SaveGame` or `any` — the compiler makes the lie explicit.
4. **In `refactored/savegame.ts`**, change `typeof value.level === 'number'` to `typeof value.level === 'string'`. Expected: ❌ error — the guard's checks no longer add up to `SaveGame` (`level` would be a string), so the `value is SaveGame` predicate is rejected. The compiler audits that your runtime checks actually prove the claimed type.
5. **At the bottom type tests**, try to "fix" `careless` by writing `loadGame('{}')!.playerName`. Expected: the `@ts-expect-error` becomes unused → ❌ error. The `!` bluff (exercise 05) technically compiles, which is exactly why this track treats `!` as a code smell: it would reintroduce the crash the null return exists to prevent.
