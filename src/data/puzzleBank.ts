import type { Puzzle } from '../types';
import { parseDateKey, DAY_MS } from '../lib/clock';
import curatedPuzzles from './curated.json';

/**
 * Hand-written puzzles. These ALWAYS win: put a puzzle here with a date as
 * its `id` and it replaces whatever was scheduled for that day.
 *
 * The big year-long bank lives in curated.json (built from content/*.txt
 * by `npm run puzzles`). Each puzzle's `id` is the UTC date it's scheduled for.
 *
 * Rules for every entry:
 *  - exactly 5 words in each of the 4 lists (20 words total)
 *  - no duplicate words inside one puzzle
 *  - "contextual" words should FEEL related (same scene / topic) but not mean the same thing
 *  - "chaos" words should be totally unrelated — the "bombs"
 *
 * If a date has no scheduled puzzle, `getPuzzleForDate` falls back to a
 * deterministic rotation so the game never breaks — but keep this list
 * stocked ahead of time so players don't see repeats.
 */
export const puzzleBank: Puzzle[] = [
  {
    id: '2026-10-28',
    targetWord: 'ABUNDANT',
    synonyms: ['Plentiful', 'Ample', 'Bountiful', 'Copious', 'Profuse'],
    antonyms: ['Scarce', 'Sparse', 'Meager', 'Deficient', 'Lacking'],
    contextual: ['Harvest', 'Wealth', 'Growth', 'Overflow', 'Storage'],
    chaos: ['Neon', 'Velocity', 'Cryptic', 'Anchor', 'Brittle'],
  },
  {
    id: '2026-10-29',
    targetWord: 'TENACIOUS',
    synonyms: ['Persistent', 'Determined', 'Steadfast', 'Relentless', 'Dogged'],
    antonyms: ['Yielding', 'Fickle', 'Irresolute', 'Wavering', 'Faltering'],
    contextual: ['Marathon', 'Grit', 'Summit', 'Deadline', 'Climb'],
    chaos: ['Velvet', 'Lantern', 'Saffron', 'Pixel', 'Orbit'],
  },
  {
    id: '2026-10-30',
    targetWord: 'SERENE',
    synonyms: ['Tranquil', 'Placid', 'Calm', 'Peaceful', 'Composed'],
    antonyms: ['Turbulent', 'Frantic', 'Agitated', 'Chaotic', 'Restless'],
    contextual: ['Lake', 'Meditation', 'Dawn', 'Garden', 'Breeze'],
    chaos: ['Ratchet', 'Comet', 'Ledger', 'Quartz', 'Tango'],
  },
  {
    id: '2026-10-31',
    targetWord: 'OBSCURE',
    synonyms: ['Vague', 'Murky', 'Cryptic', 'Hazy', 'Ambiguous'],
    antonyms: ['Clear', 'Obvious', 'Evident', 'Lucid', 'Explicit'],
    contextual: ['Fog', 'Riddle', 'Shadow', 'Archive', 'Footnote'],
    chaos: ['Trumpet', 'Mango', 'Glacier', 'Sprint', 'Copper'],
  },
  {
    id: '2026-11-01',
    targetWord: 'VIVID',
    synonyms: ['Bright', 'Brilliant', 'Intense', 'Striking', 'Vibrant'],
    antonyms: ['Dull', 'Faded', 'Muted', 'Drab', 'Pale'],
    contextual: ['Painting', 'Dream', 'Sunset', 'Memory', 'Prism'],
    chaos: ['Gravel', 'Invoice', 'Ferry', 'Socket', 'Oyster'],
  },
];

/** Every puzzle, oldest first. Manual entries replace curated ones on the same day. */
const manualIds = new Set(puzzleBank.map((p) => p.id));
const allPuzzles: Puzzle[] = [
  ...puzzleBank,
  ...(curatedPuzzles as Puzzle[]).filter((p) => !manualIds.has(p.id)),
].sort((a, b) => a.id.localeCompare(b.id));

const byId = new Map(allPuzzles.map((p) => [p.id, p]));
const firstDay = parseDateKey(allPuzzles[0].id) / DAY_MS;

/**
 * Picks today's puzzle.
 * 1. Exact match on the date (the normal case — covers about a year).
 * 2. After the bank runs out, it loops: the puzzle from one full cycle ago
 *    comes back. With ~365 puzzles that's "same puzzle as last year", but
 *    the word layout is reshuffled because the board is seeded by the date.
 *    This means the game never runs out, even if nobody adds puzzles.
 */
export function getPuzzleForDate(dateKey: string): Puzzle {
  const scheduled = byId.get(dateKey);
  if (scheduled) return scheduled;

  const dayIndex = parseDateKey(dateKey) / DAY_MS - firstDay;
  const len = allPuzzles.length;
  return allPuzzles[((dayIndex % len) + len) % len];
}

/** Dev-only sanity check so a typo in the bank gets caught immediately. */
if (import.meta.env.DEV) {
  for (const p of allPuzzles) {
    const lists = [p.synonyms, p.antonyms, p.contextual, p.chaos];
    if (lists.some((l) => l.length !== 5)) {
      console.warn(`[Kinword] Puzzle ${p.id} must have exactly 5 words per category.`);
    }
    const all = lists.flat().map((w) => w.toLowerCase());
    if (new Set(all).size !== all.length) {
      console.warn(`[Kinword] Puzzle ${p.id} has duplicate words.`);
    }
  }
}
