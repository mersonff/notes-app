import { defineConfig, devices } from '@playwright/test'

const APP_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173'
const API_URL = process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:3000'

export default defineConfig({
  testDir: './e2e',
  // Each spec is independent; the suite is intentionally small (smoke-only)
  // so the time/value tradeoff favours a tight timeout.
  timeout: 30_000,
  expect: { timeout: 5_000 },
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Run serially locally so flakiness in one spec doesn't poison the others.
  workers: process.env.CI ? 1 : 1,
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],
  use: {
    baseURL: APP_URL,
    // Force pt-BR so the i18n resolver picks our primary locale and the
    // assertions can rely on Portuguese copy. Without this Playwright runs
    // chromium with the default en-US locale.
    locale: 'pt-BR',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      // Rails dev server. The /up endpoint is the readiness probe Playwright
      // polls before starting the suite. We let the local DATABASE_URL drive
      // the connection (so the e2e suite reuses the developer's DB by default).
      // Use bash -lc so rvm activates the api/.ruby-version (3.4.9) — without
      // a login shell rvm doesn't pick the version up from the .ruby-version
      // file when launching from a sibling directory.
      command:
        "bash -lc 'cd ../api && rvm use $(cat .ruby-version | sed s/ruby-//) > /dev/null && bundle exec rails server -p 3000'",
      url: `${API_URL}/up`,
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
      stdout: 'pipe',
      stderr: 'pipe'
    },
    {
      command: 'pnpm dev',
      url: APP_URL,
      timeout: 60_000,
      reuseExistingServer: !process.env.CI,
      stdout: 'pipe',
      stderr: 'pipe'
    }
  ]
})
