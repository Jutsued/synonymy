import type { PlayerStats } from '../types';
import { shiftDateKey } from './clock';

export const MAX_ENERGY = 5;
export const TARGET_SYNONYMS = 5;

/**
 * Applies today's result to the lifetime stats.
 * Guarded by lastPlayedDate so a result can never be counted twice
 * (double clicks, StrictMode, refresh races...).
 */
export function recordResult(
  stats: PlayerStats,
  dateKey: string,
  won: boolean,
  elapsedMs: number,
  energyLeft: number,
): PlayerStats {
  if (stats.lastPlayedDate === dateKey) return stats;

  const distribution = [...stats.distribution];
  distribution[won ? Math.min(5, Math.max(1, energyLeft)) : 0] += 1;

  const yesterday = shiftDateKey(dateKey, -1);
  const currentStreak = won ? (stats.lastWinDate === yesterday ? stats.currentStreak + 1 : 1) : 0;

  return {
    played: stats.played + 1,
    wins: stats.wins + (won ? 1 : 0),
    currentStreak,
    maxStreak: Math.max(stats.maxStreak, currentStreak),
    lastWinDate: won ? dateKey : stats.lastWinDate,
    lastPlayedDate: dateKey,
    bestTimeMs: won
      ? stats.bestTimeMs === null
        ? elapsedMs
        : Math.min(stats.bestTimeMs, elapsedMs)
      : stats.bestTimeMs,
    distribution,
  };
}

/**
 * The streak to SHOW. If the last win was before yesterday the streak is
 * already broken, even though we haven't recorded today's game yet.
 */
export function getDisplayStreak(stats: PlayerStats, todayKey: string): number {
  if (!stats.lastWinDate) return 0;
  if (stats.lastWinDate === todayKey || stats.lastWinDate === shiftDateKey(todayKey, -1)) {
    return stats.currentStreak;
  }
  return 0;
}

/** 200 per synonym, 100 per leftover charge, up to 600 speed bonus on a win. */
export function computeScore(found: number, energy: number, elapsedMs: number, won: boolean): number {
  const speedBonus = won ? Math.max(0, 300 - Math.floor(elapsedMs / 1000)) * 2 : 0;
  return found * 200 + energy * 100 + speedBonus;
}

export function winRate(stats: PlayerStats): number {
  return stats.played === 0 ? 0 : Math.round((stats.wins / stats.played) * 100);
}
