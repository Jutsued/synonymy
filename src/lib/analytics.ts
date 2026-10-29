/**
 * Google Analytics (GA4), loaded only when VITE_GA_ID is set in .env
 * and only on the live site, so local testing never pollutes the numbers.
 *
 * GA measurement IDs (G-XXXXXXX) are public by design: they're visible in
 * every site's page source, so it's fine for this to live in .env.
 */
const GA_ID = import.meta.env.VITE_GA_ID;
const enabled = Boolean(GA_ID) && import.meta.env.PROD;

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function initAnalytics(): void {
  if (!enabled || window.gtag) return;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  // gtag expects the raw `arguments` object, not an array, so this has to be a classic function.
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer.push(arguments);
  };
  window.gtag('js', new Date());
  window.gtag('config', GA_ID);
}

type EventParams = Record<string, string | number | boolean>;

/**
 * Custom game events. In Google Analytics they show up under
 * Reports → Engagement → Events.
 */
export function track(event: string, params?: EventParams): void {
  if (!enabled) return;
  try {
    window.gtag?.('event', event, params);
  } catch {
    // Analytics must never break the game (ad blockers, privacy extensions...).
  }
}
