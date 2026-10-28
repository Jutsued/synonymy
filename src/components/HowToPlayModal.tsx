import { motion } from 'framer-motion';
import type { WordCategory } from '../types';
import { CATEGORY } from '../lib/categories';
import { MAX_ENERGY } from '../lib/stats';
import Modal from './Modal';
import { BoltIcon, CategoryIcon, FlameIcon } from './icons';

interface HowToPlayModalProps {
  open: boolean;
  onClose: () => void;
}

/** One example per category, using a word that isn't in the puzzle bank. */
const EXAMPLES: { word: string; category: WordCategory; note: string }[] = [
  { word: 'Glowing', category: 'synonym', note: 'Same meaning. Tap these!' },
  { word: 'Dim', category: 'antonym', note: 'The opposite meaning. Costs a charge.' },
  { word: 'Lantern', category: 'contextual', note: 'Same scene, different meaning. Costs a charge.' },
  { word: 'Walrus', category: 'chaos', note: 'Totally unrelated. Costs a charge.' },
];

export default function HowToPlayModal({ open, onClose }: HowToPlayModalProps) {
  return (
    <Modal open={open} onClose={onClose} labelledBy="help-title">
      <div className="pr-10">
        <p className="text-[10px] tracking-[0.3em] text-zinc-500 uppercase">Daily word puzzle</p>
        <h2 id="help-title" className="mt-1 font-display text-4xl text-zinc-100 italic">
          How to play
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          Find the <strong className="text-zinc-100">5 synonyms</strong> of the word in the middle. They're hiding
          among 20 floating words.
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-4">
        <p className="text-[10px] tracking-[0.25em] text-zinc-500 uppercase">
          Example: synonyms for <span className="text-zinc-300">Luminous</span>
        </p>
        <ul className="mt-3 flex flex-col gap-2.5">
          {EXAMPLES.map((ex, i) => (
            <motion.li
              key={ex.word}
              className="flex items-center gap-3"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + i * 0.07 }}
            >
              <span
                className={`flex w-[7.5rem] shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium ${CATEGORY[ex.category].badge}`}
              >
                <CategoryIcon category={ex.category} width={13} height={13} />
                {ex.word}
              </span>
              <span className="text-sm leading-snug text-zinc-400">
                <span className={`font-medium ${CATEGORY[ex.category].text}`}>{CATEGORY[ex.category].label}.</span>{' '}
                {ex.note}
              </span>
            </motion.li>
          ))}
        </ul>
      </div>

      <ul className="flex flex-col gap-3 text-sm leading-relaxed text-zinc-400">
        <li className="flex gap-3">
          <BoltIcon className="mt-0.5 shrink-0 text-zinc-300" />
          <span>
            You have <strong className="text-zinc-100">{MAX_ENERGY} energy charges</strong>. Every wrong tap costs
            one, and the word shows you which trap it was.
          </span>
        </li>
        <li className="flex gap-3">
          <FlameIcon className="mt-0.5 shrink-0 text-emerald-400" />
          <span>
            Win on back-to-back days to build your <strong className="text-zinc-100">streak</strong>. Everyone gets
            the same puzzle, and a new one drops at midnight UTC.
          </span>
        </li>
      </ul>

      <motion.button
        type="button"
        onClick={onClose}
        whileTap={{ scale: 0.97 }}
        className="h-12 w-full cursor-pointer rounded-2xl bg-zinc-100 text-sm font-semibold text-slate-950 transition-colors outline-none hover:bg-white focus-visible:ring-2 focus-visible:ring-emerald-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
      >
        Let's play
      </motion.button>
    </Modal>
  );
}
