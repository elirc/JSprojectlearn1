# 📘 Learning Guide: Markdown Previewer

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A web page split into two halves. You type on the left, and the right half instantly shows a pretty, formatted version of what you typed.

The typing format is called **Markdown**: a way of writing plain text with little symbols that mean "make this fancy." For example, if you type this on the left:

```
# Shopping list

Buy *milk* and **bread**.
```

...the right side shows "Shopping list" as a big bold title, "milk" in italics, and "bread" in bold. No internet needed — it's one HTML file you open in a browser.

## 2. Concepts you need first

### HTML (the language of web pages)
HTML describes a page using **tags** — labels wrapped in angle brackets. `<b>hello</b>` means "show 'hello' in bold." Tags usually come in pairs: an opening tag `<b>` and a closing tag `</b>`. Some important tags in this project:
- `<h1>...</h1>` — a big heading (h2, h3... are smaller headings)
- `<p>...</p>` — a paragraph
- `<ul><li>item</li></ul>` — a bulleted list (`ul` = unordered list, `li` = list item)
- `<code>...</code>` and `<pre>...</pre>` — computer code shown in a typewriter font
- `<a href="somewhere">click me</a>` — a link. `href` is the address it goes to.

### The DOM and `innerHTML`
When a browser loads HTML, it builds a live structure in memory called the **DOM** (Document Object Model). JavaScript can change it. One way is `innerHTML` — you hand the browser a string and it treats it as real HTML:

```js
document.getElementById("preview").innerHTML = "<b>hi</b>";
// The element with id="preview" now shows: hi (in bold)
```

That "treats it as real HTML" part is powerful — and dangerous, as we'll see.

### Events — reacting to typing
The browser fires an **event** (a notification) when things happen. `input` fires every time text in a box changes:

```js
box.oninput = function () { console.log("you typed something!"); };
```

That's how the preview updates live as you type.

### Regular expressions (regex)
A **regular expression** is a pattern for finding text inside text. Written between slashes:

```js
"I have 3 cats".replace(/\d/, "9")   // → "I have 9 cats"
// \d means "any digit". replace swaps the first match for "9".
```

Symbols you'll see in this project: `^` = start of a line, `$` = end of a line, `.*` = "anything", `(...)` = remember this part (a **capture group**, referenced later as `$1`), and the flag `g` = replace *all* matches, not just the first. `[^`]+` means "one or more characters that are NOT a backtick."

### XSS (Cross-Site Scripting) — the villain of this project
**XSS** is an attack where someone types *code* into your app, and your app accidentally *runs* it. HTML can contain runnable JavaScript, for example:

```html
<img src=x onerror="alert('gotcha')">
```

That says: "show an image from address `x`; if it fails to load (`onerror`), run this JavaScript." The address `x` always fails — so the JavaScript always runs. If your previewer takes user text and puts it into `innerHTML` unchanged, anyone can make code run in the reader's browser. In a real app that shows *other people's* comments, an attacker could steal your login session.

### Escaping — the defense
**Escaping** means replacing dangerous characters with harmless look-alikes called **HTML entities**. `<` becomes `&lt;`, `>` becomes `&gt;`, `&` becomes `&amp;`, and quotes get similar treatment. The browser *displays* `&lt;b&gt;` as the text `<b>` — but never treats it as a tag:

```js
"<b>".replace(/</g, "&lt;").replace(/>/g, "&gt;")
// → "&lt;b&gt;" — shows as "<b>" on screen, but is NOT bold
```

### URL schemes, allowlists, and blocklists
The front of a web address (before the colon) is its **scheme**: `https:`, `mailto:`... There's also `javascript:` — a link that *runs code* when clicked. A **blocklist** says "reject the bad ones I know about" (and misses ones you didn't think of, like `vbscript:`). An **allowlist** says "accept ONLY these known-good ones." Allowlists win.

### Parsing in passes: blocks vs. inline
Real markdown tools work in two rounds. The **block pass** looks at whole lines and decides big structures: "this line is a heading, these three lines are a list." The **inline pass** then looks *inside* each block's text for small formatting: bold, italic, links. This gives the code **context** — a `#` in the middle of a sentence is not a heading, because the block pass only checks the *start* of lines.

## 3. Walking through the original code

The page has a `<textarea>` (a multi-line text box) on the left and an empty `<div id="preview">` on the right. All the action is in one function:

```js
function markdownToHtml(md) {
  var html = md;
```

It takes your raw text and starts doing find-and-replace on it. First, headings:

```js
html = html.replace(/^### (.*)$/gm, "<h3>$1</h3>");
html = html.replace(/^# (.*)$/gm, "<h1>$1</h1>");
```

"Find a line starting with `# `, wrap the rest of it (`$1` = the captured part) in a heading tag." The `m` flag makes `^` mean "start of each line," not just start of the whole text.

Then bold and italic:

```js
html = html.replace(/\*\*(.*?)\*\*/g, "<b>$1</b>");
html = html.replace(/\*(.*?)\*/g, "<i>$1</i>");
```

Bold **must** run first. If italic ran first, `**x**` would be seen as two `*x*`-style matches and come out mangled.

Then code spans, then links:

```js
html = html.replace(/`(.*?)`/g, "<code>$1</code>");
html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');
```

The link rule turns `[label](url)` into a real link — with **no check at all** on what the URL is.

Finally, every line break becomes `<br>` (a line-break tag), and the result goes straight into the page:

```js
document.getElementById("preview").innerHTML = markdownToHtml(src.value);
```

Notice what *never* happens: the user's text is never escaped. Whatever HTML you type goes into `innerHTML` alive.

## 4. What's wrong with it (in beginner terms)

**1. The XSS hole.** Type `<img src=x onerror="alert('xss')">` in the left pane and an alert pops up — your typed code *ran*. Story: you build a comment section this way. A stranger posts a "comment" containing that img tag, but instead of `alert` it sends every reader's login cookie to the stranger's server. Everyone who merely *looks* at the page gets their account stolen.

**2. The `javascript:` link hole.** `[click](javascript:alert(1))` becomes a real link that runs code when clicked. Escaping doesn't fix this one — the URL is a separate danger from the tags.

**3. No context.** The whole document is one string to these regexes. Write "prices went up 5% ## ouch" and... parts of your sentence turn into headings? Text inside backticks like `` `*args*` `` gets italicized even though code spans are supposed to be shown *literally* (exactly as typed).

**4. Fragile ordering ("folklore").** Bold-before-italic works, but the code doesn't say *why*. Six months later someone reorders the lines while adding a feature, `**hello**` renders as garbage, and nobody knows which line to blame.

**5. `<br>` instead of real blocks.** Because newlines just become line breaks, there are no real paragraphs, no lists, no code blocks. Every future feature fights this.

## 5. Try it yourself first!

Try fixing the original before peeking at the solution. Hints, vaguest first:

1. What's the *very first* thing you should do to the user's text, before any markdown rules touch it?
2. Escaping means replacing 5 characters: `& < > " '` with their entities (`&amp;` `&lt;` `&gt;` `&quot;` `&#39;`). Replace `&` first — why?
3. For headings: process the text line by line instead of all at once. A heading rule should only fire when `#` is the first character *of a line* the block pass is looking at.
4. For code spans: what if you pulled out everything in backticks *first*, replaced each with a numbered placeholder, ran bold/italic, then put the code back? What placeholder character can never appear in user text?
5. For links: write a function `isSafeUrl(url)` that returns true only for URLs starting with `https:`, `http:`, `mailto:`, `/`, `./`, or `#`. Refuse everything else.

## 6. Understanding the refactored solution

The refactor splits into `markdown.js` (the logic, testable) plus `index.html` (a copy of the logic wired to the page — copied because a page opened as a plain file can't `import` modules).

**Rule 0 — escape first.** The very first line of `markdownToHtml`:

```js
const lines = escapeHtml(source).split('\n');
```

Everything downstream works on *already-neutralized* text. Any `<` the user typed is now `&lt;`. So the only real tags in the final output are ones the code itself wrote (`<h1>`, `<strong>`...). XSS isn't "filtered out" — there is simply no path for user tags to survive. This is why the `innerHTML` in the page glue is safe.

**The block pass** is a loop over lines with a position counter `i`. Each turn it asks, in order: blank line? skip it. Line starts with ` ``` `? Collect lines until the closing fence into a `<pre><code>` block — *skipping the inline pass entirely*, so code stays literal. Line matches `^(#{1,6}) `? It's a heading — note this only checks the line's start, which is what fixes the "heading mid-sentence" bug. Line starts with `- `? Gather all consecutive `- ` lines into ONE `<ul>`. Otherwise: gather consecutive plain lines into one `<p>` paragraph.

**The inline pass** (`renderInline`) runs only on block text, in an order that's now *documented design*:

```js
let out = text.replace(/`([^`]+)`/g, (_, code) => {
  codeSpans.push(`<code>${code}</code>`);
  return NUL + (codeSpans.length - 1) + NUL;
});
```

Code spans are extracted FIRST and swapped for placeholders like `\0` + `0` + `\0`, where `\0` is the **NUL character** (character code zero) — a byte you can't type and escaping can't produce, so a placeholder can never be confused with real text (a plain "0" marker could be!). Then bold, then italic, then links — and finally the placeholders are swapped back, untouched by any formatting.

**Links use an allowlist:**

```js
export function isSafeUrl(url) {
  return /^(https?:|mailto:|\/|\.\/|#)/i.test(url);
}
```

If the URL doesn't start with a known-good scheme or a relative path, the whole `[label](url)` is left as literal text — no link at all. `javascript:` never gets a chance, and neither does any weird scheme nobody thought of.

**The tests** (`markdown.test.js`) use Node's built-in test runner. Each `test(...)` feeds a string in and `assert.equal` checks the exact output string. The first two tests are the *attacks*: the img-tag payload must come out as escaped text, and the `javascript:` link must not produce an `<a>` tag. Other tests pin down each behavior: headings only at line start, consecutive `- ` lines making one list, code spans protecting their contents, and one "kitchen sink" document exercising everything at once. If a future edit breaks any rule, a test fails immediately with the exact diff.

## 7. Words you learned (glossary)

- **Markdown** — plain-text formatting: `# heading`, `**bold**`, `*italic*`, `` `code` ``, `[link](url)`.
- **HTML** — the tag language browsers render (`<b>`, `<p>`, `<a>`...).
- **Tag** — an HTML label like `<h1>`; usually paired with a closing `</h1>`.
- **DOM** — the browser's live, in-memory model of the page that JavaScript can change.
- **`innerHTML`** — a property that parses a string as real, live HTML into the page.
- **Event** — a browser notification (like `input` = "the text changed").
- **Regular expression (regex)** — a text-matching pattern, e.g. `/^# (.*)$/`.
- **Capture group** — the `(...)` part of a regex; its match is reused as `$1`.
- **XSS (cross-site scripting)** — attack where user-supplied text runs as code in someone's browser.
- **Escaping** — converting `< > & " '` into harmless entities like `&lt;` so they display but never execute.
- **HTML entity** — the harmless code for a character, e.g. `&amp;` for `&`.
- **URL scheme** — the prefix of an address (`https:`, `mailto:`, `javascript:`).
- **Allowlist / blocklist** — accept only known-good vs. reject known-bad; allowlists are safer.
- **Block pass / inline pass** — parse big line-level structures first, then formatting inside them.
- **Placeholder** — a temporary stand-in swapped back in later (here, NUL-wrapped numbers).
- **NUL character** — character code 0; untypeable, so ideal for placeholders.
- **Pure function** — output depends only on input; no page or storage touched (string in → string out).
- **Unit test** — a small script asserting a function gives an exact expected output.

## 8. Experiments to try on the plane (no internet needed)

Everything here works offline — just open the HTML files in a browser and edit with any text editor.

1. **Run the attacks.** Open `original.html`, paste `<img src=x onerror="alert('xss')">` outside the indented area — alert pops. Do the same in `refactored/index.html` — it appears as harmless text. Try `[click](javascript:alert(1))` in both too.
2. **Break the escape, see the hole open.** In `refactored/index.html`, change `escapeHtml(source)` to just `source` and re-paste the img attack. Expected: the alert fires — you just reopened the XSS hole. Undo it!
3. **Add blockquote support.** In the block pass, before the paragraph case, handle lines starting with `> ` by wrapping `renderInline(line.slice(2))` in `<blockquote>...</blockquote>`. Expected: typing `> wise words` shows an indented quote.
4. **Prove the placeholder trick matters.** In `renderInline`, change the placeholder from `NUL + i + NUL` to just `String(i)`, then type: `` `x` 0 `` — expected: the literal `0` in your text gets replaced by the code span. That's the collision NUL prevents.
5. **Swap the inline order.** Move the italic replace above the bold replace and type `**hello**`. Expected: mangled output like `<em><em>hello</em></em>`-ish nesting — now you know *why* the order is explicit, and the test file would have caught it.
