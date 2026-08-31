# 🏋️ Practice: Controlled Inputs

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking. (You can write and reason through everything offline; the page only needs internet on first load for the CDN.)

## Exercises

### ⭐ 1. Add a "clear" button (warm-up)

Add a third button to the refactored form that empties everything: username, email, and the submitted message. Because the truth lives in state, "clearing the form" should touch no DOM at all. Be careful where the button sits — it's inside a `<form>`.

**Practices:** writing to state instead of the DOM; button types inside forms.

**Hint:** Three setter calls and one attribute that stops the button from submitting.

**Expected:** After filling and submitting, one click on "clear" empties both boxes, the preview line returns to "Live preview appears here", the message disappears, and Submit is disabled again.

### ⭐⭐ 2. Add a password field (core)

Add a password input as a third controlled field, and extend the validity rule: the form is valid only when the username has 3+ characters, the email contains `@`, AND the password has at least 6 characters. The submitted message should not change (never echo passwords). Keep `isValid` a derived `const`, not state.

**Practices:** the controlled pair (`value` + `onChange`); deriving validity during render.

**Hint:** One new `useState`, one new `<input type="password">`, one more `&&` clause in `isValid`.

**Expected:** Submit stays disabled (reading "Submit (fill the form first)") until all three rules pass; typing a 6th password character flips it to an enabled "Submit".

### ⭐⭐ 3. Fix the crossed wires (core)

A copy-paste slip produced this version of the two inputs — predict *precisely* what happens when you click into the email box and type "h" then "i", then fix it.

```jsx
<input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username" />
<input value={email} onChange={(e) => setUsername(e.target.value)} placeholder="email" />
```

**Practices:** reasoning about the controlled loop (type → setState → re-render → value wins).

**Hint:** After each keystroke, React redraws the email box from `email` — which never changed.

**Expected:** You can state what each box and the preview line show after "h" and after "i" (the answer is stranger than "nothing happens"), and after your one-word fix, typing works normally.

### ⭐⭐ 4. Enforce username rules while typing (core)

Because every keystroke passes through your `onChange`, you can transform text before it ever becomes state. Make the username box force lowercase and refuse to grow past 12 characters — typing "ADA" should produce "ada", and the 13th character should simply never appear.

**Practices:** transforming input inside `onChange`; state as the single gatekeeper.

**Hint:** `e.target.value.toLowerCase().slice(0, 12)` — store the cleaned string, and the box displays the cleaned string.

**Expected:** Typing "AdaLovelaceOfLondon" leaves the box showing exactly "adalovelaceo" (12 chars, all lowercase); the preview says "Hi, adalovelaceo!".

### ⭐⭐⭐ 5. Predict what renders (challenge)

Someone adds a character counter under the username box. Without running it, predict exactly what the paragraph shows (a) on first load with `username === ''`, and (b) after typing "ada". Then fix the empty-box case.

```jsx
<p>{username.length && <strong>{username.length} characters</strong>}</p>
```

**Practices:** `&&` with a number 0; ternaries as the fix.

**Hint:** When `username` is empty, `username.length` is `0` — and what does React render when an expression evaluates to `0`?

**Expected:** Your two predictions match the solution, and your fixed version shows nothing on load and "3 characters" (bold) after typing "ada".

### ⭐⭐⭐ 6. Extract a reusable `Field` (challenge)

Both inputs repeat the same three-prop wiring. Build a `Field` component with props `{ label, value, onChange, placeholder }` that renders a `<label>` with the label text and a controlled input — and have `Field`'s `onChange` hand back the *string*, not the event, so `App` can pass setters directly: `onChange={setUsername}`. Replace both inputs with it.

**Practices:** extracting a component; designing a controlled-component prop API.

**Hint:** Inside `Field`: `onChange={(e) => onChange(e.target.value)}` — the event stops there; only the text travels up.

**Expected:** The form looks and behaves exactly as before, but now each field is one line in `App`: `<Field label="Username" value={username} onChange={setUsername} placeholder="username" />`.

## Solutions

### 1. Add a "clear" button

```jsx
function clearForm() {
  setUsername('');
  setEmail('');
  setMessage('');
}

<button type="button" onClick={clearForm}>clear</button>
```

**Why:** The inputs render *from* state, so setting all three strings back to `''` empties the boxes, kills the preview (empty string is falsy, so the placeholder text ternary wins), and re-disables Submit because `isValid` is derived and recomputes as false. `type="button"` matters: without it, a button inside a `<form>` defaults to `type="submit"`, so "clear" would also fire `handleSubmit`.

### 2. Add a password field

```jsx
const [password, setPassword] = useState('');
const isValid =
  username.length >= 3 && email.includes('@') && password.length >= 6;

<input
  type="password"
  value={password}
  onChange={(e) => setPassword(e.target.value)}
  placeholder="password"
/>
```

**Why:** A new field is just another instance of the controlled pair: one state slot, `value` to display it, `onChange` to update it. `isValid` stays a plain `const` recomputed each render, so the button's disabled state can never lag behind what's typed — there's no stored copy to forget to update. The submit message still only echoes username and email.

### 3. Fix the crossed wires

Prediction: typing "h" in the email box fires `setUsername('h')` — on re-render the *username* box shows "h", the preview says "Hi, h!", and the email box is redrawn from `email` (still `''`), so it snaps back to empty. Typing "i" then happens in an empty box, so `e.target.value` is `"i"`, and username becomes `"i"` — not "hi". The email box appears frozen while the username box mysteriously flickers through single letters.

```jsx
<input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email" />
```

**Why:** A controlled input always displays its `value` prop — after every render, React forces the box to match state, discarding whatever the DOM briefly held. Since `email` never changes, the box resets to `''` after each keystroke, and each new keystroke starts from empty. The fix is simply wiring the handler to the matching setter, restoring one loop per field.

### 4. Enforce username rules while typing

```jsx
<input
  value={username}
  onChange={(e) => setUsername(e.target.value.toLowerCase().slice(0, 12))}
  placeholder="username"
/>
```

**Why:** In a controlled input, state is the only source of truth, so cleaning the text *before* storing it means the illegal version never exists anywhere — the box redraws from the cleaned state on the very same keystroke. `toLowerCase()` handles case; `slice(0, 12)` caps length (verified: `'AdaLovelaceOfLondon'` becomes `'adalovelaceo'`, exactly 12 characters). This kind of enforce-while-typing rule is impossible in the original, where React never sees keystrokes at all.

### 5. Predict what renders

(a) On load, `username.length` is `0`, and `0 && anything` evaluates to `0` — React renders numbers, so the page shows a literal **0**. (b) After typing "ada", `3 && <strong>...</strong>` evaluates to the `<strong>` element, so it shows "3 characters" in bold.

```jsx
<p>{username.length > 0 && <strong>{username.length} characters</strong>}</p>
{/* or: */}
<p>{username ? <strong>{username.length} characters</strong> : null}</p>
```

**Why:** `&&` returns its left operand when that operand is falsy, and React renders the numbers `0` and `NaN` as visible text (it only skips `false`, `null`, and `undefined`). Comparing to get a real boolean (`> 0`) or using a ternary guarantees the falsy branch renders nothing. This is the classic "stray 0 on screen" bug, and counters over arrays or strings are where it bites most.

### 6. Extract a reusable `Field`

```jsx
function Field({ label, value, onChange, placeholder }) {
  return (
    <label>
      {label}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

<Field label="Username" value={username} onChange={setUsername} placeholder="username" />
<Field label="Email" value={email} onChange={setEmail} placeholder="email" />
```

**Why:** `Field` unwraps the event once, so callers deal only in strings — which lets `App` pass `setUsername` directly with no arrow function. The component keeps the controlled contract (a value prop in, a change report out) while owning zero state of its own; `App` remains the single source of truth. This value-in/on-change-out shape is exactly the "controlled component" idea project 08 builds on.
