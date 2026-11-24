# 殭屍大逃殺 — 維運手冊（Operations Runbook）

> 這份是**維運／交接**文件，給維護這個站台的人看。
> 遊戲玩法、角色、武器設計請看上游作者的 [`README.md`](README.md)；後端 API 細節看 [`BACKEND.md`](BACKEND.md)。
> 維運人：喬倩（小喬）／網站經營管理線。

---

## 1. 線上正式站

| 項目 | 值 |
|---|---|
| **正式網址** | **https://animal-survivors-9r7.pages.dev/** |
| API 範例 | `https://animal-survivors-9r7.pages.dev/api/stats` |
| Cloudflare 帳號 | `kuan20200323@gmail.com`（Account ID `55ce8e50e76da05eb503c76099861dcf`） |
| Pages 專案 | `animal-survivors`（**Direct Upload** 模式，`source: null`） |
| D1 資料庫 | `animal-survivors-db`，ID `63f5c8dc-a526-4610-89e5-a6493046a563` |
| 本機路徑 | `~/.openclaw/workspace/chiaqian/zombie-survivors` |
| 憑證 | `~/Library/Preferences/.wrangler/config/default.toml`（OAuth token，**repo 外**） |

### 上游與 fork

| remote | 網址 | 權限 |
|---|---|---|
| `origin` | `https://github.com/craig7351/zombie-survivors.git` | **無 push 權限**（上游開發者所有） |
| `fork` | `https://github.com/kuan20200323-lgtm/zombie-survivors.git` | 有 push 權限 ✅ |

- **不要改 `origin`**，要推就推 `fork`。
- 已開 **PR #1**：https://github.com/craig7351/zombie-survivors/pull/1
  —— 維持 **OPEN** 作為成果通知。**只有上游 owner `craig7351` 能 merge**，
  輔哥的 GitHub 身分 `kuan20200323-lgtm` 權限是 `{"pull":true,"push":false,"admin":false}`，**不要讓輔哥去找一條走不通的合併路徑**。

---

## 2. 部署（唯一入口）

```bash
cd ~/.openclaw/workspace/chiaqian/zombie-survivors

./auto-deploy.sh          # 冪等：HEAD 與線上一致就跳過（約 3 秒）
./auto-deploy.sh --force  # 不管有沒有變更都重新部署
```

### 為什麼要單一入口

原本另有 `deploy-pages.sh`（無冪等判斷、每次都建置部署），功能已被 `auto-deploy.sh` 完全涵蓋（`--force` 即強制部署），
已於 commit `53a57fc` 移除 —— **避免兩套部署邏輯分歧**。

### 冪等判斷

本專案是 Cloudflare Pages **Direct Upload** 模式，但 `wrangler pages deployment list --json` **會回 commit Source**
（與「夢迴三國工作坊」不同 —— 那個專案的 Source 是空字串，所以那邊改用內容指紋）。

```
本機 HEAD = 9625542
線上 Production Source = 9625542   → 一致，跳過
```

### 三道防護

1. **冪等判斷** —— HEAD 與線上一致就跳過，不浪費建置與 API 額度。
2. **wrangler 解析後援** —— 絕對路徑 → `npx --no-install` → `npx wrangler`（自動補下載）。
   本機 wrangler 裝在 `~/.hermes/node/bin/`，**不在 PATH 內**；若該 node 環境被重裝，
   `npx --no-install` 會直接失敗、讓排程靜默死掉，所以保留最後一階自我修復。
3. **未 commit 改動警告** —— 預設只部署已 commit 的內容，避免半成品被自動推上正式站；
   想立刻上線當下未 commit 的內容，用 `--force`。

### 驗收

```bash
curl -s -o /dev/null -w "%{http_code} %{content_type}\n" https://animal-survivors-9r7.pages.dev/
# 200 text/html
curl -s -o /dev/null -w "%{http_code} %{content_type}\n" https://animal-survivors-9r7.pages.dev/api/stats
# 200 application/json; charset=utf-8
```

★ **必須看 `content-type`**：Pages 的 SPA fallback 會讓不存在的路徑也回 **200 + text/html**。
「回 200」不能證明端點存在。

---

## 3. 自動部署排程

| 項目 | 值 |
|---|---|
| 名稱 | `殭屍大逃殺自動部署` |
| jobId | `a22bbe81-306f-4f85-b4e3-565cd0a2e0e4` |
| 頻率 | 每 15 分鐘 |
| agentId | `chiaqian` |
| payload | `command` 型（`sh -lc "<script>"`）—— 比 agentTurn 快、不會逾時 |
| delivery | `none`（不擾動聊天） |

無變更時約 **3.3 秒**結束；有變更時完整 build 約 **60 秒**。

**查執行狀態**（不要只看排程列表，要看 `cron_jobs` 的 state）：

```bash
python3 -c "
import sqlite3,json
con=sqlite3.connect('file:/Users/wenfu/.openclaw/state/openclaw.sqlite?mode=ro',uri=True)
cur=con.cursor()
cur.execute(\"SELECT name,job_id,enabled,job_json,state_json FROM cron_jobs WHERE name LIKE '%殭屍%'\")
for r in cur.fetchall():
    st=json.loads(r[4])
    print(r[0], r[1][:8], 'enabled=',r[3], 'status=',st.get('lastRunStatus'), 'errs=',st.get('consecutiveErrors'))
    print(st.get('lastDiagnosticSummary','')[:400])
"
```

---

## 4. 本機示範（選用，非正式）

```bash
cd ~/.openclaw/workspace/chiaqian/zombie-survivors
./serve-local-tunnel.sh
```

啟動後本機在 `http://127.0.0.1:8788`，並開啟 Cloudflare 快速隧道（網址隨機、行程結束即失效）。

⚠️ **正式分享請用 `animal-survivors-9r7.pages.dev`** —— 快速隧道網址不固定、重開機就沒了。

★ 這支腳本目前**未做憑證隔離**（會繼承 OpenClaw supervisor 注入的環境變數）。
憑證只在 environ、不在 argv，屬 Unix 常態、優先級不高；但若要收斂，
做法與「夢迴三國工作坊」的 `serve.sh` 相同：用 `env -i` 只帶 `HOME`／`PATH`／`TMPDIR` 等必要變數啟動。

---

## 5. D1 後端

```bash
# 套 schema（首次／變更時）
npx wrangler d1 execute animal-survivors-db --file=./schema.sql --remote

# 實查有哪些表（★ 別看 wrangler d1 list 的 num_tables 欄位，那不回報，一直顯示 0）
npx wrangler d1 execute animal-survivors-db --remote \
  --command "SELECT name FROM sqlite_master WHERE type='table';"
```

表：`runs`（排行榜）、`stats`（累計統計）、`presence`（在線）、`messages`（留言），
另有歷史圖表與在線人數相關表。完整 API 見 [`BACKEND.md`](BACKEND.md)。

★ `database_id` 是**資源識別碼，不是憑據**，可安全進版控。
★ Cloudflare OAuth token 在 `~/Library/Preferences/.wrangler/config/default.toml`，**絕不進 repo**。

---

## 6. 版控與異地備份

```bash
git log --oneline
git status                    # 應為乾淨
git rev-list --left-right --count fork/main...main   # 應為 0  0
```

| 項目 | 狀態 |
|---|---|
| 本機 repo | `~/.openclaw/workspace/chiaqian/zombie-survivors`（獨立 repo） |
| 异地備份 | `fork` remote → `kuan20200323-lgtm/zombie-survivors` ✅ |
| 上游 | `origin` remote → `craig7351/zombie-survivors`（**只讀**） |

---

## 7. 已知限制

1. **無法自動合併到上游** —— PR #1 只能由 owner `craig7351` 合併。維持 OPEN 當成果通知即可。
2. **Pages 是 Direct Upload** —— 專案 `source: null`，**接不了 GitHub 自動部署**。
   試著 PATCH `source` 會回 `code 8000069`。部署只能靠本機 `auto-deploy.sh`。
3. **本機 wrangler 不在 PATH** —— 依賴 `~/.hermes/node/bin/`；該 node 環境重裝會讓 `npx --no-install` 失效（已有後援）。
4. **`wrangler d1 list` 的 `num_tables` 不可信** —— 永遠顯示 0，要用 `d1 execute --remote --command "SELECT ..."` 實查。
5. **SPA fallback 假象** —— 任意不存在的路徑都回 200 + HTML，驗收 API 要看 `content-type`。

---

## 8. 相關站台

| 站台 | 網址 | 說明 |
|---|---|---|
| 殭屍大逃殺 | https://animal-survivors-9r7.pages.dev/ | 本文件涵蓋 |
| 夢迴三國工作坊 | https://menghuo-workshop.pages.dev/ | 另一條線，見該專案自己的 README |

兩條線共用同一組 Cloudflare 憑證與同一個帳號。
