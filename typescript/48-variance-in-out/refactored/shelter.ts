// Variance, made explicit. For every generic type, ask ONE question:
// does this thing let callers READ Ts, WRITE Ts, or both?
//
//   read only  -> COVARIANT     ("out" position): Dog[] may act as Animal[]
//   write only -> CONTRAVARIANT ("in"  position): an Animal-taker may act
//                                                 as a Dog-taker
//   both       -> INVARIANT     ("in out"):       no substitution at all
//
// Every unsound line in the original was a *write* riding on a rule
// that only holds for *reads*.

export interface Animal {
  name: string;
}
export interface Dog extends Animal {
  fetch(): string;
}
export interface Cat extends Animal {
  scratch(): string;
}

const rex: Dog = { name: 'rex', fetch: () => 'the ball' };
const whiskers: Cat = { name: 'whiskers', scratch: () => 'the sofa' };

const kennel: Dog[] = [rex];

// ---- 1. Readers take `readonly T[]` (ts#08) -----------------------
// Covariance is HONEST here: a readonly array has no push/splice, so
// there is no way to put a Cat in through this door.
export function names(animals: readonly Animal[]): string[] {
  return animals.map((animal) => animal.name);
}

export const roll = names(kennel); // Dog[] -> readonly Animal[]: safe

// ---- 2. Writers name the element type, and mean it ----------------
// A generic `T` keeps the list and the new item locked together, so
// the list's own element type decides what may be added.
export function admit<T extends Animal>(list: T[], animal: T): void {
  list.push(animal);
}

admit(kennel, { name: 'ada', fetch: () => 'a stick' }); // ✅ Dog into Dog[]

// ---- 3. Callbacks as PROPERTIES, not methods ----------------------
// Arrow-syntax members are checked CONTRAVARIANTLY under
// strictFunctionTypes; method-syntax members keep the legacy
// bivariant rule. Same shape on the page, different guarantee.
export interface AnimalVisitor {
  visit: (animal: Animal) => void; // property, not `visit(a: Animal): void`
}

const loudVisitor: AnimalVisitor = {
  visit: (animal) => console.log(`hello, ${animal.name}`), // param inferred
};

export function visitAll(animals: readonly Animal[], visitor: AnimalVisitor): void {
  for (const animal of animals) visitor.visit(animal);
}

visitAll([whiskers, rex], loudVisitor); // handles anything Animal-shaped

// ---- 4. `in` / `out`: writing the variance down -------------------
// TypeScript INFERS variance from structure — these annotations don't
// create it, they *assert* it (the compiler errors if you claim the
// wrong one) and document the contract for humans.
export interface Producer<out T> {
  get: () => T; // T only ever comes OUT
}
export interface Consumer<in T> {
  accept: (value: T) => void; // T only ever goes IN
}
export interface Shelter<in out A extends Animal> {
  list: () => readonly A[]; // out
  admit: (animal: A) => void; // in  -> both, so: invariant
}

// ==== type tests: the original's two crashes, now unrepresentable ==
declare const dogShelter: Shelter<Dog>;
declare const animalProducer: Producer<Animal>;
declare const dogProducer: Producer<Dog>;
declare const animalConsumer: Consumer<Animal>;
declare const dogConsumer: Consumer<Dog>;

// covariance where it IS sound — a readonly view of the kennel:
const readOnlyView: readonly Animal[] = kennel;

// The safe directions still work — variance is a permission, not a ban:
export const asAnimals: Producer<Animal> = dogProducer; // covariant ✅
export const asDogTaker: Consumer<Dog> = animalConsumer; // contravariant ✅

// @ts-expect-error — a shelter you can WRITE to is invariant: this is
// exactly the `const yard: Animal[] = kennel` line that let a Cat in
export const yard: Shelter<Animal> = dogShelter;

// @ts-expect-error — readonly arrays have no push: the corruption path is gone
readOnlyView.push(whiskers);

// @ts-expect-error — the list decides: a Cat is not welcome in a Dog[]
admit(kennel, whiskers);

// @ts-expect-error — a Dog-demanding visitor no longer passes as an Animal one
export const dogVisitor: AnimalVisitor = { visit: (dog: Dog) => dog.fetch() };

// @ts-expect-error — a Producer<Animal> is not a Producer<Dog> (it may hand back a Cat)
export const backwards: Producer<Dog> = animalProducer;

// @ts-expect-error — a Consumer<Dog> is not a Consumer<Animal> (it would choke on a Cat)
export const alsoBackwards: Consumer<Animal> = dogConsumer;
