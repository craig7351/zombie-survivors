import { createRequire } from "node:module";
import { join } from "node:path";
import { writeFileSync } from "node:fs";

const require = createRequire(join(process.env.HOME, ".openclaw/workspace/package.json"));
const { chromium } = await import("playwright-core");

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const TARGET = process.env.TARGET_URL ?? "http://localhost:4173";
const OUT = process.env.OUT_DIR ?? "unslop";

/** 掃描的 slop 徵兆：DOM class token 精確比對（非子字串） */
const MARKERS = [
  "backdrop-blur",
  "backdrop-filter",
  "font-black",
  "font-extrabold",
  "font-bold",
  "rounded-full",
  "tracking-widest",
  "tracking-wider",
  "animate-ping",
  "text-shadow",
  "drop-shadow",
  "bg-black/",
  "ring-1",
  "ring-2",
  "shadow-2xl",
  "gradient-to",
];

/** 以 CSS class token 精確比對（token 完全相等，不是子字串） */
function countTokens(classAttr, token) {
  const classes = classAttr.split(/\s+/).filter(Boolean);
  if (token.endsWith("/")) {
    // 有前綴變體：bg-black/40、bg-black/70 …
    const prefix = token.slice(0, -1);
    return classes.filter((c) => c.startsWith(prefix) && /[0-9]/.test(c)).length;
  }
  return classes.filter((c) => c === token).length;
}

const browser = await chromium.launch({
  executablePath: CHROME,
  args: ["--use-gl=angle", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(TARGET, { waitUntil: "networkidle" });
await page.waitForTimeout(2000);

/** 更新紀錄彈窗：改版前「知道了，開玩！」，改版後「關閉」，兩版都支援 */
for (const label of ["關閉", "知道了，開玩！"]) {
  const close = page.getByText(label, { exact: true });
  if (await close.count()) {
    await close.first().click({ force: true });
    await page.waitForTimeout(600);
    break;
  }
}

/** 掃描當前畫面：收集根節點內所有元素的 class token */
async function scanCurrent(label) {
  const data = await page.evaluate((markers) => {
    const counts = Object.fromEntries(markers.map((m) => [m, 0]));
    const emoji = [];
    const root = document.querySelector("#app");
    if (!root) return { counts, emoji, total: 0 };
    // 全域去重：HUD 在 game-view 常駐掛載，切到 pause-menu 時仍在 DOM 裡，
    // 不去重會把同一批元素數兩次（這正是教材要講的坑）
    window.__auditSeen = window.__auditSeen || new Set();
    const seen = window.__auditSeen;
    const all = root.querySelectorAll("*");
    let fresh = 0;
    for (const el of all) {
      if (!el.dataset.auditId) {
        el.dataset.auditId = "a" + Math.random().toString(36).slice(2, 10);
      }
      const key = el.dataset.auditId;
      const isNew = !seen.has(key);
      if (isNew) {
        seen.add(key);
        fresh++;
      }
      const attr = el.getAttribute("class");
      if (attr && isNew) {
        for (const m of markers) {
          const classes = attr.split(/\s+/).filter(Boolean);
          if (m.endsWith("/")) {
            const prefix = m.slice(0, -1);
            counts[m] += classes.filter((c) => c.startsWith(prefix) && /[0-9]/.test(c)).length;
          } else {
            counts[m] += classes.filter((c) => c === m).length;
          }
        }
      }
      // 文字節點的 emoji
      for (const node of el.childNodes) {
        if (node.nodeType === 3 && isNew) {
          const t = node.textContent || "";
          for (const ch of t) {
            const cp = ch.codePointAt(0);
            if (
              (cp >= 0x1f000 && cp <= 0x1faff) ||
              (cp >= 0x2600 && cp <= 0x27bf) ||
              (cp >= 0x2b00 && cp <= 0x2bff) ||
              cp === 0xfe0f
            ) {
              emoji.push(ch);
            }
          }
        }
      }
    }
    return { counts, emoji, total: all.length, fresh };
  }, MARKERS);
  return { label, ...data };
}

/** SPA 沒有瀏覽歷史可退，改點 App 內的「返回」按鈕 */
async function backToLanding() {
  for (let i = 0; i < 4; i++) {
    const back = page.getByRole("button", { name: /返回/ }).first();
    if (await back.count()) {
      await back.click({ force: true });
      await page.waitForTimeout(900);
      continue;
    }
    break;
  }
}

const results = [];
const push = async (label) => results.push(await scanCurrent(label));

// ── 畫面 1：首頁 ──
await push("landing");

// ── 畫面 2：排行榜 ──
await page.getByText("排行榜", { exact: false }).first().click({ force: true });
await page.waitForTimeout(1200);
await push("leaderboard");

// ── 畫面 3：怪物圖鑑 ──
await backToLanding();
await page.getByText("怪物圖鑑", { exact: false }).first().click({ force: true });
await page.waitForTimeout(1500);
await push("bestiary");

// ── 畫面 4：留言板 ──
await backToLanding();
await page.getByText("留言板", { exact: false }).first().click({ force: true });
await page.waitForTimeout(1500);
await push("messages");

// ── 畫面 5：線上人數 ──
await backToLanding();
await page.getByText("線上人數", { exact: false }).first().click({ force: true });
await page.waitForTimeout(1800);
await push("onlineHistory");

// ── 畫面 6：模式頁 ──
await backToLanding();
const input = page.locator('input[placeholder="輸入暱稱後開始"]');
await input.fill("小喬試玩");
await input.press("Enter");
await page.waitForTimeout(400);
await page.getByText("遊戲開始").click();
await page.waitForTimeout(1000);
await push("mode");

// ── 畫面 7：難度頁 ──
const story = page.getByText("劇情模式", { exact: false });
if (await story.count()) {
  await story.first().click({ force: true });
  await page.waitForTimeout(900);
}
await push("difficulty");

// ── 畫面 8：遊戲內選單 ──
const easy = page.locator('div:text-is("簡單")');
if (await easy.count()) {
  await easy.first().click({ force: true });
  await page.waitForTimeout(1200);
}
await push("menu");

// ── 畫面 9：遊戲內 HUD（遊戲進行中，未暫停）──
const start = page.locator("button", { hasText: "開始（" });
if (await start.count()) {
  await start.first().click({ force: true });
}
await page.waitForTimeout(3000);
await page.waitForTimeout(6000);
await push("game-hud");

// ── 畫面 10：暫停選單 ──
// 確認暫停選單真的出現才掃（上一版沒驗證，掃到的其實是未暫停畫面）
await page.keyboard.press("Escape");
await page.waitForTimeout(1200);
const pauseVisible = await page.locator("button", { hasText: "繼續" }).count();
if (!pauseVisible) {
  await page.keyboard.press("Escape");
  await page.waitForTimeout(1200);
}
const pauseCheck = await page.locator("button", { hasText: "繼續" }).count();
if (pauseCheck) {
  await push("pause-menu");
} else {
  console.log("⚠️ 暫停選單未出現，跳過該畫面");
}

await browser.close();

// ── 彙整 ──
const totals = Object.fromEntries(MARKERS.map((m) => [m, 0]));
let emojiTotal = 0;
const emojiKinds = new Set();
console.log("\n=== 渲染後 DOM 全站稽核（逐畫面實測）===\n");
for (const r of results) {
  const line = MARKERS.filter((m) => r.counts[m] > 0)
    .map((m) => `${m}=${r.counts[m]}`)
    .join("  ");
  console.log(`${r.label.padEnd(14)} 元素 ${String(r.total).padStart(4)}（本畫面新增 ${String(r.fresh).padStart(4)}）  emoji ${r.emoji.length}  ${line || "（全部 0）"}`);
  for (const m of MARKERS) totals[m] += r.counts[m];
  emojiTotal += r.emoji.length;
  for (const e of r.emoji) emojiKinds.add(e);
}
console.log("\n=== 全站合計 ===");
for (const m of MARKERS) console.log(`  ${m.padEnd(18)} ${totals[m]}`);
console.log(`  ${"emoji".padEnd(18)} ${emojiTotal} 處 / ${emojiKinds.size} 種`);
console.log(`  ${"畫面數".padEnd(18)} ${results.length}`);

writeFileSync(`${OUT}/audit-dom.json`, JSON.stringify({ results, totals, emojiTotal, emojiKinds: [...emojiKinds] }, null, 2), "utf8");
console.log("\n→ unslop/audit-dom.json");
