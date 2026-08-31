# 📘 Learning Guide: The Key Prop

*Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.*

## 1. What are we building?

A dinner guest list. Three rows: Ada, Grace, Alan. Each row has an "x" button to remove that guest, the guest's name, and a text box for typing their meal choice.

The page itself tells you the experiment: (1) type a meal for each guest — Ada: fish, Grace: pasta, Alan: steak; (2) remove Grace, the middle row; (3) look at Alan. In the original, **Alan now shows Grace's pasta**. In the refactor, everyone keeps their own meal. The only code difference that matters is one attribute.

## 2. Concepts you need first

Components, JSX, `useState`, event handlers, and `map` are taught from scratch in project 01's LEARN.md; toggling and updater functions in project 02's. Here's what's new.

### How React updates the screen: reconciliation

When state changes, React re-runs your component and gets a *new description* of the screen. It then compares the new description with the old one and changes only what differs in the real page. This diffing process is called **reconciliation**. It's why React is fast — and it's where keys come in.

### Mounting and unmounting

When React puts an element on the page for the first time, that's *mounting*. When it removes one, that's *unmounting* — and everything that element privately held (typed text, focus, scroll position) is destroyed with it. When React decides an element is "the same one as before," it *keeps* it and merely updates its attributes and text.

So the million-dollar question during reconciliation is: **"is this the same item as before, or a different one?"**

### The `key` prop is React's answer

For a list made with `map`, React matches old items to new items **by key**. Same key = same item, keep its DOM and state. Key gone = that item left, unmount it. New key = new item, mount it fresh.

```jsx
{guests.map((guest) => (
  <div key={guest.id}>...</div>   // "this row IS guest 102, wherever it sits"
))}
```

A key must be **stable** (same item keeps the same key across renders) and **unique among siblings**.

### Index as key — the trap

`map` hands your function a second argument: the item's position, starting at 0.

```jsx
{guests.map((guest, index) => (
  <div key={index}>...</div>      // "this row is whoever sits at position 1"
))}
```

This makes the warning about missing keys go away — but position is not identity. Delete the middle item and everyone below shifts up one position: the *people* moved but the *position numbers* didn't. React, matching by key, concludes nobody left except the last row.

### Uncontrolled inputs: state that lives in the DOM

The meal text boxes here have no `value` prop and no `onChange`. That makes them **uncontrolled**: the browser itself remembers what's typed, inside the DOM element. React doesn't know or care what's in them. This matters because that hidden text travels with the DOM element — wherever React decides that element "belongs." (Project 07 covers controlled vs uncontrolled inputs properly.)

### `filter` to remove an item

```js
guests.filter((g) => g.id !== 102)  // new array without guest 102
```

`filter` builds a **new** array containing only the items that pass the test — the React-safe, no-mutation way to delete from a list.

## 3. Walking through the original code

State is the guest array, each guest already carrying a perfectly good id:

```jsx
const [guests, setGuests] = useState([
  { id: 101, name: 'Ada' },
  { id: 102, name: 'Grace' },
  { id: 103, name: 'Alan' },
]);
```

Removal filters by id:

```jsx
function removeGuest(id) {
  setGuests(guests.filter((g) => g.id !== id));
}
```

A new array without that guest is handed to React, triggering a re-render. (Small note: the refactor writes this as `setGuests((current) => current.filter(...))` — the updater form from project 02. Both work here.)

Now the rows — read the `key` closely:

```jsx
{guests.map((guest, index) => (
  <div className="row" key={index}>
    <button onClick={() => removeGuest(guest.id)}>x</button>
    <strong> {guest.name}</strong>
    <input placeholder="meal choice" />
  </div>
))}
```

`key={index}`: Ada's row is key 0, Grace's is key 1, Alan's is key 2. The remove button correctly uses `guest.id` — the author *had* the id in hand and still keyed by position. And the `<input>` is uncontrolled — the pasta lives in the DOM, invisible to React.

## 4. What's wrong with it (in beginner terms)

Let's replay the crime in slow motion.

**Before the delete** (what React remembers):
- key 0 → row showing "Ada", input contains "fish"
- key 1 → row showing "Grace", input contains "pasta"
- key 2 → row showing "Alan", input contains "steak"

**You click x on Grace.** The array becomes `[Ada, Alan]`. React re-renders and builds the new list with index keys:
- key 0 → row showing "Ada"
- key 1 → row showing "Alan"

**React matches by key.** Key 0 existed before and exists now — same row, name still "Ada", nothing to do. Key 1 existed before and exists now — "same row," but its name text changed from "Grace" to "Alan"... so React updates *just the name label* and **keeps the rest of that row's DOM — including the input with "pasta" typed in it**. Key 2 is gone — React unmounts the *last* row, throwing away "steak".

On screen: Grace's row seems to vanish, but really the **labels shifted up while the typed text stayed put**. Alan inherits pasta; steak is destroyed. No error, no warning, no crash — the worst kind of bug, because the code "works" until a user deletes from the middle.

The same corruption happens whenever positions shift under rows that hold state: inserting at the top, sorting, reordering by drag, filtering. And "state" here isn't just inputs — checkboxes, focus (your cursor jumps to the wrong row), animations, scroll position inside a row.

## 5. Try it yourself first!

1. **Vague hint:** the fix is a single attribute on a single line. The question to ask: "what does React use to decide which old row matches which new row?"
2. **More specific:** look at what's already inside each guest object. Is there a value that belongs to *the guest* rather than to *the position in the array*?
3. **Test your fix:** type three meals, delete Grace. Ada keeps fish, Alan keeps steak, pasta disappears with Grace.
4. **Stretch:** add an "add guest at top" button (`setGuests(c => [{ id: Date.now(), name: 'New' }, ...c])`). With index keys, watch every meal shift down one row. With id keys, they stay put. `Date.now()` (milliseconds since 1970) is a quick way to mint a unique id.

## 6. Understanding the refactored solution

The entire fix:

```jsx
{guests.map((guest) => (
  <div className="row" key={guest.id}>
```

Key 101 is Ada wherever she sits; 102 is Grace; 103 is Alan. Delete Grace and React's match-up now reads: 101 still here (keep, with its fish), 102 gone (**unmount Grace's actual row**, pasta and all), 103 still here (keep, with its steak). The right DOM node is destroyed; the survivors keep their state. One attribute changed; the bug is impossible now.

The refactor also switches to the updater form:

```jsx
function removeGuest(id) {
  setGuests((current) => current.filter((g) => g.id !== id));
}
```

`(current) => ...` asks React for the guaranteed-latest array — a defensive habit that project 11 turns into a headline lesson.

Finally, the page prints the honest rule of thumb, worth memorizing: **index keys are only safe when the list never reorders, never inserts or removes in the middle, AND the rows hold no state.** That combination is rare enough that "never use index" is the right default. And if your data truly has no id? That's a data problem, not a key problem — mint an id when the item is created (a counter, `Date.now()`, `crypto.randomUUID()`), and store it *in the data*.

One more subtlety: a key must be stable across renders. Something like `key={Math.random()}` is unique, but it's *different every render* — React would see all-new keys each time and remount every row, wiping all inputs on every keystroke. Stable AND unique, both.

## 7. Words you learned (glossary)

- **Reconciliation** — React comparing the new screen description to the old one and applying only the differences.
- **Mount / unmount** — React adding an element to the page for the first time / removing it (destroying its private state).
- **`key` prop** — the label React matches list items by across renders; identity, not position.
- **Stable key** — the same item keeps the same key on every render.
- **Index** — an item's position in an array, starting at 0; `map`'s second argument.
- **Uncontrolled input** — a text box whose content lives in the DOM, unknown to React (no `value`/`onChange`).
- **DOM node** — the browser's live object for one element on the page.
- **`filter`** — array method returning a new array of items passing a test; the no-mutation delete.
- **Updater form** — `setX((current) => next)`; uses the guaranteed-latest state.
- **`Date.now()`** — current time in milliseconds; a cheap unique-id trick.

## 8. Experiments to try on the plane (no internet needed)

Note once: these pages load React from a CDN, so *running* them needs internet on first load (a browser that opened them before may have React cached). Reading and editing works offline — write down your prediction before testing.

1. **Run the crime scene both ways.** Original: fish/pasta/steak, delete Grace → Alan has pasta. Refactor: same steps → Alan keeps steak. Same app, one attribute different.
2. **Delete the LAST row instead.** In the original, type three meals and remove Alan. Prediction: nothing corrupts — keys 0 and 1 still line up with Ada and Grace. This is why index-key bugs hide so well: deleting from the end looks fine.
3. **Break the refactor with random keys.** Change `key={guest.id}` to `key={Math.random()}`. Prediction: every re-render remounts all rows — click x on anyone and *all remaining* meal boxes go blank (their DOM was destroyed and rebuilt).
4. **Add a checkbox to each row** (`<input type="checkbox" />` next to the name) in the original. Check only Grace's, then delete Grace. Prediction: Alan is now checked — any DOM-held state jumps rows, not just text.
5. **Insert at the top.** Add to the original: `<button onClick={() => setGuests((c) => [{ id: Date.now(), name: 'Zed' }, ...c])}>add on top</button>`. Type meals first, then click it. Prediction: every meal shifts one row down (Zed gets fish!). Repeat in the refactor: meals stay glued to their owners.
