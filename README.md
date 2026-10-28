# Synonymy

One target word. Twenty floating words. Find the five true synonyms before your five energy charges run out. New puzzle every day at 00:00 UTC.

## Run it

```bash
npm install
npm run dev        # local dev server
npm run build      # typecheck + production build into dist/
npm run preview    # serve the built app
```

## Project map

```
content/
├── batch1-6.txt           # The handpicked year of puzzles (edit these)
├── bombs.txt              # Pool of unrelated bomb words
└── build-curated.mjs      # Checks puzzles, assigns bombs, writes src/data/curated.json
src/
├── App.tsx                  # Clock sync, day rollover, which screen to show
├── main.tsx                 # React entry
├── index.css                # Tailwind v4 + fonts + theme tokens
├── types.ts                 # Puzzle, BoardWord, GameState, PlayerStats
├── data/
│   ├── puzzleBank.ts        # One-off puzzles + getPuzzleForDate() (yearly loop)
│   └── curated.json         # Generated from content/ — don't edit by hand
├── hooks/
│   ├── useDailyGame.ts      # The game engine: clicks, timer, persistence, stats
│   └── useServerNow.ts      # Ticking "now" using the synced clock offset
├── lib/
│   ├── clock.ts             # UTC date keys, countdown, anti-cheat clock
│   ├── board.ts             # Puzzle -> 20 shuffled, styled words (seeded)
│   ├── random.ts            # Seeded RNG + shuffle
│   ├── stats.ts             # Streak, score, win-rate math
│   ├── storage.ts           # Every localStorage read/write
│   └── integrations.ts      # saveScoreToSupabase / triggerResendNewsletter stubs
└── components/
    ├── Header.tsx           # Logo, streak, HH:MM:SS countdown, stats button
    ├── GameBoard.tsx        # HUD, word cloud, target word, WordBadge
    ├── StatsModal.tsx       # Results, lifetime stats, share, newsletter form
    └── icons.tsx            # Inline SVG icons
```

## How the tricky parts work

**Same puzzle for everyone.** The date key is always UTC (`2026-10-28`). The bank is looked up by that key; if a day is missing, it rotates deterministically so nothing breaks.

**Same layout after refresh.** Shuffle order, sizes and float timings come from a seeded RNG keyed on the date, so the board looks random but is identical on every reload.

**Refresh-proof state.** Every click writes the full `GameState` to localStorage immediately, and the timer saves every half second. On load, if today's game is already finished, the board isn't rendered at all; the stats screen opens and can't be closed.

**Clock cheating.** On start the app sends a free `HEAD` request to its own host and reads the `Date` response header. That gives a server time the player can't change. If that fails, a "highest date ever seen" clamp stops players from rewinding the clock to replay. Clearing localStorage still resets everything; true enforcement needs server-side validation (that's what the Supabase hook is for).

## Puzzles

There are 365 handpicked puzzles (Oct 28, 2026 → Oct 27, 2027). After that the game loops back to the start, so every date always has a puzzle and nothing needs maintaining. A puzzle comes back once a year, with its words reshuffled on the board.

**Where they live**
- `content/batch*.txt`: the year-long bank, one puzzle per line, in date order:
  `TARGET|5 synonyms|5 antonyms|5 related words`
- `content/bombs.txt`: the pool of unrelated "bomb" words. These are assigned automatically, so no bomb repeats often enough for players to memorize it.
- `src/data/puzzleBank.ts`: hand-written one-offs. A puzzle here with a date `id` replaces whatever was scheduled that day (holidays, special events).

**Editing from GitHub's website** (no local setup needed): open a `content/batch*.txt` file, click the pencil, edit, commit. The deploy rebuilds `src/data/curated.json` and checks every puzzle. If a line is broken (wrong word count, duplicate word, a target used twice), the deploy fails and the live site stays on the last good version.

Locally: `npm run puzzles` rebuilds and checks the bank.
