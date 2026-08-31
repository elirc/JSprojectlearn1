# 📘 Learning Guide: Typed AST

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What is this exercise about?

This exercise builds a tiny calculator. The expression `(2 + 3) * 4` is represented not as text but as a **tree** of nodes: a "multiply" node whose left child is a "plus" node (holding 2 and 3) and whose right child is the number 4. A function called `evaluate` walks the tree and computes 20. This kind of tree is called an **AST** — an abstract syntax tree — and it's how compilers, interpreters, and even TypeScript itself represent code internally.

The type-level problem: the original describes *every* node kind with **one** interface holding every field any node *might* have, all optional. That means malformed trees (a number with no value, an addition with no operands) construct happily, and the evaluator needs a `!` ("trust me") at every child access — promises the type can't keep. The refactor models the tree as a **recursive discriminated union**: each node kind carries exactly its own fields, malformed trees won't compile, and every `!` disappears.

## 2. Concepts you need first

### Trees and recursion
A **tree** is a value containing smaller values of the same kind: a binary node holds two sub-expressions, which may hold sub-expressions, and so on down to numbers (the **leaves**). Code that processes trees is naturally **recursive** — a function that calls itself on the children:

```ts
function count(node: Expr): number {
  if (node.kind === 'number') return 1;               // leaf: stop
  return count(node.left) + count(node.right) + 1;    // recurse on children
}
```

### What an AST is
An **abstract syntax tree** is a tree representing an expression or program by structure, not text. `(2 + 3) * 4` becomes: multiply(plus(2, 3), 4). "Abstract" because details like parentheses vanish — the *shape* of the tree encodes the grouping.

### Discriminated unions (the whole show)
A **discriminated union** is a union of object shapes, each tagged with a literal-typed field (the **discriminant**, here `kind`). Checking the tag narrows to one shape, so each variant's own fields become available:

```ts
type Pet =
  | { kind: 'dog'; barkVolume: number }
  | { kind: 'fish'; tankLiters: number };

function describe(p: Pet) {
  if (p.kind === 'dog') return p.barkVolume; // ✅ OK — narrowed to dog
  return p.barkVolume;                       // ❌ Error: fish has no barkVolume
}
```

(Exercise 10's folder is the deep dive.) The new move here: the union can be **recursive** — its variants mention the union itself (`left: Expr` inside `Expr`). TypeScript handles this fine, and it's exactly what trees need.

### The anti-pattern: the Big Bag Of Fields
The opposite design: one interface with every possible field, all optional (`?`). Now nothing is guaranteed anywhere — every access needs a check or a `!` — and impossible combinations (a number node with binary-node fields) are representable. Exercise 30 names this problem; here it hits a *recursive* structure, where every level of the tree multiplies the pain.

### The `!` non-null assertion
`node.value!` means "trust me, it's not undefined" — no check, just compiler-silencing. If the promise is false, the crash happens later, elsewhere. Five of these in the original evaluator; zero in the refactor.

### Literal-union fields
`op: '+' | '-' | '*' | '/'` instead of `op: string` — only the four real operators are representable, so "unknown operator" stops being a runtime case at all. (Exercise 06's lesson.)

### Exhaustive switch + `assertNever`
`never` is the type with no possible values. If a `switch` covers every variant of a union, then in the `default` branch the checked value has type `never` — there's nothing left it could be. A helper exploits this:

```ts
function assertNever(value: never): never {
  throw new Error(`Unhandled: ${JSON.stringify(value)}`);
}
```

Pass the narrowed value to `assertNever` in the `default`. If the union later gains a variant you forgot to handle, the value in `default` is no longer `never` — and the call **stops compiling**, pointing at the unhandled case. Compile-time exhaustiveness, plus a loud runtime error if something impossible sneaks in anyway. (Exercise 12's tool.)

Related: if every case of a switch `return`s and the cases are exhaustive, the function needs no `default` at all — the compiler proves nothing falls through (see `toInfix`).

### `@ts-expect-error` — type tests
A comment asserting the next line must FAIL to compile; used here to prove each malformed tree is unbuildable.

## 3. Walking through the original code

The Big Bag:

```ts
export interface Node {
  type: string;
  value?: number;     // only 'number' nodes have this
  op?: string;        // only 'binary' nodes
  left?: Node;        // only 'binary'
  right?: Node;       // only 'binary'
  operand?: Node;     // only 'negate'
}
```

Read the comments — the *author* knows which fields belong to which kind. The *type* doesn't. Every field is optional everywhere, so every node might have anything and is guaranteed nothing.

The evaluator pays the tax:

```ts
if (node.type === 'number') {
  return node.value!; // ! because value is optional EVERYWHERE
}
if (node.type === 'binary') {
  const left = evaluate(node.left!);   // ! again
  const right = evaluate(node.right!); // and again
```

Checking `node.type === 'number'` narrows nothing useful — `type` is just `string`, and `value` stays optional. So: `!`, five times. Each one is an unchecked promise.

The silent-zero buckets:

```ts
  if (node.op === '/') return left / right;
  return 0; // unknown op
}
...
return 0; // unknown node type
```

An evaluator that answers *zero* instead of *no*. An unknown operator or node kind produces a plausible-looking number, and the mistake dissolves into downstream arithmetic.

The malformed trees:

```ts
export const broken1: Node = { type: 'number' };          // number, no value
export const broken2: Node = { type: 'binary', op: '+' }; // binary, no operands
```

Both compile — every field is optional, so omitting all of them is legal. And `evaluate(broken2)` crashes: `node.left!` is `undefined`, the recursive call reads `.type` of `undefined`, and the program dies inside the evaluator — far from whoever built the bad tree.

## 4. What's wrong with it (in beginner terms)

**Flaw 1: impossible nodes are representable.** A "number without a value" is not a weird edge case — it's a *meaningless* thing that should be unwritable. The Big Bag makes it a perfectly legal literal. Runtime story: a colleague builds a tree by hand, forgets `value`, and everything typechecks. The crash comes later, inside `evaluate`, with a stack trace pointing at the evaluator — which is innocent. The guilty line (the malformed literal) compiled without a whisper.

**Flaw 2: every `!` is a deferred crash.** The evaluator can't prove `left` exists, because the type honestly doesn't guarantee it. `!` doesn't add safety — it removes the warning. `evaluate(broken2)` is the demo: the promise `node.left!` breaks, and the failure surfaces one recursion level down as `Cannot read properties of undefined (reading 'type')`.

**Flaw 3: silent zeros.** Runtime story: someone adds a `'%'` operator to the tree-building side but forgets the evaluator. Every expression using `%` quietly evaluates to `0`. The invoice totals are wrong by exactly the discounted amounts, and nobody sees an error — `0` is just a number. A wrong answer that looks like an answer is worse than a crash.

**Flaw 4: confused builders get no feedback.** `broken3` — a number node dragging `op` and `left` — evaluates "fine" (the extra luggage is ignored). But whoever built it misunderstood the model, and nothing told them. Types are also *communication*; the Big Bag communicates nothing.

## 5. Try it yourself first!

1. **Vague hint:** the comments inside the interface ("only 'number' nodes have this") are begging to become structure. What TypeScript feature lets each kind carry exactly its own fields?
2. **Warmer:** write three separate object types — one per node kind — each with a literal `kind` field. Union them into `Expr`. Children are typed... what? (The union itself. Recursion is allowed.)
3. **Warmer still:** make `op` a union of the four real operators, not `string`. What happens to the "unknown op" bucket?
4. **Specific:** rewrite `evaluate` as a `switch (node.kind)`. Notice every `!` becomes unnecessary — inside `case 'binary':`, the fields `left`/`right` simply exist. Replace both `return 0`s with an `assertNever(...)` in `default`.
5. **Prove it:** re-type the three broken trees as `Expr` and confirm each is now a compile error (then keep them as `@ts-expect-error` type tests).

## 6. Understanding the refactored solution

The union — the shape the tree always wanted:

```ts
export type Expr =
  | { kind: 'number'; value: number }
  | { kind: 'binary'; op: '+' | '-' | '*' | '/'; left: Expr; right: Expr }
  | { kind: 'negate'; operand: Expr };
```

Three variants, each carrying *exactly* its fields, none optional. `left: Expr` makes it recursive: trees of any depth, checked at every level. And `op` is a literal union — `'%'` is not a thing that can exist.

The evaluator drops every `!`:

```ts
switch (node.kind) {
  case 'number':
    return node.value; // no ! — value EXISTS here, typed number
  case 'binary': {
    const left = evaluate(node.left);   // present, certain
    const right = evaluate(node.right);
```

Each `case` narrows to one variant, so its fields are guaranteed. The inner `switch (node.op)` covers all four operators (with a real `RangeError` for division by zero — a *domain* rule, kept loud), and its `default` calls `assertNever(node.op)`. The outer `default` calls `assertNever(node)`. Both silent-zero buckets are gone: unrepresentable at compile time, loud at runtime if something impossible arrives anyway. Add a `'call'` variant to `Expr` and `evaluate` *won't compile* until you handle it — the compiler walks you to every consumer.

Consumers multiply for free:

```ts
export function toInfix(node: Expr): string {
  switch (node.kind) {
    case 'number': return String(node.value);
    case 'binary': return `(${toInfix(node.left)} ${node.op} ${toInfix(node.right)})`;
    case 'negate': return `-${toInfix(node.operand)}`;
  }
}
```

A second traversal — a pretty-printer — gets all the same guarantees from the same type. No `default` needed: every case returns and the cases are exhaustive, so the compiler proves nothing falls through. Every future pass (a simplifier, a compiler) inherits this for free.

And the four type tests pin the win: number-without-value, binary-without-operands, number-with-binary-luggage, and the `'%'` operator — each now a `@ts-expect-error`, permanently unbuildable.

## 7. Words you learned (glossary)

- **AST (abstract syntax tree)** — a tree representing an expression/program by structure.
- **Tree / leaf** — a nested structure of nodes / a node with no children (here: numbers).
- **Recursion** — a function calling itself on a structure's children.
- **Recursive type** — a type whose definition mentions itself (`left: Expr` inside `Expr`).
- **Discriminated union** — a union of shapes sharing a literal tag field.
- **Discriminant** — that tag field (`kind` here).
- **Variant** — one member shape of the union (number / binary / negate).
- **Narrowing** — the compiler shrinking a union to one variant after a tag check.
- **Big Bag Of Fields** — one interface with every possible field optional; the anti-pattern.
- **Non-null assertion (`!`)** — "trust me, not undefined"; a warning remover, not a check.
- **Literal union** — a field typed as specific values (`'+' | '-' | '*' | '/'`), not `string`.
- **Exhaustive switch** — a switch covering every variant, provably.
- **`never`** — the type with no values; what remains in `default` when a switch is exhaustive.
- **`assertNever`** — a `(value: never) => never` helper making missed cases compile errors and impossible values loud.
- **Silent default** — returning a plausible value (`0`) for an unhandled case instead of failing.
- **Traversal / consumer** — any function that walks the tree (`evaluate`, `toInfix`).
- **`@ts-expect-error`** — a comment asserting the next line must fail to compile.

## 8. Experiments to try on the plane (no internet needed)

Run `npm run typecheck` from the `typescript/` folder after each change (then undo it).

1. **Add a node kind.** In `refactored/ast.ts`, add `| { kind: 'abs'; operand: Expr }` (absolute value) to `Expr`. Expected: ❌ two errors appear — `evaluate`'s `default` (its argument is no longer `never`) and `toInfix` (no longer returns on all paths). The compiler just handed you the complete list of consumers to update. Add the cases (`Math.abs(...)`, `` `|${toInfix(...)}|` ``) and it's green.
2. **Add an operator.** Add `'%'` to the `op` literal union. Expected: ❌ the inner switch's `assertNever(node.op)` stops compiling until you add a `case '%'`. Note which `@ts-expect-error` test also breaks — `broken4` now compiles, so its expect-error goes unused. Two guards, both firing.
3. **Build a malformed tree.** Add `const bad: Expr = { kind: 'negate' };`. Expected: ❌ "Property 'operand' is missing" — the incomplete node dies at the literal, not inside `evaluate`.
4. **Feel the narrowing.** Inside `case 'number':`, try `return node.left;`. Expected: ❌ `Property 'left' does not exist` on the number variant — the exact opposite of the Big Bag, where everything "existed" as maybe.
5. **Write a third consumer.** Add a `countNodes(node: Expr): number` using a switch that returns in every case (1 for numbers, 1 + children otherwise). Expected: ✅ compiles with no `default` and no assertions — then re-do experiment 1 and watch your new function get its own to-do error too.
