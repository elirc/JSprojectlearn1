# React 04 — Conditional rendering

**Lesson: early returns beat ternary towers, and the `&&` gotcha that puts a stray
`0` on your page.**

## Run it

Open `original.html`, click **load 0**, and find the bare `0` rendered at the
bottom of the page. Then read the five-way ternary above it and try to say, cold,
what renders when.

## What's wrong with the original?

1. **The ternary tower.** Five outcomes chained as
   `a ? x : b ? y : c ? z : ...` inside JSX. Each additional case nests one deeper;
   reading it requires mentally balancing every `?` against its `:`. This is the
   JSX-flavored version of js#04's if-chain — expressions can't use early returns,
   so complex branching *inside* JSX has no good shape.
2. **The `&&` gotcha, live**: `{messages.length && <Badge/>}` renders a literal
   `0` when the list is empty, because `0 && x` evaluates to `0`, and React renders
   numbers (it skips `false`, `null`, and `undefined` — but not `0` or `NaN`).
   Every React developer ships this bug once; the demo makes it yours cheaply.

## What changed in the refactor

- **The branching became a component, so it can use statements.**
  `MessageList` is a ladder of guard clauses — `if (isLoading) return <p>…`;
  reading order = priority order, exactly like js#08's guard-then-work. When a JSX
  conditional grows past one `?:`, extract a component and let `if`/`return` do
  the work.
- **`return null` is how a component renders nothing** — `UnreadBadge` owns its
  own "should I even appear?" logic, so the parent doesn't need a guard at the
  call site.
- **`count === 0` (a boolean), never a bare count, on the left of `&&`.** The
  refactor sidesteps it with the early return; when you do use `&&` inline, write
  `count > 0 && ...`.
- Honest breadcrumb: the three parallel flags (`isLoading`/`error`/`messages`)
  still allow nonsense combinations — project 20 collapses them into one `status`
  (js#40's lesson).

## Key takeaway

JSX is expressions-only, so don't force statement-shaped logic into it. One
condition → `? :` or `&&` (with a real boolean). More than one → extract a
component and use early returns. And `return null` is a first-class answer to
"what should I render?".
