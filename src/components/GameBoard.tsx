import { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useAnimationControls, useReducedMotion } from 'framer-motion';
import type { BadgeSize, BoardWord, GameState, Puzzle, WordCategory } from '../types';
import type { SelectResult } from '../hooks/useDailyGame';
import { MAX_ENERGY, TARGET_SYNONYMS } from '../lib/stats';
import { formatDateKey, formatDuration, puzzleNumber } from '../lib/clock';
import { CATEGORY } from '../lib/categories';
import { BoltIcon, CategoryIcon, ClockIcon } from './icons';

/**
 * idle     -> still in play
 * picked   -> the player tapped it (correct or not)
 * revealed -> game over, the player never tapped it
 */
type BadgeState = 'idle' | 'picked' | 'revealed';

interface GameBoardProps {
  puzzle: Puzzle;
  words: BoardWord[];
  state: GameState;
  foundCount: number;
  /** True if the page loaded with today's game already finished (no celebration replay). */
  restoredComplete: boolean;
  onSelect: (wordId: string) => SelectResult;
  onShowResults: () => void;
  onOpenHelp: () => void;
}

/* ───────────────────────────── helpers ───────────────────────────── */

const SIZE_CLASSES: Record<BadgeSize, string> = {
  sm: 'px-3 py-1.5 text-[13px] sm:px-3.5 sm:text-sm',
  md: 'px-3.5 py-2 text-sm sm:px-4 sm:text-base',
  lg: 'px-4 py-2 text-[15px] sm:px-5 sm:py-2.5 sm:text-lg',
};

const IDLE_CLASSES =
  'cursor-pointer border-zinc-800 bg-zinc-900/50 text-zinc-200 shadow-[0_10px_30px_-14px_rgba(0,0,0,0.9)] hover:border-zinc-600 hover:bg-zinc-800/60 hover:text-white';

function badgeClasses(category: WordCategory, badgeState: BadgeState): string {
  if (badgeState === 'idle') return IDLE_CLASSES;
  if (category === 'synonym') {
    return badgeState === 'picked'
      ? `${CATEGORY.synonym.badge} shadow-[0_0_28px_-6px_rgba(16,185,129,0.6)]`
      : CATEGORY.synonym.muted;
  }
  // Wrong picks keep a strike-through so they read as "spent" even without color.
  return badgeState === 'picked'
    ? `${CATEGORY[category].badge} line-through decoration-current/50`
    : CATEGORY[category].muted;
}

function badgeLabel(word: BoardWord, badgeState: BadgeState): string {
  if (badgeState === 'idle') return word.text;
  const kind = CATEGORY[word.category].label.toLowerCase();
  if (badgeState === 'picked') {
    return `${word.text}, ${word.category === 'synonym' ? 'correct synonym' : `wrong, ${kind}`}`;
  }
  return `${word.text}, ${word.category === 'synonym' ? 'missed synonym' : kind}`;
}

/** Tiny buzz on phones that support it (Android). iPhones simply ignore it. */
function buzz(pattern: number | number[]) {
  try {
    if ('vibrate' in navigator) navigator.vibrate(pattern);
  } catch {
    /* not supported */
  }
}

/* ───────────────────────────── WordBadge ───────────────────────────── */

interface WordBadgeProps {
  word: BoardWord;
  index: number;
  badgeState: BadgeState;
  reduceMotion: boolean;
  onSelect: (word: BoardWord) => SelectResult;
}

/**
 * Three motion layers, each with ONE job, so animations never fight:
 *   1. outer div  -> entrance fade + endless idle float (y)
 *   2. middle div -> wrong-answer shake (x), triggered imperatively
 *   3. button     -> spring scale/rotate on hover, tap and success
 */
function WordBadge({ word, index, badgeState, reduceMotion, onSelect }: WordBadgeProps) {
  const shake = useAnimationControls();
  // Remember how we mounted, so bursts only play for NEW taps, not after a refresh.
  const mountedState = useRef(badgeState);
  const interactive = badgeState === 'idle';
  const isSynonym = word.category === 'synonym';
  const freshPick = badgeState === 'picked' && mountedState.current !== 'picked';

  const handleClick = () => {
    if (!interactive) return;
    const result = onSelect(word);
    if (result === 'wrong' && !reduceMotion) {
      void shake.start({ x: [0, -9, 9, -6, 6, -2, 0], transition: { duration: 0.45 } });
    }
  };

  return (
    <motion.div
      className="relative"
      style={{ marginTop: word.visual.offsetY }}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1, y: reduceMotion ? 0 : [0, -6, 0] }}
      transition={{
        opacity: { duration: 0.5, delay: index * 0.035 },
        scale: { type: 'spring', stiffness: 260, damping: 18, delay: index * 0.035 },
        y: reduceMotion
          ? { duration: 0 }
          : { duration: word.visual.floatDuration, delay: word.visual.floatDelay, repeat: Infinity, ease: 'easeInOut' },
      }}
    >
      <motion.div animate={shake}>
        <motion.button
          type="button"
          onClick={handleClick}
          disabled={!interactive}
          aria-pressed={badgeState === 'picked'}
          aria-label={badgeLabel(word, badgeState)}
          animate={{
            scale: badgeState === 'picked' && isSynonym ? 1.07 : 1,
            rotate: interactive ? word.visual.rotate : 0,
          }}
          whileHover={interactive && !reduceMotion ? { scale: 1.07, rotate: 0 } : undefined}
          whileTap={interactive ? { scale: 0.86 } : undefined}
          transition={{ type: 'spring', stiffness: 520, damping: 14, mass: 0.8 }}
          className={`relative flex items-center gap-1.5 rounded-full border font-medium tracking-wide whitespace-nowrap backdrop-blur-md transition-colors duration-300 outline-none select-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${SIZE_CLASSES[word.visual.size]} ${badgeClasses(word.category, badgeState)}`}
        >
          {badgeState !== 'idle' && (
            <motion.span
              className="flex"
              initial={freshPick ? { scale: 0, rotate: -45 } : false}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 600, damping: 18 }}
            >
              <CategoryIcon category={word.category} width={13} height={13} />
            </motion.span>
          )}
          {word.text}

          {/* One-shot ring burst on a fresh tap */}
          {freshPick && !reduceMotion && (
            <motion.span
              aria-hidden
              className={`pointer-events-none absolute inset-0 rounded-full border-2 ${isSynonym ? 'border-emerald-400' : 'border-rose-500'}`}
              initial={{ scale: 1, opacity: 0.8 }}
              animate={{ scale: 1.6, opacity: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          )}
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

/* ───────────────────────────── HUD pieces ───────────────────────────── */

function EnergyMeter({ energy, over }: { energy: number; over: boolean }) {
  const critical = energy === 1 && !over;
  return (
    <div
      className="flex items-center gap-2"
      role="meter"
      aria-label="Energy charges"
      aria-valuemin={0}
      aria-valuemax={MAX_ENERGY}
      aria-valuenow={energy}
    >
      <BoltIcon className={critical ? 'text-rose-400' : 'text-zinc-400'} />
      <div className="flex items-center gap-1">
        {Array.from({ length: MAX_ENERGY }, (_, i) => {
          const filled = i < energy;
          return (
            <motion.span
              key={i}
              className={`h-2 w-3.5 rounded-full transition-colors duration-300 min-[360px]:w-4 sm:w-6 ${
                filled
                  ? critical
                    ? 'bg-rose-400 shadow-[0_0_10px_rgba(251,113,133,0.6)]'
                    : 'bg-zinc-100 shadow-[0_0_10px_rgba(255,255,255,0.3)]'
                  : 'bg-rose-500/20'
              }`}
              animate={filled && critical ? { opacity: [1, 0.35, 1] } : { opacity: 1 }}
              transition={filled && critical ? { duration: 1.1, repeat: Infinity } : { duration: 0.2 }}
            />
          );
        })}
      </div>
    </div>
  );
}

function FoundTracker({ found }: { found: number }) {
  return (
    <div className="flex items-center gap-2" aria-label={`${found} of ${TARGET_SYNONYMS} synonyms found`}>
      <div className="flex items-center gap-1">
        {Array.from({ length: TARGET_SYNONYMS }, (_, i) => (
          <motion.span
            key={i}
            className={`h-2 w-2 rounded-full ${i < found ? 'bg-emerald-400' : 'bg-zinc-700'}`}
            animate={{ scale: i === found - 1 ? [1, 1.8, 1] : 1 }}
            transition={{ duration: 0.4 }}
          />
        ))}
      </div>
      <span className="font-mono text-xs tabular-nums text-zinc-400">
        {found}/{TARGET_SYNONYMS}
      </span>
    </div>
  );
}

/** Emerald sparks that fly out of the target word on a win. */
function WinBurst() {
  const sparks = Array.from({ length: 16 }, (_, i) => {
    const angle = (i / 16) * Math.PI * 2;
    const dist = 110 + (i % 3) * 40;
    return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist * 0.6, size: 4 + (i % 3) * 2, delay: (i % 4) * 0.03 };
  });
  return (
    <div aria-hidden className="pointer-events-none absolute top-1/2 left-1/2">
      {sparks.map((s, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.9)]"
          style={{ width: s.size, height: s.size, marginLeft: -s.size / 2, marginTop: -s.size / 2 }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{ x: s.x, y: s.y, opacity: 0, scale: 0.4 }}
          transition={{ duration: 1.1, delay: s.delay, ease: [0.16, 1, 0.3, 1] }}
        />
      ))}
    </div>
  );
}

function Legend() {
  const order: WordCategory[] = ['synonym', 'antonym', 'contextual', 'chaos'];
  return (
    <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs">
      {order.map((c) => (
        <li key={c} className={`flex items-center gap-1.5 ${CATEGORY[c].text}`}>
          <CategoryIcon category={c} width={12} height={12} />
          {CATEGORY[c].plural}
        </li>
      ))}
    </ul>
  );
}

/* ───────────────────────────── GameBoard ───────────────────────────── */

export default function GameBoard({
  puzzle,
  words,
  state,
  foundCount,
  restoredComplete,
  onSelect,
  onShowResults,
  onOpenHelp,
}: GameBoardProps) {
  const reduceMotion = useReducedMotion() ?? false;
  const [flashKey, setFlashKey] = useState(0);
  const [announcement, setAnnouncement] = useState('');

  const selected = useMemo(() => new Set(state.selected), [state.selected]);
  const over = state.status !== 'playing';
  const won = state.status === 'won';
  const celebrate = won && !restoredComplete && !reduceMotion;

  // Split the cloud in two so the words orbit above and below the target word.
  const half = Math.ceil(words.length / 2);
  const topWords = words.slice(0, half);
  const bottomWords = words.slice(half);

  const handleSelect = (word: BoardWord): SelectResult => {
    const result = onSelect(word.id);
    if (result === 'wrong') {
      setFlashKey((k) => k + 1);
      buzz([30, 40, 30]);
      setAnnouncement(`${word.text} is ${CATEGORY[word.category].label.toLowerCase()}, not a synonym. One charge lost.`);
    } else if (result === 'correct') {
      buzz(12);
      setAnnouncement(`${word.text} is correct.`);
    }
    return result;
  };

  const badgeStateFor = (word: BoardWord): BadgeState =>
    selected.has(word.id) ? 'picked' : over ? 'revealed' : 'idle';

  const renderCloud = (list: BoardWord[], offset: number) => (
    <div className="mx-auto flex w-full max-w-3xl flex-wrap items-start justify-center gap-x-2 gap-y-2.5 sm:gap-x-4 sm:gap-y-4">
      {list.map((word, i) => (
        <WordBadge
          key={word.id}
          word={word}
          index={offset + i}
          badgeState={badgeStateFor(word)}
          reduceMotion={reduceMotion}
          onSelect={handleSelect}
        />
      ))}
    </div>
  );

  return (
    <section className="relative mx-auto flex w-full max-w-5xl flex-col items-center px-3 pb-12 sm:px-6">
      {/* HUD */}
      <div className="mb-6 flex w-full max-w-xl items-center justify-between gap-3 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-3 backdrop-blur-md sm:mb-10">
        <EnergyMeter energy={state.energy} over={over} />
        <div className="flex items-center gap-1.5 font-mono text-xs tabular-nums text-zinc-400">
          <ClockIcon width={14} height={14} />
          {formatDuration(state.elapsedMs)}
        </div>
        <FoundTracker found={foundCount} />
      </div>

      {renderCloud(topWords, 0)}

      {/* Target word */}
      <div className="relative my-8 flex flex-col items-center sm:my-12">
        <motion.div
          aria-hidden
          className={`absolute top-1/2 left-1/2 -z-10 h-40 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl transition-colors duration-700 sm:w-[28rem] ${
            won ? 'bg-emerald-500/25' : state.status === 'lost' ? 'bg-rose-500/15' : 'bg-emerald-500/10'
          }`}
          animate={reduceMotion ? undefined : { scale: [1, 1.08, 1], opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
        {celebrate && <WinBurst />}
        <span className="mb-1 text-[10px] font-medium tracking-[0.35em] text-zinc-500 uppercase sm:text-[11px]">
          #{puzzleNumber(state.dateKey)} · Find {TARGET_SYNONYMS} synonyms for
        </span>
        <motion.h1
          key={puzzle.id}
          initial={{ opacity: 0, y: 12, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)', scale: celebrate ? [1, 1.08, 1] : 1 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="bg-linear-to-b from-white via-zinc-100 to-zinc-500 bg-clip-text px-2 text-center font-display text-[clamp(2.75rem,12vw,5.5rem)] leading-none text-transparent italic"
        >
          {puzzle.targetWord.charAt(0)}
          {puzzle.targetWord.slice(1).toLowerCase()}
        </motion.h1>
        <span className="sr-only">{formatDateKey(state.dateKey)}</span>
      </div>

      {renderCloud(bottomWords, half)}

      {/* Footer: hint while playing, result banner when done */}
      <div className="mt-10 flex min-h-[4.5rem] w-full max-w-xl flex-col items-center justify-center text-center">
        <AnimatePresence mode="wait">
          {!over ? (
            <motion.p key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-sm text-zinc-500">
              Tap only the true synonyms. Every miss drains <span className="text-zinc-300">1 charge</span>.{' '}
              <button
                type="button"
                onClick={onOpenHelp}
                className="cursor-pointer whitespace-nowrap text-zinc-400 underline decoration-zinc-700 underline-offset-4 outline-none hover:text-zinc-200 focus-visible:text-zinc-100"
              >
                How to play
              </button>
            </motion.p>
          ) : (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
              className="flex flex-col items-center gap-4"
            >
              <p className={`text-sm ${won ? 'text-emerald-300' : 'text-rose-300'}`}>
                {won
                  ? `Solved in ${formatDuration(state.elapsedMs)} with ${state.energy} ${state.energy === 1 ? 'charge' : 'charges'} to spare.`
                  : 'Out of charge. Every word is revealed above.'}
              </p>
              <Legend />
              <motion.button
                type="button"
                onClick={onShowResults}
                whileTap={{ scale: 0.95 }}
                className="cursor-pointer rounded-full bg-zinc-100 px-6 py-2.5 text-sm font-semibold text-slate-950 transition-colors outline-none hover:bg-white focus-visible:ring-2 focus-visible:ring-emerald-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                View results
              </motion.button>
              <p className="text-xs text-zinc-600">Come back tomorrow for a new word.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Red screen-edge flash on a wrong pick */}
      <AnimatePresence>
        {flashKey > 0 && !reduceMotion && (
          <motion.div
            key={flashKey}
            aria-hidden
            className="pointer-events-none fixed inset-0 z-40 shadow-[inset_0_0_140px_rgba(244,63,94,0.35)]"
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          />
        )}
      </AnimatePresence>

      {/* Screen reader feedback */}
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </section>
  );
}
