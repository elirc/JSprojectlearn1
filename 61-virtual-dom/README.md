# 61 — Virtual DOM renderer

**Lesson: describe UI as cheap objects, diff descriptions, edit the real DOM
minimally — the single most illuminating frontend project there is.**

## Run it

```
node --test 61-virtual-dom/
```

Then open both HTML files and type in the "new todo" input.
In the original, watch your focus die per keystroke; in the refactor it
survives, because the input node is never rebuilt.

## What's wrong with the original?

The original is projects 14–18's honest technique — `render()` rebuilds all
the HTML from state — pushed to its ceiling:

1. **The focus killer.** The input is destroyed and recreated on every
   render; focus, cursor, selection die with it. Hence the "patch-up
   parade": hand-restoring focus and cursor position after every render,
   each line a former bug report.
2. **Nuke-and-pave is O(everything).** Toggling one todo re-parses and
   rebuilds every node; layout, listeners, scroll position all discarded
   and rebuilt.
3. **String concatenation UI**: item text goes straight into markup
   (project 35's XSS hole — try adding `<img src=x onerror=alert(1)>` as
   a todo), and handlers must be *global functions named inside strings*.

## What changed in the refactor

- **`h()` builds vnodes** — plain objects, cheap to create and throw away.
  Strings become text nodes (XSS-safe by construction); `false`/`null`
  children drop out, so `cond && h(...)` is conditional rendering.
- **`patch(parent, oldVNode, newVNode)` is the whole idea**: same position
  compared — different tag replaces wholesale, same tag updates props in
  place and recurses into children (append extras, remove leftovers *from
  the end backwards* — removing forwards shifts indexes mid-loop).
  The test proves the input is *the same object* across a text-change
  render: that identity is why focus survives.
- **`createRenderer(doc)` takes the document as a dependency.** The tests
  run the full diff against a 50-line fake DOM in Node — and that same
  seam is how React Native exists: swap the "document", keep the diffing.
- **Real-DOM gotchas encoded**: `value`/`checked` set as *properties*
  (attributes only set form-field defaults), events as `on*` properties.
- **The honest limit, as a test**: position-diffing a middle-removal
  produces correct output but *rewrites every trailing sibling* (the old
  "c" node is dropped, "b" is edited into "c"). Wasted work, and any DOM
  state on those rows migrates to the wrong row. This is precisely the
  problem React's `key` solves — keyed diffing is the natural next
  exercise, and react/50's MiniReact picks up this thread.

## Key takeaway

The virtual DOM is not about speed for speed's sake — it's about keeping
"UI = f(state)" (project 14) affordable and non-destructive. You write the
nuke-and-pave mental model; the diff quietly turns it into minimal edits,
preserving everything you didn't mention. Once you've written `patch`,
React's rules — why keys, why controlled inputs, why immutable updates —
stop being folklore and become obvious consequences.
