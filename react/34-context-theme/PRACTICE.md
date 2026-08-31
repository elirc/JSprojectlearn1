# 🏋️ Practice: Context for Prop Drilling

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

(Once for this file: everything is writable and predictable offline; running the page needs the CDN or a cached load.)

## Exercises

### ⭐ 1. Predict: consuming your own provider (warm-up)

A teammate wants to log the theme from the top and adds one line to the refactor:

```jsx
function App() {
  const { theme } = useTheme();   // new line
  console.log('current theme:', theme);
  return <ThemeProvider>...</ThemeProvider>;
}
```

Predict exactly what happens when the page loads, and why — down to which code path produces what you see.

*Practices:* providers serve *descendants*; the component that renders a provider is not inside it.
*Hint:* what does `useContext(ThemeContext)` return when no provider sits *above* the caller?
*Expected:* your prediction names the exact error and where it comes from.

### ⭐⭐ 2. A third theme: sepia (core)

Extend the theme module to cycle light → dark → sepia → light. Add a `.sepia` CSS class (e.g. `background: #f4ecd8; color: #5b4636;`), and give `SaveButton` a matching third style. Requirement: only the theme *module* and the two real consumers change — zero courier signatures touched.

*Practices:* the payoff of centralizing an ambient value — growth without hallway-walking.
*Hint:* replace the ternary in `toggleTheme` with a three-way cycle (an object lookup reads nicely).
*Expected:* clicking Save cycles through all three looks; `Page`/`Toolbar`/`ActionsMenu`/`SaveSection` diffs are empty.

### ⭐⭐ 3. Ship a second ambient value: locale (core)

Build a `LocaleContext` module with the same packaging — `LocaleProvider` (state `'en'`, value memoized) + `useLocale()` that throws without a provider. Add a deep consumer: `SaveButton` shows "Save" / "Enregistrer" depending on locale, and a small `LocaleSwitch` button next to the h1 toggles `en`/`fr`.

*Practices:* reproducing the Provider + custom hook shape from muscle memory — the standard packaging for every context you ship.
*Hint:* it's `ThemeProvider` with the nouns renamed; nest the two providers in `App` (order doesn't matter).
*Expected:* toggling locale relabels the deep button with zero signature changes anywhere; removing `<LocaleProvider>` produces your named error, not a null crash.

### ⭐⭐ 4. The toggle that stopped toggling (planted bug) (core)

Someone "optimized" the provider:

```jsx
const value = useMemo(
  () => ({ theme, toggleTheme: () => setTheme((t) => (t === 'light' ? 'dark' : 'light')) }),
  [],   // ← changed from [theme]
);
```

Bug report: "clicking Save does nothing — no error, no color change." Explain the full chain — including why not even the provider's own children repaint — then fix it.

*Practices:* lying deps on a provider value = the whole app frozen in time, silently.
*Hint:* two separate mechanisms keep the screen stale: the context value's identity, and what `{children}` compares as.
*Expected:* your explanation covers both mechanisms; restoring `[theme]` revives the toggle.

### ⭐⭐⭐ 5. Remembered theme (challenge)

Make the choice survive a reload: initialize the theme from `localStorage` and save it whenever it changes — entirely inside `ThemeProvider`, so no consumer knows persistence exists. Guard against storage being unavailable (private windows throw).

*Practices:* lazy `useState` initializers; effects as the home for storage side effects; encapsulation paying off.
*Hint:* `useState(() => ...)` runs once per mount — the right place for a one-time read.
*Expected:* toggle to dark, reload the page → still dark; with storage blocked, the app still works (defaults to light).

## Solutions

### 1. Predict: consuming your own provider

The page renders nothing and the console shows: `Error: useTheme must be used inside <ThemeProvider>`. Chain: `App` calls `useTheme()` → `useContext(ThemeContext)` looks for the nearest provider **above `App`** — but the only provider is one `App` is *about to render below itself* — so it finds none and returns the `createContext(null)` default → the guard sees `null` and throws → the render aborts (no boundary catches it, so the root shows nothing).

**Why:** a provider's scope is its `children`, full stop. The component that renders the provider stands outside the tunnel it digs. That's exactly why the refactor has `ThemedShell` — a tiny component *inside* the provider — do the page-level theming instead of `App`. And note the guard did its job: a named, located error beats a silent `null` ride.

### 2. A third theme: sepia

```jsx
// CSS: .sepia { background: #f4ecd8; color: #5b4636; }  .sepia .box { border-color: #b09a7a; }
const NEXT_THEME = { light: 'dark', dark: 'sepia', sepia: 'light' };

function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');
  const value = useMemo(
    () => ({ theme, toggleTheme: () => setTheme((t) => NEXT_THEME[t]) }),
    [theme],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

const BUTTON_STYLES = {
  light: { background: '#eee', color: '#000' },
  dark:  { background: '#444', color: '#fff' },
  sepia: { background: '#d8c3a5', color: '#5b4636' },
};

function SaveButton() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button style={BUTTON_STYLES[theme]} onClick={toggleTheme}>
      Save (and toggle theme — {theme})
    </button>
  );
}
```

**Why:** the cycle lives in one lookup table inside the provider; consumers keep reading `theme` as data. `ThemedShell` needs nothing — `className={theme}` already emits `sepia`. Count the diff: theme module, `SaveButton`, one CSS rule. In the original's drilled version this same feature would *also* have worked without signature changes (the prop already flows) — the drilling tax appears when you add a *new* value, which is exercise 3.

### 3. Ship a second ambient value: locale

```jsx
const LocaleContext = createContext(null);

function LocaleProvider({ children }) {
  const [locale, setLocale] = useState('en');
  const value = useMemo(
    () => ({ locale, toggleLocale: () => setLocale((l) => (l === 'en' ? 'fr' : 'en')) }),
    [locale],
  );
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

function useLocale() {
  const context = useContext(LocaleContext);
  if (context === null) throw new Error('useLocale must be used inside <LocaleProvider>');
  return context;
}

function LocaleSwitch() {
  const { locale, toggleLocale } = useLocale();
  return <button onClick={toggleLocale}>lang: {locale}</button>;
}

function SaveButton() {
  const { theme, toggleTheme } = useTheme();
  const { locale } = useLocale();
  return (
    <button style={BUTTON_STYLES[theme]} onClick={toggleTheme}>
      {locale === 'fr' ? 'Enregistrer' : 'Save'} ({theme})
    </button>
  );
}

// App:
<ThemeProvider>
  <LocaleProvider>
    <ThemedShell>
      <h1>Context theme</h1> <LocaleSwitch />
      <Page />
    </ThemedShell>
  </LocaleProvider>
</ThemeProvider>
```

**Why:** this is the drilled version's nightmare scenario — a second ambient value — costing the context version *zero* courier edits: new module, two consumers, one wrapper in `App`. Each concern keeps its own context (project 33's rule: theme and locale change independently), and each hook fails loudly on its own boundary. The shape is boilerplate on purpose: once it's muscle memory, every ambient value ships the same way.

### 4. The toggle that stopped toggling

Chain: click → `toggleTheme` → `setTheme('dark')` → `ThemeProvider` re-renders with `theme = 'dark'` → `useMemo` sees deps `[]` unchanged and returns the **old** `{ theme: 'light', ... }` object → the Provider's `value` is `Object.is`-identical to last render, so **no consumer is notified** — and separately, `{children}` is the same element objects as before (`App` didn't re-render), so React bails out of re-rendering the subtree. Two mechanisms, one result: state says `dark`, every pixel says `light`, forever. No error, because nothing *failed* — everything was told "no change." Fix: deps `[theme]`.

**Why:** a provider's memoized value is the single wire every consumer listens to; freeze its identity and you've unplugged the app from its own state. This is project 27's "lying deps return stale data" escalated to its worst case — staleness broadcast app-wide. When a context update mysteriously doesn't propagate, audit the provider's `useMemo` deps first.

### 5. Remembered theme

```jsx
function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('theme') || 'light'; }
    catch { return 'light'; }
  });

  useEffect(() => {
    try { localStorage.setItem('theme', theme); }
    catch {} // storage unavailable: persistence off, app fine
  }, [theme]);

  const value = useMemo(
    () => ({ theme, toggleTheme: () => setTheme((t) => (t === 'light' ? 'dark' : 'light')) }),
    [theme],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
```

**Why:** the lazy initializer (`useState(fn)`) reads storage exactly once, at mount — passing `localStorage.getItem(...)` directly would re-read on every render for a value that's then ignored. The effect keyed on `[theme]` mirrors every real change back to storage, keeping "save" out of the click handler so *any* future setter stays persistent automatically. Both touches are wrapped in `try/catch` because storage genuinely throws in some browsers' private modes — persistence should degrade, not crash. And because it all lives inside the provider, every consumer got a remembered theme without changing a character — encapsulation earning rent.
