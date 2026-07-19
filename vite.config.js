import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    allowedHosts: ['sb-63bg52srxeg6.vercel.run', 'sb-49c0f4fq6k1d.vercel.run'],
  },
})
