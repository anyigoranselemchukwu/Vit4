import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendUrl = env.VITE_BACKEND_URL || 'http://localhost:8000'
  const port = parseInt(process.env.PORT || env.PORT || '5000', 10)

  return {
    plugins: [react()],
    build: {
      cssMinify: false,
    },
    server: {
      port,
      host: '0.0.0.0',
      allowedHosts: true,
      proxy: {
        '/predict': {
          target: backendUrl,
          changeOrigin: true,
        },
        '/history': {
          target: backendUrl,
          changeOrigin: true,
        },
        '/health': {
          target: backendUrl,
          changeOrigin: true,
        },
        '/fetch': {
          target: backendUrl,
          changeOrigin: true,
        },
        '/odds': {
          target: backendUrl,
          changeOrigin: true,
        },
        '/analytics': {
          target: backendUrl,
          changeOrigin: true,
        },
        '/training': {
          target: backendUrl,
          changeOrigin: true,
        },
        '/admin': {
          target: backendUrl,
          changeOrigin: true,
        },
        '/results': {
          target: backendUrl,
          changeOrigin: true,
        },
        '/system': {
          target: backendUrl,
          changeOrigin: true,
        },
        '/ai': {
          target: backendUrl,
          changeOrigin: true,
        },
        '/test-predict': {
          target: backendUrl,
          changeOrigin: true,
        },
      },
    },
  }
})
