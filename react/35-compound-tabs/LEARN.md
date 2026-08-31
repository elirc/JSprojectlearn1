# 📘 Learning Guide: Compound Components (Project 35)

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A little mail app header with four tabs: **Inbox** (with an 📥 icon and a "(12)" badge), **Drafts** (with a count), **Archive** (grayed out / disabled), and **Settings** (with a ⚙️ icon). Click a tab and its content panel appears below; the active tab gets an underline.

Both versions look and behave identically in the browser. The difference — like project 34 — is entirely in the code, specifically in **what the person *using* the Tabs component has to write**. The original makes them describe tabs as a data structure full of config keys; the refactor lets them write plain JSX. This project is about designing a component's public face (its **API**).

## 2. Concepts you need first

### What "API" means for a component

API = Application Programming Interface — the set of props and conventions a component's users must follow. When you write a component others will call, you're designing a tiny language. This project compares two languages for the same widget.

### The config-object style

One way to build a multi-part widget: take a single prop describing everything as data.

```jsx
<Tabs tabs={[
  { label: 'Inbox', icon: '📥', badge: 12, content: <p>...</p> },
  { label: 'Archive', disabled: true, content: <p>...</p> },
]} />
```

Every visual feature needs a **key** in the object (`icon`, `badge`, `disabled`...) *and* matching rendering code inside `Tabs` that knows what to do with it. The caller can only express what the config vocabulary allows.

### children: JSX you pass into a component

`children` is the special prop holding whatever you nest between a component's tags:

```jsx
function Card({ children }) {
  return <div className="card">{children}</div>;
}
// <Card><b>anything</b> at all</Card>  →  children = <b>anything</b> at all
```

`children` is the escape hatch from config vocabularies: instead of `label: 'Inbox', icon: '📥'`, the caller just writes `📥 Inbox` — any markup, no keys. (Project 06 introduced this idea.)

### Compound components: a widget sold as a family of parts

A **compound component** is a widget exposed as several cooperating components the caller arranges freely:

```jsx
<Tabs defaultTab="a">
  <TabList>
    <Tab id="a">First</Tab>
    <Tab id="b">Second</Tab>
  </TabList>
  <TabPanel id="a">content A</TabPanel>
  <TabPanel id="b">content B</TabPanel>
</Tabs>
```

HTML already works this way: `<select>` and `<option>` are separate tags that coordinate; you arrange them, they handle the wiring. The parts share one brain (which tab is active) without the caller connecting anything.

### Context as the family's private phone line

How do `Tab` and `TabPanel` — possibly nested at any depth — know which tab is active? The parent `Tabs` owns the state and shares it via **context** (built from scratch in project 33's LEARN.md):

```jsx
const TabsContext = createContext(null);
// Tabs provides { activeTab, setActiveTab }
// Tab and TabPanel consume it with useContext
```

Important distinction from project 34: there, context carried an *app-wide ambient* value (theme). Here it's **component-internal plumbing** — private, scoped to one widget family, invisible to the caller. Same tool, different job.

### Uncontrolled default (brief)

`Tabs` takes `defaultTab` — the starting tab — and then owns the active-tab state itself. The caller can't force a tab from outside. That's an "uncontrolled" API; project 36's LEARN.md is entirely about that choice.

## 3. Walking through the original code

```jsx
function Tabs({ tabs }) {
  const [activeIndex, setActiveIndex] = useState(0);
```

One component, one prop, and state tracking the active tab **by position** (index 0, 1, 2...).

```jsx
{tabs.map((tab, i) => (
  <button
    key={i}
    className={i === activeIndex ? 'active' : ''}
    disabled={tab.disabled}
    onClick={() => setActiveIndex(i)}
  >
    {tab.icon ? tab.icon + ' ' : ''}{tab.label}
    {tab.badge != null ? ` (${tab.badge})` : ''}
  </button>
))}
```

The rendering loop — and the heart of the problem. Look at the last two lines: `Tabs` personally implements icon placement ("icon, space, label") and badge formatting ("space, parenthesis, number"). Each config key (`icon`, `badge`, `disabled`) has its own little rendering branch here. Want a tooltip? A spinner? Bold text in one label? Each needs a *new key* plus a *new branch in this loop*.

```jsx
<div className="tabpanel">{tabs[activeIndex].content}</div>
```

Content is looked up by index and rendered.

```jsx
const tabs = [
  { label: 'Inbox', icon: '📥', badge: 12, content: <p>Inbox messages here.</p> },
  { label: 'Drafts', badge: drafts, content: <p>{drafts} unsent drafts.</p> },
  { label: 'Archive', disabled: true, content: <p>Archived mail.</p> },
  { label: 'Settings', icon: '⚙️', content: <p>Knobs and switches.</p> },
];
```

And this is what the caller writes: a data structure *describing* markup. The file's comment nails it: "The caller WRITES a data structure to DESCRIBE the JSX they wish they could just write."

## 4. What's wrong with it (in beginner terms)

Again, nothing breaks on screen. The flaw is a growth disease. Here's the "what you'd see go wrong" story, told over a few sprints:

- **Week 1:** design wants the Inbox badge bold. There's no key for that. You add `badgeBold: true` and a branch in Tabs. Ship it.
- **Week 3:** the Drafts tab needs a spinner while saving. New key: `loading`, new branch. The Tabs component grows again.
- **Week 5:** marketing wants a divider between Archive and Settings. Tabs renders the buttons in one loop — where would a divider even go? New key on the *following* tab? A fake tab object with `divider: true`? Every option is ugly.
- **Month 3:** `Tabs` has fifteen config keys and its render loop is a thicket of conditionals. It has slowly re-invented a worse version of something you already had: **JSX itself**, a language purpose-built for describing markup.

There's a subtle second flaw: tabs are matched to content **by index**. Reorder the array, or conditionally omit one tab, and every pairing silently shifts. Positional matching is fragile; the refactor replaces it with explicit ids.

This is project 06's "slot-prop explosion" playing out at the scale of a component family.

## 5. Try it yourself first!

1. **Vague:** the caller wants to write markup. What if, instead of one `<Tabs tabs={...}>`, they could write several smaller components and arrange them like ordinary HTML?
2. **Warmer:** sketch the caller's dream code first (this is a great API-design habit): `<Tabs>`, a `<TabList>` holding `<Tab>` buttons whose labels are children, and `<TabPanel>`s for content. Now: what state do these parts need to share, and who should own it?
3. **Specific:** `Tabs` owns `activeTab` in `useState` and provides `{ activeTab, setActiveTab }` through a context. `Tab` consumes it: renders a button, `active` class when its `id` matches, `setActiveTab(id)` on click. `TabPanel` consumes it: returns `null` unless its `id` matches.
4. **Check yourself:** the four tabs must work as before — including the disabled Archive and the icons/badges, which should now be written as plain children with zero config keys.

## 6. Understanding the refactored solution

```jsx
const TabsContext = createContext(null);

function Tabs({ defaultTab, children }) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      {children}
    </TabsContext.Provider>
  );
}
```

`Tabs` renders no markup of its own — it's the family's brain: it owns which tab is active and broadcasts it (plus the setter) to its parts. Whatever the caller nests inside can reach the context.

```jsx
function Tab({ id, disabled, children }) {
  const { activeTab, setActiveTab } = useContext(TabsContext);
  return (
    <button
      className={id === activeTab ? 'active' : ''}
      disabled={disabled}
      onClick={() => setActiveTab(id)}
    >
      {children}
    </button>
  );
}
```

Each `Tab` handles exactly one button. Its label is `children` — so icons, badges, bold text, spinners are just... written. No vocabulary to extend, ever.

```jsx
function TabPanel({ id, children }) {
  const { activeTab } = useContext(TabsContext);
  if (id !== activeTab) return null;
  return <div className="tabpanel">{children}</div>;
}
```

A panel shows itself only when its `id` is active. Note: `id` links Tab to Panel **explicitly** — reorder them, wrap them, interleave other markup, nothing breaks. Explicit correlation beats positional index-matching. (Returning `null` unmounts inactive panels — if a panel held precious state you'd revisit project 32's options.)

The caller now writes:

```jsx
<Tabs defaultTab="inbox">
  <TabList>
    <Tab id="inbox">📥 Inbox <strong>(12)</strong></Tab>
    <Tab id="archive" disabled>Archive</Tab>
```

Full JSX power, zero config keys. And **layout freedom falls out**: because the parts are ordinary children, the caller can wrap `TabList` in a header bar or put anything between panels — `Tabs` doesn't care where its children sit, only that they can reach its context.

**When is config-style right?** When the tabs really are *data* (say, from a server response). Then map the data onto the compound pieces: `{tabs.map(t => <Tab id={t.id}>{t.label}</Tab>)}`. The pattern composes with data instead of replacing it.

## 7. Words you learned (glossary)

- **Component API:** the props and conventions a component asks its users to follow.
- **Config object:** a single data-structure prop describing a widget's parts and features.
- **Config key:** one field of that structure (`icon`, `badge`, `disabled`...), each requiring matching render logic.
- **children:** the special prop holding the JSX nested inside a component's tags.
- **Compound components:** a widget exposed as several cooperating components (like `<select>`/`<option>`).
- **Context (internal plumbing):** context used privately within one widget family — vs project 34's app-wide ambient use.
- **Explicit correlation:** linking parts by shared `id` rather than by array position.
- **Positional (index) matching:** pairing things by their order — fragile under reordering.
- **defaultTab / uncontrolled:** the widget owns its state, caller only sets the start (project 36 explores this).
- **Slot-prop explosion:** the growth disease of adding a prop/key for every new markup nuance (project 06).
- **Returning `null`:** how a component renders nothing (and stays unmounted — project 32).

## 8. Experiments to try on the plane (no internet needed)

(One-time note, detailed in project 27's LEARN.md: the pages load React from a CDN, so running needs internet on first load; reading and editing don't.)

1. **The week-1 request, both ways.** Make the Inbox badge red. Refactor: change `<strong>(12)</strong>` to `<strong style={{ color: 'red' }}>(12)</strong>` — one line, done. Original: work out what you'd add (`badgeColor` key + a branch in the button loop). Prediction: the refactor edit touches only the caller; the original edit touches the widget itself.
2. **Test layout freedom.** In the refactor, move `<TabPanel id="settings">` *above* `<TabList>`. Prediction: everything still works — panels appear above the tab bar, pairings intact, because ids (not positions) do the matching. Try mentally doing this in the original's single-array design.
3. **Break the family bond.** Move a `<Tab id="inbox">` *outside* `<Tabs>` entirely. Prediction: a crash when it tries to use the context (it's `null` there). Improvement to make: give `Tab` a helpful error like project 34's `useTheme` guard ("Tab must be used inside <Tabs>").
4. **Data-driven tabs, compound-style.** In the refactor, build tabs from an array: `const TABS = [{id:'a', label:'One'},{id:'b', label:'Two'}]`, then `{TABS.map(t => <Tab key={t.id} id={t.id}>{t.label}</Tab>)}` with matching panels. Prediction: works — proving compound components and data-driven rendering are friends, not rivals.
