# 📘 Learning Guide: Bank Account (Encapsulation)

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A bank account object with three rules that must *never* break:

1. Amounts must be positive real numbers — `withdraw(-500)` and `deposit("50")` should be rejected.
2. The balance can never go below zero (no overdrafts).
3. Every change to the balance appears in the history.

```js
const acct = new BankAccount("Ada", 100);
acct.deposit(50);
acct.withdraw(30);
console.log(acct.balance);       // 120
acct.withdraw(999);              // throws: Cannot withdraw 999: balance is 120
```

Running `node original.js` shows the flawed version: rules exist only as good intentions, and three one-liners corrupt the account with zero errors.

## 2. Concepts you need first

### Objects with methods

An object can hold functions. A function stored on an object is a **method**:

```js
const dog = {
  name: "Rex",
  speak: function () { console.log(this.name + " says woof"); },
};
dog.speak(); // Rex says woof
```

### `this` — and why it's a loaded gun

Inside a method, `this` means "the object left of the dot at **call time**". Not where the function was written — how it was *called*:

```js
const dog = { name: "Rex", speak() { console.log(this.name); } };
dog.speak();            // Rex          (this = dog)
const s = dog.speak;    // detach the method from its object
s();                    // crash or undefined — this is no longer dog!
```

Detaching happens constantly in real code: passing a method as a callback, to `setTimeout`, to a button's click handler. The method silently forgets its object. Fixes: wrap it in an arrow (`() => dog.speak()`), or design without `this` entirely (closures — below).

### Invariants

An **invariant** is a rule about your data that must always be true — "balance matches history", "no negative balance". The question this project asks: is your invariant *enforced by the code*, or is it just a hope that every caller behaves?

### Encapsulation

**Encapsulation** means hiding data behind a small set of controlled "doors" (methods), so the only way to change the data is through code that checks the rules. If there's no door for `balance = 1000000`, that corruption becomes impossible rather than merely impolite.

### Classes, constructors, and `new`

A **class** is a blueprint for objects. The **constructor** runs when you build one with `new`:

```js
class Counter {
  constructor(start) { this.count = start; }
  increment() { this.count++; }
}
const c = new Counter(10);
c.increment();
console.log(c.count); // 11
```

### `#private` fields

A field name starting with `#` is **truly private**: only code inside the class can touch it. This is enforced by the language — outside access isn't "discouraged", it's a syntax error / undefined:

```js
class Safe {
  #gold = 100;
  peek() { return this.#gold; }
}
const s = new Safe();
console.log(s.peek());       // 100
console.log(s["#gold"]);     // undefined — no way in from outside
```

(You may see `_balance` with an underscore in older code — that's only a naming *convention*, a polite sign saying "please don't touch". `#` is a locked door.)

### Getters

A **getter** is a method that looks like a property when read:

```js
class Circle {
  #r = 2;
  get area() { return 3.14159 * this.#r * this.#r; }
}
console.log(new Circle().area); // 12.56636 — no parentheses!
```

A getter with no matching setter means the property is read-only — assigning to it throws (in modules/strict-mode code).

### Closures as an alternative to classes

Project 27's trick again: a factory function whose local variables are captured by the methods it returns. Privacy without `#`, and — crucially — without `this`:

```js
function makeCounter(start) {
  let count = start;                       // private by closure
  return { increment: () => { count++; }, value: () => count };
}
const c = makeCounter(10);
c.increment();
console.log(c.value()); // 11
```

Because the methods reference `count` directly (not `this.count`), you can detach them freely and they still work.

### Type coercion with `+`

JavaScript's `+` does double duty: numbers add, strings concatenate. Mix them and the number gets converted to a string:

```js
console.log(100 + 50);    // 150
console.log(100 + "50");  // "10050"  — glued, not added!
```

That's how `deposit("50")` turns a balance of `1000000` into the *string* `"100000050"`.

### Validation and throwing

Checking inputs at the door and refusing bad ones loudly:

```js
if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
  throw new RangeError(`Amount must be a positive number, got ${amount}`);
}
```

`Number.isFinite` rejects `NaN` and `Infinity`. `throw` stops the method immediately — the balance is never touched. The backticks are a **template literal**: a string where `${...}` inserts a value.

### Defensive copies

If a method returns your internal array directly, callers hold a reference to your private data — a remote control. Returning `[...history]` (a spread copy) hands out a snapshot instead.

## 3. Walking through the original code

One object literal with data and methods side by side:

```js
var account = {
  owner: "Ada",
  balance: 100,
  history: [],

  deposit: function (amount) {
    this.balance += amount;
    this.history.push("deposit " + amount);
  },
  ...
};
```

`deposit` adds to the balance and records a line; `withdraw` subtracts. Called politely, it works: deposit 50, withdraw 30, balance 120.

Then the demolition, three lines:

```js
account.balance = 1000000;   // direct edit, no history entry
account.withdraw(-500);      // "withdrawing" -500 ADDS money
account.deposit("50");       // string! balance becomes "100000050"
```

Line 1: the data is public, so anyone can just set it — history now lies. Line 2: `balance -= -500` is `balance += 500` — a money printer, dutifully logged as "withdraw -500". Line 3: `1000500 + "50"` string-glues into `"100000050"`; the balance isn't even a number anymore. No errors anywhere.

Finally the `this` trap:

```js
var pay = account.withdraw;
try {
  pay(10); // `this` is undefined here — crash
} catch (e) { ... }
```

Detached from `account`, `withdraw`'s `this` is undefined; `this.balance` explodes. The commented-out `setTimeout(account.withdraw, 10, 10)` is the same bug in async clothing — and there, the crash happens *later*, outside any `try/catch`, killing the whole program.

## 4. What's wrong with it (in beginner terms)

**Open data means rules are wishes.** Story: six months in, a coworker writing a "refund" feature does `account.balance += refund` directly because it was quicker than finding `deposit`. No history entry. At the end of the month, the statement doesn't add up to the balance, and you spend two days auditing every file that ever imported `account`. With encapsulation, their shortcut would have been *impossible* — the compiler-level kind of impossible.

**Negative withdraw = money printer.** A UI bug sends `-500` (say, the minus sign from a text field sneaks through). The account grows. Nobody notices until the numbers are audited, and the "withdraw -500" history line is the only clue.

**String deposit corrupts the type.** A form field's value is always a string. One missing `Number(...)` conversion and your balance is `"100000050"` — and every later `+=` makes it longer. Math on it (`balance * 0.05`) yields `NaN`, which spreads through everything downstream.

**Detached methods crash — later.** The `setTimeout` version is how people actually meet this bug: "schedule a withdrawal in 10ms". It doesn't crash where you wrote it; it crashes on the timer, outside your `try/catch`, with a stack trace pointing at nothing useful.

## 5. Try it yourself first!

Try fixing it before reading the solution. Hints, vague → specific:

1. The core question: how do you make `account.balance = x` *impossible*, not just frowned upon?
2. Two tools exist: a class with `#` fields, or a factory function with closure variables. Try either (or both!).
3. Every door (method) that changes money should first validate: is `amount` a number, finite, and greater than zero? Throw a `RangeError` if not.
4. `withdraw` needs one more check: `amount > balance` → throw, *before* subtracting.
5. Reading the balance: a getter (`get balance()`) or a `getBalance()` method. No setter!
6. `getStatement()` must return a *copy* of the history array — `[...history]`.
7. For the closure version: methods that use the captured `balance` variable directly never mention `this` — detach-proof by construction.

## 6. Understanding the refactored solution

The refactor builds the same account **twice** — once as a class, once as a closure factory — because knowing both styles means choosing, not defaulting.

**Style 1 — the class:**

```js
export class BankAccount {
  #balance = 0;
  #history = [];

  constructor(owner, openingBalance = 0) {
    this.owner = owner;
    if (openingBalance > 0) this.deposit(openingBalance);
  }
```

`#balance` and `#history` are language-enforced private. Neat detail: the constructor funnels the opening balance through `deposit` — so even the opening amount is validated *and* logged. One door, always.

```js
  withdraw(amount) {
    this.#validateAmount(amount);
    if (amount > this.#balance) {
      throw new RangeError(`Cannot withdraw ${amount}: balance is ${this.#balance}`);
    }
    this.#balance -= amount;
    this.#history.push({ type: 'withdraw', amount });
  }
```

Validate, check funds, then (and only then) change state and log. `#validateAmount` is a *private method* — shared by both doors, invisible outside. The getter `get balance()` allows reading; with no setter, `acct.balance = x` throws a `TypeError` (there's a test for exactly that). `getStatement()` returns `[...this.#history]` — a copy, so the past can't be rewritten from outside.

**Style 2 — the closure factory:**

```js
export function createAccount(owner, openingBalance = 0) {
  let balance = 0;
  const history = [];
  ...
  const account = {
    deposit(amount) { ... balance += amount; ... },
    withdraw(amount) { ... },
    getBalance: () => balance,
    getStatement: () => [...history],
  };
```

Same rules, same doors — but the private state is plain local variables, captured by closure. Notice what's absent: `this`. The methods mention `balance` directly, so `const pay = acct.withdraw; pay(10)` — the exact move that crashed the original — just works. Trade-offs: closures cost a little more memory per account (each account gets its own copies of the methods) and there's no `instanceof BankAccount` check; classes are the mainstream idiom but demand `this`-care.

**The tests** pull a clever move: one shared suite runs against *both* implementations. `IMPLEMENTATIONS` is a list of `[name, makeAccount]` pairs; a `for` loop registers every test once per style. A tiny adapter (`pickApi` plus `getBalance: () => acct.balance`) smooths over the surface difference (getter vs method). The suite proves each invariant: bad amounts throw *and the balance is unchanged*; overdrafts throw with a helpful message (matched by the regular expression `/balance is 20/`); every change appears in the statement; pushing onto a returned statement doesn't affect the real history. Two style-specific tests close it out: the class's privacy (`acct.balance = x` throws `TypeError`) and the closure's detach-proof methods.

## 7. Words you learned (glossary)

- **Method**: a function stored on an object.
- **`this`**: inside a method, the object it was called on — decided at *call time*.
- **Detached method**: a method stored in a plain variable; it loses its `this`.
- **Invariant**: a rule about your data that must always hold.
- **Encapsulation**: hiding data so it can only change through rule-checking methods.
- **Class / constructor / `new`**: blueprint / its setup function / the keyword that builds an instance.
- **Instance**: one object built from a class.
- **`#private` field**: class data unreachable from outside — enforced by the language.
- **Convention (`_name`)**: a naming hint with no enforcement behind it.
- **Getter**: a method read like a property (`acct.balance`, no parentheses).
- **Read-only property**: a getter with no setter; assignment throws.
- **Closure factory**: a function returning an object whose methods capture private local variables.
- **Type coercion**: JavaScript auto-converting types, e.g. number + string → string.
- **Template literal**: backtick string with `${...}` insertions.
- **`RangeError` / `TypeError`**: built-in error types for out-of-range values / wrong-type operations.
- **Defensive copy**: returning `[...array]` so callers can't mutate your internals.
- **Adapter**: a small wrapper making two different surfaces look the same to shared code.
- **Contract**: the set of behaviors callers may rely on — what the shared tests encode.

## 8. Experiments to try on the plane (no internet needed)

1. **Try to rob the class.** In a scratch file, `import { BankAccount }` and try `acct.#balance = 9999`. Expected: a syntax error before the program even runs — private fields aren't just hidden, they're unspeakable outside the class.
2. **Resurrect the string bug, watch the test catch it.** In `refactored/account.js`, delete the entire `this.#validateAmount(amount);` line from the class's `deposit` and run `node --test 29-bank-account/`. Expected: the "negative and non-number amounts are rejected" test fails for the class style — `deposit('50')` and `deposit(NaN)` no longer throw. Bonus puzzle: if you instead only remove the `typeof amount !== 'number'` clause inside the validator, the tests still pass — because `Number.isFinite('50')` is `false`, the second clause catches strings too. Layered checks overlap; tests tell you which layer is load-bearing.
3. **Fire the `this` gun safely.** Scratch file: `const acct = new BankAccount('Ada', 100); const pay = acct.withdraw; pay(10);`. Expected: a `TypeError` about private fields/undefined — the class version *does* have the detach problem. Fix it two ways: `const pay = (n) => acct.withdraw(n);` and `const pay = acct.withdraw.bind(acct);`. Both then work.
4. **Test the copy the other way.** Add a test: get a statement, `statement[0].amount = 999999`, then check the real statement. Expected: this one *does* change the account's view! `[...history]` copies the array but the entry objects inside are shared references — a "shallow" copy. Deep-copying entries would fix it; a good think about copy depth.
5. **Order of operations matters.** In the closure version, move `balance -= amount` *above* the overdraft check and run the tests. Expected: the "overdrafts are impossible" test fails — the throw still happens but the money already left. Validate first, mutate last.
