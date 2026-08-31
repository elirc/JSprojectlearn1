# 📘 Learning Guide: Memory Match

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

The classic memory card game. Eight (or twelve) cards lie face-down; each emoji appears on exactly two of them. Click a card to flip it up. Flip two:

- **Match** → they stay up.
- **No match** → after a short pause (800ms), both flip back down.

Match every pair and you win. Open either HTML file in a browser to play.

The hidden drama: on the *original*, flip two non-matching cards and **quickly click a third card during the 800ms pause**. The board corrupts — cards stuck up, pairs mis-counted. On the refactor, that same fast click is simply ignored. That difference is this project's entire lesson.

## 2. Concepts you need first

### Building a board with the DOM

JavaScript can create page elements and attach them:

```js
const div = document.createElement("div");
div.className = "card";          // CSS classes control appearance
div.textContent = "🐈";
document.body.appendChild(div);
```

A **CSS class** is a style label: rules like `.card { background: #36c; }` and `.card.up { background: #eee; }` decide how each labeled element looks. Changing `el.className` instantly restyles it.

### Click handlers and closures

`el.onclick = fn` runs `fn` on click. When you create handlers in a loop, each handler *captures* its own variables — that's a **closure**:

```js
[10, 20].forEach((n) => {
  console.log(() => n); // each arrow function remembers ITS n
});
```

### setTimeout and the "meanwhile"

`setTimeout(fn, 800)` schedules `fn` to run 800ms later — and your program *keeps running in the meantime*. That gap is where this project's monster lives: during those 800ms, the user can still click things.

```js
setTimeout(() => console.log("later"), 800);
console.log("now");  // prints: now, then (0.8s later) later
```

### Race conditions

A **race condition** is when the correctness of your code depends on *timing* — on which of two things happens first. Here: the flip-back timer and the user's next click are racing. If the click wins, it runs against half-updated state. Race bugs are nasty because they're invisible in slow, careful testing and constant for fast users. Real-world cousins: double-clicking "Buy" and getting charged twice, double-submitting a form.

### Promises, async/await, and sleep

A **Promise** represents a value that arrives later. `await` pauses an `async` function until it settles, letting slow logic read top-to-bottom instead of nesting callbacks:

```js
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function demo() {
  console.log("flip");
  await sleep(800);          // pause THIS function; page stays alive
  console.log("flip back");  // runs 0.8s later
}
demo();
```

Important: during the `await`, the page is *not* frozen — clicks still happen. `await` organizes the code; it doesn't lock the door. Something else must do that...

### Phases (a state machine for "busy")

A **phase** is one named mode the app is in, exactly one at a time: here `idle` (no cards up), `oneUp` (one card up), `checking` (two cards up, comparing/flipping back — *busy!*), `won`. Every action checks the phase first and refuses to run in the wrong one. Naming the busy period is what makes "ignore clicks while busy" a one-line rule instead of a prayer.

### State as data vs state in the DOM

Two ways to know a card's situation: read its CSS class off the DOM (`card.className == "card up"`), or keep a data object (`{ id: 3, emoji: "🦊", face: "up" }`) and treat the DOM as a *drawing* of that data. The data way wins, especially around async code: timers mutate data in one place, render redraws from it, and nothing reads half-changed styling as truth.

### Shuffling, and why `sort(random)` is broken

`arr.sort(() => Math.random() - 0.5)` *looks* like a shuffle, but sort expects a consistent comparator (the same two items must always compare the same way). Feeding it randomness both breaks that contract and produces a **biased** shuffle — some orderings come up measurably more often. The correct algorithm is **Fisher–Yates**: walk the array from the end, swapping each item with a random item at or before it. Every ordering becomes equally likely.

### Handy array helpers

`find` (first item passing a test), `filter` (all items passing), `every` (do all pass?), `map` (transform each):

```js
const cards = [{ face: "up" }, { face: "down" }];
console.log(cards.filter((c) => c.face === "up").length); // prints: 1
console.log(cards.every((c) => c.face === "up"));         // prints: false
```

## 3. Walking through the original code

State is globals pointing at DOM elements:

```js
var firstCard = null;
var secondCard = null;
var matched = 0;
```

The deck is shuffled with the famous fake shuffle:

```js
var emojis = ["🐈", "🐈", "🐕", "🐕", "🦊", "🦊", "🐸", "🐸"];
emojis.sort(function () { return Math.random() - 0.5; }); // "shuffle"
```

Cards are built in a loop; each gets a click handler. The handler is the heart:

```js
if (card.className == "card up") return; // already face up
card.className = "card up";
if (firstCard == null) {
  firstCard = card;
} else {
  secondCard = card;
  if (firstCard.textContent == secondCard.textContent) {
    matched += 2;
    firstCard = null;
    secondCard = null;
```

Notice: "is this card face up?" is answered by reading a **CSS class**, and "which cards are picked?" by globals holding **DOM nodes**. A match clears the globals and counts up.

The no-match branch schedules the flip-back:

```js
setTimeout(function () {
  firstCard.className = "card";      // BUG WINDOW: during
  secondCard.className = "card";     // these 800ms, clicks
  firstCard = null;                  // still register!
  secondCard = null;
}, 800);
```

And there it is. For 800ms, `firstCard`/`secondCard` are still set, the handler is still live, and nothing anywhere says "the game is busy."

## 4. What's wrong with it (in beginner terms)

**Flaw 1: the 800ms race condition.** Play it out: you flip 🐈 and 🐕 — no match, flip-back scheduled. 300ms later you click 🦊. The handler runs: `firstCard` isn't null (it's still 🐈), so 🦊 becomes the *second card* and gets compared against 🐈 — a card that is about to be flipped down by the pending timer. Then the timer fires and flips down 🐈 and 🐕... but the globals have been half-reassigned meanwhile. Cards end up stuck face-up, comparisons run against ghosts, and `matched` drifts away from reality. Slow testers never see it; any fast clicker breaks the game *every time*. The deep cause is stated in the README: **the game has a busy period, but no code represents it** — there is no phase, so there is nothing to check.

**Flaw 2: state lives in DOM nodes.** `firstCard` is a `<div>`; "face up" is a class name. This is risky anywhere, but deadly around async code: timers are mutating classNames while click handlers are *reading* classNames as truth. When drawing and truth are the same thing, a half-finished drawing *is* corrupted truth.

**Flaw 3: the shuffle is biased.** `sort(() => Math.random() - 0.5)` favors some orderings. In a casual game it "just" makes card layouts less fair; in anything with money or rankings, a biased shuffle is a genuine defect. It ships constantly because it *looks* shuffled.

**Flaw 4 (bonus): cheating by select-all.** The original "hides" faces by drawing text the same color as the card. Drag-select the board or view source: every emoji is readable.

## 5. Try it yourself first!

1. **Vague hint:** The bug happens *during* the flip-back wait. What could the click handler check, as its very first line, to know "not now"?
2. **Warmer:** Give the game a `phase` variable: `'idle'`, `'oneUp'`, `'checking'`, `'won'`. Set `phase = 'checking'` when the second card flips; back to `'idle'` after the compare/flip-back finishes. First line of the handler: `if (phase === 'checking') return;`
3. **Restructure the state:** make cards data — `{ id, emoji, face }` with `face` one of `'down' | 'up' | 'matched'` — and one `render()` that redraws the board from the array. Handlers change data, then call `render()`.
4. **Straighten the async:** write `const sleep = (ms) => new Promise(r => setTimeout(r, ms));` and make the flip logic an `async` function using `await sleep(800)` — compare, wait, flip back, all top-to-bottom.
5. **Fix the shuffle:** Fisher–Yates — loop `i` from the last index down to 1, pick a random `j` between 0 and `i`, swap `result[i]` and `result[j]`.

## 6. Understanding the refactored solution

**Cards are data; the phase is explicit:**

```js
state = {
  cards: faces.map((emoji, id) => ({ id, emoji, face: 'down' })),
  phase: 'idle',       // 'idle' | 'oneUp' | 'checking' | 'won'
  moves: 0,
};
```

Each card is `{ id, emoji, face }` — `face` is a tiny per-card state machine (`down | up | matched`), not a CSS class read back as truth. The whole game is one object, which is why "New game" is just `state = newGame()`.

**The race is closed at the door:**

```js
async function flipCard(id) {
  const card = state.cards.find((c) => c.id === id);
  if (state.phase === 'checking' || state.phase === 'won') return;
  if (card.face !== 'down') return;
```

The *first* thing every click does is check the phase. During the flip-back wait, `phase` is `'checking'`, so the third click hits this wall and does nothing. The bug isn't carefully guarded against with flags and luck — the corrupting sequence has **no code path to happen through**. Same medicine as disabling a Buy button while the purchase is in flight.

**Straight-line async:**

```js
state.phase = 'checking';
state.moves++;
render();

const [a, b] = faceUpCards();
if (a.emoji === b.emoji) {
  a.face = 'matched'; b.face = 'matched';
} else {
  await sleep(FLIP_BACK_MS);
  a.face = 'down'; b.face = 'down';
}
state.phase = allMatched ? 'won' : 'idle';
```

Compare, maybe wait, flip back, reopen the game — one readable top-to-bottom story in one function, instead of logic split across a handler and a timer callback. And because the phase is set to `'checking'` right before and released right after, the busy window is *visibly* wrapped.

**An honest shuffle:**

```js
for (let i = result.length - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  [result[i], result[j]] = [result[j], result[i]];
}
```

Fisher–Yates: every arrangement equally likely, and the comparator contract of `sort` is no longer being abused. (The `[a, b] = [b, a]` trick is a **destructuring swap** — no temp variable needed.)

**Render draws everything from data:** class names are *derived* from `card.face`, the status line from `phase` and `moves`. The DOM is a picture of the state, repainted after every change — never the storage.

## 7. Words you learned (glossary)

- **CSS class** — a style label on an element; rules decide how labeled elements look.
- **className** — the JS property holding an element's class labels.
- **Closure** — a function remembering the variables around its creation.
- **setTimeout** — schedule a function to run later; the program continues meanwhile.
- **The "meanwhile"** — the gap while async work is pending, during which users can still act.
- **Race condition** — a bug where correctness depends on which of two events happens first.
- **Bug window** — the time span in which the race can strike (here: 800ms).
- **Promise / async / await** — a future value / a promise-returning function / pause until settled.
- **sleep(ms)** — a promise that resolves after ms; `await sleep(800)` is a readable pause.
- **Phase** — the single named mode the app is in; "busy" made checkable.
- **State machine** — explicit states + allowed moves; here both the game and each card have one.
- **Unrepresentable** — a bad situation with no code path leading to it.
- **State-in-DOM** — using elements/classes as your data store (fragile, especially with async).
- **Render pattern** — change data, then repaint the whole view from it.
- **Biased shuffle** — a shuffle where some orders come up more often (`sort(random)`).
- **Fisher–Yates** — the standard unbiased shuffle algorithm.
- **Comparator contract** — sort's requirement that comparisons stay consistent.
- **Destructuring swap** — `[a, b] = [b, a]` to exchange two values.

## 8. Experiments to try on the plane (no internet needed)

1. **Trigger the race.** In `original.html`, change 800 to 3000 to widen the bug window, reload, flip two non-matching cards, then click two more during the wait. Expected: stuck cards, wrong behavior — an easy, repeatable corruption. Try the same on the refactor with `FLIP_BACK_MS = 3000`. Expected: mid-wait clicks do nothing.
2. **Watch the phase move.** In the refactor's `flipCard`, add `console.log(state.phase)` as the first line, and play a round with the console open (F12). Expected: `idle`, `oneUp`, then during the wait every click prints `checking` and bounces.
3. **Cheat at the original.** Drag-select across the face-down board (or view source). Expected: the emojis appear in the selection highlight. Check the refactor: `color: transparent` beats select-highlight in most browsers, but view-source still reveals faces — a reminder that *real* secrecy can't live in the page at all.
4. **Measure the shuffle bias.** In a scratch file (Node works), shuffle `[1,2,3]` 6000 times with `sort(() => Math.random() - 0.5)` and count how often each of the 6 orderings appears; repeat with Fisher–Yates. Expected: sort's counts are visibly lopsided (some hundreds apart); Fisher–Yates hovers near 1000 each.
5. **Add a pairs counter.** In `render`, compute `state.cards.filter(c => c.face === 'matched').length / 2` and show `Pairs: X/6` in the status line. Expected: a live counter added purely in render — no action logic touched, because all truth already lives in `state`.
