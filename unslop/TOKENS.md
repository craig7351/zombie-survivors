# 殭屍大逃殺 — 設計系統 Token 表（定死版）

> 依 unslop 規範：**色彩／字級／間距／圓角四類一次定死**，不准「先改一頁看看」再回頭調。
> 方向見 `DIRECTION.md`；稽核見 `AUDIT.md`。
> unslop by Damir Sokolovsky ([@heydamir](https://x.com/heydamir)), CC BY 4.0.

實作位置：`src/style.css`（Tailwind v4 `@theme`，變數即 token）、`src/ui/icons.ts`（圖示登錄表）。

---

## 1. 色彩

### 1.1 中性階梯（廢墟灰，暖偏綠的土色，非純灰）

| Token | 值 | 用途 |
|---|---|---|
| `--color-void` | `#0a0c09` | 頁面底（最深） |
| `--color-surface-1` | `#12150f` | 面板、卡片底 |
| `--color-surface-2` | `#191d16` | 卡片、列舉列 |
| `--color-surface-3` | `#22271e` | hover / 選取列 |
| `--color-surface-4` | `#2c3227` | 選取列、按下態 |
| `--color-hairline` | `rgba(236,239,230,0.09)` | 髮絲線、邊框 |
| `--color-hairline-strong` | `rgba(236,239,230,0.16)` | 強調邊框 |

### 1.2 文字角色（三階，不多不少）

| Token | 值 | 用途 |
|---|---|---|
| `--color-text-primary` | `#ecefe6` | 標題、數值、主要訊息 |
| `--color-text-secondary` | `#a3a89b` | 說明、次要標籤 |
| `--color-text-muted` | `#6f7466` | 輔助說明、單位、停用態 |

### 1.3 Accent（**全站只此一個主色**）

| Token | 值 | 用途 |
|---|---|---|
| `--color-accent` | `#ff7a1a` | 警戒橙：主 CTA、選取態、強調數字 |

語意色（低調，只用於狀態，不當主色）：

| Token | 值 | 用途 |
|---|---|---|
| `--color-danger` | `#e5484d` | 血條、王、死亡 |
| `--color-success` | `#4cc38a` | 經驗、恢復、正向 |
| `--color-caution` | `#f0c419` | 等級、警示條紋的第二色 |

### 1.4 禁用清單（不得再出現）

- ❌ `backdrop-blur`（玻璃卡片）—— 全站 0 處（實測：改前 48 處 → 改後 0 處，含 style 區塊的 `backdrop-filter` 寫法 2 處 → 0）
- ❌ 漸層文字、漸層底、漸層按鈕
  ★ **（★ 唯一例外：★ Signature 與背景藝術。★ 全站僅 3 處 —— `.warn-stripe` 的 `repeating-linear-gradient`、★ `background-polygons.vue` 的天空 `linear-gradient` 與壓暗 `radial-gradient`。★ 规则是「★ UI 容器與卡片不得用漸層製造假深度」，★ ★ 不是「漸層一律禁止」。★ 稽核口徑見 `BEFORE-AFTER.md` §1.0.5。）**
- ❌ 彩色 glow / drop-shadow / 彩色陰影
- ❌ 徑向色彩洗場、模糊色塊
- ❌ 多於一個 accent 同時當主色
- ❌ 純白 `#fff` 大面積文字（用 text-primary）

---

## 2. 字體與字級

### 2.1 字級階梯（固定 8 級）

| Token | 值 | 用途 |
|---|---|---|
| `--text-2xs` | 11px / 1.45 | 極小註記（版本號、單位） |
| `--text-xs` | 12px / 1.5 | 標籤、輔助 |
| `--text-sm` | 13px / 1.55 | 內文、說明 |
| `--text-base` | 14px / 1.6 | 內文主力 |
| `--text-lg` | 16px / 1.5 | 小標題 |
| `--text-xl` | 20px / 1.4 | 區塊標題 |
| `--text-2xl` | 28px / 1.25 | 頁面標題 |
| `--text-hero` | 56px / 1.05 | 首頁主標（行動裝置 36px） |

字距：≥16px 一律 `0`；56px 可 `-0.02em`；11–13px 一律 `0` 或 `0.01em`（**禁止負字距**）。

### 2.2 字重

| Token | 值 | 用途 |
|---|---|---|
| `--fw-regular` | 400 | 內文 |
| `--fw-medium` | 500 | 標籤、按鈕、數值 |
| `--fw-semibold` | 600 | 僅限極少數強調（主標、數字） |

❌ 禁止 700 / 800 / 900。階層靠**大小＋顏色**，不靠字重。

### 2.3 字族

- 介面：`"PingFang TC", "Noto Sans TC", "Microsoft JhengHei", system-ui, sans-serif`
- 數字：`font-variant-numeric: tabular-nums`（**全站統一**，禁止一處 `12,345` 一處 `12345.6`）
- 禁止：斜體、emoji 當字形

---

## 3. 間距

4px 基底，**只用這 8 級**：

`4 · 8 · 12 · 16 · 24 · 32 · 48`（Tailwind: `1 2 3 4 6 8 12`）

| 場景 | 值 |
|---|---|
| 控制內部 | 4–12 |
| 同群項目之間 | 8 |
| 群組之間（標籤↔清單、兩卡之間） | 16–24 |
| 區塊之間 | 32–48 |
| 頁面邊距 | 24（桌機 32） |

❌ 禁止 1.5 / 2.5 / 5 / 7 / 10 等非階梯值；禁止 `gap-6` 與 `gap-5` 混用。

---

## 4. 圓角（按尺寸分級，巢狀半徑 = 外半徑 − padding）

| 元素 | 半徑 | Token |
|---|---|---|
| 小標籤、keycap | 4 | `rounded` |
| 按鈕、輸入框、列 | 8 | `rounded-lg` |
| 卡片 | 12 | `rounded-xl` |
| 面板、視窗 | 16 | `rounded-2xl` |

❌ 禁止 `rounded-full` 用於**容器**（按鈕、卡片、徽章、輸入框）。

**合法例外只有三種**（都是「圓形圖形」而非矩形容器）：

| 例外 | 規則 | 位置 |
|---|---|---|
| 進度條（槽 + 填充） | 槽與填充同為 `rounded-full`，高度 ≤ 12px，填充色為語意色 | HUD 血條、經驗條、王血條 |
| 在線狀態點 | 直徑 8px，靜態（不做呼吸動態） | 首頁「N 人正在遊玩」 |
| 圓形操控元件 | 本身就是圓形外觀，無矩形替代 | 手機搖桿底盤（`joystick.vue`）、手機跳躍鈕（`game-view.vue`） |

除此之外任何 `rounded-full` 都算違規。

> 驗收基準：全站 `rounded-full` **容器型 = 0**。
>
> 實測：**原始碼 8 處 / 渲染後 DOM 6 處**，全部落在上表三種例外內 ——
> HUD 血條槽＋填充（2）、HUD 經驗條槽＋填充（2）、手機搖桿底盤（1）、手機跳躍鈕（1）＝ DOM 6 處；
> 另王血條外框＋槽（2）＝ 原始碼 8 處，因 `v-if="stats.bossActive"` 平時不渲染。
>
> 驗收腳本：`unslop/audit-dom.mjs`（走訪 10 個畫面、逐元素讀 class token 精確比對、全域去重）。

---

## 5. 圖示

- 套件：**lucide-vue-next**（單一套、全站一致）
- 尺寸：**18px**（清單與標籤）；20px（按鈕內）；14px（密集列）
- 線寬：**1.5**
- 顏色：預設 `text-secondary`；在 active 狀態用 `text-accent`
- 間距：圖示與文字間距 **8px**（`gap-2`）
- **全站 emoji = 0**（含資料層 `changelog.ts`、`difficulty.ts`、`game.ts`、`meta.ts`、`upgrades.ts`、`characters.ts`、`deathmatch.ts`）
- 角色／升級辨識度靠：**顏色標記 + lucide 圖示 + 名稱文字**三者

登錄表：`src/ui/icons.ts`

---

## 6. Signature：4px 警戒條紋

全站**只此一處**個性記號，黑黃斜紋（工地圍條感）：

```css
background-image: repeating-linear-gradient(
  45deg,
  var(--color-caution) 0 8px,
  #16191a 8px 16px
);
```

用法（僅 3 處）：
1. 王血條**上緣** 4px
2. 破關／升級面板標題左側 4px 豎條
3. 首頁 hero 圖框的**左緣** 4px

高度固定 4px。不當裝飾、不加在其他地方。

---

## 7. 動態

- 唯一曲線：`cubic-bezier(0.22, 1, 0.36, 1)`
- 時長：hover/press 120–180ms；進場 300–400ms；stagger 40–60ms（最多 6 項）
- 只動 `transform` / `opacity` / `color` / `background` / `border`
- ❌ 禁止：`animate-ping`、彈簧 overshoot、動畫 width/height/top/left、無限循環裝飾動畫、`hover:scale` 於卡片
- 按下：`scale(0.97)`；hover：顏色或表面階梯變化（不縮放）

---

## 8. 深度

深色主題用**表面階梯 + 髮絲線**，不用陰影：

- 卡片：`bg-surface-1` + `border border-hairline`
- 浮層（modal）：`bg-surface-2` + `border border-hairline-strong` + `shadow-[0_8px_24px_rgba(0,0,0,0.45)]`（唯一允許的陰影，只給浮層）
- 內嵌條（血條槽）：`bg-surface-4`

---

_本 token 表為 unslop 流程的產出，隨 `AUDIT.md`、`DIRECTION.md`、`BEFORE-AFTER.md` 一併保留。_
