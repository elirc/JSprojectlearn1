# 📘 Learning Guide: DOM vs State

*Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.*

## 1. What are we building?

A FAQ page — an accordion. There are three sections ("What is this?", "Why is the sky blue?", "Tabs or spaces?"), each with a clickable title. Click a title and its answer collapses (hides); click again and it expands. There's also a button at the top that re-renders the app.

In the original, collapsing works... until the app re-renders, at which point your collapsed section springs back open. In the refactor, collapsed sections stay collapsed no matter what, and you get bonus features: "collapse all", "expand all", and a live "2 of 3 open" counter.

## 2. Concepts you need first

### The DOM

DOM stands for Document Object Model. It's the browser's live, in-memory copy of your page — a tree of objects, one per HTML element. When anything changes what you see on screen, what really changed is the DOM. JavaScript can touch it directly:

```js
const el = document.getElementById('title');
el.classList.add('collapsed');   // add a CSS class to that element
el.classList.toggle('collapsed'); // add it if missing, remove if present
```

`classList` is the list of CSS classes on an element. CSS rules like `.collapsed .body { display: none; }` mean "hide the body of anything with the class `collapsed`" — so toggling a class can show/hide things.

### How React relates to the DOM

React's deal is: you never touch the DOM yourself. You describe what the screen should look like for the current state (that description is your JSX), and React edits the DOM to match. Crucially, React feels free to **throw DOM nodes away and rebuild them** whenever it re-renders. Any change you made to a node behind React's back is luggage on a plane you don't own.

### Mounting and unmounting

*Mounting* = React creating a component's DOM for the first time. *Unmounting* = React removing it. In this project, `{showAll && <Section .../>}` renders the section only when `showAll` is true — flip `showAll` to false and back, and that section is unmounted and then mounted **fresh**, with brand-new DOM nodes. Anything scribbled on the old nodes is gone.

### `useRef` for grabbing a DOM node

`useRef` gives you a small box object with one property, `.current`. If you pass the ref to a JSX element as `ref={myRef}`, React puts the real DOM node in the box after rendering:

```jsx
const boxRef = useRef(null);
// ...
<div ref={boxRef}>hello</div>
// later, in a handler:
boxRef.current.classList.toggle('hidden'); // direct DOM poke
```

That last line is exactly the move this project warns about.

### Conditional rendering with `&&`

```jsx
{!collapsed && <div className="body">{children}</div>}
```

In JavaScript, `a && b` evaluates to `b` when `a` is true, and to `a` (false) when `a` is false. React renders nothing for `false`. So this line means: "render the body only when not collapsed." The show/hide is *computed from state* — no class toggling needed.

### `Set` — a collection of unique values

A `Set` is like an array that can't hold duplicates and has fast has/add/delete:

```js
const s = new Set();
s.add('sky');       // {'sky'}
s.has('sky');       // true
s.delete('sky');    // {}
new Set(['a', 'b']).size; // 2
```

The refactor stores "which section ids are collapsed" as a Set.

### `children` and "props down, events up"

`children` is a special prop: whatever you put *between* a component's tags. `<Section>Hello</Section>` gives Section `props.children === 'Hello'`. "Props down, events up" is the React pattern where a parent passes data down as props (`collapsed={true}`) and the child reports actions up by calling a function prop (`onToggle`). The child holds no state of its own — it's called a *stateless* (or "controlled") component.

### Basics assumed here

`useState`, updater functions, `map` with `key` — explained fully in project 14's LEARN.md.

## 3. Walking through the original code

**The Section component pokes the DOM:**

```jsx
function Section({ title, children }) {
  const ref = useRef(null);

  function toggle() {
    ref.current.classList.toggle('collapsed'); // invisible to React
  }
```

Each section holds a ref to its own outer `<div>`. Clicking the title toggles the CSS class `collapsed` directly on the DOM node. The stylesheet has `.section.collapsed .body { display: none; }`, so the body hides. React knows nothing about any of this.

```jsx
  return (
    <div className="section" ref={ref}>
      <h3 onClick={toggle}>{title}</h3>
      <div className="body">{children}</div>
    </div>
  );
```

Notice: React *always* renders the body. Whether you see it is decided by a class React didn't put there.

**The App:**

```jsx
const [showAll, setShowAll] = useState(true);
// ...
{showAll && <Section title="What is this?">A FAQ.</Section>}
<Section title="Why is the sky blue?">Rayleigh scattering.</Section>
<Section title="Tabs or spaces?">Yes.</Section>
```

The "re-render app" button flips `showAll`. The first section is conditionally rendered — when `showAll` goes false it unmounts, and when it goes true again a **new** section mounts, with fresh DOM, and therefore without the `collapsed` class you toggled onto the old one.

## 4. What's wrong with it (in beginner terms)

1. **The state lives in the wrong place, so it has the wrong lifetime.** "Is this section collapsed?" is stored as a CSS class on a DOM node. But React recycles DOM nodes whenever it wants. On screen: collapse the *first* section, click "re-render app" twice, and watch your collapsed section pop back open. Nothing crashed — your data just lived on a node that got thrown away and rebuilt.
2. **React can't see the state, so features become impossible.** Want a "collapse all" button? You'd have to ask... whom? The information "which sections are collapsed" exists only as scattered class attributes. Want a "2 of 3 open" counter? Same problem. These features aren't *hard* — they're *unreachable*, because the data isn't data.
3. **Two writers, one DOM.** React writes the DOM from its state; you patch it behind React's back. That works right up until any unrelated re-render makes React redraw over your patch. Bugs of this shape are famously "works until it doesn't".

## 5. Try it yourself first!

1. **Vague hint:** the fix is not a better way to toggle the class. It's to stop toggling anything.
2. **Ask the key question:** where should "is section X collapsed?" live so React can see it? (Answer: in `useState`, in the parent.)
3. **Shape of the state:** you need to remember collapsed-ness for *several* sections. An array of ids works; a `Set` of ids is nicer. Give each section an `id`.
4. **Rendering:** change Section so it *receives* `collapsed` as a prop and renders `{!collapsed && <div className="body">...}`. No ref, no classList.
5. **Events up:** Section also receives `onToggle` and calls it when the title is clicked. The parent updates the Set.
6. **Victory lap:** once that works, "collapse all" is `setCollapsedIds(new Set(allIds))` and "expand all" is `setCollapsedIds(new Set())`. Try adding the open counter.

## 6. Understanding the refactored solution

**Sections became data:**

```jsx
const SECTIONS = [
  { id: 'what', title: 'What is this?', body: 'A FAQ.' },
  ...
];
```

A plain array describing the sections. The app maps over it to render them.

**Section became stateless:**

```jsx
function Section({ title, collapsed, onToggle, children }) {
  return (
    <div className="section">
      <h3 onClick={onToggle}>{collapsed ? '▸' : '▾'} {title}</h3>
      {!collapsed && <div className="body">{children}</div>}
    </div>
  );
}
```

No `useRef`, no `useState`, no classList. Collapsed-ness arrives as a prop; the body renders (or doesn't) based on it; clicks are reported up via `onToggle`. Even the little arrow icon is computed from the prop.

**One piece of state, owned by App:**

```jsx
const [collapsedIds, setCollapsedIds] = useState(new Set());

function toggle(id) {
  setCollapsedIds((current) => {
    const next = new Set(current);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
}
```

Two details worth noticing. First, the updater builds a **new** Set (`new Set(current)`) instead of modifying the old one — React only notices state changes when it gets a *new* object (mutating the old one in place looks like "nothing changed"). Second, the updater-function form guarantees it works from the latest value.

**Features fell out for free:**

```jsx
const openCount = SECTIONS.length - collapsedIds.size;
```

The counter is *derived* — computed from state during render, never stored. Collapse-all and expand-all are each one `setCollapsedIds` call. This is the payoff of state-as-data: features become one-liners.

**When ARE refs right?** For talking to the DOM about things that aren't render state: focusing an input, measuring an element's size, scroll position — or holding non-visual values (project 26). The rule from the README: if it changes what's on screen, it's state; refs are for talking to the DOM, not for storing truth about it.

## 7. Words you learned (glossary)

- **DOM (Document Object Model)** — the browser's live tree of objects representing the page.
- **DOM node** — one element in that tree (a div, a button...).
- **`classList`** — an element's list of CSS classes; has `add`/`remove`/`toggle`.
- **Mount / unmount** — React creating / removing a component's DOM.
- **`useRef`** — a hook giving a `{ current }` box; with `ref={...}` on JSX, React fills it with the DOM node.
- **Conditional rendering** — showing JSX only when a condition holds, e.g. `{cond && <X />}`.
- **`Set`** — a collection of unique values with `has`/`add`/`delete`/`size`.
- **Stateless component** — a component with no state of its own; fully driven by props.
- **Props down, events up** — parent passes data as props; child reports actions via callback props.
- **`children`** — the special prop holding whatever is between a component's tags.
- **Derived value** — something computed from state during render instead of stored.
- **Mutation** — changing an object in place; React can't detect mutated state, so always build new objects.
- **Lifetime** — how long a piece of data survives; DOM-stored data dies when its node is recycled.
- **Source of truth** — the one place a fact is authoritatively stored; two sources drift apart.

## 8. Experiments to try on the plane (no internet needed)

Reminder (said once): these pages load React from a CDN, so *running* them needs internet on first load. Reading and editing works offline — write your prediction first, then verify when you're back online (or if your browser cached the pages earlier).

1. **Reproduce the bug precisely.** In `original.html`, collapse the *second* section (not the first) and click "re-render app". Prediction: it *stays* collapsed — because only the first section is inside `{showAll && ...}` and unmounts. Only the first section has the bug. That's what makes bugs like this maddening: they depend on which component happens to get recycled.
2. **Break the refactor deliberately.** In `refactored/index.html`, change the updater to mutate: `current.add(id); return current;`. Prediction: clicking titles appears to do nothing — the Set changed inside, but it's the *same object*, so React skips the re-render.
3. **Add a "only one open at a time" policy.** In the refactor's `toggle`, instead of editing the Set, set it to "every id except the clicked one": `setCollapsedIds(new Set(SECTIONS.map(s => s.id).filter(x => x !== id)))`. Prediction: opening a section closes all others — a two-line accordion policy, possible only because App owns the state.
4. **Add a fourth section** to the `SECTIONS` array in the refactor. Prediction: it appears, collapses, and is counted by "x of 4 open" with zero other changes — the whole UI is generated from the data.
5. **Start all collapsed.** Change the initial state to `useState(new Set(SECTIONS.map(s => s.id)))`. Prediction: the page loads with every section closed and the counter reads "0 of 3 open".
