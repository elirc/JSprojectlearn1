# 🏋️ Practice: Bank Account (Encapsulation)

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. Pin two untested edge cases: `Infinity` and `0` (warm-up)

The validator rejects `NaN`, strings, and negatives — all tested. But nothing tests `deposit(Infinity)` or `withdraw(0)`. Write tests (for both implementations) asserting both throw `RangeError` and the balance is unchanged afterwards. They should pass with the current code — and fail if you weaken the validator to only `amount < 0`.

**Practices:** reading a validator clause-by-clause and pinning each clause with a test.

**Hint:** which clause catches `Infinity`? Which catches `0`? (`Number.isFinite` and `<= 0` respectively.)

### ⭐⭐ 2. `transfer(from, to, amount)` — through public doors only (core)

Write a standalone function that moves money between two accounts using only `withdraw` and `deposit`. Order matters: if the withdrawal throws (bad amount, insufficient funds), the destination must not change. Expected: transferring 30 between two 100-balance accounts gives 70/130; a failed `transfer(a, b, 999)` throws and leaves both balances exactly as they were. Bonus: it should work even when `from` is a class account and `to` is a closure account.

**Practices:** the "smallest set of doors" idea — new behavior that needs zero access to private state.

**Hint:** two lines. Which one goes first, and why?

### ⭐⭐ 3. Close the shallow-copy hole (core)

LEARN.md's experiment 4 showed that `[...history]` copies the array but shares the entry objects — `statement[0].amount = 999999` rewrites the real history. Fix `getStatement()` in both implementations to return copied entry objects too, then write the test: mutate an entry in a returned statement and assert a fresh `getStatement()` still shows the original amount.

**Practices:** copy depth — an array copy is not a data copy.

**Hint:** `this.#history.map((entry) => ({ ...entry }))`.

### ⭐⭐ 4. Protect the `owner` field (core)

Both implementations guard the balance ferociously but leave `acct.owner = 'Mallory'` wide open. Fix both: in the class, store `#owner` privately and expose a getter; in the closure factory, `Object.freeze` the returned object. Expected: reassigning `owner` throws a `TypeError` (module code is strict mode), and `acct.owner` still reads correctly. Check that deposits still work after freezing.

**Practices:** getter-only properties and `Object.freeze` — two more kinds of locked door.

**Hint:** freezing is shallow and only locks the object's *properties* — the closure's `balance` variable and `history` array aren't properties, so the methods keep working.

### ⭐⭐⭐ 5. A third implementation: the limited account (challenge)

Build `createLimitedAccount(owner, opening, { maxWithdrawal })` by *wrapping* an existing account (composition — don't copy the logic): its `withdraw` first checks the cap, then delegates to the inner account's `withdraw`. Then add it to the test file's `IMPLEMENTATIONS` list (with a high cap like 1000) — all five shared contract tests must pass unchanged. Finally add one new test: with a cap of 100, `withdraw(101)` throws `/limit is 100/` and the balance is untouched, while `withdraw(100)` succeeds.

**Practices:** programming to a contract — the shared suite is the contract, and any implementation that honors it plugs in.

**Hint:** `return { ...inner, withdraw(amount) { ... inner.withdraw(amount); } };` — spread the inner account, override one door.

## Solutions

### 1. Edge-case tests

```js
test(`${style}: Infinity and zero are rejected too`, () => {
  const acct = makeAccount('Ada', 100);
  assert.throws(() => acct.deposit(Infinity), RangeError);
  assert.throws(() => acct.deposit(0), RangeError);
  assert.throws(() => acct.withdraw(0), RangeError);
  assert.equal(acct.getBalance(), 100);
});
```

**Why:** `Infinity` passes `typeof === 'number'` but fails `Number.isFinite`; `0` passes both but fails `amount <= 0`. Each clause of a validator earns its keep only if some test would fail without it — this test makes two more clauses load-bearing.

### 2. `transfer`

```js
export function transfer(from, to, amount) {
  from.withdraw(amount); // validates amount AND funds — throws before any change
  to.deposit(amount);
}
```

**Why:** withdraw goes first because it's the operation that can fail — if it throws, the deposit line never runs and neither account changed (LEARN's "validate first, mutate last", one level up). Because it only uses the public doors, it works across both implementations without knowing which one it holds. Verified with node: 70/130 after success, unchanged after failure, and class-to-closure transfers work.

### 3. Deep statement copies

```js
// class
getStatement() {
  return this.#history.map((entry) => ({ ...entry }));
}
// closure factory
getStatement: () => history.map((entry) => ({ ...entry })),
```

Test: `const stmt = acct.getStatement(); stmt[0].amount = 999999; assert.equal(acct.getStatement()[0].amount, 10);`

**Why:** the invariant "history cannot be rewritten" was only half-enforced — the array was copied, its objects were shared references (project 25's value-vs-reference lesson biting again). Mapping to fresh objects removes the last remote control into private state.

### 4. Read-only owner

```js
// class: replace `this.owner = owner` with a private field + getter
#owner;
constructor(owner, openingBalance = 0) {
  this.#owner = owner;
  if (openingBalance > 0) this.deposit(openingBalance);
}
get owner() { return this.#owner; }

// closure factory: freeze the returned object
const account = Object.freeze({ owner, deposit(...) { ... }, ... });
```

**Why:** a getter with no setter makes assignment throw a `TypeError` in strict mode (verified with node) — the same mechanism already protecting `balance`. `Object.freeze` achieves it for a plain object; it's shallow, but that's enough here because the real state lives in closure variables, which freezing can't and needn't touch.

### 5. `createLimitedAccount`

```js
export function createLimitedAccount(owner, opening = 0, { maxWithdrawal = Infinity } = {}) {
  const inner = createAccount(owner, opening);
  return {
    ...inner,
    withdraw(amount) {
      if (amount > maxWithdrawal) {
        throw new RangeError(`Cannot withdraw ${amount}: limit is ${maxWithdrawal}`);
      }
      inner.withdraw(amount);
    },
  };
}
// in the test file:
// ['limited', (owner, opening) => createLimitedAccount(owner, opening, { maxWithdrawal: 1000 })],
```

**Why:** composition reuses every invariant the inner account already enforces — validation, overdraft protection, history — and adds exactly one new rule at one door. The shared suite passing proves the wrapper is contract-faithful; the new cap test proves the added rule works. Verified with node: all shared behaviors pass, `withdraw(101)` throws `/limit is 100/` with balance untouched, `withdraw(100)` succeeds.
