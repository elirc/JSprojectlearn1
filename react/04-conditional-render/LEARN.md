# 📘 Learning Guide: Conditional Rendering

*Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.*

## 1. What are we building?

An inbox header. The page shows "Inbox", three buttons — "load 3", "load 0", "load (fails)" — and, below them, a message area that changes depending on what happened:

- While loading: "Loading..."
- If the fake server failed: "server exploded" in red
- If there are no messages: "No messages."
- If exactly one: "One message: msg 1"
- Otherwise: a bullet list of messages

There's also supposed to be a blue unread badge that shows *only* when there are messages. In the original, click "load 0" and a lonely `0` appears at the bottom of the page — a real, famous React bug you get to catch red-handed.

## 2. Concepts you need first

Components, JSX, props, `useState`, event handlers, and `map`/`key` are taught in project 01's LEARN.md. New material below.

### Expressions vs statements

This distinction is the heart of the project. An **expression** is code that produces a value: `2 + 2`, `x ? 'a' : 'b'`, `user.name`. A **statement** is code that *does* something but isn't itself a value: `if (...) {...}`, `return ...`, `for (...)`.

Inside JSX curly braces you may ONLY put expressions. This is illegal:

```jsx
<div>{ if (loading) { <p>...</p> } }</div>   // ✗ syntax error — if is a statement
```

So people cram branching into the two conditional *expressions* JavaScript has: `? :` and `&&`. Fine for one branch. Painful for five.

### The ternary in JSX

```jsx
{isLoading ? <p>Loading...</p> : <p>Ready</p>}
```

"If loading, this; otherwise, that." One ternary is perfectly readable. But ternaries can nest — `a ? x : b ? y : z` — and each level buries the reader deeper. That nested shape is called a **ternary tower** here.

### `&&` in JSX — and what it really returns

`a && b` does NOT return true/false. It returns **`a` itself if `a` is falsy, otherwise `b`**. (Falsy values: `false`, `0`, `''`, `null`, `undefined`, `NaN`. Everything else is truthy.)

```js
true && 'hi'   // 'hi'
false && 'hi'  // false
0 && 'hi'      // 0    ← remember this one
```

React renders whatever the expression produces — and it has a skip-list: `false`, `null`, `undefined`, and `true` render as *nothing*. But **`0` is not on the skip-list**. React happily prints a `0`. Combine those facts and you have this project's bug.

### Early returns (guard clauses)

*Inside a function*, statements are allowed — including multiple `return`s:

```jsx
function Status({ loading, error }) {
  if (loading) return <p>Loading...</p>;   // handled — leave now
  if (error) return <p>Failed!</p>;        // handled — leave now
  return <p>All good.</p>;                 // the normal case, unindented
}
```

Each `if ... return` is a **guard clause**: deal with one special case and exit. Reading order = priority order. This is exactly the shape a ternary tower wants to be.

### `return null` — rendering nothing on purpose

A component that returns `null` puts nothing on the page. It's the official way for a component to say "under these conditions, I don't appear":

```jsx
function Badge({ count }) {
  if (count === 0) return null;   // nothing to show
  return <p>{count} unread</p>;
}
```

### The bits this demo uses to fake a server

`setTimeout(fn, 600)` runs `fn` after 600 milliseconds — simulating a slow network. `Array.from({ length: n }, (_, i) => ...)` builds an array of `n` generated items (the `_` name means "I'm ignoring this argument"). `null` is JavaScript's "no value here" marker — the error state starts as `null` meaning "no error".

## 3. Walking through the original code

Three pieces of state describe the inbox:

```jsx
const [messages, setMessages] = useState([]);
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState(null);
```

The message list, a loading flag, and an error (or `null`). Keep half an eye on these three — the README calls them a problem for a later project.

```jsx
function load(count, fail) {
  setIsLoading(true);
  setError(null);
  setTimeout(() => {
    setIsLoading(false);
    if (fail) setError('server exploded');
    else setMessages(Array.from({ length: count }, (_, i) => `msg ${i + 1}`));
  }, 600);
}
```

A pretend fetch: switch on the loading flag, clear old errors, and 600ms later either set an error or set `count` fresh messages.

Now the centerpiece — try to read this cold:

```jsx
{isLoading ? (
  <p>Loading...</p>
) : error ? (
  <p style={{ color: 'red' }}>{error}</p>
) : messages.length === 0 ? (
  <p>No messages.</p>
) : messages.length === 1 ? (
  <p>One message: {messages[0]}</p>
) : (
  <ul>{messages.map((m) => <li key={m}>{m}</li>)}</ul>
)}
```

Five outcomes, four `?`s, four `:`s, all one expression. To know what renders you must mentally pair every `?` with its `:` while tracking three variables. It *works* — it's just hostile to readers, and every new case digs one level deeper.

And the badge:

```jsx
{messages.length && <p>🔵 {messages.length} unread</p>}
```

Intended: "show the badge only when there are messages." Actual: when `messages.length` is `0`, the expression `0 && ...` evaluates to `0`, and React prints it.

## 4. What's wrong with it (in beginner terms)

1. **The stray `0` on screen.** Click "load 0". The list area correctly says "No messages." — and just below it sits a bare `0`, like a typo nobody made. Walk the logic: `messages.length` is `0` → `0 && anything` is `0` → React renders numbers → a `0` appears on your page. No error, no warning. Every React developer ships this once; this demo lets you ship it for free.
2. **The ternary tower is unmaintainable.** Nothing is visibly broken — that's the trap. Now imagine your teammate asks: "add a special view for exactly two messages." You must find the right `:` in the chain, insert a new `? :` pair at the right depth, and not disturb the other four branches. Get one colon wrong and the error branch silently becomes the empty branch. The cost isn't today's render; it's every future edit.
3. **Three flags that can contradict each other.** `isLoading`, `error`, and `messages` are set independently. What does the UI mean when `isLoading` is true AND `error` is set? The code has an answer (loading wins — it's the first ternary), but nobody *chose* that. The refactor keeps this flaw honestly; project 20 fixes it properly.

## 5. Try it yourself first!

1. **Vague hint:** the tower's problem is that JSX only allows expressions. Where in your code ARE statements (like `if` and `return`) allowed?
2. **More specific:** move the whole five-way decision into a new component that receives `isLoading`, `error`, and `messages` as props. Inside a function body, write the branches the way you'd say them aloud.
3. **The badge:** the left side of `&&` must be a real boolean, never a count. Either compare (`messages.length > 0 && ...`) — or give the badge its own component that returns... what, when there's nothing to show?
4. **Test:** click all three buttons. "load 0" must show "No messages." and NO stray `0`. "load (fails)" must show red text. "load 3" must show the list and a badge saying 3 unread.

## 6. Understanding the refactored solution

**The tower becomes a ladder of guards:**

```jsx
function MessageList({ isLoading, error, messages }) {
  if (isLoading) return <p>Loading...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;
  if (messages.length === 0) return <p>No messages.</p>;
  if (messages.length === 1) return <p>One message: {messages[0]}</p>;
  return <ul>{messages.map((m) => <li key={m}>{m}</li>)}</ul>;
}
```

Same five outcomes, zero nesting. Read top to bottom: "if loading, spinner; if error, message; if empty, empty state; if one, sentence; otherwise, list." Reading order IS priority order — loading beats error beats empty, and you can *see* that. Adding a "exactly two" case is one new line in the obvious spot. The move worked because branching left JSX (expressions-only) and entered a function body (statements allowed).

**The badge owns its own disappearance:**

```jsx
function UnreadBadge({ count }) {
  if (count === 0) return null; // "render nothing" is a return value
  return <p>🔵 {count} unread</p>;
}
```

Two wins. First, the `0` bug is gone — the guard uses a real comparison (`count === 0`), so no bare number ever reaches the page. Second, the *call site* got simpler: `App` just writes `<UnreadBadge count={messages.length} />` with no wrapping condition. The badge decides for itself whether it appears. Components that guard themselves are easier to reuse — every caller gets the correct behavior for free.

**The rule of thumb the refactor demonstrates:** one condition → inline `? :` or `&&` (with a genuine boolean on the left, like `count > 0`). More than one condition → extract a component and use early returns.

**The honest leftover:** `App` still holds `isLoading` / `error` / `messages` as three independent flags, and impossible combinations (loading AND error) are still representable. The refactor points at project 20, which collapses them into one `status` value. Good refactors fix one lesson at a time and label what remains.

## 7. Words you learned (glossary)

- **Expression** — code that produces a value (`x ? a : b`); the only thing JSX braces accept.
- **Statement** — code that performs an action (`if`, `return`, `for`); allowed only in function bodies.
- **Ternary tower** — nested `a ? x : b ? y : ...` chains; hard to read past one level.
- **Truthy / falsy** — how a value behaves in a condition; falsy = `false`, `0`, `''`, `null`, `undefined`, `NaN`.
- **`&&` short-circuit** — `a && b` returns `a` if falsy, else `b` — not a boolean!
- **React's skip-list** — `false`, `null`, `undefined`, `true` render as nothing; `0` and `NaN` render as text.
- **Guard clause** — an early `if ... return` that handles one case and exits.
- **Early return** — returning from a function before its end; how guards work.
- **`return null`** — a component's way to render nothing.
- **Call site** — the place where a component/function is *used*, as opposed to defined.
- **`setTimeout`** — run a function after a delay (milliseconds); fakes a slow server here.
- **`null`** — deliberate "no value"; used for "no error right now".
- **`Array.from({length: n}, fn)`** — build an n-item array by calling fn for each slot.

## 8. Experiments to try on the plane (no internet needed)

Note once: these pages load React from a CDN, so *running* them needs internet on first load (if you opened them before the flight, the browser may have React cached). Reading and editing the code is fully offline — predict each outcome in writing first.

1. **Fix the original's badge the tiny way:** change `{messages.length && ...}` to `{messages.length > 0 && ...}`. Prediction: "load 0" no longer shows the stray `0`. One comparison operator was the whole bug.
2. **Print other falsy values:** in the original, temporarily add `{'' && <p>a</p>}` and `{null && <p>b</p>}` and `{NaN && <p>c</p>}` to the JSX. Prediction: the empty string and `null` show nothing, but `NaN` prints "NaN" on the page — same family as the `0` bug.
3. **Add a "exactly two messages" case to both versions.** In the refactor it's one guard line: `if (messages.length === 2) return <p>Two messages!</p>;`. In the original you must splice a `? :` into the tower. Feel the difference in effort and confidence. (Also add a "load 2" button: `<button onClick={() => load(2)}>load 2</button>`.)
4. **Reorder the guards:** in `MessageList`, move the `if (error)` line above `if (isLoading)`. Prediction: click "load (fails)" and during the 600ms wait nothing changes visibly yet — but conceptually, error now outranks loading. Trigger a failure, then immediately click "load 3": for 600ms you'd previously have seen "Loading..."; now the old error would win if it were still set. The point: with guards, priority is a visible, editable line order.
5. **Make the impossible state happen:** in the original's `load`, delete the line `setError(null)`. Prediction: click "load (fails)", then "load 3" — the list loads, but click sequence leaves `error` set forever after a failure... yet the tower shows the list anyway once loading finishes and messages exist? No — trace it: `error` is still set, so the error branch wins and the inbox appears stuck on "server exploded" even though messages arrived. Three independent flags, contradicting; project 20's cure.
