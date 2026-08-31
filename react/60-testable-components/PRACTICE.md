# 🏋️ Practice: Testable Components

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking. (Almost everything here is pure, so `node --test` checks your work directly — which is the entire point of the project. Run the pages later when you have internet, since React loads from a CDN.)

Every exercise adds to `refactored/split.js` and `refactored/split.test.js` first, then wires the result into `refactored/index.html` (remembering the copy of the rules inside it). If you find yourself writing arithmetic inside the component, you've started at the wrong end.

## Exercises

### ⭐ 1. Who has been out of pocket the most? (warm-up)

Show, next to each person's balance, how much they have *paid out* in total — a different number from their balance, and the one people actually argue about. Write `totalPaid(people, expenses)` in `split.js` with tests.

**Practices:** the loop this project wants to become a habit — a new number on screen means a new pure function and a new test, in that order, before any JSX.

**Hint:** it's five lines and looks like a smaller `computeBalances`. Give it the same treatment for unknown payers, and write down the invariant: the totals add up to the sum of all the expenses.

**Expected:** Ana $10.00, Ben $17.50, Cass $0.07 — totalling exactly the three bills. Note that Ben has paid the most *and* is the one owed money, while Cass paid almost nothing and still owes $3.28. Two different questions, two different functions.

### ⭐⭐ 2. Predict the books, then predict the renders (core)

**Part A, on paper.** For the three seeded expenses, write down: every person's balance in cents, the sum of those balances, and the exact settlement (who pays whom, how much, in order). Then do it again for the same app with the Coffee expense deleted.

**Part B, on paper.** In the *original*, deleting the Coffee row runs the copy of the maths in `deleteExpense`. Suppose a colleague fixes the rounding bug — but only in `addExpense`. Describe exactly what the user sees: after deleting a row, after adding one, and after reloading the page.

**Part C, on paper.** In the refactor, which components re-render when you delete an expense, and how many times does `computeBalances` run? Then answer the follow-up: is that a performance problem, and how would you know?

**Practices:** reading pure functions precisely, and seeing that three copies of a rule is not "some duplication" but three different applications sharing a screen.

**Hint (A):** `splitEvenly(7, 3)` is not `[2, 2, 3]`. Check which end the remainder goes to. For the settlement, the biggest debtor pays the biggest creditor first.

**Expected:** the balances sum to exactly 0 in both scenarios, and both settle in two transfers. In Part B, the app shows three *different* answers for the same data depending on which button you last pressed. In Part C, `computeBalances` runs once per render — and the honest answer to "is that a problem" involves numbers you don't have yet.

### ⭐⭐ 3. Reject nonsense before it reaches the books (core)

Right now `addExpense` checks the amount and nothing else. Write `validateExpense(draft, peopleIds)` in `split.js` returning `{ ok, errors, amountCents, participants }`, covering: a blank description, an unparseable or non-positive amount, an unknown payer, and an empty participant list. Show each error next to its field.

**Practices:** validation as a *decision*, not as a pile of `if`s at the top of a handler. Compare with project 43 — the same move, arriving from a different direction.

**Hint:** return all the errors at once, keyed by field, rather than the first one. And return the parsed `amountCents` from the same call: the validator already did the parsing, and making the caller do it again is how the two drift apart.

**Expected:** `validateExpense` with a blank description, `'ten'` as the amount, a made-up payer and no participants returns four errors in one object. A good draft returns `ok: true` and `amountCents: 2400` for `'$24.00'` — parsed once, used once. The component's handler shrinks to "validate, then either show errors or add the expense".

### ⭐⭐ 4. Record who has actually paid up (core)

The settlement tells people what to do; nothing records that they did it. Add a `payments` list — `{ from, to, cents }` — and a "record payment" button next to each transfer. Fold payments into `computeBalances(people, expenses, payments)` so the settlement shrinks as debts get cleared.

**Practices:** extending a pure function's inputs while keeping its invariant. A payment moves money between two people, so the balances must *still* sum to zero.

**Hint:** a payment credits the payer and debits the receiver — the mirror image of an expense. Ignore payments involving unknown people, for the same reason `computeBalances` skips unknown payers: a half-recorded transaction breaks the invariant, and a skipped one doesn't.

**Expected:** record both suggested transfers and every balance reads $0.00, with `settle` returning `[]`. Record just $1.00 of Ana's $2.12 and the settlement updates to the remaining $1.12 — the plan recalculates, it doesn't need editing. And the sum-to-zero test still passes with payments in the mix, which is how you know you folded them in correctly.

### ⭐⭐⭐ 5. Weighted splits, still cent-exact (challenge)

Not every bill splits evenly. Add optional per-person weights to an expense — "Ana had two courses, Ben had one" — and write `splitByShares(totalCents, weights)` returning whole cents that sum to **exactly** `totalCents`, in proportion to the weights.

Requirements: equal weights must produce exactly what `splitEvenly` produces (so it's a true generalisation); a weight of zero pays nothing; refunds (negative totals) work; and the leftover cents go to the people with the largest fractional share, ties broken by position.

**Practices:** the largest-remainder method — the same apportionment problem as allocating parliamentary seats — and property tests that check an invariant over hundreds of generated inputs instead of a handful of examples you thought of.

**Hint:** compute each exact (fractional) share, floor them all, count how many cents are left over, and hand those out to the largest fractional parts. The leftover is always smaller than the number of weights, which is why one pass is enough.

**Expected:** `splitByShares(1000, [2, 1, 1])` is `[500, 250, 250]`; `splitByShares(100, [1, 2])` is `[33, 67]` — the second person's `.67` beats the first's `.33` for the odd cent. Equal weights agree with `splitEvenly` for all 1500 combinations of `total` 0–59 and `n` 1–25, and 500 random weightings all sum exactly to their total. If any single case is off by a cent, you've rebuilt the bug this project exists to kill.

## Solutions

### 1. Who has been out of pocket the most?

```js
export function totalPaid(people, expenses) {
  const totals = {};
  for (const person of people) totals[person.id] = 0;
  for (const expense of expenses) {
    if (expense.paidBy in totals) totals[expense.paidBy] += expense.amountCents;
  }
  return totals;
}
```

```js
test('total paid is per payer, and adds up to the bills', () => {
  const totals = totalPaid(people, expenses);
  assert.deepEqual(totals, { ana: 1000, ben: 1750, cass: 7 });
  assert.equal(sum(Object.values(totals)), sum(expenses.map((e) => e.amountCents)));
});

test('people who paid nothing are zero, and ghosts are ignored', () => {
  assert.deepEqual(totalPaid(people, []), { ana: 0, ben: 0, cass: 0 });
  assert.deepEqual(totalPaid(people, [{ ...dinner, paidBy: 'nobody' }]),
    { ana: 0, ben: 0, cass: 0 });
});
```

**Why:** the interesting part isn't the five lines, it's that "how much did each person pay?" and "what is each person's balance?" are *different questions* with different answers — Ben paid the most and is owed money; Cass paid almost nothing and owes $3.28. In the original both would have been computed in the same handler, tangled in the same loop, and it would have been tempting to derive one from the other. Kept apart, each is a named function with a name that says which question it answers, and the second invariant test (`totals` add up to the bills) is free.

### 2. Predict the books, then predict the renders

**Part A.** All three expenses:

```
Dinner  1000 by ana,  split 3 -> [334, 333, 333]
Taxi    1750 by ben,  split 2 -> [875, 875]
Coffee     7 by cass, split 3 -> [3, 2, 2]

ana  = -334 - 875 - 3            = -1212  + 1000 (paid) = -212
ben  = -333 - 875 - 2 = -1210    + 1750 (paid)          =  540
cass = -333        - 2 = -335    +    7 (paid)          = -328
                                              sum       =    0
```

Settlement: one creditor (`ben`, 540), two debtors sorted biggest first (`cass` 328, then `ana` 212):

```
cass pays ben $3.28
ana  pays ben $2.12
```

Without the Coffee row: `{ ana: -209, ben: 542, cass: -333 }`, still summing to zero, settling as `cass pays ben $3.33`, `ana pays ben $2.09`.

Note `splitEvenly(7, 3)` is `[3, 2, 2]`, not `[2, 2, 3]` — the remainder goes to the front, so the *first* participant carries the extra cent.

**Part B.** With the fix in `addExpense` only, the app has two different truths and shows whichever one ran last:

- After **deleting** a row: the old float maths runs, and the audit sum reads `0.01`-ish. Wrong.
- After **adding** one: the fixed maths runs, and the sum reads `0`. Right.
- After a **reload**: neither handler has run, so the third copy — the IIFE — runs, and it's still the float version. Wrong.

So the same expense list produces three different settlements depending on the last thing the user did, and one of them appears only on a fresh page load, which is the one QA never reproduces. This is what "three copies of a rule" costs. It isn't tidiness; it's three programs sharing a screen.

**Part C.** Deleting an expense calls `setExpenses`, so `App` re-renders — and since this is one component, that's the whole UI. `computeBalances` and `settle` each run exactly **once**, during that render.

Is that a performance problem? Almost certainly not: it's a loop over a handful of expenses, running once per user interaction, in the same frame as a full DOM diff that costs far more. The honest answer to "how would I know" is: measure it. Wrap it in `console.time`, or profile it, and compare against 16ms. If it ever did matter, the fix is `useMemo(() => computeBalances(PEOPLE, expenses), [expenses])` — and note that this is only *available* because the function is pure. You cannot memoise a handler that mutates state.

**Why:** Part A is the skill the whole file is built on — you can predict the app's output exactly, from three small functions, with no app running. Part B is the argument for extraction stated as a bug report rather than a principle. Part C is worth internalising as a habit: "derive on every render" is the correct default, and optimising it is a decision that requires a measurement, not a hunch.

### 3. Reject nonsense before it reaches the books

```js
export function validateExpense(draft, peopleIds) {
  const errors = {};

  if (!String(draft.description || '').trim()) errors.description = 'Give it a name';

  const amountCents = parseCents(draft.amountText);
  if (amountCents === null) errors.amount = 'Enter an amount like 12.50';
  else if (amountCents <= 0) errors.amount = 'Must be more than zero';

  if (!peopleIds.includes(draft.paidBy)) errors.paidBy = 'Pick who paid';

  const participants = (draft.participants || []).filter((id) => peopleIds.includes(id));
  if (participants.length === 0) errors.participants = 'Split it between at least one person';

  return { ok: Object.keys(errors).length === 0, errors, amountCents, participants };
}
```

```js
test('a good draft passes and hands back what it parsed', () => {
  const result = validateExpense(
    { description: 'Pizza', amountText: '$24.00', paidBy: 'ana', participants: ['ana', 'ben'] },
    ['ana', 'ben', 'cass']);
  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, {});
  assert.equal(result.amountCents, 2400);
});

test('every problem is reported, not just the first', () => {
  const result = validateExpense(
    { description: '  ', amountText: 'ten', paidBy: 'ghost', participants: [] },
    ['ana', 'ben', 'cass']);
  assert.equal(result.ok, false);
  assert.deepEqual(Object.keys(result.errors).sort(),
    ['amount', 'description', 'paidBy', 'participants']);
});

test('zero and negative amounts are rejected differently from junk', () => {
  const ids = ['ana'];
  const draft = { description: 'x', amountText: '0', paidBy: 'ana', participants: ['ana'] };
  assert.equal(validateExpense(draft, ids).errors.amount, 'Must be more than zero');
  assert.equal(validateExpense({ ...draft, amountText: 'x' }, ids).errors.amount,
    'Enter an amount like 12.50');
});
```

```jsx
function addExpense() {
  const result = validateExpense(
    { description, amountText: amount, paidBy, participants: PEOPLE.map((p) => p.id) },
    PEOPLE.map((p) => p.id));
  setErrors(result.errors);
  if (!result.ok) return;
  setExpenses([...expenses, {
    id: 'e' + Math.random().toString(36).slice(2, 7),
    description: description.trim(),
    paidBy,
    amountCents: result.amountCents,
    participants: result.participants,
  }]);
  setDescription(''); setAmount(''); setErrors({});
}
```

**Why:** three design choices, each with a failure mode it prevents. Returning **all** errors keyed by field means the form can show them next to their inputs instead of one at a time in a banner — the difference between fixing four things in one pass and playing whack-a-mole. Distinguishing "not a number" from "not positive" costs one `else if` and produces a message that tells the user what to do. And returning `amountCents` from the validator is the one people skip: if the handler re-parses, then one day the validator accepts `'1,000'` and the handler's `parseFloat` gives `1`, and the app cheerfully records a thousand-fold error that passed validation. Validate and parse in the same place, hand back the parsed value, and that class of bug can't exist.

Notice the handler is now four lines and contains no arithmetic and no rules — just "ask, then either report or record". That's the shape to aim for.

### 4. Record who has actually paid up

```js
export function computeBalances(people, expenses, payments = []) {
  const balances = {};
  for (const person of people) balances[person.id] = 0;

  for (const expense of expenses) {
    if (!(expense.paidBy in balances)) continue;
    const participants = expense.participants.filter((id) => id in balances);
    if (participants.length === 0) continue;
    const shares = splitEvenly(expense.amountCents, participants.length);
    participants.forEach((id, i) => { balances[id] -= shares[i]; });
    balances[expense.paidBy] += expense.amountCents;
  }

  for (const payment of payments) {
    if (!(payment.from in balances) || !(payment.to in balances)) continue;
    balances[payment.from] += payment.cents;   // they owe less now
    balances[payment.to] -= payment.cents;     // they are owed less now
  }

  return balances;
}
```

```js
test('paying the suggested transfers clears everyone', () => {
  const owed = computeBalances(people, expenses);
  const plan = settle(owed);
  const after = computeBalances(people, expenses, plan);
  assert.deepEqual(after, { ana: 0, ben: 0, cass: 0 });
  assert.deepEqual(settle(after), []);
});

test('a partial payment shrinks the plan instead of editing it', () => {
  const after = computeBalances(people, expenses, [{ from: 'ana', to: 'ben', cents: 100 }]);
  assert.deepEqual(after, { ana: -112, ben: 440, cass: -328 });
  assert.equal(sum(Object.values(after)), 0);
});

test('payments involving unknown people cannot unbalance the books', () => {
  const before = computeBalances(people, expenses);
  const after = computeBalances(people, expenses, [{ from: 'ghost', to: 'ben', cents: 100 }]);
  assert.deepEqual(after, before);
});
```

**Why:** a payment is an expense read backwards, and modelling it that way — rather than as "mark this transfer done" — is what makes partial payments, extra payments and payments nobody suggested all work with no extra code. There is no `settled: true` flag anywhere, because the settlement is *derived*: pay a dollar and the plan recomputes to the remaining $1.12 on the next render. Compare the alternative, where each transfer carries a "done" flag and adding a new expense invalidates a plan people have already half-executed — that's a data model that lies as soon as reality diverges from the suggestion.

The `continue` for unknown people is the same guard as in the expense loop and deserves the same reasoning: a payment recorded on one side only would break the sum-to-zero invariant, and a *skipped* payment merely shows a debt that's already been settled. Between "quietly wrong books" and "visibly stale books", always choose visible.

### 5. Weighted splits, still cent-exact

```js
/**
 * Split `totalCents` in proportion to `weights`, in whole cents that sum
 * to exactly `totalCents`. This is the largest-remainder method — the
 * same arithmetic used to hand out parliamentary seats, for the same
 * reason: proportions are fractional and the units are not.
 */
export function splitByShares(totalCents, weights) {
  const totalWeight = weights.reduce((total, w) => total + w, 0);
  if (weights.length === 0 || totalWeight <= 0) return weights.map(() => 0);

  const sign = totalCents < 0 ? -1 : 1;
  const abs = Math.abs(totalCents);

  const exact = weights.map((w) => (abs * w) / totalWeight);   // fractional cents
  const shares = exact.map((value) => Math.floor(value));      // everyone's floor
  const leftover = abs - shares.reduce((total, c) => total + c, 0);

  const byFraction = exact
    .map((value, i) => ({ i, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction || a.i - b.i);      // deterministic ties
  for (let k = 0; k < leftover; k += 1) shares[byFraction[k].i] += 1;

  return shares.map((cents) => cents * sign);
}
```

```js
test('weights split proportionally, to the exact cent', () => {
  assert.deepEqual(splitByShares(1000, [2, 1, 1]), [500, 250, 250]);
  assert.deepEqual(splitByShares(100, [1, 2]), [33, 67]);   // .67 beats .33
  assert.deepEqual(splitByShares(1000, [0, 1, 1]), [0, 500, 500]);
  assert.deepEqual(splitByShares(-1000, [1, 1, 1]), [-334, -333, -333]);
  assert.deepEqual(splitByShares(1000, []), []);
  assert.deepEqual(splitByShares(1000, [0, 0]), [0, 0]);
});

test('equal weights are exactly splitEvenly — 1500 cases', () => {
  for (let n = 1; n <= 25; n += 1) {
    for (let total = 0; total < 60; total += 1) {
      assert.deepEqual(splitByShares(total, Array(n).fill(1)), splitEvenly(total, n),
        `${total} between ${n} equal shares`);
    }
  }
});

test('500 random weightings lose nothing', () => {
  let seed = 7;
  const random = (max) => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % max; };
  for (let run = 0; run < 500; run += 1) {
    const weights = Array.from({ length: 1 + random(8) }, () => random(10));
    const total = random(100000);
    const shares = splitByShares(total, weights);
    const expected = weights.reduce((a, w) => a + w, 0) <= 0 ? 0 : total;
    assert.equal(shares.reduce((a, c) => a + c, 0), expected,
      `${total} by ${JSON.stringify(weights)}`);
  }
});
```

Then in `computeBalances`, one line changes:

```js
const weights = expense.weights
  ? participants.map((id) => expense.weights[id] ?? 1)
  : null;
const shares = weights
  ? splitByShares(expense.amountCents, weights)
  : splitEvenly(expense.amountCents, participants.length);
```

**Why:** the shape of the answer is the lesson, and it's the same shape as `splitEvenly`: work out what everyone definitely gets, count what integer division threw away, and hand the leftover out by an explicit, defensible rule. What changes is the rule — `splitEvenly` gives the extra cents to the front because everyone's claim is identical, while `splitByShares` gives them to the largest fractional parts because those are the people the exact answer shortchanged most. Both are arbitrary in the sense that someone pays an extra cent; neither is arbitrary in the sense that matters, which is that the total is preserved and the choice is written down.

Three details are load-bearing. The sign flip lets refunds reuse the whole positive path instead of reasoning about `Math.floor(-3.3)`, which rounds *away* from zero and would quietly hand out the leftover backwards. The `|| a.i - b.i` tiebreak means equal fractions resolve by position rather than by whatever the sort feels like — the same determinism `settle` needed, for the same reason. And the `totalWeight <= 0` guard turns "nobody has a claim" into all zeros instead of `NaN`, which is `splitEvenly(1000, 0) === []` wearing different clothes.

The two property tests are where this exercise earns its stars. The first — 1500 equal-weight cases agreeing with `splitEvenly` — is the definition of "generalisation" made executable: if the new function is a superset of the old one, the old one's entire behaviour is a test case. The second is the one that would have caught this project's original bug in ten milliseconds, applied preemptively to code that hasn't shipped yet: *whatever* the inputs, the shares add up. That's the habit to leave the track with. When you can name the invariant, you don't have to guess which example to test — and you find the cases you'd never have thought to try.
