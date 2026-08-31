# 📘 Learning Guide: Children & Composition

*Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.*

## 1. What are we building?

A page of "panels" — boxed sections with a gray header bar on top, content in the middle, and sometimes a footer bar at the bottom. Think of the boxes you see on dashboards: "Welcome 👋" with a greeting inside, "⚠️ Warning" with a disk-space message and a footer link, and (refactor only) a "Confirm delete" panel whose footer holds two working buttons: Cancel and Delete.

Both versions look almost the same. The story is in the `Panel` component's *interface* — the set of props it asks for — and in the third panel, which the original literally cannot draw.

## 2. Concepts you need first

Components, JSX, props, and `&&` conditional rendering are taught from scratch in project 01's and 04's LEARN.md files. New material below.

### A component API

A component's **API** (Application Programming Interface — the set of inputs it accepts and what it does with them) is its list of props. Just like a function's parameters, this list is a *design*. This project is about a design that went wrong prop by prop, each one reasonable on its own.

### Configuration vs composition

Two ways to get content into a component:

- **Configuration**: describe what you want through props — `titleIcon="⚠️"`, `footerLinkText="settings"`. The component interprets the description and builds the markup itself.
- **Composition**: hand the component *finished JSX* and let it place it — `title={<span>⚠️ Warning</span>}`. The component provides structure; you provide content.

Configuration needs a new prop for every content shape anyone will ever want. Composition needs none, because JSX can already express every shape.

### JSX is a value

The key enabler: a piece of JSX is a normal JavaScript value. You can put it in a variable, pass it as a prop, return it:

```jsx
const warning = <span>⚠️ <strong>Careful!</strong></span>;
<Panel title={warning} />        // passing UI as a prop — totally normal
```

### The `children` prop

Whatever you nest *between* a component's opening and closing tags arrives as a prop named `children`:

```jsx
function Frame({ children }) {
  return <div className="frame">{children}</div>;
}
<Frame>anything <em>at all</em></Frame>   // children = "anything <em>at all</em>"
```

`children` is the natural home for a component's *main* content.

### Slot props

When a component has *several* named regions (a title area, a footer area), give each region its own prop that accepts JSX. These are called **slot props** — named slots the caller fills:

```jsx
<Panel title={<span>👋 Hello</span>} footer={<a href="#">more</a>}>
  main content goes through children
</Panel>
```

`children` is really just the default, unnamed slot.

### `!= null` — checking for "was anything passed?"

`footer != null` is true when `footer` is neither `null` nor `undefined` (the loose `!=` treats those two as equal — one of the few good uses of loose comparison). It answers "did the caller pass a footer at all?" — which lets *presence of content* replace a separate `showFooter` boolean.

### Destructuring with rest (used by the original)

```js
const [first, ...rest] = 'Disk is nearly full'.split(' ');
// first = 'Disk',  rest = ['is', 'nearly', 'full']
```

`split(' ')` chops a string into an array of words; `[first, ...rest]` grabs the first and bundles the remainder. The original uses this for its strangest feature — bolding the first word via a prop.

## 3. Walking through the original code

The `Panel` signature tells the whole story — read the version comments:

```jsx
function Panel({
  title,
  titleIcon,          // v2: "can we put an icon in the title?"
  text,
  boldFirstWord,      // v3: "make the first word bold" (?!)
  footerText,
  footerLinkText,     // v4: "the footer needs a link sometimes"
  footerLinkHref,
  showFooter,         // v5: "not every panel has a footer"
}) {
```

Eight props. Each was added the day someone needed one more content shape. None is crazy alone; together they're a component that has memorized five specific requests and can serve nothing else.

The body-building logic:

```jsx
let body = text;
if (boldFirstWord) {
  const [first, ...rest] = text.split(' ');
  body = <span><strong>{first}</strong> {rest.join(' ')}</span>;
}
```

String surgery: split the text into words, wrap word one in `<strong>`, glue the rest back with `join(' ')`. All this machinery... to produce what a caller could have written directly as `<strong>Disk</strong> is nearly full`.

The rendering:

```jsx
<div className="panel">
  <div className="panel-head">{titleIcon} {title}</div>
  <div className="panel-body">{body}</div>
  {showFooter && (
    <div className="panel-foot">
      {footerText}
      {footerLinkText && <a href={footerLinkHref}> {footerLinkText}</a>}
    </div>
  )}
</div>
```

The structure (head/body/foot) is fine! The problem is everything flowing into it through the eight-prop funnel — including a footer assembled from three coordinated string props plus a visibility boolean.

And a call site:

```jsx
<Panel title="Warning" titleIcon="⚠️" text="Disk is nearly full."
       boldFirstWord showFooter footerText="See"
       footerLinkText="storage settings" footerLinkHref="#" />
```

Seven props to say: a warning panel whose footer reads "See storage settings" with a link.

## 4. What's wrong with it (in beginner terms)

1. **Every new content shape is a feature request for Panel.** The file's own comment shows the future: someone asks for *two buttons* in the footer. With this design that means `footerButton1Text`, `footerButton1OnClick`, `footerButton2Text`, `footerButton2OnClick`... plus new branches inside Panel to render them. On screen today: that third "Confirm delete" panel simply *cannot exist*. The component is a locked door and only the Panel author has the key.
2. **The props are a worse language for markup than markup.** `boldFirstWord` is the tell: a boolean prop performing string surgery to produce `<strong>` — which JSX writes natively. Panel became "a remote control for markup it refuses to let you write."
3. **The prop combinations can contradict.** `showFooter` without any `footerText`? A footer bar renders, empty. `footerLinkText` without `footerLinkHref`? A link to nowhere. Four footer props must be coordinated by every caller, every time.
4. **Growth is unbounded.** v6, v7, v8 are coming — a footer icon, a second link, a subtitle. Each adds a prop and a branch. Compare: the refactored Panel will handle ALL future content requests with zero changes.

## 5. Try it yourself first!

1. **Vague hint:** Panel does two jobs — structure (the frame, bars, borders) and content (icons, bold words, links). Which job actually needs to live inside Panel?
2. **More specific:** what if the *caller* wrote the title as JSX — icon included — and passed it in as one prop? What if the body arrived the same way?
3. **The built-in slot:** React fills a prop automatically from whatever you nest between `<Panel>` and `</Panel>`. What's it called? Use it for the body.
4. **The footer boolean:** can you delete `showFooter` entirely and instead render the footer bar only when a `footer` prop was passed at all?
5. **Victory condition:** your Panel has 3 props and no `if` about content — and can render a footer with two buttons, which the original couldn't.

## 6. Understanding the refactored solution

The entire component:

```jsx
function Panel({ title, footer, children }) {
  return (
    <div className="panel">
      <div className="panel-head">{title}</div>
      <div className="panel-body">{children}</div>
      {footer != null && <div className="panel-foot">{footer}</div>}
    </div>
  );
}
```

Eight props became three; the branching became one presence-check. Panel now owns exactly what it should — the frame, the bars, the CSS classes — and *nothing about content*.

**Each old prop, replaced by plain writing:**

- `titleIcon` → the caller types the emoji: `title={<span>👋 Welcome</span>}`
- `boldFirstWord` → the caller writes `<strong>Disk</strong> is nearly full.` as children
- `footerText`/`footerLinkText`/`footerLinkHref` → `footer={<span>See <a href="#">storage settings</a></span>}`
- `showFooter` → gone; passing a `footer` shows the bar, omitting it doesn't. **You can no longer have a footer bar with no footer, or footer content with no bar** — a whole category of contradiction deleted.

**The panel the original couldn't draw:**

```jsx
<Panel
  title="Confirm delete"
  footer={<span><button>Cancel</button> <button>Delete</button></span>}
>
  This cannot be undone.
</Panel>
```

Two buttons in the footer — no new props, no Panel changes, just... writing it. Fewer props AND more capability: that trade is the signature of composition done right. (Configuration trades capability for props; composition gets both.)

**When should something stay a prop, then?** The README's rule: things the component *behaves differently because of* — `variant`, `size` from project 05 — stay props, because the component must interpret them. Things it merely *displays* flow through children and slots. Panel doesn't behave differently for a bold word; it just shows it. Slot, not prop.

Also worth noticing: `title` accepts either a plain string (`title="Confirm delete"`) or JSX (`title={<span>⚠️ Warning</span>}`) — strings are valid JSX content, so the simple case stays simple.

## 7. Words you learned (glossary)

- **Component API** — the set of props a component accepts; its designed interface.
- **Configuration** — describing desired content through props for the component to build.
- **Composition** — passing finished JSX for the component to place.
- **`children`** — the automatic prop holding whatever is nested between a component's tags.
- **Slot prop** — a named prop that accepts arbitrary JSX for one region (`title`, `footer`).
- **JSX as a value** — a JSX element is a normal value: storable, passable, returnable.
- **`!= null`** — true unless the value is `null` or `undefined`; "was this prop passed?"
- **Presence check** — using "was content provided?" instead of a separate show/hide boolean.
- **`split` / `join`** — string↔array converters (`'a b'.split(' ')` → `['a','b']`).
- **Rest pattern (`...rest`)** — destructuring that bundles "everything else" into an array.
- **String surgery** — manipulating strings to build markup; a smell inside components.
- **Unbounded growth** — an API that must gain a prop for every future request.

## 8. Experiments to try on the plane (no internet needed)

Note once: these pages load React from a CDN, so *running* them needs internet on first load (if you opened them earlier, the browser may have React cached). Reading and editing works offline — write your prediction first.

1. **Put a list in a panel body** (refactor): `<Panel title="Groceries"><ul><li>bread</li><li>cheese</li></ul></Panel>`. Prediction: renders perfectly — Panel never needed a `listItems` prop. Then find which props the *original* would demand for this. (Trick question: it has no way at all — `text` is a string.)
2. **Omit the footer** in the refactor's Warning panel (delete the `footer={...}` line). Prediction: the footer *bar* disappears entirely — no empty gray strip — because `footer != null` fails. In the original, try `showFooter` with no `footerText`: an empty bar renders.
3. **Bold a *middle* word:** in the refactor, write children as `Disk is <strong>nearly</strong> full.` Prediction: just works. The original's `boldFirstWord` can only ever bold word one — bolding word three would need a `boldThirdWord` prop. Feel the absurdity; that's the lesson.
4. **Pass a Panel into a Panel:** `<Panel title="Outer"><Panel title="Inner">nested!</Panel></Panel>`. Prediction: a panel inside a panel's body, frames and all — composition composes. The original can't (its body is a `text` string).
5. **Add ONE designed prop the right way:** give the refactored Panel a `tone` prop (`'info' | 'warning'`) that colors the header bar — a lookup table like project 05's, defaulting to `'info'`. Prediction: `<Panel tone="warning" ...>` gets a tinted header. This is the boundary line drawn by hand: tone changes *behavior* (a prop); the title's icon is *content* (a slot).
