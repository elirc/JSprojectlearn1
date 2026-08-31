# 📘 Learning Guide: satisfies vs as

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What is this exercise about?

The code defines two chunks of literal data: a color theme (`primary`, `background`, `text`) that must match a `Theme` interface, and a table of route paths (`home: '/'`, `about: '/about'`...).

The type-level problem: when you write an object by hand and want the compiler to confirm it fits a contract, TypeScript gives you three different tools — an annotation (`:`), an assertion (`as`), and `satisfies`. They look similar. They behave completely differently. The original picks `as`, the one that checks *nothing*. This exercise teaches you what each one actually does.

## 2. Concepts you need first

### Inference and literal types (what the compiler figures out on its own)

Leave off any type and TypeScript **infers** one from the value:

```ts
const config = { port: 8080, host: 'local' };
// inferred: { port: number; host: string }
```

Notice it inferred `number`, not `8080`. For object properties, the compiler **widens** literals to their general type (because properties can be reassigned). The precise version — the type `8080` or `'local'` itself, called a **literal type** — is what "precision" means in this exercise: knowing not just "some strings" but *which keys and which strings*. (Exercise 02's LEARN.md covers inference basics.)

### Annotation (`: T`) — "this variable IS the general type"

```ts
interface Theme { primary: string }
const t: Theme = { primary: '#36c' };   // ✅ checked against Theme
t.primry;                                // ❌ Error: no such property
```

An annotation **checks** the value — missing or misspelled properties are errors. But the variable's type *becomes* exactly `Theme`. Whatever extra precision the value had is forgotten. That trade shows up sharply with `Record`:

```ts
const routes: Record<string, string> = { home: '/' };
routes.amdin;   // ✅ compiles! type says "any string key is fine"
```

`Record<string, string>` means "an object with string keys and string values" — *any* string key. The compiler checked the values, then forgot which keys exist. A typo'd lookup compiles and yields `undefined` at runtime.

### Assertion (`as T`) — "stop checking; I said so"

`as` does not check a value against a type. It **overrules** the compiler:

```ts
const t = { primary: '#36c' } as Theme;   // text/background missing —
t.text.toUpperCase();                      // ✅ compiles, 💥 crashes: undefined
```

The only guardrail: `as` requires the types to be vaguely related (you can't assert a number into an object without going through `unknown`). Related-but-incomplete sails through, which makes `as` most dangerous exactly where it looks most reasonable. Two legitimate uses exist — `as unknown` (removing power, exercise 13) and `as const` (exercise 31). Treat every other `as` as a confession that a check is being skipped.

### Excess property checking (a small built-in safety net)

When you assign an object *literal* directly against a known type, TypeScript flags unknown extra properties:

```ts
const t: Theme = { primary: '#36c', primry: '#f00' };
// ❌ Error: 'primry' does not exist in type 'Theme'
```

This typo-catcher works with annotations and with `satisfies` — but `as` bypasses it completely.

### `satisfies T` — "check it, but don't change it"

`satisfies` is the third tool, and the reason this exercise exists:

```ts
const routes = {
  home: '/',
  about: '/about',
} satisfies Record<string, string>;

routes.about;   // ✅ OK — and typed as the literal '/about'
routes.amdin;   // ❌ Error: property 'amdin' does not exist
```

Read it as: "verify this value fits the contract, then *keep the precise inferred type*." Missing properties: error. Excess/typo'd properties: error. But `routes`'s type still knows its exact keys, so lookups are checked and editors autocomplete the real names. Checked AND precise — the annotation's checking without the annotation's forgetting.

### The three tools, side by side

| Tool | Checks the value? | Resulting type |
|---|---|---|
| `: T` (annotation) | ✅ yes | `T` — widened, precision lost |
| `as T` (assertion) | ❌ no | `T` — claimed, possibly a lie |
| `satisfies T` | ✅ yes | the precise inferred type |

## 3. Walking through the original code

Open `original.ts`. The contract:

```ts
interface Theme {
  primary: string;
  background: string;
  text: string;
}
```

Attempt 1 — `as` on an incomplete object:

```ts
export const theme = {
  primary: '#3366cc',
  background: '#ffffff',
  // text is MISSING
} as Theme;
```

Three fields required, two provided. An annotation would have flagged this instantly. `as` waves it through. Now:

```ts
export const textColor: string = theme.text; // undefined, typed string
```

`theme.text` is typed `string` and is actually `undefined`. Anything that renders it gets the CSS color "undefined".

Attempt 2 — `as` also silences junk:

```ts
export const theme2 = {
  primary: '#3366cc', background: '#fff', text: '#111',
  primry: '#ff0000', // typo'd override that will never apply
} as Theme;
```

Someone meant to override `primary`. They typo'd. The intended red never applies, the old blue stays, and `as` suppressed the excess-property check that exists precisely to catch this.

Attempt 3 — the annotation alternative, with its own cost:

```ts
const routes: Record<string, string> = {
  home: '/', about: '/about', admin: '/admin',
};
export const adminPath = routes.amdin; // undefined, typed string
```

This one IS checked (all values must be strings) — but the type `Record<string, string>` says *any* string key exists, so the misspelled lookup compiles. The closing comment states the dilemma: annotate → checked but widened; `as` → precise but unchecked. The author didn't know about door number three.

## 4. What's wrong with it (in beginner terms)

**Flaw 1 — `as` is not a checked claim.** It reads like "this is a Theme." It means "treat this as a Theme *and do not verify*." The missing `text` field is exactly the kind of error type systems exist to catch, and one keyword opted out.

**Runtime story:** the design team asks why body text is invisible on one page. CSS shows `color: undefined`. You trace it to `theme.text` — a field the compiler swore was a `string`. The lie was planted at the `as` and harvested in the browser.

**Flaw 2 — the silenced typo.** `primry: '#ff0000'` is a dead field. The developer who added it saw their override "deployed" and moved on; the button stayed blue. No crash at all this time — just a change that silently never happened. Excess-property checking would have caught it; `as` turned it off.

**Flaw 3 — the widened table.** `routes.amdin` compiling is the annotation's failure mode: `Record<string, string>` promises every string key exists, so the compiler can't distinguish real routes from typos. `adminPath` is `undefined` typed as `string` — a 404 waiting for a click.

**The meta-flaw:** believing checking and precision are a forced trade. They aren't — that's what `satisfies` is for.

## 5. Try it yourself first!

1. **Vague hint:** For each of the three attempts, ask: "did the compiler actually *verify* this object? and does the resulting type still *remember* this object?" You want yes and yes.
2. **Warmer:** Replace `as Theme` with `: Theme` (annotation) on the first theme. Read the two errors that appear. Those errors are the bugs.
3. **Warmer still:** Now replace the annotation with `satisfies Theme` and fix the object until it compiles. Hover `theme` — what type does it show? Compare with the annotated version's hover.
4. **Specific:** For the routes table, delete the annotation and add `satisfies Record<string, string>` after the closing brace. Then retype `routes.amdin` and watch it fail. Try `routes.` in an editor and see the autocomplete list.
5. **Check yourself:** After your fix there should be zero `as` in the file, every object should be verified, and both typos (`primry`, `amdin`) should be compile errors.

## 6. Understanding the refactored solution

Open `refactored/config.ts`.

**The theme:**

```ts
export const theme = {
  primary: '#3366cc',
  background: '#ffffff',
  text: '#111111',
} satisfies Theme;
```

All three fields present — they have to be, or it won't compile. A typo'd extra won't compile either. And hover `theme`: its type is the precise object literal (each property known), not the widened `Theme`. Downstream code keeps full knowledge.

**The routes table — where precision pays rent:**

```ts
export const routes = {
  home: '/', about: '/about', admin: '/admin',
} satisfies Record<string, string>;

export const adminPath = routes.admin; // string — and routes.amdin is now a compile error
```

The contract check still runs (a `home: 0` fails — see the last type test). But `routes` keeps literal keys, so `routes.amdin` is a compile error now. The dilemma from the original — checked-but-vague vs precise-but-unchecked — simply dissolves.

**The decision table** (from the README, worth memorizing):

- `: T` — when you *want* widening: function parameters, empty arrays you'll fill later, variables that will be reassigned.
- `satisfies T` — literal data with a contract: configs, themes, route maps, lookup tables. Your default for hand-written objects.
- `as T` — almost never. Legitimate only when removing capability (`any → unknown`) or as `as const`.

**The four type tests** pin every failure mode: missing field rejected, excess field rejected, key typo rejected, wrong value type rejected. Each `@ts-expect-error` (a directive asserting "the next line must fail to compile") is a permanent guarantee the old bugs can't return.

## 7. Words you learned (glossary)

- **Inference** — the compiler deducing a type from a value, no annotation needed.
- **Literal type** — a type that is one exact value, like `'/about'` or `8080`.
- **Widening** — inference generalizing a literal (`'/about'` → `string`) so the variable stays flexible.
- **Annotation (`: T`)** — declares a variable's type; checks the value, then the type becomes `T` (widened).
- **Assertion (`as T`)** — overrides the compiler's opinion with yours; performs no check.
- **`satisfies T`** — verifies a value against a type while keeping the value's precise inferred type.
- **Excess property check** — the compiler flagging unknown extra keys in an object literal; bypassed by `as`.
- **`Record<K, V>`** — object type with keys `K` and values `V`; `Record<string, string>` forgets which specific keys exist.
- **`@ts-expect-error`** — a comment directive asserting the next line must fail to compile (this track's type tests).

## 8. Experiments to try on the plane (no internet needed)

Run `npm run typecheck` from the `typescript/` folder after each change. Undo between experiments.

1. **In `refactored/config.ts`**, delete the `text` line from `theme`. Expected: ❌ "Property 'text' is missing" right at the object — plus a second error where `textColor` reads it. Compare: in `original.ts` the same deletion produces silence. Same bug, two toolings.
2. **In `refactored/config.ts`**, add `primry: '#f00',` to `theme`. Expected: ❌ excess-property error naming `primry` — probably with a "Did you mean 'primary'?" hint. The compiler plays spellchecker when you let it.
3. **In `refactored/config.ts`**, change `satisfies Theme` to `: Theme` (annotation). Expected: ✅ compiles — checking survives. But hover `theme`: the type is now plain `Theme`, literals forgotten. Both check; only `satisfies` remembers.
4. **In `refactored/config.ts`**, add a route `login: 42,`. Expected: ❌ "Type 'number' is not assignable to type 'string'" — the `satisfies Record<string, string>` contract audits values even while preserving keys.
5. **Hover experiment (no edit needed):** hover `routes` in the refactored file, then hover it after temporarily swapping `satisfies` for the annotation `: Record<string, string>`. Precise: `{ home: string; about: string; admin: string }` — the compiler knows WHICH keys exist. Widened: just `Record<string, string>` — keys forgotten. That hover difference is this entire exercise in one tooltip. (Note the property *values* are `string` either way — to keep the literal `'/admin'` too, you'd write `as const satisfies Record<string, string>`, combining ts#31's lesson with this one.)
