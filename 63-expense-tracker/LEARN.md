# 📘 Learning Guide: Expense Tracker with Charts

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A small money-tracking page. You type what you bought ("lunch"), how much it cost ("12.50"), pick a category (food / transport / fun), and press **Add**. The page shows:

- a list of everything you've entered: `lunch — $12.50 (food)`
- a running total: `total: $12.50`
- a bar chart of spending by category (in the refactored version)

Close the browser and reopen the page — your expenses are still there, because they're saved in the browser itself. No server, no internet.

## 2. Concepts you need first

### Floating-point numbers and why money hates them
JavaScript stores decimal numbers in a binary format called **floating point**. Binary can't represent most decimal fractions exactly — just like 1/3 can't be written exactly in decimal (0.3333...). So:

```js
console.log(0.1 + 0.2);   // → 0.30000000000000004  (!)
```

Each number is off by a hair. For a game score, who cares. For money that gets *saved and added to forever*, the hairs pile up until totals are visibly wrong. The fix: store money as **integer cents**. `$12.50` becomes the whole number `1250`. Whole-number math is exact:

```js
console.log(10 + 20);     // → 30 cents, exactly. Never 30.000000000004
```

### `localStorage` — the browser's saved-data drawer
**`localStorage`** is a tiny storage box every website gets in your browser. It survives closing the tab. It stores only **strings** (text), under named keys:

```js
localStorage.setItem("greeting", "hello");
console.log(localStorage.getItem("greeting")); // → "hello"
// still "hello" tomorrow, after a restart
```

### JSON — turning data into a string and back
Since `localStorage` holds only strings, objects and arrays must be converted. **JSON** (JavaScript Object Notation) is the standard text format for this. **Serialization** = data → string. **Parsing** = string → data.

```js
const s = JSON.stringify({ a: 1 });  // → '{"a":1}'  (a string)
const o = JSON.parse(s);             // → { a: 1 }   (an object again)
JSON.parse("garbage{");              // → throws an error (crashes) — must be caught!
```

### "Stored data is input" — validation and schema versions
Anything your code reads from outside itself — a text box, a file, `localStorage` — is **input**, and input can be wrong. Even data *you* saved last month: maybe you've renamed a field since, or an old bug saved a bad value. **Validation** means checking the shape before trusting it. A **schema version** is a number saved alongside the data ("this is format v1"), so future code can recognize old formats instead of choking on them.

### Derived values — compute, don't copy
A **derived value** is one you can calculate from the real data: the total is derived from the expense list. Rule: derive it in **one** place, every time you need it. If two bits of code each compute "the total" their own way, one day they'll disagree on screen — and users notice when money doesn't add up.

### NaN — the poison number
`parseFloat("abc")` doesn't error; it returns **`NaN`** ("Not a Number"). NaN silently poisons everything it touches:

```js
const x = parseFloat("abc");  // → NaN
console.log(x + 5);           // → NaN — your total is now ruined
```

Better: a strict parser that returns `null` for garbage, so the caller *must* handle the failure.

### `Intl.NumberFormat` — currency formatting done for you
Turning `1250` cents into `"$12.50"` by hand (commas! padding!) is a bug farm. The browser has a built-in formatter:

```js
new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(12.5)
// → "$12.50"     (and 1234.56 → "$1,234.56" — commas included)
```

### `<canvas>` — a drawing surface
A **canvas** is an HTML element you paint on with JavaScript — rectangles, text, lines. Perfect for a hand-made bar chart:

```js
const ctx = canvas.getContext('2d');   // the "paintbrush" object
ctx.fillStyle = 'steelblue';
ctx.fillRect(10, 10, 200, 24);         // x, y, width, height — one bar!
```

## 3. Walking through the original code

State is a plain array, loaded straight from storage with zero checks:

```js
var expenses = [];
if (localStorage.expenses) {
  expenses = JSON.parse(localStorage.expenses);
}
```

Whatever was saved — old format, corrupted, anything — becomes the app's state as-is.

Adding an expense reads the three inputs and pushes:

```js
expenses.push({
  desc: document.getElementById("desc").value,
  amount: parseFloat(document.getElementById("amount").value), // "abc" -> NaN, pushed anyway
  cat: document.getElementById("cat").value,
});
localStorage.expenses = JSON.stringify(expenses);
```

`parseFloat` means amounts are floats, and garbage input becomes NaN — which is then *saved to disk*, permanently.

`redraw()` builds the list and total in one loop:

```js
for (var i = 0; i < expenses.length; i++) {
  html += "<li>" + expenses[i].desc + " — " + expenses[i].amount + ...;
  total += expenses[i].amount;
}
```

Then a *second* loop computes per-category sums — and contains the bug:

```js
cats[expenses[i].cat] += expenses[i].amount;
cats["food"] = (cats["food"] || 0) + (expenses[i].cat === "food" ? 0 : expenses[i].amount);
```

Line one adds each expense to its own category — fine. Line two (a copy-paste "default" gone wrong) *also* adds every non-food expense to "food". So "food" ends up holding food + everything else, and the categories sum to more than the total shown right above them.

## 4. What's wrong with it (in beginner terms)

**1. Money as floats.** Add `0.10` and `0.20`: the total reads `0.30000000000000004`. Story: your friend uses the app for a month. Their total is off by a cent, then three. They cross-check against their bank, conclude your app "loses money," and stop trusting it. Because the bad values are *saved*, even fixing the code later doesn't fix their data.

**2. Storage with no version, no validation.** Story: next month you rename `desc` to `description` in the code. You ship it. Every existing user's saved data still has `desc`. `JSON.parse` succeeds, then the list renders `undefined — undefined` on every row. The app "worked on your machine" because your storage was fresh.

**3. Derived numbers in three places.** The list, the total, and the category breakdown each do their own math. The category loop double-counts, so the screen literally contradicts itself: total says 20, categories sum to 35. With ONE derivation this bug could not exist.

**4. NaN in the ledger.** Type "ten" as the amount, press Add. NaN is stored forever, and from now on the total shows NaN. One typo permanently breaks the display.

## 5. Try it yourself first!

1. What unit should money be stored in so that addition is always exact?
2. Write `parseAmount(text)` that accepts `"12.50"`, `"$3"`, `"0.1"` and returns cents as a whole number — and returns `null` for `"abc"`, `""`, `"-5"`, `"12.345"`. A regex like `/^\$?(\d+)(?:\.(\d{1,2}))?$/` matches an optional `$`, digits, and an optional 1-2 digit decimal part.
3. Can you compute the total AND the by-category sums in a *single* loop, returned from a *single* function? If both come from the same loop, can they ever disagree?
4. For loading: wrap `JSON.parse` in `try/catch`. Then check: is there a `version` field matching yours? Is `expenses` really an array? Is each record's `cents` really a positive integer? Drop what fails.
5. For the chart: if a function hands you rows already sorted with a `fraction` (0 to 1) each, the drawing is just `fillRect(x, y, width * something, height)`. What should width scale by so the largest bar fills the space?

## 6. Understanding the refactored solution

The refactor splits the app into `derive.js` — the **data layer**, pure functions, fully tested in Node — and `index.html`, which copies those functions in (a page opened as a plain file can't `import`) and adds the page glue.

**`parseAmount` — strict at the boundary.** The regex accepts only "optional $, digits, optional .1-2 digits." Everything else → `null`. Note `padEnd(2, '0')`: `"0.1"` means 10 cents, not 1 — the decimal part is padded to two digits. Negative, zero, `"1e3"`, `"12,50"`: all rejected. Garbage can no longer *enter* the ledger.

**`deriveTotals` — one derivation.**

```js
for (const e of expenses) {
  totalCents += e.cents;
  byCategory[e.category] = (byCategory[e.category] ?? 0) + e.cents;
}
```

Total and breakdown come from the *same loop over the same data*. The test literally asserts the categories sum to the total. The original's double-count is now structurally impossible. (`??` is "nullish coalescing": use the left side unless it's `null`/`undefined`, then use the right — here it starts a category at 0.)

**`loadState` — persistence with a spine.** Empty storage → fresh state. Unparseable JSON → fresh state (the `try/catch`). Missing or wrong `version` → fresh state. Then *each record* is checked: `description` a string, `cents` a positive integer (`Number.isInteger` — this filters out float-era ghosts like `5.5`!), `category` a string. Bad records are dropped; good ones kept. Your past self is treated as an untrusted source, politely.

**`formatCents`** hands display to `Intl.NumberFormat` — `123456` → `"$1,234.56"` with correct commas, always.

**One `dispatch` path in the page:**

```js
function dispatch(mutate) {
  mutate(state);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  render();
}
```

Every change goes through this: mutate, save, redraw. No call site can forget to save or forget to redraw — the sequence lives in exactly one place. Note the storage key is now `'expenses-v1'` and the saved object includes `version`.

**The chart is just geometry.** `chartData` returns rows sorted largest-first, each with `cents` and `fraction`, and guards the empty case (`totalCents === 0 ? 0 : ...` — no division by zero). `drawChart` then only draws: a label, a `fillRect` whose width is scaled so the biggest bar fills the space, and a value text. All *decisions* (sorting, percentages) happened in tested code; the canvas code just moves the paintbrush. This decide/do split is why "add a chart" was easy.

**The tests** (`derive.test.js`, run with `node --test`) pin every behavior: the float bug test asserts `0.10 + 0.20` totals exactly `30` cents; the agreement test asserts categories sum to the total; `loadState` is fed corrupt JSON, versionless data, future versions, float ghosts, renamed fields, and `null` records — and must come back standing each time.

## 7. Words you learned (glossary)

- **Floating point** — the binary decimal format; can't represent 0.1 exactly, so tiny errors appear.
- **Integer cents** — storing $12.50 as the whole number 1250 so math is exact.
- **`localStorage`** — per-site browser storage that survives closing the tab; strings only.
- **JSON** — text format for data: `'{"a":1}'`.
- **Serialization / parsing** — data→string / string→data (`JSON.stringify` / `JSON.parse`).
- **Validation** — checking data's shape before trusting it.
- **Schema version** — a format number saved with data so old formats are recognizable.
- **Derived value** — computed from source data (a total), never stored separately.
- **`NaN`** — "Not a Number"; result of failed number parsing; poisons all later math.
- **`null`** — deliberate "no value"; unlike NaN, callers must consciously handle it.
- **Boundary** — anywhere outside data enters your code (inputs, storage, network).
- **`try/catch`** — run code; if it throws an error, jump to the catch instead of crashing.
- **`??` (nullish coalescing)** — `a ?? b`: use `a`, unless it's null/undefined, then `b`.
- **`Intl.NumberFormat`** — built-in formatter for currency/number strings.
- **Canvas / `fillRect`** — an HTML drawing surface / "paint a rectangle here."
- **Pure function** — output depends only on inputs; touches no page, storage, or globals.
- **Dispatch** — the single funnel every state change goes through (mutate → save → render).
- **Data layer** — the code that owns state and calculations, kept apart from display code.

## 8. Experiments to try on the plane (no internet needed)

Both HTML files open straight from disk in a browser — fully offline.

1. **See the float bug live.** In `original.html`, add expenses `0.10` and `0.20`. Expected total: `0.30000000000000004`. Do the same in `refactored/index.html`: `$0.30`.
2. **Feed both apps garbage.** Type `abc` as an amount and press Add. Original: a NaN row appears and the total becomes NaN — forever (it's saved!). Refactored: a red error message, ledger untouched.
3. **Attack `loadState` from the console.** On the refactored page, open the browser console (F12) and run: `localStorage.setItem('expenses-v1', '{broken json')` then refresh. Expected: fresh empty app, no crash. Then try saving a valid state with one record having `cents: 5.5` — expected: that record silently dropped on refresh.
4. **Add a "biggest single expense" line.** Write it as a new derivation: loop over `state.expenses`, track the max, display with `formatCents`. Expected: it always agrees with the list, because it derives from the same data.
5. **Restyle the chart.** In `drawChart`, scale bars by `row.fraction` instead of `row.cents / rows[0].cents`. Expected: the biggest bar no longer fills the width — bars now show share-of-total instead of share-of-biggest. Which do you find easier to read?
