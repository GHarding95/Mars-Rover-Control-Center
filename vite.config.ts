import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // three.js minified is ~700kB+; splitting @react-three/* keeps r3f/drei in a separate cached chunk
    chunkSizeWarningLimit: 800,
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
        },
      },
    },
  },
})
