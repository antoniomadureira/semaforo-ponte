import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/semaforo-ponte/', // Adicionado para que os caminhos funcionem no GitHub Pages
  server: {
    proxy: {
      // Quando o código pedir '/api-apdl', o Vite redireciona para o site real
      '/api-apdl': {
        target: 'https://siga.apdl.pt/AberturaPonteMovel/',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-apdl/, ''),
      },
    },
  },
})
