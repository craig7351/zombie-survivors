import { createRunState, type RunState } from './upgrades';
import { getCharacter } from './characters';

/** 永久升級（roguelite meta，花金幣，套用到每一輪） */
export interface PermaUpgrade {
  id: string;
  name: string;
  /** lucide 圖示 key（見 ui/icons.ts） */
  icon: string;
  desc: string;
  maxLevel: number;
  costBase: number;
  costStep: number;
}

export const PERMA: PermaUpgrade[] = [
  { id: 'might', name: '威力', icon: 'might', desc: '起始傷害 +1／級', maxLevel: 5, costBase: 100, costStep: 80 },
  { id: 'haste', name: '急速', icon: 'haste', desc: '起始攻速 +6%／級', maxLevel: 5, costBase: 120, costStep: 90 },
  { id: 'vigor', name: '活力', icon: 'vigor', desc: '起始生命 +20／級', maxLevel: 5, costBase: 100, costStep: 80 },
  { id: 'swift', name: '敏捷', icon: 'swift', desc: '起始移速 +5%／級', maxLevel: 5, costBase: 100, costStep: 80 },
  { id: 'greed', name: '貪婪', icon: 'greed', desc: '金幣獲得 +15%／級', maxLevel: 5, costBase: 150, costStep: 120 },
];

export function permaCost(p: PermaUpgrade, currentLevel: number): number {
  return p.costBase + p.costStep * currentLevel;
}

export interface MetaData {
  gold: number;
  unlocked: string[];
  perma: Record<string, number>;
}

const KEY = 'animal-survivors:meta:v2';

export function loadMeta(): MetaData {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const data = JSON.parse(raw) as Partial<MetaData>;
      return {
        gold: data.gold ?? 0,
        unlocked: data.unlocked ?? ['matt'],
        perma: data.perma ?? {},
      };
    }
  } catch {
    /* 忽略損毀資料 */
  }
  return { gold: 0, unlocked: ['matt'], perma: {} };
}

export function saveMeta(meta: MetaData) {
  try {
    localStorage.setItem(KEY, JSON.stringify(meta));
  } catch {
    /* 忽略寫入失敗 */
  }
}

/** 依角色與永久升級計算一輪的起始數值 */
export function computeStartRunState(characterId: string, perma: Record<string, number>): RunState {
  const s = createRunState();
  getCharacter(characterId).apply(s);

  const might = perma.might ?? 0;
  const haste = perma.haste ?? 0;
  const vigor = perma.vigor ?? 0;
  const swift = perma.swift ?? 0;

  s.damage += might;
  s.fireInterval *= Math.pow(0.94, haste);
  s.maxHp += 20 * vigor;
  s.moveSpeed *= Math.pow(1.05, swift);
  return s;
}

/** 金幣加成倍率（貪婪） */
export function goldMultiplier(perma: Record<string, number>): number {
  return 1 + 0.15 * (perma.greed ?? 0);
}
