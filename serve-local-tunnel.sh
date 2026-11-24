#!/bin/bash
# ★ 本機架站 → 對外開放 一鍵啟動
# ★ 殭屍大逃殺：wrangler pages dev（含 Pages Functions + 本機 D1）＋ Cloudflare Tunnel
#
# 用法：./serve-local-tunnel.sh
# 停止：Ctrl+C（或 kill 掉 wrangler / cloudflared 行程）

set -euo pipefail
cd "$(dirname "$0")"

PORT="${PORT:-8788}"
TUNNEL_PORT="${TUNNEL_PORT:-8788}"

echo "▸ 檢查依賴…"
for c in node pnpm npx cloudflared; do
  command -v "$c" >/dev/null || { echo "✗ 缺少 $c，請先安裝（brew install cloudflared / npm i -g pnpm）"; exit 1; }
done

echo "▸ 建置前端（vue-tsc 型檢 + vite build）…"
pnpm install --frozen-lockfile
pnpm exec vite build

echo "▸ 啟動 wrangler pages dev（:${PORT}，含 Functions + 本機 D1）…"
npx wrangler pages dev dist --port "${PORT}" --ip 127.0.0.1 &
PAGES_PID=$!
trap 'kill $PAGES_PID 2>/dev/null || true' EXIT

# 等本機服務就緒
for i in $(seq 1 30); do
  if curl -sf -o /dev/null "http://127.0.0.1:${PORT}/"; then break; fi
  sleep 1
done
curl -sf -o /dev/null "http://127.0.0.1:${PORT}/" || { echo "✗ pages dev 沒起來"; exit 1; }
echo "✓ 本機就緒 http://127.0.0.1:${PORT}"

echo "▸ 開啟 Cloudflare 快速隧道（對外網址）…"
echo "★ 網址在下方；程序關掉後網址即失效。"
cloudflared tunnel --url "http://127.0.0.1:${TUNNEL_PORT}" --no-autoupdate
