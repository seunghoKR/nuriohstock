import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    watch: {
      // Synology 네트워크 드라이브 호환: polling 방식으로 변경
      usePolling: true,
      interval: 1000,
    },
    proxy: {
      '/api': {
        target: 'http://localhost:4001',
        changeOrigin: true,
        secure: false,
      },
      '/local-ai': {
        target: 'http://49.170.204.109:1234/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/local-ai/, ''),
        secure: false,
      }
    }
  }
})
