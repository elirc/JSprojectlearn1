# 🏋️ Practice: Command Palette

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking. (The pure-logic exercises can be checked with `node --test`; the rest are checkable by reading and reasoning about your code — run the page later when you have internet, since React loads from a CDN.)

Exercises 1 and 3 change `refactored/index.html`; exercises 4 and 5 change `refactored/palette.js` and `refactored/palette.test.js` (and the copy inside the HTML).

## Exercises

### ⭐ 1. Add a command (warm-up)

Add **"Copy the log"**: it should join the log lines with newlines, write them to the clipboard, and append a confirmation line. Then add **"Log the time"**, which appends the current time.

Do it without touching `CommandPalette`, `fuzzyMatch`, `rankCommands` or `useGlobalKey`. Give the new commands sensible `keywords` — someone searching "clipboard" or "clock" should find them.

**Practices:** feeling the actual size of the diff. This is the exercise the whole project exists for.

**Hint:** one command needs a capability the actions bag doesn't have yet (it must *read* the log, not just append to it). Add it to the bag — `copyLog: () => navigator.clipboard.writeText(log.join('\n'))` — rather than reaching for state from inside the registry.

**Expected:** two objects in `COMMANDS`, one new entry in `actions`, and nothing else changed. The icons, the search, the ranking, the ↑↓ keys and the counter on the page ("9 commands registered") all pick them up with no further work. Now open `original.html` and do the same; the diff touches five regions in three functions.

### ⭐⭐ 2. Predict the results (and who re-renders) (core)

**Part A, on paper.** Using the registry in the refactor, write down the exact list of command ids the palette shows, in order, for each of these queries: `tdm`, `font`, `lo`, `dark zebra`. For `lo`, also write the score of each result and explain the order — it is not the one you expect.

**Part B, on paper.** You type one character into the palette input. List which components re-render in the **refactor**, then in the **original**. Then answer: in the original, how many times does the window `keydown` listener get removed and re-added while you type a five-letter query?

**Practices:** running a pure ranking function in your head — and seeing that where you *put* the query state decides how much of the app repaints on every keystroke (project 29).

**Hint (A):** score is `(1 per char + 4 per consecutive + 3 per word-start) * 100 - firstMatchIndex`. For `lo`, check "Toggle dark mode" carefully — where are its `l` and its `o`?

**Hint (B):** in the refactor `query` lives in `CommandPalette`; in the original it lives in `App`, and `App` also renders the log and owns the effect whose deps include `query`.

**Expected:** `tdm` returns exactly one command. `lo` returns three, and a command with no "lo" in its title at all comes **second**. In the refactor a keystroke re-renders two components; in the original it re-renders everything and re-subscribes a global listener five times.

### ⭐⭐ 3. Contextual commands with `when` (core)

Some commands don't always make sense. "Clear the log" is noise when the log is already empty; "Decrease font size" is a lie at 10px. Add an optional `when: (context) => boolean` field to the registry and hide commands whose `when` returns false.

**Practices:** growing a data format instead of growing a component. You are about to reinvent VS Code's `when` clauses, and it should cost about four lines.

**Hint:** build a `context` object in `App` (`{ logLength: log.length, fontSize, dark }`) and filter before ranking: `COMMANDS.filter((c) => !c.when || c.when(context))`. Commands without a `when` are always available — a default that keeps the common case free of ceremony.

**Expected:** clear the log and "Clear the log" disappears from the palette; shrink to 10px and "Decrease font size" disappears. `CommandPalette` is untouched — it filters nothing, because deciding *which* commands exist is the app's job and drawing them is the palette's.

### ⭐⭐ 4. Remember what I use (core)

Track the last few commands the user ran and let recency influence the list: `rankCommands(commands, query, { recentIds })`. With an empty query, recents come first. With a query, recency should break ties between similar matches — but never drag a poor match above a clearly better one.

**Practices:** adding a second ranking signal without letting it swamp the first, and keeping the "no history" path free of work.

**Hint:** a boost of `(recentIds.length - rank) * 100` sits at roughly one word-start bonus — enough to reorder near-equals, far too small to beat a genuine match. Keep the empty-query fast path returning the *same array* when there's no history, so the existing test still passes.

**Expected:** with no history nothing changes at all — `rankCommands(commands, '')` still returns the very same array object. Run "Decrease font size" once, then type `font`: it jumps from third to first, ahead of "Reset font size". Type `erase` with the same history and "Clear the log" is still first, because 2400 beats 1299 + 100 by a distance recency was never meant to cross.

### ⭐⭐⭐ 5. Multi-word queries (challenge)

Today, typing `dark theme` finds nothing — there's no `t` after the `e` in "Toggle dark mode", and the keyword `theme` doesn't contain `dark`. But `dark theme` is exactly what a person types. Fix it: split the query on whitespace and require **every word** to match **some** haystack (title or any keyword), summing the scores.

Write `matchQuery(query, haystacks)` in `palette.js`, rebuild `rankCommands` on top of it, and keep every existing test green.

**Practices:** changing the core of a search engine with a test suite as your safety net — and finding out in 40 milliseconds whether you broke the seven behaviours you already agreed on.

**Hint:** loop the words on the outside and the haystacks on the inside; each word keeps its best haystack. Return `null` the moment a word matches nothing. Only collect highlight positions from words that matched the *title* — the rest have no honest place to point.

**Expected:** `dark theme` and `theme dark` both return `['theme.toggle']` with the highlight on the letters of "dark" only (positions `[7, 8, 9, 10]`). `zoom text` returns both font-size commands, matching each word against a different keyword. `dark zebra` returns nothing. And all nineteen existing tests still pass, including the tie-ordering one — which is how you know the change was a generalisation and not a rewrite.

## Solutions

### 1. Add a command

```jsx
// in COMMANDS:
{ id: 'log.copy', title: 'Copy the log', icon: '📋',
  keywords: ['clipboard', 'copy', 'export'],
  run: (a) => a.copyLog() },
{ id: 'log.time', title: 'Log the time', icon: '🕒',
  keywords: ['clock', 'now', 'timestamp'],
  run: (a) => a.log(new Date().toLocaleTimeString()) },

// in App's actions bag — the ONE extra capability:
copyLog: () => {
  navigator.clipboard.writeText(log.join('\n'));
  setLog((lines) => [...lines, `(copied ${lines.length} lines)`]);
},
```

**Why:** the second command needed nothing new at all — `log` was already a capability — and the first needed one line in the bag because it does something the app hadn't offered before: *reading* the log. That distinction is the discipline that keeps the registry honest. It would have been easy to write `run: () => navigator.clipboard.writeText(...)` and reach for app state from inside the command, and the file would have compiled; it would also have stopped being data, because now the registry knows about the shape of the app's state and can't be tested with a fake bag. The rule to keep: a command's `run` may call actions and nothing else. Everything it needs arrives as an argument.

### 2. Predict the results (and who re-renders)

**Part A.**

- `tdm` → `['theme.toggle']`. Exactly one, which is the whole appeal of initials. The `t` is easy to find, but every other title runs out of `d`s and `m`s after it: "Increase font size" has its `t` at the end of "font", with no `d` behind it.
- `font` → `['font.reset', 'font.increase', 'font.decrease']`. All three score `19` base — four characters, three consecutive bonuses, one word start — so the tie is broken by where the match starts: index 6 in "Reset font size" beats index 9 in the other two, which then hold registry order because the sort is stable.
- `lo` → `['log.clear' (199), 'theme.toggle' (196), 'log.hello' (194)]`. "Toggle dark **m-o**de" comes **second**, ahead of "Say hel**lo**" — because both score the same base (two characters, no consecutive bonus, no word start), and the tiebreak is the *first* match index: `l` at 4 in "Toggle" beats `l` at 6 in "hello". Nothing about this is a bug; it's an honest look at a small scoring function's blind spot, and the reason exercise 4 exists. A real palette leans on usage data because the letters alone don't carry enough signal.
- `dark zebra` → `[]`. It's a single query string, so `dark zebra` is matched as one subsequence and there's no `z` anywhere. (Exercise 5 changes this to "no results because `zebra` matches nothing" — same answer, better reason.)

**Part B.** In the **refactor**, `query` is state inside `CommandPalette`. Typing re-renders `CommandPalette` and the `Highlighted` elements it builds — and that's it. `App` doesn't re-render: the log, the counter and the heading are untouched, and the `mod+k` listener isn't disturbed.

In the **original**, `query` is state in `App`. Typing re-renders `App`, which means the log, the note, the palette, the input and every `<li>` — the whole page. Worse, `query` is in the key effect's dependency array, so React tears down and re-creates the `keydown` subscription **five times** for a five-letter query: `removeEventListener` + `addEventListener` per keystroke.

**Why:** part A is the "run the pure function in your head" skill that extraction buys you — you can answer questions about search behaviour by reading twelve lines of arithmetic, with no app in the way. Part B is project 29's colocation lesson arriving through a side door: state's *location* is a performance decision, and "where should `query` live?" has an obvious right answer (inside the thing that owns the text field) that the original gets wrong for a structural reason — its palette isn't a component, so there is nowhere smaller than `App` to put anything.

### 3. Contextual commands with `when`

```jsx
// registry entries gain an optional field:
{ id: 'log.clear', title: 'Clear the log', icon: '🧹',
  keywords: ['empty', 'erase', 'delete'],
  when: (ctx) => ctx.logLength > 0,
  run: (a) => a.clearLog() },
{ id: 'font.decrease', title: 'Decrease font size', icon: '🔍',
  keywords: ['smaller', 'zoom out', 'text'],
  when: (ctx) => ctx.fontSize > 10,
  run: (a) => a.setFontSize((size) => Math.max(size - 2, 10)) },

// in App:
const context = { logLength: log.length, fontSize, dark };
const available = COMMANDS.filter((cmd) => !cmd.when || cmd.when(context));
...
{open && <CommandPalette commands={available} onRun={run} onClose={...} />}
```

```js
test('when-clauses hide commands that make no sense right now', () => {
  const ctx = { logLength: 0, fontSize: 10 };
  const available = commands.filter((c) => !c.when || c.when(ctx));
  const ids = available.map((c) => c.id);
  assert.ok(!ids.includes('log.clear'));
  assert.ok(!ids.includes('font.decrease'));
  assert.ok(ids.includes('font.increase'));
});
```

**Why:** four lines, and two of them are the commands declaring their own preconditions. Note where the filter went: in `App`, before `CommandPalette` ever sees the list. The palette's contract is "render these commands", and adding "…except the ones that don't apply, according to rules about logs and font sizes" would have been the first crack in its reusability. The `!cmd.when ||` default matters more than it looks — it means the seven existing commands need no edit, so the feature is opt-in and the format stays readable. And because availability is now a pure function of a context object, it's testable without a palette, a keyboard or a render. That is the same trick as `run(actions)`, applied to a different question: pass the world in as an argument and the decision stops needing the world.

### 4. Remember what I use

```js
export function rankCommands(commands, query, { recentIds = [] } = {}) {
  const boost = (cmd) => {
    const rank = recentIds.indexOf(cmd.id);
    return rank === -1 ? 0 : (recentIds.length - rank) * 100;
  };

  if (String(query).trim() === '') {
    if (recentIds.length === 0) return commands;        // no history: no work
    return [...commands].sort((a, b) => boost(b) - boost(a));
  }

  return commands
    .map((cmd) => {
      const titleMatch = fuzzyMatch(query, cmd.title);
      let best = titleMatch && { ...titleMatch, onTitle: true };
      for (const keyword of cmd.keywords || []) {
        const m = fuzzyMatch(query, keyword);
        if (m && (!best || m.score > best.score)) best = { ...m, onTitle: false };
      }
      if (!best) return null;
      return { ...cmd, score: best.score + boost(cmd),
               positions: best.onTitle ? best.positions : [] };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);
}
```

```jsx
// in App:
const [recentIds, setRecentIds] = useState([]);
const run = (cmd) => {
  cmd.run(actions);
  setRecentIds((ids) => [cmd.id, ...ids.filter((id) => id !== cmd.id)].slice(0, 3));
  setOpen(false);
};
```

```js
test('recency reorders near-equals without overruling a better match', () => {
  assert.equal(rankCommands(commands, ''), commands);           // no history, no work
  assert.deepEqual(
    rankCommands(commands, '', { recentIds: ['log.clear', 'help.about'] }).map((c) => c.id),
    ['log.clear', 'help.about', 'theme.toggle', 'font.increase',
     'font.decrease', 'font.reset', 'log.hello']);
  assert.deepEqual(
    rankCommands(commands, 'font', { recentIds: ['font.decrease'] }).map((c) => c.id),
    ['font.decrease', 'font.reset', 'font.increase']);
  assert.deepEqual(
    rankCommands(commands, 'erase', { recentIds: ['font.decrease'] }).map((c) => c.id),
    ['log.clear', 'font.decrease']);   // 2400 still beats 1299 + 100
});
```

**Why:** the number 100 is the whole design. Scores here live in the low thousands, and one word-start bonus is worth 300 — so a recency boost of 100–300 is exactly big enough to settle an argument between two commands the matcher thinks are equivalent, and far too small to promote something the user plainly didn't type. Pick 5000 instead and you've built a palette that ignores what you're typing in favour of what you typed yesterday, which is the single most common way "smart" search gets worse. The empty-query fast path is worth copying as a habit: `if (recentIds.length === 0) return commands` keeps the original object identity for the overwhelmingly common case, so nothing downstream sees a "new" array and re-renders for no reason. And `[cmd.id, ...ids.filter(...)].slice(0, 3)` is an LRU list (js#41) in one line — dedupe by removing first, prepend, cap.

### 5. Multi-word queries

```js
/**
 * Every word of the query must match SOME haystack; scores add up.
 * haystacks[0] is the title by convention — only its matches produce
 * highlight positions, because that's the only string on screen.
 */
export function matchQuery(query, haystacks) {
  const words = String(query).trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return { score: 0, positions: [] };

  let total = 0;
  const positions = new Set();
  for (const word of words) {
    let best = null;
    let onTitle = false;
    haystacks.forEach((text, i) => {
      const m = fuzzyMatch(word, text);
      if (m && (!best || m.score > best.score)) { best = m; onTitle = i === 0; }
    });
    if (!best) return null;                       // a word with nowhere to go
    total += best.score;
    if (onTitle) best.positions.forEach((p) => positions.add(p));
  }
  return { score: total, positions: [...positions].sort((a, b) => a - b) };
}

export function rankCommands(commands, query) {
  if (String(query).trim() === '') return commands;
  return commands
    .map((cmd) => {
      const m = matchQuery(query, [cmd.title, ...(cmd.keywords || [])]);
      return m ? { ...cmd, score: m.score, positions: m.positions } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);
}
```

```js
test('every word must match something, anywhere', () => {
  assert.deepEqual(rankCommands(commands, 'dark theme').map((c) => c.id), ['theme.toggle']);
  assert.deepEqual(rankCommands(commands, 'theme dark').map((c) => c.id), ['theme.toggle']);
  assert.deepEqual(rankCommands(commands, 'dark theme')[0].positions, [7, 8, 9, 10]);
  assert.deepEqual(rankCommands(commands, 'zoom text').map((c) => c.id),
    ['font.increase', 'font.decrease']);
  assert.deepEqual(rankCommands(commands, 'dark zebra'), []);
});
```

**Why:** the loop nesting *is* the specification. Words on the outside with an early `return null` encodes "every word must land" (an AND across words); haystacks on the inside keeping the best encodes "any field may satisfy it" (an OR across fields). Swap the nesting and you get a different product: OR across words means typing more makes the results *worse*, which is the behaviour of every bad search box you've used. Two smaller decisions carry real weight. Summing scores rather than taking the best means a command matching both words outranks one matching a single word twice as well — right, because two matched words is more evidence of intent than one strong match. And restricting highlights to title hits keeps the UI truthful: a `Set` collects them because two words can legitimately overlap on the same character, and sorting them keeps the renderer's job trivial.

The thing to notice at the end: this rewrote the core of the search and **all nineteen existing tests stayed green** — the ties still tie, the keyword matches still don't highlight, `erase` still finds both commands in the same order. That's not luck. Those tests were written against *behaviour that mattered*, not against the implementation, which is why they could survive the implementation being replaced. A test suite that breaks whenever you refactor was testing the wrong things; one that stays green through a rewrite and would go red on a real regression is the thing extraction was for.
