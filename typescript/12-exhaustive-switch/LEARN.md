# 📘 Learning Guide: Exhaustive Switches

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What is this exercise about?

An online shop tracks each order with a status: `'pending'`, `'paid'`, `'shipped'`, `'delivered'`. Two functions turn a status into text for humans: one makes a label ("📦 on the way"), one suggests the next action ("ship it").

Then the business added a fifth status, `'refunded'`. Nobody updated the two functions. The code still compiled, no test failed — and refunded customers have been seeing "unknown status" ever since.

The type-level problem: how do you make the compiler *force* you to update every `switch` when a union of statuses grows? The answer is a strange little type called `never`.

## 2. Concepts you need first

### String literal unions (quick recap)

A **union type** uses `|` to mean "one of these." A **string literal type** is a type whose only value is one exact string. Combine them and you get a type that lists every allowed value:

```ts
type Direction = 'up' | 'down';   // only these two strings are legal
let d: Direction = 'up';          // ✅ OK
d = 'sideways';                   // ❌ Error: not assignable to Direction
```

(Unions were introduced back in exercises 05–06; exercise 05's LEARN.md covers them in more depth.)

### `switch` statements (JavaScript refresher)

A `switch` compares one value against several `case` labels and runs the matching branch. `default` runs when nothing matched:

```ts
switch (d) {
  case 'up':   return 'going up';
  case 'down': return 'going down';
  default:     return '??';   // runs for anything else
}
```

### Narrowing inside a `switch`

**Narrowing** = the compiler shrinking a variable's type because your code checked it. It works in `switch` too. Inside `case 'up':`, the compiler knows `d` is exactly `'up'`. Each case you handle gets *subtracted* from the type in the remaining branches.

### The `never` type (the star of this exercise)

`never` is the type with **no values at all**. Not null, not undefined — literally nothing can ever be of type `never`. It sounds useless, but it is how TypeScript says "this spot in the code is unreachable."

Here is the trick. If a union has two members and your switch handles both, then by the time you reach `default`, the compiler has subtracted everything — the value's type is `never`:

```ts
function label(d: 'up' | 'down'): string {
  switch (d) {
    case 'up':   return 'U';
    case 'down': return 'D';
    default:
      // hover d here: its type is `never` — nothing is left
      return d;
  }
}
```

But if you *miss* a case, the leftover type is not `never` — it is the missing case. That difference is checkable, and we can weaponize it.

### The `assertNever` sentinel

Write a helper whose parameter type is `never`:

```ts
function assertNever(value: never): never {
  throw new Error(`Unhandled case: ${JSON.stringify(value)}`);
}
```

Since no value can be a `never`, the ONLY way a call to `assertNever(x)` typechecks is if the compiler has already proven `x` is unreachable. Call it in the `default` branch:

- All cases handled → leftover type is `never` → call compiles. ✅
- One case missed → leftover type is (say) `'refunded'` → `'refunded'` is not assignable to `never` → ❌ compile error, pointing at the exact switch you forgot.

The `throw` inside is a backup net for runtime values that lied their way past the types (bad JSON, `as any`, etc.).

### `Record<K, V>` (the table alternative)

`Record` is a built-in utility type: `Record<Keys, Value>` means "an object that has *every* key in `Keys`, each holding a `Value`."

```ts
type Coin = 'heads' | 'tails';
const names: Record<Coin, string> = { heads: 'H' };
// ❌ Error: Property 'tails' is missing
```

That error is exhaustiveness checking with no switch at all: the object literally will not compile until every union member has an entry.

### `@ts-expect-error` (how this repo tests types)

A comment that says "the next line MUST fail to compile." If the line fails: fine, no error shown. If the line unexpectedly *succeeds*, the compiler complains about the unused directive. It turns "this bad code is rejected" into a real, checkable test. You will see these at the bottom of every refactored file in this track.

## 3. Walking through the original code

Open `original.ts`. The union, with the newcomer:

```ts
export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'shipped'
  | 'delivered'
  | 'refunded'; // <- added last sprint
```

Five statuses. Now the first switch:

```ts
switch (status) {
  case 'pending':   return '⏳ awaiting payment';
  case 'paid':      return '💳 paid';
  case 'shipped':   return '📦 on the way';
  case 'delivered': return '✅ delivered';
  default:
    return 'unknown status';
}
```

Four cases, five statuses. Where does `'refunded'` go? Into `default`. And `default` happily returns `'unknown status'` for it — no error, because a `default` branch is *allowed* to handle anything. The types are not lying here; they are just never being *asked* the right question. The compiler knows `'refunded'` falls through to `default`, and `default` says "I've got this."

The second function, `nextAction`, is the same switch shape with a `default: return '???'`. The comment in the file makes the key point: in real life these two switches live in *different files*, and every one of them must be found **by a human** whenever the union grows.

The last line shows the damage:

```ts
export const labels = (['paid', 'refunded'] as OrderStatus[]).map(statusLabel);
// ['💳 paid', 'unknown status'] — the second one is the quiet bug
```

(The `as OrderStatus[]` is a type assertion telling the compiler to treat the array as that type — more on assertions in exercise 14.)

## 4. What's wrong with it (in beginner terms)

**The `default` clause hides every missing case.** Think of `default` as a bucket labeled "everything else." Buckets never overflow. When `'refunded'` was added, both switches silently routed it into the bucket. Compiling ≠ handled.

**Here's the runtime bug story.** A customer gets a refund. They open their order page. The status pill reads "unknown status." Support gets a ticket, shrugs. Weeks pass. Nobody connects it to last sprint's one-line type change, because *nothing failed*: no compile error, no exception, no test. The bug is invisible precisely because the code was "defensive."

**Unions grow — that's their job.** Order statuses, user roles, message kinds: real unions gain members over their lifetime. Every `switch` over a union is therefore a future bug unless something forces it to keep up. A vague `default` is the opposite of that force: it is a promise to absorb all future mistakes silently.

## 5. Try it yourself first!

1. **Vague hint:** The problem is not what the switches *do* — it's what they do with statuses they don't recognize. Can you make "unrecognized" impossible instead of tolerated?
2. **Warmer:** Delete the `default` branch from `statusLabel` and add `case 'refunded'`. Now think: what stops the *next* added status from causing the same silent bug?
3. **Warmer still:** Write `function assertNever(value: never): never { throw new Error('unhandled'); }`. Call it in the `default` branch, passing `status`. Watch what the compiler says while a case is still missing.
4. **Specific:** For `nextAction`, try a different approach: build a `const NEXT_ACTION: Record<OrderStatus, string> = { ... }` object and return `NEXT_ACTION[status]`. Leave one entry out and read the error.
5. **Check yourself:** Temporarily add `| 'lost'` to `OrderStatus` and run the typecheck. Your fixed code should produce errors at *every* place that needs updating. That error list is the whole point.

## 6. Understanding the refactored solution

Open `refactored/status.ts`.

**Idiom 1 — the sentinel.** `assertNever` is defined exactly as described above, and `statusLabel` now handles all five cases, ending with:

```ts
default:
  return assertNever(status);
```

Why keep a `default` at all if every case is handled? Because it is the tripwire. Today it is unreachable, so `status` is `never` there and the call compiles. The day someone adds a sixth status, `status` in `default` becomes that new literal type, the `assertNever` call stops compiling, and the error message points at this exact switch. The compiler becomes your todo-list generator.

Note `return assertNever(status)` — the `return` keeps the function's "all paths return a string" promise satisfied (a function typed `never` never returns, which counts).

**Idiom 2 — the table.** `nextAction` lost its switch entirely:

```ts
const NEXT_ACTION: Record<OrderStatus, string> = {
  pending: 'send payment reminder',
  paid: 'ship it',
  shipped: 'track the parcel',
  delivered: 'ask for a review',
  refunded: 'close the ticket',
};
```

`Record<OrderStatus, string>` will not compile with a missing key. There is no bucket to hide in. The README's rule of thumb: when each case maps to a plain *value*, prefer the table; when cases need *logic* (branching, side effects), use the switch + `assertNever`.

**The type tests** at the bottom prove both mechanisms fire: a deliberately broken `Coin` switch where `@ts-expect-error` asserts the unhandled `'tails'` makes `assertNever(coin)` fail, and an `incompleteTable` that must fail to compile.

## 7. Words you learned (glossary)

- **Union type (`|`)** — a type meaning "one of these listed types."
- **String literal type** — a type whose only value is one exact string, like `'paid'`.
- **Narrowing** — the compiler shrinking a type because your code checked it (each `case` subtracts a member).
- **`never`** — the type with no possible values; the type of unreachable code.
- **Exhaustiveness checking** — making the compiler verify a switch/table covers every union member.
- **`assertNever`** — a helper taking `never`, callable only where the compiler proved nothing is left; a compile-time tripwire plus a runtime backup throw.
- **`Record<K, V>`** — built-in type: an object with every key from `K`, each of type `V`.
- **`default` clause** — a switch's catch-all branch; here, the villain that conceals missing cases.
- **Type assertion (`as`)** — telling the compiler to treat a value as some type without checking (exercise 14's topic).
- **`@ts-expect-error`** — a directive asserting the next line must fail to compile; this track's type-level test.

## 8. Experiments to try on the plane (no internet needed)

Run `npm run typecheck` from the `typescript/` folder after each change. Undo between experiments.

1. **In `refactored/status.ts`**, add `| 'lost'` to `OrderStatus`. Expected: ❌ two errors — one at `assertNever(status)` in `statusLabel` ("'lost' is not assignable to 'never'"), one at `NEXT_ACTION` ("Property 'lost' is missing"). This is the compiler-generated todo list.
2. **Still with `'lost'` added**, handle both spots (add a `case 'lost'` and a table entry). Expected: ✅ clean again. Now remove `'lost'` from the union but leave your `case 'lost'`. Expected: ❌ error — a case that can never match is also flagged. The checking works in both directions.
3. **In `refactored/status.ts`**, delete the entire `default: return assertNever(status);` branch. Expected: ✅ still compiles (all cases are handled and every path returns) — but the tripwire is gone: re-add `| 'lost'` and notice `statusLabel` now fails differently (missing return path) or, in sneakier functions, not at all. Put the sentinel back.
4. **In the type tests**, add `case 'tails': return 'T';` to `brokenLabel`. Expected: ❌ error on the `@ts-expect-error` line — "Unused '@ts-expect-error' directive" — because the switch is no longer broken, the assertion that it fails has itself failed. That is what "tests for types" means.
5. **In `refactored/status.ts`**, change `assertNever`'s parameter type from `never` to `string`. Expected: ✅ everything compiles — including the broken `Coin` switch test, which now errors as an unused directive. Lesson: the whole mechanism lives in that one `never`.
