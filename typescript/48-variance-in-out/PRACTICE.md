# 🏋️ Practice: Variance (`in` / `out`)

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

Write your code in a scratch `.ts` file inside the `typescript/` folder (end it with `export {}` so it's a module) or in a COPY of `refactored/shelter.ts`, then run `npm run typecheck`.

Every exercise below assumes these three types are in scope:

```ts
interface Animal { name: string }
interface Dog extends Animal { fetch(): string }
interface Cat extends Animal { scratch(): string }
```

## Exercises

### ⭐ 1. A read-only view (warm-up)

Write `feedAll(bowls: readonly Bowl[]): number` (for `interface Bowl { food: string }`) that counts how many bowls are non-empty. Then take a normal `Bowl[]`, make a `readonly Bowl[]` view of it, and prove the view can't be written through.

**Practices:** `readonly T[]` as the home of *sound* covariance (ts#08).
**Hint:** you don't need any casts — a `Bowl[]` is assignable to a `readonly Bowl[]` variable directly. That assignment is exactly the covariance that IS safe.
**Check:** `feedAll(bowls)` must compile with a plain mutable `Bowl[]`; `view.push({ food: 'kibble' })` must error with roughly "Property 'push' does not exist on type 'readonly Bowl[]'". Make the second one a `@ts-expect-error` type test.

### ⭐⭐ 2. An invariant queue (core)

Define `interface Queue<in out T>` with `peek: () => T | undefined` and `enqueue: (item: T) => void`. Then prove — with two type tests — that a `Queue<Dog>` is neither assignable to `Queue<Animal>` nor the reverse.

**Practices:** recognizing read+write as invariance, and stating it with `in out`.
**Hint:** `peek` puts `T` in an output position and `enqueue` puts it in an input position. Both at once is the definition of invariant; the annotation just says so out loud.
**Check:** both `const a: Queue<Animal> = dogQueue;` and `const b: Queue<Dog> = animalQueue;` must error. If either one compiles, you've accidentally left `T` in only one position — check `peek`'s return type.

### ⭐⭐ 3. Method syntax vs. property syntax (core)

Define `interface Trainer { onArrival: (animal: Animal) => void }` (property syntax). Show that a handler taking `Animal` is accepted and a handler taking `Dog` is rejected. Then, in a comment, note what changes if you rewrite the member as `onArrival(animal: Animal): void`.

**Practices:** the one-character difference that decides bivariant vs. contravariant.
**Hint:** the `@ts-expect-error` goes on the **member line** inside the object literal, not on the `const` line — that's where the compiler reports the mismatch.
**Check:** `{ onArrival: (animal) => ... }` must compile (with `animal` *inferred* as `Animal`); `{ onArrival: (dog: Dog) => dog.fetch() }` must error with roughly "'(dog: Dog) => void' is not assignable to '(animal: Animal) => void'".

### ⭐⭐ 4. Contravariance doing you a favour (core)

Write `sortBy<T>(items: readonly T[], compare: (a: T, b: T) => number): T[]` (copy first — ts#08/js#26). Then use a general `byName` comparator typed over `Animal` to sort a `readonly Dog[]`, and show that a `Dog`-specific comparator cannot sort `Animal`s.

**Practices:** seeing contravariance as *permission*, not restriction — the more general callback is the more useful one.
**Hint:** `byName: (a: Animal, b: Animal) => number` works on dogs because every dog has a `name`. The reverse fails because not every animal can `fetch()`.
**Check:** `const sorted: Dog[] = sortBy(dogs, byName);` must compile and keep the element type `Dog`; `sortBy(animals, byFetch)` must error.

### ⭐⭐⭐ 5. Splitting a `Ref` into its two halves (challenge)

Define `ReadonlyRef<out T>` (just `get`), `WriteonlyRef<in T>` (just `set`), and `Ref<in out T>` extending both. Write `makeRef<T>(initial: T): Ref<T>` using a closure. Then show all three behaviours: a `Ref<Dog>` *is* a `ReadonlyRef<Animal>`, a `Ref<Animal>` *is* a `WriteonlyRef<Dog>`, and a `Ref<Dog>` is **not** a `Ref<Animal>`.

**Practices:** designing an API where callers receive only the half of the capability they need — the type-level version of ts#08's "public view is readonly".
**Hint:** the same object satisfies all three interfaces; only the *declared type of the variable you assign it to* changes what's permitted. That's the whole trick.
**Check:** the first two assignments must compile with no casts, and `const both: Ref<Animal> = dogRef;` must error. This is the exercise's punchline: handing out narrowed *views* is what makes covariance and contravariance safe to use.

### ⭐⭐⭐ 6. Proving variance at the type level (challenge)

Write `type IsAssignable<A, B> = A extends B ? true : false;` (ts#27's conditional types, ts#42's testing idea) and use it to *assert* all three variances as compile-time facts: covariance of `ReadonlyRef`, contravariance of `WriteonlyRef`, and invariance of `Ref` in both directions.

**Practices:** turning "I think this is covariant" into a check the build runs for you.
**Hint:** `const covariant: IsAssignable<ReadonlyRef<Dog>, ReadonlyRef<Animal>> = true;` compiles only if the answer really is `true`. For invariance, assert `false` — and note that asserting the *wrong* boolean is the failure mode you're testing for.
**Check:** all four assertions must compile as written, and `const backwards: IsAssignable<ReadonlyRef<Animal>, ReadonlyRef<Dog>> = true;` must error with roughly "'boolean' / 'true' is not assignable to type 'false'".

## Solutions

### 1. A read-only view

```ts
interface Bowl { food: string }
function feedAll(bowls: readonly Bowl[]): number {
  return bowls.filter((bowl) => bowl.food !== '').length;
}
declare const bowls: Bowl[];
const fed = feedAll(bowls);          // ✅ Bowl[] -> readonly Bowl[]
const view: readonly Bowl[] = bowls; // ✅ the safe covariance
// @ts-expect-error — readonly arrays have no push
view.push({ food: 'kibble' });
```

**WHY:** `readonly Bowl[]` is the same array at runtime with a smaller *type surface* — no `push`, `pop`, `splice`, `sort` or `reverse`. Because nothing can be written through it, treating a more specific array as a less specific one is genuinely sound, which is why TypeScript allows `Bowl[] -> readonly Bowl[]` freely. Take `readonly T[]` in every function that only reads, and the cat-in-the-kennel bug becomes impossible at that boundary.

### 2. An invariant queue

```ts
interface Queue<in out T> {
  peek: () => T | undefined;
  enqueue: (item: T) => void;
}
declare const dogQueue: Queue<Dog>;
declare const animalQueue: Queue<Animal>;
// @ts-expect-error — invariant: a Dog queue is not an Animal queue
const q1: Queue<Animal> = dogQueue;
// @ts-expect-error — and not the other way either
const q2: Queue<Dog> = animalQueue;
```

**WHY:** `T` appears in an output position (`peek`'s return) *and* an input position (`enqueue`'s parameter), so neither substitution is safe: viewing a dog queue as an animal queue would let you `enqueue` a cat, and viewing an animal queue as a dog queue would let `peek` hand back a cat. Both failures are real, so the type is invariant — and `in out` is you writing that conclusion down where the compiler can check it. This is the honest model of what a mutable array actually is; the built-in `Array<T>` only *pretends* to be covariant.

### 3. Method syntax vs. property syntax

```ts
interface Trainer {
  onArrival: (animal: Animal) => void; // property syntax -> contravariant
}
const gentle: Trainer = { onArrival: (animal) => console.log(animal.name) };
const dogOnly: Trainer = {
  // @ts-expect-error — narrower parameter: contravariance rejects it
  onArrival: (dog: Dog) => console.log(dog.fetch()),
};
// If this member were written `onArrival(animal: Animal): void` — method
// syntax — the dogOnly literal would COMPILE. Bivariance, still there
// for backwards compatibility, and still the original's crash.
```

**WHY:** `strictFunctionTypes` makes function-typed *properties* contravariant in their parameters, which is the correct rule: a handler is only substitutable if it accepts *at least* everything the contract promises to send. Methods were deliberately exempted, because `Array<T>`'s own methods rely on bivariance to keep array covariance working. So the syntax you choose for a callback member silently chooses your safety level — pick the property form.

### 4. Contravariance doing you a favour

```ts
function sortBy<T>(items: readonly T[], compare: (a: T, b: T) => number): T[] {
  return [...items].sort(compare);
}
const byName = (a: Animal, b: Animal): number => a.name.localeCompare(b.name);
declare const dogs: readonly Dog[];
const sortedDogs: Dog[] = sortBy(dogs, byName); // ✅ T = Dog, comparator is broader
const byFetch = (a: Dog, b: Dog): number => a.fetch().localeCompare(b.fetch());
declare const animals: readonly Animal[];
// @ts-expect-error — a Dog comparator cannot sort Animals
sortBy(animals, byFetch);
```

**WHY:** with `T = Dog`, the parameter type is `(a: Dog, b: Dog) => number`, and `byName` — which accepts *any* Animal — satisfies it, because it is more capable than required. That's contravariance letting you write one comparator and reuse it across every subtype. The failing case is the same rule enforcing itself: `byFetch` needs `.fetch()`, `T = Animal` can't promise it, error. Note also that the return stays `Dog[]`, not `Animal[]` — the generic preserves the element type instead of widening it.

### 5. Splitting a `Ref` into its two halves

```ts
interface ReadonlyRef<out T> { get: () => T }
interface WriteonlyRef<in T> { set: (value: T) => void }
interface Ref<in out T> extends ReadonlyRef<T>, WriteonlyRef<T> {}

function makeRef<T>(initial: T): Ref<T> {
  let current = initial;
  return { get: () => current, set: (value: T) => { current = value; } };
}

const dogRef = makeRef<Dog>(rex);
const reader: ReadonlyRef<Animal> = dogRef;   // ✅ covariant half
const animalRef = makeRef<Animal>(whiskers);
const writer: WriteonlyRef<Dog> = animalRef;  // ✅ contravariant half
// @ts-expect-error — the read/write pair is invariant
const both: Ref<Animal> = dogRef;
```

**WHY:** one object, three types, three different sets of permissions. Handing a consumer a `ReadonlyRef<Animal>` is safe precisely *because* the `set` half isn't in that type — the same reasoning that makes `readonly T[]` safe in exercise 1. This is the practical payoff of variance: don't ask "can I widen this container?", ask "which half of it does the caller actually need?", then hand over only that half. The `Ref<Animal>` failure is the original's `const yard: Animal[] = kennel;` line, correctly rejected.

### 6. Proving variance at the type level

```ts
type IsAssignable<A, B> = A extends B ? true : false;

const covariant: IsAssignable<ReadonlyRef<Dog>, ReadonlyRef<Animal>> = true;
const contravariant: IsAssignable<WriteonlyRef<Animal>, WriteonlyRef<Dog>> = true;
const invariantA: IsAssignable<Ref<Dog>, Ref<Animal>> = false;
const invariantB: IsAssignable<Ref<Animal>, Ref<Dog>> = false;
// @ts-expect-error — covariance does NOT run backwards
const backwards: IsAssignable<ReadonlyRef<Animal>, ReadonlyRef<Dog>> = true;
```

**WHY:** `A extends B ? true : false` reduces "is A assignable to B?" to a type you can read, and annotating a `const` with that type turns the answer into a build-time assertion — the same technique ts#42 industrializes with `Expect`/`Equal`. Four lines now document and enforce the variance of your API; if someone later adds a `set` to `ReadonlyRef`, `covariant` flips to `false` and the build breaks with a pointer straight at the interface that changed. Variance is easy to reason about wrongly and cheap to test, so test it.
