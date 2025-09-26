import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'tests',
  timeout: 30_000,
  retries: 0,
  reporter: 'list',
  use: {
    headless: true,
    screenshot: 'off',
    video: 'off',
  },
})

