# 📘 Learning Guide: Resetting State with key (Project 31)

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A tiny "bio editor". On screen:

- two buttons, "Ada" and "Grace", to choose which user you're looking at,
- a card showing the chosen user's name and a text area containing a **draft** — an editable copy of that user's bio,
- a small line showing the current draft text.

The intended behavior: click Grace and you should get *Grace's* bio in the box, fresh. In the original, switching users misbehaves: you can catch the previous user's text flashing in the box for a moment, and edits get silently thrown away by a background "sync". In the refactor the switch is instant and clean — and the fix is literally one attribute.

## 2. Concepts you need first

### Component instances: the component vs a living copy of it

A component *function* is a recipe. When React renders `<BioEditor />` somewhere in the tree, it creates an **instance** — a living copy with its own state. The instance survives across re-renders: that's how state persists.

**Mounting** = React creating an instance and putting it on screen for the first time. **Unmounting** = React destroying it — its state is gone forever.

### State initializers run once, at mount

```jsx
function BioEditor({ user }) {
  const [draft, setDraft] = useState(user.bio); // reads user.bio ONCE
```

The value you pass to `useState` is only used at **mount**. On every later render, `useState` ignores its argument and returns the current state. So if `user` changes but the instance stays alive, `draft` keeps its old value. This surprises everyone once.

### How React decides "same instance" or "new instance"

Between renders, React matches up components by their **position in the tree** and their **type**. Same type at the same position → "same component, keep the instance (and its state), just update the props." That's why `<BioEditor user={grace} />` rendered in the same spot as `<BioEditor user={ada} />` *reuses* the Ada instance — including her draft.

### The key prop: identity you control

`key` is a special prop that tells React *which* thing a piece of JSX represents. You've met it in lists (project 03). The deeper truth: **a changed key means "this is a different thing"**, anywhere, not just in lists.

```jsx
<Profile key="ada" />
// next render:
<Profile key="grace" />  // new key → React unmounts the old instance
                         // and mounts a brand-new one (fresh state)
```

Same key → update in place. New key → destroy and start over. That "start over" is exactly the reset behavior this project needs.

### useEffect and the "sync props into state" anti-pattern

`useEffect(fn, deps)` runs `fn` *after* React has rendered and updated the screen. Full introduction in the earlier effect projects; here you only need the timing: **effects run after paint**. So this popular "fix":

```jsx
useEffect(() => { setDraft(user.bio); }, [user.id]);
```

means: render with the OLD draft first (the user already switched!), put that on screen, *then* notice and set state, *then* render again with the right value. There is always one wrong frame. This pattern — copying a prop into state with an effect — is called a **prop-to-state sync effect**, and it's almost always a design smell.

### "Frame" and "flash"

The browser repaints the screen many times per second; each repaint is a frame. A "flash of stale content" means at least one frame showed old data before a correction landed. Fast eyes see it; slow devices make everyone see it.

## 3. Walking through the original code

```jsx
const USERS = [
  { id: 1, name: 'Ada', bio: 'First programmer.' },
  { id: 2, name: 'Grace', bio: 'Compiler inventor.' },
];
```

Fixed data: two users, each with an `id`, `name`, and `bio`.

```jsx
function BioEditor({ user }) {
  // v1 shipped with just this line — and switching users kept
  // the OLD draft (state initializers run once, on mount):
  const [draft, setDraft] = useState(user.bio);
```

Version 1 of the bug: initialize the draft from the prop. Works for the first user. Click Grace → same instance, initializer ignored → Ada's draft stays.

```jsx
  // v2 "fixed" it with the infamous sync effect:
  useEffect(() => {
    setDraft(user.bio);
  }, [user.id]);
```

Version 2's patch: whenever `user.id` changes, overwrite the draft. It "works... mostly" — read the three numbered problems in the file's comments; section 4 below unpacks them.

```jsx
function App() {
  const [selectedId, setSelectedId] = useState(1);
  const user = USERS.find((u) => u.id === selectedId);
```

The parent keeps only *which* user is selected, and looks the full user object up from the array. (`find` returns the first element matching the test.)

```jsx
{USERS.map((u) => (
  <button key={u.id} onClick={() => setSelectedId(u.id)}
          disabled={u.id === selectedId}>
    {u.name}
  </button>
))}
<BioEditor user={user} />
```

Buttons to switch users, and the editor — rendered with **no key**, so it's always "the same component at the same position": one instance, reused across users.

## 4. What's wrong with it (in beginner terms)

The on-screen story: type "Ada was brilliant" into Ada's box. Click Grace. For a split second the box *still shows your Ada text under Grace's name* — then it snaps to "Compiler inventor." Your Ada edit is gone, no warning.

Three separate problems, all from one design flaw:

1. **The wrong-content frame.** The effect runs *after* render. So the render order is: (a) Grace's name + Ada's draft — wrong, and it's on screen; (b) effect fires, `setDraft(grace.bio)`; (c) re-render — now right. Step (a) is visible. Worse than cosmetic: if you're typing fast at the moment of the switch, a keystroke can land in the wrong user's draft.
2. **Silent data loss.** The effect wipes unsaved edits *after* the switch already happened. There's no moment where code could ask "you have unsaved changes — sure?"
3. **It's a state←prop sync effect.** Two places now claim to know what the draft is: the state, and the effect that overwrites the state from a prop. Project 21 of this track flags this species of effect as always-suspicious; this is a specimen.

The deep diagnosis, worth memorizing: **the component instance is being reused across users while its state pretends to belong to one of them.** The state's *lifetime* (the instance) doesn't match the state's *meaning* (one user's draft).

## 5. Try it yourself first!

1. **Vague:** the fix isn't more code inside `BioEditor` — it's telling React something in `App`. What would you want React to do to the editor at the moment the user switches?
2. **Warmer:** you want the old editor instance destroyed and a fresh one created, so the initializer runs again with the new user. What prop controls a component's *identity* in React's eyes?
3. **Specific:** give the editor `key={user.id}` where it's rendered, then delete the sync effect entirely — it's no longer needed. What else can you now delete from `BioEditor`?
4. **Check yourself:** edit Ada, switch to Grace — instantly Grace's bio, no flash. Switch back — Ada's *original* bio (your edit is intentionally gone: new instance, fresh state). Is that acceptable? For this app, yes; that's the defined behavior "draft resets on switch."

## 6. Understanding the refactored solution

The editor got *simpler*:

```jsx
function BioEditor({ user }) {
  const [draft, setDraft] = useState(user.bio);
  // ...no effect. no user.id watching. nothing else.
```

And the parent gained one attribute:

```jsx
<BioEditor key={user.id} user={user} />
```

What happens on switch now: `key` changes from `1` to `2` → React says "different thing" → unmounts the Ada instance (state destroyed *by design*) → mounts a fresh instance → the initializer runs and reads Grace's bio. The wrong-content frame **never exists**, because the old instance never renders with the new user's props. No effect, no flash, no half-second where two sources of truth disagree.

Design points:

- **Complexity moved from runtime logic to a structural declaration.** Instead of code that detects and repairs staleness after the fact, one attribute makes staleness impossible. The editor is now *allowed* to assume it will only ever see one user — the parent's `key` guarantees it.
- **This is project 03's lesson used offensively.** There, wrong keys accidentally destroyed/confused state. Here, a deliberate key change destroys state on purpose. Same mechanism, now a tool.
- **When would a sync-like need be legitimate?** For *partial* resets ("reset the page number when the list changes, keep the filters") prefer deriving values (project 09) or comparing during render. For *full* resets — editors, forms, per-item timers, restart-an-animation — `key={subjectId}` is the answer. Reach for it before you ever write `useEffect(() => setState(prop))`.

## 7. Words you learned (glossary)

- **Instance:** a living copy of a component with its own state, created when React mounts it.
- **Mount / unmount:** React creating an instance / destroying it (state is lost on unmount).
- **State initializer:** the argument to `useState`; used only at mount, ignored afterwards.
- **Reconciliation:** React's matching of new JSX against existing instances by position and type.
- **key:** the prop that names a piece of JSX's identity; changed key = new instance, fresh state.
- **Prop-to-state sync effect:** `useEffect` that copies a prop into state — a design smell; the flash-and-clobber machine.
- **Stale content / flash:** old data visible for a frame before a correction re-renders.
- **Frame:** one repaint of the screen by the browser.
- **Draft:** an editable working copy of saved data (here, the bio).
- **Design smell:** code that works but whose shape signals a deeper problem.

## 8. Experiments to try on the plane (no internet needed)

(One-time note, detailed in project 27's LEARN.md: pages load React from a CDN — first run needs internet; reading and editing don't.)

1. **See v1's bug in isolation.** In `original.html`, delete the `useEffect` block entirely. Prediction: switching users now *never* updates the box — Ada's draft under Grace's name, permanently. That's the raw "initializers run once" fact with no patch over it.
2. **Catch the flash deliberately.** In the original (with the effect restored), add a slowdown to make the wrong frame obvious: inside `BioEditor`, add `const t = performance.now(); while (performance.now() - t < 200) {}` at the top. Prediction: on each switch, the old draft visibly sits under the new name for a beat before snapping.
3. **Key on the wrong thing.** In the refactor, change `key={user.id}` to `key="editor"` (a constant). Prediction: the bug returns exactly as in v1 — a key that never changes never resets anything.
4. **Use key to build a "reset" button.** In the refactor's `App`, add `const [round, setRound] = useState(0)`, render `<BioEditor key={user.id + '-' + round} user={user} />`, and a button `onClick={() => setRound(r => r + 1)}`. Prediction: clicking it wipes the draft back to the user's bio — you've built "start over" with no editor code at all.
