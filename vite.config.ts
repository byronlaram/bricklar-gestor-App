import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
// Tailwind CSS v4 se integra via PostCSS (@tailwindcss/postcss en postcss.config.js)
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: [
        'favicon.svg',
        'branding/bricklar-icon.svg',
        'branding/bricklar-logo.svg',
        'branding/bricklar-logo.png',
        'branding/bricklar-app-icon.png',
        'branding/apple-touch-icon.png',
        'branding/favicon-32x32.png',
        'branding/favicon-16x16.png',
        'branding/pwa-192x192.png',
        'branding/pwa-512x512.png',
        'branding/pwa-maskable-192x192.png',
        'branding/pwa-maskable-512x512.png'
      ],
      manifest: {
        id: '/?source=pwa',
        name: 'Bricklar Gestor App',
        short_name: 'Bricklar Gestor App',
        description: 'Bricklar Gestor App - Plataforma interna de gestión de entregas, rutas y operaciones para motorizados.',
        lang: 'es',
        theme_color: '#1c2d5e',
        background_color: '#0f172a',
        display: 'standalone',
        display_override: ['standalone', 'window-controls-overlay'],
        orientation: 'portrait',
        start_url: '/?source=pwa',
        scope: '/',
        categories: ['business', 'productivity'],
        prefer_related_applications: false,
        icons: [
          {
            src: '/branding/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/branding/pwa-maskable-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: '/branding/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/branding/pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: '/branding/apple-touch-icon.png',
            sizes: '180x180',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/branding/bricklar-icon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}']
      }
    })
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

