# 79 — Virtual list (10,000 rows)

**Lesson: DOM elements are the expensive part of a web page. Render what fits on
the screen and fake the rest with two empty divs — the cost stops depending on how
much data exists.**

## Run it

```
node --test 79-virtual-list/
```

Then open `original.html` and `refactored/index.html` and watch the green stats
box in each: how long the first paint took, and how many rows are actually in the
DOM. Scroll both. Sort both. The refactor also has a button that swaps in a
million rows — press it and read the box again.

## What's wrong with the original?

It builds one `<div>` per item, up front, for all 10,000 items — the obvious
approach, and the one every list starts as.

1. **9,988 of those rows are off-screen**, but the browser pays for them anyway:
   memory, a slot in the layout tree, and time in every layout and paint.
   The viewport fits about thirteen.
2. **10,000 event listeners**, one per row, each holding a closure over its item.
3. **Every data change rebuilds everything.** Click "Sort by amount" and the page
   freezes — sorting 10,000 numbers takes a millisecond; rebuilding 10,000
   elements is what you feel.
4. **The cost is proportional to what EXISTS, not to what's SEEN.** That's the real
   diagnosis. There's no bug to find: the same code that's sluggish at 10,000 rows
   locks the tab at 100,000 and crashes at a million. Only the number changed.

## What changed in the refactor

- **`computeWindow(scrollTop, rowHeight, viewportHeight, total, overscan)`** — a
  pure function that answers "which rows should exist right now, and how much empty
  space stands in for the rest?" It's arithmetic on five numbers, so all thirteen
  tests run in Node with no browser.
- **Two spacer divs impersonate the missing rows**, sized so that
  `topSpacer + renderedRows + bottomSpacer` is exactly the full list height. The
  scrollbar can't tell the difference — that identity is the test the whole
  technique rests on.
- **`overscan` rows above and below** are rendered but off-screen, so a fast flick
  shows content instead of a white flash.
- **Over-scroll is clamped inside the function.** Trackpad rubber-banding and a
  restored scroll position both hand you numbers outside the real range;
  the tests pin down that `scrollTop: -250` and `scrollTop: 999_999` behave like
  the two ends of the list (project 73's practice exercise, promoted to the design).
- **One listener for the whole list** instead of one per row (event delegation) —
  it works for rows that don't exist yet, which is most of them.
- **At most one render per animation frame** while scrolling, and a stats box that
  makes the DOM count impossible to ignore.

## Key takeaway

When a page gets slow as data grows, don't reach for a faster loop — change what
the loop is *proportional to*. "Render only the visible window" is the same move as
pagination, lazy loading, and `LIMIT 20` in SQL: the user has one screen, so do one
screen's worth of work. Every smooth list you've scrolled — a chat app, a log
viewer, VS Code's file tree — is `computeWindow` under a different name.
