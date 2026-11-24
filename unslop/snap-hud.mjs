import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(join(process.env.HOME, ".openclaw/workspace/package.json"));
const { chromium } = await import("playwright-core");

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const TARGET = process.env.TARGET_URL ?? "http://localhost:4173";
const OUT = process.env.OUT_DIR ?? "unslop";

const browser = await chromium.launch({
  executablePath: CHROME,
  args: ["--use-gl=angle", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(TARGET, { waitUntil: "networkidle" });
await page.waitForTimeout(2000);

// 更新紀錄彈窗：改版前按鈕是「知道了，開玩！」，改版後是「關閉」，兩版都支援
for (const label of ["關閉", "知道了，開玩！"]) {
  const close = page.getByText(label, { exact: true });
  if (await close.count()) {
    await close.first().click({ force: true });
    await page.waitForTimeout(600);
    break;
  }
}

const input = page.locator('input[placeholder="輸入暱稱後開始"]');
await input.fill("小喬試玩");
await input.press("Enter");
await page.waitForTimeout(400);
await page.getByText("遊戲開始").click();
await page.waitForTimeout(700);

const story = page.getByText("劇情模式", { exact: false });
if (await story.count()) {
  await story.first().click({ force: true });
  await page.waitForTimeout(700);
}
const easy = page.locator('div:text-is("簡單")');
if (await easy.count()) {
  await easy.first().click({ force: true });
  await page.waitForTimeout(900);
}
const start = page.locator("button", { hasText: "開始（" });
if (await start.count()) {
  await start.first().click({ force: true });
}
await page.waitForTimeout(1500);
await page.keyboard.press("Escape");
await page.waitForTimeout(8000);

/** 只取 HUD（遊戲內疊層）的 DOM，做 slop 掃描 */
const html = await page.evaluate(() => {
  const hud = document.querySelector(".pointer-events-none.absolute.inset-0.z-10");
  return hud ? hud.outerHTML : "";
});
const { writeFileSync } = await import("node:fs");
writeFileSync(`${OUT}/after-hud.html`, html, "utf8");
console.log("after-hud.html written, length", html.length);

await browser.close();
console.log("ok");
