# 📘 Learning Guide: JSON Visitor

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What is this exercise about?

JSON is the most common data in your programs, and almost nobody types it. `JSON.parse` returns `any`, so the shape stops being checked the moment data enters — and a function that walks JSON gets to *guess* what it might meet.

The guess in this exercise is one case short. JSON has six kinds of value: string, number, boolean, `null`, array, object. The walker tests for arrays, then for `typeof value === 'object'`, then treats the rest as a leaf. That looks complete right up until a `null` appears, because JavaScript famously reports `typeof null` as `'object'` — so `null` falls into the object branch, `Object.keys(null)` throws, and the config page dies on a perfectly valid config file.

The fix is to write `Json` down as a **recursive union type** and hand every traversal a **visitor**: an object with one handler per variant. Then "we forgot a case" isn't something a code reviewer has to notice — it's something the build refuses to accept.

## 2. Concepts you need first

### 2.1 `typeof null` is `'object'` (the fact behind the bug)

```ts
typeof 'hi';       // 'string'
typeof 3;          // 'number'
typeof true;       // 'boolean'
typeof null;       // 'object'  ← a 1995 bug, permanent for compatibility
typeof [1, 2];     // 'object'
typeof { a: 1 };   // 'object'
typeof (() => 1);  // 'function'
```

Two consequences worth memorizing: `typeof` alone can never tell you "this is a real object", and `Array.isArray` exists precisely because `typeof` can't distinguish arrays either. Any code branching on `typeof x === 'object'` must handle `null` *first*.

### 2.2 Recursive type aliases

A type can refer to itself:

```ts
// ❌ what people write, which stops one level deep
type Json = string | number | boolean | null | unknown[] | object;

// ✅ what JSON actually is, all the way down
type Json = string | number | boolean | null | Json[] | { [key: string]: Json };
```

TypeScript has allowed a type alias to appear inside its own array/object members since 3.7. This one definition covers documents of any depth, and it is *closed*: functions, `undefined`, `Date`s and symbols are not members, so they can't get in.

### 2.3 An index signature describes "any string key"

```ts
type JsonObject = { [key: string]: Json };
```

Read as: *any* property name is allowed, and every value is a `Json`. That's the right model for parsed JSON, where you don't know the keys ahead of time. (Contrast with an `interface` listing named fields — ts#03's lesson. Both are useful; here the keys are genuinely unknown.)

### 2.4 Narrowing removes members of a union (ts#09, refresher)

```ts
declare const value: Json;
if (value === null) {
  // value: null
} else {
  // value: string | number | boolean | Json[] | { [key: string]: Json }
  // ← null is GONE from the type; the compiler tracked the check
}
```

This is why the refactored code tests `null` first. It isn't a convention you must remember — after that `if`, `null` is genuinely not in the type any more, and the compiler knows it.

`switch (typeof value)` narrows the same way:

```ts
switch (typeof value) {
  case 'string':  // value: string
  case 'number':  // value: number
  case 'object':  // value: Json[] | { [key: string]: Json }  (null already removed)
}
```

### 2.5 `never` and `assertNever` (ts#12, refresher)

`never` is the type with no values. If a switch handles every member of a union, the value in `default` has narrowed to `never`:

```ts
function assertNever(value: never): never {
  throw new Error(`Unhandled JSON variant: ${String(value)}`);
}
```

Passing a non-`never` value to it is a compile error — which is exactly the alarm you want when someone adds a variant to `Json`. The alternative, `default: return 'unknown'`, is the original's disease: it swallows the new case and returns a plausible-looking wrong answer.

### 2.6 The visitor pattern, typed

Instead of every consumer writing its own switch, write the switch **once** and let consumers supply handlers:

```ts
interface JsonVisitor<T> {
  string: (value: string, path: string) => T;
  number: (value: number, path: string) => T;
  boolean: (value: boolean, path: string) => T;
  null: (path: string) => T;
  array: (value: readonly Json[], path: string) => T;
  object: (value: { readonly [key: string]: Json }, path: string) => T;
}
```

Two guarantees for the price of one: the traversal is exhaustive (the switch has `assertNever`), and every *consumer* is exhaustive too, because an object literal missing a handler doesn't satisfy the interface. `T` is what a pass produces — `string[]` for the path lister, `string` for the describer, `number` for a node counter.

## 3. Walking through the original code

```ts
export function walk(value: any, path = '$'): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item: any, index: number) => walk(item, `${path}[${index}]`));
  }
  if (typeof value === 'object') {
    return Object.keys(value).flatMap((key) => walk(value[key], `${path}.${key}`));
  }
  return [`${path} = ${value.toString()}`];
}
```

Arrays first — correct, and necessary, since `typeof [] === 'object'`. Then objects. Then "everything else is a leaf".

Three variants are handled well (string, number, boolean all reach the leaf line). Arrays and objects recurse. That's five of six. The missing one is `null`, and it doesn't fall through to the leaf branch — it gets *captured* by `typeof value === 'object'` and handed to `Object.keys`, which throws.

```ts
export const lines = walk(JSON.parse(CONFIG_TEXT));
// TypeError: Cannot convert undefined or null to object
```

Then `describe`:

```ts
switch (typeof value) {
  case 'string': return 'text';
  case 'number': return 'number';
  case 'object': return Array.isArray(value) ? 'list' : 'section';
  default: return 'unknown';
}
```

No `boolean` case, so `describe(true)` returns `'unknown'`. The default makes the omission invisible — and, note, `null` here returns `'section'`, a *second* wrong answer hiding in the same function.

And the last line:

```ts
export const nonsense = walk(() => 42); // '$ = () => 42'
```

A function reached a JSON walker, because `any` accepts everything. No crash. Just output that is silently, confidently wrong — the failure mode that survives longest in production.

## 4. What's wrong with it (in beginner terms)

**Bug story — the config page that hated blank fields.** The deploy dashboard renders every setting as `path = value`. It works for months. Then someone clears the "after" hook in the UI, which writes `"after": null` — a completely ordinary JSON document — and the page goes blank with `Cannot convert undefined or null to object`. The on-call engineer reads a stack trace pointing at `Object.keys`, a function they didn't write, called from a recursive walker with no obvious defect. The actual bug is a case that was never listed, in a function whose parameter type was `any` so nobody could list them.

**Why `any` is the enabler, not the bug.** `walk` would be perfectly correct if `null` couldn't appear. `any` is what made "can `null` appear?" an *unaskable* question — there was no type to enumerate. Compare with the refactored version, where writing `Json` forces you to name all six variants before you write a line of logic.

**Why silent defaults make it worse.** `default: return 'unknown'` and `default: return 0` feel defensive. They are the opposite: they guarantee that a missing case produces a *plausible* answer, which is how a bug reaches your users instead of your build.

## 5. Try it yourself first!

1. **Vague hint:** the crash happens because one JSON variant is invisible to `typeof`. List every kind of value JSON can hold — there are six — and check which of them the original's branches actually distinguish.
2. **Warmer:** write `type Json = ...` as a union of those six. The array and object arms have to mention `Json` again; that's allowed, and it's what makes the type work at any depth.
3. **Warmer still:** rewrite `walk` to take `Json` instead of `any`. Test `value === null` *before* the `typeof` switch, and see what the compiler now knows inside the `'object'` case.
4. **Exhaustiveness:** add `default: return assertNever(value);`. If it compiles, your switch is complete; if it doesn't, the error message names the variant you missed.
5. **The visitor:** extract the six behaviours into a `JsonVisitor<T>` interface and make `visit` take one. Rewrite both the path lister and `describe` as visitors — notice that `describe` can no longer have an `'unknown'` bucket.
6. **Prove it:** write `@ts-expect-error` tests for `visit(() => 42, ...)`, `visit(undefined, ...)`, a visitor missing its `null` handler, and a nested literal with a function three levels down.

## 6. Understanding the refactored solution

The type, first, because everything follows from it:

```ts
export type Json =
  | string | number | boolean | null
  | Json[]
  | { [key: string]: Json };
```

Six arms, two of them recursive. This is a *closed* model: it says what JSON is and, just as importantly, what it isn't.

The traversal:

```ts
export function visit<T>(value: Json, visitor: JsonVisitor<T>, path = '$'): T {
  if (value === null) return visitor.null(path);
  switch (typeof value) {
    case 'string': return visitor.string(value, path);
    case 'number': return visitor.number(value, path);
    case 'boolean': return visitor.boolean(value, path);
    case 'object':
      return Array.isArray(value) ? visitor.array(value, path) : visitor.object(value, path);
    default:
      return assertNever(value);
  }
}
```

The `null` line is the whole bug fix, and it is load-bearing in two ways: it handles the case, *and* it narrows `null` out of the type so the `'object'` branch is provably safe. `assertNever(value)` compiles only because the other five arms are complete — it is a claim the compiler re-verifies on every build.

The visitors:

```ts
export const pathLines: JsonVisitor<string[]> = { string: ..., null: (path) => [`${path} = null`], ... };
export const describe: JsonVisitor<string> = { ..., boolean: () => 'boolean', null: () => 'empty' };
```

Both of the original's wrong answers are now correct *by construction*: `describe` has to have a `boolean` handler and a `null` handler, because the interface has those slots. This is the real leverage of the visitor pattern — exhaustiveness stops being a property of one function and becomes a property of the *type*, inherited by every consumer, including ones written next year.

The type tests earn their place at the bottom. `brokenVisit` is a miniature traversal over `Json | undefined` whose `assertNever` fails — a live demonstration that adding a variant breaks every visitor at compile time, which is the extension story the original could never tell. The rest close the door on the values `any` used to let in: functions, `undefined`, `Date`s, and — the nicest one — a function buried three levels deep inside an object literal, caught because the recursion in `Json` checks all the way down.

## 7. Words you learned (glossary)

- **Recursive type alias** — a type that mentions itself, describing structures of arbitrary depth.
- **Index signature (`{ [key: string]: T }`)** — an object type with unknown key names and known value types.
- **Union type** — a value that is one of several alternatives; JSON has exactly six.
- **Closed model** — a type that enumerates every possibility, so anything else is rejected.
- **Narrowing** — the compiler removing union members as checks succeed or fail (ts#09).
- **`typeof` narrowing** — narrowing driven by `typeof x === '...'`, with `null` as its famous blind spot.
- **`Array.isArray`** — the only reliable array check, needed because `typeof [] === 'object'`.
- **`never`** — the type with no values; what a fully-handled union narrows to.
- **`assertNever`** — a function taking `never`, used to turn a missed case into a compile error (ts#12).
- **Silent default** — a `default` branch returning a plausible value, which hides missing cases.
- **Visitor pattern** — one traversal plus a per-variant handler object, so consumers can't skip a case.
- **Exhaustiveness** — the guarantee that every variant of a union is handled somewhere.

## 8. Experiments to try on the plane (no internet needed)

Run `npm run typecheck` from the repo root after each change, then undo it.

1. Add `| undefined` to the `Json` union in `refactored/json.ts`. **Expected:** ❌ error at `assertNever(value)` in `visit` — "Argument of type 'undefined' is not assignable to parameter of type 'never'" — plus an "Unused '@ts-expect-error'" on the `visit(undefined, describe)` test, since `undefined` is now legal input. One type edit, a complete to-do list. Undo.
2. Move `if (value === null)` to *after* the switch. **Expected:** ❌ error in the `'object'` case — `Array.isArray` still narrows, but the object arm's type now includes `null`, which the visitor's `object` handler refuses. The compiler enforces the ordering the original got wrong.
3. Delete the `boolean` case from `visit`'s switch. **Expected:** ❌ error at `assertNever` naming `boolean`. Notice the error appears at the *default*, not at the missing case — that's the sentinel doing its job.
4. Change `default: return assertNever(value);` to `default: return visitor.string('?', path);`. **Expected:** ✅ compiles, and you have re-invented the original's silent default. Nothing else changed; safety was one line.
5. Write a third visitor: `const countLeaves: JsonVisitor<number>` returning `1` for scalars and summing over children. **Expected:** ✅ compiles once all six handlers exist — and the compiler tells you which one you forgot while you type it.
6. Try `const bad: Json = { a: new Map() };`. **Expected:** ❌ — `Map` isn't a `Json`. Then try `const ok: Json = JSON.parse('{}');` **Expected:** ✅ compiles, because `JSON.parse` returns `any`, which is assignable to anything. That's the reminder that `Json` protects everything *downstream* of the boundary, and the boundary itself still needs ts#13's validation.
