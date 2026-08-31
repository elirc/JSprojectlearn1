# 📘 Learning Guide: usePersistentState

*Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.*

## 1. What are we building?

A settings page with three preferences:

- **theme** — light/dark, with a toggle button (dark mode really flips the page colors)
- **font size** — a number with + / − buttons that visibly grows/shrinks the text
- **name** — a text input for your username

All three should **survive a page refresh** — that's the whole point of settings. In the original, theme and font size survive, but type your name, hit refresh, and it's gone. The refactor makes all three survive with a custom hook, `usePersistentState`, that looks exactly like `useState` but remembers.

## 2. Concepts you need first

### `localStorage` — the browser's little notebook

Normally, all your React state dies when the page reloads (it lives in JavaScript memory, and reload wipes memory). `localStorage` is a small storage area the browser keeps **per website, on disk**, surviving reloads, tab closes, even reboots. Its API is tiny, and it only stores strings:

```js
localStorage.setItem('theme', 'dark');   // save
localStorage.getItem('theme');           // -> 'dark' (or null if never saved)
localStorage.removeItem('theme');        // delete
```

Important character trait: it's **user-editable**. Anyone can open the browser's developer tools and change or corrupt these values. Treat what you read from it like input from a stranger, not like your own variable.

### JSON — storing more than strings

`localStorage` holds only strings, but settings are numbers, booleans, objects... JSON (JavaScript Object Notation) is the standard text format for encoding values:

```js
JSON.stringify({ size: 16 });   // -> '{"size":16}'   (value -> string)
JSON.parse('{"size":16}');      // -> { size: 16 }     (string -> value)
JSON.parse('not json!');        // -> THROWS an error
```

That last line matters: `JSON.parse` on corrupted text doesn't return something wrong — it throws, crashing whatever called it unless someone catches.

### `try` / `catch` — surviving a throw

```js
try {
  const v = JSON.parse(maybeCorrupt);  // might throw
  use(v);
} catch {
  useDefaultInstead();                 // runs only if the try block threw
}
```

A guarded load: attempt the risky read, fall back to a safe default on failure. The refactor wraps every storage read in exactly this.

### Lazy initialization — `useState(() => ...)`

Normally you pass `useState` a value: `useState(0)`. You can instead pass a **function**, and React calls it **once, on the first render only**, to compute the initial value:

```jsx
const [v, setV] = useState(() => expensiveComputation());
```

Why it matters: a component body re-runs on *every* render. `useState(localStorage.getItem('k'))` performs the storage read every render (and throws the result away after the first — `useState` ignores the argument once initialized). `useState(() => localStorage.getItem('k'))` reads once. For anything slow — disk reads, parsing — the function form is the right one.

### Write-through with an effect

To save automatically whenever a value changes, pair the state with an effect (project 17's LEARN.md teaches effects and deps):

```jsx
useEffect(() => {
  localStorage.setItem(key, JSON.stringify(value));
}, [key, value]);   // runs after any render where key or value changed
```

Storage is the *outside world*, so an effect is the legitimate tool here (project 21's test: outside world involved? yes). This is called *write-through*: every change is immediately mirrored to storage; there is no separate "save" step to forget.

### Returning `[value, setValue]` — matching useState's signature

A function's *signature* is what it takes and returns. `useState` returns a two-item array you destructure: `const [x, setX] = useState(...)`. A custom hook (project 22's LEARN.md — a plain function calling hooks) can return the same shape, making it a **drop-in replacement**: change `useState(16)` to `usePersistentState('fontSize', 16)` and nothing else in the component changes.

## 3. Walking through the original code

Three settings, three different persistence strategies — that's the disease.

**Setting 1: theme — manual save in the handler:**

```jsx
const [theme, setTheme] = useState(
  localStorage.getItem('theme') || 'light',
);

function toggleTheme() {
  const next = theme === 'light' ? 'dark' : 'light';
  setTheme(next);
  localStorage.setItem('theme', next); // save is manual, here...
}
```

Reads storage **on every render** (no lazy init — the read runs each time the body runs). Saves only because the handler remembers to. `|| 'light'` supplies a default when storage is empty.

**Setting 2: font size — saved via an effect instead:**

```jsx
const [fontSize, setFontSize] = useState(
  Number(localStorage.getItem('fontSize')) || 16,
);
useEffect(() => {
  localStorage.setItem('fontSize', fontSize);
}, [fontSize]);
```

A different author, a different strategy. Also unguarded: if storage holds `"abc"`, `Number('abc')` is `NaN` (Not-a-Number). `NaN || 16` does rescue it here, but store `"0"` and you also get 16 (`0` is falsy) — the `||` trick is a crude guard with edge-case holes.

**Setting 3: username — no persistence at all:**

```jsx
const [username, setUsername] = useState('');
```

Whoever added it forgot. And here's the point the README makes: the pattern *existed* in the first two settings — but as **prose to imitate**, not **code to call**. The third author had to notice, understand, and re-implement it. They didn't.

**Applying the theme** (this part is fine and stays in the refactor):

```jsx
useEffect(() => {
  document.body.className = theme === 'dark' ? 'dark' : '';
}, [theme]);
```

## 4. What's wrong with it (in beginner terms)

1. **The vanishing username.** On screen: type "Eli" in the name field, press F5. The field is empty. Theme and font size survived, so the *page* clearly knows how to persist — it just forgot for this one field. Users experience this as "the app randomly forgets my stuff."
2. **Three strategies for one job.** Manual save in a handler, effect save, no save. Every new setting forces a choice, every choice can be wrong, and a reader can't learn "the way we persist" because there isn't one.
3. **Storage read on every render.** The theme line hits `localStorage` each time the component re-renders. Harmless at this size; a habit that hurts at scale (storage reads are much slower than memory).
4. **No guards on load.** Open devtools, set `fontSize` to `"abc"`, reload. `Number('abc')` → `NaN` — here the `||` catches it, but the theme line would happily accept any garbage string as a "theme", and a `JSON.parse`-based version with no try/catch would *crash on load*. Storage is user-editable input; this code trusts it like a constant.

## 5. Try it yourself first!

1. **Vague hint:** the fix isn't "add the missing save line for username." It's making persistence something you *can't* forget — by baking it into the thing you use to declare the state.
2. **Shape first:** you want `const [username, setUsername] = usePersistentState('username', '')` to work. Write the function skeleton: takes `key` and `defaultValue`, returns `[value, setValue]`.
3. **Loading:** inside, `useState(() => ...)` with a function that reads `localStorage.getItem(key)`, returns the default if it's `null`, otherwise `JSON.parse`s it — all wrapped in try/catch that falls back to the default.
4. **Saving:** one effect: `localStorage.setItem(key, JSON.stringify(value))`, deps `[key, value]`.
5. **Swap it in:** replace all three settings' `useState` calls. Delete the manual save from `toggleTheme` and the fontSize effect — the hook does both jobs now.
6. **Test like a vandal:** in devtools, set a stored value to garbage and reload. Your page should shrug and show defaults.

## 6. Understanding the refactored solution

**The hook — all policy, one place:**

```jsx
function usePersistentState(key, defaultValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored === null ? defaultValue : JSON.parse(stored);
    } catch {
      return defaultValue; // corrupted entry: fall back, don't crash
    }
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
}
```

Four policy decisions, each made once, each done right:

1. **Lazy init** — the arrow passed to `useState` runs once on mount, not per render. Storage is read exactly one time per component life.
2. **JSON both ways** — numbers, strings, booleans, objects, arrays all round-trip. `fontSize` is stored as `16`, not `"16"`, and comes back as a number — no `Number()` coercion, no `NaN` trap.
3. **Guarded load** — `null` (never saved) → default; corrupted JSON → `catch` → default. The page cannot be crashed by storage vandalism.
4. **Write-through** — the effect mirrors every change to storage automatically. No save call exists anywhere else in the app to be forgotten.

**The app — persistence became a one-word decision:**

```jsx
const [theme, setTheme] = usePersistentState('theme', 'light');
const [fontSize, setFontSize] = usePersistentState('fontSize', 16);
const [username, setUsername] = usePersistentState('username', '');
```

Read the third line slowly: the username didn't remember to persist — **it couldn't forget.** Using the hook *is* the persistence. The README's phrase for this: the policy moved *from convention to construction*. A convention ("remember to save settings") requires memory and discipline; a construction (the only state tool in sight persists automatically) requires nothing.

`toggleTheme` shrank to just `setTheme(...)` — the manual save line is gone. The theme-applying effect (setting `document.body.className`) stays, because that's a different, legitimate job: syncing the DOM with state.

This is project 22's lesson compounding: `useFetch` packaged status + race guard; `usePersistentState` packages init + parse + guard + save. Custom hooks are where correctness machinery goes to be *inherited* rather than re-remembered.

## 7. Words you learned (glossary)

- **`localStorage`** — per-site browser storage that survives reloads; stores only strings.
- **`getItem` / `setItem`** — read / write one named entry; `getItem` returns `null` if absent.
- **Persistence** — data surviving beyond the page's lifetime.
- **JSON** — text format for encoding values; `stringify` encodes, `parse` decodes.
- **`JSON.parse` throws** — corrupted input causes an error, not a wrong value.
- **`try` / `catch`** — attempt risky code; on a throw, run the fallback instead of crashing.
- **Guarded load** — reading external data defensively, with a default on failure.
- **Lazy initialization** — `useState(() => ...)`: compute the initial value once, not every render.
- **Write-through** — automatically mirroring every state change to storage via an effect.
- **`NaN`** — "Not a Number," the result of failed numeric conversion; contagious in arithmetic.
- **Falsy** — values `||` treats as "missing": `false, 0, '', null, undefined, NaN` — why `|| default` is a crude guard.
- **Signature** — what a function takes and returns; matching `useState`'s makes a hook drop-in.
- **Drop-in replacement** — swappable with no other code changes.
- **Convention vs construction** — a rule people must remember vs a structure that enforces itself.

## 8. Experiments to try on the plane (no internet needed)

CDN note (once): the pages fetch React from the internet on first load; `localStorage` itself works fully offline. Predict outcomes now, verify when the page can load (or if cached).

1. **Vandalize storage.** With the refactor loaded, open devtools → Application/Storage → Local Storage, and set `fontSize` to `garbage{{{`. Reload. Prediction: the page loads fine at size 16 (the catch caught it) — and the moment you click +, the garbage is overwritten with clean JSON (`18`) by write-through.
2. **Add a fourth setting.** In the refactor, add `const [compact, setCompact] = usePersistentState('compact', false);` with a checkbox (`<input type="checkbox" checked={compact} onChange={(e) => setCompact(e.target.checked)} />`). Prediction: it persists across reloads with zero persistence code written — and note it's a *boolean*, round-tripped by JSON for free.
3. **Watch the original re-read storage.** In `original.html`, wrap the theme init: `useState((() => { console.log('storage read!'); return localStorage.getItem('theme') || 'light'; })())` — note the immediate call `()`. Prediction: "storage read!" logs on *every* render (each + click). Then convert it to true lazy form (pass the function, don't call it) and see it log once.
4. **Two components, one key.** Render a second component that also calls `usePersistentState('username', '')`. Prediction: both load the same initial name, but typing in one does NOT live-update the other (each call has independent state — project 22's rule); only a reload re-syncs them. Shared *storage* is not shared *state* — a real design limit of this hook worth knowing.
5. **Store an object.** Change username to `usePersistentState('profile', { name: '', color: 'blue' })` and update via `setProfile((p) => ({ ...p, name: e.target.value }))`. Prediction: works and persists — objects survive the JSON round-trip; the hook never assumed strings.
