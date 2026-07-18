# 47 — Quiz app

**Lesson: content as data, flow as state — the data-driven UI pattern that every
list-of-things app is made of.**

## Run it

Open `original.html` and `refactored/index.html` in a browser.

## What's wrong with the original?

1. **Each question is code.** `showQuestion1`/`answer1`, `showQuestion2`/`answer2`...
   pasted blobs where content (the question text), flow (which question is next),
   and rendering (innerHTML strings) are one tangled thing. Adding question 4 means
   writing two functions *and editing question 3* to point at them — the flow is
   hardcoded as a call chain. Shuffling questions? Structurally impossible.
2. **The DOM is the state again** (project 14's sin): `score` is a global, progress
   exists only as "which blob is currently showing."
3. **The answers leak.** `onclick="answer2(true)"` — open devtools, read which
   button says `true`, ace the quiz. Data that shouldn't be user-visible is baked
   into the markup.
4. innerHTML-by-concatenation would also break (or worse) the moment a question
   contains `<`, `'`, or `"` — project 35's escaping lesson, dodged only by luck.

## What changed in the refactor

- **`QUESTIONS` is an array of objects** — prompt, choices, answerIndex. Adding a
  question is adding data (there are now four — the fourth cost three lines).
  Shuffling is shuffling an array. A geography quiz is a different array. This is
  the **content/mechanism split**: the quiz *engine* doesn't know what it's asking.
- **Flow is `index` + `phase`**, not a call chain. The three phases
  (`asking | feedback | done`) come from project 15's state machine, and buying
  them bought a real feature the original didn't have: **per-answer feedback**
  (disabled buttons, green/red marking) before moving on.
- **One `render()` handles every phase** from state — project 14's loop closing
  over the whole app. "Play again" is `state = newQuiz(); render()` — restart cost
  two lines *because* the state was one object.
- **`createElement` + `textContent`**, never string-built HTML — question text can
  contain anything (project 35). And the correct answer lives in JS data, not in
  an HTML attribute for cheaters to read.

## Key takeaway

Most UIs are "a list of things, shown one way or another" — quizzes, feeds,
carousels, wizards, surveys. Model the *things* as an array of data and the
*position/mode* as small state, and the UI becomes one render function anyone can
extend by editing data. If adding item N requires writing functions and editing
item N−1, the content is trapped in the code.
