# 📘 Learning Guide: Portals (Project 38)

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A settings page with:

- a blue app header bar,
- a "Settings" heading,
- a bordered sidebar card labeled "Danger zone" containing a **"Delete account…"** button.

Click the button and a **modal** should appear: a dialog box ("Really delete?") centered on screen, floating above everything, with the rest of the page dimmed behind a dark translucent **backdrop**. Click the backdrop (or, in the refactor, press Escape) to cancel.

In the original, the modal is a mess: the "fullscreen" dim layer is squeezed inside the sidebar card instead of covering the screen, and the blue header floats *above* the dimming. In the refactor — with the exact same hostile CSS on the page — the modal covers the full viewport, above everything. The fix isn't better CSS. It's moving where the modal's pixels land in the document.

## 2. Concepts you need first

### The DOM tree vs the React tree

The **DOM** (Document Object Model) is the browser's live tree of HTML elements — what actually gets painted. Normally React mirrors your component tree into the DOM in place: if `<Modal />` is rendered inside the sidebar component, its `<div>`s end up inside the sidebar's `<div>` in the DOM. This project is about the rare case where those two trees should *disagree*.

### CSS `position: fixed` — and its betrayal

`position: fixed` normally means "position me relative to the **viewport** (the visible window), ignoring my parents" — the classic tool for overlays:

```css
.modal-backdrop { position: fixed; inset: 0; }  /* inset: 0 = stretch to all four edges */
```

But there's a trap: if any **ancestor** element has a `transform` (or certain other properties), that ancestor becomes the **containing block** — and `fixed` children anchor to *it* instead of the viewport. Your "fullscreen" overlay becomes "full-sidebar". This is the least-known and most maddening CSS rule in this project.

### `overflow: hidden` — the clipper

`overflow: hidden` on an element means "clip anything of my children that sticks out past my box." Useful for cards; fatal for a child that's trying to cover the whole screen: everything outside the card is simply cut off.

### `z-index` and stacking contexts

`z-index` controls who paints on top. Beginners assume it's one global contest — biggest number wins. In reality, elements are grouped into **stacking contexts** (created by things like `position` + `z-index`, or `transform`), and the contest happens *between* groups first. A child with `z-index: 99999` inside a group that sits below another group still loses to that other group. That's why the header (`z-index: 10`) floats above the modal's backdrop: the backdrop is trapped inside the sidebar's low-ranked group. Escalating numbers — "9999", then "99999" — is the traditional non-fix.

### The shared shape of all three problems

Clipping, containing blocks, stacking — all three are things **ancestors do to descendants**, and CSS on the child cannot override any of them. Conclusion: if pixels must escape their ancestors, the pixels must stop being descendants.

### createPortal: render here, appear there

A **portal** tells React: keep this component exactly where it is in the *component* tree, but put its DOM output somewhere else:

```jsx
ReactDOM.createPortal(
  <div className="overlay">I paint at document top level!</div>,
  document.getElementById('modal-root'),  // an existing DOM node
);
```

`document.getElementById` fetches a real DOM element by its `id`. The convention: put an empty `<div id="modal-root"></div>` at the end of `<body>`, a **sibling** of the app's root div — outside every clipping/stacking ancestor *by construction*.

The magical part: **only the pixels move.** The component stays where it was in the React tree, so props, state, context (project 33's LEARN.md) — and even React's event bubbling — flow as if it rendered inline. A portal relocates output, not ownership.

### Small supporting cast

- `{open && <Modal ... />}` — conditional mounting (project 32's LEARN.md): a closed modal isn't hidden, it doesn't exist — its state is intentionally discarded (the "destroy on purpose" corner of project 32's trilogy, usually right for dialogs).
- `e.stopPropagation()` — stops a click from bubbling up to parent elements' handlers; used so clicking *inside* the dialog doesn't count as clicking the backdrop.
- `useEffect` + `addEventListener`/cleanup — the listener-with-cleanup pairing from project 18, used for Escape-to-close.

## 3. Walking through the original code

First, the CSS that makes the page hostile — deliberately realistic:

```css
.sidebar {
  overflow: hidden;          /* clips children to its box */
  transform: translateX(0);  /* creates a containing block */
  position: relative; z-index: 1;
}
.header { position: relative; z-index: 10; ... }
```

`translateX(0)` moves the sidebar by zero pixels — visually nothing! — but its mere presence flips the containing-block switch. Real apps acquire such properties for animations or layout, innocently.

```jsx
function DeleteAccountButton() {
  const [open, setOpen] = useState(false);

  return (
    <span>
      <button onClick={() => setOpen(true)}>Delete account…</button>
      {open && (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
```

The state logic is fine: `open` flag, conditional mount, backdrop click closes, inner click stopped from bubbling. The problem is *location*: this JSX renders where the button lives, so the backdrop `<div>` lands in the DOM **inside the sidebar** — under an `overflow: hidden`, inside a transform's containing block, inside a `z-index: 1` stacking context.

```jsx
<div className="header">App header (z-index: 10)</div>
<h1>Settings</h1>
<div className="sidebar">
  <p>Danger zone (this card has overflow:hidden + a transform)</p>
  <DeleteAccountButton />
</div>
```

The page: header above, sidebar (with the button, hence the modal) below.

## 4. What's wrong with it (in beginner terms)

Click "Delete account…" and look closely at the wreckage — three separate CSS defeats, one per hostile ancestor property:

1. **The dim layer is clipped to the card.** You wanted the whole page dimmed; instead a dark rectangle appears only *inside* the sidebar's borders. That's `overflow: hidden` cutting off everything outside the card.
2. **"Fixed" isn't fixed.** The backdrop's `position: fixed; inset: 0` should mean "cover the viewport". But the sidebar's `transform` made it the containing block, so "all four edges" now means the *sidebar's* edges. The modal centers itself in the card, not the screen.
3. **The header floats above the dimming.** The header's `z-index: 10` beats the backdrop — not because 10 is big, but because the backdrop is imprisoned in the sidebar's `z-index: 1` stacking context. No number you give the backdrop can escape; its *group* loses before it competes. Watch a colleague try `z-index: 9999`, then `99999`. Nothing.

The punchline, worth engraving: **the modal's CSS is fine — its position in the DOM dooms it.** Modals that render where their button lives fight their ancestors, and ancestors always win.

## 5. Try it yourself first!

1. **Vague:** you can't beat the ancestors, so stop having them. Where in the document could the modal's `<div>`s live so that no clipping, no transform, no stacking context sits above them?
2. **Warmer:** add `<div id="modal-root"></div>` to the HTML just before `</script>`... no — before `</body>`, as a *sibling* of `<div id="root">`. Now, what React function renders JSX into a DOM node of your choosing while keeping the component logically where it is?
3. **Specific:** wrap the backdrop JSX in `ReactDOM.createPortal(jsx, document.getElementById('modal-root'))`. Keep the `open` state and handlers exactly where they are.
4. **Check yourself:** with the same hostile CSS untouched — full-screen dimming, dialog centered in the *viewport*, header underneath the dim layer. Backdrop click still closes (ask yourself why it still works — the answer is the portal's best feature).
5. **Stretch:** extract a reusable `<Modal onClose>` component, and add Escape-to-close with a `useEffect` window listener (don't forget the cleanup).

## 6. Understanding the refactored solution

The HTML gains one line:

```html
<div id="root"></div>
<!-- the modal layer: a sibling of the app root, last in the body,
     outside every clipping/stacking ancestor by construction -->
<div id="modal-root"></div>
```

Being last in `<body>` and a sibling of the app root, nothing above it clips, transforms, or out-stacks it — not by clever CSS, but **by construction**. There is no battlefield.

The reusable component:

```jsx
function Modal({ onClose, children }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return ReactDOM.createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>,
    document.getElementById('modal-root'),
  );
}
```

Design choices worth noticing:

- **The portal is the whole fix.** Same backdrop CSS as the original; it just paints from `#modal-root` now.
- **The component tree didn't change.** `Modal` is still rendered by `DeleteAccountButton`; the caller still writes `{open && <Modal onClose={...}>content</Modal>}`. State, context, and React event flow behave as if inline — which is exactly why the backdrop-click-to-close logic survived the move without edits. Pixels moved; ownership didn't.
- **Esc-to-close** is a window-level listener added in an effect and removed in its cleanup (project 18's pairing) — every modal should have it.
- **Closed = unmounted.** The `&&` idiom means a closed modal holds no state and costs nothing — the deliberate-destruction option from project 32, usually correct for dialogs.
- **Honest production note:** real modals also need focus trapping (keeping keyboard Tab inside the dialog) and `aria-modal` (a screen-reader hint). Reach for a library or the native `<dialog>` element when it's real — but the portal mechanics underneath are what you just learned.

Same medicine treats every overlay species: tooltips, dropdown menus, toasts — anything that must escape scroll containers and stacking contexts.

## 7. Words you learned (glossary)

- **Modal:** a dialog that blocks interaction with the rest of the page until dismissed.
- **Backdrop:** the dark translucent layer dimming the page behind a modal.
- **DOM:** the browser's live tree of elements — what actually gets painted.
- **Viewport:** the visible browser window area.
- **`position: fixed`:** position relative to the viewport — *unless* an ancestor's transform hijacks it.
- **Containing block:** the ancestor a positioned element measures itself against; a `transform` makes an element one, capturing `fixed` descendants.
- **`overflow: hidden`:** clips children to the parent's box.
- **`z-index`:** paint-order number — only meaningful within a stacking context.
- **Stacking context:** a group of elements whose z-indexes compete internally; the group ranks as one unit against outside groups.
- **Portal / `createPortal`:** React feature rendering a component's DOM output into a different DOM node while keeping its place in the component tree.
- **`#modal-root`:** conventional top-level DOM node for portal output, sibling of the app root.
- **Event bubbling:** events travel from the clicked element up through ancestors; portals bubble through the *React* tree, not the DOM tree.
- **`stopPropagation()`:** halts bubbling — inner clicks don't reach the backdrop's handler.
- **Focus trap / `aria-modal`:** accessibility requirements for production modals (keyboard containment; screen-reader signaling).
- **Toast:** a small transient notification overlay — same portal medicine.

## 8. Experiments to try on the plane (no internet needed)

(One-time note, detailed in project 27's LEARN.md: these pages load React from a CDN, so *running* them needs internet on first load; reading and editing don't.)

1. **Un-portal the refactor.** In `Modal`, replace the `createPortal(...)` call with just the backdrop JSX (return it directly). Prediction: all three original symptoms return instantly — clipped dim layer, card-anchored "fixed", header on top — proving the portal, not any CSS difference, is the entire fix.
2. **Fight with z-index and lose.** In the *original*, add `z-index: 99999` to the `.modal-backdrop` CSS rule. Prediction: header still floats above the dimming. The backdrop's stacking group (the sidebar, `z-index: 1`) loses to the header's group before your big number is ever consulted.
3. **Neutralize one ancestor at a time.** In the original's CSS, delete `overflow: hidden` from `.sidebar`; observe. Restore it, then delete `transform: translateX(0)`; observe. Prediction: each removal fixes exactly one symptom (clipping vs anchoring) — three problems, three causes, separable.
4. **Prove context crosses the portal.** In the refactor, wrap `App` in a tiny context provider (say `LabelContext.Provider value="DANGER"`), and read it with `useContext` *inside* the modal's children. Prediction: it works — the modal's DOM lives in `#modal-root`, but its component sits inside the provider, so context flows. Pixels moved; the family tree didn't.
