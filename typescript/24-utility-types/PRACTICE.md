# 🏋️ Practice: Utility Types

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

Work in a scratch file (e.g. `typescript/24-utility-types/practice.ts`, ending with `export {}`) — these exercises use a fresh domain, so you won't need the refactored file's code, just its ideas. Check with `npm run typecheck` from the `typescript/` folder.

All exercises build on this source of truth:

```ts
interface Article {
  id: number;
  title: string;
  body: string;
  tags: string[];
  createdAt: Date;
}
```

## Exercises

### ⭐ 1. Three formulas for `Article` (warm-up)

Derive three shadows: `ArticlePatch` (everything optional, for PATCH), `ArticlePreview` (only `id`, `title`, `tags` — for list pages), and `DraftArticle` (everything except the server-assigned `id` and `createdAt`). No hand-copied field lists allowed.

Practices: choosing the right formula — `Partial`, `Pick`, `Omit` — for each intent.

Hint: match the intent words: "all optional" / "just these" / "all except these".

Check: all three must compile as one-liners. Add `@ts-expect-error` type tests that a preview carrying `body` and a draft smuggling `id: 99` both fail with roughly "not assignable / not in type".

### ⭐⭐ 2. `Record` over a union key (core)

Define `type Role = 'admin' | 'member' | 'guest'` and `interface Permissions { canEdit: boolean; canDelete: boolean }`, then derive `RolePermissions = Record<Role, Permissions>` and write a value of it. The point to notice: a `Record` keyed by a union is *exhaustive* — every role must appear.

Practices: `Record<K, V>` with a literal-union `K` as a checked, complete table.

Hint: three keys, three `Permissions` objects — then try deleting one.

Check: your full table must compile. Add `@ts-expect-error` tests that (a) a table missing `guest` fails with roughly "property 'guest' is missing", and (b) an extra `superuser` key is rejected.

### ⭐⭐ 3. `Required` — the fourth direction (core)

`Partial` loosens; `Required` tightens. Given `interface Settings { theme?: 'light' | 'dark'; fontSize?: number; locale?: string }` (user input, all optional), derive `ResolvedSettings = Required<Settings>` and write `resolveSettings(overrides: Settings, defaults: ResolvedSettings): ResolvedSettings` using two spreads.

Practices: `Required<T>`, and the classic optional-in, guaranteed-out defaults pattern.

Hint: spread defaults first, overrides second: `{ ...defaults, ...overrides }`.

Check: `resolveSettings({ theme: 'dark' }, fullDefaults).fontSize` must type as plain `number` (no `| undefined`). Add a `@ts-expect-error` test that a `ResolvedSettings` literal missing `locale` fails.

### ⭐⭐ 4. Formulas in a signature + `Readonly` (core)

Write `updateArticle(id: Article['id'], patch: Partial<Omit<Article, 'id'>>): void` — the patch may touch anything *except* the id, and the composition says so. Then write `render(article: Readonly<Article>): string` and confirm the compiler blocks mutation inside it.

Practices: composing utility types inline in signatures; `Readonly<T>` as a do-not-touch contract.

Hint: read `Partial<Omit<...>>` inside-out — drop `id`, then make the rest optional.

Check: `updateArticle(1, { title: 'renamed' })` must compile; `updateArticle(1, { id: 2 })` must error (excess property). Inside `render`, `article.title = 'x'` must error with roughly "cannot assign to 'title' because it is a read-only property" — keep it as a `@ts-expect-error` test.

### ⭐⭐⭐ 5. Override one field: the `Omit`-and-intersect formula (challenge)

Sometimes a variation *changes* a field's type instead of adding/removing it. Derive `LocalizedArticle`: like `Article`, but `title` is `Record<'en' | 'de', string>` instead of `string`. Plain intersection `Article & { title: ... }` won't work (the two `title`s collide into an impossible type) — remove first, then add.

Practices: the standard field-override formula: `Omit<T, K> & { K: NewType }`.

Hint: `Omit<Article, 'title'> & { title: Record<'en' | 'de', string> }`.

Check: a value with `title: { en: 'Hello', de: 'Hallo' }` must compile. Add a `@ts-expect-error` test that `title: 'Hello'` (a plain string) fails.

### ⭐⭐⭐ 6. Write your own utility: `ApiPayload<T>` (challenge)

The built-ins are just one-line mapped types — write one. `ApiPayload<T>` should keep every field of `T` as-is, except fields typed `Date` become `string` (JSON has no dates). Then check `ApiPayload<Article>` behaves: `createdAt` is a `string`, `tags` stays `string[]`.

Practices: a custom mapped + conditional type in the same "derive, don't copy" spirit (exercise 25 and 27 go deeper).

Hint: `{ [K in keyof T]: T[K] extends Date ? string : T[K] }`.

Check: a payload literal with `createdAt: '2026-08-22T00:00:00Z'` must compile; add a `@ts-expect-error` test that `createdAt: new Date()` fails with roughly "Date is not assignable to string".

## Solutions

### 1. Three formulas

```ts
type ArticlePatch = Partial<Article>;
type ArticlePreview = Pick<Article, 'id' | 'title' | 'tags'>;
type DraftArticle = Omit<Article, 'id' | 'createdAt'>;

const preview: ArticlePreview = { id: 1, title: 'Hi', tags: ['ts'] };
// @ts-expect-error — previews must not carry the full body
const fatPreview: ArticlePreview = { id: 1, title: 'Hi', tags: [], body: 'all of it' };
// @ts-expect-error — drafts can't smuggle a server-assigned id
const sneakyDraft: DraftArticle = { title: 'x', body: 'y', tags: [], id: 99 };
```

WHY: each alias is a formula over `Article`, so adding a field to `Article` later updates all three correctly per their own intent — optional in the patch, absent from the preview unless picked, required in the draft. The two type tests are the payoff: shapes that would have silently drifted as hand-copies are now compile errors.

### 2. `RolePermissions`

```ts
type Role = 'admin' | 'member' | 'guest';
interface Permissions { canEdit: boolean; canDelete: boolean }
type RolePermissions = Record<Role, Permissions>;

const perms: RolePermissions = {
  admin: { canEdit: true, canDelete: true },
  member: { canEdit: true, canDelete: false },
  guest: { canEdit: false, canDelete: false },
};
// @ts-expect-error — Record over a union demands every role: guest is missing
const partial: RolePermissions = { admin: perms.admin, member: perms.member };
// @ts-expect-error — unknown roles are rejected
const extra: RolePermissions = { ...perms, superuser: { canEdit: true, canDelete: true } };
```

WHY: `Record<Role, Permissions>` is a *complete* table — the compiler demands one entry per union member and rejects strangers, so adding `'moderator'` to `Role` later instantly flags every permissions table in the codebase as incomplete. That's the drift-proofing from the lesson applied to configuration data instead of interfaces.

### 3. `Required` + defaults

```ts
interface Settings { theme?: 'light' | 'dark'; fontSize?: number; locale?: string }
type ResolvedSettings = Required<Settings>;

function resolveSettings(overrides: Settings, defaults: ResolvedSettings): ResolvedSettings {
  return { ...defaults, ...overrides };
}
const resolved = resolveSettings({ theme: 'dark' }, { theme: 'light', fontSize: 14, locale: 'en' });
const size: number = resolved.fontSize; // ✅ no undefined
// @ts-expect-error — Required means every field must be present
const incomplete: ResolvedSettings = { theme: 'light', fontSize: 14 };
```

WHY: `Required<Settings>` strips every `?`, so the return type *guarantees* downstream code a fully-populated object — no `!`, no `?? fallback` at each use site. The two-spread body is checked, too: defaults provide all fields, overrides can only narrow them, and both types are formulas over one `Settings` source of truth.

### 4. Signature composition + `Readonly`

```ts
function updateArticle(id: Article['id'], patch: Partial<Omit<Article, 'id'>>): void {
  void id; void patch;
}
updateArticle(1, { title: 'renamed' }); // ✅
// @ts-expect-error — the id can't ride along inside the patch
updateArticle(1, { id: 2, title: 'renamed' });

function render(article: Readonly<Article>): string {
  // @ts-expect-error — Readonly makes every field read-only
  article.title = 'mutated';
  return article.title;
}
```

WHY: `Partial<Omit<Article, 'id'>>` composes two intents — "not the id" and "any subset" — directly in the signature, so the rule "patches can't change identity" is enforced at every call site instead of documented in a comment. `Readonly<Article>` is the mirror promise in the other direction: `render` declares it won't mutate, and the compiler holds it to that.

### 5. `LocalizedArticle`

```ts
type LocalizedArticle = Omit<Article, 'title'> & { title: Record<'en' | 'de', string> };

const localized: LocalizedArticle = {
  id: 1, body: 'b', tags: [], createdAt: new Date(),
  title: { en: 'Hello', de: 'Hallo' },
};
// @ts-expect-error — the override replaced string with the translations record
const plainTitle: LocalizedArticle = { id: 1, body: 'b', tags: [], createdAt: new Date(), title: 'Hello' };
```

WHY: intersecting without omitting would demand a `title` that is *both* `string` and the record — an impossible type nothing satisfies. `Omit` first removes the old `title`, then the intersection adds the new one cleanly. Every non-title field still tracks `Article`, so this stays a formula: rename `body` in the source and `LocalizedArticle` follows.

### 6. `ApiPayload<T>`

```ts
type ApiPayload<T> = { [K in keyof T]: T[K] extends Date ? string : T[K] };
type ArticlePayload = ApiPayload<Article>;

const wire: ArticlePayload = {
  id: 1, title: 't', body: 'b', tags: ['a'],
  createdAt: '2026-08-22T00:00:00Z', // Date became string
};
// @ts-expect-error — Dates serialize to strings on the wire
const stillDate: ArticlePayload = { id: 1, title: 't', body: 'b', tags: ['a'], createdAt: new Date() };
const keptTags: string[] = wire.tags; // ✅ untouched
```

WHY: this is exactly how the built-ins are made — a mapped type walks the keys, a conditional type transforms the ones that match. `ApiPayload` works for *any* interface, not just `Article`, so the "wire version" of every type in the codebase is now derived instead of hand-copied — one more shadow that can never rot.
