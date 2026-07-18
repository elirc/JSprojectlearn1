# 34 — CSV parser

**Lesson: why `split()` can't parse — parsing needs *memory* — and how a one-boolean
state machine handles real-world data.**

## Run it

```
node 34-csv-parser/original.js
node --test 34-csv-parser/
```

## What's wrong with the original?

`split("\n")` then `split(",")` works on the CSV you type into a test string, and
fails on the CSV a spreadsheet actually exports:

1. **Quoted fields with commas** — `"simple, but no simpler"` gets shredded at the
   comma. This is the *entire reason quoting exists*, and split can't respect it,
   because whether a comma separates fields **depends on whether you're inside
   quotes** — and `split` has no memory of where it is.
2. **Escaped quotes** (`""` meaning one literal `"`) — shredded worse.
3. **Windows line endings.** Every Excel export ends lines with `\r\n`; splitting on
   `\n` leaves a stowaway `\r` on the last field of every row, *and* a trailing
   newline mints a phantom `['']` row. These two are the classic "parser works on my
   machine, chokes on the customer's file" bugs.

## What changed in the refactor

- **A character-by-character loop with one boolean of state: `inQuotes`.** That
  boolean is the memory `split` lacks. Inside quotes, `,` and `\n` are just text;
  outside, they end fields and rows. The quirky `""` escape is a one-line
  look-ahead. This is a **state machine** in its smallest useful form — the same
  shape as project 15's phases, applied to text. Every real parser (JSON, HTML,
  your language's compiler) is this loop grown up.
- **`endField`/`endRow` helpers** name the two events and guarantee field and row
  buffers reset together — the kind of paired bookkeeping that goes wrong when
  inlined twice.
- **`\r\n` handled as one ending** where line endings are decided, not patched
  later with `.trim()` scattered around the callers.
- **`csvToObjects`** builds on `parseCsv` — headers to keys via
  `Object.fromEntries`, short rows padded with `''` (a decision, tested). Parse
  first, *shape* second: two functions, two jobs (project 12's build/use split).
- The test file is a bestiary of real exports: quoted commas, `""`, embedded
  newlines, CRLF, trailing newline, empty fields. Each was a production incident
  for somebody once.

## Key takeaway

The moment a format has *context* — "this character means something different
depending on where we are" — `split` and regex one-liners are over, and you write
the loop-with-state. It's less code than you fear (this one is ~35 lines), and it's
the same pattern from here to compilers. Project 49 scales it up to expressions.
