import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:5174',
      // Proxy Socket.IO WebSocket to backend during dev
      '/socket.io': {
        target: 'http://localhost:5174',
        ws: true,
      },
    },
  }
})
