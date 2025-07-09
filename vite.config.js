import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react()],
  preview: {
    allowedHosts: ['no-place-left-illinois-dashboard.onrender.com']
  }
})
