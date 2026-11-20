[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/Ajwyunsx/gta6-trophy-guide-01/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/Ajwyunsx/gta6-trophy-guide-01/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)

# Leonida Ledger

A platinum tracker for **Grand Theft Auto VI** on PS5 — all 55 trophies, each with a guide written in my own words, a seven-stage roadmap, and a spoiler shield that keeps the 28 hidden story trophies dark until you have actually earned them.

No account, no server, no network. Open `app/index.html` and it works — from disk, from a USB stick, from a static host. Your ticks live in `localStorage`.

```
open app/index.html          # straight off the filesystem
node serve.ts                # or serve it on http://localhost:4173
```

## What is in the box

**55 trophies.** 1 platinum, 2 gold, 6 silver, 46 bronze. 28 are hidden on PSN. Exactly one is flagged missable. Every entry carries its own description of what to do, where to go, what gates it, and whether it can be lost.

**Eight kinds, so the board can be sliced.** Story, side missions, robberies, activities, challenges, collectibles, secrets, platinum. Filter by kind, by grade, by missable, by earned/unearned, and search across names, descriptions and guide text.

**A spoiler shield, on by default.** Hidden trophies show as *Hidden story trophy* until you tick them. Turning the shield off is a switch in the toolbar, not a hidden setting — but the default is the one that does not ruin the plot.

**A roadmap, not a checklist order.** Seven stages, in the order that actually minimises backtracking:

| Stage | What | Why here |
| --- | --- | --- |
| 1 | Run the story, take the balcony detour | Story trophies pop on their own; the Chapter 1 meditation does not |
| 2 | Shops, vaults, gangs | Robbery trophies chain — the jewelry job hands you the Snap Gun |
| 3 | Side missions and strangers | Five named questlines, two of them character-locked |
| 4 | Activities, races, challenges | Where the two real skill checks live |
| 5 | Scans, cards, property | WAiNK and the two phone apps do the work |
| 6 | Secrets | Six trophies no checklist points at |
| 7 | Close the 100% checklist | `A Long Road`, then the platinum |

**A missables page that also argues the negative.** One trophy is missable: `Positive Mental Attitude`, because of a Chapter 1 balcony meditation that the game never lists as a spot and closes when the chapter ends. The same page explains why Kenton's vanishing questline, the character-locked side chains and the post-credits 100% checklist are *not* missable — that is the part most guides leave you guessing about.

**Progress that survives.** Export to JSON, import back, merge on import (importing never removes a tick). Reset is a separate, deliberate button.

## Data

`app/data/trophies.json` is the graded file. `app/data/trophies.js` is the same object wrapped as `window.LEONIDA`, because `fetch()` on `file://` is blocked and an offline guide that needs a web server is not offline. Both copies are byte-identical in content; `app.js` reads the script copy and never touches the network.

Each trophy:

```json
{
  "id": 28,
  "slug": "positive-mental-attitude",
  "name": "Positive Mental Attitude",
  "description": "Meditate at every spot across Leonida.",
  "grade": "bronze",
  "kind": "collectibles",
  "hidden": false,
  "missable": true,
  "count": 18,
  "countLabel": "spots",
  "guide": "…own words…",
  "timing": "…when it can be missed…",
  "sources": ["pp", "ppmed", "ps"]
}
```

Names, official descriptions, grades and hidden flags are the published PSN list. The guide prose, the timing notes, the kind taxonomy, the missable flags, the roadmap grouping and every sentence on the missables page are mine. The count fields are my reading of the published requirement (250 stunts, 42 shooting-range golds, 8 garage properties, and so on) and are labelled as such.

Sources, cross-checked against each other — 20 of them, cited per trophy:

- [PowerPyx — GTA 6 Trophy Guide & Roadmap](https://www.powerpyx.com/gta-6-grand-theft-auto-vi-trophy-guide-roadmap) and the [100% checklist](https://www.powerpyx.com/gta-6-100-completion-checklist-guide/), plus their per-activity location pages (shooting ranges, drone races, meditations, card sets, bank vaults, gang operations, challenges, garages, unfogging)
- [Push Square — GTA 6 Trophy Guide](https://www.pushsquare.com/guides/gta-6-trophy-guide-and-roadmap)
- [GTABase — GTA 6 trophy list](https://www.gtabase.com/articles/gta-6/gta-6-achievements-trophies-list-ps5-xbox-series)
- [Exophase — Grand Theft Auto VI PS5](https://www.exophase.com/game/grand-theft-auto-vi-psn/trophies)
- [Insider Gaming](https://insider-gaming.com/complete-gta-6-trophy-list-how-to-get-all-trophies-achievements/), [TrueTrophies](https://www.truetrophies.com/news/grand-theft-auto-vi-playstation-trophies), [Rock Paper Shotgun](https://www.rockpapershotgun.com/gta-6-trophy-achievements-list-all-trophies)

Where two sources disagreed — and they do, on whether Kenton's chain expires and on how many meditations the trophy actually needs — the entry says so in the timing note instead of picking the tidier answer.

## Design

Dark neon, and unapologetically so: near-black `#08080c`, magenta `#ff2e88`, cyan `#22e0d6`. The reference points are the in-game HUD and a printed ledger — thin rules, tabular numbers, a magnifying-glass progress ring drawn as SVG rather than a chart library. System font stack only, zero webfonts, zero image assets. Everything you see is CSS and inline SVG, so the whole app is five files and about 145 KB, and there are no Rockstar assets anywhere near it.

The screenshots in `screenshots/` are real headless-Chrome renders of the running app, not mockups. They were taken with `?demo=1` — a read-only sample save that lives in memory and never touches your `localStorage`, so a screenshot can show 31 trophies ticked without anyone inheriting someone else's progress:

```
http://localhost:4173/?demo=1&spoilers=0#/t/vice-got-a-price     the board + platinum write-up
http://localhost:4173/?demo=1&spoilers=0#/t/positive-mental-attitude  the one missable trophy
http://localhost:4173/?demo=1#/roadmap                          the seven stages
http://localhost:4173/?demo=1#/t/road-to-rehabilitation         the shield, mid-veil
```

## Layout

```
app/
  index.html          board, roadmap, missables, data
  style.css           the whole look
  app.js              state, filters, router, storage
  data/trophies.json  the dataset
  data/trophies.js    the same dataset, as a script, for file://
screenshots/          four renders
serve.ts              static server
main.ts               build: dossier + packaged app
```

## Notes

- The platinum is not independently tickable. It unlocks when the other 54 are ticked, because that is how the trophy works and a tracker that lets you fake it is a lie.
- `A Long Road` is not true 100%: it is roughly 60% of the game — 100 optional missions, 200 of 277 vehicles, 100 of 255 animals, 70 of 80 challenges, 300 stunts, all 8 vaults and all 39 gang operations.
- `The Shootist` and the racing golds are the only real skill checks. Everything else is time.
- Play the story first. Nothing except one balcony meditation punishes you for it.
