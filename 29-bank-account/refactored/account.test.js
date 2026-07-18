import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BankAccount, createAccount } from './account.js';

// One suite, run against BOTH implementations: they honor the same
// contract, so they share the same tests (project 13's registry idea).
const IMPLEMENTATIONS = [
  ['class', (owner, opening) => {
    const acct = new BankAccount(owner, opening);
    return { ...pickApi(acct), getBalance: () => acct.balance };
  }],
  ['closure', (owner, opening) => createAccount(owner, opening)],
];

function pickApi(acct) {
  return {
    deposit: (n) => acct.deposit(n),
    withdraw: (n) => acct.withdraw(n),
    getStatement: () => acct.getStatement(),
  };
}

for (const [style, makeAccount] of IMPLEMENTATIONS) {
  test(`${style}: deposits and withdrawals update the balance`, () => {
    const acct = makeAccount('Ada', 100);
    acct.deposit(50);
    acct.withdraw(30);
    assert.equal(acct.getBalance(), 120);
  });

  test(`${style}: negative and non-number amounts are rejected`, () => {
    const acct = makeAccount('Ada', 100);
    assert.throws(() => acct.withdraw(-500), RangeError); // the money printer
    assert.throws(() => acct.deposit('50'), RangeError);  // the string bug
    assert.throws(() => acct.deposit(NaN), RangeError);
    assert.equal(acct.getBalance(), 100); // nothing changed
  });

  test(`${style}: overdrafts are impossible`, () => {
    const acct = makeAccount('Ada', 20);
    assert.throws(() => acct.withdraw(21), /balance is 20/);
    assert.equal(acct.getBalance(), 20);
  });

  test(`${style}: every change is in the statement`, () => {
    const acct = makeAccount('Ada', 0);
    acct.deposit(10);
    acct.deposit(5);
    acct.withdraw(3);
    assert.deepEqual(acct.getStatement(), [
      { type: 'deposit', amount: 10 },
      { type: 'deposit', amount: 5 },
      { type: 'withdraw', amount: 3 },
    ]);
  });

  test(`${style}: the statement is a copy — history cannot be rewritten`, () => {
    const acct = makeAccount('Ada', 10);
    acct.getStatement().push({ type: 'deposit', amount: 999999 });
    assert.equal(acct.getStatement().length, 1); // only the opening deposit
  });
}

test('class: #balance is truly private, not just conventionally', () => {
  const acct = new BankAccount('Ada', 100);
  assert.equal(acct['#balance'], undefined);
  assert.throws(() => { acct.balance = 1000000; }, TypeError); // getter only
});

test('closure: detached methods still work (no `this` to lose)', () => {
  const acct = createAccount('Ada', 100);
  const pay = acct.withdraw; // the exact move that crashed the original
  pay(10);
  assert.equal(acct.getBalance(), 90);
});
