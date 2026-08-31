# 📘 Learning Guide: HSV Color

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A **color converter**. Computers describe a screen color as RGB — how much **r**ed, **g**reen, and **b**lue light to mix, each 0–255. Humans find another system friendlier: HSV.

- **Hue (h)**: *which* color, as an angle 0–360° around a color wheel. 0° = red, 120° = green, 240° = blue, and 360° wraps back to red.
- **Saturation (s)**: how *vivid*, from 0 (grey) to 1 (full color).
- **Value (v)**: how *bright*, from 0 (black) to 1 (full brightness).

"Slightly darker but same color" is easy in HSV (lower v a bit) and awkward in RGB. But screens want RGB — so we need conversion functions between the two.

Run the flawed original:

```
node 19-hsv-color/original.js
```

It prints correct RGB triples for red, green, and blue... and then `[NaN, NaN, NaN]` for hue 360 — a "not a number" explosion for a perfectly reasonable input. The refactored version is a small color library (`hsv.js`) converting both directions plus hex helpers, with a test suite you run via `node --test 19-hsv-color/`.

## 2. Concepts you need first

### RGB, and why 0–255
Each color channel is one byte: an integer 0–255. `{r: 255, g: 0, b: 0}` is pure red; `{r: 128, g: 128, b: 128}` is medium grey (equal channels = grey). Math formulas prefer 0–1, so code often divides by 255 ("normalize"), computes, then multiplies by 255 and rounds at the end.

### `NaN` — the poison value
`NaN` ("Not a Number") is what numeric math produces when something went wrong, e.g. `undefined * 255`. It silently infects everything it touches:

```js
let x;               // undefined — never assigned
console.log(x * 255); // NaN
console.log(NaN + 1); // NaN — it spreads
```

If a variable *might* not get assigned (say, none of your if-branches matched), any later math turns to NaN.

### The remainder operator and negative angles
`%` gives the remainder after division — great for wrapping values around a circle. But JavaScript's `%` keeps the sign of the left number:

```js
console.log(365 % 360); // 5     — fine
console.log(-30 % 360); // -30   — NOT 330!
```

The fix is the **double-modulo idiom**:

```js
const wrap = (angle) => ((angle % 360) + 360) % 360;
console.log(wrap(-30)); // 330
console.log(wrap(360)); // 0
```

Memorize that shape — it appears anywhere angles or cycles appear.

### Objects vs positional arrays
Two ways to return three numbers:

```js
return [255, 0, 128];              // positional: what is [1] again?
return { r: 255, g: 0, b: 128 };   // named: color.g reads itself
```

With arrays, the *reader* must remember the order; swap two and nothing complains. With objects, the names travel with the values. **Destructuring** unpacks them neatly, even in a parameter list:

```js
function hsvToRgb({ h, s, v }) { ... } // caller passes {h: 0, s: 1, v: 1}
```

### A table instead of six if-branches
When several branches differ only in *which value goes where*, you can store the arrangements as data and pick one by index:

```js
const arrangements = [[1, 2, 0], [2, 1, 0], [0, 1, 2]];
const [a, b, c] = arrangements[2]; // a=0, b=1, c=2
```

One lookup, no copy-pasted assignment blocks. This is the heart of the refactor.

### `Math` tools used here
```js
Math.floor(2.7);        // 2 — round down
Math.round(2.5);        // 3 — nearest integer
Math.abs(-4);           // 4 — drop the sign
Math.max(1, 7, 3);      // 7
Math.min(1, 7, 3);      // 1
```

### Hex colors, `toString(16)`, and bits
Web colors are often written in **hexadecimal** (base 16, digits 0–9 then a–f): `#ff0080` means r=ff (255), g=00 (0), b=80 (128).

```js
(255).toString(16);          // "ff" — number to hex text
parseInt("ff", 16);          // 255 — hex text to number
"5".padStart(2, "0");        // "05" — pad to two characters
```

The decoder also uses **bit shifts**: a six-digit hex number packs three bytes together; `(value >> 16) & 255` slides the top byte down and masks off the rest — that's the red channel. You don't need to master bits today; read it as "unpack byte 3, byte 2, byte 1."

### Regular expressions for validation
`/^#?([0-9a-f]{6})$/i` means: optional `#`, then exactly six hex digits, and nothing else (`^`/`$` anchor the ends; `i` ignores case). `.exec(text)` returns the match (with the captured digits) or `null` — so a malformed color can be rejected with a thrown error instead of garbage.

### Round-trip (inverse) testing
When two functions undo each other — encode/decode, toX/fromX — the strongest cheap test is: convert there and back, compare with the start.

```js
test('round trip', () => {
  const c = { r: 10, g: 200, b: 33 };
  assert.deepEqual(hsvToRgb(rgbToHsv(c)), c); // (± rounding)
});
```

Run that over *many* inputs and it catches transposed channels, wrong sectors, sign slips — nearly anything. `assert.deepEqual` compares objects by contents; `assert.ok(cond, msg)` fails with msg unless cond is true.

## 3. Walking through the original code

The file opens with an honest confession: "Adapted from a half-remembered formula and tweaked until the reds looked red."

**Setup math.**

```js
var i = Math.floor(h / 60);
var f = h / 60 - i;
var p = v * (1 - s);
var q = v * (1 - f * s);
var t = v * (1 - (1 - f) * s);
```

The color wheel is split into six 60° sectors; `i` is which sector the hue is in, `f` is how far into it (0–1). `p`, `q`, `t` are three helper brightness levels — but their names tell you nothing. This is the "half-remembered formula" part.

**The six branches.**

```js
if (i == 0) { r = v; g = t; b = p; }
if (i == 1) { r = q; g = v; b = p; }
if (i == 2) { r = p; g = v; b = t; }
...
```

Each sector assigns the three helper values to r, g, b in a different shuffle. Note `r`, `g`, `b` were declared but *not initialized* — they only get values if some branch matches.

**The demo lines.** Red, green, blue convert correctly. Then:

```js
console.log(hsvToRgb(360, 1, 1)); // i == 6, NO branch matches -> [NaN, NaN, NaN]
console.log(hsvToRgb(-30, 1, 1)); // negative hue -> NaN again
```

`Math.floor(360/60)` is 6. No `if (i == 6)`. So r, g, b stay `undefined`, and `Math.round(undefined * 255)` is `NaN`. Same for any negative hue.

## 4. What's wrong with it (in beginner terms)

**1. Legal inputs explode.** Hue 360 *is* red — the same angle as 0, just written differently. And negative hues arise naturally: "the opposite color" is `h - 180`, which for h = 30 gives -150. Story: you build a color-picker wheel. A user drags all the way around; your code computes h = 360; the swatch turns... nothing — NaN becomes an invalid color and the element goes transparent-black. Works in every demo, fails for the user who dragged one pixel further. Boundary inputs (0, 360, negatives) are exactly the ones "tweaked until it looked right" development never tries.

**2. Six shuffled copies, unreviewable.** Look at branches 2 and 3 — can you *see* whether `{ r = p; g = q; b = v; }` is right? Neither can a code reviewer. One transposed letter would make one sixth of the color wheel subtly wrong — greens a touch too yellow, say — and no one would notice for months, because "the reds look red" still passes. Bugs you cannot see by reading need either structure that prevents them or tests that catch them. The original has neither.

**3. No way to check itself.** There's no `rgbToHsv`, so you can't even ask the code "if I convert there and back, do I get my color again?" The entire verification story is a human squinting at four console lines.

## 5. Try it yourself first!

1. Vague: two separate problems — hues outside 0–360, and six error-prone branches. Tackle them one at a time.
2. Write `normalizeHue(hue)` that maps *any* number into `[0, 360)`. Test in your head: 360 → 0, -30 → 330, 725 → 5. (Section 2's double-modulo idiom is the tool.) Call it first thing in the converter.
3. For the branches: write out what each branch assigns as a triple, e.g. sector 0 is `[v, t, p]`. Stack the six triples in an array and index it with the sector number. Six ifs become one lookup.
4. Rename as you go: what are `p`, `q`, `t`, `f` *for*? The standard names: `chroma` (color intensity, `v*s`), `x` (the ramp within a sector), `m` (the lift added to all channels). Understandable names make the table's pattern visible.
5. Now write the inverse, `rgbToHsv`: hue from which channel is largest, saturation from the spread between max and min, value = max. Return `{h, s, v}` objects, not arrays.
6. The finale: a double-loop test over a grid of RGB colors asserting `hsvToRgb(rgbToHsv(c))` comes back within ±1 per channel (rounding costs a little). If that passes for 200+ colors, your converters are almost certainly right.

## 6. Understanding the refactored solution

**Shapes documented once.** The file header pins down the contract: hsv is `{h, s, v}` (h any number — it will be normalized), rgb is `{r, g, b}` 0–255. Every function speaks in these named shapes; `color.h` documents itself where `result[0]` never did.

**`normalizeHue`** is the one-line class-of-bugs fix:

```js
return ((hue % 360) + 360) % 360;
```

360 → 0, -30 → 330, 725 → 5. Every hue that enters `hsvToRgb` passes through it, so *no* hue can reach the sector logic out of range — the NaN family of bugs is gone at the door, not patched at each window.

**Named intermediates from the real geometry.** `chroma = v * s` (how much pure color), `hPrime = hue / 60` (position measured in sectors), `x` (chroma scaled by how far into the sector — the "ramp"), `m = v - chroma` (grey light added to all three channels to reach the target brightness). The comments explain the geometry, not the syntax.

**The branch table.**

```js
const sector = Math.floor(hPrime) % 6;
const [r1, g1, b1] = [
  [chroma, x, 0], // 0: red -> yellow
  [x, chroma, 0], // 1: yellow -> green
  [0, chroma, x], // 2: green -> cyan
  ...
][sector];
```

The six cases became six *rows of data*. Now the pattern is visible at a glance: `chroma` and `x` rotate through the channels as you walk around the wheel, with 0 filling the gap. A transposed entry would break the visual rotation — reviewable in a way six assignment blocks never were. And each row is labeled with what part of the wheel it covers.

**`rgbToHsv` — the missing inverse.** Normalize channels to 0–1; the largest is `v`; the spread `delta = max - min` drives saturation (`delta / max`, guarding grey and black); hue depends on *which* channel is the max, computed by the standard three-case formula, then normalized. Note `delta === 0` (grey) makes hue meaningless — the code picks 0 and says so in a comment.

**Hex helpers.** `rgbToHex` formats each channel as two hex digits (`toString(16)` + `padStart`). `hexToRgb` validates with the regex — bad input *throws* with a clear message — then unpacks the three bytes with shifts and masks. These make the file a small reusable library; project 20 imports it.

**The tests.** Four exact-value tests pin the primaries, the exact hues the original exploded on (360 must equal pure red; -30 must equal 330), greys, and `normalizeHue` itself. Then the star:

```js
for (let r = 0; r <= 255; r += 51)
  for (let g = 0; g <= 255; g += 51)
    for (let b = 0; b <= 255; b += 51) {
      const back = hsvToRgb(rgbToHsv({ r, g, b }));
      // assert each channel within ±1
```

Steps of 51 give 6 values per channel → 6×6×6 = 216 colors spread across the whole RGB cube. The tolerance of ±1 is honest: rounding to whole 0–255 integers can lose a hair of precision, and the test *encodes* that reality instead of pretending. Finally the hex helpers get their own mini round-trip, including "`#` is optional" and "5 digits throws."

## 7. Words you learned (glossary)

- **RGB**: color as red/green/blue light amounts, each 0–255.
- **HSV**: color as hue (angle), saturation (vividness 0–1), value (brightness 0–1).
- **Hue / color wheel**: colors arranged in a 360° circle; 0 and 360 are the same red.
- **Channel**: one of the three color components (r, g, or b).
- **Chroma**: the amount of pure color in the mix (`v * s`).
- **Sector**: one of the six 60° slices of the color wheel.
- **Normalize**: scale or wrap a value into a standard range.
- **`NaN`**: "not a number" — the result of broken math; infects later calculations.
- **`undefined`**: the value of a variable never assigned.
- **Double-modulo idiom**: `((n % m) + m) % m` — wraps even negatives into `[0, m)`.
- **Positional array**: values identified by order (`[255,0,128]`) instead of names.
- **Destructuring**: unpacking `{h, s, v}` into variables, even in a parameter list.
- **Lookup table**: data (an array/object) indexed instead of branched over.
- **Hexadecimal (hex)**: base-16 numbers, digits 0–9 and a–f; `#ff0080` is a hex color.
- **Bit shift / mask (`>>`, `&`)**: slide bits down / keep only certain bits — used to unpack bytes.
- **Regular expression**: a text pattern; here validating "six hex digits."
- **Inverse functions**: a pair where each undoes the other.
- **Round-trip test**: convert there and back, assert you got your input again.
- **Tolerance (±1)**: the wiggle room a test allows for rounding.
- **`assert.deepEqual`**: compare objects/arrays by contents in a test.

## 8. Experiments to try on the plane (no internet needed)

1. **Feel the round-trip net catch a bug**: in `hsv.js`, swap two entries in one table row — change `[x, chroma, 0]` to `[chroma, x, 0]` — and run `node --test 19-hsv-color/`. Expected: the round-trip test fails with dozens of specific colors named. The primaries test may *pass* (that row doesn't cover the primaries) — proof that example tests alone miss what the grid catches. Undo the swap.
2. **Trace by hand, then verify**: compute `hsvToRgb({h: 90, s: 1, v: 1})` on paper — hue 90 is sector 1, hPrime = 1.5, so x = chroma × (1 − |1.5 % 2 − 1|) = 1 × 0.5. Row 1 gives [0.5, 1, 0] → expected `{r: 128, g: 255, b: 0}` (a yellow-green). Check with a one-line node script that imports and logs it.
3. **Add a "rotate hue" helper**: in `hsv.js`, add `export const rotate = ({h, s, v}, degrees) => ({ h: normalizeHue(h + degrees), s, v });` and test that rotating red by −180 and by +180 give the same cyan. Expected: passes — precisely because `normalizeHue` exists. This function is basically project 20's core.
4. **Tighten the tolerance**: change the round-trip test's `<= 1` to `=== back[channel] - original ? ...` — actually, just change `<= 1` to `<= 0` and run. Expected: a few of the 216 colors fail by exactly 1. That's the rounding loss the tolerance was honestly encoding. Restore it.
5. **Extend the hex parser**: make `hexToRgb` also accept 3-digit shorthand like `#f08` (each digit doubles: `ff0088`). Write the test rows first — `hexToRgb('#f08')` deep-equals `{r: 255, g: 0, b: 136}` — then implement until green. Expected: your first taste of test-driven development on a real parser.
