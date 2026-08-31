# 📘 Learning Guide: Form State

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A shipping address form. On screen: a "Shipping" heading, five text boxes (first name, last name, street, city, zip), a country dropdown (US / UK / DE), and three buttons — **prefill from profile** (fills every box with Ada Lovelace's address), **reset** (empties everything), and **save** (prints the whole form as one line of text below the buttons).

Both versions look and behave identically to the user. The difference is entirely in the code: the original needs six separate state slots and three functions that each touch all six fields; the refactor stores the form as *one object* and every whole-form action becomes a single line.

## 2. Concepts you need first

**`useState` and controlled inputs** — explained fully in project 07's LEARN.md. Quick recap: a "controlled input" is a text box whose `value` comes from state and whose `onChange` writes back to state, so React owns what's in the box.

**Objects as values** — an object groups related data under named keys:

```js
const form = { firstName: 'Ada', city: 'London' };
console.log(form.firstName);   // 'Ada'  (dot access)
console.log(form['city']);     // 'London' (bracket access — key as a string)
```

Bracket access matters here because the key can live in a *variable*: `form[whichField]`.

**Spread-copying an object** — from project 10's LEARN.md: never change state objects, replace them. `{ ...current, city: 'Paris' }` builds a new object with everything copied and one key overridden.

**Computed property names** — normally, keys in `{ }` are literal words. Wrap a key in square brackets and JavaScript *evaluates* it, so a variable decides which key you're setting:

```js
const key = 'city';
const obj = { [key]: 'Paris' };  // { city: 'Paris' } — key came from a variable!
```

Combine with spread and you get the single most useful form idiom in React:

```js
setForm((current) => ({ ...current, [name]: value }));
```

"Copy the form, but replace whichever field `name` says."

**The `name` attribute** — HTML inputs can carry a `name="..."` label. When an event fires, `event.target` is the input element itself, so `event.target.name` tells you *which* box the user typed in and `event.target.value` tells you what's in it. This is how one handler can serve many inputs.

**Destructuring** — pulling properties out of an object into variables in one step:

```js
const { name, value } = event.target;
// same as: const name = event.target.name; const value = event.target.value;
```

**`JSON.stringify`** — turns any object into a text string, like `{"firstName":"Ada","city":"London"}`. Handy for displaying or saving a whole object at once.

**Rendering lists with `map`** — explained fully in project 02's LEARN.md (including the `key` prop). Used here to turn an array of field descriptions into a stack of `<input>` elements.

**"What changes together, lives together"** — the design question of this project. A search box and a dark-mode toggle are independent: separate `useState`s are perfect. But six fields that reset together, save together, and prefill together are really *one value* wearing six costumes. Group them.

## 3. Walking through the original code

Seven state slots:

```jsx
const [firstName, setFirstName] = useState('');
const [lastName, setLastName] = useState('');
const [street, setStreet] = useState('');
const [city, setCity] = useState('');
const [zip, setZip] = useState('');
const [country, setCountry] = useState('US');
const [saved, setSaved] = useState('');
```

One per field, plus `saved` for the output line. Nothing wrong yet — just bulky.

```jsx
function handleReset() {
  setFirstName('');
  setLastName('');
  setStreet('');
  setCity('');
  setZip('');
  setCountry('US');
}
```

Reset means calling *six setters, one per field*. Add a seventh field someday, and you must remember to add a seventh line here — the compiler won't remind you.

```jsx
function handleSave() {
  setSaved(JSON.stringify({ firstName, lastName, street, city, zip, country }));
}
```

Look closely at what this line does: it *builds the form object from scratch* just to save it. The form as a whole never existed in the program — only six loose strings — so any operation on "the form" must first reassemble it by hand.

```jsx
function copyFromProfile() {
  setFirstName('Ada');
  setLastName('Lovelace');
  ...
}
```

Prefill: six more hand-written setter calls.

The JSX is six nearly identical lines like:

```jsx
<input placeholder="first name" value={firstName}
       onChange={(e) => setFirstName(e.target.value)} />
```

Each field gets its own inline arrow function handler. Six fields, six handlers, all clones of each other.

## 4. What's wrong with it (in beginner terms)

Nothing is *broken* — every button works. The problem is the cost of change. Here's the concrete story:

Your boss says: "Add a phone number field." In the original you must edit **five places**: (1) a new `useState`, (2) a new `<input>` with its own inline handler, (3) a line in `handleReset`, (4) a key in `handleSave`'s rebuilt object, (5) a line in `copyFromProfile`. Miss #3, and here's what the user sees: they fill in the form, click reset, everything clears — *except the phone number, which stubbornly stays*. Miss #4 and the saved output silently lacks a phone number. These are quiet bugs; nothing crashes, data just goes subtly wrong.

The deeper smell: the form "as a thing" exists nowhere in the code. The README calls the six strings *shrapnel* — the form exploded into fragments, and every whole-form operation (reset, save, prefill) has to sweep the fragments back together, field by field, forever.

## 5. Try it yourself first!

Try refactoring a copy of `original.html` before peeking:

1. Could the six field values live in *one* `useState`? What kind of value holds six named strings?
2. Write out the empty form as a constant object (`{ firstName: '', ... }`). What does `handleReset` become if that constant exists? (One line.)
3. Prefill: define Ada's address as another constant object. What does `copyFromProfile` become?
4. Save: if the form is already one object, what does `handleSave` shrink to?
5. The six `onChange` handlers all look alike. Give each input a `name` attribute matching its key, then write ONE `handleChange(event)` that reads `event.target.name` and `event.target.value` and updates that one key with `{ ...current, [name]: value }`.
6. Stretch goal: put the five text-field definitions in an array and render them with `.map(...)` — so adding a field means adding a data row, not copying JSX.

## 6. Understanding the refactored solution

It starts with two constant objects, defined outside the component:

```jsx
const EMPTY_FORM = {
  firstName: '', lastName: '', street: '', city: '', zip: '', country: 'US',
};
const PROFILE_ADDRESS = {
  firstName: 'Ada', lastName: 'Lovelace', street: '12 Analytical Row',
  city: 'London', zip: 'W1', country: 'UK',
};
```

`EMPTY_FORM` is doing double duty: it's the reset value, *and* it's documentation — the complete shape of the form, in one place. Then field definitions as data:

```jsx
const FIELDS = [
  { name: 'firstName', placeholder: 'first name' },
  { name: 'lastName', placeholder: 'last name' },
  ...
];
```

State shrinks to two slots:

```jsx
const [form, setForm] = useState(EMPTY_FORM);
const [saved, setSaved] = useState('');
```

The star of the show — one handler for every field:

```jsx
function handleChange(event) {
  const { name, value } = event.target;
  setForm((current) => ({ ...current, [name]: value }));
}
```

Read it slowly: destructure which box fired (`name`) and its text (`value`); then replace the form with a copy where that one key is updated. Computed property `[name]` picks the key; spread keeps the other five fields; the updater form (project 11's LEARN.md) reads the freshest state. This single function replaces six inline arrows — and serves any field you ever add.

The inputs become a loop:

```jsx
{FIELDS.map(({ name, placeholder }) => (
  <input key={name} name={name} placeholder={placeholder}
         value={form[name]} onChange={handleChange} />
))}
```

Note `value={form[name]}` — bracket access, because the key is in a variable. The `<select>` gets `name="country"` and the *same* `handleChange` — the dropdown needs nothing special.

And the three buttons collapse to one-liners, written inline:

```jsx
<button onClick={() => setForm(PROFILE_ADDRESS)}>prefill from profile</button>
<button onClick={() => setForm(EMPTY_FORM)}>reset</button>
<button onClick={() => setSaved(JSON.stringify(form))}>save</button>
```

Reset = "the form is now the empty object." Prefill = "the form is now Ada's object." Save = "stringify the object that already exists." No reassembly, no enumeration, nothing to forget. Adding a phone field is now: one row in `FIELDS`, one key in `EMPTY_FORM` (and its match in `PROFILE_ADDRESS`). Reset, save, and prefill all pick it up automatically.

## 7. Words you learned (glossary)

- **Controlled input**: an input whose value lives in React state (state in, events out).
- **Form state**: the values of all form fields, treated as one piece of data.
- **Computed property name**: `{ [expr]: value }` — the key is calculated from a variable.
- **`name` attribute**: an HTML label on an input that identifies it in event handlers.
- **`event.target`**: the DOM element the event happened on (here, the input box).
- **Destructuring**: `const { a, b } = obj` — unpacking object properties into variables.
- **Spread-copy**: `{ ...obj, k: v }` — new object, all keys copied, one overridden.
- **Updater form**: `set(current => next)` — setter receives the live state (project 11).
- **`JSON.stringify`**: converts an object into a text string.
- **Single source of truth**: keeping a piece of data in exactly one place.
- **Fields-as-data**: describing form fields in an array and rendering them with `map`.

## 8. Experiments to try on the plane (no internet needed)

One-time note: these pages load React from a CDN, so *running* them needs internet (or a cached copy). Reading and editing the code — and predicting what will happen — works fine offline.

1. **Add a phone field to the refactor**: add `{ name: 'phone', placeholder: 'phone' }` to `FIELDS` and `phone: ''` to `EMPTY_FORM`. Prediction: a working input appears, and typing/reset/save all Just Work with zero handler changes. (Prefill will set it to `undefined` unless you also add a phone to `PROFILE_ADDRESS` — try it and see what save prints.)
2. **Add the same field to the original**: now do it in `original.html`. Count the edits you had to make. Prediction: five separate places, and it's easy to miss one — that's the whole lesson, felt in your fingers.
3. **Break the name link**: in the refactor, change one input's `name` to something wrong, like `name="frstName"`. Prediction: typing in that box does nothing visible — `handleChange` faithfully updates a key called `frstName` that no input displays, while `value={form['firstName']}` keeps showing the untouched empty string.
4. **Log the handler**: add `console.log(name, value)` inside `handleChange`, then type in different boxes. Prediction: each keystroke logs which field fired and its full current text — watching one function route six fields makes the idiom click.
5. **A "fill nonsense" button**: add `<button onClick={() => setForm({ ...EMPTY_FORM, city: 'Atlantis' })}>test data</button>`. Prediction: everything clears except city — spread-plus-override works for building test fixtures too.
