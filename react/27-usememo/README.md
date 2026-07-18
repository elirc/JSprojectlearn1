# React 27 — useMemo

**Lesson: memoize expensive derivations — and only expensive ones. `useMemo` is
js#27's memoize with deps as the cache key.**

## Run it

Open `original.html` and type a sentence in the notes box — feel each keystroke
stutter (the render recounts primes up to 200k every time). Refactor: typing is
instant, and the "computed N times" counter proves the primes only recompute
when the slider moves.

## What's wrong with the original?

Nothing structural! Deriving `primeCount` in render is project 09's correct
default. The problem is arithmetic: this particular derivation costs hundreds
of milliseconds, and *every* render pays it — including renders caused by the
notes field, which has nothing to do with primes. Correct pattern, wrong
economics: the keyboard is billed for the math.

## What changed in the refactor

- **`useMemo(() => countPrimesUpTo(limit), [limit])`** — derive-in-render plus
  a one-slot cache keyed by deps. Re-render with the same `limit` → cached
  answer; slider moves → recompute. It's js#27's memoize with deps instead of
  arguments as the key, holding only the latest result.
- **Same deps honesty as effects** (project 17): everything the computation
  reads belongs in the array. A lying array here returns *stale data* — worse
  than the slowness you started with.
- **The counter on screen is the receipt**: type all you want, "computed N
  times" doesn't move. When you optimize, instrument — before/after feelings
  lie; counters don't.
- **The anti-lesson is half the lesson**: don't wrap cheap stuff.
  `items.filter` over 20 rows costs microseconds; `useMemo` adds bookkeeping,
  a deps array to maintain, and a reader's pause — negative value. The
  workflow: derive plainly by default (09), *measure*, then memoize the
  specific values that hurt. (React's newer compiler automates much of this —
  the judgment of "what's actually expensive" stays yours.)
- `useMemo` has a second job unrelated to speed: keeping object/array
  *references stable* so memoized children don't see fake changes — that's
  project 30's story.

## Key takeaway

`useMemo` is a targeted tool, not a coding style. Reach for it when a
derivation is measurably slow and its inputs change less often than the
component renders — and keep a visible counter (or the Profiler) handy so
"optimized" means *measured*, not vibes.
