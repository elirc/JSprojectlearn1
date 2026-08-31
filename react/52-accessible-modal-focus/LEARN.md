# 📘 Learning Guide: Accessible Modal

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

An account settings page with an "Edit profile…" button. Click it and a
dialog appears: dim backdrop, white card in the middle, a heading, a text
field, Save and Cancel.

Both versions look **identical** — pixel for pixel. The difference only
shows up when you put the mouse down. In the original, Tab walks straight
out of the dialog into the page behind it, Escape does nothing, and
closing leaves you nowhere. In the refactor, focus enters the dialog,
cycles inside it, and returns to the button you started from.

To make that visible without owning a screen reader, both pages carry a
yellow **focus tracker** printing which element has focus, updated on
every focus change. It's the instrument panel: most experiments here are
"press a key, read the box".

## 2. Concepts you need first

### What "accessibility" actually means here

**Accessibility** (written **a11y** — "a", eleven letters, "y") means the
page works for people who don't interact with it the way you do while
writing it: someone using a screen reader, someone whose hands can't use
a mouse, you on a plane holding coffee. Not a vague virtue — for a dialog
it decomposes into three concrete, testable jobs: **manage focus**,
**handle the keyboard**, **say what things are**.

### Focus, the focus ring, and `activeElement`

At any moment exactly one element is **focused** — the one that receives
your typing. JavaScript can read it (`document.activeElement`) and move
it (`someButton.focus()`). The **focus ring** is the outline the browser
draws around it. **Tab** moves focus to the next element in **tab order**
(DOM order, for ordinary controls); **Shift+Tab** moves back. This is why
`outline: none` is one of the most damaging one-liners in CSS: it doesn't
remove focus, it makes focus *invisible*, so a keyboard user types blind.
Both pages here draw a loud blue ring on purpose.

Buttons, links **with an `href`**, inputs, selects and textareas are
**focusable** by default; a `<div>` is not, unless given a **`tabindex`**
(`0` joins the tab order, `-1` is script-focusable only, a positive
number jumps the queue — almost always a mistake). Elements drop *out*
when `disabled`, `hidden`, or inside a `display: none` subtree.

### What a screen reader is, and what it announces

A **screen reader** reads the page aloud or drives a braille display —
the main **assistive technology** for blind and low-vision users. It
doesn't read your CSS; it reads the *accessibility tree* the browser
builds from your HTML, where each element has a **role** ("button",
"heading"), a **name** ("Save settings"), and states ("disabled"). So
`<button>Save</button>` announces as *"Save, button"* — and
`<div class="dialog">` announces as… nothing: no role, no name, no
boundary. The reader walks straight through it into the page behind,
which it has no reason to think is unavailable.

### ARIA: telling assistive tech what a div means

**ARIA** (Accessible Rich Internet Applications) is attributes supplying
the role, name and state plain markup didn't:

- `role="dialog"` — this *is* a dialog, announced as one.
- `aria-modal="true"` — while I'm open, everything outside me is
  unavailable, so the reader keeps the user inside.
- `aria-labelledby="title-id"` — my name is that element's text, so the
  card announces as "Edit profile, dialog".
- `aria-label="Close"` — a name given directly, for controls whose
  content isn't words (`×` otherwise announces as "multiplication sign").

**The first rule of ARIA is: don't use ARIA.** If a real HTML element
does the job — `<button>`, not `<div role="button">` — use it and get the
role, keyboard behaviour and focus handling free. And ARIA only ever
*describes*: `role="dialog"` does not trap focus and `aria-modal` does
not stop Tab. Those you code yourself; that gap is this project.

### A focus trap, and why a modal needs one

A **focus trap** keeps Tab and Shift+Tab cycling inside a region. A modal
is *modal* precisely because the rest of the page is unavailable while
it's open, so the keyboard must respect that — otherwise you've drawn a
barrier only sighted mouse users can see. Three steps: move focus in and
remember where it was; on each Tab compute the next element *within* the
dialog; on close, put focus back.

Finally, a recap of project 38: `ReactDOM.createPortal(jsx, domNode)`
renders a component's output into a DOM node elsewhere — here
`#modal-root`, a sibling of the app root — while the component stays put
in the React tree, so overlays escape ancestors that clip or out-stack.

## 3. Walking through the original code

The whole dialog is this:

```jsx
<div className="backdrop" onClick={onClose}></div>
<div className="dialog">
  <button className="x" onClick={onClose}>×</button>
  <h3>Edit profile</h3>
  ...
```

Two positioned divs. No `role`, no `aria-*`, no ref, no effect, no key
handling. The CSS does 100% of the work of *looking* like a dialog and
nothing does any of the work of *being* one.

Opening it is `{open && <FakeModal onClose={() => setOpen(false)} />}` —
the right React idiom (project 04's conditional mount) doing exactly what
it says: putting elements on the page, nothing more. And `FakeModal` sits
inline, after `SettingsPanel`, so its buttons simply join the end of the
page's tab order like any other markup.

The focus tracker is the honest part of the file: it listens for
`focusin` on `document` — which, unlike `focus`, bubbles, so one listener
sees every move — and re-reads `document.activeElement` each time (with
cleanup, project 18's rule, even for a teaching gadget).

## 4. What's wrong with it (in beginner terms)

Open the page, Tab to "Edit profile…", press Enter, and watch the
tracker.

**Focus is still behind the dialog.** The tracker reads
`<button> Edit profile…`. The dialog appeared but your cursor didn't
move — you're standing outside the room you just opened.

**Press Tab and the highlight vanishes behind the grey layer.** It goes
to "Save settings", then "Help": dimmed, unclickable with a mouse, and
perfectly typable with a keyboard. Press Enter on the wrong one and
you've saved settings from inside a dialog you believed was blocking the
page. Two more presses and you're finally inside — ×, Display name —
arguably worse than never getting in, because the tab order now tells a
story about a barrier that doesn't exist. Keep going past Cancel and you
fall out the other side, back to Email; Shift+Tab from Display name
leaves immediately.

**Escape does nothing.** Every dialog in every operating system closes on
Escape. This one is a mouse-only room: if you can't click Cancel, you
can't leave.

**To a screen reader none of this exists.** No role, so no "dialog"
announcement; no `aria-modal`, so the reader wanders the page behind; no
`aria-labelledby`, so even if you find the div it has no name; and × is
announced as "multiplication sign, button".

**Closing loses your place.** The button you pressed unmounts, focus
falls to `<body>` — the tracker says so — and the next Tab starts over at
the top of the page. On a long form, a small disaster.

None of these is a rendering bug. The mistake is believing a dialog is a *look*.

## 5. Try it yourself first!

1. **Vague:** the dialog must own focus while it's open. What are the two
   moments where focus has to move, and who moves it?
2. **Warmer:** on mount, `document.activeElement` is the button you came
   from — save it in a ref, focus the first focusable element inside the
   dialog, and on unmount focus the saved one again. Which React feature
   runs code on mount *and* unmount?
3. **The trap:** add a `keydown` listener. Escape closes. Tab needs the
   focusable elements inside the dialog, the index of the current one,
   and the next — after the last comes the first, and vice versa.
4. **Split it:** that "next index" calculation needs no browser at all;
   it's arithmetic on a list length. Put it in its own file with tests
   and leave only `.focus()` in the component.
5. **Say what it is:** add `role="dialog"`, `aria-modal="true"`, point
   `aria-labelledby` at the heading's `id`, give × an `aria-label`. Then
   check your work with the mouse untouched: open the dialog, Tab around
   it forever, press Escape and land back on "Edit profile…".

## 6. Understanding the refactored solution

**The decision moved into a pure module.** `focus.js` has no React and no
DOM:

```js
export function nextFocusIndex(currentIndex, count, { shift = false } = {}) {
  if (count <= 0) return -1;
  if (currentIndex < 0 || currentIndex >= count) return shift ? count - 1 : 0;
  const step = shift ? -1 : 1;
  return (currentIndex + step + count) % count;
}
```

Three lines of arithmetic hold the entire trap. `% count` is the
wrap-around; the `+ count` before it defuses JavaScript's negative
remainder (`-1 % 4` is `-1`, not `3`). The `currentIndex < 0` branch is
"focus was outside the dialog": Tab answers first, Shift+Tab last.

Why extract it? Because *deciding* which element gets focus is pure logic
and *doing* it is one line — the js track's split, aimed at the keyboard.
`focus.test.js` tests it with fake elements (`{ tag: 'button', disabled:
true }` is enough for a rule about disabled buttons): thirteen tests
covering every wrap, the one-element case, the empty case, and a loop
asserting the result is never out of range.

**Focus in, focus back — one effect.**

```jsx
useEffect(() => {
  returnFocusRef.current = document.activeElement;   // the button we came from
  const first = focusableNow()[0];
  if (first) first.focus();
  return () => returnFocusRef.current?.focus();      // (guarded, in the file)
}, []);
```

The empty dependency array means "on mount, clean up on unmount" — and
because the dialog is conditionally mounted, mount *is* open and unmount
*is* close. This cleanup isn't housekeeping: restoring focus is a
user-visible feature (project 18's pairing, doing real work).

**The trap itself.**

```jsx
const list = focusableNow();
const next = nextFocusIndex(list.indexOf(document.activeElement), list.length,
                            { shift: event.shiftKey });
if (next === -1) return;
event.preventDefault();     // we choose, not the browser
list[next].focus();
```

`preventDefault()` is load-bearing: without it the browser performs its
own Tab *as well*, and focus lands two elements along. And
`focusableNow()` runs on **every keypress**, not once on open — dialogs
grow a "Retry" button while open, and a cached list skips it silently.
It's also the one place asking the DOM anything: `toCandidate(el)`
translates a real element into the shape the pure rules read, including
`inHiddenSubtree: el.offsetParent === null`.

**The roles, and the portal.** `role="dialog"`, `aria-modal="true"` and
`aria-labelledby={titleId}` on the card plus `aria-label="Close"` on the
× turn an anonymous div into "Edit profile, dialog" with a named close
button; `createPortal` into `#modal-root` (38) does the pixels.

**The honest scaling note**, printed on the page: real apps should use the
native `<dialog>` element, the `inert` attribute, or a focus-trap library
— which also hide the background from screen readers and paper over
quirks these ~40 lines don't. All built from exactly these parts.

## 7. Words you learned (glossary)

- **Accessibility (a11y):** designing so the page works for people who
  don't interact with it the way you do.
- **Assistive technology:** what someone uses to operate a computer —
  screen readers, magnifiers, switch devices, voice control.
- **Screen reader:** assistive tech announcing the page aloud or in
  braille, reading the accessibility tree rather than the pixels.
- **Focus:** the single element currently receiving keyboard input.
- **`activeElement`:** `document.activeElement` — the focused element.
- **Focus ring:** the outline showing where focus is; never remove it
  without drawing a replacement.
- **Tab order:** the sequence Tab walks — DOM order, for ordinary controls.
- **Focusable:** able to receive focus — buttons, links with `href`,
  inputs, selects, textareas, anything with a `tabindex`.
- **tabindex:** `0` joins the tab order, `-1` is script-focusable only,
  positive values jump the queue.
- **Focus trap:** code keeping Tab and Shift+Tab cycling inside a region.
- **ARIA:** attributes giving assistive tech the role, name and state
  plain markup didn't. It describes; it never adds behaviour.
- **Role:** what an element *is* to assistive tech (`dialog`, `button`).
- **aria-modal:** "while this is open, the rest of the page is unavailable."
- **aria-labelledby / aria-label:** an accessible name, taken from
  another element's text or given directly.
- **inert:** HTML attribute making a subtree unfocusable and invisible to
  assistive tech — the modern tool for "the page behind".
- **Portal:** rendering a component's output into a different DOM node
  while keeping it in the React tree (project 38).

## 8. Experiments to try on the plane (no internet needed)

Edit and reason offline; note the pages load React from a CDN (shared
library servers), so actually *running* them in a browser needs internet
on first load. The Node tests need nothing at all:
`node --test focus.test.js` from inside `refactored/`.

1. **Count the escapes.** In the original, open the dialog and press Tab
   eight times, writing down the tracker each press. Expected: two
   presses outside the dialog before you get in, and an exit again after
   Cancel. In the refactor: four readings, cycling forever.
2. **Delete `preventDefault()`.** Remove that line from the refactor's
   keydown handler and press Tab. Expected: focus jumps two places, not
   one — your `.focus()` fires *and* the browser does its own Tab
   afterwards. Put it back.
3. **Break the restore.** Comment out the `return () => ...` cleanup in
   the focus effect, open the dialog, press Escape. Expected: the tracker
   reads `<body>` — the original's "lost your place" bug, back.
4. **Disable a button, watch the trap adapt.** Add `disabled` to the
   refactor's Save button and Tab around. Expected: three stops in the
   cycle instead of four — `isFocusable` drops it, no change to the trap
   logic. In the original, nothing changes: there is no logic to adapt.
5. **Test a rule before you trust it.** Add a test asserting
   `nextFocusIndex(2, 3)` is `0`. Expected: it passes already, the modulo
   covers it. Then one asserting Shift+Tab from index `0` of a
   one-element list is `0` — did your mental model agree?
