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

// 關閉更新紀錄彈窗（若跳出）
const close = page.getByText("關閉", { exact: true });
if (await close.count()) {
  await close.first().click({ force: true });
  await page.waitForTimeout(500);
}

// 首頁截圖
await page.screenshot({ path: `${OUT}/after.png` });
console.log("after.png");

// 進遊戲：暱稱 → 開始 → 模式 → 難度 → 選角色 → 開跑
const input = page.locator('input[placeholder="輸入暱稱後開始"]');
await input.fill("小喬試玩");
await input.press("Enter");
await page.waitForTimeout(400);
await page.getByText("遊戲開始").click();
await page.waitForTimeout(700);

// 模式頁：劇情
const story = page.getByText("劇情模式", { exact: false });
if (await story.count()) {
  await story.first().click({ force: true });
  await page.waitForTimeout(700);
}

// 難度：簡單
const easy = page.locator('div:text-is("簡單")');
if (await easy.count()) {
  await easy.first().click({ force: true });
  await page.waitForTimeout(900);
}

// 選單：開始
const start = page.locator("button", { hasText: "開始（" });
if (await start.count()) {
  await start.first().click({ force: true });
}
await page.waitForTimeout(1500);
await page.keyboard.press("Escape");
await page.waitForTimeout(500);

for (const [i, wait] of [10000, 9000, 9000].entries()) {
  await page.waitForTimeout(wait);
  await page.screenshot({ path: `${OUT}/after-gameplay-${i + 1}.png` });
  console.log("after-gameplay-" + (i + 1));
}

await browser.close();
console.log("ok");
