# TS 18 — keyof & indexed access

**Lesson: property-access-by-name is a legitimate pattern — `keyof T` and
`T[K]` are how it gets typed, with key and value type *correlated*.**

## Run it

```
npm run typecheck
```

## What's wrong with the original?

The *pattern* is fine — settings panels, form builders, and column pickers
all need key-based access. What's missing is the types: `key: string` +
`(profile as any)[key]` means typo'd reads return `undefined`, typo'd
writes **create new fields** while the real one sits unchanged, and a
string waltzes into the `fontSize: number` slot — after which
`getSetting('fontSize')` returns `'sixteen'` *typed as `number`*, and
`fontSize + 2` renders `'sixteen2'` somewhere downstream. Four gambles,
four compiles.

## What changed in the refactor

- **`K extends keyof Profile`** — `keyof` turns an interface into the union
  of its key names (`'username' | 'fontSize' | 'darkMode'`), and the
  constraint (ts#17) admits only those. Typos in either direction are
  compile errors.
- **`Profile[K]` — indexed access — is the star**: "the type *at* that
  key." Because `K` is generic, the key and value types are **correlated**
  per call: `getSetting('fontSize')` returns `number`, `'darkMode'`
  returns `boolean`, and `setSetting('fontSize', 'sixteen')` is rejected —
  the exact correlation `string`+`any` could never express. (This
  key↔value correlation is the same idea project 20 scales up to event
  maps and project 32 to action payloads.)
- **`pluck<T, K extends keyof T>`** shows the idiom composing with full
  genericity — js#26's utilities finally get their true types:
  `pluck(users, 'id')` is `number[]`, `'email'` is an error. Project 19
  runs this treatment across the whole utility belt.
- Editor dividend, again: `getSetting('` autocompletes real keys, because
  the type *is* the list of keys.

## Key takeaway

When code touches properties by name, reach for the pair: `K extends
keyof T` to bound the names, `T[K]` to bind each name to its value type.
It converts the stringly-typed underworld of dynamic access into code
where the compiler knows exactly which door you're opening and what's
behind it.
