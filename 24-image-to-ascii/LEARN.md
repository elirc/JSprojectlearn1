# 📘 Learning Guide: Image to ASCII

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A page that turns any photo into **ASCII art** — a picture made of text characters. You click the file chooser, pick an image from your computer, and the page prints something like:

```
::::----====++++****
::----==++**##%%@@@@
--==++**##%%@@@@@@@@
```

...except hundreds of characters wide and tall, forming a recognizable version of your photo. Dark areas become dense characters (`#`, `@`), bright areas become sparse ones (`.`, space). Squint, or lean back, and the photo appears.

The refactored version adds live controls: a **Width** number box (more columns = more detail) and a **Ramp** dropdown (which set of characters to use, from a chunky 5-character set to a fine 70-character one). Change either and the art re-renders instantly — no need to re-pick the file.

This is the capstone project: it touches files, images, canvas pixels, async code, and a math bug about human eyesight.

## 2. Concepts you need first

### How images are pixels, and pixels are numbers
A digital image is a grid of **pixels**, each storing four numbers 0–255: red, green, blue, and **alpha** (opacity). To convert an image to characters we need to read those numbers — and the browser's tool for that is the canvas.

### Canvas as an image-processing tool
So far the repo used `<canvas>` for drawing. It can also *ingest* images and hand you their pixels:

```js
const canvas = document.createElement("canvas"); // never added to the page!
canvas.width = 100; canvas.height = 50;
const ctx = canvas.getContext("2d");
ctx.drawImage(img, 0, 0, 100, 50);  // draw the image SCALED DOWN to 100x50
const { data } = ctx.getImageData(0, 0, 100, 50);
```

Two big ideas here. First, a canvas can be **offscreen** — created, used for math, never shown. Second, `drawImage` with a target size *resizes* the image, and the browser averages neighboring pixels while shrinking — so "downscale to 100×50" is also "summarize the image into 5,000 representative pixels." Free, high-quality sampling.

### The flat pixel array
`getImageData(...).data` is one long flat array: 4 numbers per pixel (r, g, b, a), row after row. Pixel at column x, row y starts at index:

```js
const i = (y * width + x) * 4;
const r = data[i], g = data[i + 1], b = data[i + 2]; // data[i+3] is alpha
```

That `(y * width + x)` formula — "skip y full rows, then x pixels" — is the standard way to treat a 1D array as a grid.

### Brightness, and why green counts more
To pick a character we need one number per pixel: how bright is it? The obvious formula, `(r + g + b) / 3`, is subtly wrong — because *human eyes* aren't equally sensitive to the three channels. We perceive green as much brighter than blue (roughly 6×). The standard formula (called the **Rec. 601 luminance** weights, from television engineering) is:

```js
const luminance = 0.299 * r + 0.587 * g + 0.114 * b; // green dominates
```

With flat averaging, a vivid green lawn (0, 200, 0) gets brightness 67 — rendered dark. Weighted, it gets 117 — matching how bright it *looks*.

### Character ramps
A **ramp** is a string of characters ordered from light to dark by how much ink they use: `" .:-=+*#%@"`. A space is "white," `@` is "black." Mapping brightness (0–1) to a ramp index is one line of arithmetic:

```js
const ramp = " .:-=+*#%@";
const index = Math.min(ramp.length - 1, Math.floor((1 - brightness) * ramp.length));
console.log(ramp[index]); // bright -> low index -> " " ; dark -> high -> "@"
```

`(1 - brightness)` flips it (bright means *less* ink), scaling by `ramp.length` spreads 0–1 across all characters, and `Math.min(... - 1, ...)` guards the edge case brightness = 0, which would otherwise index one past the end. Any ramp of any length works — no per-character thresholds.

### Why the height gets halved
Text characters are about twice as tall as they are wide. If you sample the image at its true aspect ratio, the ASCII art comes out stretched vertically. Fix: use half as many rows — that `* 0.5` you'll see in both versions.

### Monospace fonts and `<pre>`
ASCII art only lines up if every character has the same width — a **monospace** font. The `<pre>` element preserves spaces and line breaks and uses monospace by default; the CSS `font: 7px/7px monospace` makes the characters tiny so the whole picture fits.

### Files: `<input type="file">`, and turning a file into an image
`<input type="file">` opens the file picker; the chosen file is at `input.files[0]`, as a `File` object — raw bytes, not yet an image. Two steps make it drawable:

```js
const img = new Image();               // an <img> element, in memory
img.onload = () => { /* NOW it's ready to draw */ };
img.src = URL.createObjectURL(file);   // a temporary local URL for the file
```

Loading is **asynchronous** — the `src =` line returns immediately, and `onload` fires later. (The original uses an older route, `FileReader`, which reads the file into a giant text URL, adding a *second* callback layer.) `URL.revokeObjectURL(url)` releases the temporary URL when done — polite memory cleanup.

### Callbacks vs Promises vs `await` (recap from project 15)
A **callback** is a "call me when done" function (`img.onload = ...`). Nested callbacks stack into pyramids. A **Promise** wraps "a value that arrives later," and `await` (inside an `async` function) pauses until it arrives:

```js
function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);   // success -> hand out the image
    img.onerror = () => reject(new Error("bad file"));
    img.src = URL.createObjectURL(file);
  });
}
// elsewhere, in an async function:
const img = await loadImage(file);     // reads like a straight line
```

Wrapping a callback API in a Promise like this is called **promisifying**.

### Small DOM bits
`<input type="number">` — a number box; `.value` is a string, convert with `Number()`. `<select>` with `<option value="...">` — a dropdown; `.value` is the chosen option's value (here, the ramp string itself!). Both fire `oninput` when changed. `pre.textContent = s` displays the string safely.

## 3. Walking through the original code

Everything lives inside one `onchange` handler.

**Layer 1 and 2: the callback pyramid.**

```js
document.getElementById("file").onchange = function (e) {
  var reader = new FileReader();
  reader.onload = function (ev) {          // callback...
    var img = new Image();
    img.onload = function () {             // ...inside a callback
```

Read the file (callback one), then load it as an image (callback two). All the real work sits two indentation levels deep.

**Sampling.**

```js
canvas.width = 100;                  // output width: hardcoded
canvas.height = Math.floor(100 * img.height / img.width * 0.5);
ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
var data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
```

Offscreen canvas, 100 columns (a magic number buried mid-handler), height from the aspect ratio halved, downscale-draw, grab pixels.

**Brightness and mapping, fused.**

```js
var bright = (data[i] + data[i + 1] + data[i + 2]) / 3;
if (bright > 223) result += " ";
else if (bright > 191) result += ".";
else if (bright > 159) result += ":";
...
else result += "#";
```

The flat average (the image-quality bug), then eight hand-computed threshold branches — the numbers 223, 191, 159, 127, 95, 63, 31 are just 256 × 7/8, 6/8, 5/8... — one idea (divide brightness into 8 bands) written out as eight frozen constants.

**Output.** Append `"\n"` per row, set `innerText`. Done — and everything is welded together.

## 4. What's wrong with it (in beginner terms)

**1. One blob, two callbacks deep.** File reading, decoding, sampling, math, mapping, output — a single 40-line handler. Consequence story: you see a cool demo of ASCII *webcam* video and want to adapt this code. The conversion logic is exactly what you need... but it's fused to `FileReader` and the file input. There is no function you can call with "here's an image" — you'd have to copy-paste the middle of a handler and hope you cut at the right lines. Code you can't *call* is code you can't reuse.

**2. The knobs users want are the hardest to turn.** The two things everyone immediately wants to tweak — output width and character set — are, respectively, a magic `100` buried mid-handler, and eight interlocking threshold branches. Want to try a 70-character fine ramp? Recompute 69 boundaries by hand. The lesson: *when N hand-computed constants encode one idea, replace them with the formula that generated them* — then any N works.

**3. A real image-quality bug.** `(r+g+b)/3` under-brightens green. Feed it a forest photo: the trees render two or three ramp-steps too dark and detail drowns in `#`. It "works," it just looks subtly bad — and unless you know the eye-sensitivity fact, you'd blame your photo. The refactor's fix comes with a comment citing Rec. 601, because a bare `0.587` in code *must* say where it came from — otherwise the next person "simplifies" it back to an average.

**4. No live anything.** Change width? Edit source, reload, re-pick the file. The structure makes a "re-run with new settings" feature a rewrite, because there's no "re-run" — only "the file input fired."

## 5. Try it yourself first!

1. Vague: find the natural joints. What are the *stages* between "a File" and "text on screen"? Name them.
2. A good middle representation: a 2D array of brightness values 0–1. Write `sampleGrid(img, columns)` that returns one — canvas in, plain numbers out. It should know nothing about characters.
3. Write `luminance(r, g, b)` with the weights 0.299 / 0.587 / 0.114 (divide by 255 to get 0–1), and a comment saying what they are.
4. Write `asciify(grid, ramp)` — grid and ramp in, string out. Replace the eight thresholds with the arithmetic from section 2. It should know nothing about canvases.
5. Promisify loading: `loadImage(file)` returning a Promise that resolves with a ready `Image` (use `URL.createObjectURL`). Then the handler is two straight lines with `await`.
6. Now the live controls: keep the loaded image in a variable; write one `update()` that runs grid → ascii → screen from the *current* control values; point the width box and ramp dropdown's `oninput` at it. If steps 2–4 were clean, this costs two lines.

## 6. Understanding the refactored solution

**The pipeline and its data interface.**

```
image → sampleGrid → brightness[][] → asciify → string
```

The brightness grid in the middle is the **interface** — a plain 2D array of numbers 0–1. Everything left of it (`sampleGrid`) knows about canvases but not characters; everything right (`asciify`) knows characters but not canvases. That one design choice is what makes each half swappable: webcam frames in, or colored HTML out, without touching the other half.

**`sampleGrid(img, columns)`.** Computes rows from the aspect ratio (halved for character shape, with `Math.max(1, ...)` guarding absurdly wide inputs), draws the image shrunk onto an offscreen canvas — *letting the browser do the pixel averaging* — then walks the flat data with the `(y * columns + x) * 4` formula, pushing `luminance(...)` values into rows. Output: plain numbers. Note `columns` is a parameter now, not a buried 100.

**`luminance`** — three weighted channels over 255, with the comment explaining green's dominance and naming the standard. One function, one job, one citation.

**`asciify(grid, ramp)`.**

```js
const index = Math.min(ramp.length - 1, Math.floor((1 - brightness) * ramp.length));
```

The eight thresholds became one formula that works for *any* ramp length — the dropdown offers 10, 5, and 70-character ramps and none required computing a single boundary. Assembly is a two-level `map`/`join`: characters joined into rows, rows joined with `\n`. (Same row-assembly shape as project 23's font renderer — pipelines rhyme.)

**`loadImage` — the pyramid, flattened.** One Promise wraps image loading; `onload` resolves with the image (after politely `revokeObjectURL`-ing), `onerror` rejects with a named error. The file handler becomes:

```js
currentImage = await loadImage(file);
update();
```

Straight-line async — project 15's lesson applied to files. Note it also uses `createObjectURL` instead of the original's `FileReader`, cutting a whole callback layer.

**The wiring, and why features became free.** `currentImage` holds the last loaded image; `update()` re-runs the pipeline from current control values. Then:

```js
widthInput.oninput = update;
rampSelect.oninput = update;
```

Two lines. Live re-tuning wasn't "implemented" — it *fell out*, because the pipeline takes parameters and the image is kept. The README's point in one sentence: cheap features are the proof the structure is right. And the ramp `<select>` is a neat trick — each option's `value` *is* the ramp string, so the dropdown feeds `asciify` directly.

## 7. Words you learned (glossary)

- **ASCII art**: an image rendered as text characters of varying density.
- **Pixel**: one dot of an image; four numbers (r, g, b, alpha).
- **Alpha**: a pixel's opacity value.
- **Offscreen canvas**: a canvas created in memory for computation, never displayed.
- **`drawImage`**: draw (and optionally resize) an image onto a canvas.
- **Downscaling / sampling**: shrinking an image so each remaining pixel summarizes an area.
- **`getImageData` / flat pixel array**: canvas pixels as one long r,g,b,a,r,g,b,a... array.
- **`(y * width + x) * 4`**: the index formula for pixel (x, y) in a flat array.
- **Luminance**: perceived brightness; green weighs most, blue least.
- **Rec. 601**: the TV-era standard defining the 0.299/0.587/0.114 weights.
- **Ramp**: characters ordered light → dark; brightness maps to an index in it.
- **Threshold**: a hand-set boundary value (the thing the formula replaced).
- **Aspect ratio**: width-to-height proportion; halved rows compensate for tall characters.
- **Monospace / `<pre>`**: equal-width font / element that preserves spacing — both required for art to line up.
- **`File` / `<input type="file">`**: a chosen file's bytes / the picker control.
- **`URL.createObjectURL` / `revokeObjectURL`**: mint / release a temporary local URL for a file.
- **`FileReader`**: an older callback-based file reader (the original's extra layer).
- **Callback / Promise / `await`**: call-me-later function / a future value / pause until it arrives.
- **Promisify**: wrap a callback API so it returns a Promise.
- **Pipeline**: stages connected by plain-data handoffs.
- **Data interface**: the agreed in-between representation (here, `brightness[][]`).
- **`<select>` / `option value`**: dropdown control / the string it reports when chosen.

## 8. Experiments to try on the plane (no internet needed)

1. **See the luminance bug with your own eyes**: load the same colorful photo (anything with grass or foliage) into original.html and the refactored page at the same width. Expected: greens render noticeably darker/heavier in the original. Then, in the refactor, temporarily change `luminance` to `(r + g + b) / 3 / 255` — the difference appears on *your* screen; restore the weights after.
2. **Invert the art**: in `asciify`, change `(1 - brightness)` to `(brightness)`. Expected: a photographic negative — dark faces made of spaces on a field of `@`. One character changed, because the mapping is one formula, not eight branches.
3. **Write your own ramp**: add `<option value=" ░▒▓█">blocks</option>` to the select (those are shade characters — or use any characters you like, e.g. `" .sS$"`). Expected: it just works, whatever length — no thresholds to compute. Order them light-to-dark; get the order wrong and see the weird result to understand why order matters.
4. **Feel the width knob**: with a photo loaded, drag Width from 20 to 300. Expected: live re-render at every step, chunkier to finer — and note *nothing reloads the file*, because the image is kept and `update()` re-runs the pure pipeline. Then open original.html and count the steps to change its width once.
5. **Reuse the right half of the pipeline**: in the browser console (F12), run `document.getElementById('out').textContent = asciify([[0, 0.5, 1], [1, 0.5, 0]], ' .#')`. Expected: a tiny two-row pattern (`#. ` over ` .#`-ish) — proof that `asciify` needs no image, no canvas, no file. That is what "pure and reusable" means, and it's the property every project in this repo has been building toward.
