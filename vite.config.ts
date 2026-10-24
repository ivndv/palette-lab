import { fileURLToPath, URL } from 'node:url'

import vue from '@vitejs/plugin-vue'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiUrl = env.PALETTE_LAB_API_URL || 'http://localhost:8000'
  const apiKey = env.PALETTE_LAB_API_KEY || ''

  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      proxy: {
        // BFF de desarrollo: el navegador nunca ve la API key.
        '/api/interpret': {
          target: apiUrl,
          changeOrigin: true,
          rewrite: () => '/interpret',
          headers: apiKey ? { 'X-API-Key': apiKey } : undefined,
        },
      },
    },
  }
})
