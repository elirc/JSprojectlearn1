# ⚛️ The React Handbook

A cover-to-cover reference for the React track, organised **by concept** instead of by project. Read it once end to end, then use it as a lookup table.

Every concept gets a small snippet and an arrow like **→ 28** naming the project that teaches it properly (those are `react/28-...` folders — plain JS projects are written **js#28**). Each project has a `LEARN.md` teaching the concepts from zero, a `README.md` explaining the refactor, and an `original.html` where the bug is alive and clickable.

These pages load React from a CDN, so *running* them needs internet the first time. Reading, editing and predicting are fully offline — write your prediction down, verify after you land. Reducers extracted into `.js` files are testable offline right now with `node --test`.

If you haven't done the JavaScript track, do it first. React's hardest bugs are closures, references and mutation — js#25, js#26, js#27 and js#28 in a costume.

---

## §1. The mental model

**UI = f(state).** You don't tell React to change the screen. You describe what the screen *is* for the current state, and React makes the real DOM match. Every bug in this track is that contract broken somewhere.

Three ideas do all the work:

**1. A render is your component function running.** Top to bottom, returning a description of the UI (not DOM — a plain object tree). React compares that description with the previous one and touches only the DOM nodes that differ.

**2. A render is a snapshot.** Every value in the component body — props, state, `const`s, functions you define — belongs to *that one render* and never changes afterwards. Render #1's `count` is 0 forever. Render #2 runs the function again and gets its own, brand-new `count` of 1.

```jsx
function Counter() {
  const [count, setCount] = useState(0);
  function handle() {
    setCount(count + 1);
    console.log(count);      // still the OLD value — this render's snapshot
  }
  return <button onClick={handle}>{count}</button>;
}
```

**3. Setters schedule; they don't assign.** `setCount(5)` does not make `count` be 5 on the next line. It requests a future render in which `count` *starts as* 5. React **batches** several setter calls from one event into a single re-render. **→ 11**

Re-rendering is not repainting. A component re-running is cheap; React only edits the DOM where the description changed. So "it re-rendered" is not automatically a problem — that's §8.

**What triggers a re-render:** its own state changing (`Object.is`-different from before), its parent re-rendering, or a context it consumes changing. Nothing else. Not a mutated object, not a changed ref, not a module-level variable.

---

## §2. JSX rules

JSX is syntax sugar for function calls. `<Row id={3} />` becomes roughly `React.createElement(Row, { id: 3 })`, which returns a plain object. That's why you can store elements in variables and pass them as props.

```jsx
const cls = "row";
const el = (
  <li className={cls} onClick={handleClick} data-id={todo.id}>   {/* className, not class */}
    {todo.title}                                                  {/* {} = a JS expression */}
    {/* comments look like this */}
  </li>
);
```

The rules that actually trip people up:

- **One root element per return.** Wrap siblings in `<div>` or a fragment `<>...</>`.
- **`className`**, **`htmlFor`**, and camelCase everything else (`onClick`, `tabIndex`, `strokeWidth`).
- **`{}` takes an expression, not a statement.** No `if`, no `for` inside JSX — use a ternary, `&&`, or compute above the `return`.
- **Style is an object with camelCase keys:** `style={{ marginTop: 8 }}` (the outer braces are "a JS expression", the inner ones are the object).
- **Components must be capitalised.** `<row />` is the HTML tag `row`; `<Row />` is your component.
- **Every expression's value is rendered** — except `null`, `undefined`, `false` and `true`, which render nothing. Numbers *do* render.

That last rule is the `&&` trap:

```jsx
{items.length && <List items={items} />}   {/* renders "0" when the list is empty! */}
{items.length > 0 && <List items={items} />}  {/* the fix: a real boolean */}
```

`0` is falsy so `&&` returns `0`, and React happily prints a zero on your page. Always `&&` on a genuine boolean. **→ 04**

Nested ternaries in JSX ("ternary soup") are readable up to about one level. Past that, compute a variable above the return, or extract a component. **→ 04**

---

## §3. Props and composition

**Props** are the arguments a component is called with. They are **read-only** — a component may never assign to its own props.

```jsx
function Badge({ label, tone = "neutral" }) {          // destructure + defaults in the signature
  return <span className={`badge badge--${tone}`}>{label}</span>;
}
<Badge label="New" tone="success" />
```

### Boolean-prop soup vs variants

Four booleans express sixteen combinations, most of them nonsense (`primary` *and* `danger`?). One `variant` string can only ever be one thing — the js#11 options-object lesson, ported. **→ 05**

```jsx
<Button primary large disabled danger />                  {/* which wins? */}
<Button variant="danger" size="lg" disabled />            {/* only legal states exist */}
```

### `children`

Every component gets a free `children` prop containing whatever was written between its tags. Reach for it before you invent `titleSlot`, `bodySlot`, `footerSlot` props. **→ 06**

```jsx
function Card({ title, children }) {
  return <section className="card"><h3>{title}</h3>{children}</section>;
}
<Card title="Profile"><Avatar user={user} /><p>Joined 2019</p></Card>
```

Passing elements as props ("slots") is fine and often better than a config object, because the caller controls the markup:

```jsx
<Layout sidebar={<Nav />} main={<Feed />} />
```

### Compound components

When one component needs several coordinated parts, expose the parts and share the state through context rather than accepting a giant config array. The caller gets to arrange, wrap and style the pieces; you keep the state. **→ 35**

```jsx
<Tabs defaultTab="a">
  <Tabs.List><Tabs.Tab id="a">First</Tabs.Tab><Tabs.Tab id="b">Second</Tabs.Tab></Tabs.List>
  <Tabs.Panel id="a">…</Tabs.Panel>
  <Tabs.Panel id="b">…</Tabs.Panel>
</Tabs>
```

### Lifting state up

Two siblings that must agree cannot each own the truth. Move the state to their nearest common parent and pass it down as a value plus a callback. **→ 08**

```jsx
function Parent() {
  const [query, setQuery] = useState("");
  return <><SearchBox value={query} onChange={setQuery} /><Results query={query} /></>;
}
```

That `value` + `onChange` pair is the **controlled component** contract: the child renders what it's given and reports intent upward; it stores nothing. Its opposite is **uncontrolled** — the child owns the state and only notifies the parent. Pick one per prop and document it; the confusion between them is **→ 36**.

---

## §4. State

`useState` gives a component a value that survives re-renders and, when changed, causes one.

```jsx
const [count, setCount] = useState(0);
const [user, setUser] = useState(() => expensiveInitialValue());  // lazy: runs once, not every render
```

State is **per component instance**: two `<Counter />`s on a page have two independent counts. React keeps them apart by position in the tree and by `key` (§9).

### The updater form

`set(value)` says "make it this". `set(prev => next)` says "whatever it is at update time, transform it". Any time you compute the next state *from* the current state, use the updater form on reflex. **→ 11**

```jsx
setCount(count + 1); setCount(count + 1); setCount(count + 1);   // from 5 → 6. One increment.
setCount(c => c + 1); setCount(c => c + 1); setCount(c => c + 1); // from 5 → 8. Three.
```

Both lines are three calls in one event, batched into one render. The first three all read the same frozen snapshot (5) and all say "make it 6". The updaters are queued and fed each other's output: 5 → 6 → 7 → 8.

This matters most inside anything that outlives the render that created it — a `setInterval` callback, a `setTimeout`, an event listener, a promise `.then`. Those hold a **stale closure**: a captured value that has fallen behind reality.

```jsx
useEffect(() => {
  const id = setInterval(() => setCount(count + 1), 1000);   // BUG: count is frozen at 0
  return () => clearInterval(id);
}, []);                                                       // counts to 1, then freezes
```

The updater form removes the capture entirely, which also makes the empty deps array honest.

### Immutability

React decides "did this change?" with `Object.is` — identity, not contents. Mutate an object or array in place and the identity is the same, so React sees nothing and skips the render. **→ 10**

```jsx
todos.push(newTodo); setTodos(todos);              // ✗ same array — no re-render
setTodos([...todos, newTodo]);                     // ✓ new array
setUser({ ...user, name });                        // ✓ new object
setTodos(todos.map(t => t.id === id ? { ...t, done: !t.done } : t));   // ✓ replace one
setTodos(todos.filter(t => t.id !== id));          // ✓ remove one
setRows(rows.toSorted(byName));                    // ✓ sort — .sort() would mutate!
```

The js#26 mutation traps are all here: `sort`, `reverse`, `splice`, `push`, `fill` mutate; `map`, `filter`, `slice`, `concat`, `toSorted`, `toReversed`, `with` don't.

For nested updates, spread every level you're changing — or restructure so you don't have to. Deep nesting is usually a sign the state wants to be flatter (a `Map`-like object keyed by id, plus an array of ids).

### Derived state: the #1 React smell

If a value can be **computed** from other state or props, do not store it. Every stored copy is a copy that can drift. **→ 09, 21**

```jsx
// ✗ two sources of truth + an effect to keep them in sync
const [items, setItems] = useState([]);
const [total, setTotal] = useState(0);
useEffect(() => setTotal(items.reduce((s, i) => s + i.price, 0)), [items]);

// ✓ one source of truth, computed during render
const total = items.reduce((s, i) => s + i.price, 0);
```

The second version cannot be wrong, cannot render a stale total for one frame, and needs no effect. Filtering, sorting, counting, "is the form valid", "is anything selected" — all derived. Only reach for `useMemo` if the computation is genuinely expensive (§8).

### Colocation and shape

**Keep state as low in the tree as it can live.** A search box's text belongs in the search box, not in `App` — state at the top re-renders everything below it on every keystroke. **→ 29**

**Group what changes together.** Ten `useState`s for ten form fields become one object plus one generic handler (**→ 12**):

```jsx
const [form, setForm] = useState({ name: "", email: "" });
const update = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));
```

**Make impossible states unrepresentable.** Three booleans (`loading`, `error`, `data`) allow "loading and errored at once". One `status` field can't. This is js#40 in React clothing. **→ 20, 16**

```jsx
const [req, setReq] = useState({ status: "idle" });
// "idle" | "loading" | { status: "success", data } | { status: "error", error }
```

### `useReducer`

When updates get complicated — several fields moving together, actions that mean something in the domain — move them into a **reducer**: a pure function `(state, action) => newState`. It lives in its own `.js` file, has no React in it, and is unit-tested with `node --test`. That's the decide-vs-do split from the JS track. **→ 13, 40, 41**

```js
// reducer.js — pure, testable, offline
export const initialState = { todos: [], nextId: 1 };
export function todosReducer(state, action) {
  switch (action.type) {
    case "added":
      if (!action.text.trim()) return state;
      return { todos: [...state.todos, { id: state.nextId, text: action.text.trim(), done: false }],
               nextId: state.nextId + 1 };
    case "toggled":
      return { ...state, todos: state.todos.map(t => t.id === action.id ? { ...t, done: !t.done } : t) };
    default:
      throw new Error(`Unknown action type: ${action.type}`);
  }
}
```

```jsx
const [state, dispatch] = useReducer(todosReducer, initialState);
dispatch({ type: "added", text: "buy milk" });
```

Throwing on an unknown action is deliberate: a typo in an action type becomes a loud error instead of a silent no-op. `dispatch` is guaranteed stable, so it never needs to appear in a deps array.

---

## §5. Effects

An **effect** synchronises your component with something *outside* React — a subscription, a timer, a network request, the document title, `localStorage`. It runs *after* React has painted.

```jsx
useEffect(() => {
  const id = setInterval(tick, 1000);
  return () => clearInterval(id);       // cleanup: before the next run, and on unmount
}, [delay]);                            // deps: re-run only when these change
```

### The dependency array

- **No array** — run after *every* render. An effect that sets state with no array is an infinite loop: render → effect → setState → render. That's the fetch storm of **→ 17**.
- **`[]`** — run once after the first render, clean up on unmount.
- **`[a, b]`** — run again whenever `a` or `b` changes (`Object.is` comparison).

The rule: **list everything from the render that the effect reads** — props, state, and any function or object defined in the component body. Deps are not a control knob for "when should this run"; they are a truthful declaration of what the effect depends on. Lying to shut the linter up is how you get stale closures.

If a dep changes too often, fix the *cause*: use the updater form so you don't need to read state, move a function inside the effect, wrap it in `useCallback`, or keep the value in a ref.

### Cleanup

Every subscription, timer and listener needs cleanup — otherwise a component removed from the screen keeps running, keeps holding memory, and eventually calls `setState` on something that no longer exists. **→ 18**

```jsx
useEffect(() => {
  const onResize = () => setWidth(window.innerWidth);
  window.addEventListener("resize", onResize);
  return () => window.removeEventListener("resize", onResize);  // same function reference!
}, []);
```

Removing a listener only works if you pass the *same function object* you added — js#25's reference equality, again.

### Fetching, and the race

Two searches in flight; the slower older one returns last and overwrites the newer results. Guard with a flag in the cleanup, or an `AbortController`. **→ 19**

```jsx
useEffect(() => {
  let active = true;                                   // this render's flag
  setReq({ status: "loading" });
  fetch(`/api/search?q=${query}`)
    .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
    .then(data => { if (active) setReq({ status: "success", data }); })
    .catch(err => { if (active) setReq({ status: "error", error: err.message }); });
  return () => { active = false; };                    // a newer effect has started
}, [query]);
```

Note `if (!r.ok) throw` — `fetch` does **not** reject on 404 or 500, only on network failure. Forgetting that is js#50's lesson and the most common React data bug.

### When NOT to use an effect

Most effects beginners write shouldn't exist. **→ 21**

| You wrote an effect to… | Do this instead |
|---|---|
| compute a value from props/state | compute it during render (§4 derived state) |
| reset state when a prop changes | give the component a `key` (§9) — **→ 31** |
| respond to a click | put the code in the event handler |
| transform data for display | do it in the render, or in `useMemo` if slow |
| sync two pieces of state | delete one — derive it |

The test: **is this about something outside React?** If yes, effect. If it's just "when X, also do Y" inside your own app, it's an event handler or a derivation.

---

## §6. Refs

`useRef` gives you a mutable box that survives renders and **does not** trigger one when changed.

```jsx
const inputRef = useRef(null);
<input ref={inputRef} />
inputRef.current.focus();          // imperative DOM access, in an effect or handler
```

Two legitimate uses:

**1. Reaching a DOM node** for something React has no declarative API for — focus, scroll position, media playback, measuring, canvas.

**2. Remembering a value that shouldn't cause a re-render** — an interval id, the previous value of a prop, a "have I submitted yet" latch, a mutable counter. **→ 26**

```jsx
const timerId = useRef(null);
const renderCount = useRef(0);
renderCount.current++;                          // no re-render; the screen won't show it
```

Rules: **never read or write `ref.current` during render** (it makes render impure and its value is undefined on the first pass for DOM refs — the node doesn't exist until after commit); and if the screen should show it, it's state, not a ref.

### The latest-ref pattern

Store a callback in a ref, update it on every render, and let a long-lived subscription read `ref.current`. The subscription is set up once, but always calls the *newest* function — no stale closure and no teardown churn. This is how `useInterval` is built (§7). **→ 25**

```jsx
const savedRef = useRef(callback);
useEffect(() => { savedRef.current = callback; });    // no deps: keep it fresh every render
useEffect(() => {
  const id = setInterval(() => savedRef.current(), delay);
  return () => clearInterval(id);
}, [delay]);                                          // only re-created when delay changes
```

---

## §7. The custom hooks catalog

A **custom hook** is just a function whose name starts with `use` and that calls other hooks. It shares *logic*, not state — two components calling `useFetch` get two completely separate requests. Extract one when the same effect-plus-state dance appears a third time. **→ 22**

### `useFetch(path)` — **→ 22**

Returns one **status object** rather than three loose booleans, so "loading and error at once" can't happen. Deps `[path]`, with the stale-response guard from §5.

```jsx
function useFetch(path) {
  const [request, setRequest] = useState({ status: "idle" });
  useEffect(() => {
    let active = true;
    setRequest({ status: "loading" });
    fetch(path)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(data => active && setRequest({ status: "success", data }))
      .catch(e => active && setRequest({ status: "error", error: e.message }));
    return () => { active = false; };
  }, [path]);
  return request;   // { status: 'idle' | 'loading' | 'success' | 'error', data?, error? }
}
```

```jsx
const req = useFetch("/api/users");
if (req.status === "loading") return <Spinner />;
if (req.status === "error") return <p>{req.error}</p>;
if (req.status === "success") return <List users={req.data} />;
return null;
```

### `usePersistentState(key, defaultValue)` — **→ 23**

Same shape as `useState`, so it's a drop-in replacement. Reads `localStorage` **lazily** (once, not every render) inside a `try/catch` — stored data is untrusted input and `JSON.parse` throws on garbage — and writes through in an effect.

```jsx
function usePersistentState(key, defaultValue) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? defaultValue : JSON.parse(raw);
    } catch { return defaultValue; }
  });
  useEffect(() => { localStorage.setItem(key, JSON.stringify(value)); }, [key, value]);
  return [value, setValue];
}
```

### `useDebouncedValue(value, delayMs)` — **→ 24**

Returns the *trailing* value — a single value, not a tuple. Every change restarts the timer via cleanup; only a pause produces a new value. Debouncing inside a component means debouncing the **value**, not wrapping the handler in js#28's `debounce` (a fresh debounced function every render debounces nothing).

```jsx
function useDebouncedValue(value, delayMs) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);       // typing again cancels the pending update
  }, [value, delayMs]);
  return debounced;
}
const query = useDebouncedValue(input, 300);   // then fetch on [query], not [input]
```

### `useInterval(callback, delay)` — **→ 25**

Returns nothing. Uses the latest-ref pattern from §6, so the callback is always current while the interval is created once. `delay === null` pauses it — a declarative on/off switch with no `clearInterval` at the call site.

```jsx
useInterval(() => setSeconds(s => s + 1), running ? 1000 : null);
```

### Two more from this repo

`useCart()` / `useCartDispatch()` (**→ 41**) read a context and **throw** a clear error when used outside their provider, so a misplaced component fails loudly instead of reading `null`. `useHashRoute()` (**→ 42**) subscribes to `hashchange` and returns the URL's path segments as an array (`#/articles/keys` → `['articles', 'keys']`) — the js#60 "URL as state" idea, so a view survives a refresh.

### The rules of hooks

**Call hooks at the top level of a component or another hook. Never in a condition, loop, or after an early `return`.** React has no idea what your hooks are called; it matches them **by call order**, using a numbered slot per component. Skip one call and every later hook reads the previous one's slot.

Project **→ 50** makes this concrete by implementing `useState` and `useEffect` in ~50 lines: an array of slots and a cursor reset to 0 before each render. Once you've seen those four lines, the rule stops being arbitrary — it's the only thing keeping the array aligned.

---

## §8. Performance

Do this only after measuring. Re-rendering is usually cheap; premature `useMemo` everywhere costs readability and often more than it saves.

The order of the fixes matters — try them top to bottom:

1. **Colocate state** so fewer components re-render at all (**→ 29**).
2. **Move expensive children into `children`** so a state change in the wrapper doesn't re-render them.
3. **`useMemo`** for genuinely expensive computation (**→ 27**).
4. **`React.memo` + `useCallback` + stable props** for lists of costly rows (**→ 28, 30**).

### Referential equality

Everything here hinges on one js#25 fact: `{} !== {}` and `(() => {}) !== (() => {})`. A component body runs on every render, so every inline object, array and function is a **brand-new value**, even when the code is identical.

```jsx
const a = () => {};
const b = () => {};
console.log(a === b, Object.is(a, a));   // false true
```

### `React.memo`

Wraps a component with a bouncer: if every prop is `Object.is`-equal to last time, skip the re-render and reuse last render's output. It compares props shallowly and never looks inside them.

```jsx
const Row = React.memo(function Row({ item, onPick }) { /* expensive */ });
```

`memo` is defeated the moment a parent passes a fresh value:

```jsx
<Row item={item} onPick={() => pick(item.id)} />   {/* new function every render — memo useless */}
<Row item={item} style={{ padding: 4 }} />          {/* new object every render — same problem */}
<Row item={item} tags={[]} />                       {/* new array every render — same problem */}
```

**→ 30** is entirely about that: the memo isn't broken, it's being fed changing props.

### `useMemo` and `useCallback`

```jsx
const visible = useMemo(() => rows.filter(matches).sort(byName), [rows, matches]);  // cache a VALUE
const onPick = useCallback((id) => setPicked(id), []);                              // cache a FUNCTION
```

`useCallback(fn, deps)` is `useMemo(() => fn, deps)`. Both cache across renders until a dep changes. The same deps honesty rule applies: list what the function reads. The updater form (`setPicked(p => …)`) and the stable `dispatch` from `useReducer` are what let deps arrays stay empty *truthfully*. **→ 27, 28**

Stable values can also be hoisted out of the component entirely — a constant array or a pure helper defined at module level is created once, for free, and needs no hook at all.

### Keys and identity

When React renders a list, `key` tells it which item is which *across renders*. It is not cosmetic and it is not for you — it's how React decides whether to move a DOM node or reuse it for different data.

```jsx
{todos.map((t) => <Todo key={t.id} todo={t} />)}     {/* ✓ stable identity */}
{todos.map((t, i) => <Todo key={i} todo={t} />)}     {/* ✗ index = position, not identity */}
```

With `key={index}`, deleting the first row makes every later row shift up into a slot React thinks it already knows. The DOM is reused, so the *text* updates but the state living inside those components — checkbox ticks, focus, edit-in-progress, animation — stays behind and attaches to the wrong row. **→ 03**

The flip side is a feature: **changing a key destroys the component and builds a fresh one**, which is the cleanest way to reset state when the subject changes. Far better than an effect that "syncs" fields. **→ 31**

```jsx
<ProfileForm key={userId} user={user} />   {/* switching users = brand-new form, blank state */}
```

And **structure decides lifetime**: state lives as long as its component stays in the same position of the tree. Unmounting a component throws its state away; two different branches of a ternary are two different positions. **→ 32**

```jsx
{isOn ? <Panel /> : null}                {/* unmount: state is GONE on the way back */}
<Panel hidden={!isOn} />                 {/* stays mounted: state survives */}
```

---

## §9. Context

**Context** carries a value down the tree without threading it through every component in between. It solves **prop drilling** — passing a prop through five components that don't care about it. **→ 34**

```jsx
const ThemeContext = React.createContext("light");

function App() {
  const [theme, setTheme] = useState("light");
  return <ThemeContext.Provider value={theme}><Page /></ThemeContext.Provider>;
}
function DeepButton() {
  const theme = useContext(ThemeContext);      // no props needed at any level
  return <button className={theme}>Go</button>;
}
```

Its real cost: **every consumer re-renders when the provider's value changes** — no `memo` in between can stop it. Two consequences:

**Don't put an inline object in `value`.** `value={{ user, setUser }}` is a fresh object every render of the provider, so every consumer re-renders every time, forever. Wrap it in `useMemo`.

**Split contexts that change at different rates.** One mega-context holding theme, user, cart and a dispatch function re-renders the whole app whenever any one of them moves. Separate the rarely-changing data from the frequently-changing data, and — the classic — put *state* and *dispatch* in two contexts, because `dispatch` never changes and its consumers should never re-render. **→ 33, 41**

```jsx
<CartContext.Provider value={cart}>
  <CartDispatchContext.Provider value={dispatch}>{children}</CartDispatchContext.Provider>
</CartContext.Provider>
```

Always wrap consumption in a custom hook that throws when the context is missing, so a component rendered outside the provider fails with a sentence instead of a `null` five frames later:

```jsx
export function useCart() {
  const cart = useContext(CartContext);
  if (cart === null) throw new Error("useCart needs <CartProvider>");
  return cart;
}
```

Context is not a state manager; it's a delivery mechanism. `useReducer` + context *is* a small Redux, and that's exactly what **→ 41** builds — the React edition of js#59.

---

## §10. Error boundaries, portals, forms

### Error boundaries

A render-time error anywhere in the tree unmounts the *whole* app — a white screen. An **error boundary** is a component that catches errors from its subtree and renders a fallback instead. It must be a class (there is no hook for it), and it catches render, lifecycle and constructor errors — **not** event handlers, `setTimeout` callbacks, or async rejections, which need their own `try/catch`. **→ 37**

```jsx
class ErrorBoundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }   // render the fallback
  componentDidCatch(error, info) { log(error, info); }           // report it
  render() {
    if (this.state.error) return this.props.fallback ?? <p>Something went wrong.</p>;
    return this.props.children;
  }
}
```

Put boundaries around *independently failing regions* — a widget, a route, a chart — so one broken part doesn't take the page with it. Give the boundary a `key` tied to the route if you want it to reset on navigation.

### Portals

`createPortal(children, domNode)` renders into a *different* DOM node while staying in the React tree — so context still flows and events still bubble to the React parent. The cure for modals and tooltips clipped by `overflow: hidden` or buried in a `z-index` war. **→ 38**

```jsx
return createPortal(<div className="modal">{children}</div>, document.body);
```

Being a good modal citizen is mostly non-React work: close on `Escape`, close on backdrop click but not on content click, restore focus to the trigger on close, and lock body scroll while open.

### Forms

A **controlled input** takes its value from state and reports every change back. It's the default because the value is then real data you can validate, transform and submit. **→ 07**

```jsx
<input value={name} onChange={(e) => setName(e.target.value)} />
```

- `value={undefined}` makes an input uncontrolled and React will warn when it later becomes controlled. Initialise with `""`, never `null` or `undefined`.
- Checkboxes use `checked` / `e.target.checked`; `<select>` uses `value` on the select, not `selected` on options.
- Submit handlers need `e.preventDefault()` or the browser reloads the page.
- Validate with the js#31 shape: rules are `(value) => string | null`, a schema is a plain object of rule arrays, and `validate(data, schema)` returns `{ field: [messages] }`. Pure, testable, and identical to the JS-track version. **→ 43**
- Show errors after **blur or submit**, not on the first keystroke — correctness is not the same as kindness.

### Async submit

Every async submit needs a pending state, or a double-click fires two requests. Disable the button *from state*, not by poking the DOM, and reset in a `finally` so a failure doesn't leave the form permanently locked. **→ 44**

```jsx
const [status, setStatus] = useState("idle");     // "idle" | "saving" | "error"
async function onSubmit(e) {
  e.preventDefault();
  if (status === "saving") return;                // the guard
  setStatus("saving");
  try { await save(form); setStatus("idle"); }
  catch (err) { setStatus("error"); }
}
<button disabled={status === "saving"}>{status === "saving" ? "Saving…" : "Save"}</button>
```

**Optimistic updates** go one step further: apply the change immediately, send the request, and roll back on failure. Keep the pre-request state in a variable so the rollback is exact. **→ 39**

---

## §11. The rules, in one page

1. **UI = f(state).** If the screen is wrong, the state is wrong. Fix the state.
2. **A render is a snapshot.** Props, state and every function defined in the body belong to that one render.
3. **Setters schedule, they don't assign.** Reading state right after setting it gives you the old value.
4. **Compute next-from-current with the updater form.** `set(x + 1)` → `set(c => c + 1)`, on reflex.
5. **Never mutate state.** New array, new object, every time. `map`/`filter`/spread/`toSorted`.
6. **Don't store what you can derive.** Derived state is the #1 smell.
7. **Keep state as low as it can live**, and group what changes together.
8. **Make impossible states unrepresentable** — one `status`, not three booleans.
9. **Effects are for the outside world.** If it isn't a subscription, timer, network call or browser API, it isn't an effect.
10. **Deps are a declaration, not a knob.** List everything the effect reads; fix the cause, don't shorten the list.
11. **Every subscription needs cleanup.**
12. **Keys are identity, never position.** Never the index for a list that reorders or deletes.
13. **Hooks run unconditionally, in the same order, every render.**
14. **Render must be pure.** No mutation, no `ref.current`, no side effects, no randomness that must stay stable.
15. **Measure before optimising**, then colocate, then memo.

---

## §12. React traps: the top 15

1. **`{count && <List />}` renders a literal `0`** when count is 0. `&&` on real booleans only. → 04
2. **`key={index}` corrupts state** when rows are deleted or reordered — ticks and focus stick to the wrong row. Use a stable id. → 03
3. **Mutating state doesn't re-render.** `todos.push(x); setTodos(todos)` — same identity, React sees nothing. → 10
4. **`.sort()` and `.reverse()` mutate.** Sorting state in place silently mutates it. `toSorted`, or spread first. → 45
5. **Stale closures in timers and listeners.** `setCount(count + 1)` inside `setInterval` counts to 1 and freezes. Updater form. → 11
6. **Reading state right after setting it** gives the old value — it's this render's snapshot. → 11
7. **`onClick={handleClick()}`** calls the function during render and passes its return value. `onClick={handleClick}` or `onClick={() => handleClick(id)}`. → 14
8. **A missing deps array = a fetch storm.** Effect sets state → render → effect → forever. → 17
9. **Lying about deps** to silence the linter buys a stale closure. Fix the cause instead. → 17
10. **No cleanup = leaked intervals and listeners** that keep firing after unmount. → 18
11. **The fetch race**: a slow old response overwrites a new one. Guard with a cleanup flag or `AbortController`. And `fetch` doesn't reject on 404 — check `res.ok`. → 19
12. **Effects that just compute** should be deleted; derive during render. → 21
13. **`React.memo` defeated by inline props** — a fresh function, object or array every render. `useCallback`, `useMemo`, or hoist it. → 28, 30
14. **An inline object in a context `value`** re-renders every consumer, every time. `useMemo` it, and split contexts that change at different rates. → 33
15. **Conditional unmount wipes state.** `{on ? <Panel/> : null}` throws Panel's state away; structure decides lifetime, and `key` resets it on purpose. → 31, 32

---

*Every trap above is alive and clickable in that project's `original.html`. Break it, predict what happens, then read the refactor — the comparison is the lesson.*
