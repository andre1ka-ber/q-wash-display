import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Installable PWA only — no runtimeCaching entries, so Workbox's
    // generated service worker precaches nothing but this build's own
    // static output (JS/CSS/fonts/icons) and never touches /api/* or the
    // SSE stream. This screen runs unattended for potentially days
    // (see PLAN.md's "Resilience" section) — it must never show stale
    // cached queue data, and registerType 'autoUpdate' means a new
    // deploy takes over in the background on this kiosk's own next
    // reload cycle, with nobody there to click an "update available"
    // prompt.
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        lang: 'ru',
        name: 'Q Wash — Экран очереди',
        short_name: 'Q Wash Экран',
        description: 'Табло очереди Q Wash для зала ожидания.',
        theme_color: '#0A0A09',
        background_color: '#0A0A09',
        display: 'standalone',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  resolve: {
    // q-wash-shared has its own react/react-dom install (peer dep,
    // auto-installed by npm); without dedupe, the build ships two React
    // copies and hooks break (useSyncExternalStore on a null dispatcher).
    dedupe: ['react', 'react-dom'],
  },
  server: {
    // q-wash-shared is a sibling dir consumed via a `file:` dependency
    // (symlinked into node_modules) — Vite otherwise refuses to serve
    // files outside this project's own root.
    fs: {
      allow: ['..'],
    },
  },
});
