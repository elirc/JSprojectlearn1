# 📘 Learning Guide: Variance (`in` / `out`)

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What is this exercise about?

Every dog is an animal. So a *list of dogs* is a list of animals... right?

That innocent sentence is where a whole family of type-system bugs lives. The answer is **it depends on what you're allowed to do with the list**. If you can only *read* from it, yes, absolutely safe. If you can *write* to it, absolutely not — because whoever holds the "list of animals" view is entitled to put a **cat** in it, and the original owner still thinks it's a list of dogs.

That relationship — how `Dog` being a subtype of `Animal` affects whether `Container<Dog>` is a subtype of `Container<Animal>` — is called **variance**. This exercise shows TypeScript getting it deliberately wrong for arrays and methods (a documented, on-purpose unsoundness), the runtime crash that follows, and the three tools that fix it: `readonly`, property-syntax callbacks, and the `in` / `out` annotations.

The whole topic collapses into one question you can ask about any type: **who reads, and who writes?**

## 2. Concepts you need first

### 2.1 Subtype, supertype, and "assignable"

`Dog extends Animal` means every `Dog` has everything an `Animal` has, plus more. `Dog` is the **subtype**; `Animal` is the **supertype**. A subtype can go wherever its supertype is expected:

```ts
interface Animal { name: string }
interface Dog extends Animal { fetch(): string }

declare const rex: Dog;
const someAnimal: Animal = rex; // ✅ a Dog is an Animal
const someDog: Dog = someAnimal; // ❌ an Animal is not necessarily a Dog
```

Note the direction: **more specific flows into less specific.** Variance is the question of what happens to that direction when you wrap the types in something.

### 2.2 The three variances

Given `Dog` is a subtype of `Animal`, and some generic `Box<T>`:

- **Covariant** — `Box<Dog>` is a subtype of `Box<Animal>`. The direction is *preserved*. Happens when `T` only comes **out** of the box.
- **Contravariant** — `Box<Animal>` is a subtype of `Box<Dog>`. The direction is *flipped*. Happens when `T` only goes **in**.
- **Invariant** — neither is a subtype of the other. Happens when `T` both goes in and comes out.

```ts
// ✅ covariant: you can only read
type Reader<T> = { get: () => T };
declare const dogReader: Reader<Dog>;
const animalReader: Reader<Animal> = dogReader; // fine — every dog it hands out IS an animal

// ✅ contravariant: you can only write
type Writer<T> = { put: (value: T) => void };
declare const animalWriter: Writer<Animal>;
const dogWriter: Writer<Dog> = animalWriter; // fine — something that accepts ANY animal accepts dogs
```

The contravariant one feels backwards on first read. Say it out loud: *a machine that accepts any animal is perfectly good as a dog-accepting machine.* Yes — it is more capable than required.

### 2.3 Why writes break covariance (the whole exercise in six lines)

```ts
const dogs: Dog[] = [rex];
const animals: Animal[] = dogs; // TS says OK — arrays are treated as covariant
animals.push(whiskersTheCat);   // legal! a Cat IS an Animal
dogs[1].fetch();                // 💥 runtime: fetch is not a function
```

An array is a reader **and** a writer, so it should be invariant. TypeScript makes it covariant anyway, on purpose, because invariant arrays would reject enormous amounts of ordinary, harmless code. It's a usability trade, documented in the TS FAQ — and it is your job to know it's there.

### 2.4 Method syntax vs. property syntax (the sneaky one)

These two look nearly identical and are checked by *different rules*:

```ts
interface A { visit(animal: Animal): void }        // METHOD syntax   -> bivariant
interface B { visit: (animal: Animal) => void }    // PROPERTY syntax -> contravariant

// ❌ B rejects a narrower parameter, as it should:
const b: B = { visit: (dog: Dog) => dog.fetch() };
// Error: '(dog: Dog) => void' is not assignable to '(animal: Animal) => void'

// ✅ A accepts it — and this is exactly how the original crashed:
const a: A = { visit(dog: Dog) { dog.fetch(); } };
```

**Bivariant** means "accepted in either direction" — the loosest possible check. `strictFunctionTypes` turned on proper contravariance for *function-typed properties* but deliberately left **methods** bivariant, again for compatibility (mostly because array methods like `push` would otherwise break the array behaviour above).

Rule of thumb: if a member of your interface is a callback, write it as a property with an arrow type.

### 2.5 `in` and `out` annotations

Since TypeScript 4.7 you can annotate a type parameter's variance:

```ts
interface Producer<out T> { get: () => T }          // T appears in OUTPUT position
interface Consumer<in T> { accept: (v: T) => void } // T appears in INPUT position
interface Cell<in out T> { value: T }               // both -> invariant
```

Two things matter here. First, these do **not** create the variance — TypeScript already computes it from the structure. Second, they are *checked*: annotate `out` on something that's actually contravariant and the interface declaration itself fails to compile. So they are documentation the compiler verifies, plus a performance hint (TS can compare instantiations by variance rather than structurally).

## 3. Walking through the original code

Three species, one array:

```ts
export const kennel: Dog[] = [rex];
const yard: Animal[] = kennel;
yard.push(whiskers);
export const tricks = kennel.map((dog) => dog.fetch());
```

Line by line: `kennel` holds dogs. `yard` is a second name for the *same array*, viewed as `Animal[]`. Pushing a cat through the `yard` view is legal, because `Cat` satisfies `Animal`. And now `kennel` — a variable whose type says `Dog[]`, whose value contains a cat — calls `.fetch()` on every element. Element 1 is a cat. `TypeError: dog.fetch is not a function`.

Notice what's *not* here: no `any`, no `as`, no `!`. Strict mode is fully on. This is the compiler being wrong, not the code being sloppy.

Then the callback version:

```ts
export interface AnimalVisitor {
  visit(animal: Animal): void; // method syntax
}
const dogVisitor: AnimalVisitor = {
  visit(dog: Dog) { console.log(`${dog.name} brought ${dog.fetch()}`); },
};
visitAll([whiskers], dogVisitor);
```

`dogVisitor` claims to be an `AnimalVisitor` — "give me any animal" — while its body requires `.fetch()`. Method-syntax bivariance lets that through. `visitAll` then feeds it a `Cat[]` (covariance again, via the `Animal[]` parameter) and the same crash happens.

## 4. What's wrong with it (in beginner terms)

**Bug story — the shelter dashboard.** The kennel page lists each dog's favourite toy by calling `fetch()`. A separate feature, "add stray to yard", takes any animal. Both were code-reviewed and both are correct *in isolation*. On the day someone points the yard writer at the kennel array, the dashboard starts throwing `fetch is not a function` for one row — and the stack trace points at the dashboard, which is innocent. The guilty line ran hours earlier, in a different file, and compiled cleanly.

**Why it's especially nasty:** the corruption and the crash are separated in time and space. The type that lies (`Dog[]` containing a cat) travels; the error surfaces wherever someone finally trusts it. This is the same shape as ts#01's `any` epidemic, except here the lie was told by the type checker itself.

**The mental model that prevents it:** stop thinking "is a Dog an Animal?" (yes, always) and start thinking "does this container let me PUT things in?" If yes, `Container<Dog>` and `Container<Animal>` are unrelated types and no substitution is safe.

## 5. Try it yourself first!

1. **Vague hint:** the crash needs two things to happen — a `Dog[]` accepted as an `Animal[]`, *and* a write through that view. TypeScript won't stop the first one. Can you remove the ability to do the second?
2. **Warmer:** what array type has no `push`, no `splice`, no `sort`? (You met it in ts#08.) Change every function that only *reads* animals to take that type.
3. **Warmer still:** for the function that *does* write, make the list and the item share one type parameter — `<T extends Animal>(list: T[], animal: T)` — so the list's own element type decides what may be added.
4. **The callback:** rewrite `AnimalVisitor`'s member from method syntax to a property with an arrow type, then check that the `Dog`-demanding visitor stops compiling.
5. **Finishing touch:** define `Producer<out T>`, `Consumer<in T>` and a `Shelter<in out A extends Animal>`, then write type tests for all six directions (three types × safe/unsafe) and confirm the invariant one rejects both.

## 6. Understanding the refactored solution

The reader/writer split is the whole design:

```ts
export function names(animals: readonly Animal[]): string[] {
  return animals.map((animal) => animal.name);
}
export const roll = names(kennel); // Dog[] -> readonly Animal[]: safe
```

`readonly Animal[]` is a *read-only view*. Covariance here is not a compromise — it is genuinely, provably sound, because the type offers no method that could insert anything. Passing `kennel` still works; that's the point. Safety that blocks legitimate code gets deleted by the next engineer.

The write side:

```ts
export function admit<T extends Animal>(list: T[], animal: T): void {
  list.push(animal);
}
```

`T` appears in both parameters, so TypeScript must find one type satisfying both. Give it a `Dog[]` and a `Cat` and there is no such `T` — compile error, exactly where the mistake is.

The callback:

```ts
export interface AnimalVisitor {
  visit: (animal: Animal) => void; // property, not `visit(a: Animal): void`
}
```

One character of difference (`:` instead of `(`) upgrades the check from bivariant to contravariant. The type test `{ visit: (dog: Dog) => dog.fetch() }` now fails, which is the whole reason the second crash can't recur.

And the annotations:

```ts
export interface Producer<out T> { get: () => T }
export interface Consumer<in T> { accept: (value: T) => void }
export interface Shelter<in out A extends Animal> {
  list: () => readonly A[];
  admit: (animal: A) => void;
}
```

`Shelter` is the honest model of what the original's `Animal[]` pretended to be: something you can both read from and write to. Being invariant, `Shelter<Dog>` is simply not a `Shelter<Animal>` — the assignment that started the whole disaster is now a red squiggle. The type tests also confirm the *safe* directions still work, because variance is a permission system, not a blanket ban.

## 7. Words you learned (glossary)

- **Variance** — how subtyping of `T` relates to subtyping of `Container<T>`.
- **Covariant (`out`)** — direction preserved; safe when `T` is only produced/read.
- **Contravariant (`in`)** — direction flipped; safe when `T` is only consumed/written.
- **Invariant (`in out`)** — no substitution; correct when `T` is both read and written.
- **Bivariant** — accepted in *both* directions; the loosest check, and unsound. TypeScript keeps it for method-syntax members.
- **Unsoundness** — a place where the type system knowingly permits something that can crash at runtime; TypeScript trades a few for usability.
- **`strictFunctionTypes`** — the strict flag that makes function-typed *properties* contravariant in their parameters (methods are exempt).
- **Method syntax vs. property syntax** — `f(x: T): void` vs. `f: (x: T) => void`; identical at runtime, different variance rules.
- **`readonly T[]` / `ReadonlyArray<T>`** — an array type without mutating methods; the safe home for covariance (ts#08).
- **Producer / Consumer** — the two roles a generic can play; naming them is usually enough to see the right variance.
- **Type parameter position** — whether `T` appears as a return type (output) or a parameter type (input); position determines variance.

## 8. Experiments to try on the plane (no internet needed)

Run `npm run typecheck` from the repo root after each change, then undo it.

1. In `refactored/shelter.ts`, change `Producer<out T>` to `Producer<in T>`. **Expected:** ❌ error on the *interface declaration itself* — TypeScript checks your annotation against the structure it computed. Proof the annotations are assertions, not switches.
2. Change `names(animals: readonly Animal[])` back to `names(animals: Animal[])` and add `animals.push(whiskers)` inside it. **Expected:** ✅ compiles, and the original's corruption is back. The `readonly` was doing all the work.
3. Rewrite `AnimalVisitor` using method syntax (`visit(animal: Animal): void`) without changing anything else. **Expected:** the `dogVisitor` type test reports "Unused '@ts-expect-error'" — bivariance returned and the unsafe visitor is legal again. Change it back.
4. Add `interface Cell<in out T> { value: T }` and try `const c: Cell<Animal> = dogCell;` **and** `const d: Cell<Dog> = animalCell;`. **Expected:** ❌ both — that's what invariance means. A plain mutable property is invariant even without the annotation.
5. Try `const fn: (dog: Dog) => void = (animal: Animal) => {};`. **Expected:** ✅ compiles — a function accepting *any* animal is a valid dog-handler. That's contravariance being useful rather than restrictive.
6. Write `type Handlers = { [K in 'a' | 'b']: (value: Dog) => void };` and assign it to `{ [K in 'a' | 'b']: (value: Animal) => void }`. **Expected:** ❌ — mapped types inherit the variance of what they map to, so the contravariance rule still applies through the mapping.
