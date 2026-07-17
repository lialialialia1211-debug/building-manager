import { defineConfig } from '@playwright/test'

const serverUrl = 'http://127.0.0.1:4174'

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: serverUrl,
  },
  webServer: {
    command: [
      'npm run dev --',
      '--host 127.0.0.1',
      '--port 4174',
      '--strictPort',
    ].join(' '),
    url: serverUrl,
    reuseExistingServer: false,
  },
  projects: [
    {
      name: 'desktop-1080',
      use: { viewport: { width: 1920, height: 1080 } },
    },
    {
      name: 'desktop-720',
      use: { viewport: { width: 1280, height: 720 } },
    },
    {
      name: 'steam-deck-ratio',
      use: { viewport: { width: 1280, height: 800 } },
    },
  ],
})
