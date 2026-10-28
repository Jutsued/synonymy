import { loadHighestDateKey, saveHighestDateKey } from './storage';

export const DAY_MS = 86_400_000;

export interface ClockSync {
  /** serverTime - localTime, in ms. Add this to Date.now() to get "real" time. */
  offsetMs: number;
  /** True if we actually got a time from the server, false if we fell back to the device clock. */
  trusted: boolean;
}

/** "2026-10-28" — always in UTC, so everyone in the world shares the same puzzle day. */
export function toUtcDateKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** "2026-10-28" -> ms timestamp of that day's 00:00 UTC. */
export function parseDateKey(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

export function shiftDateKey(key: string, days: number): string {
  return toUtcDateKey(parseDateKey(key) + days * DAY_MS);
}

export function msUntilNextUtcMidnight(nowMs: number): number {
  return DAY_MS - (nowMs % DAY_MS);
}

const pad = (n: number) => String(n).padStart(2, '0');

/** 3_723_000 -> "01:02:03" */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

/** 84_000 -> "1:24" (adds hours only if needed) */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** "2026-10-28" -> "Oct 28, 2026" */
export function formatDateKey(key: string): string {
  return new Date(parseDateKey(key)).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * Anti-cheat, step 1: ask our OWN static host what time it is.
 *
 * Every HTTP response carries a `Date` header set by the server. A HEAD
 * request to our own origin costs nothing (no API, no database) and gives
 * us a clock the player can't change from their system settings.
 *
 * If it fails (offline, header stripped, timeout) we fall back to the
 * device clock and lean on the "never go backwards" clamp below.
 */
export async function syncServerClock(timeoutMs = 2000): Promise<ClockSync> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const sentAt = Date.now();
    // Cache-busting query so a CDN doesn't hand back a stale cached Date header.
    const res = await fetch(`${window.location.origin}${import.meta.env.BASE_URL}?clock=${sentAt}`, {
      method: 'HEAD',
      cache: 'no-store',
      signal: controller.signal,
    });
    const receivedAt = Date.now();
    const header = res.headers.get('date');
    const serverMs = header ? Date.parse(header) : Number.NaN;
    if (!Number.isFinite(serverMs)) return { offsetMs: 0, trusted: false };

    // Assume the server stamped the response halfway through the round trip.
    const offsetMs = serverMs + (receivedAt - sentAt) / 2 - receivedAt;

    // The Date header only has 1-second precision, so ignore tiny differences.
    return { offsetMs: Math.abs(offsetMs) < 2000 ? 0 : offsetMs, trusted: true };
  } catch {
    return { offsetMs: 0, trusted: false };
  } finally {
    window.clearTimeout(timer);
  }
}

/**
 * Anti-cheat, step 2: decide which day we're on.
 *
 * - Trusted server time: just use it.
 * - Device clock only: never allow a date EARLIER than the latest one this
 *   device has seen. Rolling the clock back to replay yesterday won't work,
 *   and rolling it forward to peek at tomorrow locks you into tomorrow
 *   until it actually arrives.
 *
 * Note: a fully client-side game can't be 100% cheat-proof (someone can
 * always clear localStorage). This just makes it annoying enough that
 * nobody bothers. Real enforcement = server-side validation via Supabase.
 */
export function resolveDateKey(nowMs: number, trusted: boolean): string {
  const key = toUtcDateKey(nowMs);
  if (trusted) {
    saveHighestDateKey(key);
    return key;
  }
  const highest = loadHighestDateKey();
  // "YYYY-MM-DD" strings sort correctly as plain strings.
  if (highest && highest > key) return highest;
  saveHighestDateKey(key);
  return key;
}
