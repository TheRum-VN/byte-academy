import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:3101',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'node scripts/e2e-server.mjs',
    url: 'http://127.0.0.1:3101/api/health',
    reuseExistingServer: false,
    timeout: 120000,
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    ...(existsSync(
      'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    )
      ? [
          {
            name: 'edge',
            testMatch: /(typing|simulation|mouse|mouse-visual|practice-fit)\.spec\.ts/,
            use: { browserName: 'chromium' as const, channel: 'msedge' },
          },
        ]
      : []),
    ...(existsSync('C:/Program Files/Google/Chrome/Application/chrome.exe')
      ? [
          {
            name: 'chrome',
            testMatch: /(typing|simulation|mouse|mouse-visual|practice-fit)\.spec\.ts/,
            use: { browserName: 'chromium' as const, channel: 'chrome' },
          },
        ]
      : []),
  ],
});
