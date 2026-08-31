# 🏋️ Practice: Shared Interfaces

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

Write your code in a scratch file inside this folder (e.g. `practice.ts`) — `npm run typecheck` from the `typescript/` folder picks it up. You can import the real thing with `import type { User } from './refactored/user.js';` (`.js` is this repo's import convention) or copy the interface.

## Exercises

### ⭐ 1. Extract the interface (warm-up)

These two functions describe the same product inline, twice. Extract one `interface Product` and point both signatures at it.

```ts
function priceLabel(product: { sku: string; price: number }): string {
  return `${product.sku}: $${product.price.toFixed(2)}`;
}
function applyDiscount(product: { sku: string; price: number }, percent: number) {
  return { ...product, price: product.price * (1 - percent / 100) };
}
```

**Practices:** replacing inline copies with one named authority.
**Hint:** also annotate `applyDiscount`'s return type — it returns a `Product` too.
**Check:** both compile; `priceLabel({ sku: 'KB-01' })` must error with roughly `Property 'price' is missing`.

### ⭐⭐ 2. Compose a bigger concept (core)

Using the existing `User`, define `interface Team` with a `name` and a `members: User[]` array, plus `teamEmails(team: Team): string[]`. Build one `Team` value with two members to prove it works.

**Practices:** interfaces referencing other interfaces — concepts compose instead of being restated.
**Hint:** the `map` callback needs no annotation; `member` flows from `User[]`.
**Check:** compiles cleanly; a member object missing `plan` inside your team literal must error with roughly `Property 'plan' is missing in type ... type 'User'`.

### ⭐⭐ 3. Unify and let the compiler find the typo (core)

Here's a mini-module with drift already in it — one signature spells the field `usrname`. Extract one `interface Profile { username: string; joined: Date }`, point all three functions at it, and let the compiler locate the bug *inside* the guilty function.

```ts
function banner(p: { username: string; joined: Date }) {
  return `${p.username} since ${p.joined.getFullYear()}`;
}
function anniversary(p: { username: string; joined: Date }) {
  return p.joined.getMonth() === new Date().getMonth();
}
function atName(p: { usrname: string; joined: Date }) {
  return '@' + p.usrname;
}
```

**Practices:** the error moving from innocent call sites to the real bug.
**Hint:** after unifying, the only red line should be inside `atName`.
**Check:** `p.usrname` must error with roughly `'usrname' does not exist on type 'Profile'` — note it errors in the *function*, not at a caller.

### ⭐⭐ 4. Extend, don't fork (core)

An admin is a user with extra powers. Write `interface Admin extends User { permissions: string[] }` and `canDeploy(admin: Admin): boolean` (true if `'deploy'` is in the list). Then confirm both directions of the relationship: an `Admin` can be passed to `greet(user: User)`, but a plain `User` cannot be passed to `canDeploy`.

**Practices:** `extends` for is-a relationships + structural typing.
**Hint:** `extends` copies all of `User`'s fields into `Admin` — no restating.
**Check:** `greet(someAdmin)` must compile; `canDeploy(somePlainUser)` must error with roughly `Property 'permissions' is missing`.

### ⭐⭐⭐ 5. The extra-property mystery (challenge)

Predict, then verify: (a) `const u: User = { name: 'X', email: 'x@x.dev', plan: 'free', nickname: 'x' };` — compile or error? (b) The same data first stored in a variable typed as `interface NickUser extends User { nickname: string }`, then assigned to a `User` variable — compile or error? Explain why the two differ.

**Practices:** excess property checks on fresh literals vs plain structural assignment.
**Hint:** the compiler is extra-suspicious of *object literals written directly at* a typed position — a likely-typo heuristic, not a structural rule.
**Check:** (a) must error with roughly `Object literal may only specify known properties, and 'nickname' does not exist in type 'User'`; (b) must compile.

## Solutions

### Solution 1

```ts
interface Product {
  sku: string;
  price: number;
}

function priceLabel(product: Product): string {
  return `${product.sku}: $${product.price.toFixed(2)}`;
}

function applyDiscount(product: Product, percent: number): Product {
  return { ...product, price: product.price * (1 - percent / 100) };
}
```

WHY: two inline copies were two chances to drift; now both functions sign against one authority. Annotating `applyDiscount`'s return as `Product` also protects its *output* — if a refactor accidentally drops `sku` from the returned object, the error lands here, not at the next consumer.

### Solution 2

```ts
import type { User } from './refactored/user.js';

interface Team {
  name: string;
  members: User[];
}

function teamEmails(team: Team): string[] {
  return team.members.map((member) => member.email);
}

const docs: Team = {
  name: 'Docs',
  members: [
    { name: 'Ada', email: 'ada@engine.dev', plan: 'pro' },
    { name: 'Grace', email: 'grace@navy.mil', plan: 'free' },
  ],
};
```

WHY: `Team` doesn't restate what a user is — it *references* `User`, so any future change to `User` (a new required field, a rename) automatically flows into every team, and the compiler lists the data that needs updating. This is the one-authority rule scaling up: types composing types, like functions calling functions.

### Solution 3

```ts
interface Profile {
  username: string;
  joined: Date;
}

function banner(p: Profile): string {
  return `${p.username} since ${p.joined.getFullYear()}`;
}

function anniversary(p: Profile): boolean {
  return p.joined.getMonth() === new Date().getMonth();
}

function atName(p: Profile): string {
  return '@' + p.username; // was p.usrname — the compiler pointed HERE
}
```

WHY: before unifying, `atName`'s typo was legal — it was just a *different* inline type, and only callers suffered (with errors pointed at their correct objects). Once all three signatures reference `Profile`, the misspelling becomes an error inside `atName`, exactly where the fix belongs. That error-location flip is the whole payoff of shared interfaces.

### Solution 4

```ts
import type { User } from './refactored/user.js';
import { greet } from './refactored/user.js';

interface Admin extends User {
  permissions: string[];
}

function canDeploy(admin: Admin): boolean {
  return admin.permissions.includes('deploy');
}

const root: Admin = {
  name: 'Root',
  email: 'root@engine.dev',
  plan: 'pro',
  permissions: ['deploy', 'billing'],
};

greet(root); // ✅ an Admin has everything a User has

declare const plainUser: User;
// @ts-expect-error — a plain User lacks permissions
canDeploy(plainUser);
```

WHY: `extends` states the is-a relationship once instead of copy-pasting `User`'s fields (which would drift, this exercise's villain). Structural typing makes the subtype direction free: `Admin` has every `User` field, so `greet` accepts it; the reverse fails because `permissions` is genuinely missing.

### Solution 5

```ts
import type { User } from './refactored/user.js';

// (a) fresh literal: ERROR — excess property check
// @ts-expect-error — 'nickname' does not exist in type 'User'
const direct: User = { name: 'X', email: 'x@x.dev', plan: 'free', nickname: 'x' };

// (b) via a named subtype: compiles
interface NickUser extends User {
  nickname: string;
}
const nick: NickUser = { name: 'X', email: 'x@x.dev', plan: 'free', nickname: 'x' };
const viaSubtype: User = nick; // ✅ extra property is fine structurally
```

WHY: structurally, an object with an *extra* property still satisfies `User` — that's what makes (b) legal and is the same rule that let `Admin` pass into `greet`. But when you write an object literal *directly* at a typed position, the compiler applies an extra "excess property check": a brand-new literal with a key the type doesn't know is almost always a typo (imagine `nickmane`), so it's rejected on the spot. Same data, different judgment — because in (a) the literal is fresh and in (b) it already passed through a type that legitimizes `nickname`.
