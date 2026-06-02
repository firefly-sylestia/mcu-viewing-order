import { defineConfig, splitVendorChunkPlugin } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), splitVendorChunkPlugin()],
  base: '/',
  build: {
    cssCodeSplit: true,
    modulePreload: { polyfill: false },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('@capacitor')) return 'capacitor'
          if (id.includes('@vercel')) return 'vercel'
          if (id.includes('lucide-react')) return 'icons'
          if (id.includes('react') || id.includes('react-dom')) return 'react-vendor'
          return 'vendor'
        },
      },
    },
  },
})
