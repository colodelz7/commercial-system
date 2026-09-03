import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // 127.0.0.1 explícito (e não "localhost"): o backend escuta só em IPv4, e
    // "localhost" pode resolver para ::1 primeiro e derrubar o proxy.
    proxy: {
      '/api': 'http://127.0.0.1:3000',
      '/autentique': 'http://127.0.0.1:3000',
    },
  },
})
