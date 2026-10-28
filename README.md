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
src/
├── App.tsx                  # Clock sync, day rollover, which screen to show
├── main.tsx                 # React entry
├── index.css                # Tailwind v4 + fonts + theme tokens
├── types.ts                 # Puzzle, BoardWord, GameState, PlayerStats
├── data/puzzleBank.ts       # The puzzles + getPuzzleForDate()
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

**Adding puzzles.** Append to `puzzleBank` with `id` set to the date. Five words per list, no duplicates. In dev, a console warning fires if a puzzle breaks those rules.
