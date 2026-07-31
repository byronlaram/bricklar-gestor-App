import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// Tailwind CSS v4 se integra via PostCSS (@tailwindcss/postcss en postcss.config.js)
export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      '@': `${import.meta.dirname}/src`,
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          query: ['@tanstack/react-query'],
          supabase: ['@supabase/supabase-js'],
          dnd: ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
        },
      },
    },
  },
})
