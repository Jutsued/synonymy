import { useEffect, useState } from 'react';

/** "Now" according to the synced clock, ticking once per second. */
export function useServerNow(offsetMs: number): number {
  const [now, setNow] = useState(() => Date.now() + offsetMs);

  useEffect(() => {
    const tick = () => setNow(Date.now() + offsetMs);
    tick();
    const id = window.setInterval(tick, 1000);
    // Background tabs get throttled — resync instantly when the user comes back.
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [offsetMs]);

  return now;
}
