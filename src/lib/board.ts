import type { BadgeSize, BoardWord, Puzzle, WordCategory } from '../types';
import { hashString, mulberry32, seededShuffle } from './random';

const SIZES: BadgeSize[] = ['sm', 'md', 'md', 'lg'];

/**
 * Turns a puzzle into 20 shuffled, styled board words.
 *
 * Ids are "<category>-<index>" so they stay stable across refreshes
 * (saved selections in localStorage point at these ids).
 *
 * Sizes/rotations are random per word — NOT per category — so a big badge
 * never hints that it's a synonym.
 */
export function buildBoard(puzzle: Puzzle, dateKey: string): BoardWord[] {
  const rng = mulberry32(hashString(`${dateKey}:${puzzle.id}:${puzzle.targetWord}`));

  const groups: [WordCategory, string[]][] = [
    ['synonym', puzzle.synonyms],
    ['antonym', puzzle.antonyms],
    ['contextual', puzzle.contextual],
    ['chaos', puzzle.chaos],
  ];

  const raw = groups.flatMap(([category, list]) =>
    list.map((text, i) => ({ id: `${category}-${i}`, text, category })),
  );

  return seededShuffle(raw, rng).map((word) => ({
    ...word,
    visual: {
      floatDuration: 3.2 + rng() * 2.6,
      floatDelay: rng() * 2,
      rotate: (rng() - 0.5) * 5,
      offsetY: Math.round(rng() * 12),
      size: SIZES[Math.floor(rng() * SIZES.length)],
    },
  }));
}
