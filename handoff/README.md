# HANDOFF — 10x curriculum expansion (334 → 3,340 missions)

> **Status note (2026-10-06):** this plan was not executed. The catalog holds 336 entries (331 missions), and there is no `content-src/` folder and no `scripts/build-content.mjs`. The growth since this was written came from the Effect Forge and Agent Works worlds (see `projects/README.md`), not from this expansion. Treat the rest of this folder as a design record.

You are picking up work on **SkillForge Quest**, the React + TypeScript learning app in this
repository. This folder is self-contained: it was
written specifically so you can start without any prior conversation context.

## The job

The user wants **ten times the number of missions**, authored in the same style as the
existing ones.

- Today: **334 missions**
- Target: **3,340 missions** (= **3,006 new**)
- The user asked for this to be produced with **~20 parallel Opus subagents**.
- "Same style as the existing" means matching the existing lesson shape and voice — see
  `04-authoring-style.md`. It does **not** mean thin filler entries.

Nothing has been generated yet. Work has not started.

## Read in this order

| file | what it gives you |
|---|---|
| `01-repo-state.md` | current repo state, **the git commit you must make first** |
| `02-content-system.md` | exactly how missions are stored, the verified metadata formulas, the gate template, the runtime constraints |
| `03-expansion-spec.md` | per-world targets, ID/order/prerequisite rules, what to update in the catalog and report |
| `04-authoring-style.md` | the mission file shape and the `LEARN.md` house style |
| `05-execution-plan.md` | the generator-first build order, wave plan, ready-to-paste agent prompt |
| `06-verification-and-risks.md` | what must stay green, and the decisions to make before wave 1 |
| `templates/` | copy-paste skeletons for every file in a mission |

## The one thing not to get wrong

Do **not** have subagents write mission JSON by hand. Every archived file carries a SHA-256
that `npm run verify:content` recomputes and checks. Agents author plain lesson files under
`content-src/`; a generator script you write (`scripts/build-content.mjs`) is the only thing
that touches `public/content/`. Details in `05-execution-plan.md`.

## 60-second orientation

```bash
npm run verify:content   # prints world/mission/file/gate counts, must end in PASS
node -e "const c=require('./public/content/catalog.json');console.log(c.missions.length,c.worlds.map(w=>w.id+':'+w.missionCount).join(' '))"
node -e "const j=require('./public/content/missions/dsa-dsa-01-two-sum.json');console.log(j.files.map(f=>f.path+' '+f.bytes))"
cat scripts/verify-content.mjs          # the whole contract, 30 lines
sed -n '680,700p;1170,1183p' src/App.tsx  # Field Manual pick + reference-lock regex
```

Read `public/content/missions/dsa-dsa-01-two-sum.json` in full before authoring anything. It
is the canonical style reference.
