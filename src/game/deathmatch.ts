/**
 * 死鬥模式（無盡波數）參數與計分。
 * 沿用現有難度當「起始強度」，之後依波數無限往上爬；沒有破關，死亡才結束。
 */
export const DEATHMATCH = {
  /** 每幾秒一波 */
  waveSec: 30,
  /** 每幾波插入一隻王（Boss Rush） */
  bossEveryWaves: 5,
  /** 每波累加的血量倍率（wave N 額外 +N×此值） */
  hpPerWave: 0.3,
  /** 每波累加的速度倍率 */
  speedPerWave: 0.045,
  /** 每波累加的接觸傷害倍率 */
  contactPerWave: 0.08,
  /** 密度爬升：每波目標怪數 +此值（直到怪池上限） */
  countPerWave: 4,
  /** 第幾波後成長轉陡（逼出自然終點，排行榜才有區別度） */
  steepAfterWave: 20,
  /** 轉陡後的額外倍率係數 */
  steepFactor: 0.5,
  /** 死鬥通關波數：撐過此波數即勝利結算 */
  clearWave: 100,
  /** 死鬥等級上限：戰力封頂，怪物無限變強 → 保證 run 會結束、不會無敵 */
  levelCap: 60,
} as const;

/** 每波突變子（隨機掛一個全場效果，效果於 game.ts 套用） */
export interface Mutator {
  id: 'rage' | 'frail' | 'giant' | 'explode' | 'split' | 'elite' | 'crawl';
  name: string;
  /** lucide 圖示 key（見 ui/icons.ts） */
  icon: string;
  desc: string;
}
export const MUTATORS: Mutator[] = [
  { id: 'rage', name: '狂暴', icon: 'rage', desc: '怪物移動更快' },
  { id: 'frail', name: '脆皮潮', icon: 'frail', desc: '怪物血薄但數量更多' },
  { id: 'giant', name: '巨人化', icon: 'giant', desc: '怪物變大變壯' },
  { id: 'explode', name: '爆裂', icon: 'explodeMutant', desc: '怪物死亡會在原地小爆炸' },
  { id: 'split', name: '分裂潮', icon: 'split', desc: '怪物變多，死掉在原地補上' },
  { id: 'elite', name: '菁英潮', icon: 'elite', desc: '大量菁英怪出沒' },
  { id: 'crawl', name: '爬行潮', icon: 'crawl', desc: '全部殭屍趴地爬行（慢但難察覺）' },
];

/** 死鬥分數：波數主導，擊殺與存活當細分 */
export function deathmatchScore(wave: number, kills: number, time: number): number {
  return wave * 1000 + kills + Math.floor(time);
}

/** 依波數計算「死鬥額外」血量倍率（含轉陡） */
export function dmHpMul(wave: number): number {
  const base = 1 + wave * DEATHMATCH.hpPerWave;
  const steep = wave > DEATHMATCH.steepAfterWave ? (wave - DEATHMATCH.steepAfterWave) * DEATHMATCH.steepFactor : 0;
  return base + steep;
}
export function dmSpeedMul(wave: number): number {
  return 1 + wave * DEATHMATCH.speedPerWave;
}
export function dmContactMul(wave: number): number {
  const base = 1 + wave * DEATHMATCH.contactPerWave;
  /** 第 20 波後致命性陡升，讓再肥的 build 最終也壓不住（解「站著不動不會死」） */
  const steep = wave > DEATHMATCH.steepAfterWave ? (wave - DEATHMATCH.steepAfterWave) * 0.15 : 0;
  return base + steep;
}
