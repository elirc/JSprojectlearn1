# React 48 — Quiz

**Lesson: js#47 rebuilt in React — and a side-by-side proof that architecture
lessons transfer while syntax lessons don't.**

## Run it

Open both files. Then open `../../47-quiz-app/` from the JS track and compare
all four versions.

## What's wrong with the original?

It's js#47's original *wearing JSX*: one component per question
(`Question1`, `Question2`, `Question3`), each hardcoding its text, buttons,
and — readable in the source — which answer is correct (the view-source cheat,
again). The flow lives in `makeHandler(2)`, `makeHandler(3)` — a numbered
chain, so adding a question means a new component *plus* renumbering. No
feedback, no restart, no shuffle; all structurally awkward.

The demonstration matters more than the bug: **learning React didn't fix the
architecture.** Content-trapped-in-code compiles identically in every syntax.

## What changed in the refactor

Line it up against js#47's refactor — the interesting part is what's the same
and what React replaced:

- **Same**: `QUESTIONS` as a data array (content/mechanism split); phases
  (`asking | feedback | done`); one generic question renderer; restart as
  state reset. The architecture ported verbatim — that's the transfer.
- **React replaced the plumbing**: js#47 called `render()` by hand after every
  mutation; here, `dispatch` triggers re-render automatically — React *is*
  the render-after-state-change loop you hand-rolled in the JS track, which
  is the deepest way to understand what the framework does for you.
- **The flow rules moved into `quizReducer`** (react#13): answered /
  continued / restarted are pure transitions, guarded (`answered` in
  feedback phase is a no-op — the double-click protection is a *rule*, not a
  UI flag), and Node-testable if extracted.
- **The fourth question cost five data lines.** Feedback coloring and
  restart came from the phase machine and one generic `QuestionCard` — no
  new components, ever, for new content.

## Key takeaway

Frameworks amplify your architecture; they don't supply one. If content lives
in data, flow in a reducer, and view in generic components, React makes it
smoother than vanilla — and if each screen is hardcoded, React gives you the
same mess with better syntax highlighting. Port the *shape*, not just the
code.
