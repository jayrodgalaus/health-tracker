import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'Health Tracker',
        short_name: 'Health Tracker',
        description: 'Personal, offline-first food and activity tracking.',
        theme_color: '#0f766e',
        background_color: '#f8fafc',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webp,wasm,gz}'],
        maximumFileSizeToCacheInBytes: 16 * 1024 * 1024,
        navigateFallback: '/index.html'
      },
      devOptions: { enabled: false }
    })
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    clearMocks: true
  }
})
