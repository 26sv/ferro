import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icona.svg'],
      manifest: {
        name: 'Gestionale formazione',
        short_name: 'Formazione',
        description: 'Programmi, corsi, lezioni e materiali della formazione.',
        lang: 'it',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#F2F3EF',
        theme_color: '#1B2A41',
        icons: [
          { src: 'icona.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icona.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg}'],
        runtimeCaching: [
          {
            // I font restano disponibili anche in aula senza rete.
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'font',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Anteprime e file dei materiali dell'ultimo corso aperto: si
            // consultano in aula anche quando la rete non c'è.
            urlPattern: /^https:\/\/(drive|lh3)\.google(usercontent)?\.com\//,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'materiali-drive',
              expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
})
