# TS 48 — Variance (`in` / `out`)

**Lesson: whether `Dog[]` may stand in for `Animal[]` depends entirely on
who READS and who WRITES — TypeScript's built-in "yes" for mutable arrays
and methods is the one place strict mode knowingly lies.**

## Run it

```
npm run typecheck
```

## What's wrong with the original?

`const yard: Animal[] = kennel;` compiles — arrays are treated as
**covariant** — and then `yard.push(whiskers)` puts a `Cat` into a variable
still typed `Dog[]`. The very next line, `kennel.map((dog) => dog.fetch())`,
crashes with *"dog.fetch is not a function"*. No `any`, no `as`, strict mode
on: the compiler approved every line and handed back a corrupted array.

The second hole is the same bug wearing a callback costume. `AnimalVisitor`
declares `visit(animal: Animal): void` with **method syntax**, which
TypeScript still checks *bivariantly* — so a visitor whose implementation
secretly demands a `Dog` is accepted as one that "handles any Animal", and
`visitAll([whiskers], dogVisitor)` crashes the same way. Both holes come
from never asking the one question variance answers: is `T` something this
type gives you, or something you give it?

## What changed in the refactor

- **Readers take `readonly T[]`** (ts#08). Covariance is *honest* for
  read-only containers — no `push`/`splice` exists, so no Cat can get in.
  `names(kennel)` still works; `readOnlyView.push(whiskers)` is a type test.
- **Writers keep the element type locked**: `admit<T extends Animal>(list:
  T[], animal: T)` makes the list decide what may be added, so
  `admit(kennel, whiskers)` fails instead of corrupting.
- **Callbacks became properties, not methods**: `visit: (animal: Animal) =>
  void` is checked **contravariantly** under `strictFunctionTypes`, while
  `visit(animal: Animal): void` is not. Identical-looking syntax, different
  guarantee — a distinction worth memorizing.
- **`in` / `out` write the contract down**: `Producer<out T>` (T only comes
  out), `Consumer<in T>` (T only goes in), `Shelter<in out A>` (both, so
  invariant). TypeScript *infers* variance already; the annotations
  **assert** it — claim the wrong one and the declaration itself errors —
  and they document intent for the next reader.
- Type tests prove both directions: `Producer<Dog>` → `Producer<Animal>` ✅
  but not back; `Consumer<Animal>` → `Consumer<Dog>` ✅ but not back; and
  `Shelter<Dog>` → `Shelter<Animal>` never, which is precisely the assignment
  that let the Cat in.

## Key takeaway

Variance isn't academic — it is "who reads, who writes", and it decides
whether substituting a subtype is safe. Read-only positions are covariant,
parameter positions are contravariant, mutable positions are invariant. Make
your read-only types `readonly`, keep write-side element types pinned by a
generic, prefer property-syntax function members over methods, and annotate
`in`/`out` on your own generics so the contract is checked instead of
assumed.
