/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TRELLO_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface TrelloPowerUpIframe {
  card: (...fields: string[]) => Promise<{ id: string; idBoard: string }>;
}

interface TrelloPowerUpGlobal {
  iframe: () => TrelloPowerUpIframe;
}

interface Window {
  TrelloPowerUp?: TrelloPowerUpGlobal;
}
