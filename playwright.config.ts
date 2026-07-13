import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir:'./e2e',
  fullyParallel:false,
  workers:2,
  webServer:{ command:'npm run dev -- --host 127.0.0.1', url:'http://127.0.0.1:5173', reuseExistingServer:true },
  use:{ baseURL:'http://127.0.0.1:5173', trace:'on-first-retry' },
  projects:[
    { name:'mobile-safari', use:{ ...devices['iPhone 13'] } },
    { name:'desktop-chromium', use:{ ...devices['Desktop Chrome'] } },
  ],
})
