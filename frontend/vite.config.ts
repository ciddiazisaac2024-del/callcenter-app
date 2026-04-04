import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Proxy en desarrollo → backend local
    proxy: {
      '/api': {
        target:       'http://localhost:3001',
        changeOrigin: true
      }
    }
  },
  build: {
    // Dividir vendor bundle para mejor caché en producción
    rollupOptions: {
      output: {
        manualChunks: {
          vendor:  ['react', 'react-dom', 'react-router-dom'],
          ui:      ['lucide-react'],
          network: ['axios'],
        }
      }
    },
    // Generar sourcemaps solo en desarrollo
    sourcemap: false,
  }
})
