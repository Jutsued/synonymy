import { useEffect, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { BoardWord, GameState, PlayerStats, Puzzle } from '../types';
import { formatCountdown, formatDateKey, formatDuration } from '../lib/clock';
import { MAX_ENERGY, winRate } from '../lib/stats';
import { triggerResendNewsletter } from '../lib/integrations';
import { loadNewsletterSubscribed, saveNewsletterSubscribed } from '../lib/storage';
import { CheckIcon, CloseIcon, MailIcon, ShareIcon } from './icons';

interface StatsModalProps {
  open: boolean;
  /** Leave undefined to make the modal non-dismissible (today's game already finished on load). */
  onClose?: () => void;
  puzzle: Puzzle;
  words: BoardWord[];
  state: GameState;
  stats: PlayerStats;
  streak: number;
  score: number;
  msLeft: number;
}

/* ───────────────────────────── share text ───────────────────────────── */

function buildShareText(puzzle: Puzzle, words: BoardWord[], state: GameState, streak: number): string {
  const byId = new Map(words.map((w) => [w.id, w]));
  const grid = state.selected
    .map((id) => (byId.get(id)?.category === 'synonym' ? '🟩' : '🟥'))
    .join('');
  const result = state.status === 'won' ? `⚡${state.energy}/${MAX_ENERGY}` : '💥 0/5';
  return [
    `Synonymy · ${formatDateKey(state.dateKey)}`,
    `${puzzle.targetWord}`,
    grid,
    `${result} · ⏱ ${formatDuration(state.elapsedMs)} · 🔥 ${streak}`,
  ].join('\n');
}

/* ───────────────────────────── small pieces ───────────────────────────── */

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 px-2 py-3">
      <span className="font-mono text-xl font-medium tabular-nums text-zinc-100 sm:text-2xl">{value}</span>
      <span className="text-[10px] tracking-[0.18em] text-zinc-500 uppercase">{label}</span>
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
        <div className="relative flex-1">
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
            className="h-11 w-full min-w-0 rounded-xl border border-zinc-800 bg-zinc-900/60 pr-3 pl-9 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition-colors focus:border-zinc-600 aria-invalid:border-rose-500/50"
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

export default function StatsModal({
  open,
  onClose,
  puzzle,
  words,
  state,
  stats,
  streak,
  score,
  msLeft,
}: StatsModalProps) {
  const [copied, setCopied] = useState(false);
  const over = state.status !== 'playing';
  const won = state.status === 'won';
  const dismissible = Boolean(onClose);

  // Escape to close + lock page scroll behind the modal.
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  const handleShare = async () => {
    const text = buildShareText(puzzle, words, state, streak);
    try {
      const isTouch = window.matchMedia('(pointer: coarse)').matches;
      if (isTouch && 'share' in navigator) {
        await navigator.share({ text });
        return;
      }
      await navigator.clipboard.writeText(text);
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
      ? 'Every true synonym, found.'
      : 'So close. A fresh word is on the way.';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="stats-modal"
          className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {/* Backdrop */}
          <div
            aria-hidden
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={() => onClose?.()}
          />

          {/* Panel */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="stats-title"
            className="relative flex max-h-[92dvh] w-full max-w-md flex-col gap-6 overflow-y-auto rounded-3xl border border-zinc-800 bg-zinc-950/85 p-5 shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9)] backdrop-blur-xl sm:p-7"
            initial={{ y: 40, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] tracking-[0.3em] text-zinc-500 uppercase">
                  Puzzle · {formatDateKey(state.dateKey)}
                </p>
                <h2
                  id="stats-title"
                  className={`mt-1 font-display text-4xl italic ${
                    !over ? 'text-zinc-100' : won ? 'text-emerald-300' : 'text-rose-300'
                  }`}
                >
                  {headline}
                </h2>
                <p className="mt-1 text-sm text-zinc-400">{subline}</p>
              </div>
              {dismissible && (
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-zinc-800 text-zinc-400 transition-colors outline-none hover:border-zinc-600 hover:text-zinc-100 focus-visible:ring-2 focus-visible:ring-emerald-400/60"
                >
                  <CloseIcon />
                </button>
              )}
            </div>

            {/* Today's answers — only after the game is over, so nothing gets spoiled */}
            {over && (
              <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-4">
                <p className="text-[10px] tracking-[0.25em] text-zinc-500 uppercase">
                  Synonyms for{' '}
                  <span className="text-zinc-300">{puzzle.targetWord}</span>
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {synonymWords.map((w) => {
                    const hit = selected.has(w.id);
                    return (
                      <span
                        key={w.id}
                        className={`flex items-center gap-1 rounded-full border px-3 py-1 text-sm ${
                          hit
                            ? 'border-emerald-400/50 bg-emerald-500/10 text-emerald-200'
                            : 'border-dashed border-zinc-700 text-zinc-500'
                        }`}
                      >
                        {hit && <CheckIcon width={12} height={12} />}
                        {w.text}
                      </span>
                    );
                  })}
                </div>
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
                  {copied ? <CheckIcon /> : <ShareIcon />}
                  {copied ? 'Copied' : 'Share'}
                </motion.button>
              )}
            </div>

            <div className="h-px bg-zinc-800/80" />

            <NewsletterForm />

            <p className="text-center text-[11px] text-zinc-600">
              Progress is saved on this device. New puzzle daily at 00:00 UTC.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
