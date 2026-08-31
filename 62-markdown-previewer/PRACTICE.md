# 🏋️ Practice: Markdown Previewer

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

Exercises 2–5 extend `refactored/markdown.js` (keep a backup, or revert when done); write your asserts in a scratch `practice.test.js` next to it and run `node --test 62-markdown-previewer/refactored/practice.test.js`. After each change, run the *existing* tests too — they must stay green.

## Exercises

### ⭐ 1. The unclosed fence (warm-up)
What happens when a document opens a ``` fence and never closes it? Trace the fence loop in `markdownToHtml` by hand, predict the output for `'```\ncode without closing'`, then write a test. Expected: no crash, no infinite loop — the rest of the document becomes the code block: `<pre><code>code without closing</code></pre>`.
What it practices: reading loop bounds carefully — `i < lines.length` is doing quiet safety work.
Hint: the inner `while` has two exit conditions; which one fires here, and what does the `i++` after it do at the end of input?

### ⭐⭐ 2. Horizontal rules (core)
Add support for a line that is exactly `---` (after trimming): it becomes `<hr>`. Add the case to the block pass *and* stop the paragraph collector from swallowing a `---` line that directly follows text. Expected behavior, as asserts:

```js
assert.equal(markdownToHtml('above\n\n---\n\nbelow'), '<p>above</p>\n<hr>\n<p>below</p>');
assert.equal(markdownToHtml('above\n---\nbelow'), '<p>above</p>\n<hr>\n<p>below</p>');
assert.equal(markdownToHtml('a --- b'), '<p>a --- b</p>'); // mid-line stays literal
```

What it practices: the block pass owns line context — new block types are new cases, plus one guard.
Hint: `line.trim() === '---'` for the case; add the matching condition to the paragraph `while`'s guard list.

### ⭐⭐ 3. Ordered lists (core)
Add `1. item` support: consecutive lines matching `number-dot-space` form ONE `<ol>`, with inline formatting inside items. Expected behavior, as asserts:

```js
assert.equal(markdownToHtml('1. one\n2. two\n3. three'),
  '<ol><li>one</li><li>two</li><li>three</li></ol>');
assert.equal(markdownToHtml('1. **bold** step'), '<ol><li><strong>bold</strong> step</li></ol>');
assert.equal(markdownToHtml('no 1. list here'), '<p>no 1. list here</p>'); // line start only!
```

What it practices: cloning an existing block case (`- ` lists) and adapting its regex — the pattern behind every new block type.
Hint: `/^\d+\. /` to detect, `.replace(/^\d+\. /, '')` to strip; don't forget the paragraph guard, same as exercise 2.

### ⭐⭐ 4. Strikethrough (core)
Add `~~text~~` → `<del>text</del>` to the *inline* pass. Expected: `renderInline('~~old~~ new')` → `<del>old</del> new`; inside backticks it stays literal: `renderInline('`~~x~~`')` → `<code>~~x~~</code>`; and it works inside list items: `'- ~~done~~ item'` → `<ul><li><del>done</del> item</li></ul>`.
What it practices: slotting a new rule into an ordered pipeline without breaking the placeholder trick.
Hint: one `replace` with `/~~([^~]+)~~/g`, placed anywhere after the code-span extraction and before the placeholders are restored.

### ⭐⭐⭐ 5. Images — and why order is everything (challenge)
Add `![alt](url)` → `<img src="url" alt="alt">`, reusing `isSafeUrl` so `![x](javascript:alert(1))` stays literal text. The catch: `![alt](url)` *contains* `[alt](url)`, so if the link rule runs first it produces `!<a href="url">alt</a>` — prove that to yourself before fixing it. Expected: `renderInline('![cat](https://pics.test/cat.png)')` → `<img src="https://pics.test/cat.png" alt="cat">`, and `'see ![logo](/img/logo.png) and [home](/index)'` renders one image and one link.
What it practices: explicit, commented rule ordering — the README's "order is design, not folklore" lesson, extended by you.
Hint: the image regex is the link regex with a leading `!` and `[^\]]*` (empty alt is legal); insert it *above* the link replace, with a comment saying why.

### ⭐⭐⭐ 6. A table of contents that respects fences (challenge)
Write a new pure function `tocFromMarkdown(source)` returning an array of `{ level, text }` for every heading — but headings inside ``` fences must NOT count (they're code). Expected: for a doc containing `# Title`, then a fence holding `# not a heading, just code`, then `## Section A` and `### Sub`, the result is `[{level:1,text:'Title'},{level:2,text:'Section A'},{level:3,text:'Sub'}]`; the empty string gives `[]`.
What it practices: block context as *state while scanning lines* — the same insight that makes the block pass correct, reapplied in a fresh function.
Hint: one boolean `inFence`, flipped on every line starting with ``` — skip lines while it's true.

## Solutions

### 1. Unclosed fence test
```js
test('an unclosed fence swallows the rest of the doc, safely', () => {
  assert.equal(markdownToHtml('```\ncode without closing'),
    '<pre><code>code without closing</code></pre>');
});
```
WHY: The inner `while` stops on `i < lines.length` when no closing fence exists, so the collector exits at end-of-input; the `i++` "past the closing fence" then just pushes `i` beyond the array, which the outer loop's own bound absorbs harmlessly. Malformed input degrading gracefully instead of crashing or looping is a boundary property worth pinning with a test.

### 2. Horizontal rules
```js
// in the block pass, before the heading case:
if (line.trim() === '---') {
  blocks.push('<hr>');
  i++;
  continue;
}
// and in the paragraph collector's while-condition, add:
      lines[i].trim() !== '---'
```
WHY: Block types are decided by line shape at line start — exactly how headings, lists, and fences already work. The paragraph guard matters because the collector greedily eats "plain" lines; without the guard, `above\n---\nbelow` would absorb the `---` into the paragraph. Every block case you add needs its matching paragraph guard — a rule this exercise makes you feel.

### 3. Ordered lists
```js
// in the block pass, next to the "- " list case:
if (line.match(/^\d+\. /)) {
  const items = [];
  while (i < lines.length && lines[i].match(/^\d+\. /)) {
    items.push(`<li>${renderInline(lines[i].replace(/^\d+\. /, ''))}</li>`);
    i++;
  }
  blocks.push(`<ol>${items.join('')}</ol>`);
  continue;
}
// paragraph guard, add:  !lines[i].match(/^\d+\. /)
```
WHY: This is the `- ` list case with a different detector and stripper — grouping consecutive matching lines into one block, running the inline pass per item. `^` anchoring keeps `no 1. list here` a paragraph: the block pass owns line context, which is precisely what the original's whole-document regexes lacked.

### 4. Strikethrough
```js
// in renderInline, after the italic replace:
out = out.replace(/~~([^~]+)~~/g, '<del>$1</del>');
```
WHY: Because code spans were already extracted to NUL placeholders, ` `` `-protected text can never be struck through — you get that safety for free by inserting *after* the extraction. Unlike bold/italic, `~~` shares no characters with other rules, so its exact slot is flexible; saying so in a comment is what "order as explicit design" means.

### 5. Images
```js
// in renderInline, ABOVE the link replace — ![alt](url) contains
// [alt](url), so links would eat it and leave a stray "!":
out = out.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (whole, alt, url) =>
  isSafeUrl(url) ? `<img src="${url}" alt="${alt}">` : whole);
```
WHY: This is a containment conflict, the same shape as bold-before-italic (`**` contains `*`): the more specific pattern must run first. Reusing `isSafeUrl` keeps ONE allowlist deciding which schemes may become live URLs — `javascript:` images are refused by the same tested gate as links, instead of a second, subtly different check. (Verified under Node, including the mangled `!<a ...>` output you get when the order is wrong.)

### 6. `tocFromMarkdown`
```js
export function tocFromMarkdown(source) {
  const toc = [];
  let inFence = false;
  for (const line of source.split('\n')) {
    if (line.startsWith('```')) { inFence = !inFence; continue; }
    if (inFence) continue;
    const m = line.match(/^(#{1,6}) (.*)$/);
    if (m) toc.push({ level: m[1].length, text: m[2] });
  }
  return toc;
}
```
WHY: A naive whole-document regex would list `# not a heading, just code` — the original's context-blindness all over again. One boolean of scanner state gives every line a context (in code / in prose), which is the block pass's core idea distilled to its smallest form. And since the function is pure string→data, it tests in Node with one `deepEqual`. (Verified by running it under Node.)

---

Final check for exercises 2–5: run the project's own suite again — `node --test 62-markdown-previewer/refactored/` — every pre-existing test (both XSS attacks, the kitchen sink) must still pass. Extending a parser without breaking its security tests is the whole game.
