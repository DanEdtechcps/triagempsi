import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

const baseURL =
  process.env.E2E_BASE_URL ?? "https://triagempsi.pontocomumtus.workers.dev";

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
    trace: "off",
    launchOptions: {
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    },
  },
  projects: [
    {
      name: "Desktop (1280x900)",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 900 },
      },
    },
    {
      name: "Tablet Landscape (iPad Pro 11 - 1024x768)",
      use: {
        browserName: "chromium",
        viewport: { width: 1024, height: 768 },
        hasTouch: true,
        isMobile: true,
      },
    },
    {
      name: "Tablet Portrait (iPad Mini - 768x1024)",
      use: {
        browserName: "chromium",
        viewport: { width: 768, height: 1024 },
        hasTouch: true,
        isMobile: true,
      },
    },
    {
      name: "Mobile Standard (Pixel 7 - 412x915)",
      use: {
        ...devices["Pixel 7"],
      },
    },
    {
      name: "Mobile Compact (iPhone SE - 375x667)",
      use: {
        browserName: "chromium",
        viewport: { width: 375, height: 667 },
        hasTouch: true,
        isMobile: true,
      },
    },
  ],
});
