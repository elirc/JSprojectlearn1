# 🏋️ Practice: Template Engine

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. Arrays were already invited (warm-up)

Nobody tested arrays, but read `lookup` closely: paths are split on dots and applied with `value?.[key]` — and arrays accept string indexes. Predict, then pin with a test: `{{items.1}}` with `{ items: ['alpha', 'beta'] }` renders `'beta'`, and `{{items.0}} of {{items.length}}` renders `'alpha of 2'`.

**Practices:** discovering what generic code already handles — capability you get free from choosing good primitives.

**Hint:** the path regex `[\w.]+` happily matches digits, and `.length` is just another property.

### ⭐⭐ 2. Default values: `{{name|friend}}` (core)

Extend the double-brace regex with an optional `|fallback` part: when the lookup comes back `null`/`undefined`, render the fallback text instead. Expected: `render('Hi {{name|friend}}!', {})` → `'Hi friend!'`; with `{name: 'Ada'}` → `'Hi Ada!'`; plain `{{name}}` keeps its old empty-string behavior; and — the important one — `{{x|<b>}}` with no data renders `'&lt;b&gt;'`, because the fallback is *also* escaped.

**Practices:** growing a regex with an optional capture group, and holding the security line while doing it.

**Hint:** `/\{\{\s*([\w.]+)\s*(?:\|([^}]*))?\}\}/g` — then `lookup(...) ?? fallback ?? ''`.

### ⭐⭐ 3. Strict mode for template typos (core)

`{{nmae}}` silently renders as nothing — friendly in production, maddening in development. Add an option: `render(template, data, { strict: true })` throws a `ReferenceError` naming the path whenever a lookup returns `undefined`. Expected: strict rendering of `'Hi {{nmae}}!'` against `{name: 'Ada'}` throws `/nmae/`; non-strict still renders `'Hi !'`; valid strict templates render normally.

**Practices:** the forgiving-default/loud-option pattern, and project 30's typed errors.

**Hint:** wrap the lookup in one `resolve(path)` helper used by both replace passes, so the rule lives in one place.

### ⭐⭐ 4. A filter registry: `{{price:money}}` (core)

Generalize LEARN's formatter experiment into a *registry*: `render(template, data, { filters })` where `{{path:filterName}}` looks up the value, passes it through `filters[filterName]`, then escapes the result. Expected with `money: v => '$' + Number(v).toFixed(2)` and `shout: v => String(v).toUpperCase()`: `{{price:money}}` with `{price: 3}` → `'$3.00'`; `{{name:shout}}!` → `'ADA!'`; `{{evil:shout}}` with `'<x>'` → `'&lt;X&gt;'` (filter first, escape always); an unknown filter name throws.

**Practices:** the callback as an extension point — logic in the replacement function, vocabulary supplied by the caller (project 31's rule-registry idea).

**Hint:** regex `/\{\{\s*([\w.]+)(?::(\w+))?\s*\}\}/g` — two capture groups arrive as two callback parameters.

### ⭐⭐⭐ 5. Loops: `{{#each items}}...{{/each}}` (challenge)

Add list sections: the body between `{{#each path}}` and `{{/each}}` is rendered once per item, with the *item* as the data context; `{{.}}` refers to the item itself (extend `lookup` so the path `'.'` returns `data`). A missing list renders as `''`. Expected: `'<ul>{{#each users}}<li>{{name}}</li>{{/each}}</ul>'` with users Ada and `'<evil>'` → `'<ul><li>Ada</li><li>&lt;evil&gt;</li></ul>'` (escaping survives inside loops!), and `'{{#each tags}}[{{.}}]{{/each}}'` with `['a', '<b>']` → `'[a][&lt;b&gt;]'`.

**Practices:** recursion through templates — a section body is itself a template, rendered with a narrower context.

**Hint:** section regex `/\{\{#each\s+([\w.]+)\s*\}\}([\s\S]*?)\{\{\/each\}\}/g` (non-greedy body, `[\s\S]` so it crosses newlines); run it *before* the brace passes, and let its callback call `render(body, item)` recursively.

## Solutions

### 1. Array test

```js
test('paths reach into arrays: indexes and length', () => {
  const data = { items: ['alpha', 'beta'] };
  assert.equal(render('{{items.1}}', data), 'beta');
  assert.equal(render('{{items.0}} of {{items.length}}', data), 'alpha of 2');
});
```

**Why:** `lookup` never says "object" anywhere — it just chains `?.[key]`, and arrays are objects whose keys are `'0'`, `'1'`, and `'length'`. Generic building blocks pay rent in features you never wrote.

### 2. Default values

```js
.replace(/\{\{\s*([\w.]+)\s*(?:\|([^}]*))?\}\}/g,
  (_, path, fallback) => escapeHtml(lookup(data, path) ?? fallback ?? ''))
```

**Why:** the optional non-capturing group `(?:\|...)?` means old templates match exactly as before (the suite still passes), and the two-step `?? fallback ?? ''` keeps the old empty-string behavior when there's no pipe. Routing the fallback through `escapeHtml` is the non-negotiable part — template literals are author-controlled today, but the escape-by-default rule doesn't do exceptions. Verified with node.

### 3. Strict mode

```js
export function render(template, data, { strict = false } = {}) {
  const resolve = (path) => {
    const value = lookup(data, path);
    if (strict && value === undefined) {
      throw new ReferenceError(`Template path not found: ${path}`);
    }
    return value;
  };
  return template
    .replace(/\{\{\{\s*([\w.]+)\s*\}\}\}/g, (_, path) => String(resolve(path) ?? ''))
    .replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, path) => escapeHtml(resolve(path) ?? ''));
}
```

**Why:** "missing renders as `''`" is the right *production* default (a typo shouldn't blank a page), but development wants typos loud — so the behavior is a parameter, not a rewrite. One `resolve` helper keeps the strictness rule in a single place serving both passes.

### 4. Filters

```js
.replace(/\{\{\s*([\w.]+)(?::(\w+))?\s*\}\}/g, (_, path, filterName) => {
  let value = lookup(data, path) ?? '';
  if (filterName) {
    const filter = filters[filterName];
    if (!filter) throw new ReferenceError(`Unknown filter: ${filterName}`);
    value = filter(value);
  }
  return escapeHtml(value);
});
```

**Why:** the replacement callback is where logic belongs (the README's whole point about callbacks vs replacement strings), and taking `filters` as data makes the logic *extensible* without touching the engine — the same rules-as-vocabulary move as project 31. Order is a security decision: filter first, escape last, so no filter output can sneak markup past the default. Verified: `$3.00`, `ADA!`, `&lt;X&gt;`, and the unknown-filter throw.

### 5. `{{#each}}`

```js
export function lookup(data, path) {
  if (path === '.') return data; // the current item itself
  return path.split('.').reduce((value, key) => value?.[key], data);
}

export function render(template, data) {
  return template
    .replace(/\{\{#each\s+([\w.]+)\s*\}\}([\s\S]*?)\{\{\/each\}\}/g, (_, path, body) => {
      const items = lookup(data, path) ?? [];
      return items.map((item) => render(body, item)).join('');
    })
    .replace(/\{\{\{\s*([\w.]+|\.)\s*\}\}\}/g, (_, path) => String(lookup(data, path) ?? ''))
    .replace(/\{\{\s*([\w.]+|\.)\s*\}\}/g, (_, path) => escapeHtml(lookup(data, path) ?? ''));
}
```

**Why:** the section pass runs first (replacement order as correctness, again) and its callback re-enters `render` with the item as the new context — a template engine becomes recursive the same way `deepEqual` did, by treating the inner thing as a smaller instance of the whole problem. Escaping needs no special handling inside loops because each iteration goes through the same default-safe passes; verified with a hostile `<evil>` list item coming out inert.
