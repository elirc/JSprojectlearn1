# 📘 Learning Guide: Command Palette

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

The Ctrl+K box. Press **Ctrl+K** (Cmd+K on a Mac) and a search field
drops down over the page; type a few letters, arrow up and down, press
Enter, and something happens. VS Code, Slack, Linear, Notion and GitHub
all have one, and users who find them stop using menus forever.

Ours drives a tiny demo app — toggle dark mode, grow and shrink the
font, write lines to a log, clear it — with seven commands. Both
versions behave the same: type `tdm` and both find "Toggle dark mode".
The difference is what happens when someone asks for an eighth command:

- **Original:** you edit five places — the command list, the filter's
  synonym hacks, the `runCommand` if-chain, the `iconFor` if-chain, and
  possibly the keyboard effect's dependency array. Miss one and the
  command appears but does nothing, or does something and has no icon.
- **Refactor:** you add one object to an array.

## 2. Concepts you need first

### Data-driven dispatch (js#10, one more time)

Two ways to say "what should this do?":

```js
// as code — a chain of comparisons
if (title === 'Toggle dark mode') setDark(!dark);
else if (title === 'Increase font size') setFontSize(fontSize + 2);
else if (title === 'Say hello') setLog([...log, 'hello']);

// as data — a table you look things up in
const commands = [
  { id: 'theme.toggle', title: 'Toggle dark mode', run: (a) => a.toggleTheme() },
  { id: 'font.increase', title: 'Increase font size', run: (a) => a.setFontSize(...) },
];
```

The second version isn't shorter for three commands. It's better because
of what it makes *possible*: you can count the commands, list them, sort
them, search them, group them, render a help screen from them, load more
from a plugin — all things you cannot do to an if-chain. js#10 made this
point with arithmetic operators; here it's an app's whole feature set.

The tell that you need it: **the same set of values appears in more than
one `if` chain**. The original compares against those seven title strings
in three separate places. Three chains over one list of values means the
list is real and nobody wrote it down.

### Identity vs display

`id` is what the code uses; `title` is what the human reads. Keeping them
separate is why renaming a command — or translating it — can't break
anything. In the original, the title *is* the id, so "Say hello" is
simultaneously a label, a lookup key in three functions, and a React
`key`. Change the wording and you've refactored four things at once,
without knowing it.

### Subsequence ("fuzzy") matching

A query matches if all its characters appear in the text **in order**,
not necessarily next to each other:

```
'tdm'   matches  'Toggle dark mode'    (T...d...m)
'mdt'   does not                       (wrong order)
'zebra' does not                       (no z)
```

The algorithm is one walk through the query, keeping a cursor in the
text:

```js
const found = text.indexOf(ch, from);
if (found === -1) return null;   // nowhere left for this character
from = found + 1;                // next character must come after
```

Because fuzzy matching is generous, **ranking** matters more than
filtering: everything matches a bit, so the order is the feature.

### Scoring, and why it's arithmetic

A score turns "matches" into "matches how well". Ours adds points for
things that correlate with what the user meant:

- +1 per matched character (longer query, more confidence);
- +4 when a character matches right after the previous one (a real word,
  not initials);
- +3 when a match starts a word (`t` of `Toggle`, `d` of `dark`).

Then `score * 100 - firstMatchIndex`, so an earlier first hit breaks ties
without ever outranking a genuinely better match. None of that needs a
browser, which is why it can be a unit test.

### Stable sort

`Array.prototype.sort` is *stable* in modern JavaScript: items with equal
scores keep their original relative order. Lean on it — "Increase font
size" and "Decrease font size" score identically for the query `font`,
and come out in registry order rather than shuffling about between
keystrokes. Jittery result lists are usually an unstable comparator.

### The latest-ref pattern (project 25)

A global event listener has a problem: subscribe once and the handler
captures the first render's variables forever (project 11's stale
closure); re-subscribe on every render and you add/remove listeners
constantly. The fix keeps one listener and one mutable box:

```js
const latest = useRef(handler);
useLayoutEffect(() => { latest.current = handler; });   // every render
useEffect(() => {
  const onKeyDown = (e) => latest.current(e);           // always the newest
  window.addEventListener('keydown', onKeyDown);
  return () => window.removeEventListener('keydown', onKeyDown);
}, []);                                                 // subscribed ONCE
```

### An "actions bag" (dependency injection, informally)

If commands are data, how does a command change React state without
importing React? You hand it what it's allowed to do:

```js
const actions = { toggleTheme: () => setDark((d) => !d),
                  log: (text) => setLog((lines) => [...lines, text]) };
cmd.run(actions);
```

The command declares intent; the app supplies capability. That's why a
test can pass a fake bag that just records calls, and check what a
command *does* without rendering anything.

## 3. Walking through the original code

Seven strings — `const allCommands = ['Toggle dark mode', ...]` — and
strings are the identity. Then the filter, with its accumulated
apologies:

```js
if (query === 'theme'  && title === 'Toggle dark mode')  return true;
if (query === 'night'  && title === 'Toggle dark mode')  return true;
if (query === 'bigger' && title === 'Increase font size') return true;
```

Each of those lines is a real bug report ("I searched for theme and
found nothing") answered in the cheapest possible way. Note that `theme`
only works if it's the *entire* query — `themes` or `dark theme` fails.

The behaviour, and then the icons — the same list of strings, twice
more:

```js
function runCommand(title) {
  if (title === 'Toggle dark mode') { setDark(!dark); }
  else if (title === 'Increase font size') { setFontSize(fontSize + 2); }
  ...
}
function iconFor(title) {
  if (title === 'Toggle dark mode') return '🌗';
  ...
}
```

And the keyboard, which reads everything:

```js
useEffect(() => {
  function onKeyDown(e) { /* uses open, results, selected, and runCommand */ }
  window.addEventListener('keydown', onKeyDown);
  return () => window.removeEventListener('keydown', onKeyDown);
}, [open, query, selected, results.length, dark, fontSize, log]);
```

Seven dependencies, because `runCommand` closes over `dark`, `fontSize`
and `log` — and every keystroke changes `query`, so every keystroke
removes and re-adds a window listener.

## 4. What's wrong with it (in beginner terms)

**Adding a command means editing five places.** Try it on paper: "Copy
the log". Add the title (1). It has no icon, so add one to `iconFor`
(2). It does nothing, so add a branch to `runCommand` (3). Nobody can
find it by searching "clipboard", so add a synonym to `matches` (4). And
if it reads new state, the effect's deps array needs it (5). Four of
those five will compile and run perfectly while being wrong.

**The if-chains are a table in denial.** Three functions loop over the
same seven values. That repetition isn't a style problem; it's the code
telling you that "a command" is a real thing with several attributes,
and you've stored those attributes in three places instead of one row.

**Renaming is a landmine.** The title is the lookup key. Change "Say
hello" to "Say hi" and the command still appears, still has an icon
(the `❔` fallback quietly catches it), and does absolutely nothing when
you press Enter — no error, no warning.

**The synonyms don't compose.** `query === 'theme'` is exact-match logic
bolted onto fuzzy-match logic, so `dark theme` finds nothing: the
special case doesn't fire and `dark theme` isn't a subsequence of
"Toggle dark mode" (no `t` after the `e`).

**The effect churns.** Seven dependencies means a listener removed and
re-added on every keystroke. The "fix" most people reach for — deleting
dependencies until the array is short — is project 11's bug: the
listener keeps an old `log`, so "Say hello" wipes out everything logged
since the palette opened.

**Nothing can be tested.** Is the ranking good? Does `mod+k` fire on a
Mac? Does "Decrease font size" stop at 10px? Every one of those needs a
browser, a keyboard, and a human squinting.

## 5. Try it yourself first!

1. **Vague:** three functions in the original loop over the same seven
   values. What data structure are those three functions secretly
   describing?
2. **Warmer:** write one array of objects where each object has an id, a
   title, an icon, and search keywords. Rewrite `iconFor` and the filter
   to read from it. Watch two functions become zero.
3. **The hard part:** behaviour. A command needs to change React state,
   but the array should have no React in it. What if `run` *took an
   argument* — a plain object of every action the app permits?
4. **The search:** delete the synonym `if`s and put those words in a
   `keywords` array. Then make the matcher score matches instead of
   returning true/false — what should score higher, `dark` in "Toggle
   **dark** mode" or `tdm` scattered across it?
5. **The keyboard:** write `useGlobalKey('mod+k', handler)` — parse the
   combo as a pure function you can test, and keep the handler fresh
   without re-subscribing every render (project 25 has the pattern).
6. **Check your work:** `CommandPalette` should not contain the words
   `dark`, `font` or `log` anywhere. If it does, it isn't reusable yet.

## 6. Understanding the refactored solution

**The registry is the refactor.** Everything else follows from it:

```js
{ id: 'font.increase', title: 'Increase font size', icon: '🔍',
  keywords: ['bigger', 'zoom in', 'text'],
  run: (a) => a.setFontSize((size) => Math.min(size + 2, 32)) }
```

Five fields, five former problems: `id` replaces title-as-identity,
`title` is display only, `icon` replaces `iconFor`, `keywords` replaces
the synonym `if`s, and `run` replaces the if-chain. Adding "Copy the
log" is now one object, and the icon, search, ranking, arrow keys and
Enter all work on arrival because none of them were ever per-command.

**`run(actions)` is how data describes behaviour.** The command says
"increase the font size"; the app decides that this means calling
`setFontSize`. Which means a test can say:

```js
const calls = [];
const actions = { setFontSize: (fn) => calls.push(['setFontSize', fn(16)]) };
commands.find((c) => c.id === 'font.increase').run(actions);
assert.deepEqual(calls, [['setFontSize', 18]]);
```

A test of an *application feature*, in Node, in four lines — and it
catches the clamp too: run it with 32 and you get 32 back.

**The ranker replaced a boolean with an order.** `rankCommands` matches
each command against its title and every keyword, keeps the best score,
drops the rest, and sorts. Two decisions inside are worth naming:

```js
if (String(query).trim() === '') return commands;   // same array back
positions: best.onTitle ? best.positions : []       // honest highlights
```

An empty query returns the registry *itself*, unchanged and in registry
order — cheap (no work, no new array, nothing re-renders unnecessarily)
and a UX decision: the order you wrote the commands in is the order a
new user meets them. And highlight positions are indexes into the
*title*, so a match that came from a keyword underlines nothing rather
than bolding random letters.

**`useGlobalKey` is four lines of glue around a pure function.**
`matchesCombo` decides ("was that the shortcut?"), the hook does
(subscribe, prevent default, call, clean up). Because the decision is
pure, `matchesCombo('mod+k', { key: 'k', metaKey: true })` is a test, and
so is the rule that `mod+k` must *not* fire when Shift is also held.

The hook also fixes the churn: one `addEventListener` for the lifetime
of the component, with `latest.current = handler` on every render
keeping the behaviour current. The palette then declares its shortcuts
as four lines — `useGlobalKey('escape', onClose)`,
`useGlobalKey('arrowdown', () => step(1))`, and so on — with no
`if (e.key === ...)` anywhere. They're only subscribed while the palette
is mounted, so "only when open" needed no flag at all.

**`CommandPalette` renders and nothing else.** It takes `commands`,
`onRun` and `onClose`, and contains no reference to themes, fonts or
logs — search it for the word `dark` and you get no hits. That's the
composition test from project 35: a component that can be dropped into
a different app is one that never learned this app's vocabulary.

**Selection stays derived** (project 09): `results` is computed from
`query` on every render, and `active` clamps the cursor into range
instead of an effect trying to keep a stored index valid as the list
shrinks under it.

## 7. Words you learned (glossary)

- **Command palette:** a searchable list of everything an app can do,
  usually on Ctrl/Cmd+K.
- **Registry:** an array of data describing every available thing,
  replacing branching code.
- **Data-driven dispatch:** looking behaviour up in a table instead of
  choosing it with `if`/`switch`.
- **Identity vs display:** a stable `id` for code, a human `title` for
  screens.
- **Fuzzy / subsequence match:** all query characters appear in order,
  not necessarily adjacent.
- **Ranking:** ordering matches by score — what makes generous matching
  usable.
- **Stable sort:** equal items keep their original relative order.
- **Actions bag / dependency injection:** an object of permitted
  operations passed *in*, rather than imported — what makes the registry
  describe behaviour and still be testable.
- **Latest-ref pattern:** one subscription plus a ref holding the newest
  handler, to avoid stale closures without re-subscribing.
- **Stale closure:** a handler still using values from an old render.
- **Combo parsing:** turning `'mod+shift+k'` into an event check.
- **Derived state:** computed during render from other state, not
  stored (project 09).

## 8. Experiments to try on the plane (no internet needed)

Edit and reason offline; note the pages load React from a CDN (shared
library servers), so actually *running* them in a browser needs
internet on first load.

1. **Add "Copy the log" to both.** In the refactor: one object, plus one
   entry in the actions bag if it needs new capability. In the original:
   do it properly, editing all five places, and time yourself. Expected:
   the refactor's diff fits in a screenshot; the original's doesn't.
2. **Rename a command in the original.** Change `'Say hello'` to
   `'Wave hello'` in `allCommands` only. Expected: it still lists, gets
   the `❔` fallback icon, and does nothing at all when you press Enter —
   with no error. Now do the same in the refactor by editing `title`.
   Expected: nothing breaks, because `id` is the identity.
3. **Break the deps array.** In the original, change the effect's deps to
   `[open]`. Expected: it stops churning (good!) and starts running the
   *first* render's commands — Enter may run the wrong entry, and "Say
   hello" appends to a `log` frozen at its first value. Project 11, in a
   single edit.
4. **Test a ranking decision.** In `palette.js`, change the word-start
   bonus from `+3` to `0` and run
   `node --test react/58-command-palette/refactored/palette.test.js`.
   Expected: the "ties keep registry order" test changes meaning — the
   font commands re-order — and you learn that the bonus is what makes
   initials (`tdm`) beat coincidence.
5. **Add a `when` field.** Give commands an optional
   `when: (state) => boolean` and hide "Clear the log" when the log is
   already empty. Expected: about four lines — a filter in `App` before
   ranking. You just built VS Code's `when` clauses, and it was cheap
   only because commands are data.
6. **Reuse the palette.** Copy `CommandPalette`, `useGlobalKey`,
   `fuzzyMatch` and `rankCommands` into a fresh file with a completely
   different registry (say, three commands that `alert()` things).
   Expected: it works with no edits. If you had to change one line
   inside `CommandPalette`, find which app-specific idea leaked in.
