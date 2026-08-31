# 🏋️ Practice: Mapped Types

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

Work in a scratch `.ts` file inside the `typescript/` folder (end it with `export {}` so it's a module), or in a COPY of `refactored/mapped.ts`. Check your work with `npm run typecheck`.

## Exercises

### ⭐ 1. Setters for every field (warm-up)

The refactor built `Getters<T>` — every value wrapped in `() => T[K]`. Write the mirror image: `Setters<T>`, where every field of `T` becomes a function that *takes* the field's type and returns `void`. Then declare a `Setters<Settings>` object literal with three working setters.

Practices: the mapped-type loop with a function-type payload that *uses* `T[K]` in parameter position.

Hint: the skeleton is `{ [K in keyof T]: ??? }` — the `???` is a function type whose parameter is `T[K]`.

Check: your object literal must compile; changing one setter's parameter type (e.g. giving `fontSize` a `(value: string) => void`) must error on that property with roughly "type 'number' is not assignable to type 'string'". Pin it with a `@ts-expect-error` placed directly above the bad property line.

### ⭐⭐ 2. Field metadata for a form (core)

A settings form needs, for each field, the current value *and* whether the user has edited it. Write `FieldMeta<T>` so that `FieldMeta<Settings>` is `{ theme: { value: 'light' | 'dark'; dirty: boolean }; fontSize: { value: number; dirty: boolean }; ... }`. Declare a complete `FieldMeta<Settings>` object to prove it.

Practices: wrapping each value in an object payload — the same move as exercise 23's `Rule<T[K]>[]`, built from scratch.

Hint: the right-hand side of the loop can be any type expression mentioning `T[K]` — including an inline object type.

Check: your full object compiles; deleting `dirty` from one entry must error on that property with roughly "Property 'dirty' is missing". Add a `@ts-expect-error` version to keep it as a test.

### ⭐⭐ 3. A PATCH payload by composition (core)

Given `interface Article { readonly id: number; title: string; body: string; tags: string[] }`, build `ArticlePatch`: the shape a client may send to partially update an article — every field optional, but `id` not present at all (the server takes it from the URL). Don't write a loop; compose two stdlib utilities.

Practices: stacking utility types instead of hand-merging (the `FrozenDraft` lesson, new combination).

Hint: one utility removes a key, another makes the rest optional. Order matters less than you'd think — try both.

Check: `const p: ArticlePatch = { title: 'x' }` and `{}` must compile; `const bad: ArticlePatch = { id: 99 }` must error with roughly "'id' does not exist in type 'ArticlePatch'".

### ⭐⭐ 4. Getters for a subset of keys (core)

Combine `MyPick` and `Getters` into one type: `PickAsGetters<T, K extends keyof T>` — loop over only the chosen keys, and wrap each picked value in a getter. `PickAsGetters<Article, 'title' | 'tags'>` should be `{ title: () => string; tags: () => string[] }`.

Practices: looping over a constrained subset (`[P in K]`) while transforming values — `Pick`'s loop and `Getters`' payload in one line.

Hint: start from `MyPick`'s definition and change only what's to the right of the colon.

Check: a two-getter object literal must compile; `PickAsGetters<Article, 'titel'>` must error with roughly "'titel' does not satisfy the constraint"; supplying a raw value where a getter belongs must also error (make both `@ts-expect-error` tests).

### ⭐⭐⭐ 5. A validator table the compiler keeps in sync (challenge)

Write `Validators<T> = { [K in keyof T]: (value: T[K]) => string | null }` and a runtime function `validate<T>(value: T, validators: Validators<T>): string[]` that runs every validator and collects `"key: problem"` strings. The type-level part is easy by now — the interesting part is the body: looping over `Object.keys(validators) as (keyof T)[]` and calling `validators[key](value[key])` directly will NOT compile, and understanding why is the lesson.

Practices: using a mapped type from real runtime code, and the "correlated key" limitation of unions.

Hint: when `key` is the whole union `keyof T`, `validators[key]` is a *union of functions* and TypeScript refuses to call it. Give the compiler a single key to reason about: a tiny inner helper `<K extends keyof T>(key: K) => ...` keeps the correlation.

Check: calling `validate` on an `Article` with four correct validators must compile with each `value` parameter inferred (no annotations needed); a `Validators<Settings>` literal giving `fontSize` a `(value: string) => ...` must error on that property (pin with `@ts-expect-error` above the property line).

## Solutions

### 1. Setters

```ts
type Setters<T> = { [K in keyof T]: (value: T[K]) => void };

const settingsSetters: Setters<Settings> = {
  theme: (value) => { console.log(value); },
  fontSize: (value) => { console.log(value + 1); },
  notifications: (value) => { console.log(!value); },
};

const badSetters: Setters<Settings> = {
  theme: (value) => { void value; },
  // @ts-expect-error — a fontSize setter takes number, not string
  fontSize: (value: string) => { void value; },
  notifications: (value) => { void value; },
};
```

WHY: `T[K]` works anywhere in the value type — including as a function *parameter*. Note the parameters in the good literal need no annotations: the mapped type provides them contextually, so `value` in the `fontSize` setter is already `number`. One subtlety: the wrong-setter error lands on the *property line*, so the `@ts-expect-error` goes directly above `fontSize`, not above the `const`.

### 2. FieldMeta

```ts
type FieldMeta<T> = { [K in keyof T]: { value: T[K]; dirty: boolean } };

const meta: FieldMeta<Settings> = {
  theme: { value: 'dark', dirty: false },
  fontSize: { value: 16, dirty: true },
  notifications: { value: true, dirty: false },
};
```

WHY: the payload on the right of the colon can be a whole inline object type; `T[K]` keeps each field's `value` at its original type while `dirty` is uniformly `boolean`. This is exactly the shape of exercise 23's `Schema<T>` — a loop with a payload — and like `Getters`, it tracks the source: add a field to `Settings` and `meta` refuses to compile until it grows a matching entry.

### 3. ArticlePatch

```ts
interface Article {
  readonly id: number;
  title: string;
  body: string;
  tags: string[];
}
type ArticlePatch = Partial<Omit<Article, 'id'>>;

const p: ArticlePatch = { title: 'New headline' };
// @ts-expect-error — id was omitted: clients can't smuggle it into a patch
const bad: ArticlePatch = { id: 99 };
```

WHY: `Omit` drops `id`, then `Partial` makes the survivors optional — two one-word transformations composed, no hand-written interface to rot. `Partial<Omit<...>>` and `Omit<Partial<...>, 'id'>` produce the same shape here; read whichever order matches how you'd say it aloud.

### 4. PickAsGetters

```ts
type PickAsGetters<T, K extends keyof T> = { [P in K]: () => T[P] };

const articlePreview: PickAsGetters<Article, 'title' | 'tags'> = {
  title: () => 'Hello',
  tags: () => ['ts'],
};

// @ts-expect-error — typo'd key rejected by the K extends keyof T constraint
type BadPick = PickAsGetters<Article, 'titel'>;
// @ts-expect-error — values must be getters, not raw values
const raw: PickAsGetters<Article, 'title'> = { title: 'Hello' };
```

WHY: `MyPick` loops over `K` instead of `keyof T`; changing only the right-hand side to `() => T[P]` grafts `Getters`' transformation onto `Pick`'s subset loop. The `K extends keyof T` constraint is what makes `T[P]` a legal lookup *and* what catches the typo at the use site.

### 5. Validators + validate

```ts
type Validators<T> = { [K in keyof T]: (value: T[K]) => string | null };

function validate<T>(value: T, validators: Validators<T>): string[] {
  const problems: string[] = [];
  const checkOne = <K extends keyof T>(key: K): string | null =>
    validators[key](value[key]);
  for (const key of Object.keys(validators) as (keyof T)[]) {
    const problem = checkOne(key);
    if (problem !== null) problems.push(`${String(key)}: ${problem}`);
  }
  return problems;
}

const problems = validate(article, {
  id: (value) => (value > 0 ? null : 'must be positive'),
  title: (value) => (value.length > 0 ? null : 'required'),
  body: (value) => (value.length > 0 ? null : 'required'),
  tags: (value) => (value.length <= 5 ? null : 'too many'),
});
```

WHY: with `key: keyof T` (a union), `validators[key]` is a union of differently-typed functions, and TypeScript won't call it — it can't prove `value[key]` matches *that* function's parameter. Inside `checkOne`, `K` is a *single* (generic) key, so `validators[key]` is `(value: T[K]) => string | null` and `value[key]` is `T[K]` — correlated, so the call compiles with no casts. Each validator's `value` parameter is inferred from the mapped type, which is why the call site needs no annotations, and why a wrong-typed validator errors exactly on its own property.
