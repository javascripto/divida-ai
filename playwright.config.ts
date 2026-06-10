import { defineConfig } from "@playwright/test"

const slowMo = Number(process.env.PLAYWRIGHT_SLOW_MO ?? 0)

export default defineConfig({
  testDir: "./e2e",
  timeout: slowMo > 0 ? 120_000 : 30_000,
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [
    ["list"],
    // Gera relatório HTML em playwright-report/ com todas as screenshots
    ["html", { open: "never", outputFolder: "playwright-report" }],
  ],
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: "http://localhost:5173",
    launchOptions: {
      slowMo,
    },
    trace: "retain-on-failure",
    video: "retain-on-failure",
    // Captura screenshot ao final de cada step (visível no HTML report)
    screenshot: "on",
  },
  webServer: {
    command: "npm run dev -- --port 5173",
    port: 5173,
    reuseExistingServer: true,
  },
})
