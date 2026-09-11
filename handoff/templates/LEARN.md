# 📘 Learning Guide: <Topic>

<ONE strong paragraph. This exact paragraph becomes the mission `summary` shown on the world
map before the learner opens anything. Make it a hook that says why this idea matters and what
it buys you — not a restatement of the title. Two to four sentences.>

## 1. The problem in plain words

<Describe the task with no jargon. Then a tiny concrete instance, with an ASCII diagram if the
shape of the data matters.>

```
input  = <...>
          ↑  ↑
       what the learner should be looking at  →  answer: <...>
```

<One sentence naming what actually makes it hard — usually scale, a boundary, or an
assumption that quietly breaks.>

## 2. Concepts you need first

### <Sub-concept one>

<Explain it in its own right, then connect it back. Short runnable snippet with results in
comments:>

```js
const m = new Map();
m.set("apple", 3);     // remember: "apple" is at 3
m.has("apple");        // true
m.has("banana");       // false
m.set("apple", 99);    // setting again OVERWRITES
m.get("apple");        // 99
```

### <Sub-concept two>

<Same treatment. Prefer two or three small sub-concepts over one long one — these headings
become part of the mission's public concept list.>

## 3. How to think about it

<The mental model. What is the loop invariant, the state you carry, the question you ask at
each step? This is the section the learner reconstructs at the recall gate, so make it
memorable and self-contained.>

## 4. Common wrong turns

<Name the mistake before the fix. At least three, each with the symptom the learner will
actually see.>

- **<Mistake>.** <Why it is tempting.> <What breaks, concretely.>
- **<Mistake>.** …
- **<Mistake>.** …

## 5. The solution, step by step

<Build it up in stages, not as one finished block. Show the naive version first if the naive
version teaches something, then the improvement and what specifically forced it.>

```js
// step 1: <what this step establishes>
```

```js
// step 2: <what changed and why>
```

## 6. Complexity and tradeoffs

<Time and space, stated plainly, plus what you gave up. When is the "worse" version actually
the right call?>

## 7. Variations you should be able to handle

<Three to five variations of the problem, each one sentence. These feed the prediction gate:
the learner should be able to predict how the answer changes.>

## 8. Boundaries and failure modes

<Empty input, single element, duplicates, negatives, overflow, unicode, concurrency — whichever
apply. The recall gate explicitly asks for one boundary or failure, so this section must supply
several.>
