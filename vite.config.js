import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => ({
  plugins: [react()],
  server: {
    port: Number(process.env.PORT) || 5210,
    host: true, // reachable from phones on the same network
    proxy: {
      '/md-api': {
        target: 'https://api.mangadex.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/md-api/, ''),
      },
    },
  },
  // Deployed under https://<user>.github.io/yeonjae/
  base: command === 'build' ? '/yeonjae/' : '/',
}))
