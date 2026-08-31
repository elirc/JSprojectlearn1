# 📘 Learning Guide: Template Engine

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A **template engine**: a function that takes text with placeholders and fills in real data.

```js
render('<p>Hi {{name}}! Bye {{name}}!</p>', { name: 'Ada' })
// <p>Hi Ada! Bye Ada!</p>

render('{{user.name}} ({{user.org.city}})', { user: { name: 'Ada', org: { city: 'London' } } })
// Ada (London)

render('<p>Hi {{name}}!</p>', { name: '<img src=x onerror="alert(1)">' })
// <p>Hi &lt;img src=x onerror=&quot;alert(1)&quot;&gt;!</p>   <- attack neutralized!
```

Running `node original.js` shows the naive version: it fills only the first `{{name}}`, can't do `{{user.name}}`, mangles data containing `$`, and — worst — lets a malicious "name" smuggle live code into the HTML.

## 2. Concepts you need first

### HTML in one minute

**HTML** is the markup language of web pages: `<p>text</p>` is a paragraph, `<img src=... >` an image. Browsers *execute* some of it — an attribute like `onerror="..."` contains JavaScript that runs. So HTML is not just text: inserting strings into it is inserting into a live language.

### Templates and placeholders

A **template** is text with holes: `"Hi {{name}}!"`. The `{{name}}` part is a **placeholder** in "mustache" style (the braces look like little mustaches). **Rendering** means replacing each placeholder with data.

### `replace` — string patterns vs regex, and the `/g` flag

`str.replace(pattern, replacement)` has a famous gotcha: with a *string* pattern, only the FIRST occurrence is replaced:

```js
console.log("a-a-a".replace("a", "X"));   // "X-a-a"  — just one!
console.log("a-a-a".replace(/a/g, "X"));  // "X-X-X"  — regex with /g: all
```

A **regular expression** (regex) is a text pattern written between slashes; the `g` flag means "global" — every match.

### Regex, the pieces this project uses

```js
/\{\{\s*([\w.]+)\s*\}\}/g
```

Decoder ring:
- `\{` — a literal `{` (braces are special in regex, so they're escaped with `\`).
- `\s*` — any amount of whitespace (`\s` = space/tab/newline, `*` = zero or more).
- `[\w.]+` — one or more "word characters" (`\w` = letters, digits, underscore) or dots. That matches `name` and `user.org.city`.
- `(...)` — a **capture group**: remember whatever matched inside, and hand it to us separately.

So the whole pattern reads: `{{`, optional spaces, a path (captured), optional spaces, `}}`.

### `replace` with a callback function

The replacement can be a *function* instead of a string. It gets called once per match, receiving the full match and each capture group:

```js
const out = "Hi {{name}}".replace(/\{\{(\w+)\}\}/g, (match, key) => {
  return key.toUpperCase();
});
console.log(out); // Hi NAME
```

Two superpowers: you can run any logic per match, and — crucially — the returned string is inserted *literally*. With a replacement *string*, `$` sequences are magic: `"$&"` means "the whole match", `"$1"` the first group. User data containing `$` triggers those accidentally. A callback opts out of that whole substitution language.

```js
console.log("price".replace("price", "$& tag")); // "price tag" — $& expanded!
console.log("price".replace("price", () => "$& tag")); // "$& tag" — literal
```

### XSS — cross-site scripting

**XSS** is the attack where user-supplied text is inserted into a page as live HTML. If a user sets their "name" to `<img src=x onerror="alert('stolen cookies')">`, then any page that renders their name verbatim executes their JavaScript **in every other visitor's browser** — stealing sessions, faking forms. It has topped web-vulnerability lists for decades because the buggy line looks completely innocent: `result = template.replace(key, data[key])`.

### Escaping HTML

**Escaping** converts characters with special meaning into their harmless display forms, called **HTML entities**: `<` becomes `&lt;`, `&` becomes `&amp;`, `"` becomes `&quot;`. The browser then *shows* `<img ...>` as text instead of executing it. Five characters can break text out of HTML: `& < > " '`.

Order trap: escape `&` first! If you escape `<` → `&lt;` and *then* escape `&`, the `&` inside `&lt;` becomes `&amp;lt;` — double-escaped garbage.

```js
console.log(escapeHtml('<a & b>')); // &lt;a &amp; b&gt;
```

### Safe by default

The design principle that separates toys from real systems: the *easy* syntax (`{{x}}`) must be the *safe* one (escaped). Dangerous behavior (raw HTML) requires visible opt-in (`{{{x}}}`). Humans forget; defaults don't. Mustache, JSX, and Django templates all work this way.

### `split`, `reduce`, and optional chaining (`?.`)

The nested lookup is three idioms in one line:

```js
const path = "user.org.city";
console.log(path.split("."));  // ["user", "org", "city"]
```

`reduce` walks that list, drilling one level deeper each step: start at `data`, then `data["user"]`, then `...["org"]`, then `...["city"]`.

`value?.[key]` is **optional chaining**: like `value[key]`, but if `value` is `null`/`undefined` it just yields `undefined` instead of crashing:

```js
const obj = { a: {} };
console.log(obj.a.b?.c);  // undefined — no crash
// console.log(obj.a.b.c); // would throw: Cannot read properties of undefined
```

### `??` and `String()`

`x ?? ''` — use `''` when `x` is `null`/`undefined` (so missing data renders as nothing, not the word "undefined"). `String(value)` converts anything (numbers, booleans) to a string before escaping.

## 3. Walking through the original code

The whole engine:

```js
function render(template, data) {
  var result = template;
  for (var key in data) {
    result = result.replace("{{" + key + "}}", data[key]);
  }
  return result;
}
```

For each key in the data object, build the placeholder string (`"{{name}}"`) and replace it with the value. `for...in` loops over an object's keys. Looks completely reasonable — and contains all four bugs.

**Bug 1** — first-occurrence-only:

```js
// <p>Hi Ada! Your score: 97. Bye {{name}}!</p>
```

`replace` with a string pattern replaced the first `{{name}}` and stopped. The farewell still says `{{name}}`.

**Bug 2** — no nesting: `{{user.name}}` is looked up as the literal key `"user.name"` in the data object. `for...in` iterates `["user"]`, builds `"{{user}}"`, finds nothing to replace. The placeholder survives untouched.

**Bug 3** — the injection:

```js
var comment = { name: '<img src=x onerror="alert(\'stolen cookies\')">' };
console.log(render("<p>Hi {{name}}!</p>", comment));
// <p>Hi <img src=x onerror="alert('stolen cookies')">!</p>
```

The hostile name lands in the HTML verbatim. In a browser, that `onerror` attribute *runs*. This exact line of code, written innocently, is where most XSS in the world comes from.

**Bug 4** — `$` magic:

```js
console.log(render("<p>{{amount}}</p>", { amount: "$& deal" }));
// prints "{{amount}} deal". What?
```

In a replacement string, `$&` expands to the matched text — which was `{{amount}}` itself. User data accidentally speaking the substitution language corrupts output in ways nobody can reproduce until they notice the `$`.

## 4. What's wrong with it (in beginner terms)

**Only the first placeholder fills.** Story: your email template says "Hi {{name}}" at the top and "Thanks, {{name}}" at the bottom. Every customer gets an email signed "Thanks, {{name}}". It passed review because the *test* template used each placeholder once.

**No nested data.** Real data is shaped like `{ user: { name, org: { city } } }`. Without path support, you must flatten everything into `{ user_name, user_org_city }` before rendering — busywork that grows with every template.

**The `$` corruption.** A user whose comment is "Great $& deal!" files a bug: their comment displays with random template junk in it. You can't reproduce it (your test data has no `$`). Days later someone remembers `replace`'s substitution rules. The fix — a replacement *function* — is one character class away, but you had to know.

**XSS gets you hacked.** The full story: an attacker sets their display name to an `<img onerror=...>` payload. Your app renders a "recent visitors" page for *other users*. Each visit executes the attacker's JavaScript in the victim's logged-in session — it can read their cookies, send requests as them, rewrite the page into a fake login form. One innocent-looking render line, total account compromise. This is why escaping cannot be a thing you remember to do at each call site — one missed spot is a vulnerability, so the *default* must do it.

## 5. Try it yourself first!

Try building the fixed engine before reading on. Hints, vague → specific:

1. Bug 1 needs a different kind of `replace` pattern. Which kind replaces *all* matches?
2. Write a regex for `{{...}}`: escaped braces, optional whitespace, and a capture group for the path — `[\w.]+` allows dots for nesting.
3. Use a replacement *function*, `(match, path) => ...`. That kills the `$` bug for free and gives you a place to put logic.
4. For nesting: split the captured path on `.`, then walk into the data one key at a time. `reduce` plus `?.` makes it one line — and survives missing middles.
5. Missing value? Render `''`, not `"undefined"` — `?? ''`.
6. Escaping: write `escapeHtml(value)` replacing `& < > " '` with their entities. Which one MUST go first, and why?
7. Design the API: `{{x}}` escapes always; add `{{{x}}}` for deliberate raw HTML. Which replacement has to run first so the other can't half-eat it?

## 6. Understanding the refactored solution

**The escaper:**

```js
export function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;') // & first, or it double-escapes the others
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
```

The five break-out characters, neutralized. `replaceAll` is the modern "replace every occurrence with a string pattern" method. The order dependency (`&` first) gets its own comment — order-as-correctness deserves one. There's a test aimed at exactly this: `'<a & b>'` → `'&lt;a &amp; b&gt;'`, no `&amp;lt;` garbage.

**The lookup:**

```js
export function lookup(data, path) {
  return path.split('.').reduce((value, key) => value?.[key], data);
}
```

`'user.org.city'` → `['user','org','city']` → drill down step by step starting from `data`. The `?.` means a missing middle (`{a: {}}` asked for `a.b.c`) yields `undefined` instead of a crash.

**The engine:**

```js
export function render(template, data) {
  return template
    // Triple-brace first, so double-brace can't half-match it.
    .replace(/\{\{\{\s*([\w.]+)\s*\}\}\}/g,
      (_, path) => String(lookup(data, path) ?? ''))
    .replace(/\{\{\s*([\w.]+)\s*\}\}/g,
      (_, path) => escapeHtml(lookup(data, path) ?? ''));
}
```

Read the design decisions:
- **Two passes, order matters.** If double-brace ran first, it would match the inner `{{widget}}` of `{{{widget}}}` and leave stray braces. Triple first — and the comment says so.
- **`/g` + capture group + callback** — the workhorse combo: every occurrence (bug 1), the path handed to the callback (bug 2 via `lookup`), no `$` magic (bug 4).
- **`(_, path)`** — naming the unused first parameter `_` is a convention for "I must accept this but don't need it" (it's the full match).
- **Escaped by default, raw by loud opt-in** (bug 3). At a code review, `{{{widget}}}` visibly *announces* "raw HTML here, on purpose" — the decision is at the call site, not buried in the engine.

**The tests**: every occurrence replaced; nested paths; missing values render `''` (both totally absent and broken-chain); **THE BIG ONE** — a live payload goes in, the test asserts `<img` does NOT appear in the output and the escaped form does; triple-brace inserts trusted HTML raw; `'$& deal'` comes out as `'$&amp; deal'` (literal `$`, escaped `&`); whitespace inside braces tolerated (`{{  name  }}`); the `&`-first rule; and `lookup` tested standalone — small parts are independently testable.

## 7. Words you learned (glossary)

- **Template / placeholder / render**: text with holes / a hole like `{{name}}` / filling the holes with data.
- **Mustache style**: the `{{ }}` placeholder convention.
- **HTML**: the markup language browsers render — and partly *execute*.
- **Regular expression (regex)**: a text-matching pattern, e.g. `/\{\{(\w+)\}\}/g`.
- **`/g` flag**: "global" — match every occurrence, not just the first.
- **Capture group `( )`**: a remembered part of the match, passed to your callback.
- **`\s` / `\w` / `*` / `+`**: whitespace / word character / zero-or-more / one-or-more.
- **Replacement string `$` magic**: `$&`, `$1` etc. expand specially in string replacements.
- **Replace callback**: a function run per match; its return value is inserted literally.
- **XSS (cross-site scripting)**: user text executing as code in other users' browsers.
- **Injection**: any attack where data is interpreted as code.
- **Escaping**: converting special characters to harmless display forms.
- **HTML entity**: the display form, like `&lt;` for `<` or `&amp;` for `&`.
- **Safe by default**: the easy syntax is the safe one; danger requires visible opt-in.
- **`replaceAll`**: replace every occurrence of a plain string.
- **Optional chaining (`?.`)**: property access that yields `undefined` instead of crashing on `null`/`undefined`.
- **`??`**: fallback only for `null`/`undefined`.
- **`for...in`**: loop over an object's keys (used by the original).
- **`_` parameter**: naming convention for "required but unused".

## 8. Experiments to try on the plane (no internet needed)

1. **See `$&` with your own eyes.** Scratch file: `console.log("abc".replace(/b/, "[$&]"), "abc".replace(/b/, () => "[$&]"));` Expected: `a[b]c a[$&]c` — string replacement expands the magic, callback inserts literally.
2. **Swap the two passes, watch order matter.** In `refactored/template.js`, move the double-brace `.replace(...)` above the triple-brace one and run `node --test 35-template-engine/`. Expected: the triple-braces test fails — output like `<div>{&lt;b&gt;bold&lt;/b&gt;}</div>` with stray braces, because `{{...}}` half-ate `{{{...}}}`.
3. **Break the `&`-first rule.** Move the `&` line to the *end* of `escapeHtml`'s chain and rerun the tests. Expected: the "escapes & first" test fails with `&amp;lt;` double-escaping — and THE BIG ONE fails too, since its expected string contains properly single-escaped entities.
4. **Try to smuggle a payload past the default.** Add a test with `render('{{x}}', { x: '"><script>alert(1)</script>' })` and assert the output contains neither `<script` nor a raw `"`. Expected: passes — quotes and angle brackets all neutralized. Then render the same data through `{{{x}}}` and see it pass through raw: that's why triple-brace is for *trusted* content only.
5. **Add a formatter feature.** Extend the double-brace callback: if the looked-up value is a number, render it with `value.toFixed(2)` before escaping. Test: `render('{{price}}', { price: 3 })` → `'3.00'`. Expected: a few lines in one place — logic lives comfortably in a callback, which is exactly why callbacks beat replacement strings.
