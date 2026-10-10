import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({ plugins: [react(), VitePWA({
  registerType: 'prompt',
  injectRegister: false,
  // Development has no service worker; offline tests use the production build.
  devOptions: { enabled: false },
  includeAssets: ['fonts/*.woff2', 'images/kairos-day12.jpg'],
  manifest: {
    id: '/', name: 'Kairos Monitor', short_name: 'Kairos Monitor',
    description: 'Synthetic research prototype with local browser checks.',
    start_url: '/', scope: '/', display: 'standalone',
    theme_color: '#171D1C', background_color: '#171D1C',
    icons: [192, 512].map(size => ({
      src: `/icons/kairos-${size}.png`, sizes: `${size}x${size}`, type: 'image/png', purpose: 'any',
    })),
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html}'],
    navigateFallback: '/index.html',
    navigateFallbackAllowlist: [/^\/$/, /^\/(today|mission|trends|check)\/?$/],
    navigateFallbackDenylist: [/^\/api(?:\/|$)/],
    runtimeCaching: [],
    cleanupOutdatedCaches: true,
    // A waiting update activates only after every old client closes. Never
    // skip waiting or reload a tab: it may contain unsaved cognitive results.
    skipWaiting: false,
    clientsClaim: true,
  },
})] });
