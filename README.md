[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/Ajwyunsx/gta6-trophy-guide-01/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/Ajwyunsx/gta6-trophy-guide-01/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)

# GTA VI PS5 Trophy Guide & Tracker

An offline web app that is the guide and progress tracker for all 55 PlayStation 5 trophies of Grand Theft Auto VI — a [make.fun](https://make.fun) bounty entry. Static files, no network: open `app/index.html` in a desktop browser and it works with the network off.

- Every one of the 55 official trophies: exact name, official description, grade, and a guide in our own words with cited sources.
- Checklist progress saved in the browser, with export and import.
- Filters by kind, grade and earned state; search.
- Spoiler setting that hides story-trophy details until they are earned.
- Platinum roadmap and missable-trophy flags, built from the official descriptions.

## Run

```
node serve.ts    # then open http://localhost:8080
```

Or open `app/index.html` straight from disk — that works too.

## Views

The app is a single page with three tabs, and each one has an address:

| Address | What it shows |
| --- | --- |
| `/` or `#/board` | The board: all 55 rows, filters, and the guide panel |
| `#/board/<slug>` | One trophy open, e.g. `#/board/cunning-stunts` |
| `#/roadmap` | The platinum roadmap in nine phases, with live progress |
| `#/about` | Sources and method |

Handy query flags: `?spoilers=1` shows story trophies, `?spoilers=0` hides them, and `?demo=1` opens a read-only mid-run save (26 trophies ticked) that never writes to localStorage — that is how the screenshots were taken.

Keyboard: `/` jumps to search, `j`/`k` walk the visible list, `Esc` clears the search.

## Build the entry

```
MAKEFUN_OUTPUT_DIR=out node main.ts
```

That copies `app/` and `screenshots/` into `out/` and writes `out/dossier.json` with the entry's summary. It is what the scorer runs.

## Data

`app/data/trophies.json` holds the trophy list, grades, guides and sources. 55 entries, 1 platinum / 2 gold / 6 silver / 46 bronze, 28 hidden on PlayStation.

Each trophy carries `name`, `description`, `grade`, `kind`, `chapter`, `hidden`, `missable`, `effort`, `where`, `when`, `tasks`, `guide` and `sources`. The descriptions and grades are the published ones; the guides, steps and effort labels are ours.

## Screenshots

`screenshots/` holds four JPEGs taken from the app; `shots.json` records the address and viewport each was captured at.

## License

MIT
