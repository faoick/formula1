import { chromium } from "playwright";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
await fs.mkdir("artifacts", { recursive: true });
const browser = await chromium.launch({
  channel: "msedge",
  headless: true,
  args: ["--enable-webgl", "--ignore-gpu-blocklist"],
});
const checks = [],
  errors = [];
const check = (name, condition) => {
  assert.ok(condition, name);
  checks.push(name);
};
const page = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 1,
});
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
await page.goto("http://localhost:5178/");
await page.waitForFunction(() => window.__engineDebug?.parts === 1267, null, {
  timeout: 60000,
});
await page.waitForTimeout(1800);
check(
  "1267 real GLB parts loaded",
  await page.evaluate(() => window.__engineDebug.parts === 1267),
);
check(
  "Repeated components instanced",
  await page.evaluate(() => window.__engineDebug.instances > 300),
);
await page.screenshot({ path: "artifacts/hero-desktop.png" });
await page
  .getByRole("button", { name: "Исследовать двигатель", exact: true })
  .click();
await page.waitForTimeout(1300);
await page
  .getByRole("button", { name: "Глава 3: THE PISTONS", exact: true })
  .click();
await page.waitForTimeout(2200);
console.log(
  "Story state",
  await page.evaluate(() => ({
    y: scrollY,
    p: window.__engineDebug.progress,
    chapter: window.__engineDebug.chapter,
  })),
);
check(
  "Scroll selects piston chapter",
  await page.evaluate(() => window.__engineDebug.chapter === 2),
);
check(
  "Scroll moves original groups",
  await page.evaluate(() => window.__engineDebug.groups.covers_L[1] > 0.5),
);
await page.screenshot({ path: "artifacts/story-pistons.png" });
await page
  .getByRole("button", { name: "Глава 9: COMPLETE EXPLODED VIEW", exact: true })
  .click();
await page.waitForFunction(() => window.__engineDebug.chapter === 8);
await page.waitForTimeout(1700);
check(
  "Exploded chapter reached",
  await page.evaluate(() => window.__engineDebug.chapter === 8),
);
await page.screenshot({ path: "artifacts/story-exploded.png" });
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForFunction(() => window.__engineDebug.progress === 0);
await page.waitForTimeout(200);
check(
  "Reverse scroll restores group positions",
  await page.evaluate(() =>
    Object.values(window.__engineDebug.groups).every((p) =>
      p.every((v) => Math.abs(v) < 1e-6),
    ),
  ),
);
await page.getByRole("button", { name: "3D-лаборатория", exact: true }).click();
await page.waitForTimeout(1800);
await page.screenshot({ path: "artifacts/lab-desktop.png" });
const beforeCamera = await page.evaluate(() => window.__camera.position);
await page.mouse.move(850, 420);
await page.mouse.down();
await page.mouse.move(960, 465, { steps: 12 });
await page.mouse.up();
await page.waitForTimeout(400);
check(
  "Orbit drag changes camera",
  await page.evaluate(
    (before) =>
      window.__camera.position.some((v, i) => Math.abs(v - before[i]) > 0.01),
    beforeCamera,
  ),
);
await page.getByRole("button", { name: "Камера", exact: true }).click();
await page.waitForTimeout(1800);
await page.mouse.click(740, 470);
await page.waitForTimeout(400);
check(
  "Raycast click selects an actual model part",
  await page.locator(".inspector").isVisible(),
);
await page
  .getByRole("button", { name: "Восстановить исходный вид", exact: true })
  .click();
await page.waitForTimeout(1400);
const visibleBefore = await page.evaluate(() => window.__engineDebug.visible);
await page.getByRole("checkbox", { name: "04 Турбонаддув" }).uncheck();
await page.waitForTimeout(100);
check(
  "System filter hides real components",
  await page.evaluate(
    (before) => window.__engineDebug.visible < before,
    visibleBefore,
  ),
);
await page.getByRole("checkbox", { name: "04 Турбонаддув" }).check();
const slider = page.getByRole("slider", { name: "Степень разборки двигателя" });
await slider.focus();
await slider.press("End");
await page.waitForTimeout(2200);
check(
  "Manual slider explodes engine",
  await page.evaluate(() => window.__engineDebug.assembly > 0.999),
);
await page.screenshot({ path: "artifacts/lab-exploded.png" });
await slider.press("Home");
await page.waitForTimeout(2200);
check(
  "Manual slider reassembles engine",
  await page.evaluate(() => window.__engineDebug.assembly < 0.001),
);
await page.getByLabel("Найти деталь в лаборатории").fill("INT-0007");
await page.locator(".lab-search-results button").first().click();
await page.waitForTimeout(1800);
check(
  "Part ID inspector works",
  (await page.locator(".inspector .part-id").textContent()) === "INT-0007",
);
await page.getByRole("button", { name: "Изолировать", exact: true }).click();
await page.waitForTimeout(200);
await page.screenshot({ path: "artifacts/lab-piston-focus.png" });
await page.getByRole("button", { name: "Подписи", exact: true }).click();
check(
  "Labels toggle works",
  (await page.locator(".technical-label").count()) > 0,
);
await page
  .getByRole("button", { name: "Восстановить исходный вид", exact: true })
  .click();
await page.getByRole("button", { name: "Рабочий цикл", exact: true }).click();
await page.waitForTimeout(1000);
check("Working cycle enabled", await page.locator(".cycle-note").isVisible());
await page.screenshot({ path: "artifacts/working-cycle.png" });
await page.getByRole("button", { name: "Остановить", exact: true }).click();
await page.getByRole("button", { name: "Рентген", exact: true }).click();
check(
  "X-ray control changes state",
  (await page
    .getByRole("button", { name: "Рентген", exact: true })
    .getAttribute("aria-pressed")) === "true",
);
await page
  .getByRole("button", { name: "Закрыть лабораторию", exact: true })
  .click();
await page.getByRole("link", { name: "Компоненты", exact: true }).click();
await page.waitForTimeout(2200);
await page.getByRole("textbox", { name: "Поиск компонентов" }).fill("piston");
check(
  "Library search returns real parts",
  (await page.locator(".part-card").count()) > 0,
);
await page.screenshot({ path: "artifacts/library-desktop.png" });
await page
  .getByRole("textbox", { name: "Поиск компонентов" })
  .fill("does-not-exist-999");
check("Search empty state", await page.locator(".empty-state").isVisible());
await page.getByRole("link", { name: "Технологии", exact: true }).click();
await page.waitForTimeout(1000);
await page
  .getByRole("button", { name: "09 Рекуперация энергии", exact: true })
  .click();
await page.getByRole("button", { name: "Рекуперация", exact: true }).click();
check(
  "Energy diagram reverses",
  await page.locator(".energy-path.reverse").isVisible(),
);
await page.waitForTimeout(650);
await page.screenshot({ path: "artifacts/encyclopedia-desktop.png" });
check(
  "Desktop has no horizontal overflow",
  await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
);
const mobile = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1,
  isMobile: true,
  hasTouch: true,
});
mobile.on("pageerror", (e) => errors.push(e.message));
await mobile.goto("http://localhost:5178/");
await mobile.waitForFunction(() => window.__engineDebug?.parts === 1267, null, {
  timeout: 60000,
});
await mobile.waitForTimeout(1800);
await mobile.screenshot({ path: "artifacts/hero-mobile.png" });
check(
  "Mobile no horizontal overflow",
  await mobile.evaluate(
    () => document.documentElement.scrollWidth <= innerWidth,
  ),
);
await mobile.getByRole("button", { name: "Открыть меню", exact: true }).click();
check("Mobile menu opens", await mobile.locator(".nav-links.open").isVisible());
await mobile.getByRole("link", { name: "3D-лаборатория", exact: true }).click();
await mobile.waitForTimeout(1200);
await mobile.screenshot({ path: "artifacts/lab-mobile.png" });
await mobile.getByRole("button", { name: "Системы", exact: true }).click();
check(
  "Mobile system controls accessible",
  await mobile.getByRole("checkbox", { name: "01 Блок и головки" }).isVisible(),
);
check("No browser errors", errors.length === 0);
const reduced = await browser.newPage({
  viewport: { width: 1280, height: 900 },
  reducedMotion: "reduce",
});
await reduced.goto("http://localhost:5178/");
await reduced.waitForFunction(
  () => window.__engineDebug?.parts === 1267,
  null,
  { timeout: 60000 },
);
await reduced.waitForTimeout(700);
const still = await reduced.evaluate(() => window.__camera.position);
await reduced.waitForTimeout(500);
check(
  "Reduced-motion hero camera stays stationary",
  await reduced.evaluate(
    (before) =>
      window.__camera.position.every((v, i) => Math.abs(v - before[i]) < 1e-5),
    still,
  ),
);
const fallback = await browser.newPage({
  viewport: { width: 390, height: 844 },
});
await fallback.addInitScript(() => {
  const original = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
    if (type === "webgl2") return null;
    return original.call(this, type, ...rest);
  };
});
await fallback.goto("http://localhost:5178/");
await fallback.locator(".model-fallback").waitFor({ timeout: 60000 });
check(
  "WebGL fallback displays original render",
  await fallback.locator(".model-fallback img").isVisible(),
);
await fallback
  .getByRole("button", { name: "3D-лаборатория", exact: true })
  .click();
check(
  "Unavailable WebGL does not expose fake lab controls",
  await fallback.locator(".fallback-lab").isVisible(),
);
await fallback.screenshot({ path: "artifacts/webgl-fallback.png" });
await fs.writeFile(
  "artifacts/browser-qa.json",
  JSON.stringify(
    {
      checks,
      errors,
      desktop: { width: 1440, height: 1000 },
      mobile: { width: 390, height: 844 },
      date: new Date().toISOString(),
    },
    null,
    2,
  ),
);
console.log(JSON.stringify({ passed: checks.length, errors }, null, 2));
await browser.close();

