# 📘 Learning Guide: Component Extraction

*Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.*

## 1. What are we building?

A "Team" page. You see a heading, a text box, and three cards — one per team member. Each card shows a round avatar picture, a name in bold, sometimes a blue "online" badge, and a one-line bio. Typing in the text box filters the cards: type "ada" and only Ada Lovelace's card stays on screen.

Both versions look identical in the browser. The difference is entirely in how the code is organized — and how painful it is to change.

## 2. Concepts you need first

This is project 01, so we start from zero. Take your time here.

### What is React?

React is a JavaScript library (a collection of pre-written code you borrow) for building user interfaces. Its core deal: **you describe what the screen should look like, and React makes the browser match**. You never say "add this div, now change that text" — you say "the screen is a heading plus these cards," and React figures out the rest.

### The DOM

The DOM (Document Object Model) is the browser's live, in-memory copy of your page — every heading, button, and image as an object JavaScript can touch. Plain JavaScript changes pages by poking the DOM directly. React pokes it *for* you.

### What is a component?

A component is a plain JavaScript function that returns a description of some UI. That's it — a function.

```jsx
function Hello() {
  return <p>Hello, world!</p>;
}
```

By convention (a shared habit, not a rule the computer enforces), component names start with a Capital Letter. Once defined, you use a component like a custom HTML tag: `<Hello />`.

### JSX

That `<p>Hello</p>` inside JavaScript is not normal JavaScript — it's JSX, a syntax extension that lets you write HTML-looking markup inside your code. The browser can't read JSX directly; a translator converts it to regular JavaScript first. In this project that translator is Babel, loaded in a `<script>` tag (more on that in section 3).

Inside JSX, curly braces `{ }` mean "escape back to JavaScript here":

```jsx
const name = 'Ada';
const greeting = <p>Hello, {name}!</p>; // shows: Hello, Ada!
```

Two JSX quirks you'll see: `class` is written `className` (because `class` is a reserved word in JavaScript), and styles can be given as an object: `style={{ borderRadius: 24 }}` — the outer braces mean "JavaScript here," the inner braces are the object itself.

### Props

Props (short for "properties") are the inputs you pass to a component, written like HTML attributes. The component receives them all bundled into one object.

```jsx
function Shout({ word }) {          // { word } pulls "word" out of the props object
  return <p>{word.toUpperCase()}!</p>;
}
// used as:
<Shout word="hello" />              // shows: HELLO!
```

The `{ word }` in the parentheses is called *destructuring* — a shortcut that unpacks a named field from an object.

### State and `useState`

State is data that can change while the app runs — like the text currently typed in the filter box. React gives you state with the `useState` function (functions React provides that start with `use` are called *hooks*):

```jsx
const [filter, setFilter] = useState('');
```

This line means: create a piece of state that starts as `''` (empty string). `filter` is its current value; `setFilter` is the only legal way to change it. Calling `setFilter('ada')` does two things: stores the new value AND tells React to re-run your component so the screen updates.

### Rendering and re-rendering

*Rendering* is React calling your component function to learn what the screen should be. It happens once at the start, and again every time state changes (a *re-render*). This is why typing in the box updates the cards: each keystroke calls `setFilter`, which triggers a re-render, which recomputes which cards to show.

### Event handlers

An event is something that happens (a click, a keypress). An event handler is a function you hand to React to run when the event occurs. On an input box, `onChange` fires every keystroke:

```jsx
<input value={filter} onChange={(e) => setFilter(e.target.value)} />
```

`e` is the *event object* (a description of what happened); `e.target` is the element it happened on; `e.target.value` is the text now in the box. `(e) => ...` is an *arrow function* — a short way to write a function.

### Showing something conditionally with `&&`

In JavaScript, `a && b` means "if `a` is truthy, the result is `b`." JSX uses this to show things only sometimes:

```jsx
{member.online && <span>online</span>}
```

Read it as: "if this member is online, render the badge; otherwise render nothing."

### Arrays, objects, `filter`, and `map`

An *object* groups named values: `{ name: 'Ada', online: true }`. An *array* is an ordered list: `[a, b, c]`. Two array methods do the heavy lifting in this project:

```js
const nums = [1, 2, 3, 4];
nums.filter((n) => n > 2);   // [3, 4]  — keeps items that pass a test
nums.map((n) => n * 10);     // [10, 20, 30, 40] — transforms each item
```

In React, `map` turns an array of data into an array of components — that's how "three members" becomes "three cards" without pasting.

### The `key` prop

When you render a list with `map`, React asks you to label each item with a unique `key` so it can track which is which across re-renders: `<MemberCard key={member.id} ... />`. Project 03 is entirely about why this matters; for now, just know lists want keys.

### Template literals

Backtick strings that can embed values: `` `https://site.com/${userId}` `` — the `${...}` part is filled in with the variable's value.

## 3. Walking through the original code

The file's `<head>` loads three scripts from the internet: React itself, ReactDOM (the part that talks to the browser's DOM), and Babel (the JSX translator). Then `<script type="text/babel">` marks our code as JSX for Babel to translate.

```jsx
const { useState } = React;
```

This unpacks the `useState` hook from the global `React` object (in a real project you'd write an `import` instead — same idea).

```jsx
function App() {
  const [filter, setFilter] = useState('');
```

One single component, `App`, renders the entire page. It has one piece of state: the filter text, starting empty.

```jsx
<input
  placeholder="filter by name..."
  value={filter}
  onChange={(e) => setFilter(e.target.value)}
/>
```

The text box. Every keystroke stores the new text in state, which re-renders `App`, which re-evaluates everything below.

```jsx
{'Ada'.toLowerCase().includes(filter.toLowerCase()) && (
  <div className="card">
    <img src="https://i.pravatar.cc/48?u=ada" width="48"
         style={{ borderRadius: 24, verticalAlign: 'middle' }} />
    <strong style={{ marginLeft: 8 }}>Ada Lovelace</strong>
    <span style={{ marginLeft: 8 }} className="badge">online</span>
    <p>First programmer. Writes notes longer than the program.</p>
  </div>
)}
```

One member card. The condition says: if the name "Ada" contains the filter text (both lowercased so capitalization doesn't matter), render this card. `borderRadius: 24` on a 48-pixel image makes a circle.

Then this whole block is **pasted two more times** — once for Grace (no badge, she's offline), once for Alan. Look closely at Alan's:

```jsx
<img src="https://i.pravatar.cc/48?u=alan" width="48"
     style={{ borderRadius: 12, verticalAlign: 'middle' }} />
```

`borderRadius: 12`, not 24. That's a real bug hiding in the paste — Alan's avatar is a rounded square while the others are circles.

Finally:

```jsx
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
```

This finds the empty `<div id="root">` in the HTML and tells React: draw `App` inside it. Every React page has one line like this.

## 4. What's wrong with it (in beginner terms)

The page *works*. The problems are all about what happens when you touch the code.

1. **The paste has already drifted.** The avatar markup was copied three times, and copy 3 came out different (`borderRadius: 12`). On screen: two circular avatars and one squarish one. Nobody typed "make Alan square" — the bug is a typo in a paste, the kind of bug that appears whenever the same code exists in multiple places.
2. **Every change is three changes.** Want the filter to also match bios? You must edit three nearly-identical conditions. Miss one, and filtering behaves differently for one member — a bug that only shows for certain search terms. Maddening to track down.
3. **Adding a member is 15 lines of careful copying.** A fourth teammate means duplicating a card block and editing the name, image, badge, and bio in the right spots — four chances to slip, like the borderRadius already did.
4. **You can't tell what the page IS at a glance.** `App` is 40 lines of tangled markup. There's no line of code that says "this page is a list of member cards" — you have to read all of it to figure that out.

## 5. Try it yourself first!

Open `original.html` in an editor and try the refactor before peeking:

1. **Vague hint:** the same 8 lines appear three times. What do you do in plain JavaScript when the same logic appears three times? Same answer here.
2. **Start with data:** could the three members live in an array of objects — `{ id, name, online, bio }` — instead of being welded into the markup?
3. **Extract a component:** write a function `MemberCard({ member })` that returns one card's JSX, reading everything from `member`. Can `App` then just use `<MemberCard member={...} />` three times?
4. **Go further:** use `.map` over your array so `App` doesn't even mention individual members. Don't forget a `key`.
5. **The filter:** can the filtering become one `.filter(...)` call on the array, before the `map`, instead of three inline conditions?

## 6. Understanding the refactored solution

The refactor makes three moves, each one a named idea.

**Move 1 — content becomes data:**

```jsx
const TEAM = [
  { id: 'ada', name: 'Ada Lovelace', online: true,
    bio: 'First programmer. Writes notes longer than the program.' },
  ...
];
```

The *facts* about the team (names, bios, who's online) now live in a plain array, separate from the *look* of the page. Adding a member is one new row — no markup involved. ALL-CAPS `TEAM` is a convention meaning "constant data that never changes while running."

**Move 2 — repeated UI becomes components:**

```jsx
function Avatar({ userId }) {
  return (
    <img src={`https://i.pravatar.cc/48?u=${userId}`} width="48"
         style={{ borderRadius: 24, verticalAlign: 'middle' }} />
  );
}
```

The avatar exists exactly once now. Its `borderRadius` *cannot* drift between members, because there's only one place it's written. `MemberCard` does the same for the whole card, and handles the badge with `{member.online && <span ...>online</span>}` — the badge shows only for online members, driven by data instead of by remembering to paste it.

**Move 3 — App becomes a table of contents:**

```jsx
const visibleMembers = TEAM.filter((member) =>
  member.name.toLowerCase().includes(filter.toLowerCase()),
);
```

The filter logic exists once. Note that `visibleMembers` is not state — it's computed fresh during every render from `TEAM` plus `filter`. This is called a *derived value*: never store what you can compute. (Project 09 makes this the whole lesson.)

```jsx
{visibleMembers.map((member) => (
  <MemberCard key={member.id} member={member} />
))}
```

And the page body is one `map`. Read `App` top to bottom: heading, input, list of cards. Ten seconds to understand. "Filter by name *or bio*" is now a one-line change, applied uniformly to everyone.

**When should something become a component?** The README's test is worth memorizing: *would I otherwise paste this?* and *does it have a name I'd naturally say out loud?* ("the member card", "the avatar"). If yes to either, extract it.

## 7. Words you learned (glossary)

- **React** — a library for building UIs by describing what the screen should be.
- **Library** — pre-written code your program borrows.
- **DOM** — the browser's live object model of the page; what actually gets drawn.
- **Component** — a function that takes props and returns JSX describing some UI.
- **JSX** — HTML-looking syntax inside JavaScript; translated to real JS before running.
- **Babel** — the tool that translates JSX (here it runs in the browser tab).
- **Props** — the named inputs passed to a component, like HTML attributes.
- **Destructuring** — unpacking fields from an object: `function Card({ member })`.
- **State** — data that changes while the app runs, owned by a component.
- **`useState`** — hook that gives a component a state value and a setter for it.
- **Hook** — a React-provided function starting with `use`, called inside components.
- **Render / re-render** — React calling your component to compute the screen; again after state changes.
- **Event handler** — a function run when something happens (click, keystroke).
- **Event object (`e`)** — describes the event; `e.target.value` is an input's text.
- **Arrow function** — short function syntax: `(x) => x * 2`.
- **`&&` rendering** — `{cond && <Thing />}` shows Thing only when cond is truthy.
- **`filter` / `map`** — array methods: keep items passing a test / transform each item.
- **`key` prop** — unique label React needs on each item rendered from a list.
- **Derived value** — computed during render from other data, never stored.
- **Template literal** — backtick string with embedded values: `` `hi ${name}` ``.
- **Convention** — a shared habit (Capitalized components, ALL-CAPS constants).
- **CDN** — a content delivery network; someone else's server your page loads scripts from.

## 8. Experiments to try on the plane (no internet needed)

One note first: these HTML files load React from a CDN, so the *page* only runs with internet on first load. If you opened the pages before your flight, your browser may have cached React and they'll still run; otherwise, edit now and predict the outcome — that prediction is the real exercise. Reading and editing code needs no internet at all.

1. **Add a fourth member to `TEAM`** in the refactor (any `id`, `name`, `online`, `bio`). Prediction: a fourth card appears, perfectly styled, filterable — one data row, zero markup. Then imagine doing the same in `original.html` (15 lines of pasting).
2. **Fix Alan's avatar in the original**: change his `borderRadius: 12` to `24`. Prediction: all three avatars are now circles. Notice the refactor never needed this fix.
3. **Make the filter match bios too** in the refactor: change the filter test to `member.name.toLowerCase().includes(...) || member.bio.toLowerCase().includes(...)`. Prediction: typing "compiler" now shows Grace's card. One edit. In the original this would be three edits.
4. **Break the badge on purpose**: in the refactor, change `member.online &&` to `member.online ||`. Prediction: the badge appears on *everyone* who is offline too (actually: for online members `||` short-circuits to `true`, rendering nothing visible; for offline members it renders the badge) — a good puzzle in how `&&`/`||` pick which side to return.
5. **Delete the `key={member.id}`** from the `map`. Prediction: the page still looks the same, but the browser console shows a warning: "Each child in a list should have a unique key". Project 03 shows the real damage keys prevent.
