# 📘 Learning Guide: Typed Errors

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What is this exercise about?

When something goes wrong in JavaScript, code `throw`s a value, and somewhere else a `try/catch` catches it. Here's the detail almost everyone glosses over: **you can throw anything** — an `Error` object, a plain string, a number, even `undefined`. So inside `catch (err)`, you genuinely do not know what `err` is.

The original code writes `catch (err: any)`, which lets it *pretend* it knows — and the pretending causes two bugs: a crash *inside the error handler itself*, and real bugs getting relabeled as harmless user mistakes. The refactor types the caught value as `unknown` and earns access to it with checks. It's a tiny change with a big payoff: the compiler starts guarding the one place developers reliably cheat.

## 2. Concepts you need first

### throw / try / catch (quick refresher)
`throw` stops the current function and hands a value up the call stack until some `try/catch` catches it:

```ts
function risky() { throw new Error('boom'); }
try {
  risky();
} catch (err) {
  // execution lands here; err is whatever was thrown
}
```

If nothing catches it, the program crashes with that value.

### Error classes and subclasses
`Error` is the built-in class for failures; it has a `.message` and a `.name`. You can **extend** it (make a subclass) to create your own named failure that carries extra evidence:

```ts
class ValidationError extends Error {
  constructor(message: string, public readonly field: string) {
    super(message);              // pass message to the parent Error
    this.name = 'ValidationError';
  }
}
```

`public readonly field: string` in the constructor is TypeScript shorthand: it declares a `field` property and assigns it automatically. Now a `ValidationError` remembers *which* field was invalid.

### Anything can be thrown
This is the fact the whole exercise turns on. All of these are legal JavaScript:

```ts
throw new Error('normal');
throw 'boom';        // a plain string!
throw undefined;     // yes, really
throw { code: 42 };  // any object
```

Your `catch` block might receive any of them — including things thrown by libraries three levels below your code.

### `any` vs `unknown` in a catch
`any` means "stop type-checking this value" — every property access compiles, checked or not. `unknown` means "some value, no promises" — *nothing* compiles until you check:

```ts
try { /* ... */ } catch (err: unknown) {
  err.message;                    // ❌ Error: 'err' is of type 'unknown'
  if (err instanceof Error) {
    err.message;                  // ✅ OK — narrowed to Error
  }
}
```

A catch variable may only be annotated `any` or `unknown` — those are the two choices, and this exercise is about why `unknown` is the honest one. (There's also a compiler flag, `useUnknownInCatchVariables` — included in `strict` mode since TypeScript 4.4 — that makes un-annotated `catch (err)` default to `unknown`. Writing `: unknown` explicitly documents the intent either way.)

### `instanceof` narrowing
`x instanceof SomeClass` is a runtime check ("was x created by this class or a subclass?") that TypeScript also understands at compile time. Inside the `if`, the type narrows:

```ts
if (err instanceof ValidationError) {
  err.field;   // ✅ OK — the compiler knows .field exists here
}
err.field;     // ❌ Error outside the check
```

**Narrowing** means the compiler shrinking a broad type (`unknown`) to a precise one inside a branch that proved it. (Exercise 09's folder tours all the narrowing tools.)

### Expected vs unexpected failures — and rethrowing
Some failures are *yours*: you threw `ValidationError` on purpose for bad input, and you know how to respond. Everything else — a `TypeError` from a bug, a weird string from a library — is *not yours*, and pretending to handle it hides real defects. The discipline: handle exactly what you recognize, and `throw err;` (**rethrow**) the rest so it stays loud and visible.

### `declare const` (used in the type tests)
`declare const caught: unknown;` tells the compiler "assume a value of this type exists" without creating one at runtime. It's a way to set up a value purely so type tests can poke at it.

### `@ts-expect-error` — type tests
A comment asserting the NEXT line must fail to compile. If the line compiles anyway, the comment itself becomes the error. The refactor uses it to prove the original's crash lines are now uncompilable.

## 3. Walking through the original code

The throwing side is done well:

```ts
export function parseAge(input: string): number {
  const age = Number(input);
  if (!Number.isInteger(age)) {
    throw new ValidationError('Age must be a whole number', 'age');
  }
  return age;
}
```

A real error class, a clear message, evidence attached (`'age'`). No problems here.

The catching side is where it fumbles:

```ts
} catch (err: any) {
  return `${err.field}: ${err.message.toUpperCase()}`;
}
```

With `any`, the compiler waves through `err.field` and `err.message.toUpperCase()` without asking whether they exist. If the caught value *is* a `ValidationError`, fine. But if some library below threw the string `'boom'`, then `err.field` is `undefined` (rendered as the text "undefined:"), and `err.message` is also `undefined` — so `.toUpperCase()` crashes with a `TypeError`. The error *handler* crashed while handling an error. The original failure is now buried under a second one.

The second function fumbles the other way:

```ts
} catch (err: any) {
  return 'invalid input';
}
```

*Every* failure — including a genuine bug inside `parseAge` (say, a future edit introduces a `TypeError`) — becomes the message "invalid input." A defect in your code is relabeled as the user's mistake. Nobody investigates, because nothing looks broken.

## 4. What's wrong with it (in beginner terms)

**Flaw 1: assuming the caught value is the one you hoped for.** Runtime story: your code runs in a browser. A network layer three libraries down throws a `DOMException`, or someone's old code does `throw 'timeout'`. Your catch block does `err.message.toUpperCase()` → `TypeError: Cannot read properties of undefined` → the user sees a crash originating *in your error handler*, and the stack trace points away from the real cause. Debugging this at 2am is miserable, because the first failure (the thing that was thrown) is masked by the second (the handler's crash).

**Flaw 2: swallowing the unexpected.** Runtime story: a refactor introduces a bug so `parseAge` sometimes throws a `TypeError`. Users type perfectly valid ages and see "invalid input." Support tickets say "your form rejects 42." The team checks the validation rules — which are fine — and closes the tickets. The actual bug lives on for months, because the catch-all relabeled a defect as a user error.

**Why `any` is the enabler:** both bugs required the compiler to *not ask questions*. `any` is exactly that: a promise to never ask. The fix isn't more care — it's a type that makes carelessness uncompilable.

## 5. Try it yourself first!

1. **Vague hint:** the throws are fine. Only the two `catch` blocks need to change. What's the honest type for "literally anything might land here"?
2. **Warmer:** change both to `catch (err: unknown)` and run the typecheck. Read the errors — the compiler is now pointing at every unsafe access.
3. **Warmer still:** how do you prove to the compiler that `err` is a `ValidationError`? (A runtime keyword that TypeScript also understands. See section 2.)
4. **Specific:** inside `if (err instanceof ValidationError) { ... }` return the friendly message; after the `if`, `throw err;` — the rethrow is the discipline, not an afterthought.
5. **Bonus:** write `errorMessage(err: unknown): string` that returns `err.message` for `Error`s, `err` itself for strings, and `JSON.stringify(err)` otherwise. Every codebase eventually needs this helper; better to write it once than hand-roll it wrong at each log site.

## 6. Understanding the refactored solution

The main handler:

```ts
} catch (err: unknown) {
  if (err instanceof ValidationError) {
    return `${err.field}: ${err.message}`; // narrowed: field exists
  }
  throw err; // not ours -> rethrow
}
```

Three moves. `unknown` makes every unchecked access a compile error — you *cannot* write the original's crash line anymore. `instanceof ValidationError` narrows: inside the branch, `.field` and `.message` are typed and safe. And the rethrow keeps the promise: anything unrecognized stays loud instead of being absorbed.

The logging helper:

```ts
export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return JSON.stringify(err);
}
```

This is narrowing as a ladder: is it an `Error`? Use its message. A string? Use it directly. Anything else? Serialize it. Safe message extraction from arbitrary thrown values, written once.

The second handler fixes the swallowing procedurally:

```ts
if (err instanceof ValidationError) {
  return `invalid: ${err.field}`;   // the failure we OWN: handled
}
console.error(`unexpected failure: ${errorMessage(err)}`);
throw err;                           // everything else: logged AS unexpected, rethrown
```

The unexpected path never relabels. Bugs stay visible as bugs.

The type tests at the bottom re-create the original's two crash lines against a `declare const caught: unknown;` and assert — with `@ts-expect-error` — that neither compiles now. The final line shows the narrowed version compiles fine. The original's runtime crashes have become compile-time squiggles, permanently.

## 7. Words you learned (glossary)

- **`throw`** — abort and hand a value up the call stack.
- **`try/catch`** — the block that intercepts a thrown value.
- **Error class / subclass** — a class `extends Error` giving a failure a name and payload.
- **`super(...)`** — calling the parent class's constructor.
- **Constructor property shorthand** — `public readonly field: string` declares and assigns a property in one stroke.
- **`any`** — the type that disables checking; in a catch, it lets you assume what was thrown.
- **`unknown`** — the type meaning "no promises"; forces a check before any use.
- **`useUnknownInCatchVariables`** — the strict-mode flag making catch variables default to `unknown`.
- **Narrowing** — the compiler shrinking a type inside a branch that proved it.
- **`instanceof`** — runtime class check that also narrows the type.
- **Rethrow** — `throw err;` inside a catch: pass on what you can't handle.
- **Expected failure** — one you threw on purpose and know how to answer.
- **Unexpected failure** — anything else; log it as such and rethrow.
- **Swallowing** — catching an error and hiding it (returning a bland default).
- **`declare const`** — announce a value's existence for type-checking only.
- **`@ts-expect-error`** — a comment asserting the next line must fail to compile.

## 8. Experiments to try on the plane (no internet needed)

Run `npm run typecheck` from the `typescript/` folder after each change (then undo it).

1. **Feel `unknown` push back.** In `refactored/errors.ts`, inside `handleRequest`'s catch, add `err.message;` above the `instanceof` check. Expected: ❌ `'err' is of type 'unknown'`. Move the same line *inside* the `instanceof` branch. Expected: ✅ compiles.
2. **Re-create the original bug.** Change `catch (err: unknown)` to `catch (err: any)` in `handleRequest` and add back `err.message.toUpperCase()`. Expected: ✅ it compiles — which is exactly the problem. `any` accepts the crash. Undo it and notice `unknown` wouldn't.
3. **Break a type test.** Delete the `// @ts-expect-error` above `export const f = caught.field;`. Expected: ❌ that line now errors for real — the test was live.
4. **Extend the taxonomy.** Add `class RangeFailure extends Error { constructor(public readonly max: number) { super('too big'); } }` and a second `instanceof RangeFailure` branch in `handleWithLogging` returning `` `max is ${err.max}` ``. Expected: ✅ compiles; each branch sees only its own class's fields.
5. **Probe `errorMessage`.** Add `const s: string = errorMessage(42);`. Expected: ✅ compiles and would return `"42"` — the helper's `unknown` parameter accepts anything, and its ladder of checks handles the "anything" safely.
