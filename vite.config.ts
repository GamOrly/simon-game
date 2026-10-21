/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Deployed under https://gamorly.github.io/simon-game/ (ADR-8)
export default defineConfig({
  base: '/simon-game/',
  plugins: [react()],
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
