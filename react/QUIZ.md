# ⚛️🧠 The React Quiz — 50 questions

Fifty questions over the React track. Four kinds:

- **What renders / what does the console show?** — write down the exact output before checking.
- **Spot the bug** — the component renders without crashing. Say what's wrong and how you'd fix it.
- **Which approach?** — two or three ways; pick one and say why.
- **Predict the behaviour after N clicks** — the number on the screen, and why.

Every answer is at the bottom with a short explanation and the project that teaches it deeply. Pure-JavaScript reasoning (update queues, referential equality, hook slots) was verified by running the equivalent logic in Node.

Assume React 18 with `createRoot` and **no `<StrictMode>`** — that's how every project in this track is set up, so effects run once per mount, not twice. (A real Vite app usually does wrap in `StrictMode`, which double-invokes effects in development on purpose, to make missing cleanup obvious.)

Difficulty: ⭐ warm-up · ⭐⭐ real code · ⭐⭐⭐ the deep end.

---

## ⭐ Warm-ups (1–15)

**1. What renders?** The cart is empty.
```jsx
function Cart({ items }) {
  return <div>{items.length && <List items={items} />}</div>;
}
```

**2. What does the console show on one click?**
```jsx
function Counter() {
  const [count, setCount] = useState(0);
  function handle() {
    setCount(count + 1);
    console.log("count is now", count);
  }
  return <button onClick={handle}>{count}</button>;
}
```

**3. Spot the bug.**
```jsx
<button onClick={handleDelete(todo.id)}>Delete</button>
```

**4. What does the console show?**
```jsx
function Child() {
  console.log("render child");
  useEffect(() => { console.log("effect child"); });
  return <p>hi</p>;
}
function Parent() {
  console.log("render parent");
  useEffect(() => { console.log("effect parent"); });
  return <Child />;
}
```
Console output on first mount, in order?

**5. What does the screen show after clicking "Add" three times?**
```jsx
const [todos, setTodos] = useState([]);
function add() {
  todos.push({ id: Date.now(), text: "new" });
  setTodos(todos);
}
return <><button onClick={add}>Add</button><p>{todos.length} todos</p></>;
```

**6. Which approach, and why?**
```jsx
const [items, setItems] = useState([]);                                   // A
const [total, setTotal] = useState(0);
useEffect(() => setTotal(items.reduce((s, i) => s + i.price, 0)), [items]);

const [items, setItems] = useState([]);                                   // B
const total = items.reduce((s, i) => s + i.price, 0);
```

**7. What does the console show when the button is clicked once?**
```jsx
function Clock() { console.log("Clock rendered"); return <p>tick</p>; }
function App() {
  const [n, setN] = useState(0);
  console.log("App rendered");
  return <><button onClick={() => setN(n + 1)}>{n}</button><Clock /></>;
}
```

**8. What renders?**
```jsx
<div class="card" onclick={handleClick}>Hello</div>
```

**9. What does React do here?**
```jsx
function Profile({ user }) {
  const [name, setName] = useState("");
  if (!user) return <p>Loading…</p>;
  const [bio, setBio] = useState("");
  return <Form name={name} bio={bio} />;
}
```
First render `user` is `null`; on the second render it's an object.

**10. Predict the behaviour.** `count` starts at 0. What does the screen show after **one** click?
```jsx
<button onClick={() => { setCount(count + 1); setCount(count + 1); }}>+2</button>
```

**11. Which approach, and why?**
```jsx
<input ref={inputRef} />                                                  // A
<button onClick={() => save(inputRef.current.value)}>Save</button>

<input value={name} onChange={(e) => setName(e.target.value)} />          // B
<button onClick={() => save(name)}>Save</button>
```

**12. What happens when the user clicks Submit?**
```jsx
function SignupForm() {
  const [email, setEmail] = useState("");
  function onSubmit(e) { createAccount(email); }
  return <form onSubmit={onSubmit}>
    <input value={email} onChange={(e) => setEmail(e.target.value)} />
    <button>Submit</button>
  </form>;
}
```

**13. What appears on screen?**
```jsx
<p>{null}{undefined}{false}{true}{0}{""}{"0"}{NaN}</p>
```

**14. Spot the bug.**
```jsx
function NameField({ user }) {
  const [name, setName] = useState(user.nickname);   // nickname may be missing
  return <input value={name} onChange={(e) => setName(e.target.value)} />;
}
```

**15. Which approach, and why?**
```jsx
<Card title="Profile" bodyText="Joined 2019" footerButtonLabel="Edit"     // A
      footerButtonOnClick={edit} headerIcon={<Star />} />

<Card title="Profile">                                                     // B
  <p>Joined 2019</p>
  <button onClick={edit}>Edit</button>
</Card>
```

---

## ⭐⭐ Real code (16–35)

**16. Predict the behaviour.** `count` starts at 0. What does it show after **one** click?
```jsx
function handle() {
  setCount(count + 1);
  setCount((c) => c + 1);
  setCount(count + 1);
}
```

**17. Spot the bug.**
```jsx
const [count, setCount] = useState(0);
useEffect(() => {
  const id = setInterval(() => setCount(count + 1), 1000);
  return () => clearInterval(id);
}, []);
```

**18. Spot the bug.**
```jsx
function UserList() {
  const [users, setUsers] = useState([]);
  useEffect(() => {
    fetch("/api/users").then((r) => r.json()).then(setUsers);
  });
  return <ul>{users.map((u) => <li key={u.id}>{u.name}</li>)}</ul>;
}
```

**19. Spot the bug.**
```jsx
useEffect(() => {
  const onResize = () => setWidth(window.innerWidth);
  window.addEventListener("resize", onResize);
}, []);
```

**20. What does the console show** after clicking the button five times?
```jsx
function Widget() {
  const [n, setN] = useState(0);
  useEffect(() => { console.log("mounted"); }, []);
  return <button onClick={() => setN(n + 1)}>{n}</button>;
}
```

**21. What does the user see?** Three rows, each with an uncontrolled checkbox. The user ticks the **middle** row (`b`), then clicks "delete" on the **first** row (`a`).
```jsx
{rows.map((row, i) => (
  <li key={i}><input type="checkbox" /> {row.label}
    <button onClick={() => remove(row.id)}>delete</button></li>
))}
```

**22. Which approach, and why?** A profile form should be blank whenever the selected user changes.
```jsx
useEffect(() => { setDraft(""); }, [userId]);         // A
<ProfileForm key={userId} user={user} />              // B
```

**23. Spot the bug.**
```jsx
const Row = React.memo(function Row({ item, onPick }) { /* expensive */ });

function List({ items }) {
  const [picked, setPicked] = useState(null);
  const [query, setQuery] = useState("");
  return <>
    <input value={query} onChange={(e) => setQuery(e.target.value)} />
    {items.map((item) => <Row key={item.id} item={item} onPick={() => setPicked(item.id)} />)}
  </>;
}
```

**24. What does the console show when the button is clicked once?**
```jsx
const Row = React.memo(function Row({ label }) { console.log("render", label); return <li>{label}</li>; });

function App() {
  const [n, setN] = useState(0);
  return <>
    <button onClick={() => setN(n + 1)}>{n}</button>
    <Row label="a" />
    <Row label="b" style={{ color: "red" }} />
  </>;
}
```

**25. Which approach, and why?** `rows` has about 30 entries and `matches` is a cheap string comparison.
```jsx
const visible = useMemo(() => rows.filter(matches), [rows, query]);   // A
const visible = rows.filter(matches);                                 // B
```

**26. Spot the bug.**
```jsx
const [firstName, setFirstName] = useState("");
const [lastName, setLastName] = useState("");
const [fullName, setFullName] = useState("");
useEffect(() => { setFullName(`${firstName} ${lastName}`); }, [firstName, lastName]);
```

**27. Spot the bug.** The user types `a`, then quickly `ab`. The `a` request takes 800ms; `ab` takes 60ms.
```jsx
useEffect(() => {
  fetch(`/api/search?q=${query}`).then((r) => r.json()).then(setResults);
}, [query]);
```

**28. Spot the bug.**
```jsx
useEffect(() => {
  fetch(`/api/user/${id}`)
    .then((r) => r.json())
    .then((data) => setUser(data))
    .catch((e) => setError(e.message));
}, [id]);
```
The server responds `404 {"error":"not found"}`. The UI shows no error at all.

**29. Which approach, and why?**
```jsx
const [loading, setLoading] = useState(false);              // A
const [error, setError] = useState(null);
const [data, setData] = useState(null);

const [req, setReq] = useState({ status: "idle" });         // B
// "idle" | "loading" | { status: "success", data } | { status: "error", error }
```

**30. What does the screen show?** The user clicks "+" five times, clicks "Hide", then clicks "Show".
```jsx
function App() {
  const [visible, setVisible] = useState(true);
  return <>
    <button onClick={() => setVisible(!visible)}>{visible ? "Hide" : "Show"}</button>
    {visible && <Panel />}
  </>;
}
function Panel() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount((c) => c + 1)}>{count}</button>;
}
```

**31. What does the console show on first mount, and after one click?**
```jsx
function Box() {
  const boxRef = useRef(null);
  const [n, setN] = useState(0);
  console.log(boxRef.current);
  return <div ref={boxRef} onClick={() => setN(n + 1)}>{n}</div>;
}
```

**32. Which approach, and why?** Typing in the search box makes the whole 500-row dashboard feel laggy.
```jsx
function App() {                                    // A — query lives in App
  const [query, setQuery] = useState("");
  return <><SearchBox value={query} onChange={setQuery} /><Dashboard /><Results query={query} /></>;
}

function App() {                                    // B — query lives in SearchPanel
  return <><SearchPanel /><Dashboard /></>;
}
```

**33. What does the console show, and what does the button show,** after three clicks?
```jsx
function Ticker() {
  const ticks = useRef(0);
  return <button onClick={() => { ticks.current++; console.log(ticks.current); }}>{ticks.current}</button>;
}
```

**34. Predict the behaviour.** What number is on screen after 5 seconds?
```jsx
const [count, setCount] = useState(0);
useEffect(() => {
  const id = setInterval(() => setCount(count + 1), 1000);
  return () => clearInterval(id);
}, []);
return <h2>{count}</h2>;
```

**35. Which approach, and why?** A signup form with eight fields.
```jsx
const [name, setName] = useState("");             // A — eight of these
const [email, setEmail] = useState("");
// …

const [form, setForm] = useState({ name: "", email: "" /* … */ });   // B
const update = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
```

---

## ⭐⭐⭐ The deep end (36–50)

**36. What does the console show** on mount, and then when `Parent`'s state changes once?
```jsx
function Child({ n }) {
  useEffect(() => {
    console.log("effect", n);
    return () => console.log("cleanup", n);
  }, [n]);
  return <p>{n}</p>;
}
```
`Parent` renders `<Child n={n} />` and the click does `setN(n + 1)`, starting from 0.

**37. Spot the bug.**
```jsx
function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  return <AuthContext.Provider value={{ user, setUser }}>{children}</AuthContext.Provider>;
}
```
Every consumer re-renders whenever *anything* in the app moves, even a component that only reads `setUser`.

**38. Spot the bug.**
```jsx
useEffect(() => {
  window.addEventListener("keydown", (e) => handleKey(e));
  return () => window.removeEventListener("keydown", (e) => handleKey(e));
}, [handleKey]);
```

**39. Predict the behaviour.** `count` is 5 when the button is clicked once.
```jsx
function plusThree() {
  setCount(count + 1);
  setCount((c) => c + 1);
  setCount((c) => c + 1);
}
```

**40. Which approach, and why?** A cart provider whose `dispatch` never changes but whose `cart` changes often.
```jsx
<CartContext.Provider value={{ cart, dispatch }}>{children}</CartContext.Provider>   // A

<CartContext.Provider value={cart}>                                                  // B
  <CartDispatchContext.Provider value={dispatch}>{children}</CartDispatchContext.Provider>
</CartContext.Provider>
```

**41. What happens?** The user types "hello" into the form, then picks a different user from the list.
```jsx
<ProfileForm key={userId} user={user} />
```
And what would happen without the `key`?

**42. Spot the bug.**
```js
export function todosReducer(state, action) {
  switch (action.type) {
    case "toggled": {
      const todo = state.todos.find((t) => t.id === action.id);
      todo.done = !todo.done;
      return state;
    }
    default: return state;
  }
}
```

**43. What does the console show?** The component re-renders five times.
```jsx
const [state, dispatch] = useReducer(reducer, initialState);
const [n, setN] = useState(0);
useEffect(() => { console.log("subscribed"); }, [dispatch]);
```

**44. Which approach, and why?** A chart widget throws while rendering because the API returned a null series.
```jsx
try { return <Chart data={data} />; } catch (e) { return <Fallback />; }   // A
<ErrorBoundary fallback={<Fallback />}><Chart data={data} /></ErrorBoundary>  // B
```

**45. Spot the bug.**
```jsx
function Search() {
  const [query, setQuery] = useState("");
  const debouncedSearch = debounce((q) => fetchResults(q), 300);
  return <input onChange={(e) => { setQuery(e.target.value); debouncedSearch(e.target.value); }} />;
}
```

**46. Predict the behaviour.** `save` takes two seconds. The user clicks "Save" three times in one second.
```jsx
async function onSubmit(e) {
  e.preventDefault();
  await save(form);
  setDone(true);
}
return <form onSubmit={onSubmit}><button>Save</button></form>;
```
How many requests reach the server?

**47. Spot the bug.** The modal renders, but only the top third of it is visible and it sits behind the header.
```jsx
function Row({ item }) {
  const [open, setOpen] = useState(false);
  return <li className="row">           {/* .row { overflow: hidden } */}
    <button onClick={() => setOpen(true)}>Details</button>
    {open && <div className="modal">…</div>}
  </li>;
}
```

**48. What does the screen show?** The user clicks A's button three times. What number is under **B**?
```jsx
function useCounter() {
  const [n, setN] = useState(0);
  return [n, () => setN((c) => c + 1)];
}
function A() { const [n, inc] = useCounter(); return <button onClick={inc}>A: {n}</button>; }
function B() { const [n, inc] = useCounter(); return <button onClick={inc}>B: {n}</button>; }
```

**49. Spot the bug.**
```jsx
function usePersistentState(key, defaultValue) {
  const stored = localStorage.getItem(key);
  const [value, setValue] = useState(stored ? JSON.parse(stored) : defaultValue);
  useEffect(() => { localStorage.setItem(key, JSON.stringify(value)); }, [key, value]);
  return [value, setValue];
}
```

**50. What does the console show?** This is project 50's ~10-line `useState`. `cursor` is reset to `0` before each render. `Form` is rendered once with `showBio={true}`, then once with `showBio={false}`.
```js
let hooks = [], cursor = 0;
function useState(initial) {
  const slot = cursor++;
  if (hooks[slot] === undefined) hooks[slot] = initial;
  return [hooks[slot], (v) => { hooks[slot] = v; }];
}
function Form({ showBio }) {
  const [name] = useState("Ada");
  if (showBio) { const [bio] = useState("engineer"); }
  const [email] = useState("ada@example.com");
  console.log(name, "|", email);
}
```

---
---

# ✅ Answers

### ⭐ Warm-ups

**1.** It renders a literal **`0`** on the page. `items.length` is `0`, which is falsy, so `&&` returns `0` — and React renders numbers. Only `null`, `undefined` and booleans render nothing. Fix: `items.length > 0 && …`, or a ternary. → **project 04**

**2.** `count is now 0`. Setters schedule a future render; they do not assign to the variable. `count` belongs to *this* render's snapshot and can never change inside it. → **project 11**

**3.** `handleDelete(todo.id)` runs **during render** and its return value (probably `undefined`) becomes the handler — so the todo is deleted the moment the list renders, and clicking does nothing. Pass a function: `onClick={() => handleDelete(todo.id)}`. → **project 14**

**4.** `render parent`, `render child`, `effect child`, `effect parent`. React renders top-down (parents describe their children), then runs effects bottom-up after the DOM is committed — so a child's effect always fires before its parent's. → **project 17**

**5.** It always shows **`0 todos`**. `push` mutates the existing array, so `setTodos(todos)` hands React the same array identity; React compares with `Object.is`, sees no change, and skips the render entirely. Use `setTodos([...todos, newTodo])`. → **project 10**

**6.** **B.** `total` is *derived* — it can always be computed from `items`, so storing it creates a second source of truth that can drift, plus one render where the total is stale. Computing it during render cannot be wrong and needs no effect. Storing what you can compute is the #1 React smell. → **projects 09, 21**

**7.** `App rendered` then `Clock rendered`. When a component re-renders, React re-runs *all* its children by default, regardless of whether their props changed. That's usually fine — it's only a problem when children are slow or numerous. → **project 27**

**8.** "Hello" renders, but **clicking does nothing**, and the console fills with warnings: *"Invalid DOM property `class`. Did you mean `className`?"* and *"Invalid event handler property `onclick`. Did you mean `onClick`?"* JSX is JavaScript, not HTML — it wants `className` and camelCase handlers. → **project 01**

**9.** React throws: *"Rendered more hooks than during the previous render."* The first render ran one hook, the second ran two. React matches hooks purely by **call order**, so they must run unconditionally, every render, in the same sequence. Move the `useState` above the early return. → **project 50**

**10.** **1.** Both lines read the same frozen `count` of 0 and both say "make it 1"; React batches them into one render with a final value of 1. Use `setCount((c) => c + 1)` twice to get 2. → **project 11**

**11.** **B, controlled.** The value is then real data you can validate, transform, reset and submit, and the UI is a function of state like everything else. Refs for form values put your truth back in the DOM — the js#14 "DOM as database" trap. Reach for A only for genuinely uncontrolled things like a file input. → **projects 07, 15**

**12.** The **page reloads**, all state is wiped, and to the user it looks like the button did nothing (or flashed). A `<form>` submit navigates by default; you need `e.preventDefault()` as the first line of the handler. → **project 07**

**13.** Only `0`, `0` and `NaN` appear — it renders `00NaN`. `null`, `undefined`, `false` and `true` render nothing; `""` renders nothing visible; but `0` and `NaN` are numbers and numbers render. Same root cause as question 1. → **project 04**

**14.** If `user.nickname` is `undefined`, the input starts **uncontrolled**, and the first keystroke makes it controlled — React logs a warning and focus/cursor behaviour gets strange. Always initialise a controlled input with a string: `useState(user.nickname ?? "")`. → **project 07**

**15.** **B.** Slot props multiply forever — every new bit of markup needs a new prop and a new decision inside `Card`. `children` lets the caller write whatever markup they want while `Card` keeps only the layout. Named element props (`sidebar={<Nav />}`) are the right middle ground when there are genuinely two or three slots. → **project 06**

### ⭐⭐ Real code

**16.** **1.** The queue is `[1, (c) => c + 1, 1]`, applied in order to a base of 0: → 1, → 2, → **1**. The last value-form call *replaces* everything the updaters computed, because it carries the snapshot value 0 + 1. Mixing forms is how you get numbers nobody can explain. → **project 11**

**17.** The counter goes 0 → 1 and freezes forever. The interval callback closed over the first render's `count` of 0, so every tick asks React to "set count to 1" — a no-op after the first. Use the updater form, `setCount((c) => c + 1)`, which removes the capture and makes the empty deps array honest. → **project 11**

**18.** No dependency array means the effect runs after **every** render, and it sets state, which causes a render, which runs the effect… a fetch storm that hammers the server until the tab is closed. Add `[]` (fetch once) or `[id]` (fetch when the id changes). → **project 17**

**19.** The listener is never removed. Every mount adds another one; unmounted components keep responding to resize and calling `setWidth` on state that no longer exists. Return a cleanup: `return () => window.removeEventListener("resize", onResize);`. → **project 18**

**20.** `mounted` appears **once**. An empty deps array means "run after the first render only" — clicking changes state and re-renders, but the deps haven't changed so the effect doesn't re-run. (In a `StrictMode` dev build you'd see it twice, deliberately, to expose missing cleanup — but these projects don't use `StrictMode`.) → **project 17**

**21.** The tick appears to jump to row **`c`**. The checkbox state lives in the DOM node, and `key={index}` means "position", so after deleting `a` the node that was key 1 (holding the tick) is reused for `c`. Use `key={row.id}`. → **project 03**

**22.** **B.** A `key` change tells React "this is a different component now" — it unmounts the old one and mounts a fresh one, so *every* piece of state inside resets, including state you forget about. The effect in A resets only the one field you remembered, one render late, and grows a new line every time the form grows a field. → **projects 31, 32**

**23.** `onPick={() => setPicked(item.id)}` creates a **brand-new function object** on every render of `List`, so `React.memo` sees a changed prop and re-renders every row on every keystroke. `memo` isn't broken; it's being fed changing props. Fix with a `useCallback` that takes the id as an argument (`useCallback((id) => setPicked(id), [])`), and have `Row` call `onPick(item.id)`. → **projects 28, 30**

**24.** `render b` only. `Row a` has one string prop, unchanged, so memo skips it. `Row b` gets `style={{ color: "red" }}` — a fresh object every render — so its shallow prop comparison fails. Hoist the object to module scope or `useMemo` it. → **project 30**

**25.** **B.** Filtering 30 rows with a string comparison is microseconds; `useMemo` adds a hook, a deps array that can go stale, and a comparison of its own. Memoise when you've *measured* something expensive — and note A's deps are already wrong, since it uses `matches` but lists `query`. → **project 27**

**26.** The whole effect and the `fullName` state should be deleted — compute it during render instead, with a plain template string built from the two names. As written it's a third source of truth that is always one render behind, and it doubles the number of renders per keystroke (type → render → effect → setState → render). → **projects 09, 21**

**27.** The slow `a` response arrives ~740ms after `ab`'s and overwrites it — the user sees results for a query they already replaced. Guard with a flag cleared in cleanup (`let active = true; … return () => { active = false; }`) or an `AbortController`. → **project 19**

**28.** `fetch` only rejects on a **network** failure — a 404 or 500 is a perfectly successful HTTP round trip, so `.catch` never fires and `setUser` gets `{error: "not found"}`. Check the status yourself: `if (!r.ok) throw new Error(\`HTTP ${r.status}\`)` before `.json()`. → **projects 19, 20** (js#50)

**29.** **B.** Three booleans express eight states, of which about three are legal — nothing stops "loading and errored at the same time", and every render has to reason about the impossible combinations. One `status` field can only ever hold one value, and the data lives on the state that has it. → **projects 20, 16**

**30.** **`0`.** `{visible && <Panel />}` unmounts `Panel`, and unmounting throws its state away. Structure decides lifetime: to preserve the count, keep `Panel` mounted and hide it with CSS, or lift the count into `App`. → **project 32**

**31.** `null` on the first mount, then the `<div>` element after the click. Refs are attached *after* React commits the DOM, so during the first render the node doesn't exist yet. This also demonstrates why you must never read `ref.current` during render — it makes the render impure and its value depends on history. → **project 26**

**32.** **B.** State at the top re-renders everything below it on every keystroke, including the 500 rows that don't care about the query. Push the state down to the smallest component that needs it, and if `Results` needs it too, keep `SearchPanel` wrapping just those two. → **project 29**

**33.** The console shows `1`, `2`, `3` — but the button still shows **`0`**. Changing `ref.current` never triggers a render, so the screen keeps showing the value from the last render that happened. If the screen must show it, it's state, not a ref. → **project 26**

**34.** **`1`.** Exactly question 17's bug: the effect ran once with `count` frozen at 0, so all five ticks say "set it to 1". Add `[count]` to the deps and it works but rebuilds the timer every second; the real fix is `setCount((c) => c + 1)`. → **project 11**

**35.** **B.** Eight fields means eight setters, eight handlers, and eight lines to touch whenever the form grows. One object plus one generic handler keyed by `e.target.name` scales for free, and the whole form is one value you can validate, reset or submit. Split state back out only when two fields genuinely change independently. → **project 12**

### ⭐⭐⭐ The deep end

**36.** On mount: `effect 0`. After the click: `cleanup 0`, then `effect 1`. Cleanup runs before the *next* run of the same effect, not only on unmount — which is what makes cleanup the right place to cancel the previous subscription, timer or in-flight request. → **projects 18, 19**

**37.** `value={{ user, setUser }}` builds a **new object every render** of `AuthProvider`, so every consumer sees a changed context value and re-renders — no `memo` in between can stop it. Wrap it: `useMemo(() => ({ user, setUser }), [user])`. Better still, split `user` and `setUser` into two contexts (see question 40). → **projects 33, 34**

**38.** The cleanup removes a *different function object* than the one that was added — two arrows with identical code are not equal — so the listener is never removed and leaks on every effect run. Name the function once and pass the same reference to both calls. → **project 18** (js#25)

**39.** **8.** The queue is `[6, (c) => c + 1, (c) => c + 1]` applied to a base of 5: the value form sets 6, then the updaters are fed the running result — 6 → 7 → 8. Contrast with question 16, where the value form came *last* and stomped the updaters. → **project 11**

**40.** **B.** In A, `dispatch` is delivered inside an object that changes whenever the cart changes, so a component that only dispatches re-renders on every cart update for nothing. Two contexts separate the fast-changing data from the never-changing function. Wrap each in a hook that throws when the provider is missing. → **projects 33, 41**

**41.** With the `key`, changing `userId` unmounts the old form and mounts a brand-new one — the typed "hello" is gone and every field is back to its initial value. Without the `key`, React sees the same component in the same position, keeps the instance and all its state, and the previous user's half-typed text sits there under the new user's name. → **projects 31, 32**

**42.** It mutates `state` and returns the *same* object, so React's `Object.is` check sees no change and the screen never updates — and you've corrupted the previous state too, which breaks undo/redo and time-travel debugging. Return new objects: `{ ...state, todos: state.todos.map((t) => t.id === action.id ? { ...t, done: !t.done } : t) }`. → **projects 10, 13**

**43.** `subscribed` appears **once**. `dispatch` from `useReducer` is guaranteed by React to be the same function object for the lifetime of the component (as are `useState`'s setters), so it never invalidates a deps array. That stability is why reducers make deps arrays easy to keep honest. → **projects 13, 41**

**44.** **B.** A `try/catch` around JSX catches nothing useful — the JSX expression only *creates* an element object; `Chart` doesn't actually run until React renders it, which is outside your `try`. Error boundaries are the only mechanism that catches render-time errors, and you place them around independently failing regions. (They do *not* catch errors in event handlers or async callbacks — those still need `try/catch`.) → **project 37**

**45.** A **new debounced function is created on every render**, so each one has its own private timer and nothing ever gets cancelled — the search fires on every keystroke, exactly what debouncing was supposed to prevent. In a component, debounce the **value**, not the handler: `const query = useDebouncedValue(input, 300)`, then fetch on `[query]`. → **project 24** (js#28)

**46.** **Three requests.** Nothing marks the form as busy, so every click starts another `save`. Add a pending state, guard at the top of the handler (`if (status === "saving") return;`), disable the button *from state*, and reset in a `finally` so a failure doesn't lock the form forever. → **project 44**

**47.** The modal is a child of `.row`, so `overflow: hidden` clips it and the row's stacking context traps it under the header — no `z-index` value can rescue it. Render it through a portal: `createPortal(<div className="modal">…</div>, document.body)`, which puts the DOM node at the top level while keeping it in the React tree, so context and event bubbling still work. → **project 38**

**48.** **`B: 0`.** A custom hook shares *logic*, not state — every component that calls `useCounter()` gets its own independent `useState`. If A and B must agree on a number, that number has to be lifted to a common parent (or a context). → **projects 22, 08**

**49.** Two bugs. `localStorage.getItem` runs on **every render** — a synchronous storage read per keystroke, whose result is thrown away after the first render anyway. And `JSON.parse` on data corrupted by an older version of your app (or by the user) throws *during render*, white-screening the whole component. Both are fixed by the lazy initialiser plus a `try/catch`: `useState(() => { try { const raw = localStorage.getItem(key); return raw === null ? defaultValue : JSON.parse(raw); } catch { return defaultValue; } })`. Stored data is untrusted input. → **project 23**

**50.** `Ada | ada@example.com`, then `Ada | engineer`. On the second render `showBio` is false, so only two `useState` calls happen: `name` takes slot 0 and `email` takes **slot 1** — which still holds `"engineer"` from the first render. That's the entire reason for the rules of hooks: the slot array is matched by call order, and skipping one call shifts every hook after it. → **project 50**

---

*Scored under 35? Don't reread this file — open the `original.html` of the projects you missed, break them on purpose and watch what happens. The bug you've seen with your own eyes is the one you stop writing.*
