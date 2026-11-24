#!/bin/bash
# ★ 本機架站 → 對外開放 一鍵啟動
# ★ 殭屍大逃殺：wrangler pages dev（含 Pages Functions + 本機 D1）＋ Cloudflare Tunnel
#
# 用法：./serve-local-tunnel.sh
# 停止：Ctrl+C（或 kill 掉 wrangler / cloudflared 行程）
#
# ★ 憑證隔離（重要）
#   本腳本若直接以繼承的環境啟動子行程，OpenClaw supervisor 注入的受管憑證
#   （DEEPSEEK_API_KEY / MINIMAX_API_KEY / NVIDIA_NIM_API_KEY /
#   TWINKLE_HUB_BEARER / UUMIT_USER_ID / UUMIT_API_KEY …）會一併進到
#   wrangler、cloudflared 的行程 environ 裡，等同把金鑰攤在同機每個行程都讀得到。
#
#   這裡改用 `env -i` 起乾淨環境，只帶真正需要的少數變數：
#     - HOME：wrangler 從 ~/Library/Preferences/.wrangler/config/default.toml 讀 OAuth token
#     - PATH：找 node / pnpm / npx / cloudflared
#     - TMPDIR / USER / SHELL / LANG：讓 node 與 wrangler 正常運作
#   受管憑證一律不傳進去，留在 OpenClaw 自己的行程裡。
#
#   注意：憑證在 environ、不在 argv —— 這是 Unix 常態（同使用者行程讀得到彼此 environ），
#   不是「跑在指令列被 ps 看到」。但常駐且對外服務的行程仍值得收斂。
#   驗收時務必先做正向對照校準（見 OPERATIONS.md §4）。

set -euo pipefail
cd "$(dirname "$0")"

PORT="${PORT:-8788}"
TUNNEL_PORT="${TUNNEL_PORT:-8788}"

echo "▸ 檢查依賴…"
for c in node pnpm npx cloudflared; do
  command -v "$c" >/dev/null || { echo "✗ 缺少 $c，請先安裝（brew install cloudflared / npm i -g pnpm）"; exit 1; }
done

# ── 乾淨環境基底 ──────────────────────────────────────────────
CLEAN_HOME="$HOME"
CLEAN_PATH="/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:/Users/wenfu/.local/bin"
CLEAN_PATH="$CLEAN_PATH:$(dirname "$(command -v node)")"
# wrangler 若不在 PATH，改用絕對路徑（避免 npx 下載新版）
if [ -x /Users/wenfu/.hermes/node/bin/wrangler ]; then
  WRANGLER_BIN=/Users/wenfu/.hermes/node/bin/wrangler
else
  WRANGLER_BIN="$(command -v wrangler || true)"
fi
[ -n "$WRANGLER_BIN" ] || WRANGLER_BIN="npx wrangler"

# 只放行這些變數進子行程（其餘一律隔絕）
clean_env() {
  env -i \
    HOME="$CLEAN_HOME" \
    PATH="$CLEAN_PATH" \
    TMPDIR="${TMPDIR:-/tmp}" \
    USER="${USER:-wenfu}" \
    SHELL="/bin/bash" \
    LANG="${LANG:-zh_TW.UTF-8}" \
    CI="1" \
    "$@"
}

echo "▸ 建置前端（vue-tsc 型檢 + vite build）…"
pnpm install --frozen-lockfile
pnpm exec vite build

echo "▸ 啟動 wrangler pages dev（:${PORT}，含 Functions + 本機 D1，乾淨 env）…"
clean_env "$WRANGLER_BIN" pages dev dist --port "${PORT}" --ip 127.0.0.1 &
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
clean_env cloudflared tunnel --url "http://127.0.0.1:${TUNNEL_PORT}" --no-autoupdate
