# 03 — ROT13

**Lesson: one clean function; kill magic numbers and duplicated branches.**

## Run it

```
node 03-rot13/original.js
node --test 03-rot13/
```

## What's wrong with the original?

It's correct! But look at what it costs to *read*:

1. **Magic numbers everywhere.** `65`, `90`, `97`, `122`, `13`, `26`. You need an ASCII
   table open to verify any of it. `'A'.charCodeAt(0)` says the same thing in a way a
   human can check at a glance, and `ALPHABET_SIZE`/`ROTATION` name the *concepts*.
2. **The upper- and lowercase branches are copy-paste twins.** Duplicated logic means
   every future change happens twice, and eventually someone changes only one copy.
   The refactor collapses both into one body by computing `base` first — the only thing
   that actually differs between the two cases.
3. **The wrap-around is an if.** `(offset + 13) % 26` *is* wrap-around, expressed as
   math instead of a patch-up branch. Modulo is the standard tool for "cycle back to
   the start"; you'll use it constantly (clocks, circular buffers, game boards).
4. **`result = result + ...` in a loop** works, but `text.replace(/[a-z]/gi, fn)` says
   the *intent* directly: "transform each letter, leave the rest." The regex handles
   "is this a letter?" so the code doesn't need range checks at all.

## What changed in the refactor

- Named constants replace magic numbers.
- One transformation body instead of two duplicated branches.
- `replace` with a callback replaces the manual loop + string building.
- A test locks in the neatest property ROT13 has: **it is its own inverse**.
  Property-style tests like "decode(encode(x)) === x" catch whole classes of bugs.

## What we did NOT do

We did *not* build `caesarShift(text, n)` with ROT13 as a special case, even though we
could feel it coming. You need exactly ROT13 today; generality you don't use yet is a
cost, not an investment. The next project is where the second use case shows up — and
*that's* when we generalize.
