# React 06 — Children & composition

**Lesson: components that accept JSX beat components that describe it — pass
content through `children` and slot props, not through ever-more config.**

## Run it

Open both files. Same panels — then read the third panel in the refactor (two
footer buttons), which the original *cannot express*.

## What's wrong with the original?

`Panel` grew a prop per content need: `titleIcon`, `boldFirstWord` (a prop that
does string surgery to bold one word!), `footerText` + `footerLinkText` +
`footerLinkHref` + `showFooter`. Each request added a prop *and* a branch inside
Panel, because Panel insists on **describing** every possible content shape
instead of accepting content. It's become a remote control for markup it refuses
to let you write — and the next request ("two buttons in the footer") means three
more props. This is a component API failing the same way js#11's
boolean-parameter function failed: configuration multiplying where composition
was wanted.

## What changed in the refactor

- **Panel owns structure; callers own content.** Body content flows through
  **`children`** — the prop JSX fills automatically from what you nest inside the
  tag. `title` and `footer` are **slot props**: same idea for the named regions,
  each accepting *any JSX* (`title={<span>⚠️ Warning</span>}`).
- **Every version-2-through-5 prop vanished.** Bold word? Write `<strong>`. Icon?
  Type the emoji. Footer link? Write an `<a>`. The component went from 8 props +
  internal branching to 3 props + zero branching, while becoming *more* capable —
  that trade is the signature of composition done right.
- **`footer != null` decides the footer bar** — presence of content replaces the
  `showFooter` boolean; you can't have a footer bar with no footer or vice versa.
- The rule of thumb for what stays a prop: things the component *behaves
  differently because of* (variant, size — project 05) are props; things it
  merely *displays* are children/slots.

## Key takeaway

When a component's props start naming pieces of markup (`xText`, `xIcon`,
`xLinkHref`, `showX`), it's trying to be a template language. Stop configuring
and start composing: take `children` for the main content and slot props for
named regions. Structure is the component's job; content is the caller's.
