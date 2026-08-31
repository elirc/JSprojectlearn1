// Variance is the rule for when a container of Dogs is allowed to
// stand in for a container of Animals. TypeScript's built-in answer
// for arrays and methods is "sure, go ahead" — and for anything you
// can WRITE to, that answer is a lie the compiler tells you.

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

export const kennel: Dog[] = [rex];

// Dog[] handed to an Animal[] slot. Reading is fine — every Dog IS an
// Animal. But an Animal[] can also be WRITTEN to, and to that variable
// every Animal is welcome:
const yard: Animal[] = kennel;
yard.push(whiskers);

// `kennel` is still typed Dog[]. It now contains a Cat.
export const tricks = kennel.map((dog) => dog.fetch());
// RUNTIME: "dog.fetch is not a function" on element 1. Nothing was
// cast, nothing was `any`, strict mode is on — the compiler approved
// every single line, then handed us a Dog[] full of Cat.

// The same hole, second door: callback SHAPES. A member written with
// METHOD syntax (`visit(animal: Animal): void`) is checked
// BIVARIANTLY — a listener that secretly demands something *narrower*
// than Animal is accepted too.
export interface AnimalVisitor {
  visit(animal: Animal): void;
}

const dogVisitor: AnimalVisitor = {
  visit(dog: Dog) {
    // "I handle any Animal" — signed, a function that needs a Dog
    console.log(`${dog.name} brought ${dog.fetch()}`);
  },
};

export function visitAll(animals: Animal[], visitor: AnimalVisitor): void {
  for (const animal of animals) visitor.visit(animal);
}

visitAll([whiskers], dogVisitor);
// RUNTIME: the same crash. The visitor advertised "any Animal" and
// quietly required a Dog; Cat[] -> Animal[] delivered the cat.

// Two holes, one missing question: for this type, who READS the
// values and who WRITES them? That question has a name — variance —
// and TypeScript can enforce the answer once you write it down.
