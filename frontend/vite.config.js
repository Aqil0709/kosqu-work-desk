import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.png', 'icon-*.png', 'favicon.ico'],
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Don't cache face model files — too large, load on demand
        globIgnores: ['**/models/**'],
        runtimeCaching: [
          {
            // API calls — network first, fallback to cache
            urlPattern: /^https?:\/\/.*\/api\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 10,
              expiration: { maxEntries: 50, maxAgeSeconds: 300 },
            },
          },
          {
            // Images & static assets — cache first
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 7 * 24 * 60 * 60 },
            },
          },
        ],
      },
      manifest: {
        name: 'Kosqu HRMS',
        short_name: 'HRMS',
        description: 'Kosqu Technolab HR Management System',
        theme_color: '#0B1120',
        background_color: '#0B1120',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          { src: '/icon-72.png',  sizes: '72x72',   type: 'image/png' },
          { src: '/icon-96.png',  sizes: '96x96',   type: 'image/png' },
          { src: '/icon-128.png', sizes: '128x128', type: 'image/png' },
          { src: '/icon-144.png', sizes: '144x144', type: 'image/png' },
          { src: '/icon-152.png', sizes: '152x152', type: 'image/png' },
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/icon-384.png', sizes: '384x384', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
        shortcuts: [
          {
            name: 'Mark Attendance',
            short_name: 'Attendance',
            url: '/employee/attendance',
            icons: [{ src: '/icon-96.png', sizes: '96x96' }],
          },
          {
            name: 'Apply WFH',
            short_name: 'WFH',
            url: '/employee/wfh',
            icons: [{ src: '/icon-96.png', sizes: '96x96' }],
          },
        ],
        categories: ['business', 'productivity'],
      },
    }),
  ],
  build: {
    sourcemap: false,
    minify: true,
  },
  esbuild: mode === 'production' ? {
    drop: ['console', 'debugger'],
    pure: ['console.log', 'console.table', 'console.debug', 'console.info', 'console.warn'],
  } : {},
  server: {
    host: '0.0.0.0',
    port: 5175,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('Origin', 'http://localhost:5175');
          });
        },
      },
    },
  },
  resolve: {
    alias: { '@': '/src' },
  },
}))
