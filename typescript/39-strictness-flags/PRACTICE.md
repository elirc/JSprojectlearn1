# 🏋️ Practice: Strictness Flags

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

Write your code in a scratch file inside this folder (e.g. `practice.ts`, ending with `export {}`) — `npm run typecheck` from the `typescript/` folder checks it with the track's config, which turns on **only** `strict: true`. Four of these exercises are about flags *above* `strict`, so they need their own run; from the repo root that is `npx tsc --noEmit --strict --target es2022 --module esnext --moduleResolution bundler <flag> typescript/39-strictness-flags/practice.ts`, with `<flag>` named in each exercise. Wherever an exercise says "flag run", it means that command.

## Exercises

### ⭐ 1. The ladder with no bottom rung (warm-up)

A weather widget calls `bandFor(celsius)`: `'hot'` at 30 and up, `'mild'` at 15, `'cool'` at 0 — and nothing at all below freezing. Write it with no return annotation and no final `return`, then hover the result: the compiler quietly inferred a `| undefined` you never asked for. Now write `bandForFixed` with an explicit `: string` return type and the missing `'freezing'` rung.

**Practices:** seeing where an unannotated missing return *lands* — on the caller, far from the omission — and the two ways to move it home.
**Hint:** the return annotation is the cheap half of `noImplicitReturns`: annotate, and plain `strict` already refuses a function that can fall off its end.
**Check:** under `npm run typecheck`, `const label: string = bandFor(-5);` must error with roughly `Type 'string | undefined' is not assignable to type 'string'` — wrap it in `@ts-expect-error`. Annotating `bandFor` as `: string` instead moves the error to the signature (`Function lacks ending return statement...`), and a flag run with `--noImplicitReturns` flags the unannotated version too, with `Not all code paths return a value.`

### ⭐⭐ 2. Give the lookup its edges (core)

A menu app keeps `const RATINGS: Record<string, number>` of spice levels and a `const NAMES = ['ada', 'grace', 'alan']`. Write `ratingLabel(dish: string): string`, returning `'unrated'` for a dish that isn't in the record, and `initial(index: number): string`, throwing a `RangeError` naming the bad index. Both must survive `noUncheckedIndexedAccess` — which covers object index signatures, not just arrays.

**Practices:** treating a lookup as something that can miss, and choosing per case whether a miss deserves a fallback or a loud failure.
**Hint:** pull the lookup into a `const` first (`const rating = RATINGS[dish];`), then narrow it — you can't narrow an expression you re-index each time.
**Check:** flag-dependent — under the base config both versions compile, checked or not. On a flag run with `--noUncheckedIndexedAccess`, the unchecked `'*'.repeat(rating)` must error with roughly `Argument of type 'number | undefined' is not assignable to parameter of type 'number'`, and unchecked `NAMES[index].charAt(0)` with `Object is possibly 'undefined'`. Your version must be clean under both runs.

### ⭐⭐ 3. Clearing a field means removing it (core)

A blog editor holds `interface Draft { title: string; subtitle?: string; scheduledFor?: string }`. Write `clearSubtitle(draft: Draft): Draft` that returns a copy with the key genuinely **absent**, and `setSubtitle(draft: Draft, value: string | undefined): Draft` that routes `undefined` through it. Then declare a second type whose field is *present but maybe empty* — say `interface SyncState { lastSyncedAt: string | undefined }` — and note that you must write a value for it.

**Practices:** the absent vs. present-undefined distinction, and saying which one you mean in the type instead of blurring them.
**Hint:** rest destructuring builds the copy: `const { subtitle, ...rest } = draft;` then `return rest;` (`void subtitle;` marks the pulled-out name as intentionally unused).
**Check:** flag-dependent — on a flag run with `--exactOptionalPropertyTypes`, the naive `return { ...draft, subtitle: value };` must error with roughly `Type '{ title: string; subtitle: string | undefined; }' is not assignable to type 'Draft' with 'exactOptionalPropertyTypes: true'`. Your version must be clean under both runs, and `const s: SyncState = {};` must error even under the base config (`Property 'lastSyncedAt' is missing`).

### ⭐⭐ 4. Type an untyped switch (core)

A dashboard has this untyped helper: given a metric name it sets `unit = 'ms'` for `latency`, `'req/s'` for `throughput`, and `'%'` for everything else — written as a `switch` with an accumulator variable, and `case 'latency':` is missing its `break`. Give the parameter a literal union type `Metric` (`'latency' | 'throughput' | 'errorRate' | 'uptime'`), then rewrite the switch so there is no `break` to forget. Keep `errorRate` and `uptime` sharing one answer.

**Practices:** killing the fallthrough *category* by returning from each case, and the literal union that lets the switch be exhaustive without a `default`.
**Hint:** stacked **empty** case labels (`case 'errorRate':` immediately followed by `case 'uptime':`) are still legal under the flag — it only rejects a case with a body that can reach the next one.
**Check:** flag-dependent — on a flag run with `--noFallthroughCasesInSwitch`, the original accumulator version must error with roughly `Fallthrough case in switch.` Your rewrite must compile under both runs **with no `default` branch**; if it complains about a missing return, a metric is unhandled.

### ⭐⭐⭐ 5. The override you meant to write (challenge)

Write `class Exporter` with `extension(): string` returning `'txt'` and `describe(): string` returning `` `exports .${this.extension()} files` ``. Then `class CsvExporter extends Exporter` replacing both, each marked `override`, with `describe` calling `super.describe()`. Finally add a `JsonExporter` whose author fat-fingered the name as `descrbe` and marked it `override` anyway.

**Practices:** `override` as a two-way claim — it tells readers you are replacing a base member, and it lets the compiler tell you when you are not.
**Hint:** the typo case and the missing-keyword case are caught by *different* rules; only one of them needs a flag.
**Check:** two halves. The typo already fails under `npm run typecheck` with roughly `This member cannot have an 'override' modifier because it is not declared in the base class 'Exporter'. Did you mean 'describe'?` — wrap it in `@ts-expect-error` so the base run stays green. Deleting the `override` keywords from `CsvExporter` is an error only on a flag run with `--noImplicitOverride`: `This member must have an 'override' modifier because it overrides a member in the base class 'Exporter'.`

### ⭐⭐⭐ 6. Clean under all five (challenge)

Write `parseRow(line: string): Row` for a CSV import, where `interface Row { id: string; email: string; nickname?: string }`. Split on commas, trim each cell, throw a `RangeError` if the id or email cell is missing, and omit `nickname` entirely when the third cell is absent or empty. Add `displayName(row: Row): string` preferring the nickname. Then check the whole file with every flag from this exercise at once.

**Practices:** writing code that is already flag-clean — index results narrowed, an optional property left absent rather than set to `undefined`, and every path returning.
**Hint:** `cells[2]` is `string | undefined` under the flag, so one check covers both "no third cell" and "empty third cell"; return `{ id, email }` in that branch and `{ id, email, nickname }` in the other.
**Check:** must be clean under `npm run typecheck` **and** under a flag run carrying all five: `--noUncheckedIndexedAccess --exactOptionalPropertyTypes --noImplicitReturns --noFallthroughCasesInSwitch --noImplicitOverride`. If the flagged run is clean, nothing in the file is relying on a check the compiler was not making.

## Solutions

### Solution 1

```ts
function bandFor(celsius: number) {
  if (celsius >= 30) return 'hot';
  if (celsius >= 15) return 'mild';
  if (celsius >= 0) return 'cool';
}

// @ts-expect-error — Type 'string | undefined' is not assignable to type 'string'
const label: string = bandFor(-5);

function bandForFixed(celsius: number): string {
  if (celsius >= 30) return 'hot';
  if (celsius >= 15) return 'mild';
  if (celsius >= 0) return 'cool';
  return 'freezing';
}

const safe: string = bandForFixed(-5);
```

WHY: this snippet is deliberately half-broken — it is clean under `npm run typecheck` and, by design, fails a `--noImplicitReturns` run at `bandFor` itself. That is the exercise: with no annotation the omission is *invisible at the function* and becomes the caller's `| undefined` problem, one file away from the missing rung. Annotating `: string` buys most of the flag for free under plain strict, because a function promising `string` may not fall off its end. And the real fix was never about the compiler: `'freezing'` was a temperature band nobody wrote code for.

### Solution 2

```ts
const RATINGS: Record<string, number> = { spicy: 3, mild: 1, sweet: 2 };

function ratingLabel(dish: string): string {
  const rating = RATINGS[dish];
  if (rating === undefined) {
    return 'unrated';
  }
  return '*'.repeat(rating);
}

const NAMES = ['ada', 'grace', 'alan'];

function initial(index: number): string {
  const name = NAMES[index];
  if (name === undefined) {
    throw new RangeError(`no name at index ${index}`);
  }
  return name.charAt(0).toUpperCase();
}
```

WHY: the flag types both lookups as `T | undefined`, and the two functions then answer the same question differently — a dish nobody rated is ordinary, so it gets a fallback; an index past the end of a fixed array is a caller bug, so it gets a loud `RangeError` naming the index. Binding the lookup to a `const` first is what makes narrowing possible at all: `RATINGS[dish]` re-read after the check would be a fresh, un-narrowed expression. Note this compiles identically under the base config — the checks cost nothing there and are the difference between a crash and a message under the flag.

### Solution 3

```ts
interface Draft {
  title: string;
  subtitle?: string;
  scheduledFor?: string;
}

function clearSubtitle(draft: Draft): Draft {
  const { subtitle, ...rest } = draft;
  void subtitle;
  return rest;
}

function setSubtitle(draft: Draft, value: string | undefined): Draft {
  if (value === undefined) {
    return clearSubtitle(draft);
  }
  return { ...draft, subtitle: value };
}

interface SyncState {
  lastSyncedAt: string | undefined;
}

const neverSynced: SyncState = { lastSyncedAt: undefined };
```

WHY: after the `undefined` branch is peeled off, `value` is narrowed to `string`, so the spread on the last line writes a real subtitle and the flag has nothing to object to. `clearSubtitle` produces an object where the key is genuinely gone, which is what `?` claims and what `'subtitle' in draft`, `Object.keys`, and `JSON.stringify` all agree about. `SyncState` is the deliberate contrast: `lastSyncedAt` is *always present* and sometimes empty, so it is not optional at all — and the compiler makes you write the `undefined` out, which is the point of keeping the two spellings distinct.

### Solution 4

```ts
type Metric = 'latency' | 'throughput' | 'errorRate' | 'uptime';

function unitFor(metric: Metric): string {
  switch (metric) {
    case 'latency': return 'ms';
    case 'throughput': return 'req/s';
    case 'errorRate':
    case 'uptime':
      return '%';
  }
}
```

WHY: with a `return` in every case there is no `break` to forget and no accumulator to overwrite, so the bug class is structurally gone rather than merely detected. The stacked `case 'errorRate':` / `case 'uptime':` is the legal kind of fallthrough — an empty label falls into the next case by design, and the flag deliberately allows it. And because `Metric` is a literal union the switch is exhaustive, so no `default` is needed: if someone later adds `'saturation'` to `Metric`, this function stops compiling with `Function lacks ending return statement`, which is exercise 12's guarantee arriving for free.

### Solution 5

```ts
class Exporter {
  extension(): string {
    return 'txt';
  }
  describe(): string {
    return `exports .${this.extension()} files`;
  }
}

class CsvExporter extends Exporter {
  override extension(): string {
    return 'csv';
  }
  override describe(): string {
    return `CSV — ${super.describe()}`;
  }
}

class JsonExporter extends Exporter {
  // @ts-expect-error — 'descrbe' is not declared in the base class
  override descrbe(): string {
    return 'JSON';
  }
}
```

WHY: the two rules are complementary. Writing `override` on something that overrides nothing is *always* an error, flag or not — which is why the typo is caught by `npm run typecheck` and even gets a "Did you mean 'describe'?" suggestion. `noImplicitOverride` adds the other direction: you may no longer replace a base member silently. Together they close the rename trap, where someone renames a base method and every subclass quietly stops overriding anything while still compiling — the subclass methods become dead code that never runs.

### Solution 6

```ts
interface Row {
  id: string;
  email: string;
  nickname?: string;
}

function parseRow(line: string): Row {
  const cells = line.split(',').map((cell) => cell.trim());
  const id = cells[0];
  const email = cells[1];
  if (id === undefined || email === undefined) {
    throw new RangeError(`row needs an id and an email: ${line}`);
  }
  const nickname = cells[2];
  if (nickname === undefined || nickname === '') {
    return { id, email }; // nickname genuinely ABSENT
  }
  return { id, email, nickname };
}

function displayName(row: Row): string {
  if (row.nickname !== undefined) {
    return row.nickname;
  }
  return row.email;
}
```

WHY: every flag shows up here as one small habit. The index results are bound and narrowed before use, so `noUncheckedIndexedAccess` has nothing to say; the "no nickname" branch returns an object *without* the key instead of writing `undefined` into it, which is what `exactOptionalPropertyTypes` wants; and both functions return on every path. None of it is ceremony — the `RangeError` names the offending line, and a row with no nickname genuinely has no nickname. Written this way once, the code is portable to any project on the stricter shelf, which is the adoption playbook in miniature.
