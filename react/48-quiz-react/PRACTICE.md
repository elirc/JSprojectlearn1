# 🏋️ Practice: Quiz

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking. (The reducer work can all be checked by reasoning, or run under Node once you extract it; only the pages themselves need the CDN, so save those for when you're online.)

All exercises modify `refactored/index.html` unless they say otherwise.

## Exercises

### ⭐ 1. Say it in words, not just colours (warm-up)

During feedback the correct choice turns green and a wrong pick turns red, which is invisible to anyone who can't distinguish them. Add a verdict line above the continue button: "Correct!" when the pick was right, otherwise "Not quite — the answer is X" with the correct choice's text. Rule: no new state and no new props — `QuestionCard` already receives everything it needs.

**Practices:** deriving a message from existing state instead of storing a "wasCorrect" flag.

**Hint:** the same comparison the reducer made, `lastPick === question.answerIndex`, is available here; `question.choices[question.answerIndex]` is the text.

**Expected:** answer question 1 correctly and you see the green button plus "Correct!"; answer question 2 wrongly and you see "Not quite — the answer is after the first render", with your pick in red. Nothing appears during the asking phase.

### ⭐⭐ 2. Predict: the reducer that "optimises" the copy away (core)

Someone decides the spread in `answered` is wasteful and rewrites the case:

```jsx
case 'answered': {
  if (state.phase !== 'asking') return state;
  state.lastPick = action.choiceIndex;
  state.phase = 'feedback';
  if (action.choiceIndex === QUESTIONS[state.index].answerIndex) state.score += 1;
  return state;
}
```

Without running anything, describe exactly what happens on screen when you click a correct answer, then what happens when you click a different answer afterwards. Then say what the values of `score` and `phase` actually are in memory at that point, and why those two answers disagree.

**Practices:** the `Object.is` bail-out — why a mutated state object means React sees "nothing changed" even when plenty changed.

**Hint:** `dispatch` sends an action, the reducer returns a value, and React compares that value to the current state. What does it compare, and what does it conclude when the reducer hands back the very same object?

**Expected:** your prediction says the screen does nothing at all — and explains the grimmer half, which is that the state really did change and the quiz is now permanently stuck. Name the line that makes it permanent.

### ⭐⭐ 3. A skip button (core)

Add a "skip" button next to the choices that advances to the next question without scoring and without a feedback stop. Implement it as a `'skipped'` action with the same shape of guard `answered` has — skipping is only legal while asking, so a skip dispatched during feedback must be a no-op. Notice that `skipped` and `continued` both need "advance the index and decide whether we're done"; factor that once rather than writing it twice.

**Practices:** extending a reducer without duplicating a rule; guards as the reducer's vocabulary for "not now".

**Hint:** a small `advance(state)` helper above the reducer, called from both cases. Reducers are ordinary functions — they may call helpers, and they may even call themselves, as long as they stay pure.

**Expected:** skipping question 1 goes straight to question 2 in the asking phase, the progress line reads "Question 2 of 4 · score 0", and no colours flash on the way. Skipping the last question lands on the results screen. Skipping four times gives a score of 0/4.

### ⭐⭐ 4. Put the rules under Node tests (core)

The README says the flow rules are "Node-testable if extracted" — extract them. Create `refactored/quiz-reducer.js` exporting `QUESTIONS`, `initialState`, and `quizReducer`, plus `refactored/quiz-reducer.test.js` using `node:test`, and run `node --test react/48-quiz-react/refactored/` from the repo root. Cover at least: a correct answer scoring once, the double-answer guard, continuing past the last question, restart, and your skip rule. Project 40 ships the same pair of files if you want the shape.

**Practices:** replaying a reducer over an action list — the fastest way to test a state machine, and the reason to keep rules out of components.

**Hint:** `const replay = (actions) => actions.reduce(quizReducer, initialState);` gives you a whole play-through in one line. For the guard, assert object *identity*: `assert.equal(afterTwo, afterOne)`.

**Expected:** `node --test` prints all-pass with no browser involved. The guard test is the interesting one — it asserts the reducer returns the same object, which is precisely the fact exercise 2's mutation destroyed.

### ⭐⭐⭐ 5. A review screen, and a score you no longer store (challenge)

At the end, list every question with what the player picked and what the answer was. Do it by recording each pick in a `picks` array in state (a skip records `null`), and then **delete `score` from state entirely** — derive it from `picks` instead. Watch what this does to the progress line during the quiz, and decide deliberately how you want it to read.

**Practices:** replacing a stored aggregate with a derived one, and noticing that the two are not quite the same value at every instant.

**Hint:** `picks.filter((pick, i) => pick === QUESTIONS[i].answerIndex).length`. Record the pick in `continued` (where you know the pick is final), not in `answered`; then ask yourself whether the current, still-being-answered question should count yet.

**Expected:** the results screen lists all four questions with "your pick vs the answer", skips shown as "skipped", and the score matches the list by construction. During the quiz the naive derivation lags by one question — the solution shows the one-line fix that includes the in-flight pick, so the progress line reads "score 1" the moment you get one right.

### ⭐⭐⭐ 6. Make the reducer stop knowing the questions (challenge)

`quizReducer` reaches out to the module-level `QUESTIONS` constant, which means it can only ever run one quiz — and your Node tests have to use the real four questions even when a two-question fixture would be clearer. Move the questions *into* the state so the reducer reads `state.questions`, and initialise with `useReducer(quizReducer, QUESTIONS, makeInitialState)`. Mind what `restarted` has to become.

**Practices:** dependency injection for a pure function — making content a parameter rather than an ambient fact.

**Hint:** `restarted` can no longer return a module-level `initialState` object, or restarting would wipe the questions. It needs to rebuild from `state.questions`.

**Expected:** the app behaves identically. In tests you can now replay a two-question fixture, and `assert.equal(state.questions, FIXTURE)` after a restart. As a bonus, LEARN.md's shuffle puzzle stops being awkward: a shuffled order is just a different array handed to `makeInitialState`.

## Solutions

### 1. Say it in words, not just colours

```jsx
{phase === 'feedback' && (
  <p>
    {lastPick === question.answerIndex
      ? 'Correct!'
      : `Not quite — the answer is ${question.choices[question.answerIndex]}`}
  </p>
)}
```

**Why:** the verdict is a fact about state you already hold, so storing a `wasCorrect` boolean would create a second copy of a truth that `lastPick` and the data already determine — project 09's rule, applied to a string instead of a number. It also can't drift: whatever `lastPick` is, the sentence and the colours are computed from the same comparison, so they can never contradict each other. And colour-plus-text is the accessibility default, not a nicety; the colours were always a redundant encoding of something the data could say out loud.

### 2. Predict: the reducer that "optimises" the copy away

**On screen: nothing happens.** No green, no red, no "Next question" button — the click appears to be ignored. Clicking a different answer afterwards also does nothing, forever. In memory, though, `state.score` really is `1` and `state.phase` really is `'feedback'`.

**Why:** `dispatch` schedules a render; during it React runs the reducer and compares the result to the current state with `Object.is`. The mutating version hands back *the same object*, so React concludes nothing changed and bails out — it may still call your component, but it discards the output and keeps the previously rendered screen. The permanence comes from the guard on the next line: `state.phase` was mutated to `'feedback'`, so every later `answered` hits `if (state.phase !== 'asking') return state` and is a genuine no-op, while `continued` is unreachable because the button that dispatches it was never rendered. This is the exact failure the React docs describe as "I dispatched an action but the screen doesn't update", and it's why "reducers must be pure" is a rule rather than a preference: the spread you deleted wasn't overhead, it was the signal.

### 3. A skip button

```jsx
function advance(state) {
  const nextIndex = state.index + 1;
  return {
    ...state,
    index: nextIndex,
    lastPick: null,
    phase: nextIndex < QUESTIONS.length ? 'asking' : 'done',
  };
}

// in the reducer:
case 'skipped':
  if (state.phase !== 'asking') return state;
  return advance(state);
case 'continued':
  return advance(state);
```

```jsx
// in QuestionCard, alongside the choices:
{phase === 'asking' && <button onClick={onSkip}>skip</button>}
// in App: onSkip={() => dispatch({ type: 'skipped' })}
```

**Why:** "advance the index, clear the pick, and decide whether that was the last question" is one rule with two triggers, so it lives in one helper — if the end-of-quiz boundary ever changes, there's one place to change it, which is exactly the fragility the original's `makeHandler(3)` chain had. The guard is what makes `skipped` safe rather than merely hidden: the button is only rendered while asking, but a keyboard shortcut, a stray double-fire, or next month's code path all get the same answer from the rulebook. Note that `skipped` never sets `phase: 'feedback'`, so a skip has no feedback stop at all — the phase machine reads the intent directly.

### 4. Put the rules under Node tests

`refactored/quiz-reducer.js` exports `QUESTIONS`, `initialState`, and `quizReducer` verbatim from the page. `refactored/quiz-reducer.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { QUESTIONS, initialState, quizReducer } from './quiz-reducer.js';

const replay = (actions) => actions.reduce(quizReducer, initialState);
const right = (i) => ({ type: 'answered', choiceIndex: QUESTIONS[i].answerIndex });
const wrong = (i) => ({ type: 'answered', choiceIndex: 1 - QUESTIONS[i].answerIndex });
const next = { type: 'continued' };

test('a correct answer scores once and moves to feedback', () => {
  const s = replay([right(0)]);
  assert.equal(s.score, 1);
  assert.equal(s.phase, 'feedback');
  assert.equal(s.lastPick, 0);
});

test('the guard makes a second answer a literal no-op', () => {
  const afterOne = replay([right(0)]);
  assert.equal(quizReducer(afterOne, right(0)), afterOne); // same object back
});

test('continuing past the last question ends the quiz', () => {
  const s = replay([right(0), next, right(1), next, wrong(2), next, right(3), next]);
  assert.equal(s.phase, 'done');
  assert.equal(s.score, 3);
});

test('skipping advances without scoring, and only from asking', () => {
  const skipped = replay([{ type: 'skipped' }]);
  assert.equal(skipped.index, 1);
  assert.equal(skipped.score, 0);
  assert.equal(skipped.phase, 'asking');
  const inFeedback = replay([right(0)]);
  assert.equal(quizReducer(inFeedback, { type: 'skipped' }), inFeedback);
});

test('restart returns the exact initial state', () => {
  assert.equal(replay([right(0), next, { type: 'restarted' }]), initialState);
});
```

**Why:** `actions.reduce(quizReducer, initialState)` is the whole test harness — a reducer is a fold over events, so replaying a play-through is a one-liner with no DOM, no clicks, and no waiting. The identity assertions (`assert.equal(afterTwo, afterOne)` and the restart one) test something stronger than equal contents: they test that the reducer returned the *same reference*, which is what React's bail-out depends on and what exercise 2's mutation quietly broke. Keep a copy of the reducer inline in `index.html` so the page still runs — a `file://` page can't import modules, and project 40 leaves the same note.

### 5. A review screen, and a score you no longer store

```jsx
const initialState = { index: 0, phase: 'asking', lastPick: null, picks: [] };

function advance(state, pick) {
  const nextIndex = state.index + 1;
  return {
    ...state, index: nextIndex, lastPick: null, picks: [...state.picks, pick],
    phase: nextIndex < QUESTIONS.length ? 'asking' : 'done',
  };
}
// 'answered' drops its score line and just records the pick + phase;
// 'skipped' -> advance(state, null); 'continued' -> advance(state, state.lastPick),
// now guarded by `if (state.phase !== 'feedback') return state;` — it has a pick
// to record, so it may only run from the phase where a pick exists.

// in App — derived, including the question being answered right now:
const settled = state.phase === 'feedback' ? [...state.picks, state.lastPick] : state.picks;
const score = settled.filter((pick, i) => pick === QUESTIONS[i].answerIndex).length;

// on the done screen:
<ul>
  {QUESTIONS.map((q, i) => {
    const pick = state.picks[i];
    const correct = pick === q.answerIndex;
    return (
      <li key={i} className={correct ? 'correct' : 'wrong'}>
        {q.prompt} — {pick === null ? 'skipped' : q.choices[pick]}
        {!correct && ` (answer: ${q.choices[q.answerIndex]})`}
      </li>
    );
  })}
</ul>
```

**Why:** `picks` is the raw history and the score is a fact about it, so once you keep the history the stored total becomes a cache — and a cache that can disagree with the list it summarises is a bug waiting for a rule change (imagine adding "un-answer this one"). Recording in `advance` rather than in `answered` means a pick is only written when it's final, and using `null` for a skip keeps `picks[i]` aligned with `QUESTIONS[i]`, which is what makes the review list a plain `map`. The `settled` line is the honest patch for the timing difference: a derived score is only as current as the array it reads, so if you want the in-flight feedback answer to count, you say so in one line — the sort of adjustment that's trivial with a derivation and a migration with a stored counter.

### 6. Make the reducer stop knowing the questions

```jsx
const makeInitialState = (questions) => ({
  questions, index: 0, phase: 'asking', lastPick: null, picks: [],
});

function quizReducer(state, action) {
  switch (action.type) {
    case 'answered': {
      if (state.phase !== 'asking') return state;
      return { ...state, phase: 'feedback', lastPick: action.choiceIndex };
    }
    case 'continued':
      if (state.phase !== 'feedback') return state;
      return advance(state, state.lastPick);
    case 'skipped':
      if (state.phase !== 'asking') return state;
      return advance(state, null);
    case 'restarted':
      return makeInitialState(state.questions);
    default:
      throw new Error(`Unknown action: ${action.type}`);
  }
}
// advance() now reads state.questions.length; App reads state.questions[state.index].
const [state, dispatch] = useReducer(quizReducer, QUESTIONS, makeInitialState);
```

**Why:** a reducer that closes over a module constant is pure in the technical sense but not in the useful sense — its behaviour depends on something the caller can't supply, which is why the tests were stuck with the real questions and why LEARN.md's shuffle puzzle felt cornered. Threading the array through state makes the content a parameter: the same rules now run a fixture, a shuffled order, or a quiz fetched from anywhere. `restarted` is the tell that you did it properly, since returning a shared `initialState` would now throw the questions away; rebuilding from `state.questions` keeps restart meaning "back to the beginning of *this* quiz". The three-argument `useReducer(reducer, arg, init)` form calls `makeInitialState(QUESTIONS)` once at mount instead of rebuilding that object on every render — the idiomatic way to pass a computed initial state.
