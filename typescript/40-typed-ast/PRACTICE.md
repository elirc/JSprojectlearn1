# 🏋️ Practice: Typed AST

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

Write your code in a scratch file inside this folder (e.g. `practice.ts`, ending with `export {}` so it's a module) — `npm run typecheck` from the `typescript/` folder picks it up. Exercise 6 imports `Expr` with `import type { Expr } from './refactored/ast.js';` (yes, `.js` — that's how this repo's TS imports name TS files); don't edit `refactored/ast.ts`.

## Exercises

### ⭐ 1. A directory tree (warm-up)

A backup tool models a filesystem: a **file** has a `name` and a `bytes` count; a **folder** has a `name` and a `children` array of more entries. Write the recursive union `FileEntry`, then `totalBytes(entry: FileEntry): number` summing every file underneath. Write it as a `switch (entry.kind)` where both cases `return` — and notice you don't need a `default`.

**Practices:** turning a "one of several node kinds" tree into a recursive discriminated union, and recursing over it without a single `!`.
**Hint:** the folder variant's field is `children: FileEntry[]` — the type mentions itself, which is exactly what a tree needs.
**Check:** `totalBytes` must compile with no `default` branch and no assertions. Add a `@ts-expect-error` test catching `{ kind: 'file', name: 'notes.md' }` (roughly `Property 'bytes' is missing`), and another catching `{ kind: 'folder', name: 'docs', bytes: 10 }`.

### ⭐⭐ 2. Add a variant, follow the errors (core)

Backups now have to handle symlinks: a third variant `{ kind: 'symlink'; name: string; target: string }`. Before adding it, give `totalBytes` a `default:` branch calling an `assertNever` helper, and write a second consumer `describe(entry): string` with the same shape. Now add the variant and let the compiler hand you the list of things to update — a symlink is a pointer, so it contributes `0` bytes.

**Practices:** exhaustiveness as a to-do list — `assertNever` turning "I added a case somewhere" into a compile-time checklist across every consumer.
**Hint:** `function assertNever(value: never): never { throw new Error(...) }`, called as `return assertNever(entry);` in `default`.
**Check:** with `symlink` added but unhandled, `assertNever(entry)` must error with roughly `Argument of type '{ kind: "symlink"; ... }' is not assignable to parameter of type 'never'` — once in each consumer. After adding both cases everything compiles.

### ⭐⭐ 3. Type an untyped document tree (core)

A rich-text editor hands you nodes shaped like `{ kind: 'text', text: 'hi' }`, `{ kind: 'heading', level: 2, children: [...] }`, and `{ kind: 'list', ordered: true, items: [...] }`, all currently untyped. Model them as `Doc`, with `level` restricted to headings 1–3 rather than `number`. Then write `plainText(node: Doc): string` that strips the structure and returns the text.

**Practices:** reading a real payload and giving each node kind exactly its own fields — plus a numeric literal union closing off a whole class of bad input.
**Hint:** `level: 1 | 2 | 3` — literal unions work on numbers, not just strings. Note that headings hold `children` while lists hold `items`; resist unifying them.
**Check:** must compile with no `default`. Add a `@ts-expect-error` catching `level: 4` (roughly `Type '4' is not assignable to type '1 | 2 | 3'`) and one catching a list built with `children` instead of `items`.

### ⭐⭐ 4. A guard for one variant (core)

Reuse the three-variant `FileEntry` from exercise 2. Write `isFolder(entry: FileEntry): entry is Folder`, where `Folder` is the folder variant on its own, then use it to write `folderNames(entries: FileEntry[]): string[]` and `directChildCount(entries: FileEntry[]): number`. Both should call `.filter(isFolder)` and then reach `.name` / `.children` with no further checks.

**Practices:** a type predicate that narrows one variant out of a union, and the way `Array.prototype.filter` propagates that narrowing to the whole array.
**Hint:** name the variant with `type Folder = Extract<FileEntry, { kind: 'folder' }>` (exercise 24's helper) so you don't have to repeat its fields.
**Check:** `entries.filter(isFolder).map((f) => f.children.length)` must compile. Add a `@ts-expect-error` catching the unguarded `entries.map((entry) => entry.children)` — roughly `Property 'children' does not exist on type 'FileEntry'`.

### ⭐⭐⭐ 5. A filter tree with two consumers (challenge)

A saved-search feature stores queries as a tree: `equals` (a `field` and a `value`), `not` (one `inner` filter), `and` and `or` (each an array of `parts`). Design `Filter`, then write `matches(filter: Filter, row: Record<string, string>): boolean` and `toSql(filter: Filter): string`. Give `matches` an `assertNever` default; give `toSql` no default at all and see that it still compiles.

**Practices:** a four-variant recursive union where two variants share a shape but not a meaning, plus the contrast between the two ways to be exhaustive (an `assertNever` default vs. return-in-every-case).
**Hint:** `and`/`or` recurse with `parts.every(...)` and `parts.some(...)`; `toSql` can recurse straight inside a template literal via `parts.map(toSql).join(' AND ')`.
**Check:** both functions must compile — `toSql` without a `default` proves the cases are exhaustive. Add `@ts-expect-error` tests catching `{ kind: 'not' }` (missing `inner`) and `{ kind: 'and', inner: someFilter }` (an `and` node carrying `not`'s field).

### ⭐⭐⭐ 6. Rebuild the tree, don't just read it (challenge)

Every traversal so far *consumed* a tree. Now produce one: import `Expr` from `./refactored/ast.js` and write `mapNumbers(node: Expr, fn: (value: number) => number): Expr`, returning a **new** tree with every leaf's value passed through `fn` and the structure untouched. Then add `depth(node: Expr): number`. Neither may use `default`, `!`, or `as`.

**Practices:** the union as a *return* type — the compiler now checks the nodes you build as strictly as the ones you read, so a rebuild that drops or invents a field fails at the literal.
**Hint:** in `case 'binary'` you must carry `op` across yourself (`op: node.op`) and recurse into both `left` and `right`; the narrowed `node.op` is already the literal union, so it fits without a cast.
**Check:** `const doubled: Expr = mapNumbers(sample, (n) => n * 2);` must compile. Add a `@ts-expect-error` catching `mapNumbers(sample, (n) => n).value` — roughly `Property 'value' does not exist on type 'Expr'`, because the result is the whole union again, not a leaf.

## Solutions

### Solution 1

```ts
type FileEntry =
  | { kind: 'file'; name: string; bytes: number }
  | { kind: 'folder'; name: string; children: FileEntry[] };

function totalBytes(entry: FileEntry): number {
  switch (entry.kind) {
    case 'file':
      return entry.bytes;
    case 'folder':
      return entry.children.reduce((sum, child) => sum + totalBytes(child), 0);
  }
}

// @ts-expect-error — a file node requires its byte count
const bad1: FileEntry = { kind: 'file', name: 'notes.md' };
// @ts-expect-error — a folder has children, not bytes
const bad2: FileEntry = { kind: 'folder', name: 'docs', bytes: 10 };
```

WHY: each variant carries exactly its own fields, so inside `case 'folder'` the compiler knows `children` exists and `bytes` doesn't — the reverse of the Big Bag, where everything "existed" as a maybe. No `default` is needed because every case returns and the cases cover the union, so the compiler can prove control never falls off the end. The recursion in `reduce` is checked at every level: `child` is a `FileEntry`, not an `any`.

### Solution 2

```ts
type FileEntry =
  | { kind: 'file'; name: string; bytes: number }
  | { kind: 'folder'; name: string; children: FileEntry[] }
  | { kind: 'symlink'; name: string; target: string };

function assertNever(value: never): never {
  throw new Error(`Unhandled entry: ${JSON.stringify(value)}`);
}

function totalBytes(entry: FileEntry): number {
  switch (entry.kind) {
    case 'file':
      return entry.bytes;
    case 'folder':
      return entry.children.reduce((sum, child) => sum + totalBytes(child), 0);
    case 'symlink':
      return 0; // a symlink is a pointer, not storage
    default:
      return assertNever(entry);
  }
}

function describe(entry: FileEntry): string {
  switch (entry.kind) {
    case 'file':
      return `${entry.name} (${entry.bytes} bytes)`;
    case 'folder':
      return `${entry.name}/ (${entry.children.length} entries)`;
    case 'symlink':
      return `${entry.name} -> ${entry.target}`;
    default:
      return assertNever(entry);
  }
}
```

WHY: the moment `symlink` joined the union, the value reaching each `default` stopped being `never`, and both `assertNever` calls failed to compile — the compiler produced the list of every place that needed updating. That is the whole payoff of the union: adding a node kind is a guided checklist instead of a search. Note the two consumers answer differently (`0` bytes, a `->` label) and neither can quietly forget the new kind.

### Solution 3

```ts
type Doc =
  | { kind: 'text'; text: string }
  | { kind: 'heading'; level: 1 | 2 | 3; children: Doc[] }
  | { kind: 'list'; ordered: boolean; items: Doc[] };

function plainText(node: Doc): string {
  switch (node.kind) {
    case 'text':
      return node.text;
    case 'heading':
      return node.children.map(plainText).join('');
    case 'list':
      return node.items.map(plainText).join('\n');
  }
}

// @ts-expect-error — headings only go to level 3
const bad1: Doc = { kind: 'heading', level: 4, children: [] };
// @ts-expect-error — a list holds `items`, not `children`
const bad2: Doc = { kind: 'list', ordered: false, children: [] };
```

WHY: `level: 1 | 2 | 3` is the numeric twin of the refactor's `op: '+' | '-' | '*' | '/'` — an `<h4>` becomes unrepresentable rather than a runtime check nobody wrote. Letting `heading` keep `children` and `list` keep `items` looks like duplication, but it is the union doing its job: each variant describes one real payload, and `plainText` reaches the right field in each branch with nothing to assert. `node.children.map(plainText)` type-checks because `children` is `Doc[]` and `plainText` takes a `Doc`.

### Solution 4

```ts
type Folder = Extract<FileEntry, { kind: 'folder' }>;

function isFolder(entry: FileEntry): entry is Folder {
  return entry.kind === 'folder';
}

function folderNames(entries: FileEntry[]): string[] {
  return entries.filter(isFolder).map((folder) => folder.name);
}

function directChildCount(entries: FileEntry[]): number {
  return entries.filter(isFolder).reduce((n, folder) => n + folder.children.length, 0);
}

declare const entries: FileEntry[];
// @ts-expect-error — without the guard, `children` is not on every variant
const oops = entries.map((entry) => entry.children);
```

WHY: `filter` has an overload typed `(predicate: (v: T) => v is S) => S[]`, so a predicate that narrows one element narrows the whole resulting array — `.children` is then simply present, no cast and no `!`. `Extract<FileEntry, { kind: 'folder' }>` names the variant by its tag instead of restating its fields, so adding a field to the folder variant updates `Folder` automatically. The guard's body is a single tag comparison, which is exactly the check the compiler would have done itself — the predicate just teaches `filter` about it. Keep building in the same file: `FileEntry` here is Solution 2's three-variant version.

### Solution 5

```ts
type Filter =
  | { kind: 'equals'; field: string; value: string }
  | { kind: 'not'; inner: Filter }
  | { kind: 'and'; parts: Filter[] }
  | { kind: 'or'; parts: Filter[] };

function matches(filter: Filter, row: Record<string, string>): boolean {
  switch (filter.kind) {
    case 'equals': return row[filter.field] === filter.value;
    case 'not': return !matches(filter.inner, row);
    case 'and': return filter.parts.every((part) => matches(part, row));
    case 'or': return filter.parts.some((part) => matches(part, row));
    default: return assertNever(filter);
  }
}

function toSql(filter: Filter): string {
  switch (filter.kind) {
    case 'equals': return `${filter.field} = '${filter.value}'`;
    case 'not': return `NOT (${toSql(filter.inner)})`;
    case 'and': return `(${filter.parts.map(toSql).join(' AND ')})`;
    case 'or': return `(${filter.parts.map(toSql).join(' OR ')})`;
  }
}

declare const someFilter: Filter;
// @ts-expect-error — `not` wraps exactly one subtree
const bad1: Filter = { kind: 'not' };
// @ts-expect-error — `and` holds `parts`, not a single `inner`
const bad2: Filter = { kind: 'and', inner: someFilter };
```

WHY: `and` and `or` have identical *shapes* and different *meanings*, which is precisely why the tag matters — structure alone could not tell them apart, and the discriminant does. The two exhaustiveness styles are both real: `matches` keeps an `assertNever` default (loud at runtime if an untyped tree sneaks in from storage), while `toSql` needs no default at all, because a switch whose cases all return and cover the union is provably complete. `parts.map(toSql)` passes the recursive function directly — each element is a `Filter`, so it fits, and `assertNever` is Solution 2's, reused unchanged.

### Solution 6

```ts
import type { Expr } from './refactored/ast.js';

function mapNumbers(node: Expr, fn: (value: number) => number): Expr {
  switch (node.kind) {
    case 'number':
      return { kind: 'number', value: fn(node.value) };
    case 'binary':
      return {
        kind: 'binary',
        op: node.op,
        left: mapNumbers(node.left, fn),
        right: mapNumbers(node.right, fn),
      };
    case 'negate':
      return { kind: 'negate', operand: mapNumbers(node.operand, fn) };
  }
}

function depth(node: Expr): number {
  switch (node.kind) {
    case 'number':
      return 1;
    case 'binary':
      return 1 + Math.max(depth(node.left), depth(node.right));
    case 'negate':
      return 1 + depth(node.operand);
  }
}

declare const sample: Expr;
// @ts-expect-error — the result is an Expr, and Expr has no bare `.value`
const leaked: number = mapNumbers(sample, (n) => n).value;
```

WHY: a rebuild is where the union earns its keep twice over — reading `node.op` is safe because the variant guarantees it, and writing the new node is checked against `Expr`, so forgetting `right` or inventing a `value` on a binary node fails right at the literal. Because `mapNumbers` returns the union rather than the variant it was handed, callers have to narrow again before touching a leaf field; the `@ts-expect-error` above pins that. This is the extension story from the README: add a `'call'` variant to `Expr` and both functions stop compiling until you handle it — the same to-do list exercise 2 produced by hand.
