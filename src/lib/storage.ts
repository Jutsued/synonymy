import type { GameState, PlayerStats } from '../types';

/**
 * Everything that touches localStorage lives here.
 * Keys are versioned (":v1") so a future shape change can just bump the
 * version instead of crashing on old data.
 */
const GAME_KEY = 'synonymy:game:v1';
const STATS_KEY = 'synonymy:stats:v1';
const HIGHEST_DATE_KEY = 'synonymy:highestDate:v1';
const NEWSLETTER_KEY = 'synonymy:newsletter:v1';

function read(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    // Private mode / disabled storage / corrupted JSON — act like nothing was saved.
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked. The game still works, it just won't persist.
  }
}

/** Runtime check — never trust what comes out of localStorage blindly. */
function isGameState(v: unknown): v is GameState {
  if (!v || typeof v !== 'object') return false;
  const g = v as Record<string, unknown>;
  return (
    typeof g.dateKey === 'string' &&
    typeof g.puzzleId === 'string' &&
    Array.isArray(g.selected) &&
    g.selected.every((s) => typeof s === 'string') &&
    typeof g.energy === 'number' &&
    typeof g.elapsedMs === 'number' &&
    (g.status === 'playing' || g.status === 'won' || g.status === 'lost')
  );
}

/** Returns the saved game only if it belongs to today's puzzle. */
export function loadGame(dateKey: string, puzzleId: string): GameState | null {
  const saved = read(GAME_KEY);
  if (!isGameState(saved)) return null;
  if (saved.dateKey !== dateKey || saved.puzzleId !== puzzleId) return null;
  return { ...saved, completedAt: typeof saved.completedAt === 'number' ? saved.completedAt : null };
}

export function saveGame(state: GameState): void {
  write(GAME_KEY, state);
}

export const DEFAULT_STATS: PlayerStats = {
  played: 0,
  wins: 0,
  currentStreak: 0,
  maxStreak: 0,
  lastWinDate: null,
  lastPlayedDate: null,
  bestTimeMs: null,
};

export function loadStats(): PlayerStats {
  const saved = read(STATS_KEY);
  if (!saved || typeof saved !== 'object') return { ...DEFAULT_STATS };
  return { ...DEFAULT_STATS, ...(saved as Partial<PlayerStats>) };
}

export function saveStats(stats: PlayerStats): void {
  write(STATS_KEY, stats);
}

/** The latest date key this device has ever played — used to block "rewind the clock" cheating. */
export function loadHighestDateKey(): string | null {
  const v = read(HIGHEST_DATE_KEY);
  return typeof v === 'string' ? v : null;
}

export function saveHighestDateKey(key: string): void {
  write(HIGHEST_DATE_KEY, key);
}

export function loadNewsletterSubscribed(): boolean {
  return read(NEWSLETTER_KEY) === true;
}

export function saveNewsletterSubscribed(): void {
  write(NEWSLETTER_KEY, true);
}
