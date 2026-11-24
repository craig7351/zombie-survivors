#!/bin/bash
# 殭屍大逃殺 — 自動部署守衛
#
# 用途：定時檢查本機 HEAD 是否與 Cloudflare Pages 最新部署的 commit 相同；
#       不同才重新建置 + 部署。相同則直接結束，不浪費建置。
#
# 為什麼需要這支：GitHub repo (craig7351/zombie-survivors) 沒有本機可用 push 權限，
#   Cloudflare 的 Git 整合自動部署接不上。改用本機 wrangler 直接部署。
#
# 憑證：~/Library/Preferences/.wrangler/config/default.toml (Cloudflare OAuth token)
#
# 用法：./auto-deploy.sh          檢查並在需要時部署（冪等，無變更則跳過）
#        ./auto-deploy.sh --force  不管 HEAD 是否相同都重新部署
#
# ★ 本支是本專案「唯一的部署入口」。
#   原本另有 deploy-pages.sh（無冪等判斷、每次都建置部署），功能已被本支完全涵蓋
#   （--force 即為強制部署），已移除，避免兩套邏輯分歧。

set -uo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

PROJECT="animal-survivors"
BRANCH="main"
FORCE="${1:-}"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

# 解析 wrangler 執行方式。
# 本機 wrangler 目前裝在 ~/.hermes/node/lib/node_modules/（非本專案 node_modules，
# 且不在 PATH 內），靠 npx 的全域 bin 探查解析得到。
# 若該 node 環境被重裝/升級而 wrangler 不在，npx --no-install 會直接失敗、
# 整支部署排程就此死掉。因此保留 npx wrangler 作為後援，讓 npx 自動補下載。
if npx --no-install wrangler --version >/dev/null 2>&1; then
  WRANGLER="npx --no-install wrangler"
else
  WRANGLER="npx wrangler"
  log "⚠ 本機 wrangler 不可用，改用 npx wrangler（首次會自動下載，耗時較久）。"
fi
wrangler() { $WRANGLER "$@"; }

log "▶ 檢查 Cloudflare 登入狀態..."
if ! wrangler whoami 2>&1 | grep -q "You are logged in"; then
  log "✗ 未登入 Cloudflare。請執行：npx wrangler login"
  exit 1
fi

HEAD_SHA=$(git rev-parse --short HEAD)
log "▶ 本機 HEAD = $HEAD_SHA"

# 取 Cloudflare 最新 production 部署對應的 commit
DEPLOYED_SHA=$(wrangler pages deployment list \
  --project-name "$PROJECT" --json 2>/dev/null \
  | python3 -c "
import sys, json
try:
    rows = json.load(sys.stdin)
except Exception:
    sys.exit(0)
prod = [r for r in rows if r.get('Environment') == 'Production']
if prod:
    print(prod[0].get('Source',''))
" 2>/dev/null)

log "▶ 線上最新部署 commit = ${DEPLOYED_SHA:-<查無>}"

# 未 commit 的改動不會自動上線（避免半成品被自動推到正式站）。
# 若有未 commit 改動就提醒；想立刻上線請手動跑 deploy-pages.sh。
if [ -n "$(git status --porcelain -- src public functions index.html package.json vite.config.ts wrangler.jsonc 2>/dev/null | head -1)" ]; then
  log "⚠ 工作區有未 commit 的改動，本次自動部署只含已 commit 的內容。"
  log "  想把當下未 commit 的改動立即上線，請手動執行：./auto-deploy.sh --force"
fi

if [ "$FORCE" != "--force" ] && [ -n "$DEPLOYED_SHA" ] && [ "$DEPLOYED_SHA" = "$HEAD_SHA" ]; then
  log "✓ HEAD 與線上一致（$HEAD_SHA），無需部署。"
  exit 0
fi

if [ -z "$DEPLOYED_SHA" ]; then
  log "⚠ 查不到線上部署 commit，改為直接部署以確保線上有東西。"
fi

log "▶ 建置前端（vue-tsc 型別檢查 + vite build）..."
if ! npm run build; then
  log "✗ 建置失敗，中止部署（線上維持原狀）。"
  exit 1
fi

log "▶ 部署到 Cloudflare Pages（專案：$PROJECT，branch：$BRANCH）..."
wrangler pages deploy dist --project-name "$PROJECT" --branch "$BRANCH" --commit-dirty=true

log "✓ 部署完成：https://$PROJECT-9r7.pages.dev/"
