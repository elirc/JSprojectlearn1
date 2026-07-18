# React 35 — Compound components

**Lesson: when a widget has coordinated *parts*, expose the parts as components
sharing state through context — not a config object that re-invents JSX.**

## Run it

Open both files — same tabs. Then compare what the *caller* writes.

## What's wrong with the original?

`<Tabs tabs={configArray} />` — the widget-as-config-object. It starts
reasonable (`{label, content}`) and then grows a key per visual nuance: `icon`,
`badge`, `disabled`... Each key needs a matching rendering branch *inside*
Tabs, which is becoming a poor re-implementation of JSX — the caller writes a
data structure to *describe* markup they wish they could just *write*. Tooltip
on one tab? Spinner in a label? Divider between groups? New key, new branch,
every time. This is project 06's slot-prop explosion at the component-family
scale.

## What changed in the refactor

- **The compound-component pattern**: `Tabs` + `TabList` + `Tab` + `TabPanel` —
  separate components the caller arranges as ordinary JSX (same architecture
  as HTML's `<select>`/`<option>`). Labels are `children`, so icons/badges/
  anything need **zero** config keys — you just write them.
- **Context is the family's secret channel**: `Tabs` owns `activeTab` and
  provides it; `Tab` and `TabPanel` consume it. The pieces coordinate — click
  a Tab, the right TabPanel appears — *without the caller wiring anything*.
  This is context used for **component-internal plumbing** (private, scoped to
  the family), a different job than project 34's app-wide ambient values.
- **Layout freedom falls out**: because the pieces are just children, the
  caller can wrap `TabList` in a header bar or interleave other markup —
  `Tabs` doesn't care where its children sit, only that they can reach its
  context.
- The `id` links a Tab to its Panel — explicit correlation beats positional
  index-matching (which breaks the moment someone reorders or wraps things).
- When is config-style right? When the items are *data* to begin with (tabs
  driven by a server response) — then map the data *to the compound pieces*:
  `{tabs.map(t => <Tab id={t.id}>{t.label}</Tab>)}`. The pattern composes with
  data instead of replacing it.

## Key takeaway

If a component's props are growing keys that describe markup, stop configuring
and hand out *pieces*: child components that share the parent's state via
context. The caller gets JSX's full power back, and your component keeps
ownership of the coordination — the only part that was ever its business.
