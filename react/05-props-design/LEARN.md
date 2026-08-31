# 📘 Learning Guide: Props Design

*Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.*

## 1. What are we building?

A page of buttons — a mini "design system" (a team's official catalog of approved looks). You see a blue "Save" button, a red "Delete", a dashed see-through "Cancel", in various sizes. Nothing is interactive beyond hovering; the app IS the buttons.

The original also renders a section literally titled "The states nobody designed": a button asked to be *both* primary-blue and danger-red at once, and one asked to be both small and large. They render *something* — and what they render was never chosen by anyone. This project is about designing a component's props so those nonsense requests become impossible to even write.

## 2. Concepts you need first

Components, JSX, props, and destructuring are taught from scratch in project 01's LEARN.md. New material below.

### Boolean props and the shorthand

A prop with no value defaults to `true`:

```jsx
<Button primary />        // same as primary={true}
<Button />                // primary is undefined (falsy)
```

That terseness is exactly why boolean props multiply: each new need looks like "just one more flag."

### Style objects and how `if`s stack

In JSX, inline styles are objects: `{ background: '#36c', color: '#fff' }` (colors here are hex codes — `#36c` is a blue). The original builds one style object, then lets each `if` overwrite fields:

```js
let style = { background: '#eee' };
if (primary) style.background = '#36c';
if (danger)  style.background = '#c33';   // runs AFTER primary — always wins
```

When two `if`s write the same field, **the later one wins**. Nobody decided danger beats primary; the line order did.

### Counting combinations (why booleans explode)

Each independent boolean doubles the number of possible prop combinations: 5 booleans = 2 × 2 × 2 × 2 × 2 = **32** ways to call the component. If your design defines 3 variants × 3 sizes = 9 real looks, the other 23 combinations are undesigned — yet all 32 are valid code.

### Enums: one prop per axis

An **enum** (short for "enumerated type") is a value chosen from a fixed named set. Instead of `primary` / `danger` / `ghost` as three booleans, use ONE prop whose value names the choice:

```jsx
<Button variant="danger" />   // variant is one of: default | primary | danger | ghost
```

An **axis of variation** is one independent question about the component: "what kind?" is one axis (variant), "how big?" is another (size). One prop per axis. Two things that can't both be true were never two things — they were two values of one thing.

### Default parameter values

```js
function Button({ variant = 'default', size = 'medium' }) { ... }
```

The `= 'default'` means: if the caller didn't pass `variant`, use `'default'`. So `<Button>hi</Button>` works with sensible looks.

### Lookup tables (rules as data)

An object used as a table: keys are names, values are the associated data.

```js
const SIZES = { small: { fontSize: 11 }, large: { fontSize: 18 } };
SIZES['small']          // { fontSize: 11 }
'small' in SIZES        // true — is this a known key?
```

`SIZES[size]` replaces a chain of `if`s. Adding a size = adding a row, touching no logic.

### Spread into one object

`{ ...a, ...b }` builds a new object with all of `a`'s fields, then all of `b`'s (later wins on conflicts):

```js
{ ...{ background: 'blue' }, ...{ fontSize: 18 } }
// { background: 'blue', fontSize: 18 }
```

The refactor merges variant-styles and size-styles this way — and they *can't* conflict, because the two tables own different fields. That's the axes staying independent.

### `throw` — failing loudly

`throw new Error('message')` stops the program with a visible error. Sounds bad; it's often the kindest option. A typo like `variant="primry"` either silently renders the default look (bug hides for weeks) or throws immediately with the bad value in the message (bug fixed in one minute).

### The `children` prop

Whatever you write *between* a component's tags arrives as a special prop named `children`:

```jsx
function Fancy({ children }) {
  return <div className="fancy">{children}</div>;
}
<Fancy>anything <b>at all</b> 🎉</Fancy>
```

`children` can be text, elements, other components — the full power of JSX. Compare a `label="Save"` string prop: that door is one string wide. Project 06 goes deep on this.

## 3. Walking through the original code

The whole component:

```jsx
function Button({ label, primary, danger, ghost, small, large, onClick }) {
  let style = { background: '#eee', color: '#000', fontSize: 14 };
  if (primary) { style.background = '#36c'; style.color = '#fff'; }
  if (danger) { style.background = '#c33'; style.color = '#fff'; }
  if (ghost) { style.background = 'transparent'; style.borderStyle = 'dashed'; }
  if (small) { style.fontSize = 11; style.padding = '4px 8px'; }
  if (large) { style.fontSize = 18; style.padding = '12px 24px'; }
  return <button style={style} onClick={onClick}>{label}</button>;
}
```

Seven props: a text label, five booleans, a click handler. Start from a gray default, then let each flag scribble over the style object. Each `if` was added the day a designer asked for a new look. Individually each is innocent.

The showroom:

```jsx
<Button label="Save" primary />
<Button label="Delete" danger />
<Button label="Cancel" ghost />
```

These read fine! Boolean props always read fine one at a time. Then:

```jsx
<Button label="primary + danger??" primary danger />
<Button label="small + large??" small large />
```

Both compile. Both render. The first is red (the `danger` if runs after `primary`, overwriting the background). The second is large (same reason). Neither outcome was designed — they're accidents of line order.

## 4. What's wrong with it (in beginner terms)

1. **23 undesigned states are shippable.** 2⁵ = 32 combinations; the design system defines 9 (3 real variants + default, 2 explicit sizes + medium... the README counts 9). Here's the on-screen story: a teammate, months later, writes `<Button primary danger label="Archive" />` — maybe merging two branches, maybe copying from two examples. It renders a red button. Nobody chose red. Design review asks "why is Archive red?" and the answer is "because line 21 comes after line 20." That's not a design; it's an accident with reviewers.
2. **The call site can't warn you.** `<Button primary danger />` contains no visual hint that these two props are enemies. Compare `variant="primary" variant="danger"` — writing the *same prop twice* looks immediately wrong (and the tooling flags it).
3. **The `label` string is a one-prop-wide content door.** Want "💾 Save" with an icon? A keyboard hint like `Ctrl+S` in a `<kbd>` tag? A bold word? `label` accepts one plain string; the component says no to all of it. Teams then add `icon`, `labelBold`, `shortcut` props one by one — the prop soup grows a noodle at a time.

## 5. Try it yourself first!

1. **Vague hint:** group the five booleans. Which ones are secretly answers to the same question? How many *questions* are there really?
2. **More specific:** the questions are "what kind of button?" (default/primary/danger/ghost) and "what size?" (small/medium/large). Make each question ONE prop with a string value.
3. **The styles:** instead of `if` chains, try two objects — `VARIANTS` and `SIZES` — keyed by those string values. Merge the two looked-up styles with spread.
4. **Guard the door:** what should happen when someone passes `variant="primry"`? Silent default, or a loud error naming the typo? Pick deliberately.
5. **Free the content:** replace `label` with `children`. Test with `<Button variant="primary">💾 Save <kbd>Ctrl+S</kbd></Button>`.

## 6. Understanding the refactored solution

**The tables:**

```jsx
const VARIANTS = {
  default: { background: '#eee', color: '#000' },
  primary: { background: '#36c', color: '#fff' },
  danger:  { background: '#c33', color: '#fff' },
  ghost:   { background: 'transparent', borderStyle: 'dashed' },
};
const SIZES = {
  small:  { fontSize: 11, padding: '4px 8px' },
  medium: { fontSize: 14, padding: '8px 16px' },
  large:  { fontSize: 18, padding: '12px 24px' },
};
```

Every designed look, spelled out as data. Adding a variant next quarter = one new row; no logic changes, no if-ordering to reason about. Notice `VARIANTS` never touches `fontSize`/`padding` and `SIZES` never touches colors — the axes are independent by construction, so merging can't conflict.

**The component:**

```jsx
function Button({ variant = 'default', size = 'medium', onClick, children }) {
  if (!(variant in VARIANTS)) throw new Error(`Unknown variant "${variant}"`);
  if (!(size in SIZES)) throw new Error(`Unknown size "${size}"`);
  return (
    <button style={{ ...VARIANTS[variant], ...SIZES[size] }} onClick={onClick}>
      {children}
    </button>
  );
}
```

Four props, each with one job. Defaults make the bare `<Button>hi</Button>` sensible. The two guards make a typo blow up *with the bad value in the message* — `Unknown variant "primry"` tells you the fix. And the style is a pure lookup-and-merge: no mutation, no order-dependence, nothing to trace.

**Why "unrepresentable" matters:** in the original, "primary and danger" was *discouraged* (you weren't supposed to). In the refactor, it's *unwritable* — `variant` holds one string; there is no syntax for two variants. That's the strongest kind of correctness: bad states aren't caught, they can't be expressed. 4 variants × 3 sizes = 12 states, all 12 designed.

**The call sites now speak design language:**

```jsx
<Button variant="danger" size="large">Delete</Button>
<Button variant="primary">💾 Save <kbd>Ctrl+S</kbd></Button>
```

The second line shows `children` paying off: icon plus keyboard hint, no new props needed. The README notes the ending: in TypeScript, `variant: 'primary' | 'danger' | ...` makes typos a *compile-time* error — the throw becomes unnecessary because the mistake can't even build.

## 7. Words you learned (glossary)

- **Design system** — a team's fixed catalog of approved component looks.
- **Boolean prop shorthand** — `<Button primary />` means `primary={true}`.
- **Prop soup** — a component API that grew one flag at a time, with unplanned interactions.
- **Enum** — a value from a fixed named set (`'small' | 'medium' | 'large'`).
- **Axis of variation** — one independent question about a component (kind, size).
- **Variant prop** — the enum prop answering "what kind?"
- **Default parameter** — `variant = 'default'` fills in when the caller omits the prop.
- **Lookup table** — an object mapping names to data; replaces if-chains.
- **`in` operator** — `'small' in SIZES`: does the object have this key?
- **Spread merge** — `{ ...a, ...b }` combines objects (later fields win).
- **`throw`** — stop with a loud error; better than silently rendering the wrong thing.
- **Unrepresentable state** — a bad combination the API gives you no way to write.
- **`children`** — the prop holding whatever appears between a component's tags.
- **Call site** — the place a component is used (`<Button ... />`).
- **Hex color** — `#36c` style color codes for red/green/blue amounts.

## 8. Experiments to try on the plane (no internet needed)

Note once: these pages load React from a CDN, so *running* them needs internet on first load (if opened before the flight, your browser may have React cached). Reading and editing works offline — write your prediction before each test.

1. **Swap two `if`s in the original:** move the `if (danger)` line above `if (primary)`. Prediction: the "primary + danger??" button turns BLUE — the design of your app just changed because two lines traded places. That's the whole indictment.
2. **Make a typo in the refactor:** change a call site to `variant="primry"`. Prediction: the page shows an error (in the console and likely a blank area): `Unknown variant "primry"`. Now try the equivalent in the original: `<Button label="x" primry />` — prediction: silently renders the gray default; the typo could live for months.
3. **Add a `success` variant** to the refactor: one row in `VARIANTS` — `success: { background: '#2a2', color: '#fff' }` — then use `<Button variant="success">Publish</Button>`. Prediction: works instantly; you touched zero logic. Count what the original would need (a new boolean prop, a new `if`, and a new spot in the pecking order against the other four flags).
4. **Try to write the impossible state** in the refactor: `<Button variant="primary" variant="danger">??</Button>`. Prediction: this isn't two variants — a duplicated attribute means the later one simply wins (and tooling normally flags it). There is no syntax to request both. Compare how *natural* `primary danger` looked.
5. **Abuse `children` happily:** `<Button variant="ghost" size="large">🚀 <em>Launch</em> — <kbd>Enter</kbd></Button>`. Prediction: renders fine — icon, italics, punctuation, keyboard hint. Then imagine the prop-based version: `icon="🚀" labelItalic shortcut="Enter"`... the soup regrowing.
