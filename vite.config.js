import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => ({
  plugins: [react()],
  server: { port: Number(process.env.PORT) || 5210 },
  // Deployed under https://<user>.github.io/yeonjae/
  base: command === 'build' ? '/yeonjae/' : '/',
}))
