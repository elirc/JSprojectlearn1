# 13 — Text encryption/decryption suite

**Lesson: interfaces. When every cipher has the same *shape*, the rest of the program
stops caring which ciphers exist.**

(These are classical puzzle ciphers for learning — for real secrets, use the Web
Crypto API / `node:crypto`, never hand-rolled ciphers.)

## Run it

```
node 13-cipher-suite/original.js encrypt caesar "hello" 3
node 13-cipher-suite/refactored/cli.js encrypt vigenere "attack at dawn" lemon
node --test 13-cipher-suite/
```

## What's wrong with the original?

**Adding a cipher touches three places**: write the two functions, add a branch to the
encrypt if-chain, add a branch to the decrypt if-chain. Miss one and you get "unknown
cipher" — or the nastier version: encrypt works, decrypt was forgotten, and you find
out after you've encrypted something you cared about. The program's knowledge of "what
ciphers exist" is smeared across the whole file.

## What changed in the refactor

- **Every cipher is an object with the same shape** — `{ name, needsKey, encrypt,
  decrypt }`. That shape is an *interface*: a contract that lets code work with things
  it has never heard of. JavaScript doesn't enforce it with types (TypeScript would),
  but the discipline is what matters, and the round-trip test enforces it in practice.
- **`CIPHERS` is a registry** — the single place a cipher must be added. The CLI
  doesn't name a single cipher; it looks them up. Its help text and validation are
  *derived from* the registry, so they can never go stale.
- **Vigenère was added after the fact** as a demonstration: one new object in one
  file. The CLI gained a cipher, the tests gained coverage — with zero edits to either.
  Compare project 10's one-line operator: same principle, one level up (a whole
  behavior instead of one function).
- **One test loop covers all ciphers, forever.** `decrypt(encrypt(x)) === x` is the
  contract every cipher must honor, so the test iterates the registry. The cipher you
  add next week gets tested *automatically*. Interface + registry + property test is
  a mini plug-in architecture — the same design as ESLint rules, Express middleware,
  and webpack plugins.
- Shared mechanics (`shiftLetters`) live in one helper; caesar, rot13, and vigenère
  are thin layers over it. Note how project 03/04's function reappears — good pieces
  keep getting reused.

## Key takeaway

When you have a *family* of interchangeable things, design the shape one of them has,
then make all of them that shape and put them in a list. Dispatch, help text, and
tests all become loops over the list — and "add one more" becomes the cheapest change
in the codebase.
