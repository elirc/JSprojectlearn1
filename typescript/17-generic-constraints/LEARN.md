# 📘 Learning Guide: Generic Constraints

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What is this exercise about?

Fresh from learning generics (exercise 16), the author wrote two more: `longest(a, b)` — return whichever argument has the bigger `.length` — and `describeEntity(entity)` — format an entity's `id` and `name` into a label.

The type-level problem: both bodies need to *use members* of `T` (`.length`, `.id`, `.name`). But an unconstrained `T` could be anything — a number, a Date — so the compiler refuses `a.length`. The author's workaround was `(a as any).length`, which "fixed" the error by turning off the checking. This exercise teaches the real fix: constraints, written with `extends`, which give a type parameter *requirements*.

## 2. Concepts you need first

### Generics recap (one paragraph)

`function first<T>(items: T[]): T | null` — `<T>` is a type parameter, filled in per call by inference, linking input types to output types. Fully explained in exercise 16's LEARN.md. This exercise is about what the *body* of a generic function is allowed to do.

### Unconstrained `T` means "I know nothing"

Inside a generic body, the compiler must ensure the code works for EVERY possible T — string, number, Date, your custom objects, anything. So it only allows operations valid on everything:

```ts
function shout<T>(x: T) {
  x.toString();    // ✅ OK — everything has toString
  x.length;        // ❌ Error: Property 'length' does not exist on type 'T'
}
```

`x.length` is rejected not because it's never valid, but because it isn't *always* valid. `shout(42)` would make `x.length` a lie.

### Casting inside a generic — the trap this exercise is about

Faced with that error, the tempting fix:

```ts
(x as any).length;   // ✅ compiles — checking is now OFF
```

The `<T>` outside still *looks* rigorous, but the body is unchecked (`any` — exercise 01). Callers can pass anything, the body will do something, and whatever happens, happens. A generic-shaped costume over `any`.

### `extends` — requirements for a type parameter

The real fix. `<T extends Something>` reads: "T can be any type **that is at least a** Something":

```ts
function longest<T extends { length: number }>(a: T, b: T): T {
  return a.length >= b.length ? a.length ? a : b : b; // (simplified below)
}
```

Two effects, one keyword:

1. **Permission inside:** the body may use `.length`, because every acceptable T is guaranteed to have it.
2. **Requirement outside:** calls with length-less arguments are compile errors — `longest(42, 7)` is rejected at the call site.

The constraint is the permission. No cast needed, ever.

### Structural typing — `extends` checks shape, not name

`{ length: number }` is an anonymous object type: "anything with a numeric `length` property." Strings qualify. Arrays qualify. `{ length: 5, color: 'red' }` qualifies. TypeScript compares *shapes*, not declared names — this is called **structural typing**. Your own interfaces work as constraints too:

```ts
interface Entity { id: number; name: string }
function describe<T extends Entity>(e: T) { /* e.id, e.name allowed */ }
describe({ id: 1, name: 'Ada' });          // ✅ OK — right shape
describe(new Date());                       // ❌ Error: Date has no id/name
```

### Why `<T extends Entity>` instead of just `(e: Entity)`? T survives.

This is the exercise's subtlest and most important idea. Compare:

```ts
function tagPlain(e: Entity): Entity { return { ...e }; }
function tagGeneric<T extends Entity>(e: T): T { return { ...e }; }

const admin = { id: 1, name: 'Ada', role: 'admin' };
tagPlain(admin).role;     // ❌ Error: 'role' not on Entity — FORGOTTEN
tagGeneric(admin).role;   // ✅ OK — T remembered the whole shape
```

Both accept `admin` (structurally, extra properties are fine). But the plain version's return type is `Entity` — the compiler forgets `role` existed. The generic version returns `T`, and T *is* admin's full type. **Constraint = requirement; generic = memory.** If T appears in the return type, you want the generic. If T never appears in the return, a plain interface parameter was enough all along.

### Intersection types (`&`) — used in the refactor's return

`A & B` means "a type with everything from A AND everything from B":

```ts
type Tagged = { id: number } & { tagged: true };
// = { id: number; tagged: true }
```

The refactor returns `T & { tagged: true }`: "everything the caller passed, plus a `tagged` flag."

### Spread syntax (JavaScript refresher)

`{ ...entity, tagged: true }` builds a new object by copying all of `entity`'s properties and adding `tagged`.

## 3. Walking through the original code

Open `original.ts`. Attempt 1:

```ts
export function longest<T>(a: T, b: T): T {
  return (a as any).length >= (b as any).length ? a : b;
}
```

The author hit "Property 'length' does not exist on type 'T'", and reached for `as any`. Now the body compiles — and checks nothing. Watch what that costs:

```ts
export const l3 = longest(42, 7);   // COMPILES.
```

Numbers have no `.length`, so at runtime both `(42 as any).length` and `(7 as any).length` are `undefined`. `undefined >= undefined` is `false`, so the function returns `b`... which is `7`. **The wrong answer, returned quietly, with a confident type.** No crash — that's the scary part.

Attempt 2, same disease:

```ts
export function describeEntity<T>(entity: T): string {
  return `#${(entity as any).id}: ${(entity as any).name}`;
}
export const d2 = describeEntity(new Date());
// "#undefined: undefined"
```

Dates have neither `id` nor `name`; `any` shrugs; a garbage label ships.

The file ends with the author's (wrong) conclusion: "generics are just any with extra steps." The missing piece is that T can have requirements.

## 4. What's wrong with it (in beginner terms)

**Flaw 1 — the cast defeated the generic.** The `<T>` promised per-caller checking; the `as any` inside canceled it. Every property access in the body is a gamble the *signature* claims is a sure thing. This is worse than honest `any` parameters, because readers trust the generic costume.

**Flaw 2 — the quiet wrong answer.** Runtime story: a UI picks "the longer of two labels" to decide layout. Someone calls `longest` with two font *sizes* (numbers) by mistake. It compiles. It returns `7` — an answer! — and the layout code proceeds with the smaller size half the time. Nobody files a bug titled "longest() is broken"; they file "layout sometimes looks weird," and that bug lives for months. Crashes get fixed; wrong answers get lived with.

**Flaw 3 — garbage in labels.** `describeEntity(new Date())` produces `"#undefined: undefined"`. Imagine that string in an audit log or a customer email. The compiler could have rejected the call at the exact line a human typed it — instead the mistake surfaced wherever the string finally got read.

**Flaw 4 — the wrong lesson learned.** The author concluded generics are useless. Teams really do this: one bad experience with unconstrained generics, and the codebase reverts to `any` everywhere. Knowing `extends` exists is the difference.

## 5. Try it yourself first!

1. **Vague hint:** The body of `longest` needs exactly one thing from T. Say it in English: "T must have ___." Now find the syntax that tells the compiler that sentence.
2. **Warmer:** Try `<T extends { length: number }>` and delete both `as any` casts. Does the body compile? What happens to `longest(42, 7)`?
3. **Warmer still:** For `describeEntity`, define `interface Entity { id: number; name: string }` and constrain with it. Check that `describeEntity(new Date())` and `describeEntity({ id: 1 })` both fail.
4. **Specific:** Ask yourself the README's question: does `describeEntity` even need to be generic? Its return is `string` — T never appears in the output. Rewrite it as `(entity: Entity): string` and confirm it works identically. Then write a function where the generic DOES matter: `tagEntity<T extends Entity>(entity: T): T & { tagged: true }` — and verify an extra property (like `role`) survives the round trip.
5. **Check yourself:** Zero casts anywhere; `longest('hello', 'hi')` still returns something typed `string`; all three bad calls from the original are compile errors.

## 6. Understanding the refactored solution

Open `refactored/constrained.ts`.

**`longest`, constrained:**

```ts
export function longest<T extends { length: number }>(a: T, b: T): T {
  return a.length >= b.length ? a : b;
}
```

The constraint is structural and *minimal* — exactly what the body touches, nothing more. Strings flow through as strings, `number[]` as `number[]` (T is memory), and `longest(42, 7)` is now a compile error at the call site (type-tested). Note the design rule in the README: write the body first, and let whatever members it touches dictate the constraint. A fatter constraint than the body needs would reject valid callers for no reason.

**`describeEntity`, constrained with an interface:**

```ts
export function describeEntity<T extends Entity>(entity: T): string {
  return `#${entity.id}: ${entity.name}`;
}
```

Plain property access — required, therefore present. Dates rejected; `{ id: 1 }` without `name` rejected (structural checking is real, per-property).

**`tagEntity` — why generic + constraint beats either alone:**

```ts
export function tagEntity<T extends Entity>(entity: T): T & { tagged: true } {
  return { ...entity, tagged: true };
}

const admin = { id: 1, name: 'Ada', role: 'admin' };
export const taggedAdmin = tagEntity(admin);
export const role = taggedAdmin.role; // 'role' SURVIVED
```

Had the parameter been plain `Entity`, the return would have forgotten `role`. With `T extends Entity`, the constraint enforces the entry requirement while T carries the caller's *full* type through to the return — requirement AND memory. This is why real library signatures are full of `<T extends X>`: it's not decoration, it's the combination doing both jobs.

**The type tests** pin all three original disasters: `longest(42, 7)`, `describeEntity(new Date())`, and `describeEntity({ id: 1 })` — each now a compile error instead of a quiet lie.

## 7. Words you learned (glossary)

- **Constraint (`extends`)** — a requirement on a type parameter: `<T extends X>` means T must be at least an X.
- **Unconstrained T** — a type parameter with no requirements; the body may only do things valid for every type.
- **"The constraint is the permission"** — members become usable in the body exactly because the constraint requires them.
- **Structural typing** — types compared by shape (which members exist), not by name; anything with a numeric `length` satisfies `{ length: number }`.
- **Minimal constraint** — requiring only what the body uses, so no valid caller is rejected.
- **T survives / generic = memory** — a returned `T` keeps the caller's full type, extra properties included; a plain interface return forgets them.
- **Intersection type (`&`)** — combines types: `T & { tagged: true }` has everything from both.
- **Spread (`{ ...obj, extra }`)** — JavaScript syntax copying an object's properties into a new object.
- **Cast-inside-a-generic** — the antipattern: `<T>` outside, `as any` inside; a costume over unchecked code.

## 8. Experiments to try on the plane (no internet needed)

Run `npm run typecheck` from the `typescript/` folder after each change. Undo between experiments.

1. **In `refactored/constrained.ts`**, call `longest({ length: 10, name: 'box' }, { length: 3, name: 'cup' })` and assign the result's `.name` to a variable. Expected: ✅ compiles — any shape with `length: number` qualifies (structural typing), and `.name` survives because T is memory.
2. **In `refactored/constrained.ts`**, change the constraint to `<T extends { length: number; toUpperCase(): string }>`. Expected: ❌ `longest([1,2,3], [1])` now fails — arrays can't uppercase. Lesson: every requirement you add evicts callers; keep constraints minimal.
3. **In `refactored/constrained.ts`**, change `tagEntity`'s signature to `(entity: Entity): Entity & { tagged: true }` (no generic). Expected: ❌ the `taggedAdmin.role` line fails — "Property 'role' does not exist" — because the return type no longer carries the caller's extra fields. You've just watched T's memory get wiped in real time.
4. **In `refactored/constrained.ts`**, in `describeEntity`, add `entity.email` to the template string. Expected: ❌ "Property 'email' does not exist on type 'Entity'" — the body is held to the constraint too. Permission and requirement are the same fence, seen from opposite sides.
5. **In `refactored/constrained.ts`**, call `longest('hello', [1, 2, 3])`. Expected: ❌ (or a strange inferred union error) — both parameters are the same T, and string vs number[] can't unify under one T here. Compare exercise 16's `pair('a', 1)`: same rule, now with a constraint attached.
