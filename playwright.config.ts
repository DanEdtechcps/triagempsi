import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:8080";

// Em ambientes que já trazem um Chromium pré-instalado, reaproveitamos o binário.
const preinstalledChromium = "/chromium-1194/chrome-linux/chrome";
const executablePath =
  process.env.PLAYWRIGHT_CHROMIUM_PATH ??
  (existsSync(preinstalledChromium) ? preinstalledChromium : undefined);


export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL,
    viewport: { width: 1280, height: 900 },
    trace: "off",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: executablePath ? { executablePath } : {},
      },
    },
  ],
});
