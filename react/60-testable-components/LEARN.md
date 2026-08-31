# 📘 Learning Guide: Testable Components

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

An expense splitter, the thing you open after a weekend away. Three
people — Ana, Ben, Cass — and three expenses:

| what | who paid | how much | split between |
|---|---|---|---|
| Dinner | Ana | $10.00 | all three |
| Taxi | Ben | $17.50 | Ana and Ben |
| Coffee | Cass | $0.07 | all three |

The app shows each person's balance and then the *settlement*: the
shortest list of "X pays Y $Z" that clears everyone.

Both versions render the same table, the same balances, the same
settlement. Both look right. Read the **Audit** box at the bottom of each
page before touching anything:

|  | original | refactor |
|---|---|---|
| Ana | owes $2.10 | owes **$2.12** |
| balances sum to | `0.020000000000000018` | `0` |
| total owed / total moved | $5.40 / $5.38 | $5.40 / $5.40 |

Two cents have left the group — not stolen, not misplaced, *evaporated*,
because three shares of $3.33 don't add up to $10.00 and nobody was in a
position to notice. This is the last project in the track, and its flaw
is deliberately not a crash: it's that the original cannot be *asked*
whether it's correct.

## 2. Concepts you need first

### Deciding vs doing

The JS track's whole thesis, and this is its final exam. **Deciding** is
computing an answer from values — what a share is, what a balance is,
who should pay whom — and needs no browser, clock, network or user.
**Doing** is everything with a side effect: rendering, storing state,
writing to disk, sending a request.

Mix them and every decision inherits the doing's requirements — you now
need a click and a screen to find out whether $10 splits into $10. Keep
them apart and each decision becomes a function with inputs and an
output, which is the only shape a test can hold.

### Pure functions

A pure function returns the same output for the same input and changes
nothing outside itself — `splitEvenly(1000, 3)` is always
`[334, 333, 333]`. You can call it a thousand times, in any order, from
a test file, at build time, on a server. That's the entire trick. There
is no testing technology in this project — no test renderer, no mock
DOM, no library. The functions are just *reachable*.

### Money is integer cents (js#32)

`0.1 + 0.2 === 0.30000000000000004`. Binary floating point can't
represent tenths exactly, and money is made of hundredths. So `1050`
(cents, an integer), never `10.50`.

Parse to cents at the edge (`parseCents('$10.50') === 1050`), do all
arithmetic in integers, format to a string only when printing. Errors
then can't accumulate, because integers don't drift.

### The remainder problem

$10 between three people is $3.33 each with a cent left over. There is no
correct way to give three people an equal third of $10 in a currency made
of cents. The only real choice is:

- **hand the remainder to somebody** (`[334, 333, 333]`) — someone pays a
  cent more, and the books balance; or
- **let it vanish** (`[333, 333, 333]`) — everyone's share looks fair,
  and $0.01 no longer exists.

The second one *feels* fairer and is a bug. Every payments system in the
world picks the first.

### Invariants

An invariant is a statement that must always be true, whatever the input:

- balances **always** sum to zero (money is moved, never created);
- shares **always** sum to the bill;
- after applying the transfers, **everyone** is at zero.

Invariants make excellent tests, because you don't have to invent
expected values — you assert the property over a hundred random inputs
and let the computer find the case you'd never have thought of.

### Derived state (project 09), one last time

`balances` and `transfers` are computable from `expenses` at any moment.
Storing them creates a second copy that has to be kept in sync by hand,
in every handler, forever; computing them during render means they
cannot be stale.

### The settlement algorithm

Given balances, repeatedly make the biggest debtor pay the biggest
creditor:

```
ben +540   ana -212   cass -328
cass pays ben 328  ->  ben +212, cass 0
ana  pays ben 212  ->  everyone 0
```

Each transfer zeroes at least one person, so at most `people - 1`
transfers are needed. Not the mathematically minimal answer in every
case, but the one users want: nobody wants an optimal solution that
asks them to make four payments.

## 3. Walking through the original code

The maths, in `addExpense`:

```js
const bal = {};
PEOPLE.forEach((p) => { bal[p.id] = 0; });
next.forEach((e) => {
  const share = Number((e.amount / e.participants.length).toFixed(2));
  e.participants.forEach((id) => { bal[id] -= share; });
  bal[e.paidBy] += e.amount;
});
```

Read the `share` line slowly. `10 / 3` is `3.3333…`; `toFixed(2)` rounds
it to `"3.33"`. Three people are charged `3.33` (total `9.99`) and the
payer is credited `10`. The books are now one cent out of balance, and
**every line of that is a reasonable thing to write**.

Then the settlement, right below it — the `owing`/`owed` filters and the
greedy `while` loop. Then the same thirty lines again in
`deleteExpense`. Then a **third** copy, in an IIFE, because nothing is
computed until a handler runs and the first render needs numbers too.

And the input: `amount: parseFloat(amount)`, where `"abc"` becomes `NaN`
and goes straight into the books.

## 4. What's wrong with it (in beginner terms)

**It is losing money, and it looks fine.** The audit box says the
balances sum to `0.02`. Every individual number on screen is plausible:
Ana owes $2.10, Ben is owed $5.40, Cass owes $3.28. You'd need to add
them up yourself — and know they should total zero — to see anything
wrong. Users will not do that; they'll just be slightly wrong forever.

**The settlement quietly gives up.** The greedy loop stops when it runs
out of debtors, so with unbalanced books it moves $5.38 to settle $5.40
and never mentions the difference. No error, because from the loop's
point of view nothing went wrong.

**The maths exists three times.** Fix the rounding in `addExpense` and
`deleteExpense` still has it. Fix both and the first render still has it.
Three copies of a rule is three chances to fix a bug in two places, and
you find out from a user.

**"ten" destroys everything.** `parseFloat('ten')` is `NaN`, `NaN`
spreads through every subtraction, and the whole app shows `$NaN`. The
check is missing not because the developer was lazy but because there's
nowhere obvious to put it: the handler is already thirty lines of
arithmetic, and validation at the top would make it thirty-five.

**Derived values are stored** (project 09), so a handler that forgets to
recompute leaves the screen showing yesterday's answer.

**And the real problem: none of these are findable.** Every question you
would want to ask — does an uneven split lose money, do the balances sum
to zero, does the settlement clear everyone, what happens with a refund,
what happens with 47 people — requires a browser, a click, and a person
who already suspects the answer. That's not a testing gap. It's a *design*
that makes correctness unknowable.

## 5. Try it yourself first!

1. **Vague:** what, in this file, could be checked without a browser, if
   only it were somewhere a test could reach?
2. **The unit:** write `splitEvenly(totalCents, n)` returning an array of
   `n` integers. Before you write it, write the test: what must be true
   of the array for *every* total and *every* n?
3. **The remainder:** `1000 / 3` leaves one cent over. Decide where it
   goes and defend the decision. (There is no answer where everyone pays
   the same and the books balance.)
4. **The money:** replace dollars-as-floats with integer cents
   everywhere — `parseCents` at the input, `formatCents` at the output,
   and *no* other place converts.
5. **The balances:** extract `computeBalances(people, expenses)`, write
   the invariant test (the values must sum to zero), and run it against
   your old float version to watch it fail.
6. **The settlement:** extract `settle(balances)`. Make it deterministic
   (sort the debtors and creditors, and break ties by id) or you can't
   assert on its output at all.
7. **The shell:** with all four extracted, the component should have no
   arithmetic left in it. Search it for `+`, `-`, `/` and `*`. Anything
   left is a decision you haven't moved yet.

## 6. Understanding the refactored solution

The refactor is one move applied five times, so watch the move rather
than the code.

**Move 1: money at the boundary.** `parseCents` at the input,
`formatCents` at the output, integers in between:

```js
const cleaned = String(text).trim().replace(/[$,\s]/g, '');
if (cleaned === '' || cleaned === '-' || cleaned === '.') return null;
if (!/^-?\d*(\.\d{0,2})?$/.test(cleaned)) return null;   // 3 decimals isn't money
```

`null` for junk is what gives the handler something to say. The
validation didn't get *written*; it got a *place to live*, and then it
was obvious.

**Move 2: the bug, as a function.**

```js
export function splitEvenly(totalCents, n) {
  if (n <= 0) return [];
  const base = Math.trunc(totalCents / n);
  const remainder = totalCents - base * n;     // signed: refunds work too
  const step = remainder >= 0 ? 1 : -1;
  const extras = Math.abs(remainder);
  return Array.from({ length: n }, (_, i) => base + (i < extras ? step : 0));
}
```

Five lines. `base` is what everyone definitely gets; `remainder` is what
integer division threw away; the first `extras` people get one cent more.
And now the awkward question is a test:

```js
for (let n = 1; n <= 50; n += 1)
  for (let total = 0; total < 100; total += 1)
    assert.equal(sum(splitEvenly(total, n)), total, `${total} split ${n} ways`);
```

Run that against a rounding version and it fails almost immediately —
`1 split 2 ways`, `2 !== 1`. The bug didn't need a clever tester; it
needed to be *reachable*.

**Move 3: the balances, with an invariant.** `computeBalances` is nine
lines of bookkeeping, and the test that matters isn't about any
particular expense — it's `assert.equal(sum(Object.values(balances)),
0)`. Money is moved, never created. That one line catches the rounding
bug, any future rounding bug, and the "unknown payer" case that would
otherwise credit nobody — which is why `computeBalances` skips an
expense whose payer isn't in `people` rather than half-recording it.

**Move 4: the settlement, made deterministic** —
`.sort((a, b) => b.cents - a.cents || a.id.localeCompare(b.id))`. That
tiebreak looks like fussiness and is the reason the function is
testable: without it, two people who owe the same amount come out in
whatever order `Object.entries` felt like, and no assertion about the
output is stable. Determinism isn't a nice-to-have in a pure function;
it's the difference between a test and a coin toss.

Then the property test, which is the one to steal for your own code:

```js
const after = { ...balances };
for (const t of settle(balances)) { after[t.from] += t.cents; after[t.to] -= t.cents; }
assert.ok(Object.values(after).every((cents) => cents === 0));
```

A hundred random groups, random expenses, random participants — and
every one must end at exactly zero. You don't have to imagine the
awkward case; you generate it.

**Move 5: what's left is a shell.**

```jsx
const balances = computeBalances(PEOPLE, expenses);   // derived, project 09
const transfers = settle(balances);
```

Two lines, on every render, replacing three copies of thirty lines and
two pieces of stored state. The handler is now four lines of *policy*:

```js
const amountCents = parseCents(amount);
if (amountCents === null || amountCents <= 0) { setError('Enter an amount like 12.50'); return; }
setExpenses([...expenses, { ...draft, amountCents }]);
```

Search the component for a `/`. There isn't one. That's the finished
state of the extraction: the component *renders* what was decided and
*dispatches* what happened, and every question about correctness has
moved to a file with 24 tests in front of it.

**What this cost.** Being honest: `split.js` plus its tests is more lines
than the original component. You bought three things — the bug is gone,
the next bug is catchable, and the settlement logic can now be used by a
server, a CLI or a React Native app unchanged. On a throwaway prototype
that trade isn't obviously worth it; on anything involving money, it
stopped being a judgement call a long time ago.

## 7. Words you learned (glossary)

- **Deciding vs doing:** computing an answer vs causing an effect; the
  split this whole repo is about.
- **Pure function:** same input, same output, no side effects.
- **Testable:** reachable by a test without a browser, a clock, or a
  human — usually a synonym for "pure".
- **Integer cents:** money as whole units, to avoid float drift (js#32).
- **Remainder distribution:** handing out the indivisible leftover so
  shares sum exactly to the total.
- **Invariant:** something true of every result — e.g. balances sum to 0.
- **Property test:** asserting an invariant over generated inputs
  instead of hand-written examples.
- **Determinism:** the same input always producing the same output,
  including order.
- **Settlement / transfer:** the payments that clear all balances.
- **Greedy algorithm:** repeatedly taking the biggest available step —
  here, biggest debtor pays biggest creditor.
- **Derived state:** computed during render rather than stored (09).
- **Boundary conversion:** parsing at the input and formatting at the
  output, so the core only ever sees one representation.
- **Shell component:** renders and dispatches, decides nothing.

## 8. Experiments to try on the plane (no internet needed)

Edit and reason offline; note the pages load React from a CDN (shared
library servers), so actually *running* them in a browser needs
internet on first load.

1. **Reintroduce the bug and watch the tests catch it.** In `split.js`,
   replace the four lines after the `n <= 0` guard with
   `return Array.from({ length: n }, () => Math.round(totalCents / n));`
   and run
   `node --test react/60-testable-components/refactored/split.test.js`.
   Expected: **8 of 24 tests fail**, and the 5000-case one names the
   smallest broken split — `1 split 2 ways`, `2 !== 1`. Notice how far
   the damage spreads: the balance invariant, the settlement totals and
   the random-groups test all go red too, because a wrong `splitEvenly`
   is wrong everywhere it's used. Compare that with how you'd have
   found the same bug in the original.
2. **Find the money in the original.** Open `original.html`, add an
   expense of `$1.00` split three ways, and watch the audit sum grow by
   another `0.01`. Do it ten times. Expected: ten cents gone, and every
   balance on screen still looks completely reasonable.
3. **Break the invariant deliberately.** In `computeBalances`, change
   `balances[expense.paidBy] += expense.amountCents;` to `+=
   expense.amountCents + 1`. Expected: **6 of 24 fail**, and the
   interesting thing is *which*. Three are example tests naming one
   scenario each; three are invariants — "balances always sum to zero",
   "the transfers pay off exactly what is owed", "a hundred random
   groups always settle to exactly zero" — and those three would have
   caught the mistake even if you'd never written the examples. That
   asymmetry is the argument for invariant tests.
4. **Remove the tiebreak.** Delete `|| a.id.localeCompare(b.id)` from
   both sorts in `settle`. Expected: exactly **1 of 24** fails, and on
   some JavaScript engines it might not even fail today. Then reason
   about why a test that passes most of the time is worse than one that
   always fails, and why determinism is a feature of the function rather
   than a convenience for the test.
5. **Add a weighted split.** Give expenses an optional
   `weights: { [id]: number }` and write `splitByWeights(totalCents,
   weights)` — same contract: whole cents, summing exactly to the total.
   Expected: about eight lines, and you'll immediately want the
   remainder to go to the largest weight rather than the first entry.
   Write the test first and the decision makes itself.
6. **Take the logic somewhere else.** Write a tiny Node script that
   imports `split.js`, reads a few expenses from a hard-coded array, and
   prints the settlement to the terminal. Expected: it works with zero
   changes, because `split.js` never knew about React. That portability
   isn't a bonus — it's the same property that made it testable.
