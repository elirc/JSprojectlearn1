# React 01 — Component extraction

**Lesson: components are functions from props to UI — extract them the way you
extract functions, and keep content as data.**

## Run it

Open `original.html` and `refactored/index.html` in a browser (internet needed —
React loads from a CDN).

> **About this setup:** these files use React + Babel from a CDN so you can
> double-click them. Real projects use a bundler (`npm create vite@latest`), which
> does what Babel-standalone does here — translate JSX to JS — at build time
> instead of in your browser tab. Everything you learn in this track transfers
> unchanged.

## What's wrong with the original?

One `App` renders the whole page, with each team member's card **pasted** — and the
paste has already drifted: member 3's avatar has `borderRadius: 12` while the others
have 24 (find the comment). That's the copy-paste tax from js#03, now in JSX. The
filter logic is also pasted per member, so "filter by name *or bio*" means three
edits. And adding a member means copying 15 lines of markup instead of adding a
data row.

## What changed in the refactor

- **`TEAM` is an array of objects** — content as data (js#47's lesson is the same
  move). Adding a member is one row; the UI can't drift per-member because there is
  no per-member markup.
- **`Avatar` and `MemberCard` are components** — plain functions taking `props` and
  returning JSX. The avatar's styling now exists in exactly one place. The test for
  "should this be a component?" is the same as for functions: *would I otherwise
  paste this?* and *does it have a name I'd naturally say?* ("the member card").
- **`App` reads like a table of contents**: a heading, a filter input, a mapped
  list. Ten seconds to understand, because each concept has a name.
- Note `visibleMembers` is **derived during render** — filter state in, filtered
  list out, no stored copy. Project 09 makes this a headline lesson.

## Key takeaway

JSX makes UI into values, and components make UI into *functions* — so every code
habit from the JS track applies verbatim: don't paste, extract and name, keep
content in data. If a chunk of JSX would need a comment to say what it is, it wants
to be a component with that comment's text as its name.
