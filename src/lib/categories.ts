import type { WordCategory } from '../types';

/**
 * Everything the UI needs to know about each word category, in one place:
 * names, colors and the emoji used in the share grid.
 */
export const CATEGORY: Record<
  WordCategory,
  { label: string; plural: string; emoji: string; text: string; badge: string; muted: string }
> = {
  synonym: {
    label: 'Synonym',
    plural: 'Synonyms',
    emoji: '🟩',
    text: 'text-emerald-300',
    badge: 'border-emerald-400/60 bg-emerald-500/15 text-emerald-200',
    muted: 'border-dashed border-emerald-400/50 bg-emerald-500/5 text-emerald-300/90',
  },
  antonym: {
    label: 'Opposite',
    plural: 'Opposites',
    emoji: '🟥',
    text: 'text-rose-300',
    badge: 'border-rose-500/45 bg-rose-500/10 text-rose-300',
    muted: 'border-rose-500/20 bg-rose-500/[0.04] text-rose-300/55',
  },
  contextual: {
    label: 'Related',
    plural: 'Related',
    emoji: '🟨',
    text: 'text-amber-200',
    badge: 'border-amber-400/40 bg-amber-400/10 text-amber-200',
    muted: 'border-amber-400/15 bg-amber-400/[0.03] text-amber-200/50',
  },
  chaos: {
    label: 'Bomb',
    plural: 'Bombs',
    emoji: '⬛',
    text: 'text-zinc-300',
    badge: 'border-zinc-600 bg-zinc-800/70 text-zinc-300',
    muted: 'border-zinc-800/70 bg-zinc-900/30 text-zinc-500',
  },
};
