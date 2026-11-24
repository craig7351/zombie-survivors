/**
 * 更新紀錄（release notes）。最新一筆顯示於首頁「更新紀錄」彈窗。
 * 玩家看過一次後不再跳出；當 LATEST_VERSION 改變（= 發新版）才會再次跳出。
 * 發版：在陣列最前面新增一筆即可（version 要改動）。
 */
export interface Release {
  version: string;
  title: string;
  items: string[];
}

export const CHANGELOG: Release[] = [
  {
    version: 'v2.0',
    title: '死鬥模式登場',
    items: [
      '全新「死鬥模式」：無盡波數，怪物越來越強，撐到死為止，比誰能撐到最高波',
      '每 30 秒一波；每 5 波插入一隻王（Boss Rush）',
      '每波隨機「突變子」：狂暴、脆皮潮、巨人化、爆裂、分裂潮、菁英潮、爬行潮',
      '血潮狂暴時段、祝福/詛咒二選一、連殺 Combo 加成、升級不設上限',
      '死鬥獨立排行榜（比波數分數），與劇情榜分開',
      '另外：新增爬行殭屍、怪群動作更多樣、首頁線上人數圖表、模型壓縮載入更快',
    ],
  },
];

/** 目前最新版本（同時供首頁版本徽章與彈窗判斷使用） */
export const LATEST_VERSION = CHANGELOG[0].version;
