import { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useAnimationControls, useReducedMotion } from 'framer-motion';
import type { BadgeSize, BoardWord, GameState, Puzzle } from '../types';
import type { SelectResult } from '../hooks/useDailyGame';
import { MAX_ENERGY, TARGET_SYNONYMS } from '../lib/stats';
import { formatDuration } from '../lib/clock';
import { BoltIcon, CheckIcon, ClockIcon } from './icons';

type BadgeStatus = 'idle' | 'correct' | 'wrong' | 'revealed' | 'inactive';

interface GameBoardProps {
  puzzle: Puzzle;
  words: BoardWord[];
  state: GameState;
  foundCount: number;
  onSelect: (wordId: string) => SelectResult;
  onShowResults: () => void;
}

/* ───────────────────────────── helpers ───────────────────────────── */

const SIZE_CLASSES: Record<BadgeSize, string> = {
  sm: 'px-3 py-1.5 text-[13px] sm:px-3.5 sm:text-sm',
  md: 'px-3.5 py-2 text-sm sm:px-4 sm:text-base',
  lg: 'px-4 py-2 text-[15px] sm:px-5 sm:py-2.5 sm:text-lg',
};

const STATUS_CLASSES: Record<BadgeStatus, string> = {
  idle:
    'cursor-pointer border-zinc-800 bg-zinc-900/50 text-zinc-200 shadow-[0_10px_30px_-14px_rgba(0,0,0,0.9)] hover:border-zinc-600 hover:bg-zinc-800/60 hover:text-white',
  correct:
    'border-emerald-400/60 bg-emerald-500/15 text-emerald-200 shadow-[0_0_28px_-6px_rgba(16,185,129,0.6)]',
  wrong: 'border-rose-500/40 bg-rose-500/10 text-rose-300/80 line-through decoration-rose-400/60',
  revealed: 'border-dashed border-emerald-400/50 bg-emerald-500/5 text-emerald-300/90',
  inactive: 'border-zinc-800/60 bg-zinc-900/30 text-zinc-600',
};

function getStatus(word: BoardWord, selected: Set<string>, over: boolean): BadgeStatus {
  const isSynonym = word.category === 'synonym';
  if (selected.has(word.id)) return isSynonym ? 'correct' : 'wrong';
  if (over) return isSynonym ? 'revealed' : 'inactive';
  return 'idle';
}

/* ───────────────────────────── WordBadge ───────────────────────────── */

interface WordBadgeProps {
  word: BoardWord;
  index: number;
  status: BadgeStatus;
  reduceMotion: boolean;
  onSelect: (word: BoardWord) => SelectResult;
}

/**
 * Three motion layers, each with ONE job, so animations never fight:
 *   1. outer div  -> entrance fade + endless idle float (y)
 *   2. middle div -> wrong-answer shake (x), triggered imperatively
 *   3. button     -> spring scale/rotate on hover, tap and success
 */
function WordBadge({ word, index, status, reduceMotion, onSelect }: WordBadgeProps) {
  const shake = useAnimationControls();
  // Remember the status we mounted with, so bursts only play for NEW clicks, not on refresh.
  const mountedStatus = useRef(status);
  const interactive = status === 'idle';

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
          : {
              duration: word.visual.floatDuration,
              delay: word.visual.floatDelay,
              repeat: Infinity,
              ease: 'easeInOut',
            },
      }}
    >
      <motion.div animate={shake}>
        <motion.button
          type="button"
          onClick={handleClick}
          disabled={!interactive}
          aria-pressed={status === 'correct' || status === 'wrong'}
          aria-label={
            status === 'correct'
              ? `${word.text}, correct synonym`
              : status === 'wrong'
                ? `${word.text}, not a synonym`
                : status === 'revealed'
                  ? `${word.text}, missed synonym`
                  : word.text
          }
          animate={{
            scale: status === 'correct' ? 1.07 : 1,
            rotate: status === 'idle' ? word.visual.rotate : 0,
          }}
          whileHover={interactive && !reduceMotion ? { scale: 1.07, rotate: 0 } : undefined}
          whileTap={interactive ? { scale: 0.86 } : undefined}
          transition={{ type: 'spring', stiffness: 520, damping: 14, mass: 0.8 }}
          className={`relative flex items-center gap-1.5 rounded-full border font-medium tracking-wide whitespace-nowrap backdrop-blur-md transition-colors duration-300 outline-none select-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${SIZE_CLASSES[word.visual.size]} ${STATUS_CLASSES[status]}`}
        >
          {status === 'correct' && <CheckIcon width={14} height={14} className="text-emerald-400" />}
          {word.text}

          {/* One-shot ring burst on a fresh click */}
          {(status === 'correct' || status === 'wrong') && mountedStatus.current !== status && !reduceMotion && (
            <motion.span
              aria-hidden
              className={`pointer-events-none absolute inset-0 rounded-full border-2 ${
                status === 'correct' ? 'border-emerald-400' : 'border-rose-500'
              }`}
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
              className={`h-2 w-4 rounded-full transition-colors duration-300 sm:w-6 ${
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

/* ───────────────────────────── GameBoard ───────────────────────────── */

export default function GameBoard({ puzzle, words, state, foundCount, onSelect, onShowResults }: GameBoardProps) {
  const reduceMotion = useReducedMotion() ?? false;
  const [flashKey, setFlashKey] = useState(0);
  const [announcement, setAnnouncement] = useState('');

  const selected = useMemo(() => new Set(state.selected), [state.selected]);
  const over = state.status !== 'playing';
  const won = state.status === 'won';

  // Split the cloud in two so the words orbit above and below the target word.
  const half = Math.ceil(words.length / 2);
  const topWords = words.slice(0, half);
  const bottomWords = words.slice(half);

  const handleSelect = (word: BoardWord): SelectResult => {
    const result = onSelect(word.id);
    if (result === 'wrong') {
      setFlashKey((k) => k + 1);
      setAnnouncement(`${word.text} is not a synonym. One energy charge lost.`);
    } else if (result === 'correct') {
      setAnnouncement(`${word.text} is correct.`);
    }
    return result;
  };

  const renderCloud = (list: BoardWord[], offset: number) => (
    <div className="mx-auto flex w-full max-w-3xl flex-wrap items-start justify-center gap-x-2 gap-y-2.5 sm:gap-x-4 sm:gap-y-4">
      {list.map((word, i) => (
        <WordBadge
          key={word.id}
          word={word}
          index={offset + i}
          status={getStatus(word, selected, over)}
          reduceMotion={reduceMotion}
          onSelect={handleSelect}
        />
      ))}
    </div>
  );

  return (
    <section className="relative mx-auto flex w-full max-w-5xl flex-col items-center px-3 pb-16 sm:px-6">
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
          className={`absolute top-1/2 left-1/2 -z-10 h-40 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl sm:w-[28rem] ${
            won ? 'bg-emerald-500/25' : state.status === 'lost' ? 'bg-rose-500/15' : 'bg-emerald-500/10'
          }`}
          animate={reduceMotion ? undefined : { scale: [1, 1.08, 1], opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
        <span className="mb-1 text-[10px] font-medium tracking-[0.35em] text-zinc-500 uppercase sm:text-[11px]">
          Find {TARGET_SYNONYMS} synonyms for
        </span>
        <motion.h1
          key={puzzle.id}
          initial={{ opacity: 0, y: 12, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)', scale: won ? [1, 1.06, 1] : 1 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="bg-linear-to-b from-white via-zinc-100 to-zinc-500 bg-clip-text px-2 text-center font-display text-[clamp(2.75rem,12vw,5.5rem)] leading-none text-transparent italic"
        >
          {puzzle.targetWord.charAt(0)}
          {puzzle.targetWord.slice(1).toLowerCase()}
        </motion.h1>
      </div>

      {renderCloud(bottomWords, half)}

      {/* Footer: hint while playing, result banner when done */}
      <div className="mt-10 flex min-h-[4.5rem] w-full max-w-xl flex-col items-center justify-center text-center">
        <AnimatePresence mode="wait">
          {!over ? (
            <motion.p
              key="hint"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-sm text-zinc-500"
            >
              Tap only the true synonyms. Every miss drains <span className="text-zinc-300">1 charge</span>.{' '}
              <a href="#about" className="whitespace-nowrap text-zinc-400 underline decoration-zinc-700 underline-offset-4 hover:text-zinc-200">
                How to play
              </a>
            </motion.p>
          ) : (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
              className="flex flex-col items-center gap-3"
            >
              <p className={`text-sm ${won ? 'text-emerald-300' : 'text-rose-300'}`}>
                {won
                  ? `Solved in ${formatDuration(state.elapsedMs)} with ${state.energy} ${state.energy === 1 ? 'charge' : 'charges'} to spare.`
                  : 'Out of charge. The missed synonyms are outlined above.'}
              </p>
              <motion.button
                type="button"
                onClick={onShowResults}
                whileTap={{ scale: 0.95 }}
                className="cursor-pointer rounded-full bg-zinc-100 px-6 py-2.5 text-sm font-semibold text-slate-950 transition-colors outline-none hover:bg-white focus-visible:ring-2 focus-visible:ring-emerald-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                View results
              </motion.button>
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
