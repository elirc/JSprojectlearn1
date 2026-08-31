# 🏋️ Practice: Narrowing

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

Work in a scratch file inside this folder (e.g. `practice.ts`, ending with `export {}` so it's a module) — `npm run typecheck` from the `typescript/` folder picks it up. Rule for every exercise: **zero `as`, zero `!`**.

## Exercises

### ⭐ 1. The elimination ladder (warm-up)

A spreadsheet stores each cell as one of three things. Write `renderCell(cell: string | number | boolean): string` — strings render as-is, numbers as `toFixed(2)`, booleans as `'yes'`/`'no'`. Write exactly **two** checks: the third case must fall out by elimination with no check of its own.

**Practices:** `typeof` narrowing plus narrowing-by-elimination — the compiler doing the sudoku.
**Hint:** two guard clauses that `return`, then a final unguarded `return`.
**Check:** `cell.toFixed(2)` written before any check must error with roughly `Property 'toFixed' does not exist on type 'string | number | boolean'`; add a `@ts-expect-error` test that catches it.

### ⭐⭐ 2. The `typeof 'object'` trap (core)

HTTP headers arrive as `string | string[] | null` (one value, several values, or absent). Write `headerValue(value: string | string[] | null): string` — `null` becomes `''`, an array joins with `'; '`, a string returns itself. Then write a second, deliberately broken copy that reaches for the array case with `if (typeof value === 'object')` and see what the compiler says about the branch body.

**Practices:** knowing which check to reach for — `Array.isArray` versus the `typeof` quirk where `null` also reports `'object'`.
**Hint:** in the broken version, hover `value` inside the `if`: the compiler kept `null` in the union, because `typeof null` really is `'object'`.
**Check:** the good version must compile with no casts; in the broken version `return value.join('; ')` must error with roughly `'value' is possibly 'null'` — pin it with `@ts-expect-error`.

### ⭐⭐ 3. Shapes you don't control (core)

A payments SDK hands you three unrelated interfaces with **no** shared tag field: `CardPayment { last4: string; expiryMonth: number }`, `BankPayment { iban: string }`, `CashPayment { received: number }`. Write `describePayment(payment: CardPayment | BankPayment | CashPayment): string` returning a sentence for each. Since the types are somebody else's, you can't add a discriminant — use the tool that works on shape alone.

**Practices:** the `in` operator as a narrowing tool for untagged shape unions.
**Hint:** pick a property unique to one variant per check; the last variant needs no check at all.
**Check:** `payment.iban` before any narrowing must error with roughly `Property 'iban' does not exist on type 'CardPayment | BankPayment | CashPayment'`; add a `@ts-expect-error` test for it, and note in a comment that exercise 10 shows the sturdier option when you *do* own the types.

### ⭐⭐ 4. What did we catch? (core)

A background job runner wraps every task in `try/catch`, and a `catch` binding is honestly `unknown`. Write `explainFailure(err: unknown): string`: a `RangeError` becomes `` `out of range: ${err.message}` ``, any other `Error` becomes `` `${err.name}: ${err.message}` ``, a thrown string returns itself, and anything else returns `'unknown failure'`. Order the `instanceof` checks so the `RangeError` branch is actually reachable.

**Practices:** `instanceof` narrowing on `unknown`, and the fact that subclass checks must come before superclass checks.
**Hint:** `RangeError` *is* an `Error`, so an `err instanceof Error` check placed first would swallow it — and the compiler will **not** warn you about that; ordering is your job.
**Check:** `err.message` as the very first line must error with roughly `'err' is of type 'unknown'` — pin it with `@ts-expect-error`. The finished function must compile with no casts.

### ⭐⭐⭐ 5. Type an untyped helper (challenge)

Here is a JS helper with no types. Give the parameter the honest union `string | number | string[] | null | undefined` and make the body compile unchanged apart from the annotation:

```js
export function toPort(input) {
  if (input == null) return 8080;
  if (typeof input === 'number') return input;
  if (Array.isArray(input)) return toPort(input[0]);
  const parsed = Number(input.trim());
  return Number.isNaN(parsed) ? 8080 : parsed;
}
```

**Practices:** reading someone else's runtime checks as narrowing steps — including the loose `== null`, which eliminates `null` *and* `undefined` in one move.
**Hint:** the recursive call is fine: inside the `Array.isArray` branch, `input[0]` is a `string`, which the parameter type accepts.
**Check:** must compile cleanly. Then copy the function and change `input == null` to `input === null`: `input.trim()` must now error with roughly `'input' is possibly 'undefined'` — pin that copy's line with `@ts-expect-error`.

### ⭐⭐⭐ 6. Narrow a recursive union (challenge)

Model JSON with a self-referencing type alias:

```ts
type Json = string | number | boolean | null | Json[] | { [key: string]: Json };
```

Write `stringifyJson(value: Json): string` producing compact JSON text (`"a"`, `12`, `true`, `null`, `[1,true]`, `{"a":1}`). Every branch must be reached by a real check except the last, and the object case must arrive by elimination.

**Practices:** stacking all of exercise 09's tools — `===`, `typeof`, `Array.isArray` — over a six-member recursive union, ending in a by-elimination branch.
**Hint:** order matters: `null` first (it's the value you can't probe), then the three primitives, then `Array.isArray`; `Object.entries` on what remains gives you `[string, Json][]`.
**Check:** must compile with zero casts. Delete the `value === null` line and the final `Object.entries(value)` must error with roughly `Argument of type '{ [key: string]: Json; } | null' is not assignable to parameter of type '{}'` — the un-eliminated `null` resurfacing at the very end.

## Solutions

### Solution 1

```ts
function renderCell(cell: string | number | boolean): string {
  if (typeof cell === 'string') return cell;
  if (typeof cell === 'number') return cell.toFixed(2);
  return cell ? 'yes' : 'no'; // boolean, by elimination
}

declare const anyCell: string | number | boolean;
// @ts-expect-error — toFixed does not exist on the whole union
anyCell.toFixed(2);
```

WHY: each `typeof` check is an ordinary runtime test *and* a message to the compiler, so the third branch needs no test at all — `string` and `number` have returned, and only `boolean` is left. That final `return` is the whole lesson in one line: narrowing is subtraction, and the compiler keeps the running total for you.

### Solution 2

```ts
function headerValue(value: string | string[] | null): string {
  if (value === null) return '';
  if (Array.isArray(value)) return value.join('; ');
  return value; // string, by elimination
}

// the trap, kept as a lesson:
function headerValueTrap(value: string | string[] | null): string {
  if (typeof value === 'object') {
    // @ts-expect-error — typeof null is 'object' too, so value is string[] | null here
    return value.join('; ');
  }
  return value;
}
```

WHY: `typeof someArray` and `typeof null` both produce `'object'`, so the trap's check narrows to `string[] | null` — and the compiler refuses `.join` on something that might be `null`. `Array.isArray` is the check that means what it says; it excludes `null` for free, which is why the good version doesn't even depend on the null guard running first.

### Solution 3

```ts
interface CardPayment { last4: string; expiryMonth: number }
interface BankPayment { iban: string }
interface CashPayment { received: number }
type Payment = CardPayment | BankPayment | CashPayment;

function describePayment(payment: Payment): string {
  if ('last4' in payment) {
    return `card ending ${payment.last4} (exp ${payment.expiryMonth})`;
  }
  if ('iban' in payment) {
    return `bank transfer from ${payment.iban}`;
  }
  return `cash ${payment.received.toFixed(2)}`; // CashPayment, by elimination
}

declare const somePayment: Payment;
// @ts-expect-error — iban exists on one variant only
somePayment.iban;
// (if you owned these types, a `kind` tag would beat `in` — that's exercise 10)
```

WHY: `in` narrows on *structure*, which is exactly what you have when the types come from a library you can't edit. Note what it costs: the guard depends on a property name that could be added to another variant in the SDK's next release, silently breaking the narrowing. A discriminant field is a promise the author makes; `in` is an inference you make about their shapes.

### Solution 4

```ts
function explainFailure(err: unknown): string {
  if (err instanceof RangeError) return `out of range: ${err.message}`;
  if (err instanceof Error) return `${err.name}: ${err.message}`;
  if (typeof err === 'string') return err;
  return 'unknown failure';
}

declare const caught: unknown;
// @ts-expect-error — unknown has no members until you check
caught.message;
```

WHY: `instanceof` walks the prototype chain, so a `RangeError` satisfies `instanceof Error` too — put the general check first and the specific branch becomes dead code. The compiler won't flag it, because with `err: unknown` the else-branch is still `unknown` and the later check remains legal; this is one of the few narrowing decisions the type system can't audit for you. Note also that `unknown` never narrows to "nothing" here, which is why the final `return` is required rather than inferred away.

### Solution 5

```ts
function toPort(input: string | number | string[] | null | undefined): number {
  if (input == null) return 8080;
  if (typeof input === 'number') return input;
  if (Array.isArray(input)) return toPort(input[0]);
  const parsed = Number(input.trim());
  return Number.isNaN(parsed) ? 8080 : parsed;
}

// what `===` costs you:
function toPortBroken(input: string | number | string[] | null | undefined): number {
  if (input === null) return 8080;
  if (typeof input === 'number') return input;
  if (Array.isArray(input)) return toPortBroken(input[0]);
  // @ts-expect-error — === null leaves undefined in the union
  const parsed = Number(input.trim());
  return Number.isNaN(parsed) ? 8080 : parsed;
}
```

WHY: the body needed no rewriting — the author's checks were already narrowing; they just had no types to narrow. The one subtlety is `== null`, JavaScript's single loose comparison worth keeping: it is `true` for both `null` and `undefined`, and TypeScript models it exactly that way, removing both from the union. Swap in `===` and `undefined` survives to `input.trim()`, which is the compiler catching a real crash.

### Solution 6

```ts
type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

function stringifyJson(value: Json): string {
  if (value === null) return 'null';
  if (typeof value === 'string') return `"${value}"`;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (Array.isArray(value)) return `[${value.map(stringifyJson).join(',')}]`;
  const pairs = Object.entries(value).map(
    ([key, inner]) => `"${key}":${stringifyJson(inner)}`,
  );
  return `{${pairs.join(',')}}`;
}
```

WHY: six union members, five checks, and the object case arrives with no check of its own — after `null`, the three primitives, and arrays are gone, `{ [key: string]: Json }` is all that remains and `Object.entries` types cleanly as `[string, Json][]`. The ordering is forced by what each tool can see: `null` must go first because `typeof null === 'object'` would otherwise smuggle it into the tail, and `Array.isArray` must precede the object case because arrays are objects too. Recursion needs no extra machinery — each call re-enters the same ladder with a smaller value.
