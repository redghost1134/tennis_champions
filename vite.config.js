import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // relative base: the build works at a domain root or in a sub-folder (e.g. GitHub Pages)
  base: './',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/favicon.ico', 'icons/apple-touch-icon-180x180.png', 'icons/icon.svg'],
      manifest: {
        name: 'Tennis Champions',
        short_name: 'Tennis',
        lang: 'fr',
        display: 'fullscreen',
        orientation: 'landscape',
        background_color: '#1f56c4',
        theme_color: '#1f56c4',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icons/pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'icons/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // cache every file of the build so the game starts offline after a first visit
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
    }),
  ],
  test: { globals: true, include: ['tests/**/*.test.js'] },
});
