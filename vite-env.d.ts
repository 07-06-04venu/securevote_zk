/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ALLOW_INSECURE_DEMO_VERIFICATION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
