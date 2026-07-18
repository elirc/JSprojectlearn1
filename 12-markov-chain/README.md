# 12 — Markov chain sentence generator

**Lesson: separate the *build* phase from the *use* phase, with data as the interface.**

## Run it

```
node 12-markov-chain/original.js
node 12-markov-chain/refactored/cli.js
node --test 12-markov-chain/
```

## What's wrong with the original?

1. **One function does two jobs at two different rhythms.** Building the chain is
   expensive and should happen *once*; generating a sentence is cheap and happens
   *many times*. Welding them together means re-parsing the entire source text for
   every sentence — 1000 sentences from a novel = 1000 novel-parses.
2. **Always starts at `words[0]`**, so every sentence begins with the same word.
   There's no way to ask for anything else without editing the function.
3. **`split(" ")`** produces empty-string "words" on double spaces and doesn't split
   newlines at all. Real text is messy; `split(/\s+/).filter(Boolean)` handles it.
4. **Untestable randomness**, same disease as project 06.

## What changed in the refactor

- **Two functions with a data structure between them.** `buildChain` returns a `Map`
  of word → followers; `generateSentence` takes that Map. The Map is the *interface* —
  either side can be rewritten (order-2 chains! weighted picks!) as long as the shape
  holds. "Build a model, then query the model" is the architecture of half of
  computing: compilers, search indexes, and ML training/inference all have this shape.
- **Duplicates in the follower list ARE the probabilities.** `'the' → ['cat', 'cat',
  'dog']` makes "cat" twice as likely — picking uniformly from a list-with-repeats
  gives frequency weighting for free. Sometimes the naive data structure is secretly
  the clever one; it just needs a comment saying so.
- **Options object** (`maxWords`, `start`, `rng`) — project 11's lesson applied.
- **Look at the fourth test**: "every adjacent pair in the output existed in the
  source." You can't test random output for equality, but you can test the *property*
  that defines a Markov chain — this is the defining invariant, verified mechanically.

## Key takeaway

When one function has an expensive phase and a cheap phase, split at the seam and
make the in-between thing (the model, the index, the chain) an explicit piece of data.
You get performance, testability, and extensibility from a single cut.
