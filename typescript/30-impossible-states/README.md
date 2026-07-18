# TS 30 — Impossible states

**Lesson: ts#10 scaled to app state — fields live only on the variants where
they *mean* something, so "meaningless but present" joins "contradictory" in
the unrepresentable bin.**

## Run it

```
npm run typecheck
```

## What's wrong with the original?

The Big Bag Of Fields: three booleans (2³ combinations for ~5 real states —
js#40's arithmetic), a `currentTrack: string | null` whose null-ness
*should* be tied to stopped-ness but isn't (so `"▶ null @ 42s"` renders),
and the subtler cousin this project adds: **fields that only apply
sometimes but exist always** — `positionSeconds` on a stopped player,
`bufferPercent` outside buffering. Every consumer must know which fields to
ignore in which flag-combinations, and each writes (or forgets) those
checks separately.

## What changed in the refactor

- **One union, five variants — and the field placement is the lesson**:
  `track` exists only on variants that have a track; `positionSeconds`
  only where there's a position; `bufferPercent` only while buffering.
  Nothing is nullable; nothing is "present but meaningless." Both
  original impossibles *plus* the field-bleed case (`bufferPercent` while
  playing) are type tests.
- **Narrowing replaces flag-checking** (ts#10's switch): inside
  `case 'playing'`, `state.track` is `string` — the `"▶ null"` render is
  inexpressible. And unnarrowed access (`state.positionSeconds` on a bare
  `PlayerState`) doesn't compile — the type *makes* consumers ask "which
  state am I in?" first.
- **Transitions build whole new variants** (js#40's machine): `pause`
  can only produce `'paused'` from `'playing'`, and carrying fields
  across (`track`, `position`) is explicit. Wire this into react#13's
  reducer and you have a fully-typed player.
- The design recipe (same as ts#10, one more step): list real states →
  variant per state → **assign each field to exactly the variants where
  it's meaningful** → discriminate → narrow.

## Key takeaway

Nullable fields and "ignore this unless..." comments are the smell of
fields assigned to the whole bag instead of their states. Push every field
down into the variants that give it meaning, and two bug families die at
once: contradictions can't be built, and meaningless data can't be read.
