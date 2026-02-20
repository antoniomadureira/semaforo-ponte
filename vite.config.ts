import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // FUNDAMENTAL: O nome do repositório no GitHub para os caminhos não quebrarem
  base: '/semaforo-ponte/', 
  server: {
    proxy: {
      // Este proxy funciona APENAS em desenvolvimento (npm run dev)
      '/api-apdl': {
        target: 'https://siga.apdl.pt/AberturaPonteMovel/',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-apdl/, ''),
      },
    },
  },
})
