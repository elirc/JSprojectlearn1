# 🏋️ Practice: Preserving State

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

(Once for this file: all exercises are writable and predictable offline; running the page needs the CDN or a cached load.)

## Exercises

### ⭐ 1. Predict: three fates for a counter (warm-up)

`Note` is a component with `const [count, setCount] = useState(0)` and a `+1` button. In each variant, you click the button five times, flip `show` off and back on (or just flip it once where nothing disappears), and look at the counter:

```jsx
// (a) {show && <Note />}
// (b) <div style={{ display: show ? 'block' : 'none' }}><Note /></div>
// (c) <Note key={show ? 'a' : 'b'} />
```

Predict the counter after the round trip in each variant, and name the mechanism.

*Practices:* the destroy / hide / re-identify trio in one glance.
*Hint:* in (c), `Note` is rendered the whole time — but is it the same *instance*?
*Expected:* three answers with mechanisms, matching the solution.

### ⭐⭐ 2. A third tab with a precious draft (core)

Add a **Notes** tab (internal notes about the ticket) with its own textarea. Requirement: hopping between all three tabs must never lose either draft. Choose one of the two fixes deliberately, and use plain `&&` where it's genuinely safe.

*Practices:* applying the three-tool choice tab by tab, not blanket-applying one.
*Hint:* the notes draft is precious → same treatment as the reply. DetailsTab still owns nothing.
*Expected:* type in Reply, type in Notes, cycle through all tabs repeatedly — both texts intact; Details still uses `&&` with no harm.

### ⭐⭐ 3. Unsaved dot on the tab button (core)

Show `Reply •` on the Reply *button* whenever the reply draft is non-empty — visible even while you're on another tab. Then answer: which of the two fixes (A: lifted state, B: CSS-hide with state inside `ReplyTab`) makes this feature possible, and why can't the other do it alone?

*Practices:* a second reader forcing the "who owns the draft" question.
*Hint:* the button lives in `App`. Can `App` read state that lives inside `ReplyTab`?
*Expected:* the dot appears with the first typed character, persists while you view Details, and disappears if you delete all the text.

### ⭐⭐ 4. The cleanup that reintroduced the bug (core)

A teammate "simplified" a version where the draft lives inside `ReplyTab` (Fix B alone) to avoid "rendering hidden stuff":

```jsx
{tab === 'reply' && (
  <div style={{ display: tab === 'reply' ? 'block' : 'none' }}>
    <ReplyTab />
  </div>
)}
```

Users report lost drafts again. Explain precisely why the `display:none` never gets a chance to help, and fix the line.

*Practices:* seeing that `&&` decides *existence*, and CSS only decides *visibility* of what exists.
*Hint:* when `tab` is `'details'`, does the wrapper div exist at all?
*Expected:* your explanation matches; after removing the `&&` (keeping only the styled wrapper), drafts survive again.

### ⭐⭐⭐ 5. Lazy keep-alive tabs (challenge)

Make `DetailsTab` expensive to *mount* — simulate it with a lazy initializer, which runs only once per instance:

```jsx
const [ready] = useState(() => {
  const t0 = performance.now();
  while (performance.now() - t0 < 300) {}
  return true;
});
```

Requirement: the app must not pay those 300ms at page load (Details may never be opened) — but must pay them only **once**, on the first visit; after that, switching to Details is instant. Implement "mount on first visit, then keep alive hidden."

*Practices:* combining `&&` (don't exist yet) with CSS-hide (exist, invisible) via a `visited` flag.
*Hint:* one boolean state: `detailsVisited`. Render nothing until it's true; after that, toggle only `display`.
*Expected:* page loads instantly; first click on Details hitches ~300ms; every later switch in either direction is instant; the reply draft still survives throughout.

## Solutions

### 1. Predict: three fates for a counter

(a) **0** — `show` false unmounted the instance; state died; the return trip mounted a fresh one. (b) **5** — the component never left the tree; only pixels were withheld. (c) **0** — `Note` was rendered continuously, but flipping `show` changed its `key`, and a changed key means "different thing": unmount + fresh mount, same as (a).

**Why:** all three lines *look* like a visibility toggle, but only (b) is one. (a) and (c) are identity/lifetime operations. The interviewer-grade detail: (c) resets on *every* flip in *either* direction, because any key change destroys — there's no "old instance saved somewhere."

### 2. A third tab with a precious draft

```jsx
function NotesTab({ notes, onNotesChange }) {
  return (
    <div className="card">
      <p>Internal notes:</p>
      <textarea rows="4" value={notes} onChange={(e) => onNotesChange(e.target.value)} />
    </div>
  );
}

function App() {
  const [tab, setTab] = useState('reply');
  const [reply, setReply] = useState('');
  const [notes, setNotes] = useState('');
  return (
    <div>
      <h1>Ticket #42</h1>
      <button onClick={() => setTab('reply')} disabled={tab === 'reply'}>Reply</button>
      <button onClick={() => setTab('details')} disabled={tab === 'details'}>Details</button>
      <button onClick={() => setTab('notes')} disabled={tab === 'notes'}>Notes</button>

      <div style={{ display: tab === 'reply' ? 'block' : 'none' }}>
        <ReplyTab reply={reply} onReplyChange={setReply} />
      </div>
      {tab === 'details' && <DetailsTab />}
      {tab === 'notes' && <NotesTab notes={notes} onNotesChange={setNotes} />}
    </div>
  );
}
```

**Why:** the notes draft is precious, so its state is lifted to `App` (Fix A) — after which plain `&&` on `NotesTab` is *safe*: the component that unmounts owns nothing; the data lives above the toggle. `DetailsTab` keeps `&&` because it has no state at all. The skill demonstrated: pick per tab, based on what the state behind it is worth — not one blanket mechanism.

### 3. Unsaved dot on the tab button

```jsx
<button onClick={() => setTab('reply')} disabled={tab === 'reply'}>
  Reply{reply !== '' && ' •'}
</button>
```

Only **Fix A** makes this possible. The button is rendered by `App`, and a component can only read state it owns or receives — with the draft lifted into `App`, `reply !== ''` is one derived expression. Under Fix B alone, the draft is locked inside the `ReplyTab` instance; `App` has no path to it (React state is private to its owner; there's no "reach into a child").

**Why:** this is the general test for choosing between the fixes: CSS-hide preserves state *in place*, which is enough only while the component itself is the sole reader. The moment anyone outside the toggle needs the value — tab badges, a global Send button, a "discard changes?" prompt — the state must live above the toggle. Precious usually implies shared eventually.

### 4. The cleanup that reintroduced the bug

When `tab` is `'details'`, the outer `tab === 'reply' &&` is false — so React renders *nothing there at all*. The wrapper div and `ReplyTab` are unmounted; the inner `display:` expression is never even evaluated. The CSS can only hide an element that *exists*, and the `&&` decides existence first. The fix is to delete the condition and let the style do the toggling:

```jsx
<div style={{ display: tab === 'reply' ? 'block' : 'none' }}>
  <ReplyTab />
</div>
```

**Why:** `&&` and `display:none` answer different questions — "is it in the tree?" vs "is it painted?" — and the outer one always wins. Belt-and-suspenders here isn't harmless redundancy; the belt (unmounting) kills the patient the suspenders were protecting. This planted bug is common in real codebases precisely because both lines individually look like the fix.

### 5. Lazy keep-alive tabs

```jsx
function App() {
  const [tab, setTab] = useState('reply');
  const [reply, setReply] = useState('');
  const [detailsVisited, setDetailsVisited] = useState(false);

  function openTab(t) {
    setTab(t);
    if (t === 'details') setDetailsVisited(true); // one-way latch
  }

  return (
    <div>
      <h1>Ticket #42</h1>
      <button onClick={() => openTab('reply')} disabled={tab === 'reply'}>Reply</button>
      <button onClick={() => openTab('details')} disabled={tab === 'details'}>Details</button>

      <div style={{ display: tab === 'reply' ? 'block' : 'none' }}>
        <ReplyTab reply={reply} onReplyChange={setReply} />
      </div>

      {detailsVisited && (
        <div style={{ display: tab === 'details' ? 'block' : 'none' }}>
          <DetailsTab />
        </div>
      )}
    </div>
  );
}
```

**Why:** `detailsVisited` is a one-way latch: false means "never asked for → don't even mount" (page load pays nothing), true means "mounted forever → hide with CSS" (the 300ms lazy initializer ran exactly once, at that first mount, because `useState(fn)` initializers run only when an instance is created). This is the standard keep-alive tabs pattern: `&&` handles *not yet*, `display:none` handles *not right now*. The reply draft is untouched throughout because it was lifted — three tools, each doing the one job it's best at.
