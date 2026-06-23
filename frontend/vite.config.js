import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  build: {
    sourcemap: false,
    minify: true,
  },
  // Drop console.* and debugger in production builds
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
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            proxyReq.setHeader('Origin', 'http://localhost:5175');
          });
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  }
}))
