/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.VITE_API_URL ?? 'http://localhost:3000'

  return {
    plugins: [vue()],

    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },

    server: {
      port: 5173,
      // Proxy /api to the Rails backend during development so the SPA can
      // call relative URLs (avoids CORS in dev and matches how a reverse
      // proxy will sit in front of both apps in production).
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true
        },
        '/up': {
          target: apiTarget,
          changeOrigin: true
        }
      }
    },

    test: {
      globals: true,
      environment: 'happy-dom',
      setupFiles: ['./src/test/setup.ts'],
      // Playwright owns the e2e/ folder — keep it out of Vitest's glob.
      include: ['src/**/*.{spec,test}.{ts,tsx}'],
      exclude: ['node_modules', 'dist', 'e2e/**'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html', 'lcov'],
        include: ['src/**/*.{ts,vue}'],
        exclude: ['src/main.ts', 'src/**/*.d.ts', 'src/test/**']
      }
    }
  }
})
