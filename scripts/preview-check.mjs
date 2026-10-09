import { chromium } from "playwright";
import fs from "node:fs/promises";
await fs.mkdir("artifacts", { recursive: true });
const browser = await chromium.launch({
  channel: "msedge",
  headless: true,
  args: ["--enable-webgl", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 1,
});
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
await page.goto("http://localhost:5178/");
await page.locator(".hero h1").waitFor({ timeout: 60000 });
await page.waitForFunction(() => window.__engineDebug?.parts === 1266, {
  timeout: 30000,
});
await page.waitForTimeout(2200);
await page.screenshot({ path: "artifacts/hero-desktop.png" });
console.log(
  JSON.stringify(
    {
      errors,
      debug: await page.evaluate(() => window.__engineDebug),
      stats: await page.evaluate(() => window.__engineStats),
      overflow: await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    },
    null,
    2,
  ),
);
await page.getByRole("button", { name: "3D-лаборатория", exact: true }).click();
await page.waitForTimeout(1800);
await page.screenshot({ path: "artifacts/lab-desktop.png" });
await browser.close();
