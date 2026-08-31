# 🏋️ Practice: usePersistentState

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking. (Once for this file: the pages fetch React from a CDN, so run them when you're online; everything below is checkable by reading your own code and reasoning about it.)

All exercises modify `refactored/index.html` unless they say otherwise, and each one starts from the shipped refactor, not from the previous exercise's answer.

## Exercises

### ⭐ 1. Clamp the font size (warm-up)

Right now `+` grows the text forever and `-` marches happily past zero into negative numbers. Clamp it: `+` stops at 40, `-` stops at 10. Do it using the **updater form** of the setter (`setFontSize((s) => ...)`) and change nothing inside `usePersistentState`.

**Practices:** confirming the "drop-in replacement" claim — the hook hands back React's real setter, so updater form works for free.

**Hint:** `Math.min` on the way up, `Math.max` on the way down.

**Expected:** hold down `+` and the number parks at 40; hold `-` and it parks at 10. Refresh: it comes back at the clamped value, because you didn't touch the persistence at all.

### ⭐⭐ 2. A "reset to defaults" button (core)

Add a button that puts all three settings back to `'light'`, `16`, and `''`. First write down what a colleague's one-line attempt — `onClick={() => localStorage.clear()}` — actually does on screen, then write the version that works.

**Practices:** state is the source of truth; storage is a mirror of it. Reset the source, not the reflection.

**Hint:** three setter calls. The write-through effect will take care of the storage side without being asked.

**Expected:** `localStorage.clear()` alone changes nothing visible — dark stays dark, the name stays typed — and only a refresh reveals the wipe. Your version flips the page to light, the size to 16, and empties the name immediately, and the three storage entries now hold the *default* values (not nothing).

### ⭐⭐ 3. Predict: one hook, two profiles (core)

Someone builds a per-profile name field on top of the hook. Before this page ever loads, storage already holds `name:a` = `"Ada"` and `name:b` = `"Bob"` (with the quotes — that's JSON). Predict four things: what the input shows on load; what it shows immediately after one click of "switch"; what `name:b` holds in storage after that click; and what you see after switching back to `a`.

```jsx
function App() {
  const [profile, setProfile] = useState('a');
  const [name, setName] = usePersistentState('name:' + profile, '');
  return (
    <div>
      <p>profile {profile}{' '}
        <button onClick={() => setProfile(profile === 'a' ? 'b' : 'a')}>switch</button></p>
      <input value={name} onChange={(e) => setName(e.target.value)} />
    </div>
  );
}
```

**Practices:** when each half of the hook runs — the lazy initializer versus the write-through effect.

**Hint:** how many times in a component's life does the function you pass to `useState` run? Now look at the effect's dependency array and notice that `key` is in it.

**Expected:** your written prediction matches the solution, including which stored name gets destroyed and by which line of the hook.

### ⭐⭐ 4. Parse is not validate (core)

An older build of this app stored the font size as a *string*: `localStorage` holds `"16"` (a JSON string) instead of `16`. That is perfectly valid JSON, so the `try/catch` waves it through. Predict what the page looks like on load and what the size reads after one click of `+`, then give the hook a third parameter, `isValid`, so a parsed-but-wrong-shaped value falls back to the default too.

**Practices:** guarded loads guard *syntax*; a schema check guards *meaning*.

**Hint:** `"16" + 2` is not `18`. And React only appends `px` to style numbers, never to strings.

**Expected:** before the fix, the text renders at the page's inherited size and the label reads "font size: 162" after one click. After the fix, the same corrupt entry loads as `16`, the buttons behave, and the bad entry is silently overwritten with clean JSON the moment the page mounts.

### ⭐⭐⭐ 5. Make the key change mean something (challenge)

Fix the bug you predicted in exercise 3, inside the hook: when `key` changes, the hook should load *that* key's stored value instead of carrying the old one across and stomping on it. Keep `useState`'s signature — including updater-form setters — and don't add a `useEffect` that "resets on key change" (that would render the wrong value once first).

**Practices:** adjusting state during render when an input changes, and keeping a value glued to the key it came from.

**Hint:** store `{ key, value }` as one state object. During render, if `state.key !== key`, call the setter — React throws that render away and immediately re-renders with the corrected state.

**Expected:** with `name:a` = `"Ada"` and `name:b` = `"Bob"` in storage, the input reads Ada, then Bob, then Ada again as you switch, and neither entry is ever overwritten by the other's value.

### ⭐⭐⭐ 6. Two components, one key, one truth (challenge)

LEARN.md's experiment 4 points out the design limit: two components calling `usePersistentState('username', '')` share a *storage key* but not *state*, so typing in one leaves the other stale until a reload. Close the gap. Rebuild the hook around a module-level cache plus a set of subscribers per key, so every consumer of a key re-renders when any of them writes.

**Practices:** an external store with subscribe/notify — the shape behind Redux, Zustand, and `useSyncExternalStore`.

**Hint:** two module-level `Map`s (`key → value`, `key → Set of setters`), a `useEffect` that adds this component's `setValue` on mount and removes it on cleanup, and a setter that writes the cache, writes storage, then notifies everyone.

**Expected:** render `<NameBox />` twice; type in one and the other's input updates on the same keystroke, no refresh. Reload and both still show the saved name.

## Solutions

### 1. Clamp the font size

```jsx
<button onClick={() => setFontSize((s) => Math.min(40, s + 2))}>+</button>
<button onClick={() => setFontSize((s) => Math.max(10, s - 2))}>-</button>
```

**Why:** `usePersistentState` returns React's own `setValue` unmodified, so everything `useState`'s setter can do it can do — including the updater form, which computes from the latest value rather than the one this render closed over. That is what "same signature" buys you: no special calling convention to learn, and no hook edit for a pure call-site concern. The clamp is app policy, the persistence is hook policy, and neither leaked into the other.

### 2. A "reset to defaults" button

```jsx
function resetAll() {
  setTheme('light');
  setFontSize(16);
  setUsername('');
}
// ...
<button onClick={resetAll}>reset to defaults</button>
```

**Why:** `localStorage.clear()` deletes the mirror while React's state — the thing actually on screen — sails on unchanged; nothing re-reads storage after mount, so the page looks identical until a refresh. (Worse, the next `+` click re-saves the old-ish value, so the wipe half-undoes itself.) Setting state is the honest move: the three components re-render, and the write-through effect mirrors the defaults into storage on its own. Note the end state — the keys exist holding `"light"`, `16`, `""` — which is what you want; "no entry" and "the default" already mean the same thing on load.

### 3. Predict: one hook, two profiles

On load the input shows **Ada**. After one click of switch it *still* shows **Ada** — and `name:b` in storage has been changed from `"Bob"` to `"Ada"`. Switching back shows **Ada** again. Bob is gone forever.

**Why:** the function you pass to `useState` runs **once per mount**, so the lazy initializer read `name:a` at mount and will never read storage again — changing `key` does not re-initialize state. The write-through effect, though, *does* have `key` in its deps, so the moment the key becomes `'name:b'` it fires and writes the current value under the new key: `setItem('name:b', '"Ada"')`. The two halves of the hook disagree about what `key` means — one treats it as a mount-time constant, the other as a live input — and the destructive half wins. This is the general hazard with any "init once, sync forever" hook, and exercise 5 is the repair.

### 4. Parse is not validate

Before the fix: `JSON.parse('"16"')` returns the string `"16"`, which sails through the `try/catch` because nothing threw. `style={{ fontSize: "16" }}` renders as `font-size:16` — no unit, so the browser discards the declaration and the text stays at its inherited size. One click of `+` computes `"16" + 2`, which is string concatenation: `"162"`. The label reads "font size: 162" and still nothing resizes.

```jsx
function usePersistentState(key, defaultValue, isValid = () => true) {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored === null) return defaultValue;
      const parsed = JSON.parse(stored);
      return isValid(parsed) ? parsed : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
}

const isSize = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 10 && v <= 40;
const isTheme = (v) => v === 'light' || v === 'dark';

const [theme, setTheme] = usePersistentState('theme', 'light', isTheme);
const [fontSize, setFontSize] = usePersistentState('fontSize', 16, isSize);
```

**Why:** `try/catch` only catches a *throw*, and `JSON.parse` throws on bad syntax, not on the wrong shape — `"16"`, `true`, and `{"px":16}` are all syntactically fine and all wrong here. A validator turns "did it parse?" into "is it something this setting can actually be?", which is the real question at a trust boundary. `isValid` needs no place in the effect's deps because it's only consulted inside the initializer, so passing a fresh inline arrow each render costs nothing. Bonus behavior you get free: the write-through effect runs on mount too, so a rejected entry is immediately rewritten as clean JSON — storage heals itself on load.

### 5. Make the key change mean something

```jsx
const { useState, useEffect, useCallback } = React;   // add useCallback

function loadFrom(key, defaultValue) {
  try {
    const stored = localStorage.getItem(key);
    return stored === null ? defaultValue : JSON.parse(stored);
  } catch {
    return defaultValue;
  }
}

function usePersistentState(key, defaultValue) {
  const [entry, setEntry] = useState(() => ({ key, value: loadFrom(key, defaultValue) }));

  if (entry.key !== key) {
    setEntry({ key, value: loadFrom(key, defaultValue) }); // adjust state during render
  }

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(entry.value));
  }, [key, entry.value]);

  const setValue = useCallback((update) => {
    setEntry((prev) => ({
      key: prev.key,
      value: typeof update === 'function' ? update(prev.value) : update,
    }));
  }, []);

  return [entry.value, setValue];
}
```

**Why:** binding the value to the key it was loaded with makes the mismatch *detectable* — `entry.key !== key` is the question the old hook could never ask. Setting state during render is legal and cheap when you set the *same* component's state: React discards the in-progress output and re-renders immediately, before the browser paints or any effect runs, so the write-through effect never sees a key/value pair from different profiles. The guard makes it terminate (after the setter, `entry.key === key`). `setValue` supports both `setName('Bob')` and `setName((n) => n + '!')` to keep the drop-in promise, and `useCallback([])` is safe because it closes over nothing but `setEntry`, which React guarantees is stable.

### 6. Two components, one key, one truth

```jsx
const { useState, useEffect, useCallback } = React;   // useCallback again

const cache = new Map();     // key -> latest value
const listeners = new Map(); // key -> Set of setState functions

function readKey(key, defaultValue) {
  if (cache.has(key)) return cache.get(key);
  let value = defaultValue;
  try {
    const stored = localStorage.getItem(key);
    if (stored !== null) value = JSON.parse(stored);
  } catch { /* corrupted: keep the default */ }
  cache.set(key, value);
  return value;
}

function usePersistentState(key, defaultValue) {
  const [value, setValue] = useState(() => readKey(key, defaultValue));

  useEffect(() => {
    let subs = listeners.get(key);
    if (!subs) { subs = new Set(); listeners.set(key, subs); }
    subs.add(setValue);
    setValue(readKey(key, defaultValue)); // catch up on mount / key change
    return () => { subs.delete(setValue); };
  }, [key]);

  const setShared = useCallback((update) => {
    const prev = cache.get(key);
    const next = typeof update === 'function' ? update(prev) : update;
    cache.set(key, next);
    try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* full/blocked */ }
    (listeners.get(key) || []).forEach((notify) => notify(next));
  }, [key]);

  return [value, setShared];
}
```

**Why:** the old hook gave every call site its own private `useState`, which is exactly why two of them drifted apart. Here the truth lives in one module-level `cache`, each component keeps a local copy purely so React knows when to re-render, and the setter is the single write path: update the cache, mirror to storage, notify every subscriber. The write-through effect disappears because writing now has an obvious home — the moment of writing. Two details worth naming: notifying subscribers happens *outside* an updater function (updaters must stay pure, and React may run them twice), and unsubscribing in the effect's cleanup is what stops unmounted components from being called. You have just built a miniature external store — the same subscribe/notify skeleton behind `useSyncExternalStore` and every state library, and the direction project 41 goes next.
