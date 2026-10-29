/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Public address of the game, with trailing slash. Set in .env. */
  readonly VITE_SITE_URL: string;
  /** Google Analytics measurement ID (G-XXXXXXX). Leave empty to turn analytics off. */
  readonly VITE_GA_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
