/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Deployed under https://gamorly.github.io/simon-game/ (ADR-8)
const BASE = '/simon-game/';

export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    VitePWA({
      strategies: 'generateSW',
      // No automatic reload on update; registration is done in main.tsx (ADR-6)
      registerType: 'prompt',
      injectRegister: false,
      // Icons are already precached by globPatterns below
      includeManifestIcons: false,
      manifest: {
        // Stable app identity; must never change (ADR-9)
        id: `${BASE}app`,
        name: 'Simon',
        short_name: 'Simon',
        description: 'משחק זיכרון: חזרו על רצף הצבעים והצלילים עד שלב 10',
        lang: 'he',
        dir: 'rtl',
        display: 'standalone',
        orientation: 'portrait',
        start_url: BASE,
        scope: BASE,
        theme_color: '#0A1628',
        background_color: '#0A1628',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Everything the app needs offline, including the bundled Heebo fonts (ARCHITECTURE §2.7)
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        // No skipWaiting/clientsClaim: an update never interrupts an active game (ADR-6)
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  server: {
    // Expose on the local network so the app can be tested from a phone
    host: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    css: false,
  },
});
