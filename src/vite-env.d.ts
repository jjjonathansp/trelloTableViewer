/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TRELLO_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface TrelloPowerUpIframe {
  card: (...fields: string[]) => Promise<{ id: string; idBoard: string }>;
  get: (scope: "card", visibility: "shared", key: string, defaultValue?: unknown) => Promise<unknown>;
  set: (scope: "card", visibility: "shared", key: string, value: unknown) => Promise<void>;
}

interface TrelloPowerUpGlobal {
  iframe: () => TrelloPowerUpIframe;
}

interface Window {
  TrelloPowerUp?: TrelloPowerUpGlobal;
}
