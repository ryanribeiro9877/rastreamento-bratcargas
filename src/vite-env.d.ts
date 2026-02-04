/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_RASTREAMENTO_API_URL?: string;
  readonly VITE_RASTREAMENTO_API_KEY?: string;
  readonly VITE_MAPBOX_ACCESS_TOKEN?: string;
  readonly VITE_PUBLIC_APP_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
