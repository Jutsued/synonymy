import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { BoardWord, GameState, PlayerStats, Puzzle } from '../types';
import { getPuzzleForDate } from '../data/puzzleBank';
import { buildBoard } from '../lib/board';
import { loadGame, loadStats, saveGame, saveStats } from '../lib/storage';
import {
  MAX_ENERGY,
  TARGET_SYNONYMS,
  computeScore,
  getDisplayStreak,
  recordResult,
} from '../lib/stats';
import { saveScoreToSupabase } from '../lib/integrations';

export type SelectResult = 'correct' | 'wrong' | null;

interface Session {
  dateKey: string;
  state: GameState;
  /** True if the page loaded with today's game already finished -> show stats instead of the board. */
  restoredComplete: boolean;
}

function createGame(dateKey: string, puzzleId: string): GameState {
  return {
    dateKey,
    puzzleId,
    selected: [],
    energy: MAX_ENERGY,
    elapsedMs: 0,
    status: 'playing',
    completedAt: null,
  };
}

function makeSession(dateKey: string, puzzle: Puzzle, words: BoardWord[]): Session {
  const saved = loadGame(dateKey, puzzle.id);
  if (!saved) return { dateKey, state: createGame(dateKey, puzzle.id), restoredComplete: false };

  // Drop any ids that don't exist on today's board (e.g. the puzzle was edited).
  const valid = new Set(words.map((w) => w.id));
  const state = { ...saved, selected: saved.selected.filter((id) => valid.has(id)) };
  return { dateKey, state, restoredComplete: state.status !== 'playing' };
}

function countFound(selected: string[], words: BoardWord[]): number {
  const synonymIds = new Set(words.filter((w) => w.category === 'synonym').map((w) => w.id));
  return selected.filter((id) => synonymIds.has(id)).length;
}

/**
 * The whole game engine in one hook:
 * puzzle selection, board building, clicks, timer, persistence, stats.
 */
export function useDailyGame(dateKey: string) {
  const puzzle = useMemo(() => getPuzzleForDate(dateKey), [dateKey]);
  const words = useMemo(() => buildBoard(puzzle, dateKey), [puzzle, dateKey]);

  const [storedSession, setSession] = useState<Session>(() => makeSession(dateKey, puzzle, words));

  // Day rolled over while the tab was open -> load the new day's session.
  // (Adjusting state during render is React's recommended pattern for this.)
  let session = storedSession;
  if (storedSession.dateKey !== dateKey) {
    session = makeSession(dateKey, puzzle, words);
    setSession(session);
  }
  const { state, restoredComplete } = session;

  const [stats, setStats] = useState<PlayerStats>(loadStats);

  // Refs let the click handler read the very latest values, even on
  // rapid double-clicks that happen before React re-renders.
  const stateRef = useRef(state);
  stateRef.current = state;
  const statsRef = useRef(stats);
  statsRef.current = stats;

  // Persist on EVERY change (clicks + timer ticks) so a refresh restores everything.
  useEffect(() => {
    saveGame(state);
  }, [state]);

  // Timer: starts on the first pick, pauses while the tab is hidden, stops when the game ends.
  const timerRunning = state.status === 'playing' && state.selected.length > 0;
  useEffect(() => {
    if (!timerRunning) return;
    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      const delta = Math.min(now - last, 1000); // cap so a throttled tab can't add big jumps
      last = now;
      if (document.hidden) return;
      setSession((prev) =>
        prev.state.status === 'playing'
          ? { ...prev, state: { ...prev.state, elapsedMs: prev.state.elapsedMs + delta } }
          : prev,
      );
    }, 500);
    return () => window.clearInterval(id);
  }, [timerRunning, session.dateKey]);

  const selectWord = useCallback(
    (wordId: string): SelectResult => {
      const prev = stateRef.current;
      if (prev.status !== 'playing' || prev.selected.includes(wordId)) return null;

      const word = words.find((w) => w.id === wordId);
      if (!word) return null;

      const correct = word.category === 'synonym';
      const selected = [...prev.selected, wordId];
      const energy = correct ? prev.energy : prev.energy - 1;
      const found = countFound(selected, words);

      let status: GameState['status'] = 'playing';
      if (found >= TARGET_SYNONYMS) status = 'won';
      else if (energy <= 0) status = 'lost';

      const next: GameState = {
        ...prev,
        selected,
        energy: Math.max(0, energy),
        status,
        completedAt: status === 'playing' ? null : Date.now(),
      };

      stateRef.current = next;
      saveGame(next); // write immediately — don't even wait for the effect
      setSession((s) => ({ ...s, state: next }));

      if (status !== 'playing') {
        const won = status === 'won';
        const newStats = recordResult(statsRef.current, prev.dateKey, won, next.elapsedMs);
        if (newStats !== statsRef.current) {
          statsRef.current = newStats;
          saveStats(newStats);
          setStats(newStats);

          // ── Extension point: global leaderboard ──
          void saveScoreToSupabase(
            computeScore(found, next.energy, next.elapsedMs, won),
            newStats.currentStreak,
            {
              dateKey: prev.dateKey,
              puzzleId: prev.puzzleId,
              won,
              elapsedMs: next.elapsedMs,
              energyLeft: next.energy,
            },
          );
        }
      }

      return correct ? 'correct' : 'wrong';
    },
    [words],
  );

  const foundCount = countFound(state.selected, words);
  const score = computeScore(foundCount, state.energy, state.elapsedMs, state.status === 'won');

  return {
    puzzle,
    words,
    state,
    stats,
    foundCount,
    score,
    displayStreak: getDisplayStreak(stats, dateKey),
    restoredComplete,
    selectWord,
  };
}
