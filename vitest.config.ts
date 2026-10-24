import { fileURLToPath, URL } from 'node:url'

import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'happy-dom',
    // Misma site key que en local: los tests de auth dependen del captcha activo
    env: {
      VITE_TURNSTILE_SITE_KEY: '1x00000000000000000000AA',
    },
    include: ['src/**/*.spec.ts', 'functions/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/lib/**/*.ts', 'src/composables/**/*.ts'],
      exclude: ['src/**/*.spec.ts'],
      thresholds: {
        statements: 95,
        branches: 90,
        functions: 95,
        lines: 95,
      },
    },
  },
})
