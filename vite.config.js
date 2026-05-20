import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// El base './' garantiza que funciona en GitHub Pages sin importar el nombre del repo
export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: {
      '@': '/src',
    },
  },
})
