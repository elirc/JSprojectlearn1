# 🏋️ Practice: Compound Components

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

(Once for this file: all exercises are writable and predictable offline; running the page needs the CDN or a cached load.)

## Exercises

### ⭐ 1. Predict: two families, one page (warm-up)

Without running anything, predict: (a) if `App` rendered a *second* `<Tabs defaultTab="a">...</Tabs>` below the mail tabs, would clicking tabs in one affect the other — and what mechanism decides? (b) if a careless caller wrote two `<Tab id="inbox">` buttons inside one `TabList`, what exactly would you see when clicking either, and what would the two `<TabPanel id="inbox">`-style panels do?

*Practices:* provider scoping — each `Tabs` instance is its own private broadcast.
*Hint:* `useContext` reads the *nearest* provider above the caller; and "active" is just `id === activeTab`.
*Expected:* your two answers match the solution's mechanisms.

### ⭐⭐ 2. Tell the parent: onTabChange (core)

The page header should show "viewing: drafts" (whatever tab is current). Add an optional `onTabChange` prop to `Tabs`, fired with the id whenever the active tab changes — and use it in `App` to drive a `viewing` state. Pieces (`Tab`, `TabPanel`) must not change at all.

*Practices:* growing the family's brain without touching the limbs.
*Hint:* don't hand the raw setter to context — provide a wrapper function that sets state *and* notifies.
*Expected:* clicking any enabled tab updates both the underline and the "viewing: ..." line; `defaultTab` shows initially (no callback fires at mount).

### ⭐⭐ 3. A jump-link inside a panel (core)

Add to the Inbox panel a button "⚙️ open settings" that switches the family to the settings tab. Implement it as a tiny reusable `TabLink` component — without adding any props to `Tabs`, `Tab`, or `TabPanel`.

*Practices:* the family's context reaches *any* descendant, not just the official pieces.
*Hint:* `TabLink` consumes `TabsContext` and calls `setActiveTab(to)`.
*Expected:* clicking the link inside the Inbox panel moves the underline to Settings and swaps the panel — the caller wired nothing.

### ⭐⭐ 4. keepMounted panels (core)

Put a `<textarea>` in the Settings panel; type something, switch to Inbox and back — it's gone (TabPanel returns `null`, which unmounts — project 32). Add an optional `keepMounted` prop to `TabPanel`: when set, the inactive panel hides with CSS instead of unmounting.

*Practices:* combining the state-lifetime toolkit with a compound piece; API design for opt-in costs.
*Hint:* two code paths: `if (!keepMounted && id !== activeTab) return null;` else render with a `display` style.
*Expected:* with `keepMounted` on the settings panel, the typed text survives any tab-hopping; other panels still unmount as before.

### ⭐⭐⭐ 5. Build an Accordion family (challenge)

Apply the whole pattern to a new widget: `Accordion` / `AccordionItem` / `AccordionHeader` / `AccordionPanel`, where clicking a header opens its panel and closes the previous one (one open at a time; clicking the open one closes it). The caller writes:

```jsx
<Accordion defaultOpen="ship">
  <AccordionItem id="ship">
    <AccordionHeader>Shipping</AccordionHeader>
    <AccordionPanel>3-5 business days.</AccordionPanel>
  </AccordionItem>
  <AccordionItem id="returns">
    <AccordionHeader>Returns</AccordionHeader>
    <AccordionPanel>30 days, free.</AccordionPanel>
  </AccordionItem>
</Accordion>
```

*Practices:* designing a compound family from scratch — including a second, nested context for "which item am I inside?"
*Hint:* `Accordion` owns `openId`; `AccordionItem` provides its own `id` via a *second* context so Header/Panel don't need an `id` prop.
*Expected:* exactly one panel open at a time; clicking the open header closes it (none open); headers show ▸/▾.

## Solutions

### 1. Predict: two families, one page

(a) Fully independent. Each `<Tabs>` renders its own `TabsContext.Provider` with its own `useState`; every `Tab`/`TabPanel` reads the *nearest* provider above it, so each family hears only its own brain. Same context object, two provider instances — scoping by tree position. (b) Both `inbox` buttons render with the `active` class whenever `activeTab === 'inbox'`, and clicking either sets the same id — they behave as one tab drawn twice. Both matching panels would show simultaneously. Nothing crashes: `id` is caller-chosen correlation data, and the family trusts it.

**Why:** compound components get multi-instance safety *for free* from context scoping — the thing a module-level variable could never give you. The duplicate-id case shows the flip side of explicit correlation: ids are a contract, and the family does exactly what the (wrong) contract says.

### 2. Tell the parent: onTabChange

```jsx
function Tabs({ defaultTab, onTabChange, children }) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  function changeTab(id) {
    setActiveTab(id);
    if (onTabChange) onTabChange(id);
  }

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab: changeTab }}>
      {children}
    </TabsContext.Provider>
  );
}

// in App:
const [viewing, setViewing] = useState('inbox');
<h1>Mail — viewing: {viewing}</h1>
<Tabs defaultTab="inbox" onTabChange={setViewing}>...</Tabs>
```

**Why:** the pieces call whatever function sits in context under the name `setActiveTab` — so upgrading that function to "set and notify" upgrades every `Tab` (and exercise 3's `TabLink`) at once, with zero edits to them. That's the payoff of routing all writes through the brain. The callback fires only on real changes, not at mount, because it lives in the click path rather than in render.

### 3. A jump-link inside a panel

```jsx
function TabLink({ to, children }) {
  const { setActiveTab } = useContext(TabsContext);
  return <button onClick={() => setActiveTab(to)}>{children}</button>;
}

// caller:
<TabPanel id="inbox">
  <p>Inbox messages here.</p>
  <TabLink to="settings">⚙️ open settings</TabLink>
</TabPanel>
```

**Why:** `TabLink` sits inside the panel, the panel sits inside `Tabs`, so the provider is above it — the family's phone line is available to *any* descendant, official piece or not. This is the layout-freedom principle turned into a feature: new coordinating pieces can be invented by anyone, later, without modifying the family. (In a library you'd consume via a guarded `useTabs()` hook so misuse outside `<Tabs>` fails loudly.)

### 4. keepMounted panels

```jsx
function TabPanel({ id, keepMounted, children }) {
  const { activeTab } = useContext(TabsContext);
  const active = id === activeTab;

  if (!keepMounted && !active) return null;              // old behavior: unmount
  return (
    <div className="tabpanel" style={{ display: active ? 'block' : 'none' }}>
      {children}
    </div>
  );
}

// caller:
<TabPanel id="settings" keepMounted>
  <p>Knobs and switches.</p>
  <textarea rows="3" placeholder="notes..." />
</TabPanel>
```

**Why:** this is project 32's destroy-vs-hide decision surfaced as an API option: default panels stay cheap (`null` = unmounted, no memory, effects stopped), and panels holding precious state opt into CSS hiding, where the instance — and the textarea's text — survives. Making preservation *opt-in* is deliberate: keep-alive costs memory and live effects, so the caller who knows the content should be the one to pay for it.

### 5. Build an Accordion family

```jsx
const AccordionContext = createContext(null);   // { openId, toggle }
const ItemContext = createContext(null);        // this item's id

function Accordion({ defaultOpen = null, children }) {
  const [openId, setOpenId] = useState(defaultOpen);
  const toggle = (id) => setOpenId((cur) => (cur === id ? null : id));
  return (
    <AccordionContext.Provider value={{ openId, toggle }}>
      <div>{children}</div>
    </AccordionContext.Provider>
  );
}

function AccordionItem({ id, children }) {
  return <ItemContext.Provider value={id}>
    <div style={{ border: '1px solid #ccc', borderRadius: 6, margin: '4px 0' }}>
      {children}
    </div>
  </ItemContext.Provider>;
}

function AccordionHeader({ children }) {
  const { openId, toggle } = useContext(AccordionContext);
  const id = useContext(ItemContext);
  return (
    <button style={{ display: 'block', width: '100%', textAlign: 'left', padding: 8 }}
            onClick={() => toggle(id)}>
      {openId === id ? '▾ ' : '▸ '}{children}
    </button>
  );
}

function AccordionPanel({ children }) {
  const { openId } = useContext(AccordionContext);
  const id = useContext(ItemContext);
  if (openId !== id) return null;
  return <div style={{ padding: 8 }}>{children}</div>;
}
```

**Why:** the family brain (`Accordion`) owns one fact — which item is open — and `toggle`'s updater form handles both "switch" and "close" (`cur === id ? null : id`). The trick worth stealing is the **second context**: `AccordionItem` broadcasts its own `id` downward, so `AccordionHeader`/`AccordionPanel` need no `id` props at all — nesting *is* the correlation. That's one step beyond the Tabs design (which repeats `id` on Tab and TabPanel), and it shows contexts compose: a piece can sip from two channels at once.
