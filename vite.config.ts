import type { Plugin } from 'vite'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/** Emit stylesheet before the entry module so the browser can fetch CSS as early as <head> allows. */
function cssBeforeEntryScript(): Plugin {
  return {
    name: 'css-before-entry-script',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        let preload = ''
        if (ctx?.bundle) {
          for (const asset of Object.values(ctx.bundle)) {
            if (asset.type !== 'asset') continue
            const fn = asset.fileName
            if (!fn.endsWith('.woff2')) continue
            if (!fn.includes('inter-latin-wght-normal') || fn.includes('latin-ext')) continue
            preload = `<link rel="preload" href="/${fn.replace(/^\//, '')}" as="font" type="font/woff2" crossorigin>\n    `
            break
          }
        }
        const m = html.match(/\s*(<link rel="stylesheet"[^>]*>)\s*/)
        if (!m) return html
        const tag = m[1]
        const stripped = html.replace(m[0], '')
        return stripped.replace(/<\/title>/i, `</title>\n    ${preload}${tag}`)
      },
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), cssBeforeEntryScript()],
  esbuild: {
    legalComments: 'none',
  },
  build: {
    // three.js minified is ~700kB+; split so landing can cache R3F / core separately
    chunkSizeWarningLimit: 800,
    target: 'es2022',
    minify: 'esbuild',
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
          if (id.includes('react-dom')) return 'react-dom'
          if (/[/\\]node_modules[/\\]react[/\\]/.test(id)) return 'react'
        },
      },
    },
  },
})
