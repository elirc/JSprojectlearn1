# 📘 Learning Guide: Quiz App

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A multiple-choice quiz web page. Open the HTML file in a browser and you see a question with answer buttons:

```
1. What does === check?
[ value AND type ]
[ just value ]
```

Click an answer, move to the next question, and at the end see `Done! Score: 2/3`. The refactored version adds real upgrades: instant right/wrong feedback with green/red coloring, a fourth question, and a "Play again" button — and, more importantly, a structure where adding question five costs three lines of data instead of two new functions.

## 2. Concepts you need first

### The DOM and innerHTML

The **DOM** is the browser's live tree of page elements, which JavaScript can change. `element.innerHTML = "<p>hi</p>"` replaces everything inside an element with new HTML parsed from a string:

```js
document.getElementById("quiz").innerHTML = "<p>hello</p>";
// the page now shows: hello
```

Powerful, but risky with data (more below).

### createElement, textContent, appendChild

The safer building blocks: create an element, set its *text*, attach it:

```js
const p = document.createElement("p");
p.textContent = "5 < 10 & \"quotes\" are fine";
document.body.appendChild(p);
// shows exactly that text, symbols and all
```

`textContent` treats the string as plain text — never as HTML. So `<` shows as `<` instead of starting a tag. This is **escaping** handled for you: the classic bug (or security hole, called **HTML injection**) of string-built HTML is that data containing `<`, `"`, or `'` breaks the markup or smuggles in real tags.

### Click handlers: attributes vs properties

Old style puts code in the HTML: `<button onclick="answer1(true)">`. Anyone can read that markup (right-click → Inspect — the browser's **devtools** show all HTML and let you run JS). Newer style assigns a function in JavaScript: `button.onclick = () => pickAnswer(2)` — behavior stays in code, and closures can carry data (like which choice index this button is) without writing it into the page.

### Data-driven design (content vs mechanism)

The core idea of this project. **Content** is *what* the quiz asks — words, choices, answers. **Mechanism** is *how* the quiz works — showing questions, counting score. Data-driven design stores content as plain data (an array of objects) and writes the mechanism once, generically:

```js
const QUESTIONS = [
  { prompt: "2+2?", choices: ["3", "4"], answerIndex: 1 },
];
console.log(QUESTIONS[0].choices[QUESTIONS[0].answerIndex]); // prints: 4
```

Now "add a question" means adding an object — no new functions, no editing old ones.

### State, and phases (a mini state machine)

**State** is the data describing where the app is right now. Here it's one object: `{ index, score, phase, lastPick }`. The **phase** is which *mode* the screen is in — exactly one of `'asking'`, `'feedback'`, or `'done'`. A named single mode field like this is a tiny **state machine** (see project 40): it prevents nonsense like "showing feedback and accepting new answers at the same time."

### The render pattern

One function, `render()`, that wipes the screen and redraws *everything* from state. Actions never fiddle with the page directly; they update state and call `render()`. State is the **source of truth**; the DOM is just its reflection. This is the pattern React and friends industrialize — here it's 30 readable lines.

### forEach with index, and closures in loops

`array.forEach((item, i) => ...)` visits each item with its position. Each loop turn's arrow function *captures* its own `i` (a **closure**), which is how every answer button knows its own choice number:

```js
["a", "b"].forEach((item, i) => console.log(i, item));
// prints: 0 a, then 1 b
```

## 3. Walking through the original code

One global for the score, then a pair of functions *per question*:

```js
function showQuestion1() {
  document.getElementById("quiz").innerHTML =
    "<p>1. What does === check?</p>" +
    "<button onclick=\"answer1(true)\">value AND type</button>" +
    "<button onclick=\"answer1(false)\">just value</button>";
}
```

The question is a hand-glued HTML string. Look closely at the buttons: the *correct answer* is written into the markup as `answer1(true)` / `answer1(false)`.

```js
function answer1(correct) {
  if (correct) score++;
  showQuestion2();
}
```

Each answer handler bumps the score and hardcodes *which question comes next*. `answer2` calls `showQuestion3`; `answer3` ends the quiz:

```js
function answer3(correct) {
  if (correct) score++;
  document.getElementById("quiz").innerHTML =
    "<p>Done! Score: " + score + "/3</p>";
```

Question 2 was pasted from question 1, question 3 from question 2. The flow — the order of questions — exists only as this chain of function calls.

## 4. What's wrong with it (in beginner terms)

**Flaw 1: each question is code.** Content (the words), flow (what's next), and rendering (HTML strings) are welded together in per-question blobs. How it bites you: your teacher says "add two questions and shuffle the order each time." Adding question 4 means writing `showQuestion4` + `answer4` *and editing* `answer3` to call it instead of ending. Shuffling? Structurally impossible — the order *is* the call chain `answer1 → showQuestion2 → answer2 → showQuestion3`. You'd rewrite everything.

**Flaw 2: the DOM is the state.** "Which question are we on?" has no variable — the only record is which blob happens to be on screen. `score` floats as a global. Progress can't be saved, inspected, or reasoned about.

**Flaw 3: the answers leak.** `onclick="answer2(true)"` sits in the page's HTML. Anyone opens devtools, reads which button says `true`, and aces the quiz. Data that should stay private is baked into the visible markup.

**Flaw 4: string-built HTML is one apostrophe from breaking.** Concatenating question text into `innerHTML` works only while questions stay tame. Add a question about `"quotes"` or `<tags>` and the markup breaks — or, with user-supplied content, becomes an injection hole.

## 5. Try it yourself first!

1. **Vague hint:** What in this file is *content* and what is *machinery*? Could the questions live somewhere the machinery just reads?
2. **Warmer:** Build `const QUESTIONS = [{ prompt, choices, answerIndex }, ...]`. Now the machinery needs only one number to know where it is.
3. **Warmer still:** Keep one state object: `{ index: 0, score: 0 }`. One `showQuestion()` function renders `QUESTIONS[state.index]` — for *any* question. One `pickAnswer(i)` compares `i` to `answerIndex`, bumps the score, advances `index`, re-renders (or shows the final score when index runs off the end).
4. **Buttons without leaks:** create buttons with `document.createElement` and assign `button.onclick = () => pickAnswer(i)` — the answer never appears in the HTML.
5. **Stretch:** add a `phase` field (`'asking' | 'feedback' | 'done'`) so after answering, buttons lock and show green/red before a Next button advances. Notice: this feature is *possible* now, and wasn't before.

## 6. Understanding the refactored solution

**Content is data:**

```js
const QUESTIONS = [
  { prompt: 'What does === check?',
    choices: ['value AND type', 'just value'],
    answerIndex: 0 },
  ...
];
```

Four questions, each three lines. The fourth question — new in the refactor — cost exactly one object. A geography quiz is a different array; the engine wouldn't change at all. That's the content/mechanism split. And note where the answer lives: `answerIndex` is JavaScript data, never written into the page — nothing for devtools cheaters to read.

**Flow is state, not a call chain:**

```js
function newQuiz() {
  return { index: 0, score: 0, phase: 'asking', lastPick: null };
}
```

`index` replaces the hardcoded chain; `phase` names the mode. The actions are tiny: `pickAnswer(i)` refuses to act outside the asking phase (`if (state.phase !== 'asking') return` — the state machine guarding against double-answers), records the pick, scores it, flips to `'feedback'`. `nextQuestion()` advances `index` and picks `'asking'` or `'done'`. `restart()` is two lines — `state = newQuiz(); render()` — possible only because the whole quiz lives in one object.

**One render for every phase:**

```js
question.choices.forEach((choice, i) => {
  const button = addButton(root, choice, () => pickAnswer(i));
  if (state.phase === 'feedback') {
    button.disabled = true;
    if (i === question.answerIndex) button.className = 'correct';
    else if (i === state.lastPick) button.className = 'wrong';
  }
});
```

Buttons are generated from the data — a loop, not paste. In the feedback phase the *same* render disables them and colors the right answer green and your wrong pick red. Per-answer feedback is a feature the original never had; it fell out of having a `phase`.

**Safe DOM building:** the little helpers `addText` / `addButton` use `createElement` + `textContent`, so a prompt containing `<`, `'`, or `"` renders as literal text. No string-glued HTML anywhere near data.

## 7. Words you learned (glossary)

- **DOM** — the browser's live tree of page elements.
- **innerHTML** — replace an element's contents by parsing an HTML string.
- **createElement / appendChild** — build an element in JS / attach it to the page.
- **textContent** — set an element's text safely (never parsed as HTML).
- **Escaping** — making special characters display as themselves instead of acting as markup.
- **HTML injection** — data sneaking real tags into your page via string-built HTML.
- **Devtools** — the browser's built-in inspector; anyone can read your HTML with it.
- **Content vs mechanism** — what the app says vs how the app works.
- **Data-driven design** — content stored as data; one generic engine reads it.
- **State** — the data describing where the app is right now.
- **Phase** — the single named mode the UI is in (asking / feedback / done).
- **State machine** — a design where exactly one named state is active and transitions are controlled.
- **Render pattern** — actions update state; one `render()` redraws everything from it.
- **Source of truth** — the one place a fact lives (state, not the DOM).
- **Closure** — a function capturing nearby variables (each button remembering its `i`).
- **Global variable** — a variable any code can touch; easy to corrupt, hard to track.

## 8. Experiments to try on the plane (no internet needed)

1. **Cheat at the original.** Open `original.html`, right-click a button → Inspect. Expected: you can read `onclick="answer1(true)"` and see which answer is correct without knowing any JavaScript. Then inspect the refactor's buttons. Expected: just `<button>value AND type</button>` — nothing to read.
2. **Add question five to each version.** Refactor: add one `{ prompt, choices, answerIndex }` object. Original: try it — you must write `showQuestion4`, `answer4`, and edit `answer3`. Expected: ~3 lines vs ~10 lines plus editing existing code. Feel the difference the structure makes.
3. **Shuffle the quiz.** In the refactor, after defining `QUESTIONS`, add `QUESTIONS.sort(() => Math.random() - 0.5);` and reload a few times. Expected: random order each load — a feature that was *impossible* in the original's call chain — and note "Play again" keeps the same shuffled order until reload.
4. **Break string-built HTML on purpose.** In the original, change a question's text to `What does "x < y" mean?`. Expected: the rendering breaks or swallows text (the `<` starts a bogus tag). The refactor shows the same text perfectly, thanks to `textContent`.
5. **Add a progress line.** In the refactor's `render`, during asking/feedback phases add `addText(root, 'p', \`Question ${state.index + 1} of ${QUESTIONS.length} — score ${state.score}\`)`. Expected: a live progress display, built entirely in render, touching no action code — the reward of one-way state → screen flow.
