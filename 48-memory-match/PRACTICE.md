# 🏋️ Practice: Memory Match

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. Make the shuffle testable (warm-up)

`shuffle` is already pure — it copies before swapping — but it reaches for `Math.random()` inside, so its output can never be predicted. Add a second parameter `random = Math.random` and copy the function into a scratch `.mjs` file. Check offline in node: `shuffle([1,2,3], () => 0)` returns `[2,3,1]` *every* time; the input array is unchanged; the returned array is a different object with the same elements; `shuffle([])` is `[]` and `shuffle(['x'])` is `['x']`.

What it practices: injecting randomness so a random function becomes exactly testable — the same trick projects 06 and 11 use.

Hint: work out `[1,2,3]` with `random: () => 0` on paper first. Fisher–Yates walks `i` from 2 down to 1, and `j` is always 0.

### ⭐⭐ 2. Difficulty levels (core)

Twelve cards is the only game this page can play. Write a pure `makeDeck(emojis, pairs, random = Math.random)` returning the shuffled card objects (`{ id, emoji, face: 'down' }`) for a chosen number of pairs, throwing `RangeError` for a `pairs` count that isn't a whole number from 1 to `emojis.length`. Then read the count from the URL (`index.html?pairs=3`), falling back to 6. Check offline in node: `makeDeck(EMOJIS, 6)` gives 12 cards with ids `0..11`, all face-down, and exactly 2 of each of 6 emojis; `makeDeck(EMOJIS, 2)` gives 4 cards using 2 emojis; `pairs` of `0`, `7` and `2.5` each throw. Then check `?pairs=3` in the browser gives a 6-card board.

What it practices: extracting deck construction as a pure function, and validating a URL parameter at the boundary.

Hint: `emojis.slice(0, pairs)` picks the faces, then `shuffle([...chosen, ...chosen])` and `.map((emoji, id) => ...)` assigns the ids *after* shuffling, so ids stay 0..n-1 in board order.

### ⭐⭐ 3. Cards a keyboard can reach (core)

The cards are `<div>`s with `onclick`, which means no Tab focus, no Enter/Space activation, and nothing for a screen reader to announce — the game is unplayable without a mouse. Change `render` to create `<button>` elements instead, with an `aria-label` describing the card's state ("face-down card", or the emoji when it's up or matched) and `disabled` set for matched cards. Check in the browser: press Tab repeatedly — focus visibly moves across the board; press Enter or Space on a focused card and it flips; matched cards are skipped by Tab.

What it practices: using the element that already has the behavior instead of re-implementing it on a `div`.

Hint: `<button>` gives you focusability, Enter/Space activation and disabled semantics for free — you only need CSS to keep the look (`border: none; font: inherit;`).

### ⭐⭐ 4. A clock and a personal best (core)

Add timing: record `startedAt` on the very first flip of a game, stop it on the win, and show `Moves: N — 12s` in the status line. When a game is won, compare `{ moves, seconds }` with a best score kept in `localStorage` (one per pair count) and show `New best!` when it beats it. Reading a corrupt or missing stored value must not break the page. Check in the browser: win a 2-pair game, note the score, reload, win a worse one — the best line still shows the first result; win a better one — it updates and says `New best!`.

What it practices: state that starts on an event rather than at construction, plus defensive reads of `localStorage`.

Hint: `startedAt: null` in the new state, and `if (state.startedAt === null) state.startedAt = Date.now();` at the top of a successful flip. Wrap `JSON.parse` in try/catch and check the shape before trusting it.

### ⭐⭐⭐ 5. Extract a pure reducer with effects (challenge)

`flipCard` mixes decisions with a timer and `render()` calls, so none of the rules can be tested in node. Split it: `flipReducer(state, id)` returns `{ state, effect }` where `effect` is either `null` or `{ type: 'flipBack', ids }`, and a separate `flipBack(state, ids)` applies the later change. The caller does the waiting. Check offline in node with a 4-card deck (A, B, A, B): the first flip gives phase `oneUp` and no effect; flipping the same card again returns the *identical* state object; a mismatch gives phase `checking`, `moves: 1` and the `flipBack` effect naming both ids; a click while `checking` returns the identical state; a match gives phase `idle` with both cards `matched` and no effect; the final match gives phase `won`, and any flip after that changes nothing.

What it practices: making async-shaped logic testable by *describing* the delayed work instead of performing it.

Hint: build new card objects with `state.cards.map(...)` rather than mutating, so a returned state can be compared with the old one. Returning `state` itself for ignored clicks is what makes `assert.equal(next, state)` mean "nothing happened".

### ⭐⭐⭐ 6. The race that's still there (challenge)

The `phase` guard stops mid-wait *clicks*, but not the New game button. Reproduce it: set `FLIP_BACK_MS = 3000`, flip two non-matching cards, and during the wait press New game and flip one card of the fresh board. When the old `sleep` finishes, its continuation runs `state.phase = ... : 'idle'` against the *new* state — so a board with one card face-up now reports `idle`, and your next click flips a second card without ever comparing them. Reproduce it, then fix it with a generation token. Check in the browser: after the fix, restarting mid-wait leaves the new game's status and behavior untouched, and normal play is unchanged.

What it practices: the second race in the same file — a stale async continuation writing into state that has since been replaced.

Hint: a module-level `let generation = 0;` incremented in `newGame()`. Capture `const myGeneration = generation;` at the top of `flipCard` and `if (myGeneration !== generation) return;` immediately after every `await`.

## Solutions

### 1. Injectable shuffle

```js
function shuffle(items, random = Math.random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
```

```js
// scratch test, run with node:
assert.deepEqual(shuffle([1, 2, 3], () => 0), [2, 3, 1]); // deterministic
const input = [1, 2, 3, 4, 5];
const out = shuffle(input);
assert.deepEqual(input, [1, 2, 3, 4, 5]);       // input untouched
assert.notEqual(out, input);                     // a new array
assert.deepEqual([...out].sort(), [1, 2, 3, 4, 5]); // same elements
assert.deepEqual(shuffle([]), []);
assert.deepEqual(shuffle(['x']), ['x']);
```

WHY: the default parameter means the game code doesn't change at all while tests gain complete control — the whole point of injection is that production behavior stays identical. Tracing `random: () => 0` by hand is the real exercise: `i = 2, j = 0` swaps to `[3,2,1]`, then `i = 1, j = 0` swaps to `[2,3,1]`. The single-element and empty cases are worth pinning because the loop condition is `i > 0`, so they never enter the loop — the exact base case where an off-by-one would hide. Verified by running: all six assertions pass.

### 2. makeDeck and difficulty

```js
function makeDeck(emojis, pairs, random = Math.random) {
  if (!Number.isInteger(pairs) || pairs < 1 || pairs > emojis.length) {
    throw new RangeError(`pairs must be an integer from 1 to ${emojis.length}, got ${pairs}`);
  }
  const chosen = emojis.slice(0, pairs);
  return shuffle([...chosen, ...chosen], random)
    .map((emoji, id) => ({ id, emoji, face: 'down' }));
}

function parsePairs(search, max) {
  const value = Number(new URLSearchParams(search).get('pairs'));
  return Number.isInteger(value) && value >= 1 && value <= max ? value : 6;
}

function newGame() {
  state = { cards: makeDeck(EMOJIS, parsePairs(location.search, EMOJIS.length)), phase: 'idle', moves: 0 };
  render();
}
```

WHY: assigning `id` in the `.map` *after* the shuffle is the detail that keeps ids equal to board positions, which is what lets `render` and `flipCard` find cards by id without a second lookup structure — project 41's "one structure, no sync rules" in miniature. Validating `pairs` in the constructor rather than trusting the caller means a bad URL produces a normal 6-pair game rather than a board with `NaN` cards, and the `RangeError` catches the programmer-error case loudly. Note `parsePairs` takes the search string as an argument instead of reading `location` itself, so node can test it. Verified by running: 12 cards with ids 0..11 and exactly two of each of six emojis, a 2-pair deck of 4 cards, and `RangeError` for 0, 7 and 2.5.

### 3. Keyboard-reachable cards

```js
function render() {
  const board = document.getElementById('board');
  board.innerHTML = '';
  for (const card of state.cards) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = `card ${card.face === 'down' ? '' : card.face}`.trim();
    el.textContent = card.emoji;
    el.setAttribute('aria-label', card.face === 'down' ? 'face-down card' : card.emoji);
    el.disabled = card.face === 'matched';
    el.onclick = () => flipCard(card.id);
    board.appendChild(el);
  }
  // ...status line unchanged
}
```

```css
.card { border: none; font: inherit; /* plus the existing card styles */ }
```

WHY: a `div` with an `onclick` looks identical and behaves nothing like a control — it isn't in the tab order, doesn't respond to Enter or Space, isn't announced as clickable, and can't be disabled. A `button` has all of that built into the platform, so the "fix" is deleting your own re-implementation rather than adding one. The `aria-label` matters because `textContent` is the emoji even when face-down (it's hidden with `color: transparent`), which a screen reader would happily read aloud — the label is what keeps the game's secret from assistive tech, and it's a good reminder from LEARN.md's experiment 3 that real secrecy can't live in the page at all.

### 4. Clock and personal best

```js
// in newGame(): state = { cards, phase: 'idle', moves: 0, startedAt: null, finishedAt: null };
// at the top of a flip that will actually turn a card up:
if (state.startedAt === null) state.startedAt = Date.now();
// when the win is detected:
state.finishedAt = Date.now();

function elapsedSeconds(state) {
  if (state.startedAt === null) return 0;
  return Math.round(((state.finishedAt ?? Date.now()) - state.startedAt) / 1000);
}

const BEST_KEY = `memory-best-${state.cards.length / 2}`;

function readBest(key) {
  try {
    const best = JSON.parse(localStorage.getItem(key));
    if (best && typeof best.moves === 'number' && typeof best.seconds === 'number') return best;
  } catch { /* corrupt value: fall through */ }
  return null;
}

function recordWin() {
  const score = { moves: state.moves, seconds: elapsedSeconds(state) };
  const best = readBest(BEST_KEY);
  const isBest = !best || score.moves < best.moves ||
    (score.moves === best.moves && score.seconds < best.seconds);
  if (isBest) localStorage.setItem(BEST_KEY, JSON.stringify(score));
  return isBest;
}
```

WHY: starting the clock on the first flip rather than at `newGame()` is the honest measurement — otherwise a player who opens the tab and comes back tomorrow "took" 18 hours. Storing `finishedAt` instead of freezing a computed number keeps the same "record when things happened, derive durations" rule that project 46 is built on, so a re-render after the win shows a stable time rather than a still-ticking one. Keying the best score by pair count stops a 2-pair sprint from permanently beating every 6-pair game. The try/catch around `JSON.parse` is not paranoia: `localStorage` is a string store anyone can edit, and an exception here would stop the whole win from rendering.

### 5. The pure reducer

```js
function flipReducer(state, id) {
  if (state.phase === 'checking' || state.phase === 'won') return { state, effect: null };
  const card = state.cards.find((c) => c.id === id);
  if (!card || card.face !== 'down') return { state, effect: null };

  const cards = state.cards.map((c) => (c.id === id ? { ...c, face: 'up' } : c));

  if (state.phase === 'idle') {
    return { state: { ...state, cards, phase: 'oneUp' }, effect: null };
  }

  const [a, b] = cards.filter((c) => c.face === 'up');
  const moves = state.moves + 1;

  if (a.emoji === b.emoji) {
    const matched = cards.map((c) => (c.face === 'up' ? { ...c, face: 'matched' } : c));
    const won = matched.every((c) => c.face === 'matched');
    return { state: { ...state, cards: matched, phase: won ? 'won' : 'idle', moves }, effect: null };
  }
  return {
    state: { ...state, cards, phase: 'checking', moves },
    effect: { type: 'flipBack', ids: [a.id, b.id] },
  };
}

function flipBack(state, ids) {
  const cards = state.cards.map((c) => (ids.includes(c.id) ? { ...c, face: 'down' } : c));
  return { ...state, cards, phase: 'idle' };
}

// the impure shell shrinks to wiring:
async function flipCard(id) {
  const { state: next, effect } = flipReducer(state, id);
  if (next === state) return;
  state = next;
  render();
  if (effect?.type === 'flipBack') {
    await sleep(FLIP_BACK_MS);
    state = flipBack(state, effect.ids);
    render();
  }
}
```

WHY: returning a *description* of the delayed work instead of performing it is what moves every rule of the game into node-testable territory — the reducer never awaits, never touches the DOM, and never reads a clock, so a whole game can be played in a test in microseconds. This "return `{ state, effect }`" shape is exactly how Elm and Redux-Saga style architectures tame async, and it's worth recognizing when you meet it in a framework. Returning `state` itself for ignored clicks gives the shell a cheap `next === state` check and gives tests a precise way to assert "nothing happened". Verified by running: a full 4-card game through `oneUp`, a bounced repeat click, a mismatch with its effect, a match, the win, and a frozen board afterwards.

### 6. The stale continuation

```js
let generation = 0;

function newGame() {
  generation++; // everything from previous games is now void
  state = { /* ...fresh state... */ };
  render();
}

async function flipCard(id) {
  const myGeneration = generation;
  // ...synchronous part unchanged...
  } else {
    await sleep(FLIP_BACK_MS);
    if (myGeneration !== generation) return; // this game is over — touch nothing
    a.face = 'down';
    b.face = 'down';
  }
  if (myGeneration !== generation) return;
  state.phase = state.cards.every((c) => c.face === 'matched') ? 'won' : 'idle';
  render();
}
```

WHY: the `phase` guard defends the *entrance* to `flipCard`, but this bug enters through the exit — a continuation that was already past the guard when the world changed underneath it. The damage is precise and worth tracing: `a` and `b` still point at the old game's card objects (harmless), but `state` is read fresh, so `state.phase = 'idle'` lands on the *new* game where a card is already face-up. The board now says "no cards are up" while one is, so the next click takes the `idle` branch and turns up a second card with no comparison — two cards up, no match check, and from there a third click compares the wrong pair. A generation counter fixes it because it answers the only question that matters after an `await`: "is the world I was working on still the current one?" Verified by running a DOM-free simulation of both versions: the original ends with two cards face-up while `phase` is `oneUp`, and the generation-guarded version leaves the new game untouched.
