# Templates

Skeletons for one mission. Copy the whole set into
`content-src/<worldId>/<NNN>-<slug>/`, then replace every `<placeholder>`.

| file | notes |
|---|---|
| `LEARN.md` | **required in every mission** — it is the Field Manual. First paragraph → mission `summary`; first 8 headings → mission `concepts`. |
| `README.md` | short framing and acceptance criteria |
| `PRACTICE.md` | graded exercises |
| `attempt.js` | learner starter — must contain the literal string `TODO` in the thrown error |
| `attempt.test.js` | uses the skip guard so a fresh checkout never fails |
| `solution.js` | **gated** — must actually pass `solution.test.js` |
| `solution.test.js` | **gated** — no skip guard |
| `gates.json` | the exact 3-gate template, extracted verbatim from live catalog data. Consumed by the generator, **not** copied into mission directories. Substitute `<TITLE>` (mission title) and `<FIRST CONCEPT>` (first entry of `concepts`). Keep the curly quotes. |

Per-world extensions: `.ts` for `typescript`, `.tsx` for `react`,
`Program.cs` / `Tests.cs` / `Check.cs` / `refactored.csproj` for `csharp`,
`index.html` + `app.js` + `style.css` for `apps`. See `../04-authoring-style.md`.

Naming matters: anything matching
`/(?:^|\/)(?:refactored|solution)(?:\/|\.|$)|SOLUTION\.md$/i` is hidden from the learner until
the prediction gate is cleared. Learner-facing files must not match it.
