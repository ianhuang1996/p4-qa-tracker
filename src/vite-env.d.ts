/// <reference types="vite/client" />

interface ImportMetaEnv {
  // VITE_* keys removed: AI + ImgBB are now server-proxied to keep secrets off-bundle.
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
