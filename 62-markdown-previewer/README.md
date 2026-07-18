# 62 — Markdown previewer

**Lesson: write the parser yourself — block pass, inline pass, and
escape-by-default so XSS is structurally impossible, not filtered.**

## Run it

Open both HTML files and paste `<img src=x onerror="alert('xss')">` into
each editor. One executes it. Then:

```
node --test 62-markdown-previewer/
```

## What's wrong with the original?

"Markdown is easy — it's just find and replace":

1. **The security hole.** Input is never escaped and output goes to
   `innerHTML`, so any HTML the user types *executes*. A previewer that
   renders other people's comments this way is a cookie-stealing machine.
2. **The second security hole**: link URLs aren't vetted —
   `[click](javascript:alert(1))` becomes a live `javascript:` link.
3. **Whole-document regex replaces have no context**: `#` mid-sentence
   becomes a heading, markdown inside backticks gets formatted anyway.
4. **Rule order is load-bearing folklore** — bold must precede italic and
   nobody remembers why, so nobody dares touch it.
5. **`<br>` instead of blocks** — paragraphs, lists, and code blocks can't
   exist.

## What changed in the refactor

- **RULE 0: escape everything first.** All `< > & " '` are neutralized in
  one place before any parsing, so the only tags in the output are tags we
  generated. XSS isn't caught by a filter that might miss a case — it has
  no path in. `innerHTML` in the glue becomes safe *because of* the parser.
- **Two passes, like a real renderer** (and like project 49's
  tokenize→parse): a **block pass** walks lines and groups them into
  paragraphs / headings / lists / fenced code, then an **inline pass** runs
  only inside block text. Headings only match at line start; fenced code
  skips the inline pass entirely.
- **Inline order is explicit design, commented**: code spans are extracted
  to placeholders first (so backtick contents are never formatted — the
  placeholder is NUL-delimited, a byte that can't occur in escaped text),
  bold before italic, links last with **allowlisted URL schemes**
  (`https?`, `mailto:`, relative). Blocklists miss schemes nobody thought
  of; allowlists don't.
- **The parser is a pure string→string function** with unit tests for both
  attacks and a kitchen-sink document — testable in Node, reusable
  anywhere, embedded in the previewer as a verbatim copy.

## Key takeaway

Any time user text becomes markup, you're writing a compiler whose output
runs in the reader's browser — so parse it like a compiler (context-aware
passes), and make safety the *first* transformation rather than a cleanup
you hope runs last. "Escape, then generate" turns XSS from an endless
game of filter-evasion into a non-event.
