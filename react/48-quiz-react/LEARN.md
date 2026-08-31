# 📘 Learning Guide: Quiz (React)

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A multiple-choice quiz about React itself. You see a question ("What
does useState return?") with two answer buttons. Click one and — in
the refactored version — the right answer turns green, a wrong pick
turns red, and a "Next question" button appears. At the end: your
score and a "play again" button.

The original has three questions, no feedback colors, no restart —
you click an answer and it instantly jumps to the next question, and
at the end you're stuck at the score screen forever. The refactor has
four questions, colored feedback, disabled buttons during feedback,
and restart — and, as we'll see, the fourth question cost five lines.

## 2. Concepts you need first

### Content vs mechanism (the data-driven idea)

There are two things in any quiz: the **content** (the questions —
words, choices, correct answers) and the **mechanism** (asking,
scoring, advancing, finishing). The core architecture lesson:

- Content belongs in **data** — a plain array of objects.
- Mechanism belongs in **code** that works for ANY such data.

```js
const QUESTIONS = [
  { prompt: '2+2?', choices: ['3', '4'], answerIndex: 1 },
  { prompt: 'Sky color?', choices: ['blue', 'plaid'], answerIndex: 0 },
];
// ONE renderer handles both — and any future question:
const q = QUESTIONS[index];
```

When content is trapped inside components (one component per
question), every new question means new code. When content is data,
a new question is a new array entry.

### Phases (a tiny state machine)

The quiz is always in exactly one **phase**:

```
asking → feedback → asking → ... → done → (restart) → asking
```

`asking`: buttons are live, waiting for a pick. `feedback`: the pick
is judged, colors show, buttons are frozen, "Next" is visible.
`done`: the score screen. One `phase` string in state answers every
"what should be on screen right now?" question. (Project 16 teaches
phase machines; project 44 used one for submissions.)

### Reducers and dispatch (quick recap)

A **reducer** is a pure function `(state, action) => newState` — the
rulebook for how state may change; `dispatch(action)` sends events to
it and React re-renders with the result. Project 13's LEARN.md covers
it fully. The quiz's whole flow — answering, continuing, restarting —
becomes three reducer cases.

### Guards inside the reducer (rules, not UI flags)

A **guard** is a rule-level protection: the reducer *refuses* an
action that doesn't make sense in the current phase.

```js
case 'answered': {
  if (state.phase !== 'asking') return state; // ignore: not asking
  ...
```

Compare the alternative — scattering `if (alreadyAnswered) return;`
checks in click handlers. In the reducer, the rule holds no matter
which button, keyboard shortcut, or future code path sends the
action. Returning the unchanged `state` means "this action is a
no-op here."

### Render props... no — just callback props

The generic `QuestionCard` doesn't decide what happens on a click; it
*reports* it upward through **callback props** — functions passed in
as props (`onAnswer`, `onContinue`). The parent connects those to
`dispatch`. The card stays reusable and dumb; the rules stay in one
place.

```jsx
<QuestionCard onAnswer={(i) => dispatch({ type: 'answered', choiceIndex: i })} />
```

### The framework's real job (the meta-lesson)

This project exists as a comparison: the JS track's project 47 built
the same quiz in vanilla JavaScript, where after every state change
you had to call your own `render()` function by hand. React *is* that
render-after-state-change loop, automated: `dispatch` → reducer →
re-render, no manual calls. Notice what React did NOT do: it didn't
turn hardcoded questions into data. Architecture transfers between
frameworks; syntax doesn't fix architecture.

### Small things you'll meet

- `state.score + (correct ? 1 : 0)` — add 1 only when correct.
- `{ ...state, phase: 'feedback' }` — copy state, changing some
  fields (immutable update).
- Conditional rendering: `{phase === 'feedback' && <button .../>}` —
  render the button only in that phase.
- `disabled={phase === 'feedback'}` — freeze buttons during feedback.

## 3. Walking through the original code

Three question components, each a hardcoded island:

```js
function Question1({ onAnswer }) {
  return (
    <div>
      <p>1. What does useState return?</p>
      <button onClick={() => onAnswer(true)}>a [value, setter] pair</button>
      <button onClick={() => onAnswer(false)}>the current props</button>
    </div>
  );
}
```

Look closely at the buttons: the correct one calls `onAnswer(true)`,
the wrong one `onAnswer(false)`. **The answer key is written directly
in the markup** — anyone who opens view-source can read which button
says `true`. (The JS track calls this the view-source cheat.)

The flow lives in `App`:

```js
const [screen, setScreen] = useState(1); // 1, 2, 3, 'done'
const [score, setScore] = useState(0);

function makeHandler(nextScreen) {
  return (correct) => {
    if (correct) setScore((s) => s + 1);
    setScreen(nextScreen);
  };
}
```

`makeHandler(2)` builds "score it, then go to screen 2". The render is
a hardwired chain:

```js
{screen === 1 && <Question1 onAnswer={makeHandler(2)} />}
{screen === 2 && <Question2 onAnswer={makeHandler(3)} />}
{screen === 3 && <Question3 onAnswer={makeHandler('done')} />}
{screen === 'done' && <p>Done! Score: {score}/3</p>}
```

Each line knows the *number* of the next screen. That numbering is
load-bearing — and fragile.

## 4. What's wrong with it (in beginner terms)

**Adding question 4 is surgery.** You'd write a whole new
`Question4` component (copy-pasting the shape of the other three),
then change `makeHandler('done')` on Question3 to `makeHandler(4)`,
then add a new line to the chain. Three files' worth of edits for one
question — and if you forget the renumbering, question 3 jumps
straight to "done" and question 4 is unreachable. Content growth
should never require code surgery.

**The view-source cheat.** The correct answer is literally readable
in the page source (`onAnswer(true)`). In the refactor the data still
ships to the browser, but at least it's one honest data structure,
not truth values decorating buttons.

**No feedback.** Click an answer and the next question appears
instantly. Were you right? No idea until the end. Adding a feedback
screen to this structure means changing *every* question component —
they'd each need their own "was I right" display, because there's no
shared place where "the current question + what you picked" exists.

**No restart.** The 'done' screen is a dead end. Restart = resetting
state, but the state here (`screen`, `score`) is scattered and the
chain has no entry point concept.

**The deeper point:** this is the JS track's flawed quiz with JSX
syntax on top. Learning React changed the file extension of the
mistake. Same sins, new costume — frameworks compile bad architecture
just as happily as good.

## 5. Try it yourself first!

1. **Vague:** three components that differ only in their words...
   what should they become?
2. **Warmer:** a `QUESTIONS` array — each entry `{ prompt, choices,
   answerIndex }` — and ONE `QuestionCard` component that renders
   `QUESTIONS[index]`. The chain becomes `index + 1`.
3. **Warmer still:** give the quiz phases: `asking`, `feedback`,
   `done`. On answer: judge it, show colors, freeze buttons. On
   continue: next index, or `done` past the end.
4. **Put the rules in a reducer:** actions `answered`, `continued`,
   `restarted`. Make `answered` a no-op unless the phase is
   `asking` — that's your double-click protection, as a rule.
5. **The acid test:** when you're done, add a fourth question. If it
   costs more than a handful of data lines, the mechanism still knows
   too much about the content.

## 6. Understanding the refactored solution

**Content — pure data, four entries:**

```js
{
  prompt: 'What does useState return?',
  choices: ['a [value, setter] pair', 'the current props'],
  answerIndex: 0,
},
```

Everything the original hardcoded into `Question1` is now one object.
The fourth question ("Derived values belong in...") is five lines of
data — the README's proof of the architecture.

**Flow — `quizReducer`, three rules:**

```js
case 'answered': {
  if (state.phase !== 'asking') return state;
  const correct = action.choiceIndex === QUESTIONS[state.index].answerIndex;
  return {
    ...state,
    phase: 'feedback',
    lastPick: action.choiceIndex,
    score: state.score + (correct ? 1 : 0),
  };
}
```

The guard makes double-answering *impossible by rule* — even if the
disabled attribute were removed, a second `answered` in feedback
phase returns state unchanged. Judging compares the picked index to
the data's `answerIndex`. `lastPick` is remembered so the view can
color the wrong pick red.

```js
case 'continued': {
  const nextIndex = state.index + 1;
  return { ...state, index: nextIndex, lastPick: null,
           phase: nextIndex < QUESTIONS.length ? 'asking' : 'done' };
}
```

Advancing is arithmetic, not renumbered wiring — and the same rule
decides when the quiz is over. `restarted` just returns
`initialState`: restart *is* state reset, one line.

**View — one `QuestionCard` renders any question:**

```js
let className = '';
if (phase === 'feedback') {
  if (i === question.answerIndex) className = 'correct';
  else if (i === lastPick) className = 'wrong';
}
```

During feedback, the correct choice goes green and your wrong pick
(if any) goes red — derived from `phase`, `lastPick`, and the data.
Buttons are `disabled` in feedback (the UI half of the protection;
the reducer guard is the rule half). The continue button's label
derives from position: "See results" on the last question, otherwise
"Next question".

**App — a thin dispatcher.** `done` renders the score screen with
"play again"; otherwise it renders the progress line
(`Question 2 of 4 · score 1`) and one `QuestionCard`, wiring its
callbacks to `dispatch`.

**Side-by-side with js#47's refactor** (worth actually doing if you
have the JS track): same `QUESTIONS` shape, same phases, same generic
renderer, same restart-as-reset. What changed is only plumbing — the
manual `render()` calls vanished because React re-renders on
dispatch. The architecture ported verbatim; that's the transfer the
README is proving.

## 7. Words you learned (glossary)

- **Content vs mechanism:** the words/questions vs the code that
  runs them; data vs logic.
- **Data-driven:** behavior determined by data structures, so new
  content needs no new code.
- **Phase / state machine:** modeling flow as named states
  (asking → feedback → done) with allowed transitions.
- **Reducer:** pure function `(state, action) => newState` holding
  the rules.
- **Action:** object describing an event
  (`{ type: 'answered', choiceIndex: 1 }`).
- **dispatch:** sends an action to the reducer; React re-renders
  with the result.
- **Guard:** a reducer rule refusing actions that don't fit the
  current phase (returning state unchanged).
- **No-op:** an action that results in no change.
- **Callback prop:** a function passed as a prop so a child can
  report events upward (`onAnswer`).
- **Generic component:** one component that renders any instance of
  a data shape (`QuestionCard`).
- **Hardcoding:** writing content directly into code.
- **View-source cheat:** answers readable in the page source because
  they're encoded in the markup.
- **Immutable update:** `{ ...state, field: newValue }` — new object,
  old one untouched.
- **Conditional rendering:** `{condition && <Thing />}` — render only
  when true.
- **initialState:** the starting state object; restart = returning
  to it.

## 8. Experiments to try on the plane (no internet needed)

You can edit and reason offline; the pages load React from a CDN
(shared library servers), so actually running them needs internet on
first load.

1. **Add a fifth question to the refactor.** Five data lines, nothing
   else. Expected: it appears in rotation, the progress line says
   "of 5", scoring and feedback work. Then add a fourth question to
   the *original* and count every edit you had to make. That
   difference is the lesson, measured.
2. **Test the guard.** In `QuestionCard`, delete
   `disabled={phase === 'feedback'}` and click an answer twice fast.
   Expected: the second click does nothing — the reducer guard
   swallows it, score can't double-count. Now also remove the guard
   line in the reducer: the second click scores again. Rules beat
   flags.
3. **Add a three-choice question.** Give one data entry a third
   choice. Expected: `QuestionCard` renders three buttons with zero
   component changes — `choices.map` never assumed two.
4. **Shuffle the questions on restart.** Change `restarted` to also
   reorder... wait — `QUESTIONS` is a module constant. Think it
   through: where would a shuffled order live so the reducer stays
   pure? (One answer: put a `order` array of indexes *in the state*,
   initialized shuffled, and read `QUESTIONS[state.order[state.index]]`.)
   Sketch it on paper before coding.
5. **Break the phase machine visibly.** In `continued`, change the
   condition to `nextIndex <= QUESTIONS.length`. Expected: after the
   last question you get one ghost round — `QUESTIONS[4]` is
   undefined and the card crashes trying to read `.prompt`. The
   boundary rule was doing quiet, essential work.
