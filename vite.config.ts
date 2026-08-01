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
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react/') || id.includes('react-dom/')) return 'vendor';
            if (id.includes('react-router')) return 'router';
            if (id.includes('@tanstack/react-query')) return 'query';
            if (id.includes('@supabase/supabase-js')) return 'supabase';
            if (id.includes('@dnd-kit')) return 'dnd';
          }
        },
      },
    },
  },
})
