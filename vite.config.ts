import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

/**
 * CSP 只在构建产物里注入：dev 模式需要 Vite 的 HMR WebSocket，
 * 写死 connect-src 'self' 会让热更新直接断掉。
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  "connect-src 'self'",
].join('; ')

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'unote:inject-csp',
      apply: 'build',
      transformIndexHtml(html) {
        return html.replace(
          '</head>',
          `  <meta http-equiv="Content-Security-Policy" content="${CSP}" />\n  </head>`,
        )
      },
    },
  ],
  build: {
    target: 'es2020',
    assetsInlineLimit: 4096,
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
  },
})
