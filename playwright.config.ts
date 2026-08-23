import { defineConfig } from "@playwright/test";
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const project = (
  name: string,
  browserName: "chromium" | "firefox" | "webkit",
  width: number,
  height: number,
) => ({ name, use: { browserName, viewport: { width, height } } });
export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  use: { baseURL, trace: "on-first-retry" },
  webServer: {
    command: "npm run dev",
    url: baseURL,
    reuseExistingServer: true,
  },
  projects: [
    project("chromium-375", "chromium", 375, 812),
    project("chromium-390", "chromium", 390, 844),
    project("chromium-430", "chromium", 430, 932),
    project("chromium-desktop", "chromium", 1440, 900),
    project("firefox-390", "firefox", 390, 844),
    project("firefox-desktop", "firefox", 1440, 900),
    project("webkit-390", "webkit", 390, 844),
    project("webkit-desktop", "webkit", 1440, 900),
  ],
});
