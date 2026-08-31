# 🏋️ Practice: The Key Prop

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking. (Every exercise is checkable by reasoning offline; running the page just needs internet once, since React loads from a CDN.)

Exercises modify `refactored/index.html` unless one says to look at `original.html`.

## Exercises

### ⭐ 1. Count the guests (warm-up)

Add a line under the heading that reads "3 guests coming" — and switches to "1 guest coming" (singular) when only one remains. No new state allowed: the number must be computed during render from `guests`, so it updates by itself when rows are removed.

**Practices:** derived values from array state, plus a singular/plural ternary.

**Hint:** `guests.length` is already recomputed on every render; a ternary picks the word.

**Expected:** on load "3 guests coming"; remove Grace and Alan, and it reads "1 guest coming" — with no code that "updates the counter".

### ⭐⭐ 2. Predict: sorting with index keys (core)

This variant uses the **original's** `key={index}` rows, plus a sort button. The user types meals — Ada: fish, Grace: pasta, Alan: steak — then clicks "Sort A to Z". Predict the exact rows on screen afterwards: which name sits next to which meal?

```jsx
<button onClick={() => setGuests((current) =>
  [...current].sort((a, b) => a.name.localeCompare(b.name))
)}>
  Sort A to Z
</button>

{guests.map((guest, index) => (
  <div className="row" key={index}>
    <button onClick={() => removeGuest(guest.id)}>x</button>
    <strong> {guest.name}</strong>
    <input placeholder="meal choice" />
  </div>
))}
```

Bonus: what changes if the key were `guest.id` instead?

**Practices:** reasoning about reconciliation — what index keys make React keep, and where typed text really lives.

**Hint:** sort the array on paper first (`[Ada, Grace, Alan]` becomes what?), then match old key 0/1/2 to new key 0/1/2 the way React does.

**Expected:** your written row-by-row answer matches the solution for both key choices.

### ⭐⭐ 3. Fix the remove button that does nothing (core)

A teammate rewrote `removeGuest` and now clicking **x** does nothing at all — no row disappears, no console error, nothing. Their version:

```jsx
function removeGuest(id) {
  const i = guests.findIndex((g) => g.id === id);
  guests.splice(i, 1);
  setGuests(guests);
}
```

Explain why the screen never changes (be precise about what React compares), then fix it.

**Practices:** replace-don't-mutate for array state — the array cousin of project 02's `Set` rule.

**Hint:** `splice` edits the existing array in place; what does `setGuests` receive, compared with what React already has?

**Expected:** after your fix, clicking x removes exactly that guest's row again.

### ⭐⭐ 4. A "copy" button for each guest (core)

Add a "copy" button to every row that inserts a duplicate of that guest *directly below* the original. The copy shares the name but must be a genuinely new guest — mint it a fresh `id` (LEARN.md's `Date.now()` trick is fine). Build the new array without mutating the current one.

**Practices:** minting a stable id at creation time, and immutable insertion with `slice` and spread.

**Hint:** `[...current.slice(0, i + 1), copy, ...current.slice(i + 1)]` inserts after position `i`.

**Expected:** type "pasta" for Grace, click her copy button: a second "Grace" row appears right below with an **empty** meal box (it's a brand-new row to React), and every already-typed meal stays exactly where it was.

### ⭐⭐⭐ 5. Move a guest up (challenge)

Add an "up" button to every row that swaps that guest with the one above; on the top row it does nothing. Build the reordered array immutably. Then answer the payoff question: after typing meals, does each meal travel with its guest when rows swap — and *why*, given the keys?

**Practices:** immutable reordering, a guard for the edge case, and watching id keys carry row state through a reorder.

**Hint:** copy with `[...current]`, then swap two slots; if `findIndex` says the guest is already first, return `current` unchanged.

**Expected:** type fish/pasta/steak, click "up" on Alan: Alan's row — steak still in its box — now sits between Ada and Grace; clicking "up" on the top row changes nothing on screen.

## Solutions

### 1. Count the guests

```jsx
<h1>Dinner guests</h1>
<p>{guests.length} {guests.length === 1 ? 'guest' : 'guests'} coming</p>
```

**Why:** `guests` is the state, so anything computable from it — its length, the right plural — should be computed during render, not stored. When `removeGuest` replaces the array, React re-renders and the line recomputes itself; there is no counter to forget to update. The ternary reads: if exactly one, say "guest", otherwise "guests".

### 2. Predict: sorting with index keys

Sorting `[Ada, Grace, Alan]` by name gives `[Ada, Alan, Grace]`. With `key={index}` the screen shows:

- **Ada — fish** (key 0: same key, name unchanged, input kept)
- **Alan — pasta** (key 1: React sees "key 1 still exists", updates the *label* Grace to Alan, keeps the DOM — including the input holding pasta)
- **Grace — steak** (key 2: label updated Alan to Grace, input with steak kept)

The names re-ordered but the meals stayed nailed to their positions — Alan "inherits" pasta, Grace "inherits" steak. **Bonus:** with `key={guest.id}`, React matches 101/102/103 by identity and *moves the actual DOM rows*, so the screen shows Ada — fish, Alan — steak, Grace — pasta: every meal travels with its owner.

**Why:** keys are the only thing React uses to match old rows to new rows. Index keys say "row 1 is whoever sits at position 1", so a sort changes the labels, not the rows — and the typed text lives in the row's DOM (these inputs are uncontrolled). Id keys say "this row IS guest 103", so reordering moves the whole row, state and all.

### 3. Fix the remove button that does nothing

```jsx
function removeGuest(id) {
  setGuests((current) => current.filter((g) => g.id !== id));
}
```

**Why:** `splice` mutated the array *in place*, so `setGuests(guests)` handed React the very same object it already had. React compares the new state with the old using `Object.is`; identical object means "nothing changed", so it skips the re-render entirely — meanwhile the data really did lose a guest, so state and screen are silently out of sync. `filter` builds a brand-new array, which React sees as a change; the updater form (`(current) => ...`) is the guaranteed-latest-state habit the refactor already uses.

### 4. A "copy" button for each guest

```jsx
function duplicateGuest(id) {
  setGuests((current) => {
    const i = current.findIndex((g) => g.id === id);
    const copy = { id: Date.now(), name: current[i].name };
    return [...current.slice(0, i + 1), copy, ...current.slice(i + 1)];
  });
}
```

And in each row, next to the remove button:

```jsx
<button onClick={() => duplicateGuest(guest.id)}>copy</button>
```

**Why:** the copy gets a *fresh* id minted at creation time — reusing the original's id would give two rows the same key, and React could no longer tell them apart. Because the key is new, React mounts a brand-new row: that's why its meal box is empty while every existing row keeps its typed meal (their keys still match, so their DOM survives). The two `slice` calls plus spread build a new array around the insertion point without touching `current`.

### 5. Move a guest up

```jsx
function moveUp(id) {
  setGuests((current) => {
    const i = current.findIndex((g) => g.id === id);
    if (i <= 0) return current;               // already first: change nothing
    const next = [...current];
    [next[i - 1], next[i]] = [next[i], next[i - 1]];
    return next;
  });
}
```

And in each row:

```jsx
<button onClick={() => moveUp(guest.id)}>up</button>
```

**Why:** `[...current]` makes a fresh array we're allowed to rearrange (the destructuring swap `[a, b] = [b, a]` exchanges the two slots), so React receives a new object and re-renders. For the top row we return `current` itself — React sees the identical object and correctly skips re-rendering, which is exactly the do-nothing behavior we want. And the payoff: because rows are keyed by `guest.id`, React recognizes Alan's row as *the same row* in its new position and moves the real DOM node — the uncontrolled input, steak and all, travels with him. With index keys this same feature would shuffle the meals, exercise-2 style.
