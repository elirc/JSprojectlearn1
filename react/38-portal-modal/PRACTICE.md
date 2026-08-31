# 🏋️ Practice: Portals

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

(Once for this file: everything is writable and predictable offline; running the page needs the CDN or a cached load.)

## Exercises

### ⭐ 1. Predict: the click that crosses realms (warm-up)

Add a logging handler to the sidebar in the refactor: `<div className="sidebar" onClick={() => console.log('sidebar clicked')}>`. Now open the modal and click (a) the dialog box itself, (b) the dark backdrop. For each click, predict whether "sidebar clicked" appears in the console — remembering that the modal's DOM lives in `#modal-root`, *outside* the sidebar's DOM entirely.

*Practices:* React events bubble through the *component* tree, not the DOM tree.
*Hint:* who renders `<Modal>`? Follow the component ancestry, not the HTML.
*Expected:* your two answers (and the reason the DOM location doesn't decide) match the solution.

### ⭐⭐ 2. Scroll lock while open (core)

Long pages scroll behind an open modal — disorienting. Make `Modal` lock page scrolling while it's mounted: set `document.body.style.overflow = 'hidden'` on mount and restore `''` on unmount. Add ~40 `<p>filler</p>` lines to the page to test.

*Practices:* effects with cleanup doing setup/teardown tied to conditional mounting.
*Hint:* the modal already unmounts on close (`{open && ...}`), so cleanup *is* the unlock.
*Expected:* with the modal open, the wheel does nothing; the instant it closes (cancel, backdrop, or Esc), scrolling works again.

### ⭐⭐ 3. A toast, portal-style (core)

After clicking DELETE, close the modal and show a toast — a small dark pill fixed to the bottom-right, "Account deletion requested", above all page chrome — that removes itself after 3 seconds. Build a reusable `Toast({ children, onDone })` that portals into `#modal-root` and arranges its own disappearance.

*Practices:* the second overlay species; timers with cleanup; portal reuse beyond dialogs.
*Hint:* parent keeps `toastVisible` state; `Toast` runs a `setTimeout(onDone, 3000)` in an effect (cleanup: `clearTimeout`).
*Expected:* DELETE → modal gone, toast visible in the viewport corner (not clipped by the sidebar), gone by itself after ~3s; clicking DELETE again repeats it.

### ⭐⭐ 4. The portal that didn't escape (planted bug) (core)

A teammate refactored and the bug report reads: "we're using createPortal but the modal is clipped to the card again!" Their code portals into a node they added *inside the sidebar markup*:

```jsx
// in App's JSX: <div className="sidebar"> ... <div id="overlay-slot"></div> </div>
// in Modal:     ReactDOM.createPortal(backdropJsx, document.getElementById('overlay-slot'))
```

Explain precisely why every original symptom is back despite the portal, then state the fix.

*Practices:* a portal escapes only as far as its *target's* ancestors allow.
*Hint:* list the CSS ancestors of `#overlay-slot`.
*Expected:* your explanation names all three returning symptoms and their causes; the fix is one line.

### ⭐⭐⭐ 5. Stop the Esc-listener churn (challenge)

The Esc effect has deps `[onClose]`, and the caller passes an inline arrow — a fresh function each render of `DeleteAccountButton`. Add a `tick` state to `DeleteAccountButton` (a button incrementing it once per click, rendered next to Delete) and a `console.log('subscribing Esc')` inside the effect: observe (or reason out) the churn while the modal is open. Then fix it so the listener subscribes once per modal lifetime — two acceptable fixes exist; implement one and name the other.

*Practices:* referential stability (projects 28/30) meeting effect deps; the latest-ref pattern.
*Hint:* fix A lives in the caller (`useCallback`); fix B lives inside `Modal` (a ref that always holds the newest `onClose`, effect deps `[]`).
*Expected:* before: one subscribe/unsubscribe pair logged per tick click while open. After: exactly one "subscribing Esc" per modal open, no matter how often the parent re-renders — and Esc still calls the *current* `onClose`.

## Solutions

### 1. Predict: the click that crosses realms

Both (a) and (b) log "sidebar clicked". React delivers synthetic events along the **component** tree: the dialog is rendered by `Modal`, which is rendered by `DeleteAccountButton`, which sits inside the sidebar `<div>`'s JSX — so clicks inside the portal bubble up through that chain as if the modal were inline, even though in the DOM the click happened in `#modal-root`, nowhere near the sidebar. ((b) additionally runs the backdrop's own `onClick`, closing the modal — then the event continues up and still logs.)

**Why:** this is the "pixels move, ownership doesn't" rule made visible: `createPortal` changes where output *paints*, while props, context, and event propagation follow who *renders* whom. It's a feature (the family stays wired) and an occasional gotcha — a modal inside a clickable card can trigger the card's handler, which is exactly what you just predicted.

### 2. Scroll lock while open

```jsx
function Modal({ onClose, children }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);
  // ...existing Esc effect and portal return unchanged
}
```

**Why:** the lock is a side effect on something React doesn't own (`document.body`), so an effect is its rightful home, and the cleanup is the mirror-image teardown (project 18's pairing). Because callers mount the modal conditionally, "while open" and "while mounted" are the same interval — close by any route (cancel, backdrop, Esc) unmounts, cleanup runs, scrolling returns. No open/close flags to synchronize; the component's lifetime *is* the lock's lifetime.

### 3. A toast, portal-style

```jsx
function Toast({ children, onDone }) {
  useEffect(() => {
    const id = setTimeout(onDone, 3000);
    return () => clearTimeout(id);
  }, [onDone]);

  return ReactDOM.createPortal(
    <div style={{ position: 'fixed', right: 16, bottom: 16, background: '#222',
                  color: '#fff', padding: '10px 16px', borderRadius: 8 }}>
      {children}
    </div>,
    document.getElementById('modal-root'),
  );
}

function DeleteAccountButton() {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState(false);

  function handleDelete() {
    setOpen(false);
    setToast(true);
  }

  return (
    <span>
      <button onClick={() => setOpen(true)}>Delete account…</button>
      {open && (
        <Modal onClose={() => setOpen(false)}>
          <h3>Really delete?</h3>
          <button onClick={() => setOpen(false)}>cancel</button>{' '}
          <button style={{ color: '#c33' }} onClick={handleDelete}>DELETE</button>
        </Modal>
      )}
      {toast && <Toast onDone={() => setToast(false)}>Account deletion requested</Toast>}
    </span>
  );
}
```

**Why:** same portal, different species — the toast must beat the sidebar's clipping and the header's stacking exactly like the modal did, so it paints from the same top-level node. The parent owns *whether* the toast exists (state + conditional mount); the toast owns only its lifespan mechanics, reporting expiry through `onDone` — controlled-component thinking applied to an overlay. The `clearTimeout` cleanup matters: dismissing early (unmount) must not leave a timer firing `onDone` into a stale world.

### 4. The portal that didn't escape

The portal *works* — pixels land in `#overlay-slot` — but that node lives **inside the sidebar**, so the output re-inherits every hostile ancestor: `overflow: hidden` clips the backdrop to the card; the sidebar's `transform` is still the containing block, so `position: fixed` anchors to the card; and the backdrop still competes from inside the sidebar's `z-index: 1` stacking context, losing to the header's `z-index: 10`. A portal isn't magic escape energy; it's a *change of address* — and this address has the same landlords. Fix: target the top-level node again:

```jsx
ReactDOM.createPortal(backdropJsx, document.getElementById('modal-root'))
```

**Why:** the guarantee was never "createPortal fixes overlays"; it was "`#modal-root` has no clipping/transforming/stacking ancestors *because of where it sits* — last in `<body>`, sibling of the app root." Move the destination and you move the guarantee. When auditing overlay bugs, check the target node's ancestry first.

### 5. Stop the Esc-listener churn

Diagnosis: each `tick` render creates a new `() => setOpen(false)`, the effect's `[onClose]` sees a changed dep, and React tears down and re-adds the window listener — one subscribe/unsubscribe pair per parent render while open. Harmless here, expensive when setup is real (sockets, observers). Fix B, inside `Modal` (works for every careless caller):

```jsx
function Modal({ onClose, children }) {
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }); // keep the box fresh

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onCloseRef.current(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []); // subscribe once per modal lifetime
  // ...portal return unchanged
}
```

Fix A (caller-side): `const close = useCallback(() => setOpen(false), []);` and pass `onClose={close}` — the dep stops changing, so `[onClose]` stops churning.

**Why:** the effect needs two things that pull in opposite directions — subscribe *once*, but call the *newest* callback. The latest-ref splits them: the ref's identity never changes (honest `[]`), while its contents are refreshed after every render, so Esc always reaches the current closure. Fix A instead stabilizes the prop at the source; library components usually implement Fix B anyway, because they can't control their callers — the same stable-vs-fresh collision projects 26/28/30 kept circling, resolved the same way.
