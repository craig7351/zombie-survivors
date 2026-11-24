import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(join(process.env.HOME, ".openclaw/workspace/package.json"));
const { chromium } = await import("playwright-core");

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const browser = await chromium.launch({
  executablePath: CHROME,
  args: ["--use-gl=angle", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("https://animal-survivors.pages.dev", { waitUntil: "networkidle" });
await page.waitForTimeout(2000);

// 關閉更新紀錄彈窗
const ack = page.getByText("知道了，開玩");
if (await ack.count()) {
  await ack.first().click({ force: true });
  await page.waitForTimeout(600);
}

const input = page.locator('input[placeholder="輸入暱稱後開始"]');
await input.fill("小喬試玩");
await input.press("Enter");
await page.waitForTimeout(500);

await page.getByText("遊戲開始").click();
await page.waitForTimeout(900);

// 難度：點第一張（簡單）
const easy = page.locator('div:text-is("簡單")');
if (await easy.count()) {
  await easy.first().click({ force: true });
  await page.waitForTimeout(900);
}

await page.keyboard.press("Escape");
await page.waitForTimeout(400);

// 開始遊戲
const startBtn = page.locator("button", { hasText: "開始（" });
if (await startBtn.count()) {
  await startBtn.first().click({ force: true });
}
await page.waitForTimeout(1500);
await page.keyboard.press("Escape");
await page.waitForTimeout(600);

for (const [i, wait] of [10000, 9000, 9000].entries()) {
  await page.waitForTimeout(wait);
  await page.screenshot({ path: `unslop/gameplay-${i + 1}.png` });
  console.log("shot", i + 1);
}

await browser.close();
console.log("ok");
