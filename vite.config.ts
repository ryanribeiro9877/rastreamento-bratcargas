import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// import { sentryVitePlugin } from '@sentry/vite-plugin'

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    sourcemap: 'hidden', // Gera sourcemaps para Sentry mas não expõe publicamente
  },
  plugins: [
    react(),
    // Descomentar quando tiver auth token do Sentry:
    // sentryVitePlugin({
    //   org: "bratcargas",
    //   project: "bratcargas-frontend",
    //   authToken: process.env.SENTRY_AUTH_TOKEN,
    // }),
  ],
  server: {
    port: 5173,
    host: true
  }
})
