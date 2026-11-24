#!/bin/bash
# ★ 殭屍大逃殺 → Cloudflare Pages 一鍵部署
#
# 用法：./deploy-pages.sh
#
# 為什麼需要這支腳本：
#   GitHub repo (craig7351/zombie-survivors) 目前沒有本機可用的 push 權限，
#   所以 Cloudflare 的 Git 整合自動部署暫時接不上。改用 wrangler 直接部署，
#   完全不需要 GitHub 權限，效果一樣。
#
# 前提：本機已完成 `npx wrangler login`（Cloudflare OAuth token 已存在）
#       憑證位置：~/Library/Preferences/.wrangler/config/default.toml

set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

PROJECT="animal-survivors"
BRANCH="main"

echo "▶ 檢查 Cloudflare 登入狀態..."
if ! npx wrangler whoami 2>&1 | grep -q "You are logged in"; then
  echo "✗ 未登入 Cloudflare。請先執行：npx wrangler login" >&2
  exit 1
fi

echo "▶ 建置前端（vue-tsc 型別檢查 + vite build）..."
npm run build

echo "▶ 部署到 Cloudflare Pages（專案：$PROJECT，branch：$BRANCH）..."
npx wrangler pages deploy dist --project-name "$PROJECT" --branch "$BRANCH"

echo ""
echo "✓ 部署完成"
echo "  線上網址：https://$PROJECT-9r7.pages.dev/"
echo ""
echo "  ⚠ 提醒：wrangler.jsonc 的 database_id 必須對應目前 Cloudflare 帳號"
echo "     底下的 animal-survivors-db，否則 D1 會寫不進去。"
