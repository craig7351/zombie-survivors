# 殭屍大逃殺 v2.0 — unslop 稽核報告

> 技能：`unslop` v0.1 — Damir Sokolovsky ([@heydamir](https://x.com/heydamir)), [heydamir.design/unslop](https://heydamir.design/unslop)，CC BY 4.0。
> 本報告為該技能的改編應用，依 CC BY 4.0 保留作者 credit。

- 對象：https://animal-survivors.pages.dev
- 原始碼：`/Users/wenfu/.openclaw/workspace/chiaqian/zombie-survivors`，commit `3d538d6`（v2.0，已與線上對齊）
- 稽核方式：讀 Vue + Tailwind v4 原始碼 + 快照渲染後 DOM（`unslop/original.html`）+ 實機 Playwright 截圖（`unslop/gameplay-1~3.png`）。
  本次模型層不支援讀圖，故判斷以程式碼與渲染後 DOM 為準，截圖僅留作視覺素材。
- 狀態：**只稽核，未動任何產品原始碼**（`unslop/` 為本次新增的獨立工作資料夾）

## 0. 兩個必須先講的事

**（a）版本對齊。** 稽核開始時 `chiaqian/zombie-survivors` 停在 `3c075ac`（舊版），與線上 v2.0（`3d538d6`）相差 12 個 commit。若直接在舊版動工，改的會是不在線上的程式碼。已 `git merge --ff-only origin/main` 對齊後才做稽核。

**（b）稽核範圍。** 19 個 component、2080 行。同一套 slop 語彙貫穿全站：玻璃卡片、`font-black`、`rounded-full`、emoji 圖示。這不是單頁問題，是**設計系統層級**的問題。

> ★ **數字已於改造收尾時重測並更正**（見下方「更正紀錄」）。原始的 grep 口徑漏掉了帶後綴的 class
> （`backdrop-blur-md`）與 style 區塊寫法，數字偏小。

## 1. 渲染後 DOM 實測（landing 頁）

| 項目 | 次數 |
|---|---|
| `backdrop-blur` 玻璃模糊 | 7 |
| `font-black`（字重 900） | 8 |
| `font-bold`（字重 700） | 3 |
| `rounded-full` 全藥丸 | 5 |
| `tracking-widest` | 2 |
| `bg-black/40` 半透明疊底 | 7 |
| `animate-ping` 呼吸光點 | 1 |

**全站**（`src/` 全部 .vue/.ts/.css，剝除 `style.css` 的 token 定義）：

| 項目 | 改前 | 改後 |
|---|---|---|
| `backdrop-blur` | 48 | **0** |
| `backdrop-filter`（style 寫法） | 2 | **0** |
| `font-black` | 90 | **0** |
| `font-bold` | 14 | **0** |
| `rounded-full` | 46 | 8（全為圓形圖形元件，容器型 0） |
| `tracking-widest` / `tracking-wider` | 5 / 8 | **0 / 0** |
| `animate-ping` | 1 | **0** |
| `gradient-to` | 5 | **0** |
| ★ inline 漸層（★ computed style 層）★ | **8** | **3**（★ 全為 Signature 合法例外）★ |
| `text-shadow` | 3 | **0** |
| `drop-shadow-` | 1 | **0** |
| emoji | **153 處、66 種** | **0 處、0 種** |

### 更正紀錄

原始稽核用 `grep` 統計，出現兩個系統性低估：

1. **帶後綴的 class 被漏掉** — `backdrop-blur-md`／`backdrop-blur-sm` 不符合只找 `backdrop-blur` 的比對條件，
   而全站幾乎都是帶後綴的寫法，於是「首頁＋HUD 清零」的表象下，全站其實還剩 32 處。
2. **style 區塊的 CSS 寫法被漏掉** — 例如 `mode-screen.vue` 的 `backdrop-filter: blur(6px);`。

**這一課本身就是教材重點**：沒有全站、且口徑正確的掃描，就會以為自己改完了。

## 2. Slop 徵兆清單

### 顏色與表面
1. **玻璃卡片佔滿全站** — `hud.vue` 11 處、`game-view.vue` 8 處、`landing-screen.vue` 6 處、`leaderboard-screen.vue` 6 處。深色底上疊 `bg-black/40 + backdrop-blur-md` = 什麼都沒有的糊鏡面。
2. **多色漸層並存當主色** — `menu-screen.vue` 根層 `from-[#0b1020] to-[#161f38]`（藍）、`landing` 主按鈕 `#7ec850→#4a9c2e`（綠）、`mode-screen` 死鬥卡 `rgba(220,60,60)→rgba(120,20,20)`（紅）、HUD 血條 `red-500→rose-400`、經驗條 `cyan-400→emerald-400`、王血條 `rose-600→red-400`。每個畫面都有自己的漸層方向，沒有 accent 規則。
3. **無單一 accent** — 毒綠 `#c6ff7a`（標題/數字/選中）、琥珀 `amber-400`（等級/金幣/難度）、玫瑰 `rose-400`（死鬥模式）、萊姆 `lime-500`（送出鈕）、`bg-lime-400`（排行榜分頁）同時為主色。
4. **標題假描邊 + 假陰影** — `landing-screen.vue` h1 用了 `-webkit-text-stroke: 6px #14210f` 與 `text-shadow: 0 6px 0 rgba(0,0,0,.35)`。插畫感裝飾，不是字體階層。
5. **徑向暗角洗色** — `background-polygons.vue` 疊 `radial-gradient(transparent 40%, rgba(0,0,0,.55))`。
6. **文字疊文字陰影** — HUD 血量數字 `[text-shadow:0_1px_2px_rgba(0,0,0,0.9)]`，靠陰影硬讀。
7. **玻璃底下的彩色 ring** — `ring-lime-400/20`、`ring-rose-400/50`、`ring-amber-300`、`ring-fuchsia-500/80` 等彩色邊框散落各處。

### 字體
8. **字重 900 當階層** — `font-black` 共 90 處（`menu-screen.vue` 12、`leaderboard-screen.vue` 11、`game-over-modal.vue` 9、`victory-modal.vue` 8…）。標題、卡名、按鈕文字、數字、標籤全部 900，等於沒有階層。
9. **寬字距** — `tracking-widest`（主標題、王血條、更新紀錄）、`tracking-wider`（各頁 h1）、`tracking-wide`（副標）。中文不需要。
10. **自訂非階梯字級** — `text-[0.72rem]`、`text-[0.66rem]`、`text-[0.6rem]`、`text-[0.26em]`（版本徽章）等任意值。
11. **HUD 狀態擠在一排** — FPS/敵人/擊殺/時間/波數/突變子六個不同語意的數值，字重與顏色各自為政（`text-green-300`/`text-amber-300`/`text-red-300` 三色判 FPS）。

### 圖示
12. **emoji 當圖示** — 導覽列 `▶ 🏆 🧟 💬 📈`、模式 `🧟 💀`、難度 `😀🙂😬😱💀`、角色 `🔫👟⚡🧲🐕🐶💥🦈`、升級 `⚡🎯❤💥⚔🔭💨👟🦘`、死鬥突變子 `🥚🗿🔥🧫💀`、武器 `🛡🌪🎯🧲💉`。**全站沒有任何一套線性圖示。**
13. **emoji 塞進藥丸與數字** — `💰 {{gold}}`、`+1000💰`、`Lv {}`、`🆕 更新紀錄`。
14. **emoji 當載入佔位** — `menu-screen.vue` 3D 預覽未就緒時以 `text-5xl` emoji 頂替。
15. **符號非 emoji 但同樣是圖示** — `← 返回`、`✕ 取消`、`▸`、`▶ 遊戲開始`、`⬆`、`⚖`、`⚠`、`▶/⏸`、`🔇🔊🎚`。同一個職責混用三套記號系統。
16. **王血條用 `⚠` 包住名字** — `⚠ {{bossName}} ⚠`，符號當裝飾框。

### 間距與版面
17. **所有東西都是藥丸** — 返回鈕、輸入框、模式切換鈕、難度分頁、金幣徽章、發送鈕、開始鈕、完整難度選擇，全是 `rounded-full`。
18. **Hero 一律置中堆疊** — 標題、副標、在線徽章、暱稱框、主鈕、四顆次要鈕、四張統計卡，全部垂直置中。版面預設值，非選擇。
19. **Hero 有五顆按鈕** — 遊戲開始 + 排行榜 + 圖鑑 + 留言板 + 線上人數。
20. **四張等寬等內容統計卡** — 場次/時間/擊殺/同時在線最高，同寬度同結構，模板感。
21. **非 4px 節奏** — `gap-1.5`、`gap-2`、`gap-3`、`gap-4`、`gap-5`、`gap-6`、`px-2/3/4/5/6`、`py-0.5/1/1.5/2/3/4` 混用。
22. **一頁四層導覽** — landing → mode → difficulty → menu，四個全置中堆疊畫面，視覺語言完全一致但資訊密度各異。
23. **分頁/切換用三種不同色** — 排行榜：劇情榜 `bg-lime-400`、模式 `bg-rose-400`、難度 `bg-amber-400`。三個並存的「選中」訊號。

### 文案
24. **介面文字夾帶裝飾符號** — `▶ 遊戲開始`、`← 首頁`、`🛠 Debug`、`💰`、`知道了，開玩！`、`▸` 清單箭頭。
25. **口語化宣傳語** — `知道了，開玩！`、`搶頭香吧！`、`過幾天再回來看趨勢～`（波浪號）、`資料剛開始累積`。介面文案帶語氣詞與驚嘆號。
26. **沒標明基準的數字** — `區間尖峰 {{maxPeak}} 人`、`同時在線最高`、`累積擊殺`。可接受，但與「本機 vs 全球」來源混用（`fetchStats` 覆蓋本機值後，同一組卡片混兩種來源）。
27. **placeholder 是話術** — `輸入暱稱後開始`、`留個言給大家…`、`回覆 @xxx…`。
28. **更新紀錄彈窗整面 emoji** — `🆕 更新紀錄`、`💀 全新…`、`🌊 每 30 秒…`、`🎲 每波…`、`🩸 血潮…`、`⚖️ 祝福/詛咒…`、`🔥 連殺…`、`🏆 死鬥…`、`✨ 另外…`。整份 changelog 是 emoji 清單。

### 動態
29. **`animate-ping` 呼吸點** — 在線人數處（ping + 綠點）。數字本身即時，光暈是裝飾。
30. **彈簧 hover** — `transition: transform .18s cubic-bezier(0, 1.65, 1, 1.65)` + `hover: scale(1.04)`，按鈕會「彈」。
31. **`hover:scale` / `active:scale` 全站通用** — 卡片、模式卡、返回鈕、購買鈕、發送鈕、關卡鈕皆 `active:scale-95`；模式卡 `hover:scale(1.03)`。
32. **22 個漂浮多邊形無限循環** — `background-polygons.vue` 隨機形狀隨機顏色 14–34 秒循環漂移，且每次載入隨機重排。純裝飾 filler，承載不了任何資訊，還造成每幀重繪。
33. **動畫寬度** — 血條/經驗條用 `transition-[width] duration-100`，動畫 width 會卡。

### 視覺
34. **Hero 沒有任何真實視覺** — 沒有產品預覽、沒有場景、沒有實機畫面，只有漂浮色塊。首屏唯一「漂亮的主體」不存在。
35. **模板測試** — 把「殭屍大逃殺」四字換成任何一款 3D 放置遊戲，現有畫面一點都不會破綻。

### 模板回退徵兆（改完要盯的）
- 純灰 #161616 + Inter + 白色文字 + 一顆舊品牌色按鈕 —— 世界是末日廢墟，不是這個。
- 首頁改完若變成「文字 + 一顆按鈕 + 下面一排卡片」，就是掉進模板。

## 3. 結論

**重度 slop，走完整九個 pass，不是打磨模式。**

問題不在某一頁漂亮不漂亮，而在**同一套 slop 語彙被寫進了 19 個 component**：`backdrop-blur` + `bg-black/40` + `rounded-full` + `font-black` + emoji。修一個頁面，其他頁面會把它拉回去。

因此建議的方向是：**先建立一套真正的設計系統（中性階梯 + 單一 accent + 一套線性圖示 + 數字階梯），再逐頁套用**，而不是逐頁微調。

## 4. 附錄：本次產物

| 檔案 | 內容 |
|---|---|
| `unslop/AUDIT.md` | 本報告 |
| `unslop/DIRECTION.md` | 五行方向（待小關確認） |
| `unslop/original.html` | 線上首頁快照（DOM＋內嵌樣式） |
| `unslop/original.live.png` | 線上首頁 live 截圖 |
| `unslop/gameplay-1~3.png` | 實機遊戲畫面（hero 視覺素材） |
| `unslop/shoot-game.mjs` | Playwright 截圖腳本（可重跑） |
