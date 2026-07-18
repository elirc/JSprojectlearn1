/**
 * The same account, built two ways — both ENCAPSULATED: the balance
 * can only change through methods that enforce the rules. Pick either
 * style; knowing both is the point.
 *
 * Invariants both versions guarantee (see the tests):
 *   - amounts are positive finite numbers, or the call throws
 *   - the balance never goes negative
 *   - every successful change appends a history entry — no exceptions,
 *     because there is no other door to the data
 */

// ---------- Style 1: a class with #private fields ----------
export class BankAccount {
  #balance = 0;        // the # makes it truly inaccessible outside
  #history = [];

  constructor(owner, openingBalance = 0) {
    this.owner = owner;
    if (openingBalance > 0) this.deposit(openingBalance);
  }

  deposit(amount) {
    this.#validateAmount(amount);
    this.#balance += amount;
    this.#history.push({ type: 'deposit', amount });
  }

  withdraw(amount) {
    this.#validateAmount(amount);
    if (amount > this.#balance) {
      throw new RangeError(
        `Cannot withdraw ${amount}: balance is ${this.#balance}`,
      );
    }
    this.#balance -= amount;
    this.#history.push({ type: 'withdraw', amount });
  }

  get balance() {
    return this.#balance; // readable, but there's no setter — not writable
  }

  getStatement() {
    return [...this.#history]; // a COPY: callers can't edit the past
  }

  #validateAmount(amount) {
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
      throw new RangeError(`Amount must be a positive number, got ${amount}`);
    }
  }
}

// ---------- Style 2: a closure factory (no class, no `this`) ----------
export function createAccount(owner, openingBalance = 0) {
  let balance = 0;          // private by closure — same idea as project 27
  const history = [];

  function validateAmount(amount) {
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
      throw new RangeError(`Amount must be a positive number, got ${amount}`);
    }
  }

  const account = {
    owner,
    deposit(amount) {
      validateAmount(amount);
      balance += amount;
      history.push({ type: 'deposit', amount });
    },
    withdraw(amount) {
      validateAmount(amount);
      if (amount > balance) {
        throw new RangeError(`Cannot withdraw ${amount}: balance is ${balance}`);
      }
      balance -= amount;
      history.push({ type: 'withdraw', amount });
    },
    getBalance: () => balance,
    getStatement: () => [...history],
  };

  if (openingBalance > 0) account.deposit(openingBalance);
  return account;
}
