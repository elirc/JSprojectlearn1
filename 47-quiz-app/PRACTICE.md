# 🏋️ Practice: Quiz App

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. Check the content, not the code (warm-up)

Once questions are data, a typo in the data breaks the app — and `answerIndex: 3` on a two-choice question means nobody can ever get it right. Write `validateQuestions(questions)`, a pure function returning an array of human-readable problems (empty when all is well), catching: a missing or blank `prompt`, fewer than 2 choices, an `answerIndex` that isn't a valid index, and a duplicate prompt. Check offline in node: the real `QUESTIONS` array returns `[]`; `{ prompt:'x', choices:['a','b'], answerIndex: 2 }` reports `answerIndex 2 is not a valid choice (0..1)`; a single-choice question and a blank prompt each report their own message; two questions with the same prompt report a duplicate on index 1.

What it practices: validating *content* the same way you'd validate user input — because content is now data, and data can be wrong.

Hint: collect problems into an array rather than throwing on the first one; a content author wants the whole list at once. Use `Number.isInteger(q.answerIndex)` so `undefined` is caught too.

### ⭐⭐ 2. A review screen (core)

At the end, show more than a score: list every question with the choice the player picked and the correct one, marked right or wrong. This needs the state to *remember* answers — add `answers: []` to `newQuiz()` and push `{ index, pick, correct }` in `pickAnswer`. Check in the browser: play all four questions getting exactly two right, and the done screen shows `Score: 2/4` plus four review lines whose marks match what you clicked; "Play again" clears the review completely.

What it practices: extending state to support a new view, and rendering a second phase from the same single `render`.

Hint: keep the review purely in `render` under `state.phase === 'done'`. Use `addText` for every line — question text may contain `<`, and `textContent` is what keeps that safe.

### ⭐⭐ 3. Answer with the keyboard (core)

Add a `keydown` listener: digits `1`–`9` pick the matching choice, and Enter advances (Next/Finish, or Play again on the done screen). Both must respect the phase — pressing `2` during feedback must do nothing, exactly as clicking a disabled button does. Check in the browser: press `9` on a two-choice question (nothing happens), press `1` (the answer is picked and feedback appears), press `2` (still nothing — the question is over), press Enter (next question).

What it practices: giving a second input channel the *same* guards as the first, instead of a parallel set of rules.

Hint: convert with `Number(event.key) - 1` and bail out when it isn't in range. Call `pickAnswer(i)` and `nextQuestion()` — the phase checks already inside them are the guards, so don't duplicate them.

### ⭐⭐ 4. Explanations (core)

Add an optional `explanation` field to questions and show it during feedback, under the Correct/Not quite line. Questions without one must render exactly as before — no empty paragraph, no `undefined` on screen. Give at least two of the four questions a real explanation. Check in the browser: answering question 2 shows the explanation; answering a question without one shows nothing extra, and the DOM contains no empty `<p>`.

What it practices: an optional field done properly — the difference between "no value" and "an empty value" on screen.

Hint: `if (question.explanation) addText(root, 'p', question.explanation);` — the guard is the whole feature, and it's why the field can be added to some questions and not others.

### ⭐⭐⭐ 5. Shuffle the choices without breaking scoring (challenge)

Shuffling the *choices* is harder than shuffling questions: `answerIndex` points at a position, and moving the choices invalidates it. Write `shuffleChoices(question, random = Math.random)` returning a new question with reordered choices and a corrected `answerIndex`, using Fisher–Yates (project 11) on an array of indices. Check offline in node: with `random: () => 0` and choices `['A','B','C','D']` (answer `A`), you get `['B','C','D','A']` with `answerIndex: 3` — and `choices[answerIndex]` is still `'A'`. Then assert the *property* over 500 random shuffles: the correct text is always preserved and the choice multiset is unchanged. Also confirm the input question object is not mutated.

What it practices: shuffling data while preserving a relationship inside it — and testing that relationship as a property rather than a fixed output.

Hint: shuffle `[0, 1, 2, ...]` rather than the choices themselves. Then `choices: order.map(i => question.choices[i])` and `answerIndex: order.indexOf(question.answerIndex)` — the new position of the old answer.

### ⭐⭐⭐ 6. Extract a pure reducer (challenge)

The three actions each mutate `state` and call `render()`, so none of the quiz logic can be tested outside a browser. Replace them with one pure function `reduce(state, action, questions)` returning the next state, where actions are `{ type: 'pick', choiceIndex }`, `{ type: 'next' }` and `{ type: 'restart' }`. Unknown action types must throw. Wiring becomes `state = reduce(state, action, QUESTIONS); render();`. Check offline in node: picking the right answer gives `score: 1`, `phase: 'feedback'`; a second `pick` while in feedback returns the *identical object* (no change); playing all four wrong gives `phase: 'done'`, `score: 0`; playing all four right gives `score: 4`; `restart` equals a fresh quiz; `{ type: 'teleport' }` throws.

What it practices: the reducer pattern — all state changes in one pure, exhaustively testable function, with the DOM pushed to the very edge.

Hint: `switch (action.type)` with a `return` in every branch and a `default` that throws. Return `state` itself (not a copy) for ignored actions, so `assert.equal(next, state)` documents "nothing happened".

## Solutions

### 1. validateQuestions

```js
function validateQuestions(questions) {
  const problems = [];
  const seen = new Set();

  questions.forEach((q, i) => {
    if (typeof q.prompt !== 'string' || q.prompt.trim() === '') {
      problems.push(`Question ${i}: prompt is missing`);
    } else if (seen.has(q.prompt)) {
      problems.push(`Question ${i}: duplicate prompt "${q.prompt}"`);
    } else {
      seen.add(q.prompt);
    }

    if (!Array.isArray(q.choices) || q.choices.length < 2) {
      problems.push(`Question ${i}: needs at least 2 choices`);
    } else if (!Number.isInteger(q.answerIndex) || q.answerIndex < 0 || q.answerIndex >= q.choices.length) {
      problems.push(
        `Question ${i}: answerIndex ${q.answerIndex} is not a valid choice (0..${q.choices.length - 1})`,
      );
    }
  });

  return problems;
}

// during development:  console.warn(validateQuestions(QUESTIONS).join('\n'));
```

WHY: turning content into data moves the failure mode — you can no longer get a syntax error from a bad question, only a quiz nobody can pass. Returning a *list* rather than throwing on the first problem matches who uses this: a content author wants every mistake in one pass, not a game of whack-a-mole. Checking `answerIndex` only when `choices` is valid avoids a cascade of confusing follow-on errors from a single root cause. `Number.isInteger` rejects `undefined`, `'1'` and `1.5` in one condition. Verified by running: `[]` for the real questions, and each of the five broken shapes reports exactly its own message.

### 2. Review screen

```js
function newQuiz() {
  return { index: 0, score: 0, phase: 'asking', lastPick: null, answers: [] };
}

function pickAnswer(choiceIndex) {
  if (state.phase !== 'asking') return;
  const question = QUESTIONS[state.index];
  const correct = choiceIndex === question.answerIndex;
  state.lastPick = choiceIndex;
  if (correct) state.score++;
  state.answers.push({ index: state.index, pick: choiceIndex, correct });
  state.phase = 'feedback';
  render();
}

// in render(), inside the 'done' branch, before the Play again button:
for (const answer of state.answers) {
  const question = QUESTIONS[answer.index];
  addText(root, 'p',
    `${answer.correct ? '✓' : '✗'} ${question.prompt} — you said "${question.choices[answer.pick]}"` +
    (answer.correct ? '' : `, answer: "${question.choices[question.answerIndex]}"`));
}
```

WHY: the review is *pure rendering* — every fact it displays was already recorded during play, so no new logic is needed at the end, only a new way of reading the same state. Storing `index` alongside the pick rather than copying the question text keeps the state small and means an edited question can't leave a stale copy behind. `restart` clears the review for free because it returns a whole fresh state object, which is why `newQuiz()` exists as a function instead of an object literal written once.

### 3. Keyboard answering

```js
document.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    if (state.phase === 'feedback') nextQuestion();
    else if (state.phase === 'done') restart();
    return;
  }
  const choice = Number(event.key) - 1;
  if (Number.isInteger(choice) && choice >= 0) {
    if (state.phase !== 'asking') return;
    if (choice < QUESTIONS[state.index].choices.length) pickAnswer(choice);
  }
});
```

WHY: the important discipline here is *not* re-implementing the rules. `pickAnswer` already begins with `if (state.phase !== 'asking') return;`, so the keyboard path inherits the same guard the buttons have — press `2` during feedback and nothing happens, for exactly the same reason the buttons are disabled. Two input channels sharing one set of action functions is what keeps them from drifting apart, and it's the payoff of having actions at all instead of logic inside `onclick` handlers. The only keyboard-specific work is translating `'1'` into index `0` and rejecting digits past the end of the choice list.

### 4. Explanations

```js
const QUESTIONS = [
  {
    prompt: 'What is [1,2] + [3]?',
    choices: ['[1,2,3]', "the string '1,23'", 'an error'],
    answerIndex: 1,
    explanation: '+ has no array meaning, so both sides become strings: "1,2" + "3".',
  },
  // ...others may omit `explanation` entirely
];

// in render(), inside the feedback branch:
if (question.explanation) addText(root, 'p', question.explanation);
```

WHY: this is the smallest possible demonstration of the README's claim that content lives in data. A whole teaching feature costs one optional field and one guarded line — and no question that lacks it changes in any way. The `if` matters more than it looks: without it, `addText(root, 'p', undefined)` would put the literal string `undefined` on screen, because `textContent = undefined` stringifies. "Absent" and "empty" are different, and the guard is where you say so.

### 5. shuffleChoices

```js
function shuffleChoices(question, random = Math.random) {
  const order = question.choices.map((_, i) => i); // shuffle POSITIONS, not text
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return {
    ...question,
    choices: order.map((i) => question.choices[i]),
    answerIndex: order.indexOf(question.answerIndex), // where the answer landed
  };
}
```

```js
// scratch test, run with node:
const q = { prompt: 'p', choices: ['A', 'B', 'C', 'D'], answerIndex: 0 };
const fixed = shuffleChoices(q, () => 0);
assert.deepEqual(fixed.choices, ['B', 'C', 'D', 'A']);
assert.equal(fixed.answerIndex, 3);

for (let trial = 0; trial < 500; trial++) {           // the PROPERTY
  const s = shuffleChoices(q);
  assert.equal(s.choices[s.answerIndex], 'A');        // the right text is still right
  assert.deepEqual([...s.choices].sort(), ['A', 'B', 'C', 'D']);
}
assert.deepEqual(q, { prompt: 'p', choices: ['A', 'B', 'C', 'D'], answerIndex: 0 }); // unmutated
```

WHY: shuffling an index array instead of the strings is what makes the answer recoverable — `order` is a record of where everything went, so `order.indexOf(question.answerIndex)` reads off the answer's new home in one step. Testing this with a fixed output is fragile and testing it by eye is impossible, so the real check is the *property*: whatever the shuffle does, `choices[answerIndex]` must still be the same text. Fisher–Yates rather than `sort(() => Math.random() - 0.5)` for the reason project 11 and project 48 both give — the sort version is measurably biased. Verified by running: `['B','C','D','A']` with `answerIndex: 3` for `random: () => 0`, the property holds over 500 random shuffles, all 24 orderings appear over 5000, and the input is untouched.

### 6. The pure reducer

```js
function reduce(state, action, questions) {
  switch (action.type) {
    case 'pick': {
      if (state.phase !== 'asking') return state; // same object: nothing happened
      const question = questions[state.index];
      const correct = action.choiceIndex === question.answerIndex;
      return {
        ...state,
        lastPick: action.choiceIndex,
        score: state.score + (correct ? 1 : 0),
        phase: 'feedback',
        answers: [...state.answers, { index: state.index, pick: action.choiceIndex, correct }],
      };
    }
    case 'next': {
      if (state.phase !== 'feedback') return state;
      const index = state.index + 1;
      return { ...state, index, lastPick: null, phase: index < questions.length ? 'asking' : 'done' };
    }
    case 'restart':
      return newQuiz();
    default:
      throw new Error(`Unknown action type "${action.type}"`);
  }
}

// every handler becomes the same one line:
function dispatch(action) { state = reduce(state, action, QUESTIONS); render(); }
```

WHY: passing `questions` as a parameter instead of reading the global is what lets a test drive the machine with three fake questions and no browser — the same "promote the hard-coded thing to a parameter" move as projects 01 and 40. Returning `state` itself for ignored actions is a deliberate signal: `assert.equal(next, state)` (reference equality) documents "this action did nothing" far more clearly than comparing fields, and in a framework it's what tells the renderer it can skip. The `default: throw` turns a typo like `'nxt'` into an immediate loud error instead of a silently dead button — project 30's lesson, and the reason the original's `onclick="answer1(true)"` chain was so hard to trust. Verified by running: correct pick scores 1 and enters feedback, a double pick returns the identical object, all-wrong ends at `done` with score 0, all-right scores 4, restart equals a fresh quiz, and `'teleport'` throws.
