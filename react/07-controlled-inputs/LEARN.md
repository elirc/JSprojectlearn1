# 📘 Learning Guide: Controlled Inputs

*Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.*

## 1. What are we building?

A signup form: a username box, an email box, a "fill demo data" button, a Submit button, and a message line that shows "Submitted: ada / ada@analytical.engine" after submitting.

The refactored version does two extra things as you type: a live preview line ("Hi, ada!") updates with every keystroke, and the Submit button stays disabled — grayed out and unclickable — until the username has at least 3 characters and the email contains an `@`. The original doesn't have those features. Not because the author was lazy: with the original's approach they are *impossible*. That impossibility is the lesson.

## 2. Concepts you need first

Components, JSX, props, `useState`, re-rendering, and event handlers are taught from scratch in project 01's LEARN.md; derived values in 02's. New material below.

### The DOM holds its own input state

An `<input>` element is special: the browser gives it built-in memory. Type into any input on any webpage and the browser stores that text *inside the DOM element itself* — no JavaScript needed. That's convenient, and it's exactly the trap here: there are now potentially TWO places your form data can live — React state, and the DOM's own memory.

### `document.getElementById`

The old-school way to grab a DOM element from anywhere in the page:

```js
const el = document.getElementById('username'); // find <input id="username">
el.value            // read what's typed in it
el.value = 'ada';   // overwrite what's shown in it
```

This works in React apps too — the elements are real. But it reads/writes the *DOM's* memory, going behind React's back. (jQuery, an older library, made this style famous; "jQuery-style" means exactly this reach-in-and-poke approach.)

### Source of truth

The **source of truth** for a piece of data is the one place it authoritatively lives. Everything else should be a copy or a view of it. When data lives in two places at once — React state AND a DOM input — you have two sources of truth, and sooner or later they disagree. React's whole model assumes: state is the truth, the screen is a picture of it.

### Uncontrolled vs controlled inputs

An input with no `value` prop is **uncontrolled**: the DOM keeps the text; React neither knows nor cares. (Project 03's meal boxes were uncontrolled — that's why text stuck to DOM rows.)

A **controlled input** hands both directions to React:

```jsx
const [name, setName] = useState('');
<input value={name} onChange={(e) => setName(e.target.value)} />
```

- `value={name}` — the input *displays* React state. Always.
- `onChange={...}` — every keystroke fires this; `e.target.value` is the box's new text; we store it in state, which re-renders, which redraws the input with the new value.

The loop is: type → event → setState → re-render → input shows state. The input has no independent memory anymore — it *cannot* disagree with React. One source of truth.

(A warning you'd otherwise meet the hard way: `value` without `onChange` makes a read-only box — React keeps redrawing the old state over your typing.)

### The `disabled` attribute

`<button disabled={true}>` renders a grayed-out, unclickable button. Feed it any boolean expression: `disabled={!isValid}`.

### Forms, Enter, and `preventDefault`

Wrapping inputs in `<form onSubmit={...}>` gives you a browser freebie: pressing Enter in any field submits. But a form's *default action* is to navigate/reload the page — wiping all React state. So every React submit handler starts with `event.preventDefault()` ("skip your built-in behavior"). One more trap: **any button inside a form defaults to `type="submit"`**. A helper button that shouldn't submit needs an explicit `type="button"`.

### String checks used here

```js
username.length >= 3      // at least 3 characters
email.includes('@')       // does the string contain an @?
```

Crude validation, deliberately — the point is where the check *runs*, not how smart it is.

## 3. Walking through the original code

One piece of React state — and it's not the form data:

```jsx
const [message, setMessage] = useState('');
```

Only the after-submit message lives in React. The username and email live... nowhere in this code. They live in the browser's DOM memory.

```jsx
function handleSubmit() {
  const username = document.getElementById('username').value;
  const email = document.getElementById('email').value;
  setMessage(`Submitted: ${username} / ${email}`);
}
```

At submit time, reach into the page by id and *pull* the values out. This is the "ask the DOM what happened" style — React as a fancy way to render some jQuery.

```jsx
function fillDemoData() {
  document.getElementById('username').value = 'ada';
  document.getElementById('email').value = 'ada@analytical.engine';
}
```

Writing is DOM surgery too: shove text directly into the elements. React never hears about it.

```jsx
<input id="username" placeholder="username" />
<input id="email" placeholder="email" />
<button onClick={fillDemoData}>fill demo data</button>
<button onClick={handleSubmit}>Submit</button>
```

Uncontrolled inputs (no `value`, no `onChange`) with ids for the surgery. Note there's no `<form>` — Enter doesn't submit. The file's comment spells out what's missing: live preview? Impossible — React has no idea what's typed. Disable-until-valid? Same problem.

## 4. What's wrong with it (in beginner terms)

1. **React is blind to the form.** Rendering happens when state changes; typing changes no state; so nothing you type can ever affect the screen elsewhere. Want "Hi, ada!" to appear as the user types? There is no place to put that code. The feature isn't hard — it's *unreachable*.
2. **The DOM copy survives by luck.** Suppose a designer adds a "hide form" toggle that unmounts the form while collapsed. User types their username, collapses, expands — **the fields are blank**. React rebuilt the inputs from *its* truth, which was "empty inputs with placeholders." The typed text was in the DOM nodes that got destroyed. No error appears; the user just retypes, annoyed. Same story if any ancestor's `key` changes (project 03!).
3. **Ids are global.** `document.getElementById('username')` searches the *whole page*. Render two signup forms (a modal and a footer form, say) and both forms' submit buttons read the FIRST `#username` on the page. Form two submits form one's data. The component silently depends on being the only copy of itself — which is the opposite of what components are for.
4. **Two sources of truth always end in a lie.** Today the DOM's copy and React's picture happen to match. Every feature that touches the form now has to keep them matching by hand. One of them eventually lies; the README's phrasing is worth keeping.

## 5. Try it yourself first!

1. **Vague hint:** the fix inverts the direction of information. Instead of asking the DOM "what's in you?" at submit time, arrange to *already know* — at every moment.
2. **More specific:** give each input its own `useState`. Wire each input so it *displays* that state and *updates* it on every keystroke. Two props per input.
3. **Kill the surgery:** rewrite `fillDemoData` with no `document.` anywhere. If the inputs display state, what do you change to change the inputs?
4. **Cash in:** once state knows everything, add the live preview (`{username && ...}` or a ternary) and `disabled={!isValid}` with `isValid` computed during render. Each is one line.
5. **Polish:** wrap it in a real `<form onSubmit={handleSubmit}>`, call `event.preventDefault()`, and mark the demo button `type="button"`. Test the Enter key.

## 6. Understanding the refactored solution

**The truth moves into React:**

```jsx
const [username, setUsername] = useState('');
const [email, setEmail] = useState('');
const [message, setMessage] = useState('');
```

Three strings. The form's contents ARE state now. (Ten fields would mean ten `useState`s — project 12 shows the one-object upgrade for big forms.)

**The controlled pair, twice:**

```jsx
<input value={username}
       onChange={(e) => setUsername(e.target.value)}
       placeholder="username" />
```

Display state; store keystrokes into state. This two-prop pattern is *the* fundamental React form idiom — you'll type it hundreds of times.

**Derived validity:**

```jsx
const isValid = username.length >= 3 && email.includes('@');
```

Not state! Recomputed on every render from the real state. It can never be stale, never forget to update. Project 09's drumbeat: never store what you can compute.

**The unlocked features — one line each, as promised:**

```jsx
<p style={{ color: '#666' }}>
  {username ? `Hi, ${username}!` : 'Live preview appears here'}
</p>
...
<button type="submit" disabled={!isValid}>
  {isValid ? 'Submit' : 'Submit (fill the form first)'}
</button>
```

The preview re-renders every keystroke because every keystroke is a state change now. The submit button even explains itself while disabled.

**Demo fill becomes trivial:**

```jsx
function fillDemoData() {
  setUsername('ada');
  setEmail('ada@analytical.engine');
}
```

Set state; the inputs follow, because they render *from* it. Programmatic form control came free. Notice the button is `type="button"` — without that, clicking it inside a form would trigger a submit.

**The real form:**

```jsx
function handleSubmit(event) {
  event.preventDefault(); // the form's default is navigation — opt out
  setMessage(`Submitted: ${username} / ${email}`);
}
...
<form onSubmit={handleSubmit}>
```

Enter now submits from either field; the reload is cancelled; no ids anywhere, so a page can hold twenty of these forms without a collision.

The closing comment names the principle: data flows down (`value`), events flow up (`onChange`). Inputs are not an exception to React's model — they're its clearest example.

## 7. Words you learned (glossary)

- **Source of truth** — the single authoritative home of a piece of data.
- **Uncontrolled input** — the DOM keeps the text; React doesn't know it (no `value`/`onChange`).
- **Controlled input** — `value={state}` + `onChange={setState}`; the input displays state and cannot disagree with it.
- **`document.getElementById`** — global DOM lookup by id; behind React's back.
- **jQuery-style** — read/poke the DOM directly; the pre-React way.
- **DOM surgery** — writing values straight into DOM elements.
- **`e.target.value`** — in a change handler, the input's current text.
- **Derived value** — computed during render (`isValid`), never stored.
- **`disabled`** — boolean attribute that grays out a button/input.
- **`<form onSubmit>`** — fires on button click *and* Enter key.
- **Default action / `preventDefault()`** — a form's built-in navigate-on-submit, and how to cancel it.
- **`type="button"`** — opt a button inside a form out of submitting.
- **Unmount** — React removing an element; DOM-held text dies with it.
- **Global id collision** — two elements sharing an id; `getElementById` finds only the first.

## 8. Experiments to try on the plane (no internet needed)

Note once: these pages load React from a CDN, so *running* needs internet on first load (a previously opened page may have React cached). Reading and editing are fully offline — predict, then verify when you can.

1. **Prove React's blindness (original):** type "ada" into username, then click "fill demo data", then Submit. Prediction: everything *seems* fine — but now add `<p>React thinks: {message}</p>` above the inputs and try to add `<p>Typing: ???</p>`. There is nothing to put at `???`. The feature has no handle to grab.
2. **Break the demo button (refactor):** remove `type="button"` from the fill-demo button. Prediction: clicking it fills the fields AND submits the form immediately (it became a submit button) — "Submitted: ada / ..." appears in one click. Sneaky default, now burned into memory.
3. **Create the read-only trap:** in the refactor, delete the username input's `onChange` but keep `value={username}`. Prediction: the box refuses all typing (every keystroke is instantly overwritten by the unchanged state), and the console warns about a controlled input without onChange.
4. **Two forms on one page (original):** duplicate the whole `<div>` contents so the ids appear twice, or simpler — imagine it: `getElementById('username')` returns the *first* match, so form two submits form one's text. In the refactor, rendering `<App />`-like forms twice is automatically safe: each has its own state, no ids at all.
5. **Add a character counter (refactor):** under the username input, add `<small>{username.length}/20</small>`. Prediction: counts up live as you type. Total cost: one line — because the truth already lives where rendering can see it.
