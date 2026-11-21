import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 3,
  reporter: [['list'], ['html', { open: 'never' }], ['junit', { outputFile: 'test-results/junit.xml' }]],
  use: {
    baseURL: 'http://127.0.0.1:4317',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    { name: 'api', testMatch: '**/api.spec.ts' },
    { name: 'chromium', testMatch: '**/ui.spec.ts', use: { ...devices['Desktop Chrome'] } }
  ],
  webServer: {
    command: 'node demo/server.mjs',
    url: 'http://127.0.0.1:4317/health',
    reuseExistingServer: false,
    timeout: 15000
  }
});
