import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/e2e/**/*', 'node_modules/**/*'],
  },
  resolve: {
    alias: {
      '@': './src',
      '@main': './src/main',
      '@renderer': './src/renderer',
      '@shared': './src/shared'
    }
  }
})