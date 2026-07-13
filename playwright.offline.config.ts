import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir:'./e2e-offline',
  webServer:{ command:'npm run preview -- --host 127.0.0.1', url:'http://127.0.0.1:4173', reuseExistingServer:false },
  use:{ ...devices['Desktop Chrome'], baseURL:'http://127.0.0.1:4173' },
})
