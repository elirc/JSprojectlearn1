# 04 — Mission authoring style

Before authoring anything, read one real mission end to end:

```bash
node -e "const j=require('./public/content/missions/dsa-dsa-01-two-sum.json');for(const f of j.files)console.log('\n===== '+f.path+' =====\n'+f.content)" | less
```

That mission is the canonical reference for voice, structure, and test style. Skeletons for
every file live in `handoff/templates/`.

## Standard mission shape (7 files)

Authored under `content-src/<worldId>/<NNN>-<slug>/`. Seven files gives
`fileCount: 7` → `estimatedMinutes: 76`, `difficulty: 3`, which sits at the existing median.

| file | role | size guide | gated? |
|---|---|---|---|
| `LEARN.md` | the teaching document — **the Field Manual** | 200–300 lines | no |
| `README.md` | short framing: what you build, how to run it, acceptance criteria | 40–80 lines | no |
| `PRACTICE.md` | graded exercises with expected output | 120–180 lines | no |
| `attempt.js` | starter: JSDoc contract + a `TODO` throw | 15–30 lines | no |
| `attempt.test.js` | 8–12 `node:test` cases, auto-skipped while `TODO` is present | 40–80 lines | no |
| `solution.js` | reference implementation | 20–60 lines | **yes** |
| `solution.test.js` | reference tests | 30–60 lines | **yes** |

Target ~30 KB total per mission — the existing median. Do not pad to hit a number; a tight
22 KB mission beats a bloated 45 KB one.

Vary the shape where the world calls for it (see the per-world table below), but keep
`LEARN.md` in every mission — it is what the Field Manual pane renders.

## `LEARN.md` house style

The single most important file. Its **first paragraph becomes the mission `summary`** and its
**first 8 headings become the mission `concepts`**, both shown on the world map before the
learner opens the mission. Write them deliberately.

Structure:

```markdown
# 📘 Learning Guide: <Topic>

<One strong paragraph. This is the summary shown on the map. Make it a hook that says why
this idea matters — not a restatement of the title.>

## 1. The problem in plain words
## 2. Concepts you need first
### <sub-concept>
### <sub-concept>
## 3. How to think about it
## 4. Common wrong turns
## 5. The solution, step by step
## 6. Complexity and tradeoffs
## 7. Variations you should be able to handle
```

The exact headings can change per topic, but keep the rhythm: **problem → prerequisites →
mental model → mistakes → solution → tradeoffs → variations**. The first 8 headings must read
as a meaningful table of contents on their own, because that is exactly how they are used.

Voice and technique, matching the existing corpus:

- Second person, warm and direct. Contractions are fine. No corporate register.
- Name the mistake **before** the fix. "If you ever catch yourself returning `[2, 7]` instead
  of `[0, 1]`, you've mixed them up."
- Short runnable snippets the reader can paste into a Node REPL, with results in comments:
  ```js
  m.set("apple", 3);   // remember: "apple" is at 3
  m.has("banana");     // false
  ```
- ASCII diagrams for data flow, indexing, and state transitions.
- Explain *why* the obvious approach is wrong, not just that it is.
- End sections with a concrete boundary or failure case — the recall gate asks the learner for
  one, so the lesson must supply them.

## Test idiom (copy exactly)

`attempt.test.js` must be runnable against the unimplemented starter without failing the
suite. The corpus uses this skip guard:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { twoSum } from "./attempt.js";

const todo = twoSum.toString().includes("TODO");
const skip =
  todo && "unsolved — edit attempt.js (delete the TODO line) to activate these tests";

test("classic example: [2,7,11,15] target 9", { skip }, () => {
  assert.deepEqual(twoSum([2, 7, 11, 15], 9), [0, 1]);
});
```

Test cases should cover: the happy path, a case where the naive answer is wrong, duplicates,
negatives/zero, the smallest valid input, the boundary at each end, and one larger input.
Give every test a sentence-length descriptive name.

**Every `solution.js` must actually pass its own `solution.test.js`.** Agents must run
`node --test` and report the result. Unverified generated lesson code is the main quality risk
in a run of this size.

## Per-world language and flavor

| worldId | languages | typical files | notes |
|---|---|---|---|
| `foundations` | JavaScript | standard 7 | core syntax, values, control flow, small utilities |
| `apps` | JS + HTML + CSS | `index.html`, `app.js`, `style.css`, `README.md`, `LEARN.md`, `PRACTICE.md` | browser games and user-facing behavior |
| `engineering` | JavaScript | standard 7 | abstractions, data structures, errors, maintainable design |
| `async` | JavaScript | standard 7 | promises, APIs, tooling, network-aware apps |
| `product` | JavaScript (+HTML) | 7–10 | full-stack systems, performance, larger projects |
| `typescript` | TypeScript | `attempt.ts`, `solution.ts`, `*.test.ts` | narrowing, generics, evolving contracts |
| `react` | TypeScript + TSX | `attempt.tsx`, `solution.tsx`, `*.test.tsx` | components, state ownership, effects, a11y |
| `dsa` | JavaScript | standard 7 | algorithms with explicit complexity analysis |
| `production` | JS + YAML/config + docs | mixed; **some 1-file doc missions** | testing, APIs, DBs, reliability, security, delivery, ops. 59 of the existing 63 are doc-only nodes (runbooks, threat models, case studies) — keep roughly that flavor for a minority of new ones |
| `csharp` | C# | `Program.cs`, `Tests.cs`, `Check.cs`, `refactored.csproj`, `LEARN.md`, `README.md` | optional track; typed backend practice |

For a 1-file doc mission, the single file is `LEARN.md` (→ `fileCount: 1`,
`estimatedMinutes: 28`, `difficulty: 1`). Use these sparingly and only in `production`.

## What "same style" rules out

- No mission that is a stub, a stub plus a heading, or a rephrasing of a neighboring mission.
- No lesson without at least one runnable artifact, unless it is a deliberate `production`
  doc node.
- No solution code that has not been executed against its tests.
- No topic duplicated across worlds without a distinct angle (see `content-src/PLAN.md` in
  `05-execution-plan.md` — the outline exists to prevent exactly this).
