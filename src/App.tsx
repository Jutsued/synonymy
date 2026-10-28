import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Header from './components/Header';
import GameBoard from './components/GameBoard';
import StatsModal from './components/StatsModal';
import { LogoMark } from './components/icons';
import { useDailyGame } from './hooks/useDailyGame';
import { useServerNow } from './hooks/useServerNow';
import {
  msUntilNextUtcMidnight,
  resolveDateKey,
  syncServerClock,
  toUtcDateKey,
  type ClockSync,
} from './lib/clock';

/* ───────────────────────────── background ───────────────────────────── */

function Ambient() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="absolute -top-48 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-emerald-500/[0.07] blur-[120px]" />
      <div className="absolute -right-32 -bottom-56 h-[460px] w-[460px] rounded-full bg-zinc-400/[0.06] blur-[120px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,0.05)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)] bg-[length:28px_28px]" />
    </div>
  );
}

function Splash() {
  return (
    <motion.div
      key="splash"
      className="flex min-h-dvh items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.2 } }}
    >
      <motion.div
        animate={{ scale: [1, 1.08, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <LogoMark width={48} height={48} className="text-zinc-300" />
      </motion.div>
    </motion.div>
  );
}

/* ───────────────────────────── game shell ───────────────────────────── */

function Game({ clock }: { clock: ClockSync }) {
  const now = useServerNow(clock.offsetMs);
  const [dateKey, setDateKey] = useState(() => resolveDateKey(Date.now() + clock.offsetMs, clock.trusted));

  // Midnight UTC passed while the tab was open -> move to the new puzzle.
  const liveKey = toUtcDateKey(now);
  useEffect(() => {
    if (liveKey > dateKey) {
      setDateKey(resolveDateKey(Date.now() + clock.offsetMs, clock.trusted));
    }
  }, [liveKey, dateKey, clock]);

  const game = useDailyGame(dateKey);
  const msLeft = msUntilNextUtcMidnight(now);

  // Already finished today on load? Stats open immediately (and can't be closed).
  const [statsOpen, setStatsOpen] = useState(game.restoredComplete);
  const [statsForDate, setStatsForDate] = useState(dateKey);
  if (statsForDate !== dateKey) {
    setStatsForDate(dateKey);
    setStatsOpen(game.restoredComplete);
  }

  // Finished during this session -> let the final animation breathe, then show results.
  const { completedAt } = game.state;
  const { restoredComplete } = game;
  useEffect(() => {
    if (!completedAt || restoredComplete) return;
    const t = window.setTimeout(() => setStatsOpen(true), 1400);
    return () => window.clearTimeout(t);
  }, [completedAt, restoredComplete]);

  return (
    <>
      <Header streak={game.displayStreak} msLeft={msLeft} onOpenStats={() => setStatsOpen(true)} />

      <main className="relative z-10">
        {!game.restoredComplete && (
          <GameBoard
            key={dateKey}
            puzzle={game.puzzle}
            words={game.words}
            state={game.state}
            foundCount={game.foundCount}
            onSelect={game.selectWord}
            onShowResults={() => setStatsOpen(true)}
          />
        )}
      </main>

      <StatsModal
        open={statsOpen}
        onClose={game.restoredComplete ? undefined : () => setStatsOpen(false)}
        puzzle={game.puzzle}
        words={game.words}
        state={game.state}
        stats={game.stats}
        streak={game.displayStreak}
        score={game.score}
        msLeft={msLeft}
      />
    </>
  );
}

/* ───────────────────────────── root ───────────────────────────── */

export default function App() {
  const [clock, setClock] = useState<ClockSync | null>(null);

  // Sync with the host's clock once before deciding which puzzle to show.
  useEffect(() => {
    let alive = true;
    void syncServerClock().then((result) => {
      if (alive) setClock(result);
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-slate-950 text-zinc-100">
      <Ambient />
      <AnimatePresence mode="wait">
        {clock ? (
          <motion.div
            key="game"
            className="relative"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <Game clock={clock} />
          </motion.div>
        ) : (
          <Splash />
        )}
      </AnimatePresence>
    </div>
  );
}
