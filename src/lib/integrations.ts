/**
 * ─────────────────────────────────────────────────────────────────────────
 *  EXTENSION POINTS — Supabase (leaderboards) & Resend (daily reminders)
 * ─────────────────────────────────────────────────────────────────────────
 *  Both functions are safe stubs right now: they log in dev and resolve
 *  successfully, so the UI is fully wired and you only swap the insides.
 */

export type IntegrationResult = { ok: true } | { ok: false; error: string };

export interface ScoreMeta {
  dateKey: string;
  puzzleId: string;
  won: boolean;
  elapsedMs: number;
  energyLeft: number;
}

/**
 * SUPABASE — push today's result to a global leaderboard.
 *
 * Setup:
 *   1. npm i @supabase/supabase-js
 *   2. .env.local:
 *        VITE_SUPABASE_URL=https://xxxx.supabase.co
 *        VITE_SUPABASE_ANON_KEY=eyJ...   (anon key is OK in the browser)
 *   3. Table (SQL editor):
 *        create table daily_scores (
 *          id          bigint generated always as identity primary key,
 *          player_id   text not null,
 *          date_key    date not null,
 *          puzzle_id   text not null,
 *          score       int  not null,
 *          streak      int  not null,
 *          won         boolean not null,
 *          elapsed_ms  int  not null,
 *          energy_left int  not null,
 *          created_at  timestamptz default now(),
 *          unique (player_id, date_key)      -- one entry per player per day
 *        );
 *      Turn on Row Level Security and add an INSERT policy.
 *   4. Replace the body below with:
 *
 *        import { createClient } from '@supabase/supabase-js';
 *        const supabase = createClient(
 *          import.meta.env.VITE_SUPABASE_URL,
 *          import.meta.env.VITE_SUPABASE_ANON_KEY,
 *        );
 *        const { error } = await supabase.from('daily_scores').insert({
 *          player_id: getOrCreatePlayerId(),   // e.g. crypto.randomUUID() saved in localStorage
 *          date_key: meta.dateKey,
 *          puzzle_id: meta.puzzleId,
 *          score, streak,
 *          won: meta.won,
 *          elapsed_ms: Math.round(meta.elapsedMs),
 *          energy_left: meta.energyLeft,
 *        });
 *        return error ? { ok: false, error: error.message } : { ok: true };
 *
 *  Heads up: scores sent from the browser can be faked. For a serious
 *  leaderboard, insert through a Supabase Edge Function that re-checks
 *  the result against the puzzle answers.
 */
export async function saveScoreToSupabase(
  score: number,
  streak: number,
  meta?: ScoreMeta,
): Promise<IntegrationResult> {
  // TODO(supabase): replace this stub with the insert above.
  if (import.meta.env.DEV) {
    console.info('[Synonymy] saveScoreToSupabase (stub)', { score, streak, ...meta });
  }
  return { ok: true };
}

/**
 * RESEND — subscribe someone to the "Daily Reminder" email.
 *
 * NEVER call Resend straight from the browser: your API key would be
 * public. Make a tiny serverless route instead (Vercel / Netlify / Supabase
 * Edge Function), e.g. api/subscribe.ts:
 *
 *        import { Resend } from 'resend';
 *        const resend = new Resend(process.env.RESEND_API_KEY);
 *        export default async function handler(req, res) {
 *          const { email } = req.body;
 *          await resend.contacts.create({ email, audienceId: process.env.RESEND_AUDIENCE_ID });
 *          res.status(200).json({ ok: true });
 *        }
 *
 * Then replace the body below with:
 *
 *        const res = await fetch('/api/subscribe', {
 *          method: 'POST',
 *          headers: { 'Content-Type': 'application/json' },
 *          body: JSON.stringify({ email }),
 *        });
 *        return res.ok ? { ok: true } : { ok: false, error: 'Subscription failed. Try again.' };
 */
export async function triggerResendNewsletter(email: string): Promise<IntegrationResult> {
  // TODO(resend): replace this stub with the fetch above.
  if (import.meta.env.DEV) {
    console.info('[Synonymy] triggerResendNewsletter (stub)', { email });
  }
  await new Promise((r) => setTimeout(r, 700)); // fake network delay so the loading state is visible
  return { ok: true };
}
