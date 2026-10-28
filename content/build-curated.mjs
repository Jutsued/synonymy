#!/usr/bin/env node
/**
 * Turns content/batch*.txt into src/data/curated.json and checks every puzzle.
 *
 * Puzzle line format (one per line, # = comment):
 *   TARGET|syn syn syn syn syn|ant ant ant ant ant|ctx ctx ctx ctx ctx
 *
 * Bombs (the 5 unrelated words) are NOT written by hand. They're assigned
 * from content/bombs.txt so no bomb word repeats often enough for players
 * to memorize it. A bomb is never:
 *   - a word used as an answer or related word in ANY puzzle
 *   - a food word on a food-themed puzzle (SPICY, JUICY...)
 *   - reused within 45 days of its last appearance
 *
 * Puzzles are dated in file order starting at START_DATE, one per day.
 * Run: node content/build-curated.mjs
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../src/data/curated.json');
const START_DATE = '2026-11-02';
const BOMB_COOLDOWN_DAYS = 45;

/** Targets already used by the hand-written puzzles in puzzleBank.ts. */
const RESERVED = ['ABUNDANT', 'TENACIOUS', 'SERENE', 'OBSCURE', 'VIVID'];

/** Puzzles where a food bomb could feel like a clue. */
const FOOD_THEMED = new Set(
  'SWEET SPICY BLAND BITTER ZESTY JUICY DELICIOUS HUNGRY CRISP SOGGY RIPE ROTTEN FRESH STICKY CRAVE NOURISH HEARTY MELLOW MILD'.split(' '),
);

/* ─────────────────────────── seeded rng ─────────────────────────── */

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(20261102);
const shuffle = (list) => {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

const sameStem = (a, b) => {
  a = a.toLowerCase();
  b = b.toLowerCase();
  if (a === b) return true;
  // Containment only counts for real words, so "ox" doesn't knock out "Toolbox".
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  if (short.length >= 4 && long.includes(short)) return true;
  const n = Math.min(5, a.length, b.length);
  return n >= 4 && a.slice(0, n) === b.slice(0, n);
};

/* ─────────────────────────── read puzzles ─────────────────────────── */

const errors = [];
const seenTargets = new Map(RESERVED.map((t) => [t, 'puzzleBank.ts']));
const drafts = [];

for (const file of readdirSync(HERE).filter((f) => /^batch.*\.txt$/.test(f)).sort()) {
  readFileSync(join(HERE, file), 'utf8')
    .split('\n')
    .forEach((line, i) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const where = `${file}:${i + 1}`;
      const parts = trimmed.split('|').map((p) => p.trim());
      if (parts.length !== 4) {
        errors.push(`${where} needs 4 sections, has ${parts.length}`);
        return;
      }
      const [target, ...lists] = parts;
      const [synonyms, antonyms, contextual] = lists.map((l) => l.split(/\s+/));

      if (seenTargets.has(target)) errors.push(`${where} target ${target} already used at ${seenTargets.get(target)}`);
      seenTargets.set(target, where);

      [synonyms, antonyms, contextual].forEach((list, k) => {
        if (list.length !== 5) errors.push(`${where} ${target}: list ${k + 1} has ${list.length} words`);
      });
      const all = [synonyms, antonyms, contextual].flat();
      const lower = all.map((w) => w.toLowerCase());
      const dupes = lower.filter((w, j) => lower.indexOf(w) !== j);
      if (dupes.length) errors.push(`${where} ${target}: duplicate words ${dupes.join(', ')}`);
      if (lower.includes(target.toLowerCase())) errors.push(`${where} ${target}: target appears on the board`);
      all.forEach((w) => {
        if (!/^[A-Z][a-z]+$/.test(w)) errors.push(`${where} ${target}: bad word "${w}"`);
      });

      drafts.push({ target, synonyms, antonyms, contextual });
    });
}

/* ─────────────────────────── bomb pool ─────────────────────────── */

const pool = [];
let category = 'misc';
for (const line of readFileSync(join(HERE, 'bombs.txt'), 'utf8').split('\n')) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const header = t.match(/^\[(\w+)\]$/);
  if (header) {
    category = header[1];
    continue;
  }
  for (const word of t.split(/\s+/)) {
    if (!pool.some((p) => p.word === word)) pool.push({ word, category });
  }
}

// Anything that's an answer/related word somewhere can never be a bomb.
const associated = new Set(
  drafts.flatMap((d) => [d.target, ...d.synonyms, ...d.antonyms, ...d.contextual]).map((w) => w.toLowerCase()),
);
const usable = pool.filter((p) => ![...associated].some((a) => sameStem(a, p.word)));

let queue = shuffle(usable);
const lastUsed = new Map();

function pickBombs(draft, dayIndex) {
  const chosen = [];
  const board = [draft.target, ...draft.synonyms, ...draft.antonyms, ...draft.contextual];
  for (let attempt = 0; chosen.length < 5 && attempt < 4; attempt++) {
    // Last attempt relaxes the nice-to-haves (cooldown, category mix), never the safety rules.
    const relaxed = attempt === 3;
    for (let i = 0; i < queue.length && chosen.length < 5; i++) {
      const b = queue[i];
      const cooldown = relaxed ? 14 : BOMB_COOLDOWN_DAYS;
      const cooled = dayIndex - (lastUsed.get(b.word) ?? -Infinity) >= cooldown;
      const foodClash = b.category === 'food' && FOOD_THEMED.has(draft.target);
      const sameCategory = !relaxed && chosen.filter((c) => c.category === b.category).length >= 2;
      if (!cooled || foodClash || sameCategory) continue;
      if (board.some((w) => sameStem(w, b.word)) || chosen.some((c) => c.word === b.word)) continue;
      chosen.push(b);
      queue.splice(i, 1);
      i--;
    }
    if (chosen.length < 5) queue = queue.concat(shuffle(usable)); // refill and try again
  }
  if (chosen.length < 5) errors.push(`${draft.target}: could not find 5 bombs`);
  chosen.forEach((c) => lastUsed.set(c.word, dayIndex));
  if (queue.length < 60) queue = queue.concat(shuffle(usable));
  return chosen.map((c) => c.word);
}

/* ─────────────────────────── output ─────────────────────────── */

const DAY_MS = 86_400_000;
const [y, m, d] = START_DATE.split('-').map(Number);
const start = Date.UTC(y, m - 1, d);

const puzzles = drafts.map((draft, i) => ({
  id: new Date(start + i * DAY_MS).toISOString().slice(0, 10),
  targetWord: draft.target,
  synonyms: draft.synonyms,
  antonyms: draft.antonyms,
  contextual: draft.contextual,
  chaos: pickBombs(draft, i),
}));

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

writeFileSync(OUT, JSON.stringify(puzzles, null, 1) + '\n');

const counts = {};
puzzles.forEach((p) => p.chaos.forEach((w) => (counts[w] = (counts[w] ?? 0) + 1)));
const max = Math.max(...Object.values(counts));
console.log(
  `${puzzles.length} puzzles, ${puzzles[0]?.id} → ${puzzles.at(-1)?.id}. ` +
    `${usable.length} usable bomb words (${pool.length - usable.length} skipped as too related); most any bomb repeats: ${max}x/year.`,
);
