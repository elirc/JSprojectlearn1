# 🏋️ Practice: Children & Composition

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking. (Write your code offline; the page itself only needs internet on first load for the CDN.)

## Exercises

### ⭐ 1. One footer, two panels (warm-up)

LEARN.md says "JSX is a value" — a piece of JSX can live in a variable and be passed around like any other value. Prove it: create a variable named `savedNote` holding the JSX `<em>Saved automatically.</em>`, then render two panels — "Notes" and "Drafts" — that both use it as their `footer`. Each panel can have any one-line body you like.

**Practices:** JSX as a value; slot props.

**Hint:** `const savedNote = <em>...</em>;` above the `return`, then `footer={savedNote}` twice.

**Expected:** Two panels, each with a gray footer bar reading *Saved automatically.* in italics — identical footers from one shared value.

### ⭐⭐ 2. Add a `subtitle` slot (core)

Give `Panel` a fourth prop: `subtitle`, a slot rendered inside the header bar, under the title, in smaller gray non-bold text. Like `footer`, it must be optional — panels that don't pass it get exactly the header they have today, with no empty extra line. Then use it once: `<Panel title="Confirm delete" subtitle="This affects 3 files">`.

**Practices:** slot props; presence checks with `!= null`.

**Hint:** Copy the footer's pattern — `{subtitle != null && <div style={...}>{subtitle}</div>}` — but inside `panel-head`.

**Expected:** The "Confirm delete" header shows a small gray "This affects 3 files" line under the bold title; the Welcome and Warning panels look unchanged.

### ⭐⭐ 3. Fix the vanishing footer bar (core)

A teammate "simplified" Panel's footer line to `{footer && <div className="panel-foot">{footer}</div>}`, and someone else added an inbox panel that shows a message count in the footer: `<Panel title="Inbox" footer={unread}>You are all caught up.</Panel>`, where `const unread = 0;`. Now a stray `0` appears at the bottom of the panel with no gray bar around it. Explain why, and fix Panel so `footer={0}` renders a proper footer bar containing 0.

**Practices:** `&&` rendering with numbers; why the refactor uses `!= null`.

**Hint:** What does the expression `0 && <div />` evaluate to, and what does React do with that value?

**Expected:** After the fix, the Inbox panel has a normal gray footer bar reading "0"; passing no footer at all still renders no bar.

### ⭐⭐ 4. Extract a `ConfirmPanel` (core)

The Cancel/Delete panel's footer is boilerplate anyone asking a yes/no question would rewrite. Build a `ConfirmPanel` component with props `{ title, onCancel, onConfirm, children }` that renders a `Panel` and fills its footer with a Cancel button and a Confirm button wired to those two handlers. Rewrite the "Confirm delete" call site to use it, passing handlers that call `alert('cancelled')` and `alert('deleted')`.

**Practices:** composing a component out of a component; callback props.

**Hint:** `ConfirmPanel` contains no `<div>`s of its own — it just returns a `<Panel>` with a pre-filled `footer` and passes `children` through.

**Expected:** The third panel looks the same as before, but clicking Cancel pops up "cancelled" and Confirm pops up "deleted".

### ⭐⭐⭐ 5. Predict what renders (challenge)

Without running anything, predict exactly what this `App` shows, using the refactored `Panel` unchanged. For each of the four panels: does a footer bar render, and what is in it?

```jsx
function App() {
  const drafts = 0;
  return (
    <div>
      <Panel title="A" footer={null}>one</Panel>
      <Panel title="B">two</Panel>
      <Panel title="C" footer="">three</Panel>
      <Panel title={<em>D</em>} footer={<span>{drafts} drafts</span>}>four</Panel>
    </div>
  );
}
```

**Practices:** how `!= null` treats `null`, `undefined`, and `""`; rendering numbers in JSX.

**Hint:** `footer != null` is false only for two specific values — is `""` one of them?

**Expected:** You can say, for each panel, "bar / no bar" and the bar's contents, then check against the solution.

### ⭐⭐⭐ 6. Un-configure a Notice component (challenge)

You inherit this configuration-style component and its two call sites. Delete `Notice` entirely and express both call sites with the existing `Panel` — no new props, no new components.

```jsx
function Notice({ heading, headingTag, messageText, boldFirstWord, showAction, actionLabel }) { ... }

<Notice heading="Update" headingTag="NEW" messageText="Version 2 is out."
        boldFirstWord showAction actionLabel="Install now" />
<Notice heading="Tip" messageText="Press ? for shortcuts." />
```

**Practices:** translating configuration into composition; recognizing props that name markup.

**Hint:** `headingTag` becomes part of a `title` slot; `boldFirstWord` becomes a literal `<strong>`; the action button goes in `footer`; a missing footer needs nothing at all.

**Expected:** Two panels: "Update NEW" header, body "**Version** 2 is out." (first word bold), footer with an "Install now" button; and a plain "Tip" panel with no footer bar.

## Solutions

### 1. One footer, two panels

```jsx
function App() {
  const savedNote = <em>Saved automatically.</em>;
  return (
    <div>
      <Panel title="Notes" footer={savedNote}>Remember to water the plants.</Panel>
      <Panel title="Drafts" footer={savedNote}>Untitled draft (empty).</Panel>
    </div>
  );
}
```

**Why:** A JSX element is a plain JavaScript value, so it can be stored once and passed to as many slots as you like. Both panels receive the same value in their `footer` slot; `footer != null` is true, so both render the bar. This is composition's quiet superpower: content is data you can reuse, not configuration you re-describe.

### 2. Add a `subtitle` slot

```jsx
function Panel({ title, subtitle, footer, children }) {
  return (
    <div className="panel">
      <div className="panel-head">
        {title}
        {subtitle != null && (
          <div style={{ fontWeight: 'normal', fontSize: 13, color: '#666' }}>
            {subtitle}
          </div>
        )}
      </div>
      <div className="panel-body">{children}</div>
      {footer != null && <div className="panel-foot">{footer}</div>}
    </div>
  );
}
```

**Why:** A new named region means a new slot prop, and the footer already shows the recipe: accept any JSX, render it inside the structure Panel owns, and gate it on presence so omitting the prop costs nothing. Panels without a `subtitle` render exactly as before because `undefined != null` is false. No boolean like `showSubtitle` is needed — presence of content is the switch.

### 3. Fix the vanishing footer bar

```jsx
{footer != null && <div className="panel-foot">{footer}</div>}
```

**Why:** `0 && <div />` evaluates to `0` — `&&` returns its left side when that side is falsy — and React renders the number `0` as visible text, outside any footer styling. `footer != null` asks the right question ("was anything passed?") instead of the wrong one ("is the value truthy?"), so `0` and other falsy-but-real content like it get a proper bar. Only `null` and `undefined` — the genuinely-absent values — suppress the bar.

### 4. Extract a `ConfirmPanel`

```jsx
function ConfirmPanel({ title, onCancel, onConfirm, children }) {
  return (
    <Panel
      title={title}
      footer={
        <span>
          <button onClick={onCancel}>Cancel</button>{' '}
          <button onClick={onConfirm}>Confirm</button>
        </span>
      }
    >
      {children}
    </Panel>
  );
}

<ConfirmPanel
  title="Confirm delete"
  onCancel={() => alert('cancelled')}
  onConfirm={() => alert('deleted')}
>
  This cannot be undone.
</ConfirmPanel>
```

**Why:** Composition stacks: `ConfirmPanel` specializes `Panel` by pre-filling one slot and forwarding the rest (`title`, `children`) untouched. Behavior arrives through callback props — the component that owns the buttons doesn't decide what confirming *does*; its caller does. Note `Panel` itself needed zero changes, which is the whole promise of a composable API.

### 5. Predict what renders

- **A** — no footer bar: `null != null` is false, so the `&&` renders nothing.
- **B** — no footer bar: an omitted prop is `undefined`, and `undefined != null` is false.
- **C** — a footer bar renders, **empty**: `"" != null` is true (only `null`/`undefined` fail it), so you get a gray strip with nothing in it.
- **D** — title renders as italic *D*; a footer bar renders containing "0 drafts": the `footer` value is a `<span>` (an object, always `!= null`), and inside it `{drafts}` renders the number `0` as text.

**Why:** `!= null` is a presence check, not a truthiness check — it filters out exactly `null` and `undefined` and nothing else, so empty string still counts as "content was passed". And JSX happily renders the number `0` inside an element; the "0 disappears" traps live with `&&`, not with interpolation. Panel C is the caller's honest mistake, not Panel's: it asked for a bar with nothing in it.

### 6. Un-configure a Notice component

```jsx
<Panel
  title={<span>Update <small>NEW</small></span>}
  footer={<button>Install now</button>}
>
  <strong>Version</strong> 2 is out.
</Panel>

<Panel title="Tip">Press ? for shortcuts.</Panel>
```

**Why:** Every `Notice` prop was naming a piece of markup, and markup is what JSX already writes: `headingTag` is just more title content, `boldFirstWord` is a literal `<strong>` around the first word, and `showAction`/`actionLabel` collapse into either passing a `footer` or not. The second call site shows the payoff for the simple case — one prop plus children, no `showAction={false}` bookkeeping. When a component's props read like a description of HTML, the component should have been accepting HTML (well, JSX) all along.
