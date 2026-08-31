# 📘 Learning Guide: Mini Spreadsheet

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A 5×5 grid where every cell holds either a number or a **formula** that reads other cells:

```
     A          B        C     D          E
1  =B1+1      =C1*2      5    =E1+1     =D1+1
2
3
```

C1 is 5, so B1 should be 10, so A1 should be 11. And D1/E1 point at each other, which is impossible — a real spreadsheet says `#CYCLE!` rather than pretending.

That "so… so…" chain is the entire subject of this project. Getting A1 right means computing C1 **before** B1 and B1 **before** A1 — even though A1 sits first on the grid. The original recomputes cells in the order they appear on screen and is therefore wrong in a way that *looks* almost right, which is the worst kind of wrong.

## 2. Concepts you need first

### Dependencies, and the graph they form

If A1's formula mentions B1, then **A1 depends on B1**. Draw an arrow from the cell that must be computed first to the one that needs it:

```
C1 ──▶ B1 ──▶ A1          D1 ──▶ E1
                          E1 ──▶ D1   (uh oh)
```

A picture like this — dots with arrows between them — is called a **graph**. The dots are **nodes**, the arrows are **edges**. Project 37 built *trees*, which are graphs where every node has exactly one parent; a spreadsheet is looser (a cell can be read by five other cells) but the same idea: structure you have to respect.

### Topological order

A **topological order** is any ordering of the nodes where every arrow points *forwards* — nobody appears before something it depends on. For the chain above, the only valid order is `C1, B1, A1`. If you compute in that order, every value you need is already sitting there, finished.

You use topological order constantly without naming it: you can't put on shoes before socks; `npm install` builds a package's dependencies before the package; a build system compiles `utils.js` before the file that imports it.

### Kahn's algorithm (topological sort, the friendly version)

How do you find that order? Count arrows coming *in*:

```
C1 waits for 0 cells   <- ready immediately
B1 waits for 1 (C1)
A1 waits for 1 (B1)
```

1. Take every cell waiting for **zero** things — those are ready. Compute them.
2. Each cell you finish means anyone waiting on it is waiting for one fewer thing. Subtract 1 from their counters.
3. Anyone whose counter just hit zero is now ready. Repeat until nothing is ready.

Run it: `C1` is ready → finish it → `B1` drops to 0 → finish it → `A1` drops to 0 → finish it. Order found: `C1, B1, A1`.

**And here's the beautiful part.** What happens with D1 and E1? Each waits for the other, so neither ever reaches zero, so neither is ever computed and both are left over at the end. **The leftovers are exactly the cells in (or downstream of) a cycle.** You don't write cycle detection — you write the sort, and cycle detection falls out of it.

### Tokens, and why "search and replace" isn't parsing

The original turns `=A1+B2*2` into a string like `1+4*2` by replacing every match of `/[A-E][1-5]/` with a number, then asks JavaScript to run the result. Two things go wrong:

- The regex doesn't know what a *name* is. In `=A11` it matches the `A1` and leaves the trailing `1`, so the formula becomes `51`. No error — just a wrong number.
- Running the result means the formula language is **all of JavaScript**.

A **tokenizer** walks the text once and produces meaningful pieces (project 34's walk-with-state loop, project 49's stage 1):

```js
tokenize('A1+B2*2')
// [ {type:'ref',name:'A1'}, {type:'+'}, {type:'ref',name:'B2'}, {type:'*'}, {type:'number',value:2} ]
```

Now `A11` is unmistakably one reference, and `alert` — letters with no digits after them — can only be a syntax error.

### Precedence lives in the tree, not in a rule

`=A1+B2*2` must mean `A1 + (B2*2)`. You don't enforce that with an `if`; you build a **tree** whose shape says it (project 49 again):

```
      (+)
     /   \
   A1    (*)
        /   \
      B2     2
```

Walk that tree bottom-up and multiplication *cannot* happen last. The parser here is **recursive descent**: one function per precedence level, `expression` (for `+ -`) calling `term` (for `* /`) calling `factor` (numbers, references, brackets).

### Error values

Spreadsheets don't crash on bad input; they put a marker *in the cell*: `#CYCLE!`, `#DIV/0!`, `#ERROR!`. And markers **spread**: if C1 is `#DIV/0!`, then `=C1+1` can't honestly be a number either. Our engine does this with a custom error class (project 30) whose message is the marker.

## 3. Walking through the original code

The data lives in the inputs, and one global remembers the last numbers shown:

```js
var values = {}; // cell name -> the number we showed LAST time
```

Then, on every keystroke, every cell is recomputed in grid order:

```js
for (var r = 0; r < ROWS.length; r++) {
  for (var c = 0; c < COLUMNS.length; c++) {
    var name = COLUMNS[c] + ROWS[r];
    var raw = document.getElementById(name).value.trim();
```

When the text starts with `=`, cell names are swapped for numbers and the result is executed:

```js
var expression = raw.slice(1).replace(/[A-E][1-5]/g, function (ref) {
  return values[ref] === undefined ? 0 : values[ref];
});
result = new Function("return " + expression)();
```

Read `values[ref]` carefully. When A1 (first in the loop) asks for B1, B1 **has not been computed yet this pass** — so it hands back the number from the previous pass. First load: `values` is empty, so A1 = 0+1 = 1. Keystroke two: B1 has become 10, but A1 was computed before B1 again, so A1 = 1 still... then 11 on the pass after. The chain limps forwards one cell per keystroke.

D1 and E1 never settle at all: each pass makes both two bigger, forever, with no complaint.

## 4. What's wrong with it (in beginner terms)

**Flaw 1: the loop order is a guess, and the guess is wrong.** The code assumes "top-to-bottom, left-to-right" is a fine order to compute in. It's fine only if nobody ever puts an answer above its question — a rule no spreadsheet can enforce on users. The result isn't a crash, it's *stale numbers that look plausible*, which is how spreadsheet errors end up in real financial reports.

**Flaw 2: no cell knows what it depends on.** Since dependencies are never written down, three features are impossible rather than merely missing: correct ordering, cycle detection, and "only recompute what changed."

**Flaw 3: `new Function` is `eval`.** Type `=(document.title='pwned!')` and the page obeys. A saved sheet from a colleague is now executable code from a colleague.

**Flaw 4: regex string-splicing gives silently wrong answers.** `=A11` → `51`.

**Flaw 5: everything is recomputed, every keystroke.** 25 formulas re-parsed to update one cell — fine at 5×5, hopeless at 500×500.

## 5. Try it yourself first!

1. **Vague hint:** the values are right, just computed in the wrong sequence. Where does the correct sequence come from?
2. **Warmer:** before computing anything, look at each formula and write down which cells it mentions. Now you have a list of arrows.
3. **Warmer still:** which cell can you compute first? (One that mentions no other cells.) After computing it, which becomes computable next?
4. **Almost the answer:** count, for each cell, how many cells it's waiting for. Repeatedly take a cell whose count is 0, compute it, and decrement the counts of the cells that mention it. Collect the order as you go.
5. **The bonus question:** when the loop stops, some cells may still have a count above zero. What must be true about those cells? (This is the whole of cycle detection.)
6. **Design question:** should a cell that reads a `#CYCLE!` cell show its own error, or `#CYCLE!` too? Pick one and write a test for it before you write the code.

## 6. Understanding the refactored solution

**`computeOrder` — the heart of it:**

```js
const waitingFor = new Map(names.map((name) => [name, dependsOn.get(name).length]));
const ready = names.filter((name) => waitingFor.get(name) === 0);
const order = [];

while (ready.length > 0) {
  const name = ready.shift();
  order.push(name);
  for (const dependent of feeds.get(name)) {
    const left = waitingFor.get(dependent) - 1;
    waitingFor.set(dependent, left);
    if (left === 0) ready.push(dependent);
  }
}
```

Two maps carry the graph: `dependsOn` (who I read) and `feeds` (who reads me). The loop is Kahn's algorithm exactly as described above, and the last two lines of the function are cycle detection:

```js
const ordered = new Set(order);
return { order, cyclic: names.filter((name) => !ordered.has(name)) };
```

Anything the sort couldn't reach is stuck. Notice there's no recursion, no "visited" bookkeeping, no maximum depth — and no infinite loop is even possible, because every pass through the `while` removes one cell from a finite list.

**`evaluateSheet` then becomes almost boring**, which is the sign you got the structure right:

```js
for (const name of cyclic) values[name] = CYCLE;
for (const name of order) { /* ...compute; every cell I read is already done... */ }
```

**Errors as values that travel:**

```js
if (typeof value === 'string') throw new FormulaError(value); // pass errors on
```

Reading a cell whose value is a marker throws a `FormulaError`, and the catch in `evaluateSheet` puts that same marker in *this* cell. One line, and `#DIV/0!` correctly floods everything downstream.

**Nothing is eval-ed, and a test says so.** `evaluateSheet({A1: '=alert(1)'})` is `#ERROR!` because `alert` is letters with no digits — not a cell name, therefore not anything. The security property comes from the tokenizer's ignorance, not from a blocklist of dangerous words. Blocklists get bypassed; ignorance doesn't.

**The browser file got smaller and dumber.** `oninput` copies the text into `cells[name]` and calls `render()`; `render()` calls `evaluateSheet` once and draws the answers. The DOM is never asked what the sheet contains — project 14's rule, one project after project 73 reminded you the DOM is a viewport, not a warehouse.

## 7. Words you learned (glossary)

- **Graph / node / edge** — dots connected by arrows; here, cells and "reads".
- **Dependency** — a value you must have before you can compute another.
- **Topological order** — an ordering where every arrow points forwards.
- **Topological sort** — the algorithm that finds such an order.
- **Kahn's algorithm** — the count-and-release version of that sort.
- **Cycle** — a loop of dependencies; nothing in it can ever be computed.
- **Tokenizer** — turns text into meaningful pieces (tokens).
- **Token** — one piece: a number, a reference, an operator.
- **Recursive descent parser** — one function per precedence level, building a tree.
- **AST (tree)** — the shape that encodes precedence.
- **Error marker / sentinel value** — a value like `#DIV/0!` that stands in for "no number here".
- **Error propagation** — a downstream cell inheriting an upstream error.
- **Pure function** — output depends only on input; no DOM, no globals, easy to test.
- **`eval` / `new Function`** — run a string as code. The answer is always "no".

## 8. Experiments to try on the plane (no internet needed)

1. **Watch the lag.** Open `original.html` and click into C1, type a space, delete it, repeat. Expected: A1 goes 1 → 1 → 11 → 11. Now change C1 to `7` and count the keystrokes until A1 says 15.
2. **Break the original on purpose.** In `original.html`, type `=A11` in B2 (A1 is a formula returning 11 there). Expected: a number like `51` and no error — the regex spliced the name.
3. **Prove the eval hole.** Type `=(document.title='pwned!')` into any cell of `original.html` and look at the browser tab. Then type it into the refactor. Expected: `#ERROR!`.
4. **Reverse the sheet.** In `refactored/index.html` build a chain that runs *upwards*: `E5 = 1`, `D5 = =E5+1`, `C5 = =D5+1`, `B5 = =C5+1`, `A5 = =B5+1`. Expected: A5 shows 5 immediately, and the printed recompute order reads `E5 → D5 → C5 → B5 → A5` — the exact opposite of grid order.
5. **Make a cycle by accident.** In the refactor, set `A3 = =B3`, `B3 = =C3`, `C3 = =A3`. Expected: all three say `#CYCLE!`, and every other cell keeps working.
6. **Add a function.** In `engine.js`, teach `factor()` about `SUM(A1,B1)`: on a `ref` token whose name is `SUM`… actually, add a `name` token type for letters-without-digits and handle it in `factor`. Write the test first: `evaluateSheet({A1:'1',B1:'2',C1:'=SUM(A1,B1)'})` is `3`. (Hint: `referencesOf` must find A1 and B1 inside it, or the ordering will be wrong — which is a *great* bug to watch happen.)
