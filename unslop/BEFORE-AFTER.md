# AI 生成的醜網頁 vs 改後 — 逐項對照

> 教材用途：給學生看的「AI 味介面」實例對照（輔哥指定）。
> 對象：殭屍大逃殺 v2.0 首頁＋遊戲內 HUD。
> unslop by Damir Sokolovsky ([@heydamir](https://x.com/heydamir)), [heydamir.design/unslop](https://heydamir.design/unslop), CC BY 4.0。

**授權聲明（重要，務必保留給學生看到）**
- `unslop` 技能：CC BY 4.0，作者 Damir Sokolovsky ([@heydamir](https://x.com/heydamir))。
- 校內教材引用、改寫成講義：**沒問題**。
- 若要散布給學生或上架公開教材集：**只取「教學想法與檢核表」**，程式碼部分請先與作者確認。
- 產出的改版程式碼（`src/` 變更）為本專案自身作品。

---

## 素材對照

| | 改前 | 改後 |
|---|---|---|
| 首頁 | `unslop/original.live.png` | `unslop/after.png` |
| 遊戲內 HUD | `unslop/gameplay-2.png` | `unslop/after-gameplay.png` |
| 首頁 DOM | `unslop/original.html` | `unslop/after.html` |
| HUD DOM | `unslop/before-hud.html` | `unslop/after-hud.html` |

截圖視窗一致：1440×900，同一支 Playwright 腳本（`unslop/shoot-game.mjs` 與 `unslop/shoot-after.mjs`）。

---

## 一、數據：slop 徵兆實測（實際 DOM，排除 Tailwind 框架 utility 定義）

掃描方式：取渲染後 DOM，剝掉 `<style>`／`<script>`，只算真正用到的 class。

| 徵兆 | 改前（首頁） | 改後（首頁） | 改前（HUD） | 改後（HUD） |
|---|---|---|---|---|
| `backdrop-blur` 玻璃模糊 | 7 | **0** | 8 | **0** |
| `font-black`（字重 900） | 8 | **0** | 3 | **0** |
| `rounded-full` 全藥丸（容器用） | 5 | **0** | 4 | **0**（見下） |
| `animate-ping` 呼吸光點 | 1 | **0** | 0 | **0** |
| `tracking-widest` 寬字距 | 2 | **0** | 0 | **0** |
| `gradient` 漸層 | 2 | **0** | 2 | **0** |
| `text-shadow` 假陰影 | 1 | **0** | 1 | **0** |
| `bg-black/40` 半透明疊底 | 7 | **0** | 8 | **0** |
| 螢光綠 `text-lime-*` | 12 | **0** | 0 | **0** |
| 彩色 ring / 撞色 | 多處 | **0** | 多處 | **0** |
| **emoji 數量** | **20** | **0** | **0** | **0** |

> ★ 改後 HUD 仍有 **4 處 `rounded-full`** —— 那是血條、經驗條、王血條的**進度條**（槽＋填充），屬 `TOKENS.md` 明列的合法例外（圖形而非容器）。容器類的藥丸已全數清零。

全站（含資料層）：emoji **148 處／67 種 → 0 處／0 種**。

---

## 二、逐項對照：左「原本怎樣爛」→ 右「改成怎樣」

### 1. Hero 版面 —— 置中堆疊 vs 分欄

**原本**：標題、副標、在線徽章、暱稱框、5 顆按鈕、4 張統計卡，全部垂直置中堆成一塔。這是版面的預設值，不是選擇。

**改後**：`lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]` 左文字右實機畫面。主 CTA 與次要入口分層（主按鈕 vs 文字連結），資訊有主從。

> 對應徵兆：Hero 一律置中堆疊

### 2. Hero 視覺 —— 沒有視覺 vs 真實產品畫面

**原本**：首屏唯一「漂亮的主體」是 22 個隨機多邊形漂浮在深色漸層上。沒有場景、沒有產品預覽、沒有實機畫面。

**改後**：右欄放**實機截圖**（`/hero-gameplay.png`，1440×900 真實遊戲畫面）。廢墟色調**只疊不重繪** —— 用 `bg-void/25 mix-blend-multiply` 半透明遮罩，沒有對截圖做破壞性調色。

> 對應徵兆：Hero 沒有任何真實視覺 / 模板測試（換成任何遊戲名都不會破綻）

### 3. 色彩系統 —— 多色並存 vs 單一 accent

**原本**：毒綠 `#c6ff7a`、琥珀 `#ffd23f`、玫瑰 `#ff5a5a`、萊姆 `#c6ff7a` 同時當主色；每個畫面有自己的漸層方向（藍色頁底、綠色主鈕、紅色死鬥卡）；彩色 ring（`ring-lime-400/20`、`ring-rose-400/50`、`ring-fuchsia-500/80`）散落各處。

**改後**：建立一組**廢墟灰中性階梯**（`--color-void` → `surface-1..4`，暖偏綠的土色，不是純灰），**accent 只有一個**：警戒橙 `#ff7a1a`。語意色降為三支低調的 danger/success/caution，只用在狀態上。

> 對應徵兆：多色漸層並存當主色 / 無單一 accent / 彩色 ring

### 4. 玻璃卡片 —— 半透明模糊 vs 表面階梯＋髮絲線

**原本**：全站 60+ 處 `bg-black/40 + backdrop-blur-md + ring-white/10`。深色底上疊半透明黑＝什麼都沒有的糊鏡面。

**改後**：`backdrop-blur` 全站 0 處。深度改由**表面階梯 + 8% 髮絲線**給出。唯一保留的陰影是浮層的 `0 8px 24px rgba(0,0,0,.45)`。

> 對應徵兆：玻璃卡片佔滿全站

### 5. 字體 —— 字重 900 當階層 vs 400/500 為主

**原本**：`font-black` 100+ 處，標題、卡名、按鈕文字、數字、標籤全部 900，等於沒有階層。`tracking-widest`／`tracking-wider` 撒在中文標題上。自訂字級 `text-[0.72rem]`／`[0.66rem]`／`[0.6rem]`／`[0.26em]` 混用。

**改後**：字級固定 8 階（11/12/13/14/16/20/28/56），字重只用 **400/500/600**，禁止 700+。階層靠**大小＋顏色**。

> 對應徵兆：字重 900 當階層 / 寬字距 / 自訂非階梯字級

### 6. 數字格式 —— 混雜 vs 統一等寬

**原本**：`10859`（場次）、`523h58m`（時間）、`12538976`（擊殺）、`26`（在線最高）混在同一組卡片；數字沒有等寬字形，跳動。

**改後**：全站數字加 `.num`（`font-variant-numeric: tabular-nums`），同一組數字格式一致。

> 對應徵兆：數字格式不一 / 混雜

### 7. 圖示 —— 148 處 emoji vs 一套 lucide 線性圖示

**原本**：emoji 當圖示（`▶ 🏆 🧟 💬 📈 🧟 💀 😀 🙂 😬 😱 🔫 👟 ⚡ 🧲 🐕 🐶 💥 🦈`）、emoji 塞進藥丸與數字（`💰 1234`、`解鎖 💰300`）、emoji 當 3D 載入佔位、還混著 `← ▸ ✕ ↩ ⬆ ⚖ ⚠` 四套不同記號系統。**全站沒有一套線性圖示。**

**改後**：單一登錄表 `src/ui/icons.ts` → 全站走 `game-icon.vue`（18px、stroke 1.5、間距 8px）。資料層也清：`characters.ts`／`difficulty.ts`／`upgrades.ts`／`meta.ts`／`deathmatch.ts`／`game.ts`／`changelog.ts` 全部改成 `icon` key。角色辨識度靠**顏色標記 + lucide 圖示 + 名稱文字**三者。

> 對應徵兆：emoji 當圖示與資料層 / 混用多套記號系統

### 8. 圓角 —— 全藥丸 vs 按尺寸分級

**原本**：返回鈕、輸入框、模式切換鈕、難度分頁、金幣徽章、發送鈕、開始鈕、整個難度選擇，全是 `rounded-full`。藥丸沒有資訊量，只是「AI 預設」。

**改後**：按尺寸分級 —— 標籤 4、按鈕/輸入框 8、卡片 12、面板 16，巢狀半徑 = 外半徑 − padding。**合法例外只有兩種**（進度條與在線狀態點，都寫進 `TOKENS.md`）。

> 對應徵兆：所有東西都是藥丸

### 9. 動態 —— 彈簧與無限循環 vs 單一曲線

**原本**：`cubic-bezier(0,1.65,1,1.65)` 彈簧讓按鈕「彈」一下；`animate-ping` 呼吸光點；22 個多邊形 14–34 秒無限循環漂移（每次載入還隨機重排，純裝飾 filler）；動畫 `width` 會卡。

**改後**：單一曲線 `cubic-bezier(0.22,1,0.36,1)`、120–180ms。在線狀態改成**靜態小圓點 + 文字**（數字本來就是即時的，光暈只是裝飾）。按下 `scale(0.97)`，hover 改顏色不縮放。

> 對應徵兆：animate-ping / 彈簧 hover / 漂浮多邊形無限循環 / 動畫 width

### 10. 標題 —— 假描邊假陰影 vs 階層

**原本**：`-webkit-text-stroke: 6px #14210f` + `text-shadow: 0 6px 0 rgba(0,0,0,.35)`。插畫感裝飾，不是字體階層。

**改後**：56px（行動 36px）、`font-semibold`、`tracking-[-0.02em]`、純 `text-primary`。版本號降為 11px 的次要標記（可點看更新紀錄）。

> 對應徵兆：標題假描邊 + 假陰影

### 11. 文案 —— 內嵌符號與語氣詞 vs 陳述句

**原本**：`▶ 遊戲開始`、`← 返回`、`🛠 Debug`、`💰 1234`、`知道了，開玩！`、`搶頭香吧！`、`過幾天再回來看趨勢～`（波浪號）、`🆕 更新紀錄`。

**改後**：圖示一律走 lucide 元件，不再用字元拼。語氣詞拿掉（`知道了，開玩！` → `關閉`）。介面文案不帶驚嘆號、不帶波浪號。

> 對應徵兆：介面文字夾帶裝飾符號 / 口語化宣傳語

### 12. 設計系統 —— 沒有系統 vs token 表先行

**原本**：19 個 component 各自寫一套 class，同一個設計意圖在不同檔案有不同寫法。

**改後**：先寫 `unslop/TOKENS.md`（色彩／字級／間距／圓角四類**一次定死**），實作落在 `src/style.css` 的 Tailwind v4 `@theme`（變數即 token）＋ `src/ui/icons.ts`（圖示登錄表）。本輪只套「首頁 + HUD」兩個示範板，驗證完 token 表再往其餘 17 個 component 推。

> 對應徵兆：模板回退徵兆（改完會掉進的陷阱）

### 13. Signature —— 沒有個性記號 vs 一條警戒條紋

**原本**：全站沒有任何一個「只有這個產品才可能有」的東西。

**改後**：**一條 4px 黑黃警戒條紋**（工地圍條感），全站只用三處：首頁 hero 圖框左緣、王血條上緣、升級面板標題左側。

> 對應徵兆：模板測試（最後一頁必須是只有這個產品才可能的畫面）

---

## 三、給學生的三句話

1. **AI 味不是「醜」，是「沒做決定」。** 玻璃卡片、藥丸按鈕、emoji 標籤、字重 900、寬字距 —— 這些都是模型不假思索的預設值。它們沒有錯，只是沒有被決定過。

2. **先把系統定死，再改畫面。** 這次改動最大的收穫不是「首頁變好看了」，而是「先寫 token 表，之後 17 個 component 有規可循」。順序錯了，會在規則還沒定型時重做同一批東西。

3. **乾淨不等於完成。** 把 slop 全部清掉，得到的會是「灰底＋Inter＋一顆按鈕」——那還是模板。最後一頁必須是**只有這個產品才可能有**的畫面：這裡是那條 4px 警戒條紋，和右欄那張真的實機畫面。

---

## 四、可重跑的驗證腳本

| 腳本 | 用途 |
|---|---|
| `unslop/shoot-game.mjs` | 從**線上版**自動玩進遊戲內截圖（hero 素材來源，過期時重跑即可） |
| `unslop/shoot-after.mjs` | 對**本機版**截首頁與遊戲內畫面（需先 `pnpm build` 並起 preview） |
| `unslop/snap-hud.mjs` | 擷取遊戲內 HUD 的 DOM（slop 掃描用） |

重跑 hero 素材（遊戲更新後）：

```bash
cd ~/.openclaw/workspace/chiaqian/zombie-survivors
node unslop/shoot-game.mjs
cp unslop/gameplay-1.png public/hero-gameplay.png
```

---

_本文件為 unslop 流程產出，與 `AUDIT.md`、`DIRECTION.md`、`TOKENS.md` 一併保留。unslop by Damir Sokolovsky ([@heydamir](https://x.com/heydamir)), CC BY 4.0._
