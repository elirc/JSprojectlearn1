# 03 — Expansion spec: what to produce

## Targets

334 existing + **3,006 new = 3,340 missions**. Each world scales 10x.

| worldId | name | now | new | target | current order range | first new order | chain new missions from |
|---|---|---|---|---|---|---|---|
| `foundations` | Syntax Frontier | 17 | 153 | 170 | 1–17 | 18 | `foundations-foundations-root-start-here` |
| `apps` | Builder's Borough | 11 | 99 | 110 | 1–11 | 12 | `apps-24-image-to-ascii` |
| `engineering` | Refactor Ridge | 17 | 153 | 170 | 1–17 | 18 | `engineering-41-lru-cache` |
| `async` | Async Expanse | 19 | 171 | 190 | 1–19 | 20 | `async-60-router` |
| `product` | Product Citadel | 25 | 225 | 250 | 1–25 | 26 | `product-85-streaming-log-parser` |
| `typescript` | Type Temple | 53 | 477 | 530 | 1–53 | 54 | `typescript-typescript-overview` |
| `react` | React Reactor | 61 | 549 | 610 | 1–61 | 62 | `react-react-overview` |
| `dsa` | Algorithm Arena | 31 | 279 | 310 | 1–31 | 32 | `dsa-dsa-overview` |
| `production` | Production Nexus | 63 | 567 | 630 | 1–63 | 64 | `production-production-track-10-career-and-design` |
| `csharp` | C# Side Expedition *(optional)* | 37 | 333 | 370 | 1–37 | 38 | `csharp-csharp-overview` |
| | **total** | **334** | **3,006** | **3,340** | | | |

Derived totals after the expansion: **10,020 gates**, and `sourceFileCount` /
`archivedFileCount` rises from 1,839 by however many files you author (3,006 × 7 = 21,042 if
you use the standard 7-file shape → **22,881** total).

Recompute the "chain from" column yourself rather than trusting this table if anything has
changed:

```bash
node -e "const c=require('./public/content/catalog.json');const b={};for(const m of c.missions)if(!b[m.worldId]||m.order>b[m.worldId].order)b[m.worldId]=m;for(const[w,m]of Object.entries(b))console.log(w,m.order,m.id)"
```

Note several worlds currently end on an `…-overview` or `root-start-here` node. Appending
after it is correct — chain from whatever holds the highest `order` in that world.

## ID and path rules

```
sourceKey   = `${worldId}/${NNN}-${slug}`      e.g.  dsa/101-quickselect
id          = `${worldId}-${NNN}-${slug}`      e.g.  dsa-101-quickselect
contentFile = `missions/${id}.json`
file paths  = `${sourceKey}/${filename}`       e.g.  dsa/101-quickselect/LEARN.md
```

- **`NNN` starts at 101** in every world. The highest numeric segment in any existing id is 85 (`product-85-streaming-log-parser`), so 101+ cannot
  collide with an existing id. `foundations` runs 101–253, `react` 101–649, etc.
- `slug` is lowercase kebab-case, derived from the title, no world prefix inside it.
- The generator **must assert global `id` uniqueness** and fail loudly on a duplicate. With 20
  agents writing in parallel this is the failure that will actually happen.
- Existing ids are inconsistent (`dsa-dsa-01-two-sum` has a doubled segment because its
  `sourceKey` was `dsa/01-two-sum`). Do not retrofit them. New ids use the clean form above.

## Ordering and prerequisites

- Existing missions keep their `order` and `prerequisites` **unchanged**. Do not touch the
  cross-world entry points (e.g. `react` chains into `typescript-typescript-overview`).
- New missions are appended: `order` continues each world's sequence from the "first new
  order" column, incrementing by 1.
- `prerequisites = [id of the immediately preceding mission in the same world by order]` —
  one linear chain per world. The first new mission in a world chains from the "chain from"
  column above.
- `verify:content` rejects any mission with `order > 1` and an empty `prerequisites`.

## Files that must be updated (all of it by the generator)

**`public/content/catalog.json`**
- append 3,006 entries to `missions[]`
- update every `worlds[].missionCount` to the target column
- update `sourceFileCount`, `sourceBytes`, `generatedAt`
- `migrationFingerprint`: recompute (a hash over the sorted file hashes) or leave as-is; it is
  not validated by `verify:content`, but keeping it meaningful is better

**`public/content/missions/<id>.json`** — one new file per mission (`MissionContent`).

**`public/content/migration-report.json`**
- `missionCount` → 3340
- `worldCounts` → the target column
- `sourceFileCount` and `archivedFileCount` → both to the new total (they must be equal)
- `sourceBytes` → new total
- `sourceHashes[]` → append `{ path, bytes, sha256, missionId }` for every new file

**`README.md`** — the counts in the "Curriculum archive" section ("334 missions",
"1,002 gates", "1,839 preserved source files") and the world list.

**`MIGRATION_REPORT.md`** — the "Content retained" numbers, plus a short section recording the
expansion.
