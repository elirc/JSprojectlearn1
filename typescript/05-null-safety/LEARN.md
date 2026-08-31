# 📘 Learning Guide: Null Safety

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What is this exercise about?

The code looks up a user account by username and reports when they last logged in: `"ada last seen 2026-07-01..."`.

The type-level problem: two things can be missing here. The account might not exist at all (searching for `'bob'` finds nothing), and an existing account might never have logged in (`'grace'` has `lastLogin: null`). The compiler *knew* about both possibilities and asked about them — and the author answered both times with `!`, the "trust me" operator. Both trusts were misplaced: the code crashes for `'bob'` and crashes differently for `'grace'`. The lesson: answer the compiler's "what if it's missing?" with a real check, not an assertion.

## 2. Concepts you need first

### `null` vs `undefined` (two flavors of "nothing")

JavaScript has TWO nothing-values, and this exercise leans on the difference:

- `undefined` — "nothing here, nobody set anything." What you get from a failed array search, a missing property, an unassigned variable.
- `null` — "deliberately empty." A value someone *chose* to store, meaning "known to be absent."

In this exercise: `findAccount('bob')` returns `undefined` (no such account — the search found nothing), while grace's `lastLogin` is `null` (the account exists; someone recorded "she has never logged in"). Same "missing-ness" at a glance, different *meanings*.

### Union types with `null`/`undefined`

A union type (`|` means "or") can include the nothing-values:

```ts
let last: Date | null = null;          // a Date, or deliberately empty
let found: string | undefined;         // a string, or nothing was found
```

### `strictNullChecks` (the setting that makes this exercise possible)

Part of strict mode. With it ON (as in this repo), `null` and `undefined` are NOT sneakily part of every type — if a value might be null, its type must SAY so, and the compiler blocks you from using it until you check:

```ts
let maybe: Date | undefined;
maybe.toISOString();    // ❌ Error: 'maybe' is possibly 'undefined'
```

Without this setting (old-style TypeScript), that line compiles and crashes. With it, every possible-missing value becomes a question the compiler asks you at compile time.

### `Array.find` returns `T | undefined`

```ts
const nums = [1, 2, 3];
const hit = nums.find((n) => n > 10);   // type: number | undefined
hit.toFixed(1);                          // ❌ Error: 'hit' is possibly 'undefined'
```

The type is honest: the search might fail. This is where our `Account | undefined` comes from.

### Narrowing with guard clauses

**Narrowing** = the compiler shrinking a type because your code checked it. A **guard clause** is an early `return` that handles the bad case first:

```ts
function report(hit: number | undefined): string {
  if (hit === undefined) {
    return "not found";     // the undefined case EXITS here
  }
  return hit.toFixed(1);    // ✅ OK — hit is now just `number`
}
```

After the `if`, the compiler has *removed* `undefined` from `hit`'s type. No cast, no assertion — the control flow itself is the proof. Hover `hit` in an editor before and after the `if` to watch the type change.

### The non-null assertion `!` (the villain here)

`expr!` tells the compiler "this is not null or undefined — don't check." It performs NO runtime check; it just silences the question:

```ts
const hit = nums.find((n) => n > 10)!;   // "it'll be there"
hit.toFixed(1);   // ✅ compiles — 💥 crashes at runtime when the search fails
```

### The gentle tools: `?.` and `??`

**Optional chaining** `?.`: access a property only if the left side isn't null/undefined; otherwise the expression is `undefined` (no crash). **Nullish coalescing** `??`: provide a fallback for null/undefined only.

```ts
const label = account?.lastLogin?.toISOString() ?? "never";
```

Read as: "if account exists, and its lastLogin exists, format it; anything missing along the way → 'never'." Note `??` differs from `||`: `||` also replaces `0` and `''` (legitimate values that happen to be "falsy"), which causes its own bugs.

## 3. Walking through the original code

Open `original.ts`. The data model is actually good:

```ts
export interface Account {
  username: string;
  lastLogin: Date | null; // null = has never logged in
}
```

The type honestly says `lastLogin` can be null, and the comment says what null *means*. Two accounts exist: `'ada'` (has a login date) and `'grace'` (null — never logged in).

```ts
export function findAccount(username: string): Account | undefined {
  return ACCOUNTS.find((a) => a.username === username);
}
```

Also honest: search may fail, so `Account | undefined`.

Then the report function throws all that honesty away:

```ts
const account = findAccount(username)!;
const when = account.lastLogin!.toISOString();
return `${account.username} last seen ${when}`;
```

Two `!` marks. The first says "the account will exist" — false for `lastLoginReport('bob')`, which crashes reading `.lastLogin` off `undefined`. The second says "they'll have logged in" — false for `'grace'`, which crashes calling `.toISOString()` on `null`.

The final line is the trap that ships this bug:

```ts
export const ok = lastLoginReport('ada'); // works, breeding false confidence
```

Ada exists and has logged in, so the happy path works. "I ran it, it's fine."

## 4. What's wrong with it (in beginner terms)

**Flaw 1 — the compiler asked; the author bluffed.** With `strictNullChecks` on, both dangerous reads produced compile errors. Each `!` is the author overruling a correct warning. The compiler was right twice.

**Flaw 2 — two different crashes.** Runtime story: someone types "bob" in the search box. `findAccount` returns `undefined`, the first `!` waves it through, and `undefined.lastLogin` throws `TypeError: Cannot read properties of undefined`. Different user, "grace": account found, but `null.toISOString()` throws `TypeError: Cannot read properties of null`. Two distinct bugs, one operator.

**Flaw 3 — the erased distinction.** `undefined` here means "no such user"; `null` means "user exists, never logged in." A real product wants different messages for those ("user not found" vs "grace has never logged in"). The `!`s didn't just skip safety — they skipped two *product requirements*. This is the README's deepest point: the branches you're tempted to `!` away usually contain real requirements.

**Flaw 4 — happy-path testing.** Testing only `'ada'` proves nothing about the missing cases. The type system was the one "test" that covered them — and it was silenced.

## 5. Try it yourself first!

1. **Vague hint:** There are two `!` marks. Each one is skipping a question. Write down, in English, the two questions.
2. **Warmer:** For each question, decide what the function should *return* in that case. (You're allowed to invent friendly messages — that's the point.)
3. **Warmer still:** Handle the missing account first with a guard clause: `if (account === undefined) return ...`. Watch the red squiggle on the next line disappear — the type narrowed.
4. **Specific:** Then handle `lastLogin === null` with a second guard clause and its own message. After both guards, `account.lastLogin.toISOString()` compiles with zero assertions.
5. **Bonus:** Write a compact one-liner version using `?.` and `??` that returns just the date string or `'never'`. When is the compact version appropriate, and when do you want the two distinct messages?

## 6. Understanding the refactored solution

Open `refactored/accounts.ts`. Same interface, same data, same `findAccount` — only the report changed.

**Guard clause one — the missing account:**

```ts
const account = findAccount(username);
if (account === undefined) {
  return `no such user: ${username}`;
}
```

After this `if`, `account` is narrowed from `Account | undefined` to `Account`. The compiler tracked the check; hover the variable to see it.

**Guard clause two — the never-logged-in case:**

```ts
if (account.lastLogin === null) {
  return `${account.username} has never logged in`;
}
```

Now `account.lastLogin` narrows from `Date | null` to `Date`. And notice: the branch produces a *useful message* — "has never logged in" is information a user actually wants. The `!` was skipping a feature, not just a check.

**The payoff line:**

```ts
return `${account.username} last seen ${account.lastLogin.toISOString()}`;
```

Plain property access, zero assertions. The safety checks and the type checks are the same lines — that's what "the control flow is the proof" means.

**The compact alternative** (`lastLoginBadge`) shows the light-touch toolkit — `?.` chains through both maybes and `??` supplies `'never'`. Good when one fallback covers all missing cases; the guard-clause version is better when the cases mean different things.

**The demo lines** now call all three usernames — `'ada'`, `'grace'`, `'bob'` — and none crash. **The type tests** pin both original crash sites as must-not-compile.

## 7. Words you learned (glossary)

- **`null`** — deliberate emptiness; a stored "known to be absent."
- **`undefined`** — nothing was found/set; absence by default.
- **`strictNullChecks`** — compiler setting making null/undefined visible in types and unusable until checked.
- **Union type (`|`)** — "one of these types," e.g. `Date | null`.
- **Narrowing** — the compiler shrinking a union based on your runtime checks.
- **Guard clause** — an early `return` handling an edge case before the main logic.
- **Non-null assertion (`!`)** — "trust me, not null/undefined." No runtime check; crashes when wrong.
- **Optional chaining (`?.`)** — safe access that short-circuits to `undefined` instead of crashing.
- **Nullish coalescing (`??`)** — fallback for null/undefined only (unlike `||`, which also replaces `0` and `''`).
- **Happy path** — the scenario where everything goes right; the only one that got tested here.
- **Falsy** — values JavaScript treats as false: `0`, `''`, `null`, `undefined`, `NaN`, `false`.

## 8. Experiments to try on the plane (no internet needed)

Run `npm run typecheck` from the `typescript/` folder after each change. Undo between experiments.

1. **In `refactored/accounts.ts`**, delete the `if (account === undefined)` block. Expected: ❌ errors on the lines below — "'account' is possibly 'undefined'" — the compiler re-asks the question the guard was answering.
2. **In `refactored/accounts.ts`**, change the first guard to `if (!account)`. Expected: ✅ still compiles — truthiness checks also narrow. Discussion for the plane: `!account` would ALSO catch an account that was somehow `null`... but here the type says only `undefined` is possible, so both spellings are safe. The `===` version documents intent more precisely.
3. **In `refactored/accounts.ts`**, in `lastLoginBadge`, change `??` to `||`. Expected: ✅ compiles — both are legal here. Then consider: if the fallback chain produced `''` or `0` as a legitimate value, `||` would wrongly replace it. `??` only fills genuine nothing. (This is why the file's comment calls out the difference.)
4. **In `refactored/accounts.ts`**, swap the two guard clauses (check `account.lastLogin === null` first). Expected: ❌ error on the moved line — "'account' is possibly 'undefined'" — you can't ask about `lastLogin` before proving `account` exists. Narrowing has an order.
5. **In `refactored/accounts.ts`**, after both guards, add `const t: number = account.lastLogin.getTime();`. Expected: ✅ no error — the narrowed type is a real `Date` and all its methods are available, assertion-free.
