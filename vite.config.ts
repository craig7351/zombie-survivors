import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  // ★ 本機網站要經 Cloudflare Tunnel 對外開放時，Host 標頭會是外部網域
  //   （如 *.trycloudflare.com 或自訂網域），Vite 6 預設會擋下 → 403。
  //   這裡放行 dev 與 preview 兩者，否則隧道通了也開不出頁面。
  server: {
    allowedHosts: true,
  },
  preview: {
    allowedHosts: true,
  },
});
