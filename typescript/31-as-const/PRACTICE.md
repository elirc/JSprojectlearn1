# 🏋️ Practice: as const

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

Work in a fresh scratch file (e.g. `31-as-const/practice.ts`, ending with `export {}` so it's a module) or in a COPY of `refactored/config.ts`. Check your work with `npm run typecheck` from the `typescript/` folder.

## Exercises

### ⭐ 1. The method list (warm-up)

Create a constant list of the four HTTP methods `'GET' | 'POST' | 'PUT' | 'DELETE'` — as *data*, not as a hand-written union. Derive the union type `HttpMethod` from the list, then write `send(method: HttpMethod, url: string): string` that returns `` `${method} ${url}` ``.

Practices: `as const` on arrays + the `(typeof ARR)[number]` derivation idiom.

Hint: without `as const` the list is `string[]` and there is nothing to derive.

Check: `send('GET', '/todos')` must compile; `send('FETCH', '/todos')` must error with roughly "'FETCH' is not assignable to parameter of type 'GET' | 'POST' | ...". Add a `@ts-expect-error` type test that catches `HTTP_METHODS.push('PATCH')`.

### ⭐⭐ 2. The shortcuts table (core)

Model an editor's keyboard shortcuts as a table: `save → 'ctrl+s'`, `open → 'ctrl+o'`, `find → 'ctrl+f'`. Derive TWO types from the one table: `Command` (the union of command names) and `Chord` (the union of key chords). Then write `chordFor(command: Command): Chord` that looks the chord up.

Practices: deriving both a `keyof` union and a value union from a single `as const` object.

Hint: `keyof typeof TABLE` gives the keys; indexing that same `typeof TABLE` by the key union gives the values.

Check: assigning `chordFor('save')` to a variable typed `'ctrl+s' | 'ctrl+o' | 'ctrl+f'` must compile; `chordFor('quit')` must error with roughly "'quit' is not assignable".

### ⭐⭐ 3. The color triple (core)

Define `RED` as the tuple `[255, 0, 0]` — kept as a real triple, not widened to `number[]` — and write `toCss(rgb)` returning `` `rgb(r, g, b)` `` that accepts it *without any cast*. Think carefully about the parameter type: what does `as const` do to mutability?

Practices: `as const` tuples + declaring `readonly` tuple parameters so const data can flow in.

Hint: a `readonly [0, 0, 0]`-style value cannot be passed where a *mutable* `[number, number, number]` is demanded.

Check: `toCss(RED)` must compile with no cast; `toCss([255, 0])` must error (wrong length); add a `@ts-expect-error` test that catches `RED[0] = 128`.

### ⭐⭐ 4. Checked AND precise (core)

A palette must have exactly the keys `primary` and `accent`, each a string — but you also want each hex value kept as its literal type, so other code can demand *specific* colors. Write `PALETTE` so that a missing key is a compile error AND `PALETTE.primary` still has the literal type `'#0055ff'`.

Practices: composing `as const` (precision) with `satisfies` (shape checking).

Hint: the README mentions the composition `{...} as const satisfies Shape`; `Record<'primary' | 'accent', string>` is a usable shape.

Check: `const x: '#0055ff' = PALETTE.primary;` must compile; a second palette written with only `primary` must error under the same `satisfies` with roughly "Property 'accent' is missing".

### ⭐⭐⭐ 5. Severity numbers (challenge)

Log levels map to numeric severities: `debug: 10, info: 20, warn: 30, error: 40`. From one table derive `Level` (`'debug' | ... | 'error'`) and `Severity` (`10 | 20 | 30 | 40`), then write `atLeast(level: Level, min: Severity): boolean` that returns whether the level's number is `>= min`. The interesting part: `min` must only accept the four real severities, so callers can't invent thresholds the table doesn't define.

Practices: deriving a union of literal *numbers* from a table's values and using it as a closed parameter type.

Hint: this is exercise 2's double derivation again — but notice the values are numbers this time, and comparison (`>=`) still works on them.

Check: `atLeast('warn', 20)` must compile; `atLeast('warn', 25)` must error with roughly "25 is not assignable to parameter of type 10 | 20 | 30 | 40".

### ⭐⭐⭐ 6. The piece table (challenge)

Chess piece values as a tuple of tuples: `[['rook', 5], ['queen', 9], ['pawn', 1]] as const`. Derive `PieceName` (`'rook' | 'queen' | 'pawn'`) and `PieceValue` (`5 | 9 | 1`) by *indexing* — no hand-written unions. Then write `valueOf(name: PieceName): PieceValue` that finds the entry at runtime (throw if missing).

Practices: chained indexed access on nested `as const` data — `[number]` for rows, `[0]`/`[1]` for columns.

Hint: `(typeof PIECES)[number]` is one entry; an entry indexed at `[0]` is its name.

Check: `const n: PieceName = 'queen'` must compile; add `@ts-expect-error` tests that catch `'king'` as a `PieceName` and `3` as a `PieceValue`. `valueOf` must compile with no casts.

## Solutions

### 1. The method list

```ts
const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE'] as const;
type HttpMethod = (typeof HTTP_METHODS)[number]; // 'GET' | 'POST' | 'PUT' | 'DELETE'

function send(method: HttpMethod, url: string): string {
  return `${method} ${url}`;
}

send('GET', '/todos');           // ✅
// @ts-expect-error — 'FETCH' is not a method
send('FETCH', '/todos');
// @ts-expect-error — as const made the list readonly
HTTP_METHODS.push('PATCH');
```

WHY: `as const` keeps each element as its literal type and makes the array a `readonly` tuple, so `(typeof HTTP_METHODS)[number]` reads the exact union out of the data. Without it the list widens to `string[]`, the derivation collapses to `string`, and `push` stays legal. One source of truth: add `'PATCH'` to the array and the union grows by itself.

### 2. The shortcuts table

```ts
const SHORTCUTS = { save: 'ctrl+s', open: 'ctrl+o', find: 'ctrl+f' } as const;
type Command = keyof typeof SHORTCUTS;            // 'save' | 'open' | 'find'
type Chord = (typeof SHORTCUTS)[Command];         // 'ctrl+s' | 'ctrl+o' | 'ctrl+f'

function chordFor(command: Command): Chord {
  return SHORTCUTS[command];
}

const c: 'ctrl+s' | 'ctrl+o' | 'ctrl+f' = chordFor('save'); // ✅
// @ts-expect-error — 'quit' is not a command
chordFor('quit');
```

WHY: one `as const` table yields both unions — keys via `keyof typeof`, values via indexing the table's type by its own key union. Because both types *derive* from the data, adding a shortcut updates `Command` and `Chord` automatically; there is no second list to drift. Without `as const`, the values would widen to `string` and `Chord` would be useless.

### 3. The color triple

```ts
const RED = [255, 0, 0] as const; // readonly [255, 0, 0]

function toCss(rgb: readonly [number, number, number]): string {
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}

toCss(RED);        // ✅ length and order proven
// @ts-expect-error — a pair is not a triple
toCss([255, 0]);
// @ts-expect-error — readonly tuple: no mutation
RED[0] = 128;
```

WHY: `[255, 0, 0]` alone widens to `number[]` — length forgotten. `as const` keeps it a real (readonly) triple, and the *parameter* must then say `readonly [number, number, number]`: a readonly tuple can't flow into a mutable parameter because the function could `push`. Declaring readonly inputs is the honest signature and lets all const data pass without casts.

### 4. Checked AND precise

```ts
const PALETTE = {
  primary: '#0055ff',
  accent: '#ff8800',
} as const satisfies Record<'primary' | 'accent', string>;

const x: '#0055ff' = PALETTE.primary; // ✅ literal kept
// @ts-expect-error — satisfies demands the 'accent' key too
const INCOMPLETE = { primary: '#000000' } as const satisfies Record<'primary' | 'accent', string>;
```

WHY: `satisfies` checks the value against the shape *without* replacing its inferred type, and `as const` keeps that inferred type maximally precise. Together you get both guarantees: forget a key (or add a misspelled one) and `satisfies` errors; meanwhile `PALETTE.primary` stays the literal `'#0055ff'`, not `string`. Annotating `const PALETTE: Record<...> = ...` instead would check the shape but throw the literals away.

### 5. Severity numbers

```ts
const LEVEL_NUMBERS = { debug: 10, info: 20, warn: 30, error: 40 } as const;
type Level = keyof typeof LEVEL_NUMBERS;             // 'debug' | 'info' | 'warn' | 'error'
type Severity = (typeof LEVEL_NUMBERS)[Level];       // 10 | 20 | 30 | 40

function atLeast(level: Level, min: Severity): boolean {
  return LEVEL_NUMBERS[level] >= min;
}

atLeast('warn', 20);   // ✅
// @ts-expect-error — 25 is not a defined severity
atLeast('warn', 25);
```

WHY: numeric literals widen exactly like strings (`10` → `number`), so without `as const` the derived `Severity` would be just `number` and any threshold would pass. With it, `min` is a closed set of four numbers — callers pick from the table's actual values, and comparison operators still work because every literal number is a `number`. The table stays the single authority on which severities exist.

### 6. The piece table

```ts
const PIECES = [
  ['rook', 5],
  ['queen', 9],
  ['pawn', 1],
] as const;

type PieceEntry = (typeof PIECES)[number];  // readonly ['rook', 5] | readonly ['queen', 9] | ...
type PieceName = PieceEntry[0];             // 'rook' | 'queen' | 'pawn'
type PieceValue = PieceEntry[1];            // 5 | 9 | 1

function valueOf(name: PieceName): PieceValue {
  const entry = PIECES.find(([n]) => n === name);
  if (!entry) throw new Error(`unknown piece: ${name}`);
  return entry[1];
}

const n: PieceName = 'queen';  // ✅
// @ts-expect-error — 'king' is not in the table
const bad: PieceName = 'king';
// @ts-expect-error — 3 is not a piece value
const badV: PieceValue = 3;
```

WHY: `as const` preserves the whole nested structure — outer tuple, inner pairs, every literal — so indexed access can walk it: `[number]` gives the union of rows, then `[0]`/`[1]` project the columns. Both unions derive from one table; adding `['bishop', 3]` extends them automatically. In `valueOf`, `find` returns `PieceEntry | undefined`, so one guard clause keeps the return honest with zero casts.
