# 📘 Learning Guide: State Mutation

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A tag editor. On screen: a heading ("Tags"), a line showing the current tags ("react, js"), a text box, and three buttons — **add**, **remove last**, and **bigger font**. Type a word and click "add" and it joins the list. "remove last" should delete the newest tag. "bigger font" should make the tag line grow by 2 pixels each click.

In the original, "remove last" and "bigger font" are dead — you click, nothing happens. Weirder still: "add" works, but for a completely accidental reason. This project explains why.

## 2. Concepts you need first

**`useState` basics** — explained fully in project 07's LEARN.md. One reminder that matters here: calling the setter (`setTags(...)`) is how you ask React to redraw.

**Mutation** — changing an object or array *in place*, without making a new one. These are all mutations:

```js
const arr = [1, 2];
arr.push(3);        // mutation: same array, now longer
arr.pop();          // mutation: same array, now shorter
const obj = { a: 1 };
obj.a = 99;         // mutation: same object, new insides
```

The opposite of mutating is **replacing**: building a brand-new array/object that contains the change, leaving the old one untouched.

**Reference vs. contents** — in JavaScript, a variable holding an array doesn't hold the array's items; it holds a *reference* (think: the array's home address). Two variables can point at the same address:

```js
const a = [1, 2];
const b = a;        // b is the SAME array, not a copy
b.push(3);
console.log(a);     // [1, 2, 3] — a changed too!
console.log(a === b); // true — same address
```

`a === b` compares addresses, not contents. `[1,2] === [1,2]` is `false` — two different arrays that happen to look alike.

**Why React cares** — when you call `setTags(newValue)`, React asks one cheap question: "is `newValue` the same reference as what I already have?" (it uses `Object.is`, which for objects behaves like `===`). Same address means "nothing changed," so React *skips the redraw entirely*. It never looks inside. If you mutated the array and handed back the same address, your change is invisible.

**Spread syntax (`...`)** — the three dots copy the contents of an array or object into a new one:

```js
const arr = [1, 2];
const longer = [...arr, 3];        // NEW array: [1, 2, 3]
const obj = { a: 1, b: 2 };
const changed = { ...obj, b: 99 }; // NEW object: { a: 1, b: 99 }
```

This is the standard way to "replace, not change."

**`slice`** — an array method that copies a piece of an array into a *new* array. `arr.slice(0, -1)` means "copy everything except the last item" — a non-mutating version of `pop`.

**Updater form** — passing a *function* to a setter: `setTags(current => [...current, draft])`. React calls your function with the freshest value. Project 11's LEARN.md explains when this matters; here, just recognize the shape.

## 3. Walking through the original code

Three state slots:

```jsx
const [tags, setTags] = useState(['react', 'js']);
const [settings, setSettings] = useState({ theme: 'light', fontSize: 14 });
const [draft, setDraft] = useState('');
```

An array (the tags), an object (display settings), and a string (what's typed in the box but not yet added).

```jsx
function addTag() {
  tags.push(draft);      // mutate...
  setTags(tags);         // ...and hand back THE SAME array.
  setDraft('');
}
```

`tags.push(draft)` shoves the new tag into the *existing* array — a mutation. Then `setTags(tags)` hands React the same address it already had. React shrugs: "same array, nothing to do." The button would be dead… except `setDraft('')` on the next line changes the *string* state, which IS a real change, which triggers a redraw — and the redraw happens to read the mutated array and shows the new tag. It works by pure luck.

```jsx
function removeLast() {
  tags.pop();
  setTags(tags);         // same array again — React bails out.
}
```

Same mutation pattern, but no lucky second setter this time. The array really does lose its last item — in memory. The screen never hears about it. Dead button.

```jsx
function embiggenFont() {
  settings.fontSize += 2; // mutate the object...
  setSettings(settings);  // ...same reference. Dead button.
}
```

Same disease, object flavor: change a property in place, hand back the same object, React skips the redraw.

The JSX below displays `tags.join(', ')` (glue the tags together with commas), sets the paragraph's `fontSize` from `settings`, and wires the input and three buttons.

## 4. What's wrong with it (in beginner terms)

**The dead buttons.** Click "remove last": the tag line still reads "react, js". Click it five times: still "react, js". But here's the spooky part — the data *did* change. If you then type "x" in the box and click "add", the screen suddenly shows just "x" or some shrunken list, because five `pop`s really happened; the screen was just never told. The app's memory and the screen drifted apart.

**"add" works by accident.** It looks fine in a demo. Now imagine a teammate tidying up: "why do we clear the draft here? Let's move that elsewhere." They delete `setDraft('')` — and suddenly *adding tags* breaks, even though they didn't touch any adding code. Bugs that live far away from their cause are the most expensive kind.

**Why this gets worse later.** In bigger apps, React offers speed tools (like `React.memo`, project 28) that also rely on "new reference = changed." Mutated state silently defeats them all. The habit you build here protects every future project.

## 5. Try it yourself first!

Try fixing `original.html` (on a copy) before reading on:

1. The rule to satisfy: React must receive a *different* array/object than it had before. How do you make a changed *copy* instead of changing the original?
2. For `addTag`: is there a way to write "a new array = all the old items, plus one more" in one expression? (Three dots are involved.)
3. For `removeLast`: `pop` mutates. Which array method gives you a *new* array with the last item missing? (It rhymes with "ice.")
4. For `embiggenFont`: build a new object that copies `settings` but overrides `fontSize`. Spread syntax again.
5. Polish step: use the updater form (`setTags(current => ...)`) for each, so you read the freshest state instead of the render's snapshot.

## 6. Understanding the refactored solution

Every handler now *builds a replacement*:

```jsx
function addTag() {
  setTags((current) => [...current, draft]);  // new array: spread + append
  setDraft('');
}
```

`[...current, draft]` creates a brand-new array. New address → React sees a change → redraw. Note `setDraft('')` is still here, but now it's doing its actual job (clearing the box), not secretly carrying the whole feature.

```jsx
function removeLast() {
  setTags((current) => current.slice(0, -1)); // new array: slice
}
```

`slice(0, -1)` copies everything except the last item into a fresh array. The old array is untouched — which, as a bonus, is what makes undo features possible later (project 40): old versions of state still exist.

```jsx
function embiggenFont() {
  setSettings((current) => ({
    ...current,
    fontSize: current.fontSize + 2,
  }));
}
```

New object: copy all of `current`'s properties, then override `fontSize`. (The extra parentheses around `({ ... })` tell JavaScript "this brace is an object, not a function body.")

The page itself prints the cheat sheet worth memorizing — every mutating operation has a replacing twin:

- `push(x)` → `[...arr, x]`
- `pop()` → `arr.slice(0, -1)`
- `splice(i, 1)` → `arr.filter(...)`
- `arr[i] = x` → `arr.map(...)`
- `obj.k = v` → `{ ...obj, k: v }`
- `sort()` → `[...arr].sort()`

One rule covers everything: **the moment you type `state.` followed by `push`, `pop`, `sort`, or `=`, stop — build the replacement instead.**

## 7. Words you learned (glossary)

- **Mutation**: changing an array/object in place instead of making a new one.
- **Reference**: the "address" of an object/array that a variable actually holds.
- **`Object.is` / `===` on objects**: compares addresses, not contents.
- **Reference comparison**: how React decides whether state changed (same address = no change).
- **Spread syntax (`...`)**: copies an array/object's contents into a new one.
- **`slice`**: copies part of an array into a new array (non-mutating).
- **`pop` / `push`**: mutating methods that remove/add the last item in place.
- **Updater form**: passing a function to a setter so React supplies the current value.
- **Immutable update**: replacing state with a changed copy rather than editing it.
- **Dead button**: a button whose handler runs but produces no visible change.

## 8. Experiments to try on the plane (no internet needed)

One-time note: these pages fetch React from a CDN, so *running* them needs internet (or a cached copy from an earlier visit). Editing and predicting works fully offline — check your predictions when you land.

1. **Kill the lucky line**: in `original.html`, delete `setDraft('')` from `addTag`. Prediction: "add" now looks 100% dead — but click "add" three times, then click "bigger font"… still dead… then edit the input: every queued change appears at once on the next real render.
2. **Prove `slice` doesn't mutate**: in the refactor's `removeLast`, add `console.log(current.length)` before the return. Prediction: clicking repeatedly logs 2, 1, 0, 0… and the tag line matches — the old arrays were never damaged.
3. **Break the refactor**: change `embiggenFont` back to `current.fontSize += 2; return current;` style (mutate and return the same object). Prediction: dead button again — you rebuilt the bug from parts.
4. **Add a "remove first" button**: wire a new button to `setTags(current => current.slice(1))`. Prediction: it works first try, because you followed the replace-don't-change rule.
5. **Sort safely**: add a button calling `setTags(current => [...current].sort())`. Then try `current.sort()` without the spread. Prediction: the spread version works; the bare `sort` version is a dead button (sort mutates and returns the same array).
