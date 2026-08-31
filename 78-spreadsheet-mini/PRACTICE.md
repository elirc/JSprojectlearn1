# 🏋️ Practice: Mini Spreadsheet

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

Everything here runs in node — the engine has no DOM in it, which is the whole point.

## Exercises

### ⭐ 1. Pin down the boring rules (warm-up)
Four rules nobody wrote a test for: an empty cell is `0`, a cell holding `hello` is `#ERROR!`, spaces are ignored (`'  6  '` is 6 and `'=  c1 * 2 '` works with a lowercase reference), and — most importantly — `evaluateSheet` must not *change* the `cells` object you handed it. Add one test covering all four. The last one is checked by comparing `JSON.stringify(cells)` before and after the call.
What it practices: writing down the behaviour you're relying on, including purity, which is invisible until someone breaks it.
Hint: `assert.equal(values.B1, BAD_FORMULA)` — import the marker instead of typing `'#ERROR!'`, so a renamed marker can't quietly break your test's meaning.

### ⭐⭐ 2. Who breaks if I change this cell? (core)
Write `dependentsOf(cells, name)` returning every cell that would need recomputing if `name` changed — not just the cells that mention it directly, but *their* dependents too, all the way down. With `{A1:'5', B1:'=A1*2', C1:'=B1+1', D1:'=A1+C1', E1:'9'}`: `dependentsOf(cells,'A1')` is `['B1','C1','D1']` in some order, `dependentsOf(cells,'C1')` is `['D1']`, and `dependentsOf(cells,'E1')` is `[]`. Bonus surprise to assert: in `{A1:'=B1', B1:'=A1'}`, `dependentsOf(cells,'A1')` includes **A1 itself**.
What it practices: walking a graph outwards (breadth-first) with a `visited` set — the same shape as `computeOrder`, pointed the other way down the arrows.
Hint: build the reverse index first (`readers`: cell → the cells that mention it), then start a queue at `name` and keep pulling. The `visited` set isn't an optimization here — without it, a cycle loops forever.

### ⭐⭐ 3. A power operator, right-associative (core)
Add `^` so `=2^3` is 8. Two rules to get right: it binds **tighter** than `*` (`=2*3^2` is 18, not 36), and it groups to the **right** (`=2^3^2` is `2^(3^2)` = 512, not `(2^3)^2` = 64). Add a `power` level to the grammar between `term` and `factor`, plus a `case '^'` in the evaluator. All 14 existing tests must still pass.
What it practices: adding a precedence level to a recursive-descent parser — and seeing that associativity is a *loop vs recursion* choice, not a rule you check.
Hint: `+ - * /` use `while` loops, which is what makes them left-associative. Write `power()` as `factor()` then, if the next token is `^`, recurse into `power()` for the right side. Recursion to the right = right-associative.

### ⭐⭐ 4. Recompute only what changed (core)
25 cells re-evaluated because one changed is silly at 5×5 and fatal at 500×500. Write `orderToRecompute(cells, changed)` returning `{order, cyclic}` containing only `changed` and its dependents — still in dependency order. With `{A1:'5', B1:'=A1*2', C1:'=B1+1', D1:'9', E1:'=D1+1'}`: changing `A1` gives `order: ['A1','B1','C1']`, changing `D1` gives `['D1','E1']`, changing `C1` gives `['C1']`.
What it practices: composing two functions you already have (exercise 2's dependents + `computeOrder`) instead of writing a third algorithm.
Hint: the affected set is `new Set([changed, ...dependentsOf(cells, changed)])`; then just `filter` the full topological order by it. Filtering a valid order always leaves a valid order — worth pausing on why.

### ⭐⭐⭐ 5. SUM and ranges (challenge)
Teach the engine `=SUM(A1:A3)`, `=SUM(A1:A3, 10)` and `=MAX(A1:A3)`. Four parts: the tokenizer must emit `:`  `,` and bare `name` tokens; `expandRange('A1','B2')` must list `['A1','A2','B1','B2']`; `referencesOf` must expand ranges too **or the ordering breaks** (a `SUM` cell computed before the cells it sums reads zeros); and `factor()` must parse a call, with a `FUNCTIONS` allow-list so `=alert(1)` is still `#ERROR!`. Check: `{A1:'1',A2:'2',A3:'3',B1:'=SUM(A1:A3)'}` gives `B1` 6; `{A1:'=SUM(B1:B2)', B1:'1', B2:'=B1+1'}` gives `A1` 3; and `{A1:'=SUM(A1:A2)', A2:'1'}` gives `#CYCLE!`, because a range that contains you is still a cycle.
What it practices: extending all four stages of a pipeline in step — and feeling why the dependency stage must know about a syntax feature the evaluator invented.
Hint: do `referencesOf` *before* the parser work and test the ordering first; that's the part that silently gives wrong numbers instead of throwing. Ranges are not expressions, so give function arguments their own tiny `argument()` function that checks for `ref : ref` before falling back to `expression()`.

### ⭐⭐⭐ 6. Fuzz: prove the sort beats the loop (challenge)
Write the original's strategy as a testable function: `bruteForce(cells, passes)` computes every cell in object order using only the *previous* pass's values, repeated `passes` times. For an acyclic sheet, enough passes always settles on the right answer — that's what the original was doing one keystroke at a time. Now fuzz: 300 random 6-cell sheets (each cell a small number or `=X op Y` with `+ - *`), and for every one assert that `evaluateSheet`'s single pass equals `bruteForce(cells, cellCount + 1)` for every non-cyclic cell, while every cyclic cell is `#CYCLE!`.
What it practices: property-based testing across two independent implementations — the strongest evidence you can get without a proof, and here it *is* the README's claim, mechanized.
Hint: compare with `Object.is(a, b)` — random `*` chains can reach `Infinity`, and `assert.equal(NaN, NaN)` would fail on a sheet that is otherwise fine. Keep division out of the generator, or brute force says `Infinity` where the engine correctly says `#DIV/0!`.

## Solutions

### 1. Pin down the boring rules
```js
test('the boring rules, written down', () => {
  const cells = { A1: '', B1: 'hello', C1: '  6  ', D1: '=  c1 * 2 ' };
  const before = JSON.stringify(cells);
  const values = evaluateSheet(cells);
  assert.equal(values.A1, 0);            // empty cell == 0
  assert.equal(values.B1, BAD_FORMULA);  // text is not a number
  assert.equal(values.C1, 6);
  assert.equal(values.D1, 12);           // lowercase refs, spaces ignored
  assert.equal(JSON.stringify(cells), before); // the engine changed nothing
});
```
WHY: the purity assertion is the valuable one. `evaluateSheet` returns a fresh object and never writes to its input, which is what lets the page keep `cells` as the single source of truth and call the engine as often as it likes — including twice in one render (`render()` calls `evaluateSheet` and `computeOrder` back to back) with no risk that the first call poisoned the second. Verified by running: 5 assertions pass.

### 2. Who breaks if I change this cell?
```js
export function dependentsOf(cells, name) {
  const readers = new Map(Object.keys(cells).map((n) => [n, []])); // cell -> who reads it
  for (const cellName of Object.keys(cells)) {
    const raw = String(cells[cellName] ?? '').trim();
    if (!raw.startsWith('=')) continue;
    let refs = [];
    try { refs = referencesOf(raw.slice(1)); } catch { refs = []; }
    for (const ref of refs) if (readers.has(ref)) readers.get(ref).push(cellName);
  }

  const found = new Set();
  const queue = [name];
  while (queue.length > 0) {
    for (const reader of readers.get(queue.shift()) ?? []) {
      if (found.has(reader)) continue; // without this, a cycle never ends
      found.add(reader);
      queue.push(reader);
    }
  }
  return [...found];
}
```
WHY: this is `computeOrder`'s `feeds` map extracted and followed outwards — same graph, opposite direction, which is why "what do I need?" and "who needs me?" are the same code twice. The `found` set doing double duty as the result *and* the visited-guard is what makes a cyclic sheet terminate; it's also why `dependentsOf({A1:'=B1',B1:'=A1'}, 'A1')` truthfully includes `A1` — in a cycle, changing A1 does require recomputing A1. Verified by running: all four expectations hold.

### 3. A power operator, right-associative
```js
// tokenizer: add '^' to the operator characters
} else if ('+-*/()^'.includes(char)) {

// parser: term now calls power(), and power() recurses to the RIGHT
function term() {
  let node = power();
  while (peek()?.type === '*' || peek()?.type === '/') {
    const op = tokens[position++].type;
    node = { type: 'binary', op, left: node, right: power() };
  }
  return node;
}

function power() {
  const base = factor();
  if (peek()?.type !== '^') return base;
  position++;
  return { type: 'binary', op: '^', left: base, right: power() }; // right side recurses
}

// evaluator:
case '^': return left ** right;
```
WHY: precedence came from *where* you insert the level (`term` calls `power` calls `factor`, so `^` is resolved before `*` ever sees its operands), and associativity came from *how* you loop. A `while` loop keeps folding the result into the left slot — `((10-4)-3)`. Recursing into yourself for the right operand keeps the tail unfinished until the end — `2^(3^2)`. Two lines apart in the same file, two different shapes of tree. Verified by running: 8, 512, 18, 36 and `=A1^2+1` → 10, with all 14 original tests still green.

### 4. Recompute only what changed
```js
export function orderToRecompute(cells, changed) {
  const affected = new Set([changed, ...dependentsOf(cells, changed)]);
  const { order, cyclic } = computeOrder(cells);
  return {
    order: order.filter((name) => affected.has(name)),
    cyclic: cyclic.filter((name) => affected.has(name)),
  };
}
```
WHY: no new algorithm — a set intersection with a list you already sorted. It's correct for a subtle reason worth naming: if every arrow points forwards in the full order, removing cells can't make an arrow point backwards, so **a filtered topological order is still a topological order**. And the affected set is safe to filter *by* because it's closed under "reads": if C1 is in it, everything C1 needs either isn't changing (so its value is already right) or is also in the set. In a real sheet you'd stop here and call `evaluateSheet` on the subset with the previous values pre-loaded. Verified by running: `['A1','B1','C1']`, `['D1','E1']`, `['C1']`.

### 5. SUM and ranges
```js
// 1. tokenizer: ':' and ',' become operators, and letters WITHOUT digits
//    become a name token instead of throwing.
if (digits === '') tokens.push({ type: 'name', text: letters.toUpperCase() });
else tokens.push({ type: 'ref', name: (letters + digits).toUpperCase() });
// ...
} else if ('+-*/()^:,'.includes(char)) {

// 2. ranges as cell names
export function expandRange(from, to) {
  const split = (name) => [name.charCodeAt(0), Number(name.slice(1))];
  const [fromColumn, fromRow] = split(from);
  const [toColumn, toRow] = split(to);
  const names = [];
  for (let c = Math.min(fromColumn, toColumn); c <= Math.max(fromColumn, toColumn); c++) {
    for (let r = Math.min(fromRow, toRow); r <= Math.max(fromRow, toRow); r++) {
      names.push(String.fromCharCode(c) + r);
    }
  }
  return names;
}

// 3. referencesOf expands ranges — WITHOUT this the ordering is wrong
export function referencesOf(formula) {
  const tokens = tokenize(formula);
  const names = [];
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].type !== 'ref') continue;
    if (tokens[i + 1]?.type === ':' && tokens[i + 2]?.type === 'ref') {
      names.push(...expandRange(tokens[i].name, tokens[i + 2].name));
      i += 2;
    } else {
      names.push(tokens[i].name);
    }
  }
  return [...new Set(names)];
}

// 4. parser: a call is a name, '(', arguments, ')' — and the name must
//    be one we know, so 'alert' is a syntax error, not a function.
if (token.type === 'name') {
  position++;
  if (!FUNCTIONS[token.text]) throw new SyntaxError(`Unknown function "${token.text}"`);
  if (peek()?.type !== '(') throw new SyntaxError(`Missing ( after ${token.text}`);
  position++;
  const args = [];
  if (peek()?.type !== ')') {
    args.push(argument());
    while (peek()?.type === ',') { position++; args.push(argument()); }
  }
  if (peek()?.type !== ')') throw new SyntaxError('Missing closing parenthesis');
  position++;
  return { type: 'call', name: token.text, args };
}

function argument() { // a range, or any ordinary expression
  if (peek()?.type === 'ref' && tokens[position + 1]?.type === ':' && tokens[position + 2]?.type === 'ref') {
    const from = tokens[position].name;
    const to = tokens[position + 2].name;
    position += 3;
    return { type: 'range', from, to };
  }
  return expression();
}

// 5. evaluator
const FUNCTIONS = {
  SUM: (ns) => ns.reduce((total, n) => total + n, 0),
  MIN: (ns) => Math.min(...ns),
  MAX: (ns) => Math.max(...ns),
  AVERAGE: (ns) => ns.reduce((total, n) => total + n, 0) / ns.length,
};

if (node.type === 'call') {
  const numbers = node.args.flatMap((arg) =>
    arg.type === 'range'
      ? expandRange(arg.from, arg.to).map((name) => readCell(name, values))
      : [evaluateNode(arg, values)]);
  if (numbers.length === 0) throw new FormulaError(BAD_FORMULA);
  return FUNCTIONS[node.name](numbers);
}
```
WHY: the interesting failure isn't in the parser, it's in step 3. Skip it and everything *runs* — `=SUM(A1:A3)` just quietly reads zeros, because `computeOrder` saw no dependencies and put the SUM cell first. That's the original's stale-value bug reappearing in the refactor, which is the point: **the dependency stage must understand every syntax feature that can name a cell.** The allow-list in step 4 is also load-bearing: with `alert` tokenizing as a `name`, the only thing standing between a formula and a function call is `FUNCTIONS[token.text]` — an empty table means the language has no functions and cannot be tricked into one. Verified by running: SUM 6, SUM-with-extra-argument 16, MAX 3, `expandRange('A1','B2')` → `['A1','A2','B1','B2']`, ordering respected, self-range `#CYCLE!`, `=alert(1)` still `#ERROR!`.

### 6. Fuzz: prove the sort beats the loop
```js
function bruteForce(cells, passes) {              // what the original does, honestly
  const names = Object.keys(cells);
  let values = Object.fromEntries(names.map((n) => [n, 0]));
  for (let pass = 0; pass < passes; pass++) {
    const previous = values;                       // read last pass only
    const next = {};
    for (const name of names) {
      const raw = String(cells[name] ?? '').trim();
      if (raw === '') { next[name] = 0; continue; }
      if (!raw.startsWith('=')) { next[name] = Number(raw); continue; }
      next[name] = walk(parse(tokenize(raw.slice(1))), previous);
    }
    values = next;
  }
  return values;
}

test('FUZZ: one topological pass equals settling by brute force', () => {
  for (let trial = 0; trial < 300; trial++) {
    const cells = randomSheet();                    // 6 cells, numbers or =X op Y
    const values = evaluateSheet(cells);
    const { cyclic } = computeOrder(cells);
    const settled = bruteForce(cells, Object.keys(cells).length + 1);
    for (const name of Object.keys(cells)) {
      if (cyclic.includes(name)) {
        assert.equal(values[name], CYCLE, `${name} in ${JSON.stringify(cells)}`);
      } else {
        assert.ok(Object.is(values[name], settled[name]),
          `${name}: engine ${values[name]} vs settled ${settled[name]}`);
      }
    }
  }
});
```
WHY: this is the README's claim turned into an experiment. The brute force is *allowed as many passes as there are cells* — the best case for the original's strategy — and it still only ever catches up to what one topological pass already knew. That's the trade in one line: the original pays N passes over N cells (N² work, and only if the user keeps typing) for an answer the sort gets in one. And the cyclic branch is the part brute force can never fix with more passes: those cells have no fixed point to converge to, which is precisely why the engine refuses to print a number for them. Verified by running: 300 random sheets, ~1,800 cell assertions, all green.
