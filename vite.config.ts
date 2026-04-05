import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  esbuild: {
    legalComments: 'none',
  },
  build: {
    // three.js minified is ~700kB+; split so landing can cache R3F / core separately
    chunkSizeWarningLimit: 800,
    target: 'es2022',
    cssMinify: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('@react-three') || id.includes('three-stdlib')) {
            return 'react-three'
          }
          if (/[/\\]three[/\\]/.test(id)) {
            return 'three'
          }
          if (id.includes('@vercel/analytics')) return 'vercel-analytics'
          if (id.includes('react-dom')) return 'react-dom'
          if (/[/\\]node_modules[/\\]react[/\\]/.test(id)) return 'react'
        },
      },
    },
  },
})
