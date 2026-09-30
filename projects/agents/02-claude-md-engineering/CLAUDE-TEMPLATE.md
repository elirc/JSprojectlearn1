# CLAUDE.md template

Copy the skeleton below into the directory whose sessions it should steer.
Every line must pass the test: *the agent gets this wrong without it, and it
comes up repeatedly.* Delete every heading you have nothing for.

```markdown
# <Project name>

<One sentence: what this codebase is.>

## Commands

- Build: `<command>`
- Test: `<command>`
- Verify before done: `<command>`

## Constraints

- <Thing the agent must never do> — <six-word why>. Do <alternative> instead.
- <Generated or hash-verified file> is never hand-edited; regenerate with `<command>`.

## Conventions

- <Convention the codebase shows inconsistently, stated as an imperative.>

## Layout notes

- <Only the directories whose purpose is not guessable from their names.>
```

Writing checklist (from LEARN.md, condensed):

- [ ] Imperative, specific, one line each
- [ ] Every "don't" has a "do instead"
- [ ] Arbitrary-looking rules carry a six-word why
- [ ] Nothing the code or README already says
- [ ] Short enough to read in 30 seconds
