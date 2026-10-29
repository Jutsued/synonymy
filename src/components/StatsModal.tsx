import { useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { BoardWord, GameState, PlayerStats, Puzzle } from '../types';
import { formatCountdown, formatDateKey, formatDuration, puzzleNumber } from '../lib/clock';
import { CATEGORY } from '../lib/categories';
import { MAX_ENERGY, winRate } from '../lib/stats';
import { triggerResendNewsletter } from '../lib/integrations';
import { loadNewsletterSubscribed, saveNewsletterSubscribed } from '../lib/storage';
import Modal from './Modal';
import { track } from '../lib/analytics';
import { BoltIcon, CheckIcon, MailIcon, ShareIcon } from './icons';

interface StatsModalProps {
  open: boolean;
  onClose: () => void;
  puzzle: Puzzle;
  words: BoardWord[];
  state: GameState;
  stats: PlayerStats;
  streak: number;
  score: number;
  msLeft: number;
}

/* ───────────────────────────── share text ───────────────────────────── */

/** One emoji per pick, in the order they were made. */
function pickGrid(words: BoardWord[], state: GameState): string {
  const byId = new Map(words.map((w) => [w.id, w]));
  return state.selected.map((id) => CATEGORY[byId.get(id)?.category ?? 'chaos'].emoji).join('');
}

function buildShareText(words: BoardWord[], state: GameState, streak: number): string {
  const result = state.status === 'won' ? `⚡${state.energy}/${MAX_ENERGY}` : `💥 0/${MAX_ENERGY}`;
  return [
    `Kinword #${puzzleNumber(state.dateKey)}`,
    pickGrid(words, state),
    `${result} · ⏱ ${formatDuration(state.elapsedMs)} · 🔥 ${streak}`,
    import.meta.env.VITE_SITE_URL, // every shared result links back to the game
  ].join('\n');
}

/* ───────────────────────────── small pieces ───────────────────────────── */

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 px-1 py-3">
      <span className="font-mono text-xl font-medium tabular-nums text-zinc-100 sm:text-2xl">{value}</span>
      <span className="text-[10px] tracking-[0.16em] text-zinc-500 uppercase">{label}</span>
    </div>
  );
}

/** Wordle-style bar chart: how many charges were left when you won (or lost). */
function Distribution({ stats, state }: { stats: PlayerStats; state: GameState }) {
  const rows = [5, 4, 3, 2, 1, 0];
  const max = Math.max(1, ...stats.distribution);
  const todayRow = state.status === 'won' ? Math.max(1, state.energy) : state.status === 'lost' ? 0 : null;

  return (
    <div>
      <p className="mb-2 text-[10px] tracking-[0.25em] text-zinc-500 uppercase">Charges left when solved</p>
      <ul className="flex flex-col gap-1.5">
        {rows.map((row, i) => {
          const count = stats.distribution[row] ?? 0;
          const isToday = row === todayRow;
          const pct = Math.max(8, (count / max) * 100);
          return (
            <li key={row} className="flex items-center gap-2">
              <span className="flex w-9 shrink-0 items-center justify-end gap-0.5 font-mono text-xs text-zinc-500">
                {row === 0 ? (
                  'Lost'
                ) : (
                  <>
                    <BoltIcon width={11} height={11} />
                    {row}
                  </>
                )}
              </span>
              <div className="flex-1">
                <motion.div
                  className={`flex h-5 items-center justify-end rounded-md px-1.5 font-mono text-[11px] font-medium tabular-nums ${
                    isToday
                      ? row === 0
                        ? 'bg-rose-500/70 text-white'
                        : 'bg-emerald-500/80 text-slate-950'
                      : 'bg-zinc-800 text-zinc-300'
                  }`}
                  initial={{ width: '8%' }}
                  animate={{ width: `${pct}%` }}
                  transition={{ type: 'spring', stiffness: 140, damping: 20, delay: 0.15 + i * 0.05 }}
                >
                  {count}
                </motion.div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>(() =>
    loadNewsletterSubscribed() ? 'success' : 'idle',
  );
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      setStatus('error');
      setMessage("That email doesn't look right.");
      return;
    }
    setStatus('loading');
    setMessage('');
    // ── Extension point: Resend daily reminder ──
    const res = await triggerResendNewsletter(trimmed);
    if (res.ok) {
      saveNewsletterSubscribed();
      track('newsletter_signup');
      setStatus('success');
    } else {
      setStatus('error');
      setMessage(res.error);
    }
  };

  if (status === 'success') {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-300">
        <CheckIcon />
        You're on the list. See you tomorrow.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-2">
      <label htmlFor="reminder-email" className="text-xs text-zinc-500">
        Get a one-line reminder when the next puzzle drops.
      </label>
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <MailIcon className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-zinc-500" />
          <input
            id="reminder-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (status === 'error') setStatus('idle');
            }}
            aria-invalid={status === 'error'}
            className="h-11 w-full min-w-0 rounded-xl border border-zinc-800 bg-zinc-900/60 pr-3 pl-9 text-base text-zinc-100 placeholder:text-zinc-600 outline-none transition-colors focus:border-zinc-600 aria-invalid:border-rose-500/50 sm:text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={status === 'loading'}
          className="h-11 shrink-0 cursor-pointer rounded-xl border border-zinc-700 bg-zinc-800 px-4 text-sm font-medium text-zinc-100 transition-colors outline-none hover:bg-zinc-700 focus-visible:ring-2 focus-visible:ring-emerald-400/60 disabled:cursor-wait disabled:opacity-60"
        >
          {status === 'loading' ? 'Adding…' : 'Remind me'}
        </button>
      </div>
      {status === 'error' && message && <p className="text-xs text-rose-400">{message}</p>}
    </form>
  );
}

/* ───────────────────────────── modal ───────────────────────────── */

export default function StatsModal({ open, onClose, puzzle, words, state, stats, streak, score, msLeft }: StatsModalProps) {
  const [copied, setCopied] = useState(false);
  const over = state.status !== 'playing';
  const won = state.status === 'won';

  const handleShare = async () => {
    const text = buildShareText(words, state, streak);
    try {
      const isTouch = window.matchMedia('(pointer: coarse)').matches;
      if (isTouch && 'share' in navigator) {
        track('share', { method: 'share_sheet' });
        await navigator.share({ text });
        return;
      }
      await navigator.clipboard.writeText(text);
      track('share', { method: 'clipboard' });
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // User cancelled the share sheet, or clipboard was blocked. Nothing to do.
    }
  };

  const selected = new Set(state.selected);
  const synonymWords = words.filter((w) => w.category === 'synonym');

  const headline = !over ? 'Your stats' : won ? 'Synonymous.' : 'Out of charge.';
  const subline = !over
    ? 'Finish today’s puzzle to lock in your streak.'
    : won
      ? state.energy === MAX_ENERGY
        ? 'Flawless. Not a single charge spent.'
        : 'Every true synonym, found.'
      : 'So close. A fresh word is on the way.';

  return (
    <Modal open={open} onClose={onClose} labelledBy="stats-title">
      {/* Header */}
      <div className="pr-10">
        <p className="text-[10px] tracking-[0.3em] text-zinc-500 uppercase">
          Kinword #{puzzleNumber(state.dateKey)} · {formatDateKey(state.dateKey)}
        </p>
        <h2
          id="stats-title"
          className={`mt-1 font-display text-4xl italic ${!over ? 'text-zinc-100' : won ? 'text-emerald-300' : 'text-rose-300'}`}
        >
          {headline}
        </h2>
        <p className="mt-1 text-sm text-zinc-400">{subline}</p>
      </div>

      {/* Today's answers — only after the game is over, so nothing gets spoiled */}
      {over && (
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-4">
          <p className="text-[10px] tracking-[0.25em] text-zinc-500 uppercase">
            Synonyms for <span className="text-zinc-300">{puzzle.targetWord}</span>
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {synonymWords.map((w) => {
              const hit = selected.has(w.id);
              return (
                <span
                  key={w.id}
                  className={`flex items-center gap-1 rounded-full border px-3 py-1 text-sm ${
                    hit ? CATEGORY.synonym.badge : 'border-dashed border-zinc-700 text-zinc-500'
                  }`}
                >
                  {hit && <CheckIcon width={12} height={12} />}
                  {w.text}
                </span>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-zinc-500">
            Your picks: <span className="tracking-[0.15em]">{pickGrid(words, state)}</span>
          </p>
        </div>
      )}

      {/* Today's result */}
      {over && (
        <div className="grid grid-cols-3 gap-2">
          <StatTile label="Time" value={formatDuration(state.elapsedMs)} />
          <StatTile label="Charges" value={`${state.energy}/${MAX_ENERGY}`} />
          <StatTile label="Score" value={score} />
        </div>
      )}

      {/* Lifetime stats */}
      <div>
        <p className="mb-2 text-[10px] tracking-[0.25em] text-zinc-500 uppercase">Lifetime</p>
        <div className="grid grid-cols-4 gap-2">
          <StatTile label="Played" value={stats.played} />
          <StatTile label="Win %" value={winRate(stats)} />
          <StatTile label="Streak" value={streak} />
          <StatTile label="Best" value={stats.maxStreak} />
        </div>
        {stats.bestTimeMs !== null && (
          <p className="mt-2 text-center text-xs text-zinc-500">
            Fastest solve: <span className="font-mono text-zinc-300">{formatDuration(stats.bestTimeMs)}</span>
          </p>
        )}
      </div>

      {stats.played > 0 && <Distribution stats={stats} state={state} />}

      {/* Countdown + share */}
      <div className="flex items-stretch gap-2">
        <div className="flex flex-1 flex-col justify-center rounded-2xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-3">
          <span className="text-[10px] tracking-[0.25em] text-zinc-500 uppercase">Next puzzle</span>
          <span className="font-mono text-2xl tabular-nums text-zinc-100">{formatCountdown(msLeft)}</span>
        </div>
        {over && (
          <motion.button
            type="button"
            onClick={handleShare}
            whileTap={{ scale: 0.95 }}
            className={`flex min-w-[7.5rem] cursor-pointer items-center justify-center gap-2 rounded-2xl px-5 text-sm font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 ${
              copied ? 'bg-emerald-500 text-slate-950' : 'bg-zinc-100 text-slate-950 hover:bg-white'
            }`}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={copied ? 'copied' : 'share'}
                className="flex items-center gap-2"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
              >
                {copied ? <CheckIcon /> : <ShareIcon />}
                {copied ? 'Copied' : 'Share'}
              </motion.span>
            </AnimatePresence>
          </motion.button>
        )}
      </div>

      <div className="h-px shrink-0 bg-zinc-800/80" />

      <NewsletterForm />

      <p className="text-center text-[11px] text-zinc-600">
        Progress is saved on this device. New puzzle daily at 00:00 UTC.
      </p>
    </Modal>
  );
}
