# 🏋️ Practice: Resetting State with key

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

(Once for this file: everything is writable and predictable offline; running the page needs the CDN or a cached load.)

## Exercises

### ⭐ 1. Predict: keying on the wrong field (warm-up)

Suppose the refactor used `key={user.name}` instead of `key={user.id}`, and the data gained a third user: `{ id: 3, name: 'Ada', bio: 'Countess of Lovelace.' }` (a second Ada), with a third button. Predict exactly what happens to the draft when you: edit Ada #1's draft → switch to Grace → switch to Ada #3.

*Practices:* keys are identity — React resets only when the key *value* actually changes.
*Hint:* between Grace and Ada #3, did the key change? Between Ada #1 and Grace?
*Expected:* your prediction matches the solution, including which bio text ends up in the box at the end.

### ⭐⭐ 2. Unsaved-changes dot (core)

Show `• unsaved` next to the user's name whenever the draft differs from the user's saved bio — and make it disappear the moment they match again (including right after a user switch). Use no new state.

*Practices:* deriving during render (project 09) inside a key-reset component.
*Hint:* you already have both values in scope: `draft` and `user.bio`.
*Expected:* fresh page → no dot; type a character → dot appears; delete back to the original text → dot gone; switch users → new card starts dot-free (fresh instance, draft === bio).

### ⭐⭐ 3. A real Save button (core)

Make edits persistable: move `USERS` into App state and give `BioEditor` an `onSave(id, draft)` prop wired to a Save button. Then verify the full loop: edit Ada → Save → switch to Grace → switch back to Ada. What must the box show, and why does saving *not* remount the editor?

*Practices:* choosing what lifts (saved data, shared) vs what stays colocated (the draft); key stability under prop changes.
*Hint:* update the array immutably: `users.map(u => u.id === id ? { ...u, bio } : u)`.
*Expected:* after the round trip, Ada's box shows the saved text (the fresh instance initializes from the *updated* bio). Clicking Save changes props but not the key, so the instance — and your cursor position — survive.

### ⭐⭐ 4. The timer that follows you (planted bug) (core)

Add this component and render it in `App` under the editor — deliberately as written:

```jsx
function ViewTimer() {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);
  return <p><small>viewing this profile for {secs}s</small></p>;
}
```

Bug report: "the timer doesn't restart when I switch users — it says I've viewed Grace for 40s after two seconds." Explain why, then fix it *without touching `ViewTimer`'s code*.

*Practices:* recognizing "state outliving its subject" beyond text inputs — timers, animations, scroll positions.
*Hint:* same position, same type, no key → same instance → `secs` survives the switch.
*Expected:* after the fix, switching users restarts the count at 0; staying put keeps counting up.

### ⭐⭐⭐ 5. Partial reset — where key is the wrong tool (challenge)

New requirement for a different widget: a `FilteredList` has a `filter` text box and a `page` number (Prev/Next buttons over 10 items per page). When the filter changes, the **page must reset to 0 — but the filter box must keep focus and its text**. Explain why `key={filter}` on the list is unacceptable, then implement the reset with the compare-during-render pattern.

*Practices:* full reset = `key`; partial reset = adjust state during render from a previous-value comparison.
*Hint:* keep a `prevFilter` state; when it disagrees with `filter` during render, set both `prevFilter` and `page` before returning JSX.
*Expected:* typing narrows results and every keystroke shows page 0 immediately (no wrong-page flash); paging then works; the input never loses focus or text.

## Solutions

### 1. Predict: keying on the wrong field

Ada #1 → Grace: key changes `'Ada'` → `'Grace'`, so the instance is destroyed and your edit is discarded — Grace's bio appears fresh (correct). Grace → Ada #3: key changes `'Grace'` → `'Ada'`, new instance, initialized from *Ada #3's* bio: `Countess of Lovelace.` — correct here, but only by luck. The real failure: switching **Ada #1 → Ada #3 directly** would keep the key `'Ada'`, so the instance survives and Ada #3's card shows *Ada #1's draft* — state bleeding between two different people.

**Why:** `key` compares by value; React resets on *change*, not on your intent. Keys must be tied to the subject's stable, unique identity — `id`, never a display field like `name` that can collide or be edited. This is the same rule as list keys (project 03), used for the same reason.

### 2. Unsaved-changes dot

```jsx
function BioEditor({ user }) {
  const [draft, setDraft] = useState(user.bio);
  const dirty = draft !== user.bio; // derived — no new state

  return (
    <div className="card">
      <h3>{user.name} {dirty && <small style={{ color: '#c60' }}>• unsaved</small>}</h3>
      <textarea rows="3" value={draft} onChange={(e) => setDraft(e.target.value)} />
      <p><small>draft: "{draft}"</small></p>
    </div>
  );
}
```

**Why:** "is the draft different from the saved bio?" is answerable from values already in render scope, so it's a derived value — storing it in state would create a second source of truth to keep synchronized. The key-reset guarantees the switch case for free: a new instance initializes `draft` to `user.bio`, so `dirty` starts `false` without any reset code.

### 3. A real Save button

```jsx
function BioEditor({ user, onSave }) {
  const [draft, setDraft] = useState(user.bio);
  return (
    <div className="card">
      <h3>{user.name}</h3>
      <textarea rows="3" value={draft} onChange={(e) => setDraft(e.target.value)} />
      <button onClick={() => onSave(user.id, draft)}>Save</button>
    </div>
  );
}

function App() {
  const [users, setUsers] = useState(USERS);
  const [selectedId, setSelectedId] = useState(1);
  const user = users.find((u) => u.id === selectedId);

  function handleSave(id, bio) {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, bio } : u)));
  }
  // buttons map over `users`; editor:
  // <BioEditor key={user.id} user={user} onSave={handleSave} />
}
```

**Why:** the *saved* bios are shared data (the buttons' list and any future reader), so they lift into `App`; the *draft* stays colocated because only the editor reads it. Saving replaces the user object immutably — props change, but `key={user.id}` is the same value, so React updates the existing instance in place: no remount, no lost focus, and `draft` keeps its (already-matching) text. The round trip works because the return switch mounts a *fresh* instance whose initializer reads the updated `user.bio`.

### 4. The timer that follows you

The fix is one attribute in `App`:

```jsx
<ViewTimer key={user.id} />
```

**Why:** without a key, `ViewTimer` sits at the same tree position with the same type across switches, so React reuses the instance — `secs` and the running interval both survive; the timer measures "time since page load", not "time on this profile". Keying it on `user.id` makes each user's timer a different *thing*: switch → old instance unmounts (cleanup clears the old interval — no leak) → new instance mounts at 0. The component's code was never wrong; its *identity* was underspecified — exactly the README's "per-item timers" case.

### 5. Partial reset — where key is the wrong tool

`key={filter}` would remount the whole widget on every keystroke — nuking the input's focus (and, if the input lived inside, its text): a full reset where the requirement demands a partial one. Instead:

```jsx
const ITEMS = Array.from({ length: 200 }, (_, i) => `item ${i}`);

function FilteredList() {
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(0);
  const [prevFilter, setPrevFilter] = useState(filter);

  if (filter !== prevFilter) {   // adjust state DURING render
    setPrevFilter(filter);
    setPage(0);
  }

  const matches = ITEMS.filter((it) => it.includes(filter));
  const pageItems = matches.slice(page * 10, page * 10 + 10);

  return (
    <div>
      <input value={filter} onChange={(e) => setFilter(e.target.value)} />
      <ul>{pageItems.map((it) => <li key={it}>{it}</li>)}</ul>
      <button disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Prev</button>
      page {page + 1} / {Math.max(1, Math.ceil(matches.length / 10))}
      <button disabled={(page + 1) * 10 >= matches.length}
              onClick={() => setPage((p) => p + 1)}>Next</button>
    </div>
  );
}
```

**Why:** calling a setter during render is legal *for the component currently rendering*: React discards the in-progress output and immediately re-runs the function with the new state — so the wrong-page frame is never painted, unlike an effect-based reset which paints first and corrects after. The `prevFilter` state is the memory that makes "did the filter change?" answerable inside render. Rule of thumb the README hands you: reset *everything* → `key`; reset *some* state while other state survives → derive it, or compare-and-adjust during render.
