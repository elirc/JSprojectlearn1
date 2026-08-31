# 📘 Learning Guide: Preserving State (Project 32)

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A support-ticket screen ("Ticket #42") with two tab buttons:

- **Reply** — shows a text area where you type your answer to the customer,
- **Details** — shows a line about the customer ("Customer: Ada Lovelace · Plan: Enterprise...").

Only one tab's content is visible at a time; clicking the buttons switches between them.

The bug in the original is heartbreaking in the most realistic way: type half a long, thoughtful reply, click **Details** for two seconds to check the customer's plan, click back to **Reply** — and your text is gone. Empty box. In the refactor, your half-written reply survives any amount of tab-hopping.

## 2. Concepts you need first

### Mount, unmount, and where state lives

Full introduction in project 31's LEARN.md; the essentials: when React renders a component it creates an **instance** that holds its state. **Unmounting** (removing it from the tree) destroys the instance *and its state, permanently*. Re-rendering it later creates a brand-new instance whose `useState` initializers run fresh.

### Conditional rendering with `&&`

A JSX idiom you'll see everywhere:

```jsx
{tab === 'reply' && <ReplyTab />}
```

In JavaScript, `a && b` evaluates to `b` when `a` is truthy, and to `a` (here `false`) when not. React renders `false` as nothing. So this line means: "render `<ReplyTab />` only when the reply tab is active."

The crucial, easy-to-miss consequence: when the condition goes false, React doesn't *hide* ReplyTab — it **unmounts** it. The instance and every bit of its state are destroyed. When the condition comes back true, a *new* instance mounts with blank state.

> `cond && <X />` doesn't hide — it destroys.

### State lifetime follows tree structure

The rule that unifies this project with project 31: **state lives exactly as long as the component instance at that position in the tree.** So every structural decision — whether something is rendered, where it sits, what its key is — is secretly also a decision about how long its state survives. A UI toggle can be a data-shredder without looking like one.

### Lifting state up (the rescue move)

If state must outlive a component, move it to a parent that doesn't unmount:

```jsx
function App() {
  const [reply, setReply] = useState('');       // App never unmounts
  return <ReplyTab reply={reply} onReplyChange={setReply} />;
}
```

The child becomes **controlled**: it displays a prop and reports changes through a callback, owning nothing (that contract is project 36's whole topic; project 08 introduced lifting).

### Hiding with CSS instead of unmounting

`display: none` is a CSS rule meaning "take up no space, paint nothing." Applied via a wrapper:

```jsx
<div style={{ display: active ? 'block' : 'none' }}>
  <HeavyEditor />
</div>
```

The pixels vanish, but React never unmounted anything — the instance, its state, its scroll position all survive. Cost: the hidden component still exists in memory, and its effects (timers, subscriptions) keep running.

### The three-tool choice

For any "show/hide" toggle, ask: *what should happen to the state behind it?*

1. **Destroy it** → unmount (`&&`), or force a restart with `key` (project 31). Right when stale state would be a bug.
2. **Preserve it cheaply** → keep mounted, hide with CSS. Right for heavy subtrees you don't want rebuilt.
3. **Make it outlive the toggle** → lift the state to a parent. Right when the data matters beyond the tab (drafts! form progress!).

## 3. Walking through the original code

```jsx
function ReplyTab() {
  const [reply, setReply] = useState('');
  return (
    <div className="card">
      <p>Your reply:</p>
      <textarea rows="4" value={reply} onChange={(e) => setReply(e.target.value)}
                placeholder="type a long, thoughtful reply..." />
```

The reply text is state **owned by ReplyTab itself**. Perfectly natural-looking — the state sits with its only reader (project 29 would approve!). The problem isn't where it is; it's how long its owner lives.

```jsx
function DetailsTab() {
  return (
    <div className="card">
      <p>Customer: Ada Lovelace · Plan: Enterprise · Mood: patient, for now</p>
```

Static content, no state. Nothing to lose here.

```jsx
function App() {
  const [tab, setTab] = useState('reply');
```

The parent tracks which tab is active.

```jsx
{tab === 'reply' && <ReplyTab />}
{tab === 'details' && <DetailsTab />}
```

The standard conditional render. When you click Details, the first line's condition goes false — ReplyTab unmounts, and the draft dies with it.

## 4. What's wrong with it (in beginner terms)

The on-screen story, in slow motion:

1. You're on Reply. You type: "Hi Ada, thanks for your patience. I looked into the billing discrepancy and—"
2. You think: "wait, what plan is she on?" Click **Details**.
3. At that instant, `tab` becomes `'details'`, so `tab === 'reply'` is false, so React **unmounts** `ReplyTab`. The instance holding your 20 words is garbage-collected. No undo. Nothing was "saved somewhere" — component state lives only in the instance.
4. You read "Plan: Enterprise", click **Reply**.
5. React mounts a **new** `ReplyTab` instance. Its `useState('')` runs fresh. The box is empty.

Nothing crashed. No error in the console. The code does exactly what it says — that's the point of this project: `&&` *says* "don't render", and not-rendering *means* destruction. The author made a UI decision (show one tab at a time) and got a data-lifetime decision (drafts die on tab switch) for free, without noticing.

Note the deliberate symmetry with project 31: there, unmount-on-key-change was the *fix* (we wanted state destroyed). Here the same mechanism fires by accident against the user's work. The mechanism is neutral; matching it to intent is the skill.

## 5. Try it yourself first!

1. **Vague:** the draft must survive something that destroys `ReplyTab`. Two very different strategies exist: change *who owns* the draft, or change *whether ReplyTab is destroyed at all*. Sketch both.
2. **Warmer (path A):** which component in this app never unmounts? What would `ReplyTab` look like if it received the draft and a change-callback as props instead of owning state?
3. **Warmer (path B):** how do you make content invisible *without* removing it from the React tree? (It's a CSS property, applied on a wrapper div, driven by `tab`.)
4. **Specific:** path A — move `useState('')` for the reply into `App`, pass `reply` and `onReplyChange` into `ReplyTab`. Path B — replace `{tab === 'reply' && <ReplyTab />}` with a `<div style={{ display: tab === 'reply' ? 'block' : 'none' }}><ReplyTab /></div>`.
5. **Check yourself:** type, switch away, switch back — text intact. Then ask: which path would you pick if ReplyTab were a huge, slow-to-mount editor? Which if the draft also needed to be submitted by a button living *outside* the tabs?

## 6. Understanding the refactored solution

The refactor demonstrates **both** fixes at once (and says so — in your own code you'd pick one).

**Fix A — lift the precious state:**

```jsx
function ReplyTab({ reply, onReplyChange }) {
  return (
    <div className="card">
      <p>Your reply:</p>
      <textarea rows="4" value={reply} onChange={(e) => onReplyChange(e.target.value)}
```

`ReplyTab` now owns nothing — it's a controlled component: displays `reply`, reports keystrokes via `onReplyChange`. The state lives in `App`:

```jsx
const [tab, setTab] = useState('reply');
const [reply, setReply] = useState('');
```

`App` never unmounts, so tab switches *cannot* touch the draft — they don't own it. Choose this when the data matters beyond the tab: drafts, form progress, anything a user would grieve.

**Fix B — hide with CSS:**

```jsx
<div style={{ display: tab === 'reply' ? 'block' : 'none' }}>
  <ReplyTab reply={reply} onReplyChange={setReply} />
</div>
{tab === 'details' && <DetailsTab />}
```

The wrapper div stays mounted always; only its visibility toggles. State, scroll position, even keyboard focus survive. Choose this for heavy subtrees you don't want re-created on every switch (rich text editors, maps, big lists). Cost: hidden components still consume memory and their effects stay live — don't CSS-hide dozens of heavy panes.

Note `DetailsTab` still uses plain `&&` — it has no state, so destroying it is free. Tool matched to need, per tab.

And tool number three remains valid: unmount **on purpose** (plain `&&`, or `key` from project 31) when throwing state away is the desired behavior — e.g., a search popup that should always open blank.

## 7. Words you learned (glossary)

- **Mount / unmount:** React creating / destroying a component instance; unmount destroys its state (project 31's LEARN.md).
- **Conditional rendering:** rendering something only when a condition holds — `{cond && <X />}`.
- **State lifetime:** how long a piece of state survives = the lifetime of the instance owning it.
- **Lifting state up:** moving state to a parent so it outlives (or is shared by) children.
- **Controlled component:** a component that displays a prop and reports changes via a callback, owning no copy (project 36).
- **`display: none`:** CSS that hides an element completely while it remains in the document.
- **Precious state:** informal — state whose loss hurts the user (drafts, form progress).
- **Subtree:** a component and everything below it.
- **Garbage collection:** JavaScript automatically reclaiming memory nothing references — where unmounted state goes.

## 8. Experiments to try on the plane (no internet needed)

(One-time note, detailed in project 27's LEARN.md: the pages load React from a CDN, so running them needs internet on first load; reading, editing, and predicting work offline.)

1. **Prove Fix B alone is enough.** In the refactor, move the reply `useState` back *into* `ReplyTab` (take the props away) but keep the `display:none` wrapper. Prediction: the draft still survives switching — the instance never dies. This isolates Fix B from Fix A.
2. **Prove the wrapper matters.** Then change the wrapper back to `{tab === 'reply' && ...}`. Prediction: the bug returns — with state colocated *and* conditional unmount, the draft dies again. This is exactly the original.
3. **Watch effects stay alive when CSS-hidden.** Add to `ReplyTab`: `useEffect(() => { const id = setInterval(() => console.log('reply tab alive'), 1000); return () => clearInterval(id); }, []);` Prediction: with the CSS-hide version, the log keeps ticking while you're on Details (hidden ≠ gone); with the `&&` version it stops (cleanup ran on unmount).
4. **Break DetailsTab on purpose.** Give `DetailsTab` a `useState` counter with a button, then switch tabs and return. Prediction: counter resets to zero every time — and for this content that's fine. Deciding *which* tabs deserve preservation is the real skill.
