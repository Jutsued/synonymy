/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Public address of the game, with trailing slash. Set in .env. */
  readonly VITE_SITE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
