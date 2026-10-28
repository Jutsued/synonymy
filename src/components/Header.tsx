import { AnimatePresence, motion } from 'framer-motion';
import { formatCountdown } from '../lib/clock';
import { ChartIcon, ClockIcon, FlameIcon, LogoMark } from './icons';

interface HeaderProps {
  streak: number;
  msLeft: number;
  onOpenStats: () => void;
}

export default function Header({ streak, msLeft, onOpenStats }: HeaderProps) {
  const hot = streak > 0;

  return (
    <header className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-between gap-2 px-4 py-4 sm:px-8 sm:py-6">
      <div className="flex items-center gap-2.5">
        <LogoMark className="text-zinc-300" />
        <span className="hidden font-display text-2xl italic tracking-tight text-zinc-100 min-[380px]:inline">
          Synonymy
        </span>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Daily streak */}
        <div
          className={`flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-semibold tabular-nums backdrop-blur-md transition-colors ${
            hot
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
              : 'border-zinc-800 bg-zinc-900/50 text-zinc-500'
          }`}
          title="Daily streak"
          aria-label={`Daily streak: ${streak}`}
        >
          <FlameIcon className={hot ? 'text-emerald-400' : 'text-zinc-600'} />
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={streak}
              initial={{ y: 10, opacity: 0, scale: 0.6 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -10, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 20 }}
            >
              {streak}
            </motion.span>
          </AnimatePresence>
        </div>

        {/* Countdown to next puzzle */}
        <div
          className="flex h-9 items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900/50 px-3 backdrop-blur-md"
          title="Next puzzle in"
        >
          <ClockIcon className="text-zinc-500" />
          <span className="hidden text-[11px] uppercase tracking-[0.18em] text-zinc-500 md:inline">Next</span>
          <span className="font-mono text-sm tabular-nums text-zinc-200" aria-label="Time until next puzzle">
            {formatCountdown(msLeft)}
          </span>
        </div>

        <button
          type="button"
          onClick={onOpenStats}
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-zinc-800 bg-zinc-900/50 text-zinc-400 backdrop-blur-md transition-colors outline-none hover:border-zinc-600 hover:text-zinc-100 focus-visible:ring-2 focus-visible:ring-emerald-400/60"
          aria-label="Open statistics"
        >
          <ChartIcon />
        </button>
      </div>
    </header>
  );
}
