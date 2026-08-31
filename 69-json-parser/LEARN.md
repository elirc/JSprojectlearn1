# 📘 Learning Guide: JSON Parser from Scratch

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A function `parseJson(text)` that takes a **string** of JSON — like `'{"port": 8080}'` — and turns it into a real JavaScript value — like the object `{ port: 8080 }`. JavaScript already ships one (`JSON.parse`), and we're building our own to learn *how parsers work*, because reading structured text is the first step of every compiler, interpreter, and config loader.

```js
parseJson('{"name": "config", "port": 8080}');
// -> { name: 'config', port: 8080 }

parseJson('{"broken": }');
// -> throws: Expected a value but found "}" at line 1, column 12
```

The original file does this job in one line — in the most dangerous way possible, and the demo prints `<-- ARBITRARY CODE RAN` to prove it.

## 2. Concepts you need first

**JSON.** JavaScript Object Notation — a small, strict text format for data. It allows exactly: objects `{"key": value}`, arrays `[1, 2]`, strings in **double** quotes, numbers, `true`, `false`, `null`. That's it. No comments, no single quotes, no trailing commas (`[1, 2,]` is illegal), no `undefined`. The strictness is the point: every tool in every language agrees on what JSON means.

**Parsing.** Turning flat text into structured data. The text `"[1,2]"` is just six characters; parsing recognizes "that's an array holding 1 and 2."

**eval and why it's feared.** `eval("code")` runs a string *as JavaScript code*. `new Function("return x")()` is the same thing wearing a hat:

```js
new Function("return 1 + 1")();          // 2 — it EXECUTED the string
new Function("return (console.log('hi'), 5)")();  // prints "hi", returns 5!
```

That second line matters: in JavaScript, `(a, b)` is the **comma operator** — it evaluates `a`, throws the result away, and returns `b`. So an attacker can smuggle *any* code into what looks like "just a value". If you parse untrusted text with eval, whoever wrote the text can run code on your machine. That's called **arbitrary code execution** — the worst kind of security bug.

**Token / tokenizer (also called a lexer).** Stage one of a parser. It chops the character stream into meaningful pieces called *tokens*, like a spellchecker splits a sentence into words:

```js
tokenize('{ "a": 12 }');
// [ {type:'lbrace', pos:0}, {type:'string', value:'a', pos:2},
//   {type:'colon', pos:5}, {type:'number', value:12, pos:7},
//   {type:'rbrace', pos:10}, {type:'eof', pos:11} ]
```

Each token remembers its `pos` — the index of the character where it started. `eof` means *end of file/input* — a fake final token so the parser can say "I expected the end and didn't get it."

**Grammar.** The rulebook of a format, written as "a THING is made of...". JSON's core rule: *a value is a string, a number, true/false/null, an object, or an array; an object is `{` then key:value pairs then `}`; an array is `[` then values then `]`*. Notice the loop: objects and arrays *contain values*, and a value *can be* an object or array. The grammar refers to itself — it's **recursive**.

**Recursion.** A function calling itself. Perfect for nested things:

```js
function depth(x) { return Array.isArray(x) ? 1 + depth(x[0]) : 0; }
depth([[[42]]]);  // 3 — each call peels one layer
```

**Recursive descent.** The parsing style where you write one function per grammar rule (`parseValue`, `parseObject`, `parseArray`) and they call each other exactly the way the rules refer to each other. Nested input is handled by nested calls — you never write "nesting code" at all.

**Escape sequences.** Inside a JSON string, `\n` means newline, `\"` a quote, `\\` a backslash, and `A` means "the character with code 41 hex" (that's `A`). The tokenizer must translate these; the two characters `\` `n` in the file become one newline character in the value.

**Exceptions / throw.** `throw new Error("msg")` stops the function and hands an error object up to whoever wrote `try { ... } catch (e) { ... }`. You can **subclass** an error type to make your own kind (`class JsonError extends SyntaxError`), letting callers check `err instanceof JsonError` and read extra fields like `err.line`.

**Regular expressions (regex).** Compact patterns for matching text. Used sparingly here:

```js
/^-?(0|[1-9]\d*)(\.\d+)?/.exec("12.5x");  // matches "12.5"
```

Read it as: optional minus (`-?`), then either a lone `0` or a nonzero digit followed by digits (this is how the JSON spec bans `01`), then an optional `.digits` part. `exec` returns the match or `null`.

## 3. Walking through the original code

The whole "parser":

```js
export function parseJson(text) {
  return new Function("return (" + text + ")")();
}
```

It glues your text into the body of a brand-new function — literally building the source code `return (<your text>)` — then **calls it**. Since JSON syntax happens to also be valid JavaScript syntax, the value falls out. It "works". It is also `eval`.

The demo lines show the three consequences:

```js
console.log(parseJson('{"name": "config", "port": 8080}')); // fine...
```

Legit input parses fine — which is exactly why this bug survives code review.

```js
console.log(parseJson("{'singles': 'accepted', trailing: 'comma',}"));
```

Single quotes, an unquoted key, a trailing comma — all illegal JSON, all accepted, because JavaScript's own syntax is looser than JSON's.

```js
console.log(parseJson('{"x": (console.log("  <-- ARBITRARY CODE RAN"), 42)}'));
```

The payload: `(console.log(...), 42)` uses the comma operator, so parsing this "config file" *runs* `console.log` — or anything else an attacker chooses — and quietly leaves `42` as the value.

```js
try { parseJson('{"broken": }'); } catch (e) {
  console.log("error quality:", e.message); // which byte? no idea.
}
```

Broken input produces the JavaScript engine's complaint about the *generated code* — something like "Unexpected token )" — with no line, no column, no filename that means anything to the user.

## 4. What's wrong with it (in beginner terms)

**Flaw 1 — it executes the input.** Story: your app reads `theme.json` files that users share with each other. Someone posts a "cool dark theme" online; buried in it is a payload like the demo's. Everyone who *opens* it runs the attacker's code — which can read their files, or send their saved passwords somewhere. Parsing should be **reading**, like your eyes scanning a page. This version is more like following any instruction written on the page. (The README notes this is genuinely how JSON was handled before 2009; `JSON.parse` exists because it went badly.)

**Flaw 2 — it accepts non-JSON.** Story: for months your team writes configs with comments and trailing commas — your parser doesn't mind. Then you add a Python service, or deploy a tool that uses real `JSON.parse`. Every config file explodes at once. By being "friendly", your parser silently created a private dialect that only it speaks. For data formats, *too permissive* is a real bug, same as *too strict*.

**Flaw 3 — useless errors.** Story: a 400-line config has one missing value on line 287. The error says `Unexpected token )` — referring to a `)` **you never typed** (it's from the generated `return (...)` wrapper!). You binary-search the file by deleting halves. A parser that tracks positions would have said: line 287, column 12, expected a value.

## 5. Try it yourself first!

1. **Vague:** Replace the one-liner with code that *reads characters* and *builds values* — never feeding the text to the JavaScript engine.
2. **Structure:** Do it in two stages. First a `tokenize(text)` that outputs an array of tokens (`{type, value, pos}`); then a parser that consumes tokens. Debugging each half alone is far easier.
3. **Tokenizer plan:** Loop over characters with an index `i`. Skip whitespace. One-character punctuation (`{ } [ ] : ,`) is its own token type. `"` starts a string — keep consuming until the closing quote, translating escapes. A digit or `-` starts a number. The letters `t`, `f`, `n` should start `true`/`false`/`null`. Anything else: throw, with the position.
4. **Parser plan:** Keep an index into the token array with `peek()` (look, don't consume) and `next()` (consume). Write `parseValue` as a switch on the peeked token's type; `parseObject` and `parseArray` loop over comma-separated members and call `parseValue` for each — that recursion IS the nesting support.
5. **The details that separate a toy from a parser:** reject trailing commas (after a comma, *require* another key/value); after the top-level value, *require* the `eof` token so `{"a":1} junk` fails; convert `pos` to line/column when throwing (count `\n`s in `text.slice(0, pos)`).
6. **Test idea:** Take a big messy object, run it through the built-in `JSON.stringify`, and check your parser's output equals `JSON.parse`'s. The spec becomes your referee.

## 6. Understanding the refactored solution

**`JsonError`** (top of `json.js`) subclasses `SyntaxError`. Its constructor receives the raw byte `pos` and computes human coordinates: the line number is how many `\n`-separated pieces exist before `pos`; the column is the distance from the last `\n`. Every throw site in the file passes a position, so *every* error comes out as "…at line L, column C".

**Stage 1 — `tokenize`.** A single `while` loop over the characters. Two lookup tables keep it flat: `PUNCT` maps `{`→`lbrace` etc., and `ESCAPES` maps `n`→newline etc. The string branch does the real work: on `\u` it demands exactly four hex digits; a raw control character (like a literal tab inside quotes) is rejected because the spec says so. The number regex encodes the grammar precisely — `(0|[1-9]\d*)` is why `01` errors. Every token carries `pos`, and a final `{type:'eof'}` is appended. This stage knows *nothing* about objects or arrays — only "words".

**Stage 2 — recursive descent.** Three tiny helpers: `peek`, `next`, and `expect(type, what)` — which consumes a token and throws a `JsonError` naming both what was **expected** and what was **found** if it's wrong. That one helper is where good error messages come from. Then one function per grammar rule:

```js
function parseValue() {
  const token = peek();
  switch (token.type) {
    case 'string': case 'number': case 'literal': return next().value;
    case 'lbrace': return parseObject();
    case 'lbracket': return parseArray();
    default: throw new JsonError(`Expected a value but found ...`);
  }
}
```

`parseObject` consumes `{`, handles the empty `{}` case, then loops: expect a string key, expect `:`, call `parseValue()` (recursion — the value might be a whole object), then either a comma (loop again — and since the loop *starts* by requiring a key, `{"a":1,}` fails naturally) or `}`. `parseArray` is the same shape without keys. Finally `parseJson` calls `parseValue()` once and then `expect('eof')` — refusing trailing junk.

Notice what this design *can't* do: there is no path anywhere from input text to execution. Code inside a string is just characters getting appended to `value`. Safety isn't a check that was added — it's a property of the structure.

**The tests** (`json.test.js`) map to the three flaws. The **security proof**: it plants a global function `__pwn`, parses a string containing `__pwn(), 42` (stays a string, `pwned` stays false), and asserts the original's exact payload shape is now a *syntax error*. The **strictness suite**: a list of nine not-quite-JSON inputs the original accepted, each asserted to throw. The **error test**: a four-line broken config must produce `err.line === 4` and a message matching "Expected a value". And the **round-trip property test**: a gnarly document must parse to exactly what the built-in `JSON.parse` says — the spec is the referee, not our intuition.

## 7. Words you learned (glossary)

- **JSON** — a strict, universal text format for data.
- **Parsing** — turning flat text into structured values.
- **eval / `new Function`** — running a string as code; never for untrusted input.
- **Comma operator** — `(a, b)` evaluates both, yields `b`; a code-smuggling classic.
- **Arbitrary code execution** — a bug letting input authors run their own code on your machine.
- **Token** — one meaningful chunk of input (`{`, a string, a number), with its position.
- **Tokenizer / lexer** — stage 1: characters → tokens.
- **`eof`** — the made-up "end of input" token.
- **Grammar** — the rules describing what a format's pieces are made of.
- **Recursion** — a function calling itself; how nesting is handled.
- **Recursive descent** — one parsing function per grammar rule, calling each other like the rules do.
- **Escape sequence** — `\n`, `\"`, `\uXXXX` — codes inside strings standing for characters.
- **Exception / throw / catch** — stopping with an error object that callers can trap.
- **Subclass** — a custom error type (`JsonError`) carrying extra fields like `line`.
- **Regular expression (regex)** — a text-matching pattern like `/^-?(0|[1-9]\d*)/`.
- **Control character** — invisible characters below space (tab, newline); banned raw inside JSON strings.
- **Round-trip / property test** — testing a general rule ("always equals `JSON.parse`") instead of single examples.
- **Permissive parser** — one that accepts more than the spec, silently forking the format.

## 8. Experiments to try on the plane (no internet needed)

Everything is plain `node` on local files — fully offline. Do edits on copies, or undo them after, so the originals stay intact.

1. **Run the exploit.** `node 69-json-parser/original.js` — watch `ARBITRARY CODE RAN` print from "parsing a config". Then try the same payload against the refactored parser and watch it throw a `JsonError` at an exact column instead.
2. **Become the attacker.** Craft your own payload for the original: make it "return" a normal-looking config **and** create a global variable as a side effect (e.g. `{"x": (globalThis.hacked = true, 1)}`). Expected: parse succeeds, and `globalThis.hacked` is `true` afterward — data reads should never do that.
3. **Add JSON5-style comments (on a copy of `json.js`).** In `tokenize`, when you see `/` followed by `/`, skip characters until `\n`, then `continue`. Expected: `{"a": 1} // hi` now parses — and the strictness test in `json.test.js` fails, correctly telling you you've forked the format.
4. **Improve an error.** Make `JsonError` also include a caret line: the offending source line, then spaces and a `^` under the bad column. Expected: errors like a real compiler's. (Hint: `text.split('\n')[line - 1]` and `' '.repeat(col - 1) + '^'`.)
5. **Find the missing feature.** `\u` escapes handle 4 hex digits, but characters like emoji need *two* escapes (a "surrogate pair" — two `\uXXXX` codes that combine into one character). Test `parseJson('"\\ud83d\\ude00"')` and compare with `JSON.parse` on the same input. Expected: they agree (both produce 😀) — `String.fromCharCode` on each half happens to combine correctly. Understanding *why* is a rabbit hole worth a plane ride.
