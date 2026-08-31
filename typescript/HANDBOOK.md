# 📗 The TypeScript Handbook

A reference for this repo's 42-project TypeScript track. The projects teach one
concept at a time in build order; this file gathers them **by concept** so you
can look one up later without remembering which folder it lived in.

Snippets are marked `// ✅ OK` or `// ❌ Error`, and **→ ts#10** points at the
exercise that teaches the idea properly. Everything here was checked against
`typescript/tsconfig.json` (`strict: true`, target ES2022); where a claim
depends on a flag that is *off* here, it says so. Assumed: you know JavaScript.
Every TypeScript term is defined at first use.

**Contents** — 1 [What a type is](#1-what-a-type-is) · 2 [Inference & widening](#2-inference-and-widening) · 3 [Type syntax](#3-the-type-syntax-zoo) · 4 [Unions & literals](#4-unions-and-literal-types) · 5 [Narrowing](#5-the-narrowing-toolbox) · 6 [Null safety](#6-null-safety) · 7 [Interface vs type](#7-interfaces-vs-type-aliases) · 8 [Generics](#8-generics) · 9 [keyof](#9-keyof-and-indexed-access) · 10 [Utility types](#10-utility-types) · 11 [Mapped types](#11-mapped-types) · 12 [Template literals](#12-template-literal-types) · 13 [Conditional & infer](#13-conditional-types-and-infer) · 14 [Branded types](#14-branded-types) · 15 [unknown vs any](#15-unknown-vs-any-at-boundaries) · 16 [satisfies vs as](#16-satisfies-vs-as) · 17 [Type testing](#17-testing-your-types) · 18 [Design with types](#18-designing-with-types) · 19 [Top 15 traps](#19-ts-traps-top-15)

## 1. What a type is

A **type** is a claim about what a value can be. The compiler checks the claims,
then **erases** them — the JavaScript that runs contains no types at all. So
runtime checks must look at *values*, never at type names.

```ts
interface User { id: number; name: string }
const u: User = { id: 1, name: 'ann' };
// emits exactly:  const u = { id: 1, name: "ann" };  — `User` doesn't exist at runtime

type Shape = { kind: 'circle' };
value instanceof Shape;   // ❌ Error: 'Shape' only refers to a type, but is being
                          //    used as a value here
```

Use `typeof`, `in`, `instanceof` on real classes, or `Array.isArray` (section 5).
**"Compiles" and "safe" are different words** — the villain of the whole track,
because the checker only knows what you told it:

```ts
const data = JSON.parse('{"id":"oops"}');   // data: any
const user: User = data;                    // ✅ compiles — `any` waives all checks
user.id.toFixed(2);                         // ✅ compiles, 💥 crashes at runtime
```

Run the checker over everything with `npm run typecheck`; no output means every
claim in the repo holds together. **→ ts#01, ts#13, ts#34**

## 2. Inference and widening

An **annotation** is the `: Type` you write; **inference** is the type the
compiler works out alone. Annotate *boundaries* — parameters, exported returns,
outside data — and let locals infer.

```ts
const count = 3;                      // ✅ inferred: 3  — a literal type
let total = 3;                        // ✅ inferred: number
const nums = [1, 2, 3];               // ✅ inferred: number[]
const user = { name: 'ann', age: 3 }; // ✅ inferred: { name: string; age: number }

// WIDENING is the compiler generalising a literal because the holder can change.
// A `const` can't be reassigned so it keeps the literal; `let` and object
// PROPERTIES can, so they widen — and the property case is the one that bites.
const mode = 'asc';         // 'asc'
let mode2 = 'asc';          // string
const cfg = { m: 'asc' };   // { m: string }   ← reassignable property, so widened
declare function sort(dir: 'asc' | 'desc'): void;
sort(cfg.m);   // ❌ Error: Argument of type 'string' is not assignable to
               //    parameter of type '"asc" | "desc"'
const cfg2 = { m: 'asc' } as const;   // ✅ { readonly m: 'asc' }
sort(cfg2.m);                         // ✅ OK
const t = [1, 2, 3] as const;         // ✅ readonly [1, 2, 3]  (not number[])
const merged = { ...cfg2, b: 2 };     // ✅ { m: 'asc'; b: number } — spread keeps
                                      //    what it was given, widens what's new
```

`as const` says "this literal is exactly itself, read-only, all the way down" —
one of only two always-safe `as` forms. Inference through a generic keeps
literals too: `id('lit')` infers `"lit"`, `id({ q: 1 })` infers `{ q: number }`.
**→ ts#02, ts#31, ts#07**

## 3. The type syntax zoo

```ts
const s: string = 'x';   const n: number = 1;   // one number type, no int/float split
const b: boolean = true; const big: bigint = 1n;  const sym: symbol = Symbol();

// Objects: `?` = optional; `readonly` = no assignment (compile-time only —
// nothing is frozen at runtime).
type Config = { host: string; port?: number; readonly id: number };
declare const c: Config;
c.id = 2;   // ❌ Error: Cannot assign to 'id' because it is a read-only property
type BinOp = (a: number, b: number) => number;          // a function TYPE
type Factory = { (n: number): string; label: string };  // callable + properties
function greet(name: string, greeting = 'hi', loud?: boolean) { /* … */ }

// A tuple has fixed length and per-slot types; arrays never become tuples on
// their own. `readonly T[]` is the type-level fix for JS's mutating sort().
const xs: number[] = [1, 2];                          // same as Array<number>
const ro: readonly number[] = [1, 2];
const named: [id: string, qty: number] = ['a', 1];    // labels are documentation
ro.sort();        // ❌ Error: Property 'sort' does not exist on type 'readonly number[]'
[...ro].sort();   // ✅ OK — copy, then sort the copy
const loose = ['a', 1];             // (string | number)[]
const t: [string, number] = loose;  // ❌ Error: Target requires 2 element(s) but
                                    //    source may have fewer
const t2 = ['a', 1] as const;       // ✅ readonly ['a', 1]
```

A `void` return means *the caller ignores the result*, so returning something is
allowed — which is why `forEach(x => arr.push(x))` compiles. **Overloads** give
one function several honest signatures; the implementation signature (last) is
not callable from outside. And TypeScript is **structurally typed** — matching
shapes are interchangeable regardless of name, with private fields the one thing
that makes a class *nominal* (identity-based). **→ ts#15, ts#21, ts#22**

```ts
declare function each(cb: (x: number) => void): void;
each(x => x * 2);   // ✅ OK — a number where void is expected
function len(x: string): number;
function len(x: unknown[]): number;
function len(x: string | unknown[]): number { return x.length; }
len('ab');   // ✅ OK
len(5);      // ❌ Error TS2769: No overload matches this call

class Counter {
  private count = 0;                              // TS-only privacy
  #secret = 1;                                    // real JS privacy
  constructor(public readonly name: string) {}    // parameter property
}
class Point2 { constructor(public x: number, public y: number) {} }
class Vec2   { constructor(public x: number, public y: number) {} }
const p: Point2 = new Vec2(1, 2);   // ✅ OK — same shape
class A { private secret = 1; }   class B { private secret = 1; }
const a: A = new B();   // ❌ Error: Types have separate declarations of a private
                        //    property 'secret'
```

## 4. Unions and literal types

A **union** (`A | B`) is "one of these." A **literal type** has exactly one
value: `'asc'`, `42`, `true`. A union of string literals beats `string` almost
every time — typos become compile errors and editors autocomplete the options.

```ts
type Direction = 'asc' | 'desc';
let d: Direction = 'asc';   // ✅ OK
d = 'up';                   // ❌ Error: Type '"up"' is not assignable to type 'Direction'

// On a union you may only touch members EVERY variant has:
type Result = { ok: true; value: number } | { ok: false; error: string };
declare const r: Result;
r.ok;      // ✅ OK — on both
r.value;   // ❌ Error: Property 'value' does not exist on type 'Result'.
           //    Property 'value' does not exist on type '{ ok: false; … }'

// That last error is the compiler saying "narrow first" (section 5). And prefer
// an `as const` object over `enum`: you get the union AND a real runtime object,
// without enum's oddities — enums are the one TS feature that emits extra JS.
const Level = { Low: 'low', High: 'high' } as const;
type Level = (typeof Level)[keyof typeof Level];   // ✅ 'low' | 'high'
enum Color { Red, Green }
const c: Color = 5;   // ❌ Error: Type '5' is not assignable to type 'Color'
```

**→ ts#06, ts#07, ts#10, ts#36**

## 5. The narrowing toolbox

**Narrowing** is the compiler shrinking a value's type inside a branch, from
control flow alone — it is what replaces casting. **`typeof`** for primitives
(watch the famous hole), **`in`** for object shapes, **`instanceof`** for
classes. **Truthiness** narrows too, but also drops `''` and `0`, so prefer
`!== undefined` when those are real values.

```ts
function fmt(v: string | number): string {
  if (typeof v === 'string') return v.toUpperCase();   // ✅ v: string
  return v.toFixed(2);                                 // ✅ v: number
}
function bad(x: string | null) {
  if (typeof x === 'object') return x.length;
  // ❌ Error TS18047: 'x' is possibly 'null'    (because typeof null === 'object')
  return 0;
}
type A = { a: string } | { b: number };
function f(x: A) { if ('a' in x) { /* ✅ { a: string } */ } else { /* ✅ { b: number } */ } }
class Dog { bark() {} }   class Cat { meow() {} }
function speak(p: Dog | Cat) { if (p instanceof Dog) p.bark(); else p.meow(); }
```

**Discriminants — the main event.** A **discriminated union** gives every
variant a shared tag field holding a *different literal*: check the tag, get the
whole variant. **→ ts#10**, the most important pattern in the language.

```ts
type Shape =
  | { kind: 'circle'; radius: number }
  | { kind: 'square'; side: number };
function area(s: Shape): number {
  switch (s.kind) {
    case 'circle': return Math.PI * s.radius ** 2;  // ✅ radius exists here
    case 'square': return s.side ** 2;              // ✅ side exists here
  }
}
```

**Type predicates** teach the compiler your own check: a function returning
`arg is T` is trusted in its `true` branch. The compiler **cannot verify the
body**, so a wrong predicate is a silent lie — keep them tiny. **Assertion
functions** (`asserts v is T`) narrow for the rest of the scope instead.
**→ ts#11, ts#23**

```ts
function isString(v: unknown): v is string { return typeof v === 'string'; }
declare const v: unknown;
if (isString(v)) v.toUpperCase();   // ✅ v: string
function assertIsString(x: unknown): asserts x is string {
  if (typeof x !== 'string') throw new Error('not a string');
}
declare const raw: unknown;
assertIsString(raw);
raw.toUpperCase();                  // ✅ raw: string from here down
```

**`.filter` narrows — but only from a simple arrow**, because modern TypeScript
infers a predicate from a one-expression body and nothing else:

```ts
const maybe: (string | null)[] = ['a', null];
const good = maybe.filter(v => v !== null);                 // ✅ string[]
const meh  = maybe.filter(v => Boolean(v));                 // ❌ (string | null)[]
const nope = maybe.filter(v => { return v !== null; });     // ❌ (string | null)[]
const sure = maybe.filter((v): v is string => v !== null);  // ✅ string[]
```

**Exhaustiveness with `never`.** `never` is the type with *no values*, so
nothing is assignable to it — a perfect "unreachable" assertion. Add a variant
and the line breaks on purpose: one new state, and the compiler hands you a todo
list of every switch that forgot it. `never` as a *return* type means "never
finishes normally," which narrows callers too. **→ ts#12, ts#33, ts#40**

```ts
function area2(s: Shape): number {
  switch (s.kind) {
    case 'circle': return Math.PI * s.radius ** 2;
    case 'square': return s.side ** 2;
    default: {
      const _exhaustive: never = s;   // ✅ OK today. After adding a 'tri' variant:
      return _exhaustive;             // ❌ Error: Type '{ kind: "tri"; base: number; }'
    }                                 //    is not assignable to type 'never'
  }
}
function fail(msg: string): never { throw new Error(msg); }
function use(x: string | null) {
  if (x === null) fail('missing');
  x.toUpperCase();   // ✅ x: string — the compiler knows fail() can't fall through
}
```

## 6. Null safety

With `strictNullChecks` (part of `strict`, on here), `null` and `undefined`
belong to no type unless invited. **Optional (`?`) vs `| undefined`** — both
*read* as `T | undefined`, but one may be missing and the other must be
written. **→ ts#04**

```ts
let name: string = null;          // ❌ Error: Type 'null' is not assignable to type 'string'
let maybe: string | null = null;  // ✅ OK
maybe.length;                     // ❌ Error: 'maybe' is possibly 'null'
if (maybe !== null) maybe.length; // ✅ OK
interface Opt { a?: string }              // may be MISSING
interface Und { a: string | undefined }   // must be PRESENT, may be undefined
const o1: Opt = {};                // ✅ OK
const o2: Opt = { a: undefined };  // ✅ OK (by default)
const u1: Und = {};                // ❌ Error: Property 'a' is missing in type '{}'
```

`?.` short-circuits to `undefined`; `??` replaces only `null`/`undefined`,
unlike `||`. The `!` **non-null assertion is a lie you sign** — it checks
nothing, it silences, and every `!` marks a spot where a future crash is
allowed to happen. `catch` gives you `unknown`, because JavaScript lets you
`throw` anything. **→ ts#05, ts#35**

```ts
const port = config.port ?? 8080;   // ✅ 0 stays 0
const bad  = config.port || 8080;   // ❌ 0 silently becomes 8080
declare const el: { v?: string };
const s1: string = el.v;    // ❌ Error: Type 'string | undefined' is not
                            //    assignable to type 'string'
const s2: string = el.v!;   // ✅ compiles — and 💥 crashes if v is missing
try { risky(); } catch (err) {
  err.message;                             // ❌ Error TS18046: 'err' is of type 'unknown'
  if (err instanceof Error) err.message;   // ✅ OK
}
```

## 7. Interfaces vs type aliases

Both name a shape. Three differences actually matter: **only a type alias names
a union, tuple, or primitive**; **only an interface merges** (two declarations of
one name combine — which is why interfaces describe *other people's* libraries,
you can add to them); and **index-signature compatibility differs**, which is
obscure but will find you. **→ ts#38**

```ts
type Direction = 'asc' | 'desc';   // ✅ OK   —  interface can't do this
type Pair = [string, number];      // ✅ OK
interface Merged { a: string }
interface Merged { b: number }     // ✅ Merged is { a: string; b: number }
type TA = { a: string };
type TA = { b: number };           // ❌ Error TS2300: Duplicate identifier 'TA'
interface IPoint { x: number }
type TPoint = { x: number };
declare function takeRec(r: Record<string, unknown>): void;
takeRec({} as TPoint);   // ✅ OK
takeRec({} as IPoint);   // ❌ Error: Index signature for type 'string' is missing
                         //    in type 'IPoint'
```

Rule of thumb: **interface for object shapes you own or extend, type alias for
unions and anything computed.** **→ ts#03**

## 8. Generics

A **generic** is a type with a hole in it, filled in at each use — the type
equivalent of a function parameter. Its job is to *relate* input to output.

```ts
function first<T>(items: T[]): T | undefined { return items[0]; }
const a = first([1, 2]);    // ✅ number | undefined
const b = first(['x']);     // ✅ string | undefined
function firstAny(items: any[]): any { return items[0]; }        // ❌ loses everything
function firstU(items: unknown[]): unknown { return items[0]; }  // ⚠️ safe but useless
declare function mapArr<T, U>(a: T[], f: (t: T) => U): U[];
const out = mapArr([1, 2], n => `#${n}`);   // ✅ string[]  (T=number, U=string)
```

**Constraints** with `extends` mean "T must at least be this" — without one the
compiler knows nothing about a bare `T`. **Generic classes** carry the parameter
across every member, and **defaults** plus `const` parameters fine-tune the call
site:

```ts
function longest<T extends { length: number }>(a: T, b: T): T {
  return a.length >= b.length ? a : b;
}
longest('ab', 'c');   // ✅ OK
longest(1, 2);        // ❌ Error: Argument of type 'number' is not assignable to
                      //    parameter of type '{ length: number; }'

class Box<T> {
  constructor(private value: T) {}
  map<U>(fn: (t: T) => U): Box<U> { return new Box(fn(this.value)); }
}
const b2 = new Box(3).map(String);   // ✅ Box<string>
class LruCache<K, V> {                                  // two parameters, correlated
  private map = new Map<K, V>();
  get(key: K): V | undefined { return this.map.get(key); }
}
type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E };
declare function tuple<const T extends readonly unknown[]>(...a: T): T;
const t = tuple(1, 'a');   // ✅ readonly [1, "a"] — `const` keeps the literals
```

**The rule of three:** don't reach for a generic until the third concrete copy.
A generic used at one type is a more complicated way to write that type.
**→ ts#16, ts#17, ts#41**

## 9. `keyof` and indexed access

`keyof T` is the union of T's property names; `T[K]` is the type at that name.
Together they type property access safely — the return type tracks the key.

```ts
interface User { id: number; name: string }
type UserKey = keyof User;    // 'id' | 'name'
type IdType = User['id'];     // number
type Any = User[keyof User];  // number | string
function get<T, K extends keyof T>(obj: T, key: K): T[K] { return obj[key]; }
declare const u: User;
const n: number = get(u, 'id');   // ✅ OK
get(u, 'nope');                   // ❌ Error: Argument of type '"nope"' is not
                                  //    assignable to parameter of type 'keyof User'

// Pair `keyof` with `typeof`, which reads a VALUE's type. Note that
// `Object.keys` is deliberately NOT keyof-aware — objects can carry extra
// properties at runtime.  → ts#18, ts#37
const routes = { home: '/', about: '/about' } as const;
type RouteName = keyof typeof routes;         // 'home' | 'about'
type RoutePath = (typeof routes)[RouteName];  // '/' | '/about'
const ks = Object.keys({ a: 1 });      // string[]  — not 'a'[]
const es = Object.entries({ a: 1 });   // [string, number][]
```

## 10. Utility types

Built-in generics that *derive* one type from another. A derivation can't drift;
a hand-copied shape always does. **→ ts#24**

```ts
interface User { id: number; name: string; email: string }
type Draft  = Partial<User>;              // every property optional
type Strict = Required<Draft>;            // every property required
type Frozen = Readonly<User>;             // every property readonly
type Ident  = Pick<User, 'id' | 'name'>;  // keep only these
type NoId   = Omit<User, 'id'>;           // keep everything else
type ById   = Record<string, User>;       // { [key: string]: User }
type Flags  = Record<'a' | 'b', boolean>; // { a: boolean; b: boolean }
declare function make(a: string, b: number): { ok: boolean };
type R = ReturnType<typeof make>;             // { ok: boolean }
type P = Parameters<typeof make>;             // [a: string, b: number]
type A = Awaited<Promise<Promise<number>>>;   // number  (unwraps all the way)
type NoA  = Exclude<'a' | 'b' | 'c', 'a'>;    // 'b' | 'c'
type Sure = NonNullable<string | null>;       // string
```

Naming the *stages* of a value is where these earn their keep: `Partial<User>`
is form state mid-edit, `Omit<User, 'id'>` is valid-but-not-yet-stored, and
plain `User` is the saved thing that has an id.

## 11. Mapped types

A **mapped type** walks another type's keys and rewrites each one. This is how
the utility types above are built. Modifiers come off with `-`; keys are
**remapped** with `as`; mapping a key to `never` **deletes** it — the trick
behind `Omit`. **→ ts#25**

```ts
type MyPartial<T> = { [K in keyof T]?: T[K] };
type MyReadonly<T> = { readonly [K in keyof T]: T[K] };
type MyRecord<K extends PropertyKey, V> = { [P in K]: V };
type Mutable<T> = { -readonly [K in keyof T]-?: T[K] };
type M = Mutable<{ readonly a?: string }>;   // ✅ { a: string }
interface User { id: number; name: string }
type Getters<T> = { [K in keyof T & string as `get${Capitalize<K>}`]: () => T[K] };
type G = Getters<User>;   // ✅ { getId: () => number; getName: () => string }
type Drop<T, K extends keyof T> = { [P in keyof T as P extends K ? never : P]: T[P] };
type D = keyof Drop<{ a: 1; b: 2; c: 3 }, 'b'>;   // ✅ 'a' | 'c'
```

## 12. Template literal types

String literal types built by interpolation. Built-ins: `Uppercase`,
`Lowercase`, `Capitalize`, `Uncapitalize`. Unions multiply out
(`${'a'|'b'}-${'x'|'y'}` is four strings), so keep the inputs small.

```ts
type Event = 'click' | 'focus';
type Handler = `on${Capitalize<Event>}`;   // ✅ 'onClick' | 'onFocus'
type Page = `page-${1 | 2}`;               // ✅ 'page-1' | 'page-2'

// Pattern-matching strings — with `infer` from the next section — is where this
// gets useful: a route helper can demand exactly the params its path mentions.
type Params<S extends string> =
  S extends `${string}:${infer P}/${infer Rest}` ? P | Params<Rest>
  : S extends `${string}:${infer P}` ? P
  : never;
type Ids = Params<'/users/:id/posts/:postId'>;   // ✅ 'id' | 'postId'
```

## 13. Conditional types and `infer`

`T extends U ? X : Y` is an `if` at the type level. `infer` declares a variable
*inside* the pattern, capturing whatever matched.

```ts
type IsString<T> = T extends string ? 'yes' : 'no';
type A = IsString<'x'>;   // 'yes'
type Unwrap<T> = T extends Promise<infer U> ? U : T;
type C = Unwrap<Promise<string>>;   // ✅ string
type D = Unwrap<number>;            // ✅ number
type ElemOf<T> = T extends readonly (infer E)[] ? E : never;
type E = ElemOf<number[]>;          // ✅ number

// DISTRIBUTION is the surprising part: a conditional over a *naked* type
// parameter runs once per union member. Wrapping in a tuple turns it off.
type NoNull<T> = T extends null | undefined ? never : T;
type F = NoNull<string | null | number>;   // ✅ string | number
type NonDist<T> = [T] extends [null] ? 'y' : 'n';
type G = NonDist<string | null>;           // ✅ 'n' — tested as one whole union
```

Forgetting distribution is a top-five source of "why is my type `never`?"
**→ ts#27**

## 14. Branded types

TypeScript is structural, so any `number` stands in for any other `number` —
including cents where you meant dollars. A **brand** is an impossible extra
property that makes two identical types incompatible. It exists only in the type
system; at runtime a `Cents` *is* a plain number, so arithmetic still works.

```ts
declare const brand: unique symbol;
type Cents = number & { readonly [brand]: 'Cents' };
declare function charge(c: Cents): void;
charge(100);   // ❌ Error: Argument of type 'number' is not assignable to
               //    parameter of type 'Cents'
function cents(n: number): Cents {
  if (!Number.isInteger(n)) throw new Error('cents must be whole');
  return n as Cents;        // the ONE sanctioned cast, inside a validator
}
charge(cents(100));         // ✅ OK
```

Same recipe for `UserId` vs `PostId`, validated `Email`, sanitized `Html`.
**→ ts#29**

## 15. `unknown` vs `any` at boundaries

`any` **switches the checker off** for that value, and the off-ness spreads.
`unknown` means "a value exists; I know nothing about it": everything is
assignable *to* it, nothing readable *from* it until you check.

```ts
declare const data: any;
const x = data.foo.bar;   // ✅ compiles — x is any
const s: string = x;      // ✅ compiles
const n: number = x;      // ✅ compiles too. Both cannot be true.
declare const u: unknown;
u.toUpperCase();                             // ❌ Error TS18046: 'u' is of type 'unknown'
if (typeof u === 'string') u.toUpperCase();  // ✅ OK

// The boundary that matters most: JSON.parse and res.json() both return `any`.
// Validate ONCE at the edge and the compiler trusts you everywhere inside —
// runtime validation is what creates compile-time trust.
function isUser(v: unknown): v is User {
  return typeof v === 'object' && v !== null
    && 'id' in v && typeof (v as { id: unknown }).id === 'number';
}
const raw: unknown = JSON.parse(text);
if (!isUser(raw)) throw new Error('bad payload');
raw.id.toFixed(0);   // ✅ raw: User

// Worth knowing: `{}` means "anything but null/undefined", not "empty object".
const a: {} = 5;       // ✅ OK  (surprising!)
const b: object = 5;   // ❌ Error: Type 'number' is not assignable to type 'object'
```

**→ ts#01, ts#13, ts#23, ts#34**

## 16. `satisfies` vs `as`

Three tools that look similar and behave completely differently.

| Tool | Checks the value? | Changes the type? |
|------|------------------|-------------------|
| `const x: T = v` (annotation) | ✅ yes | ✅ yes — becomes exactly `T` |
| `const x = v as T` (assertion) | ❌ **no** | ✅ yes — you overruled the compiler |
| `const x = v satisfies T` | ✅ yes | ❌ no — keeps the precise inferred type |

```ts
interface Full { a: string; b: string }
const bad = { a: 'x' } as Full;          // ✅ compiles — b is missing!
bad.b.toUpperCase();                     // ✅ compiles, 💥 crashes at runtime
const good = { a: 'x' } satisfies Full;  // ❌ Error TS2741: Property 'b' is missing
                                         //    in type '{ a: string; }'
const n1 = 'str' as number;              // ❌ Error TS2352: neither type
                                         //    sufficiently overlaps with the other
const n2 = 'str' as unknown as number;   // ✅ compiles. Double casts are confessions.
```

`satisfies` beats an annotation for literal data because the annotation *forgets*
what it checked. Subtlety: plain `satisfies` keeps the *keys* precise but lets
*values* widen (the target contextually types them), so add `as const` when you
want literal values too.

```ts
const r1: Record<string, string> = { home: '/', about: '/about' };
r1.amdin;   // ✅ compiles — "any string key is fine", typo yields undefined
const r2 = { home: '/', about: '/about' } satisfies Record<string, string>;
r2.amdin;   // ❌ Error: Property 'amdin' does not exist on type '{ home: string; … }'
const r3 = { home: '/' } satisfies Record<string, string>;           // r3.home: string
const r4 = { home: '/' } as const satisfies Record<string, string>;  // ✅ r4.home: '/'
```

**Excess property checking** is a free typo-catcher — it works with annotations
and `satisfies`, never with `as`, and only on object *literals*. **Rule: every
`as` is a confession that a check is being skipped**; the only two always-safe
forms are `as const` and `as unknown` (which removes power). **→ ts#14, ts#31**

```ts
interface Theme { primary: string }
const t1: Theme = { primary: '#1', extra: 1 };   // ❌ Error TS2353: 'extra' does not
                                                 //    exist in type 'Theme'
const raw2 = { primary: '#1', extra: 1 };
const t2: Theme = raw2;                          // ✅ compiles — via a variable
```

## 17. Testing your types

`// @ts-expect-error` asserts that the **next line fails to compile**. If it
compiles, `tsc` flags the directive as unused — so these are real tests that
fail when broken. Prefer it over `// @ts-ignore`, which suppresses forever and
never complains. For when "assignable" isn't strict enough, assert *exact*
types. **→ ts#42**

```ts
type RequestState = { status: 'loading' } | { status: 'success'; data: string };
// @ts-expect-error — loading must not carry data
const bad: RequestState = { status: 'loading', data: 'stale' };
// @ts-expect-error — success requires data
const bad2: RequestState = { status: 'success' };
// @ts-expect-error
const fine: string = 'this actually compiles';
// ❌ Error TS2578: Unused '@ts-expect-error' directive.
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
type Expect<T extends true> = T;
type _t1 = Expect<Equal<ReturnType<() => string>, string>>;   // ✅ OK
```

## 18. Designing with types

**Make impossible states unrepresentable.** Count what a type can represent
versus what is meaningful. The tell that a type has failed you is **defensive
code**: if you are writing `?? '(should never happen)'`, the type permits
something you know can't happen. **Discriminated unions are the default move** —
the same shape models request lifecycles, reducer actions, parser AST nodes,
wizard steps, and results. **→ ts#10, ts#30, ts#32, ts#40**

```ts
interface RequestState { isLoading: boolean; data?: string; error?: string }
// 2 × 2 × 2 = 8 representable combinations; 4 are real. The rest are bugs waiting.
type RequestState2 =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: string }
  | { status: 'error'; error: string };
// ✅ exactly 4. "Loading with stale data" is now unwritable, not merely unwise.
type Action = { type: 'add'; text: string } | { type: 'remove'; id: string };
function reduce(state: string[], action: Action): string[] {
  switch (action.type) {
    case 'add': return [...state, action.text];   // ✅ text exists, id doesn't
    case 'remove': return state.filter(t => t !== action.id);
  }
}

// ERRORS AS VALUES: a thrown exception is invisible in a signature, but a
// Result is right there in the return type, so handling failure stops being
// optional. And MODEL THE MACHINE, NOT THE FLAGS — illegal jumps stop
// typechecking.  → ts#33, ts#35, ts#36
type Result<T, E = string> = { ok: true; value: T } | { ok: false; error: E };
function parseNum(s: string): Result<number> {
  const n = Number(s);
  return Number.isNaN(n) ? { ok: false, error: `'${s}' is not a number` }
                         : { ok: true, value: n };
}
const r = parseNum('12');
r.value;                      // ❌ Error: does not exist on the failure variant
if (r.ok) r.value.toFixed(0); // ✅ OK
type Transitions = {
  idle: 'loading'; loading: 'success' | 'error';
  success: 'idle'; error: 'idle' | 'loading';
};
type Next<S extends keyof Transitions> = Transitions[S];  // 'success' | 'error'
```

**Annotate boundaries, infer the inside.** Type the edges — parameters, exported
returns, parsed input — and let the middle infer. Over-annotating locals adds
maintenance without adding safety. **→ ts#02, ts#33, ts#34**

## 19. TS traps: top 15

1. **`any` is contagious.** One `any` at a boundary unchecks every expression it
   flows into — `const s: string = v` and `const n: number = v` both compile
   from the same value. → ts#01
2. **`JSON.parse` returns `any`** — so does `res.json()`. Every "the API changed
   and we shipped it" bug starts here. Take it as `unknown`, validate. → ts#13
3. **`typeof null === 'object'`**, so that check does not exclude null. → ts#09
4. **`as` checks nothing.** `{ a: 1 } as Full` compiles with `b` missing;
   `satisfies` catches it. `as unknown as T` skips even the overlap check. → ts#14
5. **`!` is a promise you can't keep.** `el.v!` compiles and crashes — it's an
   assertion, not a check. → ts#05
6. **`||` swallows `0` and `''`.** Use `??` for defaults. → ts#05
7. **Object property literals widen.** `const c = { dir: 'asc' }` is
   `{ dir: string }`, which won't fit `'asc' | 'desc'`. Add `as const`. → ts#31
8. **Array indexing is unchecked by default.** `arr[999]` types as `number`.
   `noUncheckedIndexedAccess` fixes it and is *not* part of `strict` — and even
   with it on, `if (arr.length > 0)` still doesn't narrow `arr[0]`. → ts#39
9. **`Object.keys` returns `string[]`, not `keyof T`** — deliberate, since
   objects may carry extra properties at runtime. → ts#18
10. **Excess property checks only fire on object literals.** Assign through a
    variable and the typo sails past. → ts#14
11. **`.filter` narrows only from a simple arrow** — `filter(v => Boolean(v))`
    or a braced body does not. Write `(v): v is string =>` when in doubt. → ts#11
12. **Conditional types distribute over unions.** `T extends X ? A : B` runs per
    member unless you wrap it: `[T] extends [X]`. → ts#27
13. **Method syntax is bivariant; property syntax isn't.** `{ m(a: Dog): void }`
    is accepted where `{ m(a: Animal): void }` is wanted — inherited
    unsoundness. `{ m: (a: Dog) => void }` is correctly rejected. → ts#15
14. **Arrays are covariant, which is unsound.** `const animals: Animal[] = dogs`
    compiles, then `animals.push(cat)` corrupts `dogs`. Use `readonly T[]` for
    parameters you don't mutate. → ts#08
15. **A type predicate's body is never verified.** `v is string` is trusted on
    your word; a wrong guard is a silent `any`. Keep predicates tiny. → ts#11

## The one-line summary

Types are not decoration and not documentation — they are a *design tool*. The
skill this track builds is choosing shapes so the wrong program doesn't
typecheck, then letting inference fill in everything the compiler can already
see.
