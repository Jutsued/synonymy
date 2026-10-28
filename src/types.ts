export type WordCategory = 'synonym' | 'antonym' | 'contextual' | 'chaos';

export interface Puzzle {
  /** The UTC date (YYYY-MM-DD) this puzzle is scheduled for. */
  id: string;
  targetWord: string;
  synonyms: string[];
  antonyms: string[];
  contextual: string[];
  chaos: string[];
}

export type BadgeSize = 'sm' | 'md' | 'lg';

/** One of the 20 words floating on the board. */
export interface BoardWord {
  /** Stable id like "synonym-2" — survives refreshes so saved state still lines up. */
  id: string;
  text: string;
  category: WordCategory;
  /** Seeded per-day visual randomness so the layout looks organic but never "jumps" on refresh. */
  visual: {
    floatDuration: number;
    floatDelay: number;
    rotate: number;
    offsetY: number;
    size: BadgeSize;
  };
}

export type GameStatus = 'playing' | 'won' | 'lost';

export interface GameState {
  dateKey: string;
  puzzleId: string;
  /** Word ids in the order they were clicked (used for the share grid too). */
  selected: string[];
  energy: number;
  elapsedMs: number;
  status: GameStatus;
  completedAt: number | null;
}

export interface PlayerStats {
  played: number;
  wins: number;
  currentStreak: number;
  maxStreak: number;
  lastWinDate: string | null;
  lastPlayedDate: string | null;
  bestTimeMs: number | null;
  /**
   * How games ended, for the results chart.
   * Index 0 = losses, 1..5 = wins with that many charges left.
   */
  distribution: number[];
}
