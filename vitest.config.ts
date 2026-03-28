import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/main/__tests__/**/*.test.ts'],
    globals: false,
  },
  resolve: {
    alias: {
      // Stub out electron so Node can run main-process code in tests
      electron: new URL('./src/main/__tests__/__mocks__/electron.ts', import.meta.url).pathname,
    },
  },
})
