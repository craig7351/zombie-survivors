import { CONFIG } from './config';

/** 一輪遊戲的可變數值（會被升級修改） */
export interface RunState {
  // 玩家
  moveSpeed: number;
  maxHp: number;
  /** 跳躍初速（越高跳越高、滯空越久） */
  jumpStrength: number;
  /** 經驗吸取範圍 */
  pickupRadius: number;
  xpMultiplier: number;
  // 武器
  damage: number;
  fireInterval: number;
  projectileCount: number;
  range: number;
  projectileSpeed: number;
  // 環繞衛星
  orbitalCount: number;
  orbitalDamage: number;
  orbitalRadius: number;
  orbitalSpeed: number;
  // 傷害光環
  auraRadius: number;
  auraDamage: number;
  // 連鎖閃電
  lightningCount: number;
  lightningDamage: number;
  // 新星爆
  novaRadius: number;
  novaDamage: number;
  // 回力鏢
  boomerangCount: number;
  boomerangDamage: number;
  // 群控
  enemySpeedMul: number; // 時緩：全場怪速倍率
  slowRadius: number; // 減速光環半徑（0=關）
  slowFactor: number; // 範圍內怪速倍率
  freezeChance: number; // 命中冰凍機率
  // 防禦／續航
  lifestealOnKill: number; // 擊殺回血
  hpRegen: number; // 每秒回血
  damageReduction: number; // 受傷減免（0~0.8）
  shieldInterval: number; // 護盾再生間隔秒（0=關）
  // 進攻修飾
  critChance: number;
  critMult: number;
  pierce: number; // 子彈穿透數
  explodeRadius: number; // 爆裂半徑（0=關）
  explodeDamage: number;
}

export function createRunState(): RunState {
  return {
    moveSpeed: CONFIG.player.speed,
    maxHp: CONFIG.player.maxHp,
    jumpStrength: CONFIG.player.jump.strength,
    pickupRadius: 5,
    xpMultiplier: 1,
    damage: CONFIG.weapon.damage,
    fireInterval: CONFIG.weapon.fireInterval,
    projectileCount: 1,
    range: CONFIG.weapon.range,
    projectileSpeed: CONFIG.weapon.projectileSpeed,
    orbitalCount: 0,
    orbitalDamage: 2,
    orbitalRadius: 4,
    orbitalSpeed: 2.4,
    auraRadius: 0,
    auraDamage: 1,
    lightningCount: 0,
    lightningDamage: 3,
    novaRadius: 0,
    novaDamage: 4,
    boomerangCount: 0,
    boomerangDamage: 4,
    enemySpeedMul: 1,
    slowRadius: 0,
    slowFactor: 0.5,
    freezeChance: 0,
    lifestealOnKill: 0,
    hpRegen: 0,
    damageReduction: 0,
    shieldInterval: 0,
    critChance: 0,
    critMult: 2,
    pierce: 0,
    explodeRadius: 0,
    explodeDamage: 3,
  };
}

export interface Upgrade {
  id: string;
  name: string;
  desc: string;
  /** lucide 圖示 key（見 ui/icons.ts） */
  icon: string;
  maxLevel: number;
  apply: (s: RunState) => void;
}

export const UPGRADES: Upgrade[] = [
  { id: 'damage', name: '攻擊力', desc: '武器傷害 +1', icon: 'damage', maxLevel: 8, apply: (s) => (s.damage += 1) },
  { id: 'firerate', name: '攻速', desc: '發射間隔 −12%', icon: 'fireRate', maxLevel: 8, apply: (s) => (s.fireInterval *= 0.88) },
  { id: 'multishot', name: '多重彈', desc: '投射物 +1', icon: 'multishot', maxLevel: 4, apply: (s) => (s.projectileCount += 1) },
  { id: 'range', name: '射程', desc: '鎖定範圍 +20%', icon: 'range', maxLevel: 5, apply: (s) => (s.range *= 1.2) },
  { id: 'projspeed', name: '彈速', desc: '投射物速度 +20%', icon: 'projectileSpeed', maxLevel: 5, apply: (s) => (s.projectileSpeed *= 1.2) },
  { id: 'movespeed', name: '移動速度', desc: '移速 +10%', icon: 'moveSpeed', maxLevel: 5, apply: (s) => (s.moveSpeed *= 1.1) },
  {
    id: 'jump',
    name: '跳躍強化',
    desc: '跳得更高、滯空更久（騰空可閃避接觸傷害）',
    icon: 'jump',
    maxLevel: 4,
    apply: (s) => (s.jumpStrength += 2),
  },
  { id: 'maxhp', name: '最大生命', desc: '生命上限 +20 並補滿', icon: 'maxHp', maxLevel: 5, apply: (s) => (s.maxHp += 20) },
  { id: 'magnet', name: '拾取範圍', desc: '經驗吸取範圍 +30%', icon: 'pickup', maxLevel: 5, apply: (s) => (s.pickupRadius *= 1.3) },
  { id: 'xpgain', name: '經驗加成', desc: '經驗獲得 +15%', icon: 'xpGain', maxLevel: 5, apply: (s) => (s.xpMultiplier *= 1.15) },
  {
    id: 'orbital',
    name: '環繞飛斧',
    desc: '召喚環繞身邊的旋轉斧頭，碰撞傷害敵人；已有則 +1 把並擴大環繞範圍',
    icon: 'orbital',
    maxLevel: 10,
    apply: (s) => {
      s.orbitalCount += 1;
      s.orbitalDamage += 1;
      s.orbitalRadius += 1.4;
    },
  },
  {
    id: 'aura',
    name: '傷害光環',
    desc: '展開持續傷害光環，自動灼燒靠近的敵人；已有則擴大並增傷',
    icon: 'aura',
    maxLevel: 10,
    apply: (s) => {
      s.auraRadius = s.auraRadius === 0 ? 4 : s.auraRadius + 1.6;
      s.auraDamage += 1;
    },
  },
  {
    id: 'lightning',
    name: '連鎖閃電',
    desc: '定期電擊最近的敵人並向周圍連鎖；已有則 +1 連鎖數並增傷',
    icon: 'lightning',
    maxLevel: 10,
    apply: (s) => {
      s.lightningCount += 1;
      s.lightningDamage += 1;
    },
  },
  {
    id: 'nova',
    name: '新星爆',
    desc: '定期釋放向外擴張的衝擊波，炸傷周圍所有敵人；已有則擴大並增傷',
    icon: 'nova',
    maxLevel: 10,
    apply: (s) => {
      s.novaRadius = s.novaRadius === 0 ? 6 : s.novaRadius + 1;
      s.novaDamage += 2;
    },
  },
  {
    id: 'boomerang',
    name: '回力鏢',
    desc: '定期丟出長矛飛出再飛回，沿途貫穿傷害敵人；已有則 +1 支並增傷',
    icon: 'boomerang',
    maxLevel: 10,
    apply: (s) => {
      s.boomerangCount += 1;
      s.boomerangDamage += 1;
    },
  },
  // ===== 群控 =====
  {
    id: 'slowfield',
    name: '減速光環',
    desc: '身邊一圈的殭屍移動變慢；已有則擴大範圍',
    icon: 'slowField',
    maxLevel: 5,
    apply: (s) => {
      s.slowRadius = s.slowRadius === 0 ? 7 : s.slowRadius + 1.5;
      s.slowFactor = Math.max(0.3, s.slowFactor - 0.05);
    },
  },
  {
    id: 'timeslow',
    name: '時緩',
    desc: '全場殭屍永久減速 8%',
    icon: 'timeSlow',
    maxLevel: 5,
    apply: (s) => (s.enemySpeedMul *= 0.92),
  },
  {
    id: 'freeze',
    name: '冰凍彈',
    desc: '子彈命中有機率短暫冰凍殭屍；已有則機率提升',
    icon: 'freeze',
    maxLevel: 5,
    apply: (s) => (s.freezeChance = Math.min(0.5, s.freezeChance + 0.08)),
  },
  // ===== 防禦／續航 =====
  {
    id: 'lifesteal',
    name: '吸血',
    desc: '擊殺殭屍回復生命（每秒回血有上限）；已有則上限提升',
    icon: 'lifesteal',
    maxLevel: 5,
    apply: (s) => (s.lifestealOnKill += 0.35),
  },
  {
    id: 'regen',
    name: '生命再生',
    desc: '每秒回復生命；已有則回更多',
    icon: 'regen',
    maxLevel: 5,
    apply: (s) => (s.hpRegen += 0.7),
  },
  {
    id: 'armor',
    name: '護甲',
    desc: '受到的傷害減免 10%（最多 70%）',
    icon: 'armor',
    maxLevel: 5,
    apply: (s) => (s.damageReduction = Math.min(0.7, s.damageReduction + 0.1)),
  },
  {
    id: 'shield',
    name: '能量護盾',
    desc: '定期生成可擋一次傷害的護盾；已有則生成更快',
    icon: 'shieldRegen',
    maxLevel: 5,
    apply: (s) => (s.shieldInterval = s.shieldInterval === 0 ? 12 : Math.max(4, s.shieldInterval - 2)),
  },
  // ===== 進攻修飾 =====
  {
    id: 'crit',
    name: '暴擊',
    desc: '子彈有機率造成 2 倍傷害；已有則機率提升',
    icon: 'crit',
    maxLevel: 5,
    apply: (s) => (s.critChance = Math.min(0.6, s.critChance + 0.1)),
  },
  {
    id: 'pierce',
    name: '穿透',
    desc: '子彈可貫穿 +1 隻殭屍不消失',
    icon: 'pierce',
    maxLevel: 4,
    apply: (s) => (s.pierce += 1),
  },
  {
    id: 'explode',
    name: '爆裂彈',
    desc: '子彈命中產生範圍爆炸；已有則擴大並增傷',
    icon: 'explode',
    maxLevel: 5,
    apply: (s) => {
      s.explodeRadius = s.explodeRadius === 0 ? 3 : s.explodeRadius + 0.8;
      s.explodeDamage += 2;
    },
  },
];

/** 從尚未滿級的升級中隨機抽 n 個；uncapped=true 時忽略滿級上限（死鬥無盡強化） */
export function rollChoices(levels: Record<string, number>, n = 3, uncapped = false): Upgrade[] {
  const pool = UPGRADES.filter((u) => uncapped || (levels[u.id] ?? 0) < u.maxLevel);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, n);
}

/** 升到指定等級所需經驗 */
/** 升到指定等級所需經驗：加速成長（二次項），避免後期經驗洪流造成連續升級洗版 */
export function xpForLevel(level: number): number {
  return Math.round(5 + level * 4 + level * level * 0.4);
}
