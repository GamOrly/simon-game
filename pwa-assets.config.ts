import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// Generates the PWA icons from the single SVG source (ADR-7).
// Run manually with `npm run generate-pwa-assets`; output is committed to public/.
export default defineConfig({
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, padding: 0, resizeOptions: { background: '#0A1628' } },
    apple: { ...minimal2023Preset.apple, padding: 0, resizeOptions: { background: '#0A1628' } },
  },
  images: ['public/icon.svg'],
});
