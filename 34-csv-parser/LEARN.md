# 📘 Learning Guide: CSV Parser

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A parser that turns spreadsheet-export text (CSV) into arrays and objects — including the messy files real spreadsheets produce:

```js
parseCsv('name,motto\nada,"simple, but no simpler"')
// [['name', 'motto'], ['ada', 'simple, but no simpler']]

csvToObjects('name,role\nada,engineer\ngrace,admiral')
// [{ name: 'ada', role: 'engineer' }, { name: 'grace', role: 'admiral' }]
```

Running `node original.js` shows the naive four-line version working on a toy string, then shredding a quoted motto into pieces, mangling escaped quotes, and sprouting phantom rows on a Windows-exported file.

## 2. Concepts you need first

### What CSV is

**CSV** ("comma-separated values") is the plain-text format spreadsheets export. One line per row, commas between fields:

```
name,role
ada,engineer
grace,admiral
```

Two complications make it interesting:
- If a field *contains* a comma (or a newline), it's wrapped in quotes: `"simple, but no simpler"`.
- If a quoted field contains a quote character, it's doubled: `""` means one literal `"`. So `"she said ""later"""` is the text `she said "later"`.

### Escape characters and newlines

- `\n` inside a JavaScript string is the **newline** character (line break). `\r` is **carriage return**, a second, older line-break character.
- Windows programs (like Excel) end lines with the pair `\r\n`; Unix/Mac use just `\n`. A robust parser must accept both.

```js
console.log("a\nb");       // prints a, then b on the next line
console.log("x\r\ny".length); // 4 — \r and \n are one character each
```

### `split` — and what it can't do

`str.split(sep)` chops a string at every separator:

```js
console.log("a,b,c".split(","));   // ["a", "b", "c"]
console.log("a,b\nc".split("\n")); // ["a,b", "c"]
```

`split` chops at *every* occurrence, unconditionally. It cannot say "...unless we're inside quotes", because it has no idea where "inside quotes" begins or ends. That missing awareness is the whole lesson.

### Parsing and state

**Parsing** means reading text and building structured data from it. The key insight: in many formats, *the meaning of a character depends on context*. A comma is a separator — unless quotes are open, in which case it's just text. To respect context, a parser must **remember** where it is as it reads. That memory is called **state**.

### State machines (the smallest useful one)

A **state machine** is code that is always in exactly one of a few named states, and reacts to each input differently depending on the state. Here, two states: `inQuotes` true or false — a single boolean.

```js
let inQuotes = false;
for (const ch of '"a,b",c') {
  if (ch === '"') inQuotes = !inQuotes;
  else console.log(ch, inQuotes ? "text" : "separator?");
}
// a text / , text / b text / , separator? / c separator?
```

Same character, different meaning, depending on remembered state. Every real parser — JSON, HTML, programming languages — is this loop grown up.

### Buffers (accumulators)

A **buffer** is a variable where you collect pieces until a boundary event: here, `field` collects characters until a comma ends the field, and `row` collects fields until a newline ends the row. When a boundary fires, you push the buffer's contents onward and reset it to empty.

### Look-ahead

Sometimes one character isn't enough to decide — you peek at the next one: `text[i + 1]`. Seeing `"` while inside quotes means either "closing quote" or, if the *next* character is also `"`, "escaped literal quote". Peeking plus `i++` (skipping the peeked character) resolves it.

### Indexing strings, and `charAt` vs `[i]`

`text[i]` gives the character at position `i` (or `undefined` past the end — which is handy: look-ahead at the last character safely returns `undefined` and simply won't match `'"'`).

### Destructuring with rest, `Object.fromEntries`, `??`

```js
const [first, ...others] = [1, 2, 3];        // first = 1, others = [2, 3]
console.log(Object.fromEntries([["a", 1], ["b", 2]])); // { a: 1, b: 2 }
console.log(undefined ?? "");                // ""  (fallback for null/undefined)
```

- `const [header, ...rows] = parseCsv(text)` splits off the first row from the rest.
- `Object.fromEntries` builds an object from `[key, value]` pairs — the reverse of `Object.entries`.
- `row[i] ?? ''` supplies an empty string when a row is shorter than the header.

## 3. Walking through the original code

The entire "parser":

```js
function parseCsv(text) {
  var lines = text.split("\n");
  var rows = [];
  for (var i = 0; i < lines.length; i++) {
    rows.push(lines[i].split(","));
  }
  return rows;
}
```

Split the text into lines at every `\n`, then split each line at every comma. On the hand-typed test string it works perfectly — which is exactly why this bug ships.

Then the three real-world inputs arrive:

```js
var quoted = 'name,motto\nada,"simple, but no simpler"';
// [..., ['ada', '"simple', ' but no simpler"']] — the motto is in pieces.
```

The comma inside the quotes is field *text*, but split chops there anyway. The quote characters even stay glued to the fragments.

```js
var nested = 'name,quote\ngrace,"she said ""later"""';
console.log(parseCsv(nested)); // shredded
```

Doubled quotes make it worse — split has no concept of any of this.

```js
var windows = "name,role\r\nada,engineer\r\n";
// [['name','role'],['ada','engineer\r'], ['']]
```

Splitting on `\n` leaves each line still ending in `\r` — a **stowaway** character that silently rides along on the last field of every row (`'engineer\r'` is not equal to `'engineer'`!). And the file's final `\r\n` produces one last empty string from split, minting a phantom row `['']`.

## 4. What's wrong with it (in beginner terms)

**It shreds quoted fields.** Story: your app imports a customer list. One customer's company is `"Smith, Jones & Co"`. After import, the company column says `"Smith` and the *email* column says ` Jones & Co"` — every column after the comma shifted right by one. Multiply by a few hundred rows with commas in addresses, and the imported table is confetti. Quoting is the *entire mechanism* CSV has for protecting commas; a parser that ignores it fails on precisely the rows that needed it.

**The stowaway `\r`.** This is the classic "works on my machine" bug. You develop on Mac/Linux with `\n` files — everything passes. The customer uploads an Excel export (`\r\n`). Now every row's last field carries an invisible `\r`. `role === "engineer"` is false, lookups miss, deduplication fails — and when you `console.log` the value, it *looks identical* because `\r` prints as nothing. People lose afternoons to this character.

**The phantom row.** Files conventionally end with a final newline. Split turns that into an extra `['']` row, which becomes an extra blank record in the database, or a crash in whatever code assumed every row has two fields.

**The deep reason:** whether a comma separates fields depends on whether you're inside quotes. `split` makes every decision with zero memory. No amount of clever splitting fixes a memory problem — you need a loop that remembers.

## 5. Try it yourself first!

Try writing the real parser before reading on. Hints, vague → specific:

1. Abandon `split`. Read the text one character at a time with a `for` loop.
2. You need four variables: finished `rows`, the current `row` (array of fields), the current `field` (string being collected), and one boolean: `inQuotes`.
3. Decide each character's meaning based on `inQuotes`. Inside quotes: everything is field text — except `"`.
4. Outside quotes: `,` ends the field; `\n` (or `\r`) ends the field *and* the row; `"` switches `inQuotes` on; anything else joins the field.
5. The `""` escape: inside quotes, when you see `"`, peek at `text[i + 1]`. Another `"`? Add one literal quote to the field and skip ahead (`i++`). Otherwise the quotes are closing.
6. `\r\n`: when you see `\r` followed by `\n`, skip the `\n` so the pair counts as one ending.
7. After the loop, don't forget the last row — text usually doesn't end with a newline. Push whatever's in the buffers (but not if both are empty, or a trailing newline would mint a phantom row).
8. Then `csvToObjects`: take the first parsed row as headers and zip each remaining row into an object.

## 6. Understanding the refactored solution

**The state and the two named events:**

```js
const rows = [];
let row = [];
let field = '';
let inQuotes = false;

const endField = () => { row.push(field); field = ''; };
const endRow = () => { endField(); rows.push(row); row = []; };
```

`endField` and `endRow` are tiny helpers naming the two boundary events. Note `endRow` calls `endField` first — a row boundary is *also* a field boundary. Pairing the "push" and the "reset" inside one helper means they can never drift apart; inlined twice, one copy eventually forgets the reset.

**The loop, quote-state first:**

```js
if (inQuotes) {
  if (char === '"') {
    if (text[i + 1] === '"') { field += '"'; i++; } // "" -> literal "
    else inQuotes = false;                          // closing quote
  } else {
    field += char; // inside quotes, commas and newlines are just text
  }
}
```

Inside quotes, only `"` is special. The one-line look-ahead resolves the `""` escape; everything else — commas, even newlines — is plain text. That's how multi-line fields work for free (there's a test).

**Outside quotes:**

```js
} else if (char === '"') {
  inQuotes = true;
} else if (char === ',') {
  endField();
} else if (char === '\n' || char === '\r') {
  if (char === '\r' && text[i + 1] === '\n') i++; // \r\n is ONE ending
  endRow();
} else {
  field += char;
}
```

Line endings are decided in exactly one place: when a `\r` is followed by `\n`, the `i++` skips the `\n`, so the pair collapses to one ending. No `.trim()` patches scattered around callers, no stowaways.

**The final row:**

```js
if (field !== '' || row.length > 0) endRow();
```

After the loop, leftover buffered text is the last row (files often lack a final newline). The condition also prevents the phantom: after a trailing newline, both buffers are empty, so nothing extra is pushed.

**Shaping is a separate job:**

```js
export function csvToObjects(text) {
  const [header, ...rows] = parseCsv(text);
  if (!header) return [];
  return rows.map((row) =>
    Object.fromEntries(header.map((name, i) => [name, row[i] ?? ''])),
  );
}
```

Parse first, shape second — two functions, two jobs. For each data row, pair header names with row values into `[name, value]` entries, then `Object.fromEntries` builds the object. Short rows pad with `''` via `??` — a documented, tested decision rather than an accident.

**The tests** are a bestiary of real exports: quoted commas, `""` escapes, newlines *inside* fields, CRLF endings, trailing newline, empty fields (`'a,,c'`), empty input, header-driven objects, and short-row padding. As the README notes, each of these was a production incident for somebody once.

## 7. Words you learned (glossary)

- **CSV**: comma-separated values — the spreadsheet text format.
- **Field / row**: one cell's text / one line's list of cells.
- **Quoting**: wrapping a field in `"` so commas/newlines inside it stay literal.
- **Escape (`""`)**: CSV's way of writing one literal quote inside a quoted field.
- **`\n` / `\r` / CRLF**: newline / carriage return / the Windows pair `\r\n`.
- **Stowaway `\r`**: the invisible carriage return left on fields when only `\n` is split.
- **Phantom row**: the empty extra row minted from a trailing newline.
- **Parsing**: turning text into structured data.
- **State**: what a parser remembers about where it is (here: `inQuotes`).
- **State machine**: code that reacts to input differently depending on its current state.
- **Buffer / accumulator**: a variable collecting pieces until a boundary event.
- **Boundary event**: the moment a field or row is complete (`endField`, `endRow`).
- **Look-ahead**: peeking at `text[i + 1]` to decide the current character's meaning.
- **Destructuring with rest**: `const [head, ...tail] = arr` — first item, then the rest.
- **`Object.fromEntries`**: build an object from `[key, value]` pairs.
- **`??`**: fallback used only when the value is `null`/`undefined`.
- **"Works on my machine"**: a bug that only appears with other people's data or systems.

## 8. Experiments to try on the plane (no internet needed)

1. **Meet the stowaway.** Scratch file: `const rows = "a,b\r\nc,d".split("\n"); console.log(rows[1], rows[1].length, rows[1] === "c,d");` Expected: prints what *looks like* `c,d` but length `4` and `false` — the invisible `\r` in person.
2. **Break the look-ahead, watch the escape die.** In `refactored/csv.js`, remove the `if (text[i + 1] === '"') { field += '"'; i++; }` line (keep `else inQuotes = false;` as just `inQuotes = false;`) and run `node --test 34-csv-parser/`. Expected: the doubled-quotes test fails — `""` now toggles quote state twice instead of producing a literal quote.
3. **Break the CRLF collapse.** Remove the `if (char === '\r' && text[i + 1] === '\n') i++;` line and rerun. Expected: the Windows-endings test fails with an extra empty row per line — `\r` ends the row, then `\n` immediately "ends" an empty one.
4. **Feed it something evil, predict first.** In a scratch file: `parseCsv('a,"b\r\nc",d')`. Predict: how many rows? Expected: one row, `['a', 'b\r\nc', 'd']` — inside quotes even `\r\n` is just text (the CRLF skip only runs in the non-quoted branch).
5. **Extend the shaper.** Write `csvToNumbers(text)` in the test file: like `csvToObjects`, but run `Number(value)` on each field and keep the number when it's not `NaN`. Test with `'x,y\n1,2\n3,oops'`. Expected: `[{x: 1, y: 2}, {x: 3, y: 'oops'}]` — parse first, shape second means you never touched the parser to do it.
