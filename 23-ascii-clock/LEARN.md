# 📘 Learning Guide: ASCII Clock

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A **digital clock that lives in your terminal**, drawn with text characters ("ASCII art"). Run it with Node:

```
node 23-ascii-clock/original.js
```

Every second, the screen clears and reprints the current time in giant block digits built from `#` characters:

```
  # ###     ### ###     ### ###
  # # #  #    # # #  #  # # # #
  # # #     ### ###     # # ###
  # # #  #  #     #  #  # #   #
  # ###     ### ###     ### ###
```

That's `10:23:04`-style output (shown here shortened): each character of the time becomes a little 5-row-tall, 3-column-wide picture, and a colon becomes two stacked dots. Press Ctrl+C to stop.

Both versions show the same clock. The refactor splits the program into three files — a **font** (the digit pictures, as data), a **renderer** (pure text-building functions), and a tiny **clock** (the timer) — and that split is the whole lesson.

## 2. Concepts you need first

### The terminal and `console`
This is a Node program: no browser, no HTML. `console.log(s)` prints a line to the terminal; `console.clear()` wipes the terminal (that's how the clock "updates in place" — wipe, reprint). `setInterval(fn, 1000)` calls fn every 1000 milliseconds — that's the ticking.

### `Date`: asking for the time
`new Date()` creates an object representing "now":

```js
const d = new Date();
console.log(d.getHours());   // e.g. 14
console.log(d.getMinutes()); // e.g. 3
console.log(d.getSeconds()); // e.g. 59
```

You can also build a *specific* moment: `new Date(2026, 0, 1, 9, 5, 3)` is Jan 1 2026, 09:05:03 (months count from 0 — January is 0). That matters for testing: a fixed date gives the same answer every run; "now" never does.

### Zero-padding and `padStart`
Clocks show `09:05:03`, not `9:5:3`. Padding by hand looks like `(h < 10 ? "0" : "") + h`. The built-in way:

```js
String(5).padStart(2, "0");  // "05" — pad to length 2 with zeros
String(12).padStart(2, "0"); // "12" — already long enough, unchanged
```

### Multi-line strings and `\n`
`"\n"` inside a string is a newline. `console.log("a\nb")` prints two lines. So a whole 5-row picture can be *one string* with four `\n`s in it — built once, printed once.

### Ternary chains (what the original is made of)
`cond ? a : b` is an inline if/else. They can chain: `c == ":" ? x : c == "1" ? y : z` means "if colon then x, else if 1 then y, else z." Readable at two links; at five links across five lines, it becomes a puzzle. You'll see.

### A glyph as data
A **glyph** is the picture of one character. Instead of *computing* each row with logic, you can just... write the picture down:

```js
const TWO = ['###',
             '  #',
             '###',
             '#  ',
             '###'];
console.log(TWO.join("\n")); // prints a block-digit 2
```

Five strings, stacked. You can *see* the 2. An object mapping characters to glyphs — `FONT['2']` — is a font. The deep idea: when something fundamentally *is* a table or picture, store it as one; code that generates it row-by-row hides it.

### `map` and `join` (the row-assembly tools)
```js
["ab", "cd", "ef"].map((s) => s[0]);  // ["a", "c", "e"] — transform each
["a", "c", "e"].join(" ");            // "a c e" — glue with spaces
[..."10"]                              // ["1", "0"] — string to characters
```

Combined: "row r of the big picture = row r of every character's glyph, joined with a gap" is one line: `[...text].map((ch) => FONT[ch][r]).join(' ')`.

### Pure functions and dependencies at the edges
A **pure function** computes its output from its parameters alone. `formatTime(date)` — give it a date, get `"09:05:03"` — is pure. A function that internally calls `new Date()` is *not*: its answer changes every second, so no test can pin it down. Same for one that writes to `console`: it does something to the world instead of returning a value you can check.

The cure is called **dependency injection** (fancy name, simple move): anything the code would "reach out" for — the current time, randomness, the network, the screen — gets passed *in* as a parameter instead. The reaching-out gets pushed to one tiny file at the **edge** of the program.

### Modules and tests (quick recap)
`export`/`import` share values between files. `node --test 23-ascii-clock/` runs `render.test.js`; `assert.equal(a, b)` compares values, `assert.throws(fn, /pattern/)` expects an error. `Object.entries(FONT)` yields `[character, glyph]` pairs for looping.

## 3. Walking through the original code

**Getting and formatting the time.**

```js
var d = new Date();
var h = d.getHours();
...
var hs = (h < 10 ? "0" : "") + h;
var ms = (m < 10 ? "0" : "") + m;
var ss = (s < 10 ? "0" : "") + s;
var t = hs + ":" + ms + ":" + ss;
```

Read "now", then pad each part by hand — three copies of the padding ternary (`padStart` would do it once).

**The five row-builders.** After `console.clear()`, five accumulator strings get built in one loop over the time text:

```js
row1 += (c == ":" ? "   " : c == "1" ? "  #" : c == "4" ? "# #" : "###") + " ";
row2 += (c == ":" ? " # " : c == "1" ? "  #" : c == "2" || c == "3" || c == "7" ? "  #"
        : c == "5" || c == "6" ? "#  " : "# #") + " ";
```

Decode row1: "for the top row — colon gets blank, 1 gets `  #`, 4 gets `# #`, everything else gets `###`." Each of the five rows has its own chain like this, exploiting which digits happen to share a row shape. The shape of the digit "2" exists as five fragments: one branch in row1's chain, one in row2's, one in row3's... The font isn't *anywhere* — it's smeared across five expressions.

**The ticking.** `show(); setInterval(show, 1000);` — draw now, then every second.

**The closing comment says it all**: "Is the '9' right? Which ternary chain would you even check?"

## 4. What's wrong with it (in beginner terms)

**1. The font is smeared across five loops.** Say you decide "7" should have a little hook: top row `###`, second row `  #`... wait, you want to change row 2 of the seven. Which ternary is that? Row2's chain says `c == "2" || c == "3" || c == "7" ? "  #"` — so "7" *shares* a branch with 2 and 3. To change 7 alone you must split that branch, without disturbing 2 and 3, and then re-check rows 3, 4, 5 for other shared branches involving 7. One cosmetic tweak becomes surgery on five entangled expressions. And after the edit, is the 9 still right? *You literally cannot tell by reading* — you must run the clock and wait for a 9 to appear (up to 10 seconds!) and squint.

**2. Untestable, twice over.** A test wants to say "given X, expect Y." But `show()` has no X — it grabs the *current* time inside, so its output changes every second. And it has no Y — it returns nothing; it clears *your* terminal and prints. There is no seam anywhere to attach an assertion to. The two sins are independent: baked-in "now" kills repeatability; direct printing kills observability.

**3. Repetition where a tool exists.** The manual zero-padding ternary, three times, doing what `padStart(2, '0')` does in one call.

## 5. Try it yourself first!

1. Vague: where *should* the shape of the digit "2" live, so you could check it at a glance?
2. Write the font as data: an object where `FONT['2']` is an array of 5 three-character strings — the picture, drawn as you'd see it. Do all ten digits and the colon. (Grab graph paper vibes: 3 wide, 5 tall.)
3. Now the assembly: `renderText(text)` should return one big string. Think in rows: the big row r is glyph-row r of each character, joined with a space. One loop over r (0..4), `map`/`join` inside, then `join('\n')` the five rows.
4. Split time formatting into `formatTime(date)` — note: date is a *parameter*. Use `padStart`. Never call `new Date()` inside it.
5. What's left? A tiny file: `setInterval(() => { console.clear(); console.log(renderText(formatTime(new Date()))); }, 1000)`. All the "impure" stuff — time, terminal, timer — in six lines.
6. Tests you can now write: `formatTime(new Date(2026, 0, 1, 9, 5, 3))` equals `"09:05:03"`; `renderText('10')` equals a string you write out by hand; and a *data* test — every glyph is exactly 5 rows of 3 characters.

## 6. Understanding the refactored solution

Three files, one pipeline stage each: `Date → formatTime → "14:03:59" → renderText → big string → console`.

**`font.js` — the font you can see.** Every glyph is its actual picture:

```js
'2': ['###',
      '  #',
      '###',
      '#  ',
      '###'],
```

Is the 2 right? *Look at it.* To restyle a digit, edit its picture. To add characters (letters a–f for a hex clock?), add entries — no other file changes. `FONT_HEIGHT = 5` is exported so the renderer doesn't hardcode the 5.

**`render.js` — two pure functions.**

```js
export function formatTime(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}
```

The date comes *in* as a parameter — the injectable-clock trick. The three hand-padding ternaries became one `pad` helper used three times.

`renderText(text)` first validates: any character without a glyph throws `No glyph for "x"` — loud failure instead of garbled art (the project 18 lesson again). Then the assembly, written once:

```js
for (let r = 0; r < FONT_HEIGHT; r++) {
  rows.push([...text].map((char) => FONT[char][r]).join(' '));
}
return rows.join('\n');
```

"For each row r: take row r of every character's glyph, join with a one-space gap." The only genuinely tricky logic in the program — slicing horizontally across vertical glyphs — exists in one place, not five.

**`clock.js` — the only impure file.** Six lines: `tick` builds the string from `new Date()` and prints it; `setInterval(tick, 1000)` repeats. Everything untestable in the whole program is quarantined here, and it's so thin nothing in it can meaningfully break. This "pure core, thin impure shell" shape is the same architecture as compilers and React rendering — chains of representations with pure transformations between them.

**`render.test.js` — testing all three kinds of things.**

- *Pure function, fixed input*: `formatTime(new Date(2026, 0, 1, 9, 5, 3))` must be `"09:05:03"` — possible **only** because the date is injected.
- *Exact rendering*: `renderText('10')` compared against the five expected rows written literally in the test. If assembly logic drifts, this names the exact difference.
- *A test on the data itself*: loop `Object.entries(FONT)`, assert every glyph is exactly 5 rows of 3 characters — so a future font edit that leaves a row 4 wide fails immediately, naming the culprit character, instead of producing a subtly misaligned clock.
- *A shape property*: rendering `'23:59:00'` yields 5 rows, all equal width.
- *Loud failure*: `renderText('12:x0')` throws with the offending character in the message.

## 7. Words you learned (glossary)

- **ASCII art**: pictures drawn with plain text characters.
- **Terminal / console**: the text window where Node programs print.
- **`console.clear()`**: wipe the terminal — how the clock redraws in place.
- **`setInterval`**: run a function repeatedly, every N milliseconds.
- **`Date` / `new Date()`**: the current moment as an object; with arguments, a specific moment.
- **`padStart(2, '0')`**: pad a string to a length with a fill character — zero-padding in one call.
- **`\n`**: the newline character; lets one string hold many lines.
- **Ternary chain**: stacked `? :` expressions acting as an inline if/else-if ladder.
- **Glyph**: the visual picture of one character.
- **Font**: a mapping from characters to glyphs.
- **Data vs. logic**: storing a thing as a table/picture vs. computing it with branching code.
- **`map` / `join`**: transform each item / glue items into a string.
- **Pure function**: output depends only on parameters; no printing, no clocks, no globals.
- **Impure**: touching the outside world (time, terminal, timers, randomness, network).
- **Dependency**: anything code reaches out for instead of receiving.
- **Dependency injection**: passing dependencies in as parameters (the injectable clock).
- **Edge (of a program)**: the thin outer layer where impure things are allowed to live.
- **Pipeline**: a chain of representations with a transformation between each pair.
- **Seam**: a boundary between stages where a test can grab and inspect the value.
- **`Object.entries`**: an object's `[key, value]` pairs, for looping.

## 8. Experiments to try on the plane (no internet needed)

1. **Redesign a digit in 30 seconds**: in `font.js`, give '1' a base — change its last row to `'###'`. Run `node 23-ascii-clock/refactored/clock.js`. Expected: every 1 on the clock now has a foot. Then try to make the *same* change in original.js (find which branch of which row5 chain covers "1"...). Feel the difference; revert when done.
2. **Break the font, let the data test catch it**: make one row of '8' four characters wide (`'# # '`). Run `node --test 23-ascii-clock/`. Expected: the glyph-shape test fails with `"8" row "# # " is not 3 wide` — caught by name, before any clock ever renders crooked. Fix it.
3. **Render arbitrary text**: create a scratch file with `import { renderText } from './render.js';` and `console.log(renderText('01:23'))`, run it with node from the refactored folder. Then try `renderText('2026')`. Expected: big block text for any digit string — the renderer never knew it was part of a clock. Try `renderText('hi')` and watch it fail loudly.
4. **Build a countdown instead of a clock**: copy `clock.js` to `countdown.js`; keep a `let remaining = 90;` and each tick render `formatTime(new Date(0, 0, 0, 0, Math.floor(remaining / 60), remaining % 60))`, decrementing to zero. Expected: a working 01:30 countdown reusing both pure stages untouched — the payoff of a pipeline with clean seams.
5. **Add a blinking colon**: in `clock.js`, alternate each tick between rendering the time as-is and with the colons replaced by spaces (`.replaceAll(':', ' ')` — but wait, there's no space glyph!). Add `' ': ['   ','   ','   ','   ','   ']` to the font first. Expected: a blinking separator, and a small lesson — every new character is *one data entry*, never new logic.
