# 📝 TypeScript Quiz Bank — 50 questions

Fifty questions over the whole TypeScript track. Answers are at the bottom with
a one-to-three-sentence explanation and a pointer to the exercise that teaches
the idea (**→ ts#14** and so on). Companion reference: `HANDBOOK.md`.

Difficulty: ⭐ warm-up · ⭐⭐ needs a moment · ⭐⭐⭐ genuinely tricky.

**Rules of the house.** Every snippet is checked under this repo's settings
(`typescript/tsconfig.json`: `strict: true`, target ES2022). `strict` does **not**
include `noUncheckedIndexedAccess`, so array/index reads are unchecked unless a
question says otherwise. Every answer here was verified by actually running
`npx tsc --noEmit --strict` — none of them are guesses.

How to use it: cover the answers, work through a block, then check. If you miss
one, go do (or redo) the exercise it points at — the questions were written
backwards from the exercises, not the other way round.

## Part 1 — Does this compile? If not, why? (Q1–Q20)

**Q1** ⭐
```ts
interface User { name: string }
const u: User = { name: 'ann', age: 3 };
```

**Q2** ⭐⭐
```ts
interface User { name: string }
const raw = { name: 'ann', age: 3 };
const u: User = raw;
```

**Q3** ⭐
```ts
const nums: readonly number[] = [3, 1, 2];
nums.sort();
```

**Q4** ⭐⭐
```ts
function f(x: string | null) {
  if (typeof x === 'object') return x.length;
  return 0;
}
```

**Q5** ⭐⭐
```ts
type Shape = { kind: 'a'; a: number } | { kind: 'b'; b: number };
function area(s: Shape): number {
  switch (s.kind) {
    case 'a': return s.a;
    case 'b': return s.b;
    default: { const n: never = s; return n; }
  }
}
```

**Q6** ⭐⭐
```ts
type Shape =
  | { kind: 'a'; a: number }
  | { kind: 'b'; b: number }
  | { kind: 'c'; c: number };
function area(s: Shape): number {
  switch (s.kind) {
    case 'a': return s.a;
    case 'b': return s.b;
    default: { const n: never = s; return n; }
  }
}
```

**Q7** ⭐
```ts
const v: unknown = 'hi';
v.toUpperCase();
```

**Q8** ⭐
```ts
const v: any = 'hi';
v.toUpperCase() + v.notAMethod();
```

**Q9** ⭐⭐
```ts
interface Full { a: string; b: number }
const x = { a: 'x' } as Full;
```

**Q10** ⭐⭐
```ts
interface Full { a: string; b: number }
const x = { a: 'x' } satisfies Full;
```

**Q11** ⭐
```ts
const n = 'hello' as number;
```

**Q12** ⭐⭐
```ts
const n = 'hello' as unknown as number;
```

**Q13** ⭐⭐⭐
```ts
interface P { x: number }
function take(r: Record<string, unknown>) { return r; }
const p: P = { x: 1 };
take(p);
```

**Q14** ⭐⭐⭐
```ts
type P = { x: number };
function take(r: Record<string, unknown>) { return r; }
const p: P = { x: 1 };
take(p);
```

**Q15** ⭐⭐
```ts
function pick<T, K extends keyof T>(o: T, k: K): T[K] { return o[k]; }
const u = { id: 1, name: 'a' };
pick(u, 'email');
```

**Q16** ⭐⭐
```ts
const arr = [1, 2, 3];
const t: [number, number, number] = arr;
```

**Q17** ⭐⭐
```ts
interface Und { a: string | undefined }
const x: Und = {};
```

**Q18** ⭐⭐
```ts
interface Opt { a?: string }
const x: Opt = { a: undefined };
```

**Q19** ⭐⭐
```ts
function len<T>(x: T): number { return x.length; }
len('abc');
```

**Q20** ⭐⭐
```ts
enum Status { Active, Done }
const s: Status = 2;
```

## Part 2 — What is the inferred type? (Q21–Q35)

No annotations were given. Say exactly what the compiler infers.

**Q21** ⭐ — `a`
```ts
const a = { mode: 'dark' };
```

**Q22** ⭐⭐ — `a`
```ts
const a = { mode: 'dark' } as const;
```

**Q23** ⭐ — `a`
```ts
const a = [1, 'x', true];
```

**Q24** ⭐⭐ — `a`
```ts
const a = [1, 2] as const;
```

**Q25** ⭐⭐ — `a`
```ts
const a = Object.keys({ a: 1, b: 2 });
```

**Q26** ⭐⭐ — `a`
```ts
const a = Object.entries({ a: 1 });
```

**Q27** ⭐ — `a`
```ts
async function f() { return 42; }
const a = f();
```

**Q28** ⭐⭐ — `a`
```ts
const a = [1, 2, 3].map(n => { n * 2; });
```

**Q29** ⭐⭐ — `a`
```ts
const src: (string | null)[] = [];
const a = src.filter(v => v !== null);
```

**Q30** ⭐⭐⭐ — `a`
```ts
const src: (string | null)[] = [];
const a = src.filter(v => Boolean(v));
```

**Q31** ⭐ — `a`
```ts
const a = new Map<string, number>().get('k');
```

**Q32** ⭐⭐ — `a` (default `strict`, no `noUncheckedIndexedAccess`)
```ts
const arr = [10, 20];
const a = arr[99];
```

**Q33** ⭐⭐ — `a`
```ts
function ident<T>(x: T) { return x; }
const a = ident('lit');
```

**Q34** ⭐⭐⭐ — `Ids`
```ts
type Params<S extends string> =
  S extends `${string}:${infer P}/${infer Rest}` ? P | Params<Rest>
  : S extends `${string}:${infer P}` ? P : never;
type Ids = Params<'/a/:id/b/:slug'>;
```

**Q35** ⭐⭐⭐ — `R`
```ts
type Dist<T> = T extends string ? 'S' : 'N';
type R = Dist<string | number>;
```

## Part 3 — Spot the type lie / unsound cast (Q36–Q45)

Every snippet in this part **compiles cleanly**. Say what is wrong anyway, and
what happens at runtime.

**Q36** ⭐
```ts
const raw = '{"id": "not-a-number"}';
const user = JSON.parse(raw) as { id: number };
user.id.toFixed(2);
```

**Q37** ⭐
```ts
interface Cat { name: string }
const c = {} as Cat;
c.name.toUpperCase();
```

**Q38** ⭐⭐
```ts
const items: string[] = [];
const first = items[0]!;
first.length;
```

**Q39** ⭐⭐
```ts
function isNum(v: unknown): v is number { return typeof v === 'string'; }
const x: unknown = 'oops';
if (isNum(x)) x.toFixed(2);
```

**Q40** ⭐⭐⭐
```ts
interface Animal { name: string }
interface Dog extends Animal { bark(): void }
const dogs: Dog[] = [];
const animals: Animal[] = dogs;
animals.push({ name: 'cat' });
dogs[0].bark();
```

**Q41** ⭐⭐⭐
```ts
interface Animal { name: string }
interface Dog extends Animal { bark(): void }
interface Handler { handle(a: Animal): void }
const h: Handler = { handle(d: Dog) { d.bark(); } };
h.handle({ name: 'plain animal' });
```

**Q42** ⭐⭐
```ts
const cache: Record<string, number> = {};
const hit = cache['missing'];
hit.toFixed(2);
```

**Q43** ⭐⭐
```ts
type Cents = number & { readonly __brand: 'Cents' };
const dollars = 12.5;
const c = dollars as Cents;
```

**Q44** ⭐⭐
```ts
const config = { retries: 0 };
const retries = config.retries || 3;
```

**Q45** ⭐
```ts
function get(o: any, k: string) { return o[k]; }
const n: number = get({ a: 'str' }, 'a');
```

## Part 4 — Design the type (Q46–Q50)

Write the type. There is more than one right answer; the model answers show the
shape this track is after.

**Q46** ⭐⭐ — A blog post is in exactly one of three states. A **draft** has
nothing extra. A **scheduled** post has a `publishAt` date. A **published** post
has a `publishedAt` date *and* a `url`. Design `Post` so that reading `url`
without checking the state is a compile error, and so a draft can never carry a
`publishAt`.

**Q47** ⭐⭐ — Design a reusable `Result<T>` for an operation that either
succeeds with a value of type `T`, or fails with an error carrying a numeric
`code` and a `message`. Reading `.value` on an unchecked result must not compile.

**Q48** ⭐⭐⭐ — Design a typed event emitter. The event map is
`{ login: [userId: string]; logout: []; error: [msg: string, code: number] }`.
`emit` must reject unknown event names, wrong argument counts, and wrong
argument types; `on` handlers must get their arguments correctly typed with no
annotations at the call site.

**Q49** ⭐⭐ — `sendTo(email)` keeps being called with strings that aren't email
addresses. Design an `Email` type that a plain `string` cannot satisfy, plus the
one function allowed to create one.

**Q50** ⭐⭐⭐ — Given any object type `T`, produce a type of optional change
handlers: for `{ name: string; age: number }` the result must be
`{ onNameChange?: (v: string) => void; onAgeChange?: (v: number) => void }`.

# ANSWERS

## Part 1 — Does this compile?

**A1 — ❌ No.** `error TS2353: Object literal may only specify known properties,
and 'age' does not exist in type 'User'.` This is **excess property checking**:
assigning a fresh object *literal* to a known type flags unknown extras, which
catches typos for free. → ts#14

**A2 — ✅ Yes.** Excess property checking only fires on object literals assigned
directly. Going through the variable `raw` makes it an ordinary assignability
check, and `{ name: string; age: number }` does have everything `User` needs.
That gap is exactly why `satisfies` is worth reaching for. → ts#14

**A3 — ❌ No.** `error TS2339: Property 'sort' does not exist on type
'readonly number[]'.` `readonly T[]` removes every mutating method. Copy first:
`[...nums].sort()`. → ts#08, ts#19

**A4 — ❌ No.** `error TS18047: 'x' is possibly 'null'.` `typeof null` is
`'object'`, so this branch contains `null` as well as nothing else — the classic
JavaScript wart, faithfully modelled. Test `x !== null` instead. → ts#09

**A5 — ✅ Yes.** Both variants are handled, so in `default` the type of `s` has
been narrowed to `never`, and `never` is assignable to `never`. → ts#12

**A6 — ❌ No.** `error TS2322: Type '{ kind: "c"; c: number; }' is not assignable
to type 'never'.` The third variant reaches `default`, so `s` is not `never` any
more. This "failure" is the feature: adding a state produces a compile error in
every switch that forgot it. → ts#12, ts#33

**A7 — ❌ No.** `error TS18046: 'v' is of type 'unknown'.` `unknown` permits no
member access until you narrow — `if (typeof v === 'string') v.toUpperCase()`
compiles. → ts#13

**A8 — ✅ Yes.** `any` switches the checker off, so both the real method and the
imaginary one are accepted. It crashes at runtime on `notAMethod`. This is why
`any` is the track's villain and `unknown` its replacement. → ts#01

**A9 — ✅ Yes.** `as` does not check the value against the type, it overrules the
compiler. `b` is missing and nobody says a word — a later `x.b.toFixed(2)` would
crash. → ts#14

**A10 — ❌ No.** `error TS2741: Property 'b' is missing in type '{ a: string; }'
but required in type 'Full'.` `satisfies` verifies without changing the inferred
type. Same intent as Q9, opposite safety. → ts#14

**A11 — ❌ No.** `error TS2352: Conversion of type 'string' to type 'number' may
be a mistake because neither type sufficiently overlaps with the other.` `as`
has exactly one guardrail, and this is it. → ts#14

**A12 — ✅ Yes.** Routing through `unknown` defeats the overlap check, which is
the whole point of the double cast. It compiles and is a total lie — treat every
`as unknown as T` as a confession. → ts#13, ts#14

**A13 — ❌ No.** `error TS2345: … Index signature for type 'string' is missing in
type 'P'.` Interfaces can be merged later, so TypeScript won't assume their key
set is final and refuses the implicit index signature. → ts#03

**A14 — ✅ Yes.** A type alias cannot be reopened, so its keys are known to be
final and the implicit index signature is allowed. Q13 and Q14 are the sharpest
practical difference between the two declaration forms. → ts#03

**A15 — ❌ No.** `error TS2345: Argument of type '"email"' is not assignable to
parameter of type '"id" | "name"'.` `K extends keyof T` restricts the key to
properties that actually exist. The untyped version would have returned `any`
and `undefined` at runtime. → ts#18

**A16 — ❌ No.** `error TS2322: Type 'number[]' is not assignable to type
'[number, number, number]'. Target requires 3 element(s) but source may have
fewer.` `[1, 2, 3]` infers as `number[]`; only `as const` (or an annotation)
makes a tuple. → ts#31

**A17 — ❌ No.** `error TS2741: Property 'a' is missing in type '{}' but required
in type 'Und'.` `a: string | undefined` means the property must be *present*,
even if its value is `undefined`. → ts#04

**A18 — ✅ Yes.** `a?: string` means the property may be missing, and by default
(without `exactOptionalPropertyTypes`) explicitly passing `undefined` is also
allowed. Contrast with Q17: `?` and `| undefined` are not synonyms. → ts#04

**A19 — ❌ No.** `error TS2339: Property 'length' does not exist on type 'T'.`
An unconstrained `T` could be anything, so nothing may be read from it. Add
`<T extends { length: number }>`. → ts#17

**A20 — ❌ No.** `error TS2322: Type '2' is not assignable to type 'Status'.`
Modern TypeScript no longer lets arbitrary numbers into a numeric enum (older
versions did — a long-standing hole). Yet another reason this track prefers
`as const` objects plus a union. → ts#07

## Part 2 — Inferred types

**A21 — `{ mode: string }`** ⭐ Object properties are reassignable, so their
literal types widen. This is the #1 reason a perfectly good object "doesn't fit"
a union of string literals. → ts#02, ts#31

**A22 — `{ readonly mode: 'dark' }`** `as const` stops widening and adds
`readonly` throughout. → ts#31

**A23 — `(string | number | boolean)[]`** An array literal infers as an array of
the union of its element types — not a tuple. → ts#02

**A24 — `readonly [1, 2]`** With `as const` the same literal becomes a readonly
tuple of literal types. Compare A23. → ts#31

**A25 — `string[]`** `Object.keys` deliberately returns `string[]`, not
`keyof T`: at runtime an object may carry properties the type never mentioned,
so a narrower type would be a lie. → ts#18

**A26 — `[string, number][]`** An array of key/value tuples. The key is `string`
for the same reason as A25; the value type *is* inferred precisely. → ts#18

**A27 — `Promise<number>`** An `async` function's return type is always wrapped
in exactly one `Promise` — returning `Promise.resolve(42)` gives the same
`Promise<number>`, not `Promise<Promise<number>>`. → ts#15

**A28 — `void[]`** The arrow has a *braced* body with no `return`, so it returns
`undefined` and its return type is `void`. Dropping the braces (`n => n * 2`)
gives `number[]`. → ts#15, ts#21

**A29 — `string[]`** Modern TypeScript infers a type predicate from a
single-expression arrow, so `filter` narrows the element type. → ts#11

**A30 — `(string | null)[]`** No narrowing. The inference only fires for a direct
comparison in a one-expression body; `Boolean(v)` is an opaque call, so the
element type is unchanged. Compare A29 — and this is why `(v): v is string =>`
is still worth writing when you care. → ts#11

**A31 — `number | undefined`** `Map.get` is honest about misses. → ts#05

**A32 — `number`** Array indexing is *not* checked under plain `strict`;
`arr[99]` types as `number` and is `undefined` at runtime. Turn on
`noUncheckedIndexedAccess` and it becomes `number | undefined`. → ts#39

**A33 — `"lit"`** Inference for an unconstrained type parameter from a literal
argument keeps the literal type. (Assigning the result to a `let` would widen it
to `string`.) → ts#16

**A34 — `'id' | 'slug'`** The recursive conditional matches `:id/` first, keeps
`id`, and recurses on the rest, where the second branch catches `:slug`. → ts#28

**A35 — `'S' | 'N'`** A conditional type over a *naked* type parameter
distributes across the union, evaluating once per member and unioning the
results. Wrapping as `[T] extends [string]` would give just `'N'`. → ts#27

## Part 3 — Type lies

**A36 — The `as` is a promise nobody kept.** The JSON really holds a string, so
`user.id.toFixed` throws `TypeError: user.id.toFixed is not a function`. Take
`JSON.parse` as `unknown` and validate with a predicate; runtime validation is
what earns compile-time trust. → ts#13, ts#34

**A37 — `{} as Cat` fabricates a whole object.** `as` needs only vague overlap,
and `{}` overlaps with everything, so the missing `name` sails through.
`c.name.toUpperCase()` throws on `undefined`. `satisfies` would have caught it.
→ ts#14

**A38 — `!` on an empty array.** `items[0]` really is `undefined`, and `!` only
silences the compiler. Crashes on `.length`. Use a length check, `at()`, or turn
on `noUncheckedIndexedAccess` so the compiler stops agreeing with you. → ts#05, ts#39

**A39 — The predicate body is backwards.** TypeScript never verifies the body of
a `v is T` function — it takes your word. This one returns `true` for strings, so
`x.toFixed(2)` runs on `'oops'` and throws. Keep predicates small enough to eyeball.
→ ts#11

**A40 — Array covariance is unsound.** `Dog[]` is accepted as `Animal[]`, and
pushing a plain animal through the `animals` alias corrupts `dogs`. Then
`dogs[0].bark()` throws `bark is not a function`. Take `readonly Animal[]` in
parameters you don't mutate. → ts#08

**A41 — Method-syntax parameter bivariance.** `handle(a: Animal)` written with
*method* syntax accepts an implementation taking the narrower `Dog`, so a plain
animal reaches code that calls `.bark()` — a runtime crash. Declaring the member
as a property (`handle: (a: Animal) => void`) makes the compiler reject it. → ts#15

**A42 — A missing key types as present.** `Record<string, number>` says every
string key yields a `number`, so `hit` is `number` and `hit.toFixed(2)` throws.
Model it as `Record<string, number | undefined>`, use a `Map`, or turn on
`noUncheckedIndexedAccess`. → ts#39

**A43 — The brand was applied to the wrong number.** Branding works only if the
cast lives inside a validating constructor; `12.5 as Cents` smuggles dollars
(and a fraction) into a whole-cents type. Write `function cents(n: number): Cents`
that checks `Number.isInteger` and cast only there. → ts#29

**A44 — `||` eats the legitimate `0`.** `retries: 0` means "don't retry," but
`0` is falsy so the fallback fires and you get 3. `??` replaces only
`null`/`undefined`, which is what was meant. → ts#05

**A45 — `any` in, lie out.** `get` returns `any`, so assigning it to `number`
compiles with no complaint even though the value is `'str'`. The failure appears
somewhere far away, in arithmetic. Type it `get<T, K extends keyof T>(o: T, k: K): T[K]`.
→ ts#01, ts#18

## Part 4 — Design the type

**A46 — A discriminated union, one variant per state.** → ts#10, ts#30
```ts
type Post =
  | { status: 'draft' }
  | { status: 'scheduled'; publishAt: Date }
  | { status: 'published'; publishedAt: Date; url: string };
```
The point is what's *absent*: `draft` has no `publishAt` field at all, so the
nonsense state cannot be written. Reading `post.url` without narrowing is
`Property 'url' does not exist on type 'Post'`; inside
`if (post.status === 'published')` it is a plain `string`, no fallback needed.

**A47 — `Result` as a two-variant union, generic in the success type.** → ts#36
```ts
type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: { code: number; message: string } };
```
`r.value` before checking `r.ok` fails with "Property 'value' does not exist on
type '{ ok: false; … }'". Unlike a thrown exception, the failure path is visible
in the signature and the compiler makes you deal with it.

**A48 — An event map plus `keyof` and indexed access over tuple types.** → ts#20, ts#18
```ts
type Events = {
  login: [userId: string];
  logout: [];
  error: [msg: string, code: number];
};
class Emitter<M extends Record<string, unknown[]>> {
  on<K extends keyof M>(k: K, fn: (...args: M[K]) => void): void { /* … */ }
  emit<K extends keyof M>(k: K, ...args: M[K]): void { /* … */ }
}
```
Each event's payload is a *tuple*, so spreading it as `...args: M[K]` gives arity
and per-position types in one move. `emit('login')` reports "Expected 2
arguments, but got 1"; `emit('nope')` reports that `"nope"` is not
`keyof Events`; and in `on('error', (msg, code) => …)` the parameters infer as
`string` and `number` with nothing annotated.

**A49 — A branded string with a single validating constructor.** → ts#29
```ts
declare const brand: unique symbol;
type Email = string & { readonly [brand]: 'Email' };

function toEmail(s: string): Email {
  if (!s.includes('@')) throw new Error('not an email');
  return s as Email;                 // the ONE sanctioned cast
}
```
`sendTo('a@b.com')` is now a compile error; `sendTo(toEmail('a@b.com'))` is fine.
At runtime an `Email` is just a string, so every string method still works — the
brand exists purely to make the validated and unvalidated versions different
types. Using `unique symbol` for the key also keeps the brand un-forgeable by
accident.

**A50 — A mapped type with key remapping and a template literal.** → ts#25, ts#26
```ts
type ChangeHandlers<T> = {
  [K in keyof T as `on${Capitalize<K & string>}Change`]?: (v: T[K]) => void
};
```
`as` inside a mapped type renames each key; `Capitalize` fixes the casing;
`K & string` is needed because `keyof T` can also include `number` and `symbol`,
which template literals can't capitalize. The `?` makes each handler optional,
and `T[K]` keeps every handler's parameter tied to its own property —
`keyof ChangeHandlers<{ name: string; age: number }>` is
`'onNameChange' | 'onAgeChange'`.

## Scoring

| Score | Where you are |
|-------|---------------|
| 40–50 | You can read types as a design language. Go do ts#42 and write type tests. |
| 30–39 | Solid. Re-read the handbook's traps list, then revisit any exercise you missed twice. |
| 20–29 | The basics are landing; the modelling isn't yet. Redo ts#10, ts#12, ts#30 in order. |
| under 20 | Normal for a first pass. Start at ts#01 and work forward — this quiz will still be here. |

The parts that matter most are 3 and 4. Part 1 and 2 test whether you can predict
the compiler; parts 3 and 4 test whether you can design so that the compiler has
something worth saying.
