# React 38 — Portals

**Lesson: overlays lose fights with their CSS ancestors — `createPortal` moves
the *pixels* out while the *component* stays put.**

## Run it

Open `original.html` and click "Delete account…": the "fullscreen" backdrop is
clipped to the sidebar card, and the blue header floats above the dim layer.
Refactor (same hostile CSS): a proper fullscreen modal above everything.

## What's wrong with the original?

The modal renders where its button lives — deep inside the sidebar's DOM — and
inherits three ancestor problems its own CSS cannot override:

1. **`overflow: hidden`** on the sidebar clips the backdrop to the card.
2. **`transform`** on the sidebar makes it a *containing block*, so the
   modal's `position: fixed` anchors to the sidebar instead of the viewport —
   the least-known and most maddening of the three.
3. **Ancestor `z-index` stacking**: the header's `z-index: 10` beats the
   backdrop, because stacking is resolved among *ancestors' contexts*, not
   global numbers.

The modal's CSS is fine; its **position in the DOM** dooms it. Escalating
z-index values ("9999", then "99999") is the traditional non-fix.

## What changed in the refactor

- **`ReactDOM.createPortal(jsx, domNode)`** renders the modal's output into
  `#modal-root` — a sibling of the app root, last in `<body>`, outside every
  clipping/stacking ancestor *by construction*. No CSS war; the battlefield
  moved.
- **The component tree didn't change** — that's the elegant part. `Modal` is
  still rendered by `DeleteAccountButton`, so state, context, and even React
  event bubbling flow as if inline. A portal relocates *pixels*, not
  *ownership*. (Which is why the backdrop-click-to-close still works
  unchanged.)
- **A reusable `Modal` component** owns the portal + backdrop + Esc-to-close
  (a window listener with cleanup — project 18's pairing). Callers write
  `{open && <Modal onClose=...>content</Modal>}` — the conditional-mount
  idiom from project 04, which also means closed modals hold no state
  (project 32's trilogy: destroy-on-close is usually right for dialogs).
- Same medicine for every overlay species: tooltips, dropdowns, toasts —
  anything that must escape scroll containers and stacking contexts.
- Production modals also want focus trapping and `aria-modal` — reach for a
  library (or the native `<dialog>`) when it's real; the portal mechanics
  underneath are what you just learned.

## Key takeaway

When pixels must escape their ancestors, don't fight CSS with bigger numbers —
change where the pixels land. One `createPortal` into a top-level node gives
overlays a home no ancestor can clip, while React keeps treating them as the
child they logically are.
