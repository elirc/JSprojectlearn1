# React 17 — Effect dependencies

**Lesson: the deps array is not a ritual — it answers "re-sync when what
changes?", and both wrong answers are visible disasters.**

## Run it

Open `original.html` and watch the request counter **climb forever** — hundreds
of fetches to display one user. The refactor: exactly one request per user
change, counted on screen.

## What's wrong with the original?

**Bug A (live): no deps array.** No array means "run after *every* render." The
effect fetches, `setUser` renders, the render runs the effect, which fetches...
a perpetual fetch machine. This is the most expensive punctuation mistake in
React — in production it's a self-inflicted DoS (js#42's unbounded-requests
lesson, pointed at yourself).

**Bug B (described on the page): `[]` when you meant `[userId]`.** "Run once"
freezes the effect's world at mount: click "user 2" and the name never updates,
because the effect that knows how to fetch was told never to care again.

Beginners oscillate between these two — storm, then frozen, then storm — because
they're treating the array as a magic incantation rather than an answer to a
question.

## What changed in the refactor

- **`[userId]`** — the effect *synchronizes `user` with `userId`*, so it re-runs
  exactly when `userId` changes. The comment in the code lays out the
  three-option table (every render / never / when-these-change); internalize the
  question and deps stop being guesswork.
- **The honest rule**: every render-scope value the effect *reads* goes in the
  array (this is what the `exhaustive-deps` lint rule enforces — in a real
  project, turn it on and believe it). When the honest array re-runs the effect
  more than you like, the fix is never to lie in the array — it's to
  restructure: updater functions eliminate state deps (project 11), refs hold
  latest-values (project 25), or the effect shouldn't exist at all (project 21).
- Honest scoping note on the page: this fetch still needs cleanup (project 18)
  and race protection (project 19) — one lesson at a time.

## Key takeaway

Read every `useEffect` as a sentence: "keep ___ synchronized with ___." The
second blank *is* the deps array. If you can't fill in the sentence, the effect
probably shouldn't exist; if you can, the deps write themselves — and neither
"always" nor "never" is usually the answer.
