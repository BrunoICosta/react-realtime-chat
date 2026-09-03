/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Socket.io server URL. When empty the app runs in demo mode (BroadcastChannel). */
  readonly VITE_SERVER_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
