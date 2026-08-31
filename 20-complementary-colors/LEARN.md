# 📘 Learning Guide: Complementary Colors

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them. (This project builds directly on project 19 — read `19-hsv-color/LEARN.md` first if you haven't.)

## 1. What are we building?

A **palette generator**: give it one color, get back colors that go well with it. Three classic recipes from design:

- **Complementary**: the color directly *opposite* on the color wheel. Red → cyan. High contrast; great for accents.
- **Triadic**: three colors evenly spaced around the wheel (120° apart). Red → red, green, blue.
- **Analogous**: the color's *neighbors* on the wheel (±30°). Calm, low-contrast palettes.

The original is a Node script: `node 20-complementary-colors/original.js` prints "complements" — some right-looking, some absurd (the complement of grey comes back as... grey). The refactor is a tiny library (`palette.js`) with tests, plus `demo.html`, a page with a color picker and live swatches: pick a base color, and all three palettes update as you drag.

## 2. Concepts you need first

### The color wheel and hue rotation (the design idea)
Recall from project 19: **HSV** describes a color as hue (an angle 0–360° around the color wheel), saturation (vividness 0–1), and value (brightness 0–1). Every palette recipe above is just *hue arithmetic*: keep s and v, add degrees to h.

- Complement = h + 180°
- Triadic = h, h + 120°, h + 240°
- Analogous = h − 30°, h, h + 30°

"Same color but opposite" means: same vividness, same brightness, opposite *hue*. Hold that definition — the original gets it wrong.

### Hex colors and string surgery
`#ff0000` is a **hex color**: two base-16 digits per channel (red=ff=255, green=00, blue=00). The original parses it by slicing the string:

```js
const hex = "#ff8000";
console.log(hex.substring(1, 3)); // "ff" — characters 1 up to 3
console.log(parseInt("ff", 16));  // 255 — read text as base-16
console.log((5).toString(16));    // "5" — oops, only one digit; needs padding to "05"
```

`parseInt(text, 16)` returns `NaN` ("not a number") if the text isn't hex — and `NaN.toString(16)` is the string `"NaN"`. That's where `"#NaNNaNNaN"` will come from.

### RGB inversion vs. hue rotation (the trap)
**Inverting** a color means `255 - channel` for each channel. It *sounds* like "opposite" and even works for pure red (`#ff0000` → `#00ffff`, cyan — correct!). But inversion flips *everything*, including brightness: dark colors become light, and middle grey (128,128,128) inverts to (127,127,127) — itself. Hue rotation flips only the hue. Two different questions; only one is what designers ask.

### Importing across projects
`import` can reach into another folder by relative path:

```js
import { hexToRgb } from '../../19-hsv-color/refactored/hsv.js';
```

`..` means "up one folder." Reusing a tested module this way means you inherit its behavior — including its validation and its edge-case fixes — without writing a line.

### Composing functions
**Composition** is feeding one function's output into the next. The whole refactor is one composition chain:

```js
hex → hexToRgb → rgbToHsv → (h + degrees) → hsvToRgb → rgbToHex
```

Each arrow is a tested project-19 function; this project only supplies the `+ degrees` in the middle.

### Default parameters
```js
function analogous(hex, spread = 30) { ... }
analogous("#ff0000");      // spread is 30
analogous("#ff0000", 15);  // spread is 15
```

If the caller omits the argument, the default fills in.

### DOM bits used by the demo
- `<input type="color">` is a built-in color picker; its `.value` is a hex string like `"#3366cc"`. Its `oninput` event fires continuously as you drag.
- `el.style.background = "#00ffff"` sets an element's background color from JavaScript.
- `Object.entries(obj)` turns an object into `[key, value]` pairs you can loop over:

```js
const menu = { small: 3, large: 5 };
for (const [name, price] of Object.entries(menu)) console.log(name, price);
// small 3, then large 5
```

### Tests (quick recap)
`node --test 20-complementary-colors/` runs `palette.test.js`. `assert.deepEqual(a, b)` compares arrays/objects by content; `assert.throws(fn, /pattern/)` passes only if fn throws an error whose message matches.

## 3. Walking through the original code

**The parsing (per channel).**

```js
var r = 255 - parseInt(hex.substring(1, 3), 16);
```

Slice two characters, read them as base-16, subtract from 255. That subtraction *is* the inversion — the whole "algorithm" in one operator.

**The padding dance.**

```js
var rs = r.toString(16);
if (rs.length == 1) rs = "0" + rs;
```

Convert back to hex text, and hand-pad single digits ("5" → "05") — three copies of this, one per channel. (Project 19's `rgbToHex` already does this with `padStart`, once.)

**The demo lines tell the story.**

```js
console.log(complement("#ff0000")); // #00ffff cyan — looks right!
console.log(complement("#808080")); // #7f7f7f — grey "complements" to grey
console.log(complement("red"));     // "#NaNNaNNaN"
```

Two convincing successes, then the trap springs: grey's "complement" is grey (useless for picking an accent color), and a non-hex input produces `#NaNNaNNaN` with no error.

## 4. What's wrong with it (in beginner terms)

**1. It answers the wrong question — convincingly.** RGB inversion happens to match hue rotation *for fully-saturated, fully-bright colors* like pure red and pure green. Those are exactly the colors you test with! So the function survives your eyeball check and ships. Then a designer feeds it their brand color, a muted dark red `#800000`, and gets back a *light* cyan `#7fffff` — brightness flipped — instead of the dark teal they wanted. And grey backgrounds get "accent colors" that are the same grey. The code is bug-free at doing the wrong thing. Lesson: before polishing code, check the *definition* it implements. A wrong definition passes every test you write against the wrong definition.

**2. It re-solved a solved problem.** Project 19 already has tested `hexToRgb` and `rgbToHex` — with validation and the padding handled. This file hand-rolls both again, and the rewrite has a bug the original doesn't: no input check, so `"red"` yields `"#NaNNaNNaN"` silently. Every time you rewrite something you already own, you re-roll the dice on bugs you'd already eliminated.

**3. Silence instead of errors.** `"#NaNNaNNaN"` gets assigned to some element's background, the browser ignores it, and a swatch just renders unstyled. Nobody is told. (Compare the refactor, where the same mistake throws `Not a hex color: "red"` immediately.)

## 5. Try it yourself first!

1. Vague: the right definition is "same saturation and brightness, opposite hue." What already-existing code turns hex into h/s/v and back?
2. Look at `19-hsv-color/refactored/hsv.js`. It exports `hexToRgb`, `rgbToHsv`, `hsvToRgb`, `rgbToHex`. Chain them.
3. Write ONE function `rotateHue(hex, degrees)` doing the full chain with `h + degrees` in the middle. Don't worry about h going over 360 or under 0 — check whether project 19 already handles that. (It does. Find the line.)
4. Now each palette is a one-liner returning an array: complement = `[hex, rotateHue(hex, 180)]`; triadic adds 120 and 240; analogous straddles with ±spread.
5. Tests to write: red's complement is cyan; rotating 180 twice gets you home (a round-trip!); a *dark* red complements to an equally *dark* cyan (this is the test inversion fails); and `"red"` throws — which should pass without you writing any validation at all.

## 6. Understanding the refactored solution

**`palette.js` — zero color math.** The file's own header says the point: it does NOT re-implement anything. One import line pulls in the four project-19 functions. Then:

```js
export function rotateHue(hex, degrees) {
  const { h, s, v } = rgbToHsv(hexToRgb(hex));
  return rgbToHex(hsvToRgb({ h: h + degrees, s, v }));
}
```

Unpack hue/saturation/value, add degrees to the hue *only*, repack. Note what's absent: no wrap-around handling. `h + 240` routinely exceeds 360, and `analogous` passes negative degrees — the very inputs that exploded project 19's *original*. They're safe because `hsvToRgb` runs every hue through `normalizeHue`. An edge case fixed in the foundation protects every floor built on top.

The three palettes are one-liners on `rotateHue` — `complementary`, `triadic`, `analogous(hex, spread = 30)` — each returning an array of hex strings, base color included, ready to display.

**The tests read like the design brief.**

- Red's complement is cyan — matching the one case inversion also got right.
- `rotateHue(rotateHue(c, 180), 180) === c` — a round-trip test (project 19's signature move, reused).
- The killer: `complementary('#800000')` must be `['#800000', '#008080']` — dark red pairs with *equally dark* teal. This is the test the original's inversion could never pass, encoding the correct definition as executable fact.
- `triadic('#ff0000')` is exactly red, green, blue — the wheel's three primaries, evenly spaced.
- And the free one: `complementary('red')` throws `/Not a hex color/`. No validation code exists in this project; the guarantee is *inherited* from `hexToRgb`. Reusing tested code buys you its promises, not just its features.

**`demo.html` — seeing it live.** The page has a native color picker and three empty rows. `render(baseHex)` loops `Object.entries(PALETTES)` — palette-name → function, the registry pattern again — and for each palette builds swatch `<div>`s: `swatch.style.background = color` paints them, `textContent` labels them with the hex. `input.oninput = () => render(input.value)` re-renders on every drag; the screen is a function of the picker (project 14's pattern in miniature).

One honest wart, documented in a comment: the demo *copies* the functions instead of importing, because browsers refuse `import` on pages opened straight from disk (`file://`). The tested truth stays in `palette.js`; the demo is a display copy. With a dev server or bundler, the copy would be deleted.

## 7. Words you learned (glossary)

- **Palette**: a small set of colors chosen to work together.
- **Complementary**: the hue 180° across the color wheel.
- **Triadic**: three hues 120° apart.
- **Analogous**: hues adjacent on the wheel (±30°-ish).
- **Hue rotation**: adding degrees to a color's hue while keeping saturation and value.
- **RGB inversion**: `255 - channel` per channel — flips brightness too; *not* the complement.
- **Hex color**: `#rrggbb`, two base-16 digits per channel.
- **`parseInt(text, 16)`**: read text as a base-16 number; `NaN` if it isn't one.
- **`NaN`**: "not a number," the silent result of failed number parsing/math.
- **Relative import**: `import ... from '../../other/file.js'` — reuse code from another folder.
- **Composition**: chaining functions so one's output is the next's input.
- **Default parameter**: `spread = 30` — the value used when the caller omits it.
- **Round-trip test**: apply an operation and its inverse; assert you're back where you started.
- **Inherited guarantee**: a behavior (like validation) you get by reusing code that already has it.
- **`Object.entries`**: an object's `[key, value]` pairs, loopable.
- **`<input type="color">`**: the browser's built-in color picker; `.value` is a hex string.
- **`oninput`**: an event firing continuously as a control's value changes.
- **`file://` page / dev server**: a page opened from disk (imports blocked) / a small local server that lifts that restriction.

## 8. Experiments to try on the plane (no internet needed)

1. **See the wrong definition with your own eyes**: open `refactored/demo.html`, pick a middle grey. Expected: the complementary swatch is the same grey — and that's *correct* under the true definition (grey has no hue to rotate; its complement is itself, and the right design answer is "greys don't have accent complements"). Now compute the original's answer: `node 20-complementary-colors/original.js` — nearly-identical grey too, but for the wrong reason. Then pick a dark red in the demo: the complement stays *dark*. Inversion would have made it light.
2. **Add a fourth palette — "split-complementary"** (base, plus the two colors flanking the complement at ±30°): in `demo.html`, add one line to `PALETTES`: `split: (hex) => [hex, rotateHue(hex, 150), rotateHue(hex, 210)],` and one `<h3>`/`<div class="row" id="split">` pair in the HTML. Expected: a fourth live row appears; the render loop needed zero changes because palettes are entries in a table.
3. **Prove the free validation**: in `palette.test.js`'s style, run a quick script that calls `complementary('#12345')` (five digits). Expected: it throws `Not a hex color` — a message written in project 19, doing its job one project later.
4. **Break the foundation, watch both projects fail**: in `19-hsv-color/refactored/hsv.js`, temporarily change `normalizeHue` to just `return hue;`, then run `node --test 20-complementary-colors/`. Expected: project 20's triadic/analogous tests fail even though you edited project 19 — layered code means downstream tests guard upstream edits. Restore it and re-run.
5. **Tune analogous**: in the demo, change `rotateHue(hex, -30), hex, rotateHue(hex, 30)` to ±15 and then ±60. Expected: ±15 gives near-twins (very calm), ±60 drifts toward triadic (more contrast). You're feeling *why* designers call 30° "analogous."
