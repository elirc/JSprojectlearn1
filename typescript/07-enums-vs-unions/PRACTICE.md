# 🏋️ Practice: Enums vs Unions

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

Write your code in a scratch file inside this folder (e.g. `practice.ts`) — `npm run typecheck` from the `typescript/` folder picks it up. All five exercises build one small feature: task priorities.

## Exercises

### ⭐ 1. Convert this enum (warm-up)

A ticket system uses `enum Priority { Low, Medium, High }` — numeric, with all four enum surprises included. Rewrite it as the modern idiom: a `PRIORITY` const object with string values (`'low'`, `'medium'`, `'high'`) and a derived `type Priority`.

**Practices:** the `as const` object + derived-union incantation, from muscle memory.
**Hint:** the derivation is `(typeof PRIORITY)[keyof typeof PRIORITY]` — build it in steps and hover each piece.
**Check:** `const p: Priority = PRIORITY.High` and `const q: Priority = 'medium'` must both compile; `const r: Priority = 'urgent'` must error with roughly `'"urgent"' is not assignable to type 'Priority'`.

### ⭐⭐ 2. Keys are not values (core)

From the same object, derive the *other* union: `type PriorityName = keyof typeof PRIORITY` (the names `'Low' | 'Medium' | 'High'`). Then write `priorityOf(name: PriorityName): Priority` that looks the value up in the object. Keep both types straight in your head — one is the labels, one is the wire values.

**Practices:** `keyof typeof` (keys) vs `(typeof X)[keyof typeof X]` (values) — the two halves of the incantation.
**Hint:** the function body is one indexed lookup, no cast.
**Check:** `priorityOf('Low')` compiles; `priorityOf('low')` must error with roughly `'"low"' is not assignable to parameter of type 'PriorityName'` — a value can't impersonate a key.

### ⭐⭐ 3. Rank the priorities (core)

Priorities need an ordering for sorting. Build `PRIORITY_RANK: Record<Priority, number>` (0, 1, 2) and `isAtLeast(a: Priority, b: Priority): boolean` — true when `a` ranks at or above `b`.

**Practices:** `Record` keyed by a *derived* union — the table stays complete even though the union lives elsewhere.
**Hint:** two lookups and one `>=`.
**Check:** `isAtLeast('high', 'low')` compiles; deleting the `high` row from the table must error with roughly `Property 'high' is missing`.

### ⭐⭐ 4. The escalation map (core)

When a ticket ages, its priority escalates: low → medium → high → (nowhere). Encode that as data: `ESCALATION: Record<Priority, Priority | null>` plus `escalate(priority: Priority): Priority | null`. Notice the table's *values* are checked against the union too.

**Practices:** a `Record` whose values come from the same union — both axes compiler-audited.
**Hint:** `high` maps to `null` — "no further escalation" is a real state, so say it with `null`, not a magic string.
**Check:** writing `low: 'urgent'` in the table must error with roughly `'"urgent"' is not assignable to type 'Priority | null'`; callers of `escalate` must be forced to handle `null`.

### ⭐⭐⭐ 5. Guard the boundary, derive the guard (challenge)

Wire data claims to be a list of priorities: `JSON.parse('["low","urgent","high"]')`. Write `isPriority(value: unknown): value is Priority` using `Object.values(PRIORITY)` — so the checker derives from the same single source of truth — then `parsePriorities(value: unknown): Priority[]` that throws unless `value` is an array, and keeps only the elements that really are priorities.

**Practices:** deriving the runtime validator from the const object, and narrowing an `unknown` array.
**Hint:** `Array.isArray(value)` narrows to an array; `value.filter(isPriority)` then narrows the elements — `filter` understands type predicates.
**Check:** `const list: Priority[] = parsePriorities(JSON.parse('...'))` must compile with no casts outside the guard; feeding the JSON above at runtime must yield `['low', 'high']`.

## Solutions

### Solution 1

```ts
const PRIORITY = {
  Low: 'low',
  Medium: 'medium',
  High: 'high',
} as const;

type Priority = (typeof PRIORITY)[keyof typeof PRIORITY];
// = 'low' | 'medium' | 'high'

const p: Priority = PRIORITY.High; // named-constant style
const q: Priority = 'medium';      // raw-literal style
// @ts-expect-error — 'urgent' is not a Priority
const r: Priority = 'urgent';
```

WHY: string values kill the falsy-zero trap and make the wire format readable; a plain object emits no special runtime code; and because the union *derives* from the object, adding `Urgent: 'urgent'` later is one edit that updates every consumer. Both calling styles typecheck against the same union — the enum's ergonomics survive intact.

### Solution 2

```ts
type PriorityName = keyof typeof PRIORITY; // 'Low' | 'Medium' | 'High'

function priorityOf(name: PriorityName): Priority {
  return PRIORITY[name];
}
```

WHY: `keyof typeof PRIORITY` stops at the keys — the TitleCase labels — while indexing with those keys (`[keyof typeof ...]`) goes one step further to the values. Indexing the object with a `PriorityName` is fully checked, so the function needs no cast, and passing a value string like `'low'` where a name belongs is caught — the two unions overlap in spirit but never in the compiler's eyes.

### Solution 3

```ts
const PRIORITY_RANK: Record<Priority, number> = {
  low: 0,
  medium: 1,
  high: 2,
};

function isAtLeast(a: Priority, b: Priority): boolean {
  return PRIORITY_RANK[a] >= PRIORITY_RANK[b];
}
```

WHY: ordering is *data*, so it lives in a table the compiler audits: `Record<Priority, number>` requires exactly one rank per priority, no more, no fewer. Because `Priority` is derived from the const object, a future `Urgent` entry automatically makes this table (and exercise 4's) refuse to compile until each gets a row — three structures, one source of truth.

### Solution 4

```ts
const ESCALATION: Record<Priority, Priority | null> = {
  low: 'medium',
  medium: 'high',
  high: null,
};

function escalate(priority: Priority): Priority | null {
  return ESCALATION[priority];
}
```

WHY: both sides of this table are typed — keys must cover every `Priority`, and values must themselves *be* priorities (or `null`), so a typo'd or stale target like `'urgent'` can't hide in the data. Returning `Priority | null` pushes the "top of the ladder" case onto callers explicitly, instead of inventing a fake `'none'` status the union would then have to carry everywhere.

### Solution 5

```ts
const ALL_PRIORITIES = Object.values(PRIORITY);

function isPriority(value: unknown): value is Priority {
  return typeof value === 'string' && (ALL_PRIORITIES as readonly string[]).includes(value);
}

function parsePriorities(value: unknown): Priority[] {
  if (!Array.isArray(value)) {
    throw new Error('expected an array');
  }
  return value.filter(isPriority);
}

const list: Priority[] = parsePriorities(JSON.parse('["low","urgent","high"]'));
// runtime result: ['low', 'high'] — 'urgent' filtered out
```

WHY: the guard's allowlist is `Object.values(PRIORITY)` — not a hand-copied array — so even the *runtime* validation derives from the one truth and can't drift when statuses change. The small `as readonly string[]` widens the allowlist so `.includes` accepts any string being tested (the narrow `('low'|'medium'|'high')[]` type would reject unknown strings — the very thing we're checking). `filter(isPriority)` uses `filter`'s predicate overload, so the output type is `Priority[]` with no cast at the call site.
