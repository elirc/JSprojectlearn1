# 📘 Learning Guide: Context for Prop Drilling (Project 34)

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A page of nested boxes, like Russian dolls, each labeled: Page → Toolbar → ActionsMenu → SaveSection → and finally, at the bottom, a **Save button**. The button is styled by the current theme (light or dark), and clicking it toggles the theme — the whole page flips to dark colors and back.

The original and the refactor look **identical on screen**. That's on purpose. The difference is entirely in the code: in the original, the word `theme` appears in five component signatures while only one component uses it; in the refactor it appears in zero of them. This project is about the *shape* of the code, not the pixels.

## 2. Concepts you need first

### Prop drilling

Props flow parent → child, one level per hop. When a value is needed five levels down, every level must accept it and pass it along:

```jsx
function A({ theme }) { return <B theme={theme} />; }   // doesn't use it
function B({ theme }) { return <C theme={theme} />; }   // doesn't use it
function C({ theme }) { return <p className={theme}>hi</p>; } // uses it!
```

`A` and `B` are **couriers**: they carry cargo they never open. That pattern — many levels of pure forwarding to reach a distant reader — is called **prop drilling**. Note the honest nuance: passing a prop one or two levels is just normal data flow and often *better* than the alternatives; drilling is the pathology of long courier chains.

### Ambient values

Some values are needed *anywhere* in the app but owned by no particular branch: the theme, the current language ("locale"), the logged-in user, feature flags. Call these **ambient** values. They're the natural fit for context. Values one branch owns are not — keep those as props.

### Context: the tunnel (recap)

Project 33's LEARN.md builds this from scratch. Recap: `createContext` makes a channel; `<X.Provider value={v}>` supplies `v` to everything inside; `useContext(X)` in any descendant reads it directly, skipping every level in between.

### The Provider + custom hook packaging

The professional way to ship a context is as a little module with two exports:

```jsx
const ThemeContext = createContext(null);

function ThemeProvider({ children }) {          // owns the state
  const [theme, setTheme] = useState('light');
  return <ThemeContext.Provider value={...}>{children}</ThemeContext.Provider>;
}

function useTheme() {                           // the only consumption door
  const ctx = useContext(ThemeContext);
  if (ctx === null) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
```

- **`children`** is the special prop holding whatever JSX the caller nests inside your component — `<ThemeProvider><App/></ThemeProvider>` gives `children = <App/>`.
- **A custom hook** is just a function starting with `use` that calls other hooks. `useTheme()` reads nicer than `useContext(ThemeContext)` and — crucially — **fails loudly**: if someone forgets the provider, they get a named error at the exact call site instead of a mysterious "cannot read properties of null" crash somewhere else later.

### Stabilizing the provider value (recap)

`value={{ theme, toggleTheme }}` written inline would be a fresh object every render, waking all consumers needlessly — project 30/33's lesson. The provider wraps it in `useMemo`.

### The composition alternative

Before reaching for context at all, sometimes restructuring dissolves the drilling: if the middle components took `children`, the top could render `<Page><SaveButton theme={theme}/></Page>` — the button sits next to its data, and nothing drills. (Project 06's lesson.) Context is for when consumers are genuinely scattered.

## 3. Walking through the original code

```jsx
function Page({ theme, onToggleTheme }) {          // carries theme (doesn't use it)
  return (
    <div className="box">
      Page
      <Toolbar theme={theme} onToggleTheme={onToggleTheme} />
    </div>
  );
}
```

`Page` accepts two props and hands both straight to `Toolbar`, using neither. The file repeats this shape *verbatim* for `Toolbar` → `ActionsMenu` → `SaveSection`: four couriers, each one line of forwarding.

```jsx
function SaveButton({ theme, onToggleTheme }) {     // FINALLY uses it
  return (
    <button
      style={theme === 'dark'
        ? { background: '#444', color: '#fff' }
        : { background: '#eee', color: '#000' }}
      onClick={onToggleTheme}
    >
```

Level five: the only real reader. It styles itself by theme and toggles on click.

```jsx
function App() {
  const [theme, setTheme] = useState('light');
  const toggle = () => setTheme(theme === 'light' ? 'dark' : 'light');
  return (
    <div className={theme}>
      <h1>Prop drilling</h1>
      <Page theme={theme} onToggleTheme={toggle} />
```

The state lives at the top (correct — the whole page's colors depend on it via the `className`), and the courier chain begins.

## 4. What's wrong with it (in beginner terms)

Nothing goes wrong *on screen* — this is a code-health flaw, the kind you feel weeks later. Here's what "going wrong" looks like in practice:

- **The change amplifier.** Product asks: "also show the current language next to Save." That's one new ambient value → you edit **five** component signatures and five call sites, walking the same hallway again. Then feature flags arrive. Then the current user. Every hallway walk widens every signature.
- **The rename tax.** Rename `theme` to `colorMode`? Five files (in a real app), five diffs, five chances for a typo.
- **Reuse is poisoned.** Want to use `Toolbar` on another page that has no theme? Its signature demands `theme` and `onToggleTheme` anyway. The couriers are *coupled to cargo they don't care about* — their props lie about what they need.
- **Reading is harder.** A newcomer scanning `ActionsMenu` sees `theme` in its signature and must trace code to learn the truth: it's decoration passing through.

Count the cost in the file itself: `theme` appears in five signatures; one component reads it. Four of the five mentions are pure freight.

## 5. Try it yourself first!

1. **Vague:** the goal is for `SaveButton`, five levels deep, to reach the theme *directly* — no middle component touching it. What React feature lets a value skip levels?
2. **Warmer:** you'll need three pieces: a context object, a component that owns the theme state and provides it, and a way for `SaveButton` to consume it. Sketch each.
3. **Specific:** build `ThemeContext` + `ThemeProvider` (owning `useState`, providing `{ theme, toggleTheme }` — memoized!) + a `useTheme()` hook that throws when there's no provider. Then delete `theme`/`onToggleTheme` from all five signatures and call `useTheme()` inside `SaveButton`.
4. **Gotcha to watch for:** `App` also uses `theme` for the wrapper `className`. But `App` *renders* the provider — it can't consume its own context. How do you give the wrapper access? (Hint: a small component *inside* the provider.)
5. **Check yourself:** the page must look and behave identically; the middle four components must have zero props.

## 6. Understanding the refactored solution

The theme became a self-contained module at the top of the file:

```jsx
function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');
  const value = useMemo(
    () => ({
      theme,
      toggleTheme: () => setTheme((t) => (t === 'light' ? 'dark' : 'light')),
    }),
    [theme],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
```

The provider owns the state, and its value is stabilized with `useMemo` (project 33's discipline — consumers wake only for real theme changes). `toggleTheme` uses the updater form `t => ...`, so it needs nothing from outside.

```jsx
function useTheme() {
  const context = useContext(ThemeContext);
  if (context === null) {
    throw new Error('useTheme must be used inside <ThemeProvider>');
  }
  return context;
}
```

The custom hook is the **only consumption door**. The null-check turns "forgot the provider" from a cryptic downstream crash into a named, immediate error — fail loud at the boundary. This Provider+hook shape is the standard packaging for every context you'll ever ship.

```jsx
function Page() {
  return <div className="box">Page<Toolbar /></div>;
}
```

The couriers shrank to this. Zero props, all four of them. And the two components that *use* the theme reach straight up:

```jsx
function SaveButton() {
  const { theme, toggleTheme } = useTheme(); // reach straight up
```

```jsx
function ThemedShell({ children }) {
  const { theme } = useTheme();
  return <div className={theme}>{children}</div>;
}
```

`ThemedShell` answers the gotcha from section 5: `App` itself sits *outside* the provider, so a tiny component inside it consumes the theme and applies the page-level class. Adding a consumer six levels deep is now one hook call, zero signature changes.

**What belongs in context** (the README's checklist): ambient, slow-changing, read-in-many-places values — theme, locale, current user, feature flags. What doesn't: anything one branch owns (use props), anything fast-changing (project 33's firehose), or "all app state" (project 41 shows the disciplined version of that).

## 7. Words you learned (glossary)

- **Prop drilling:** passing a prop through many components that only forward it.
- **Courier component:** a component that carries a prop without using it.
- **Ambient value:** app-wide, owned-by-no-branch data (theme, locale, current user, flags).
- **Context / Provider / consumer:** the skip-levels channel (built from scratch in project 33's LEARN.md).
- **`children`:** the special prop containing the JSX nested inside a component's tags.
- **Custom hook:** a `useXxx()` function that wraps other hooks behind a nicer, safer interface.
- **Fail loud / fail at the boundary:** throwing a clear error where the mistake is made, instead of letting a null crash something distant.
- **Stabilized value:** a provider's object wrapped in `useMemo` so its identity changes only on real changes (projects 30/33).
- **Updater form:** `setX(prev => next)` — computes new state from old without reading render scope.
- **Coupling:** one piece of code being forced to know about another's concerns; couriers are coupled to cargo.
- **Composition:** structuring with `children` so components sit next to their data — sometimes dissolves drilling with no context at all.

## 8. Experiments to try on the plane (no internet needed)

(One-time note, detailed in project 27's LEARN.md: the pages load React from a CDN, so *running* them needs internet on first load; reading and editing don't.)

1. **Trigger the loud failure.** In the refactor, remove `<ThemeProvider>` (render `<ThemedShell>...</ThemedShell>` directly). Prediction: the page shows an error mentioning "useTheme must be used inside <ThemeProvider>" — the guard working as designed. Then delete the null-check from `useTheme` and try again: a far less helpful "cannot read properties of null" style crash. That difference is the whole argument for the guard.
2. **Add a themed component deep down.** Give `ActionsMenu` a themed border: call `useTheme()` inside it and set `style={{ borderColor: theme === 'dark' ? '#f90' : '#36c' }}` on its div. Prediction: works with zero signature changes anywhere — the exact edit that would have cost five signature edits in the original.
3. **Do the same edit in the original.** Now add that themed border to the original's `ActionsMenu` using only props. Prediction: you already have `theme` there — but ask yourself *why* it's there, and what you'd do if `ActionsMenu` hadn't been on the courier path.
4. **Try the composition alternative.** In the *original*, change `Page` to `function Page({ children }) { return <div className="box">Page{children}</div>; }` and have `App` render `<Page><SaveButton theme={theme} onToggleTheme={toggle} /></Page>` (flattening the chain). Prediction: drilling gone with no context at all — and a feel for when `children` beats both drilling and context.
