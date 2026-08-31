# 📘 Learning Guide: Event Handlers

*Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.*

## 1. What are we building?

A small demo page with several buttons and a running log. You click things — a "log a click" button, three size buttons (small / medium / large), a "submit" button inside a form, and a "disarm" button that sits inside a clickable row. Every click adds a line of text to a log at the bottom of the page, so you can see exactly what fired.

The catch: in the original version, some clicks misbehave. The submit button reloads the whole page (wiping your log), and clicking "disarm" *also* triggers "row selected". This project is about why.

## 2. Concepts you need first

### A function is a value

In JavaScript, a function is a thing you can hold, pass around, and hand to someone else — just like a number or a string. Writing the function's name *refers* to it. Adding parentheses `()` *runs* it.

```js
function greet() { return 'hi'; }

const a = greet;    // a is now the function itself (not run yet)
const b = greet();  // b is 'hi' — the function RAN, b holds its result
```

This one distinction is the heart of this whole project. `greet` is a recipe. `greet()` is the cooked meal.

### Arrow functions

An arrow function is a short way to write a function. These two are the same idea:

```js
function double(x) { return x * 2; }
const double = (x) => x * 2;   // arrow version
```

`() => say('hi')` means "a brand-new tiny function that, *when run later*, will call `say('hi')`". Nothing runs when you write it — only when someone calls it.

### Event handlers

An *event* is something that happens in the browser: a click, a keypress, a form submit. An *event handler* is a function you give the browser and say "run this when the event happens." In React you attach handlers with props like `onClick`:

```jsx
<button onClick={sayHello}>hi</button>
```

Note: you pass the *function itself* (`sayHello`), not a call (`sayHello()`). React stores it and calls it later, at click time.

### The event object

When your handler runs, the browser hands it one argument: an object describing what happened. People usually name it `event` or `e`.

```jsx
function handleClick(event) {
  console.log(event.target); // the element that was clicked
}
```

It also carries two important *methods* (functions attached to an object): `event.preventDefault()` and `event.stopPropagation()`. More on both below.

### Default browser actions and `preventDefault`

Some HTML elements do things on their own, with zero JavaScript. A `<form>`'s built-in behavior on submit is: *send the data and navigate to a new page*. In a single-page React app, "navigate" means a full page reload — all your React state is destroyed. `event.preventDefault()` says "skip your built-in behavior; I'll handle this myself."

```jsx
function handleSubmit(event) {
  event.preventDefault(); // no reload
  // ...do your own thing
}
```

### Event bubbling and `stopPropagation`

When you click a button that sits *inside* a div, the click event doesn't stop at the button. It travels upward — button, then the div, then that div's parent, all the way to the top. This is called *bubbling*. Any ancestor with its own `onClick` will also fire.

Bubbling is usually helpful (one listener on a list can hear clicks on every row). But sometimes an inner button needs to say "this click is mine alone":

```jsx
function handleInnerClick(event) {
  event.stopPropagation(); // parents will NOT hear this click
}
```

### Rendering, and why "runs during render" is bad

*Rendering* is React running your component function to figure out what the screen should look like. It happens on first load and again after every state change. Anything written directly in your JSX braces runs *during* render. So `onClick={say('boom')}` runs `say('boom')` while React is still drawing — not on a click at all. If that call changes state, React re-renders, which runs it again... forever. That's an *infinite render loop*.

### Basics assumed here

Components, props, JSX (the HTML-looking syntax inside JavaScript), and `useState` (React's way to store values that change) — you've seen these. Quick refresher on `useState`:

```jsx
const [log, setLog] = useState([]); // log = current value, setLog = change it
setLog((l) => [...l, 'new line']);  // update using the previous value
```

The `(l) => [...l, msg]` form is called an *updater function*: React hands you the latest value `l`, and `[...l, msg]` builds a new array with one more item (`...` copies the old items — it's called the spread operator).

## 3. Walking through the original code

The file starts by loading React from the internet (see section 8), then defines one component:

```jsx
const [log, setLog] = useState([]);
const [armed, setArmed] = useState(false);
const say = (msg) => setLog((l) => [...l, msg]);
```

`log` is an array of strings shown at the bottom. `say('hello')` appends a line to it. `armed` is a true/false flag for the last demo.

**Blooper 1 (commented out so the page survives):**

```jsx
{/* <button onClick={say('boom')}>calls on render!</button> */}
```

This *calls* `say('boom')` during render and gives `onClick` its result. Calling `say` changes state, state change triggers a render, the render calls it again — infinite loop. React detects it and stops with an error.

**Blooper 2 — works, but cargo-culted:**

```jsx
<button onClick={() => say('clicked')}>log a click</button>
```

This is actually fine! The arrow wraps the call so nothing runs until click time. The "blooper" is that the author never understood *why* the arrow fixes it — so the mistake keeps coming back elsewhere.

**Blooper 3 — passing arguments:**

```jsx
{['small', 'medium', 'large'].map((size) => (
  <button key={size} onClick={() => say(`chose ${size}`)}>{size}</button>
))}
```

`map` turns each string in the array into a button (each list item needs a unique `key` prop so React can track it). The arrow is the correct way to pass an argument to a handler — again written by imitation, not understanding.

**Blooper 4 — form submit with no preventDefault:**

```jsx
<form onSubmit={() => say('submitted (you will never read this)')}>
  <button type="submit">submit (reloads the page!)</button>
</form>
```

The handler runs, then the form's default behavior fires: the page navigates, reloads, and all state — including the log line just added — vanishes.

**Blooper 5 — nested click targets:**

```jsx
<div onClick={() => say('row selected')}>
  row (click selects) — armed: {String(armed)}
  <button onClick={() => { setArmed(false); say('disarmed'); }}>
```

The button lives inside the div. A click on the button bubbles up to the div, so both handlers fire: the log shows "disarmed" *and* "row selected".

## 4. What's wrong with it (in beginner terms)

1. **`onClick={say('boom')}` — the infinite loop.** On screen: the page never appears. React draws, `say` runs, state changes, React draws again, forever, until React gives up and prints an error. The fix is one character pair: don't put `()` after the function name in JSX.
2. **The arrow fix without understanding.** Nothing visibly breaks *here* — that's the trap. The author "fixed" it by sprinkling arrows, so next time an arrow feels unnecessary they'll write `onClick={f(x)}` again and reintroduce bug 1.
3. **Submit reloads the page.** On screen: click submit, the page flashes white, reloads, and the entire log is empty. The message "submitted" never appears because the page it was drawn on was thrown away.
4. **Disarm also selects the row.** On screen: you click "disarm" and the log prints TWO lines — "disarmed" then "row selected" — even though you never clicked the row itself. That's bubbling doing its default thing where you didn't want it.

## 5. Try it yourself first!

Before reading the solution, open `original.html` in an editor and try to fix it:

1. **Vague hint:** every fix in this project is about *when* a function runs and *how far* an event travels.
2. **Blooper 1:** what's the difference between `say` and `say('boom')`? Which one is a function?
3. **Blooper 4:** the handler receives an `event` object. The event has a method that cancels the browser's built-in submit behavior. Call it first.
4. **Blooper 5:** the button's handler also receives an `event`. There's a method that stops the click from traveling up to the row.
5. **Style:** try moving the inline arrows into named functions like `handleSubmit(event)` — does the JSX get easier to read?

## 6. Understanding the refactored solution

The refactor keeps the same page but names every handler and states the rule as a comment:

```jsx
// onClick={f}          -> called on click. right.
// onClick={f()}        -> f ran during render. wrong.
// onClick={() => f(x)} -> f(x) on click. right — and HOW you pass arguments.
```

**Named handlers.** Instead of anonymous arrows in the JSX, the logic lives in functions named `handleLogClick`, `handleChooseSize`, `handleSubmit`, `handleDisarm`. The `handleX` naming is a convention (a habit everyone shares, not a rule the computer enforces). Named functions are easier to read, reuse, and see in error messages.

**The submit fix:**

```jsx
function handleSubmit(event) {
  event.preventDefault(); // the form's default is NAVIGATION — opt out
  say('submitted');
}
```

The form element stays (which is good: pressing Enter in a form still submits), but the reload is cancelled. Log line survives.

**The disarm fix:**

```jsx
function handleDisarm(event) {
  event.stopPropagation(); // this click is MINE
  setArmed(false);
  say('disarmed');
}
```

Clicking disarm now logs only "disarmed". Clicking the row background still logs "row selected" — bubbling is only stopped at the one button that needed it.

**Passing arguments stays an arrow:** `onClick={() => handleChooseSize(size)}`. That's not a workaround — it is *the* way to hand an argument to a handler.

## 7. Words you learned (glossary)

- **Event** — something that happens in the browser (click, keypress, submit).
- **Event handler** — a function you register to run when an event happens.
- **Render** — React running your component function to compute the screen.
- **Re-render** — running it again after state changes.
- **Infinite render loop** — a render that changes state, causing another render, forever.
- **Arrow function** — short function syntax: `(x) => x * 2`.
- **Event object** — the object describing an event, passed to your handler.
- **Default action** — an element's built-in behavior (a form navigates on submit).
- **`preventDefault()`** — cancels the default action.
- **Bubbling** — an event traveling upward from the clicked element through its ancestors.
- **`stopPropagation()`** — stops the event from bubbling further up.
- **Updater function** — `setX((old) => new)`: update state based on the latest value.
- **Spread operator (`...`)** — copies items of an array/object into a new one.
- **`map`** — array method that turns each item into something new (here, buttons).
- **`key` prop** — a unique label React needs on each item in a rendered list.
- **Convention** — a shared habit (like naming handlers `handleX`), not an enforced rule.
- **Cargo-culting** — copying a pattern without understanding why it works.

## 8. Experiments to try on the plane (no internet needed)

One note first: these HTML files load React from a CDN (a content delivery network — someone else's server), so the *page* only runs with internet on first load. If you opened the pages before your flight, your browser may have them cached; otherwise, read and edit the code now and run it when you land. The edits below are still worth writing offline — predicting the outcome is the exercise.

1. **Un-comment blooper 1** in `original.html`. Prediction: the page fails to render; the browser console shows React's "too many re-renders" error. Comment it back and change it to `onClick={() => say('boom')}` — now it's a working button.
2. **Delete `event.preventDefault()`** from `handleSubmit` in the refactor. Prediction: clicking submit flashes and reloads the page; the log resets to empty.
3. **Delete `event.stopPropagation()`** from `handleDisarm`. Prediction: clicking disarm logs both "disarmed" and "row selected".
4. **Add an `onClick={() => say('outer div')}` to the outermost `<div>`** in the refactor. Prediction: *every* click anywhere logs "outer div" too (bubbling reaches the top) — except clicks on disarm, which stop early.
5. **Change `onClick={handleLogClick}` to `onClick={handleLogClick()}`.** Prediction: "clicked" appears in the log once per render without any clicking, and the button does nothing — the function already ran during render and `onClick` got `undefined` (its return value).
