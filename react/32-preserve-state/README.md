# React 32 — Preserving state

**Lesson: `cond && <X />` doesn't hide — it destroys. Component structure decides
state lifetime, so place precious state where the UI can't kill it.**

## Run it

Open `original.html`: type half a reply, click Details, come back — your reply
is gone. Refactor: it survives any amount of tab-hopping.

## What's wrong with the original?

`{tab === 'reply' && <ReplyTab />}` — the standard conditional render from
project 04 — **unmounts** ReplyTab when you leave the tab. Unmounting destroys
instance state; that's the same mechanism project 31 used *on purpose* with
`key`. Here it fires by accident, and what it destroys is the user's
half-written reply. The rule of thumb the original missed: **state lives
exactly as long as the component instance at that tree position** — so a UI
toggle was silently also a data-lifetime decision.

## What changed in the refactor

Two honest fixes, both demonstrated:

- **Fix A — lift the precious state** (used for the reply): `reply` moved to
  `App`, which never unmounts; `ReplyTab` became controlled
  (`value`/`onChange`, projects 07/36). Now tab switches *can't* touch the
  data — they don't own it. Choose this when the data matters beyond the tab
  (drafts, form progress, anything you'd hate to lose).
- **Fix B — hide with CSS** (`display: none`): pixels leave, the component
  stays mounted — state, scroll position, and focus all survive. Choose this
  for heavy subtrees you don't want re-created per switch (editors, maps,
  virtualized lists). Cost: hidden components still exist (memory, and their
  effects stay live), so don't CSS-hide dozens of heavy panes.
- And the third tool remains valid: **unmount on purpose** when throwing state
  away is the *desired* behavior — that's the `&&` (04) and `key` (31) side of
  the trilogy.

The three-way choice is the actual skill: for every toggle, ask *what should
happen to the state behind it?* Destroy (unmount), preserve cheaply (CSS), or
outlive the toggle entirely (lift).

## Key takeaway

In React, *where* a component sits and *whether* it's rendered are state-
lifetime decisions, not just visual ones. Before writing `cond && <X />`, ask
whether X holds anything the user would miss — and if so, either lift that
data above the condition or hide with CSS instead of unmounting.
