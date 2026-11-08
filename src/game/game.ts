import {
  Engine,
  Scene,
  ArcRotateCamera,
  HemisphericLight,
  DirectionalLight,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Color4,
  Vector3,
  TransformNode,
  Mesh,
  GlowLayer,
} from '@babylonjs/core';
import { loadModel, loadCharacter } from './model-loader';
import type { AnimationGroup } from '@babylonjs/core';
import { createTerrain } from './terrain';
import { DIFFICULTIES, type Difficulty } from './difficulty';
import { getQuality, type QualityId } from './quality';
import { DEATHMATCH, deathmatchScore, dmHpMul, dmSpeedMul, dmContactMul, MUTATORS, type Mutator } from './deathmatch';

export type GameMode = 'story' | 'deathmatch';

/** 死鬥「祝福／詛咒」二選一（高風險高報酬，套用至 RunState） */
const BLESSINGS: Upgrade[] = [
  { id: 'bc_berserk', name: '嗜血狂戰', icon: 'might', desc: '傷害 +45%，但最大生命 -30', maxLevel: 99, apply: (s) => { s.damage = Math.ceil(s.damage * 1.45); s.maxHp = Math.max(20, s.maxHp - 30); } },
  { id: 'bc_tank', name: '鋼鐵之軀', icon: 'armor', desc: '減傷 +20%，但移速 -15%', maxLevel: 99, apply: (s) => { s.damageReduction = Math.min(0.7, s.damageReduction + 0.2); s.moveSpeed *= 0.85; } },
  { id: 'bc_swift', name: '疾風之刃', icon: 'firerate', desc: '攻速 +30%，但傷害 -15%', maxLevel: 99, apply: (s) => { s.fireInterval *= 0.7; s.damage = Math.max(1, Math.round(s.damage * 0.85)); } },
  { id: 'bc_crit', name: '賭命一擊', icon: 'crit', desc: '暴擊 +30%，但攻速 -10%', maxLevel: 99, apply: (s) => { s.critChance = Math.min(0.85, s.critChance + 0.3); s.fireInterval *= 1.1; } },
  { id: 'bc_greed', name: '貪婪', icon: 'greed', desc: '經驗 +60%、拾取 +60%，但最大生命 -20', maxLevel: 99, apply: (s) => { s.xpMultiplier *= 1.6; s.pickupRadius *= 1.6; s.maxHp = Math.max(20, s.maxHp - 20); } },
  { id: 'bc_rage', name: '狂暴化', icon: 'damage', desc: '傷害 +70%，但減傷 -25%', maxLevel: 99, apply: (s) => { s.damage = Math.ceil(s.damage * 1.7); s.damageReduction = Math.max(0, s.damageReduction - 0.25); } },
];
import { scatterGroundDecals, buildRoads } from './ground-decals';
import { CONFIG } from './config';
import { Input } from './input';
import { SpatialGrid } from './spatial-grid';
import { ZombieHorde } from './zombie-horde';
import { WeaponSystem } from './weapon-system';
import { ExtraWeapons } from './extra-weapons';
import { GemSystem } from './gem-system';
import { Boss, BOSS_COUNT, BOSS_INFO } from './boss';
import { BossHazards } from './boss-hazards';
import { BloodDecals } from './decals';
import { Obstacle, resolveObstacles } from './obstacles';
import { createRunState, rollChoices, xpForLevel, UPGRADES, type RunState, type Upgrade } from './upgrades';
import { levelUpBurst, bossDeathBurst, hurtBurst, enemyDeathBurst, spawnText, setGlowLayer } from './effects';
import { sound } from './sound';

export type GameState = 'running' | 'levelup' | 'dead' | 'paused' | 'won';

export interface ChoiceView {
  id: string;
  name: string;
  desc: string;
  /** lucide 圖示 key（見 ui/icons.ts） */
  icon: string;
}

export interface GameStats {
  fps: number;
  enemies: number;
  kills: number;
  time: number;
  hp: number;
  maxHp: number;
  level: number;
  xp: number;
  xpToNext: number;
  state: GameState;
  choices: ChoiceView[];
  bossActive: boolean;
  bossHp: number;
  bossMaxHp: number;
  /** 王名稱與招式（顯示於王血條） */
  bossName: string;
  bossSkill: string;
  /** 已擊敗王數 / 王總數 */
  bossDefeated: number;
  bossTotal: number;
  goldEarned: number;
  /** 目前背景音樂索引（隨進度自動切換，供下拉同步顯示） */
  musicTrack: number;
  /** 遊戲模式 */
  mode: GameMode;
  /** 死鬥波數 */
  wave: number;
  /** 連殺數（死鬥；受擊歸零） */
  combo: number;
  /** 波數字卡文字（非空時 HUD 大字顯示） */
  waveCard: string;
  /** 目前突變子／血潮標籤（死鬥 HUD 顯示，空字串為無） */
  mutator: string;
  /** 待選升級次數（≥1 時顯示不暫停的升級選項列） */
  pendingLevels: number;
}

export interface RunResult {
  gold: number;
  kills: number;
  time: number;
  level: number;
  /** 是否破關（擊敗最終王） */
  won: boolean;
  /** 本局是否動過 debug（true 則不列入排行榜） */
  cheated: boolean;
  /** 遊戲模式 */
  mode: GameMode;
  /** 死鬥到達波數（劇情模式為 0） */
  wave: number;
  /** 死鬥分數（劇情模式為 0） */
  score: number;
}

export interface GameOptions {
  onStats?: (stats: GameStats) => void;
  onGameOver?: (result: RunResult) => void;
  /** 角色與永久升級算出的起始數值（範本，每輪複製使用） */
  startRunState?: RunState;
  /** 角色身體顏色（fallback 造型用） */
  characterColor?: [number, number, number];
  /** 角色 GLB 模型路徑 */
  characterModel?: string;
  /** 金幣加成倍率（貪婪） */
  goldMultiplier?: number;
  /** 難度設定 */
  difficulty?: Difficulty;
  /** 畫質（預設高；只影響渲染成本，不影響玩法） */
  quality?: QualityId;
  /** 遊戲模式：story（劇情/破關）或 deathmatch（無盡死鬥） */
  mode?: GameMode;
}

export interface GameHandle {
  dispose: () => void;
  setJoystick: (x: number, z: number) => void;
  chooseUpgrade: (index: number) => void;
  restart: () => void;
  togglePause: () => void;
  jump: () => void;
  setXpDebug: (on: boolean) => void;
  setMuted: (on: boolean) => void;
  setMusicTrack: (i: number) => void;
  /** 切換畫質（解析度/發光/霧即時生效；抗鋸齒於下次開局生效） */
  setQuality: (id: QualityId) => void;
  getDebugParams: () => DebugParamView[];
  setDebugParam: (index: number, value: number) => void;
  getUpgradeStatus: () => UpgradeStatusView[];
  getBossNames: () => string[];
  summonBoss: (index: number) => void;
  /** 標記本局動過 debug（開啟 debug 面板時呼叫）→ 不列入排行榜 */
  markCheated: () => void;
}

export interface UpgradeStatusView {
  name: string;
  /** lucide 圖示 key（見 ui/icons.ts） */
  icon: string;
  level: number;
  maxLevel: number;
}

export interface DebugParamView {
  label: string;
  group: string;
  type: 'range' | 'bool';
  min: number;
  max: number;
  step: number;
  value: number;
}

export function createGame(canvas: HTMLCanvasElement, options: GameOptions = {}): GameHandle {
  const quality = getQuality(options.quality ?? 'high');
  const engine = new Engine(canvas, quality.antialias, { preserveDrawingBuffer: false, stencil: true });
  /** 解析度降階：值越大越省（中=1.5、低=2）；高=1 滿解析度 */
  engine.setHardwareScalingLevel(quality.hardwareScaling);
  sound.enable();
  /** 背景音樂依擊敗王數分段：0→暗潮, ≥2→獵殺, ≥4→肅殺, ≥6→狂亂（索引對應 TRACKS） */
  const stageTrack = (defeated: number): number => (defeated >= 6 ? 2 : defeated >= 4 ? 3 : defeated >= 2 ? 1 : 0);
  let musicTrackIdx = 0;
  sound.setMusicTrack(musicTrackIdx);
  sound.startMusic();

  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.05, 0.07, 0.13, 1);
  const baseClear = scene.clearColor.clone();
  const tideClear = new Color4(0.2, 0.04, 0.05, 1); // 血潮：畫面轉紅
  /** 輝光層：讓發光材質（子彈、衛星、閃電、火花等）泛光更顯眼 */
  const glow = new GlowLayer('glow', scene);
  glow.intensity = quality.glow;
  glow.isEnabled = quality.glow > 0;
  setGlowLayer(glow);
  /** 線性霧增加遠處深度感 */
  scene.fogMode = Scene.FOGMODE_LINEAR;
  scene.fogColor = new Color3(0.05, 0.07, 0.13);
  scene.fogStart = 55;
  scene.fogEnd = quality.fogEnd;

  const camera = new ArcRotateCamera('camera', -Math.PI / 2, Math.PI / 3.2, 50, Vector3.Zero(), scene);
  /** 開放使用者調整：拖曳旋轉、滾輪／雙指縮放（仍自動跟隨玩家目標點） */
  camera.attachControl(canvas, true);
  camera.lowerRadiusLimit = 25; // 最近
  camera.upperRadiusLimit = 80; // 最遠
  camera.lowerBetaLimit = 0.35; // 最高俯角（避免看到天空）
  camera.upperBetaLimit = Math.PI / 2.2; // 最低俯角（避免穿到地底）
  camera.wheelPrecision = 3; // 滾輪縮放靈敏度
  camera.pinchPrecision = 60; // 手機雙指縮放靈敏度
  camera.panningSensibility = 0; // 停用平移（鎖定跟隨玩家）
  const light = new HemisphericLight('light', new Vector3(0.4, 1, 0.3), scene);
  light.intensity = 0.85;
  light.groundColor = new Color3(0.25, 0.28, 0.4);
  const sun = new DirectionalLight('sun', new Vector3(-0.5, -1, -0.3), scene);
  sun.intensity = 0.6;

  const { heightAt } = createTerrain(scene);
  void buildRoads(scene, heightAt);
  scatterGroundDecals(scene, heightAt);
  /** 實心障礙物（隨道具非同步載入逐步填入） */
  const obstacles: Obstacle[] = [];
  void scatterProps(scene, obstacles, heightAt);

  /** 玩家根節點（移動此節點，視覺為其子物件：GLB 或 fallback 膠囊） */
  const player = new TransformNode('player', scene);
  player.position.set(0, 0, 0);

  const fallbackBody = MeshBuilder.CreateCapsule(
    'player-body',
    { radius: CONFIG.player.radius, height: CONFIG.player.radius * 2.4 },
    scene,
  );
  fallbackBody.parent = player;
  fallbackBody.position.y = CONFIG.player.radius * 1.2;
  const playerMaterial = new StandardMaterial('player-material', scene);
  const pc = options.characterColor ?? [1, 0.95, 0.4];
  playerMaterial.diffuseColor = new Color3(pc[0], pc[1], pc[2]);
  playerMaterial.emissiveColor = new Color3(pc[0] * 0.3, pc[1] * 0.3, pc[2] * 0.3);
  playerMaterial.specularColor = Color3.Black();
  fallbackBody.material = playerMaterial;

  /** 角色 idle／walk 動畫群組（移動時切換成走路） */
  let playerWalk: AnimationGroup | undefined;
  let playerIdle: AnimationGroup | undefined;
  let playerMoving = false;

  /** 非同步載入角色模型，成功即取代 fallback（不阻塞遊戲開始） */
  if (options.characterModel) {
    void loadCharacter(scene, options.characterModel, 2.4).then((m) => {
      if (m) {
        m.root.parent = player;
        playerWalk = m.walk;
        playerIdle = m.idle;
        fallbackBody.setEnabled(false);
      }
    });
  }

  const goldMul = options.goldMultiplier ?? 1;
  const diff = options.difficulty ?? DIFFICULTIES[0];
  const mode: GameMode = options.mode ?? 'story';
  const isDM = mode === 'deathmatch';
  const runTemplate: RunState = options.startRunState ?? createRunState();

  const input = new Input();
  input.attach();

  const grid = new SpatialGrid(CONFIG.gridCellSize);
  const enemies = new ZombieHorde(scene);
  enemies.setHeightFn(heightAt);
  const weapon = new WeaponSystem(scene);
  const extras = new ExtraWeapons(scene);
  const gems = new GemSystem(scene);
  const boss = new Boss(scene);
  boss.setHeightFn(heightAt);
  boss.setHpScale(diff.bossHp);
  const hazards = new BossHazards(scene);
  enemies.setHazards(hazards);
  enemies.rangedDamage = 7 * diff.enemyContact;
  const bloodDecals = new BloodDecals(scene);

  /** 減速光環視覺：藍色貼地圓盤 */
  const slowField = MeshBuilder.CreateDisc('slow-field', { radius: 1, tessellation: 48 }, scene);
  slowField.rotation.x = Math.PI / 2;
  slowField.isPickable = false;
  const slowMat = new StandardMaterial('slow-mat', scene);
  slowMat.diffuseColor = new Color3(0.4, 0.7, 1);
  slowMat.emissiveColor = new Color3(0.2, 0.5, 0.9);
  slowMat.specularColor = Color3.Black();
  slowMat.disableLighting = true;
  slowMat.alpha = 0.18;
  slowMat.backFaceCulling = false;
  slowField.material = slowMat;
  slowField.setEnabled(false);

  /** 護盾視覺：青色發光環 */
  const shieldRing = MeshBuilder.CreateTorus('shield-ring', { diameter: 2.4, thickness: 0.18, tessellation: 32 }, scene);
  const shieldMat = new StandardMaterial('shield-mat', scene);
  shieldMat.emissiveColor = new Color3(0.4, 0.9, 1);
  shieldMat.diffuseColor = new Color3(0, 0, 0);
  shieldMat.specularColor = Color3.Black();
  shieldMat.disableLighting = true;
  shieldRing.material = shieldMat;
  shieldRing.isPickable = false;
  shieldRing.setEnabled(false);

  /** 寶箱模型範本（非同步載入，spawn 時複製；未就緒則退回程序化方塊） */
  let chestTemplate: TransformNode | null = null;
  void loadModel(scene, '/models/zombie/item_chest.glb', 1.1).then((n) => {
    if (n) {
      n.setEnabled(false);
      /** 套上自發光材質，讓 GlowLayer 泛光（金色） */
      const chestMat = new StandardMaterial('chest-glow', scene);
      chestMat.diffuseColor = new Color3(1, 0.8, 0.3);
      chestMat.emissiveColor = new Color3(1, 0.7, 0.2);
      chestMat.specularColor = Color3.Black();
      chestMat.disableLighting = true;
      n.getChildMeshes(false).forEach((m) => (m.material = chestMat));
      chestTemplate = n;
    }
  });
  let bossTimer = 0;
  /** 已生成的王數（最多 BOSS_COUNT） */
  let bossCount = 0;
  /** 已擊敗的王數 */
  let bossDefeated = 0;

  /** 一輪狀態 */
  let run: RunState = { ...runTemplate };
  let levels: Record<string, number> = {};
  let level = 1;
  let xp = 0;
  let xpToNext = xpForLevel(level);
  let hp = run.maxHp;
  let kills = 0;
  let time = 0;
  let goldEarned = 0;
  /** 死鬥狀態：波數、連殺、Boss Rush 計數、波數字卡 */
  let wave = 0;
  let lastWave = 0;
  let combo = 0;
  let bossRush = 0;
  /** 待選升級次數（不暫停升級：累積後玩家用選項列逐一挑） */
  let pendingLevelUps = 0;
  let waveCardText = '';
  let waveCardUntil = 0;
  let curMutator: Mutator | null = null;
  let bloodTideUntil = 0;
  let bloodTideActive = false;
  let hurtTimer = 0;
  /** 受傷飄字用：兩次回饋之間累計的扣血量 */
  let dmgAccum = 0;
  let state: GameState = 'running';
  let choices: Upgrade[] = [];

  /** 跳躍狀態（jumpY 為離地高度，疊加在地形高度之上） */
  let vy = 0;
  let jumpY = 0;
  let grounded = true;
  let jumpRequested = false;

  /** debug：經驗 ×10、無敵、回力鏢視覺大小 */
  let xpDebug = false;
  /** 本局是否動過 debug（開面板/改參數/無敵/EXP×10/召喚王）→ 結算不列入排行榜 */
  let cheated = false;
  let invincible = false;
  let boomerangScale = 1;
  /** 護盾狀態 */
  let shieldReady = false;
  let shieldTimer = 0;
  function requestJump() {
    if (state === 'running') jumpRequested = true;
  }

  const contactRange = CONFIG.player.radius + CONFIG.enemy.radius + 0.2;
  const contactRange2 = contactRange * contactRange;
  /** 障礙物推出計算用暫存 */
  const playerResolve = { x: 0, z: 0 };

  /** ===== 增益（寶箱）與道具 ===== */
  type BuffType = 'rapid' | 'power' | 'speed' | 'magnet' | 'multishot';
  const BUFFS: { type: BuffType; name: string; color: string }[] = [
    { type: 'rapid', name: '急速射擊', color: '#fbbf24' },
    { type: 'power', name: '威力提升', color: '#f87171' },
    { type: 'speed', name: '加速', color: '#34d399' },
    { type: 'magnet', name: '磁吸', color: '#22d3ee' },
    { type: 'multishot', name: '多重彈', color: '#a78bfa' },
  ];
  /** until 以遊戲秒數計 */
  const activeBuffs: { type: BuffType; until: number }[] = [];

  function applyBuff(eff: RunState, type: BuffType) {
    if (type === 'rapid') eff.fireInterval *= 0.5;
    else if (type === 'power') {
      eff.damage *= 2;
      eff.orbitalDamage *= 2;
      eff.auraDamage *= 2;
      eff.lightningDamage *= 2;
      eff.novaDamage *= 2;
      eff.boomerangDamage *= 2;
    } else if (type === 'speed') eff.moveSpeed *= 1.5;
    else if (type === 'magnet') eff.pickupRadius *= 3;
    else if (type === 'multishot') eff.projectileCount += 2;
  }

  /** 取得套用增益後的有效數值 */
  function effectiveRun(): RunState {
    const eff: RunState = { ...run };
    for (const b of activeBuffs) applyBuff(eff, b.type);
    return eff;
  }

  interface WorldItem {
    /** holder 節點（旋轉/浮動此節點，視覺為其子物件） */
    node: TransformNode;
    kind: 'chest' | 'heal';
    bornAt: number;
    baseY: number;
    healPct: number;
  }
  const itemList: WorldItem[] = [];
  let chestTimer = 0;
  let healTimer = 0;

  function spawnItem(kind: 'chest' | 'heal') {
    const range = CONFIG.arenaHalf - 4;
    const x = (Math.random() * 2 - 1) * range;
    const z = (Math.random() * 2 - 1) * range;
    const node = new TransformNode(`item-${kind}`, scene);
    if (kind === 'chest' && chestTemplate) {
      const vis = chestTemplate.clone('chest-vis', node);
      vis?.setEnabled(true);
    } else {
      const vis = kind === 'chest' ? createChestMesh(scene) : createHealMesh(scene);
      vis.parent = node;
    }
    const baseY = heightAt(x, z) + (kind === 'chest' ? 0.5 : 0.9);
    node.position.set(x, baseY, z);
    const healPct =
      kind === 'heal'
        ? CONFIG.items.healPercents[Math.floor(Math.random() * CONFIG.items.healPercents.length)]
        : 0;
    itemList.push({ node, kind, bornAt: time, baseY, healPct });
  }

  function triggerItem(item: WorldItem) {
    const pos = item.node.position;
    if (item.kind === 'chest') {
      const def = BUFFS[Math.floor(Math.random() * BUFFS.length)];
      const existing = activeBuffs.find((b) => b.type === def.type);
      if (existing) existing.until = time + CONFIG.items.buffDuration / 1000;
      else activeBuffs.push({ type: def.type, until: time + CONFIG.items.buffDuration / 1000 });
      spawnText(scene, pos, def.name, def.color, 5);
      sound.buff();
    } else {
      const amount = run.maxHp * item.healPct;
      hp = Math.min(run.maxHp, hp + amount);
      spawnText(scene, pos, `+${Math.round(item.healPct * 100)}% HP`, '#34d399');
      sound.heal();
    }
  }

  function updateItems(dt: number, px: number, pz: number) {
    const r = CONFIG.items.pickupRadius;
    const r2 = r * r;
    for (let i = itemList.length - 1; i >= 0; i--) {
      const item = itemList[i];
      item.node.rotation.y += dt * 1.6;
      item.node.position.y = item.baseY + Math.sin(time * 3 + i) * 0.18;

      if (time - item.bornAt > CONFIG.items.lifetimeSec) {
        item.node.dispose();
        itemList.splice(i, 1);
        continue;
      }
      const dx = item.node.position.x - px;
      const dz = item.node.position.z - pz;
      if (dx * dx + dz * dz <= r2) {
        triggerItem(item);
        item.node.dispose();
        itemList.splice(i, 1);
      }
    }
  }

  const stats: GameStats = {
    fps: 0,
    enemies: enemies.count,
    kills: 0,
    time: 0,
    hp,
    maxHp: run.maxHp,
    level,
    xp: 0,
    xpToNext,
    state,
    choices: [],
    bossActive: false,
    bossHp: 0,
    bossMaxHp: 0,
    bossName: '',
    bossSkill: '',
    bossDefeated: 0,
    bossTotal: BOSS_COUNT,
    goldEarned: 0,
    musicTrack: 0,
    mode,
    wave: 0,
    combo: 0,
    waveCard: '',
    mutator: '',
    pendingLevels: 0,
  };

  function pushStats() {
    stats.fps = Math.round(engine.getFps());
    stats.enemies = enemies.count;
    stats.kills = kills;
    stats.time = time;
    stats.hp = Math.max(0, Math.ceil(hp));
    stats.maxHp = run.maxHp;
    stats.level = level;
    stats.xp = Math.floor(xp);
    stats.xpToNext = xpToNext;
    stats.state = state;
    stats.choices = choices.map((c) => ({ id: c.id, name: c.name, desc: c.desc, icon: c.icon }));
    stats.bossActive = boss.active;
    stats.bossHp = Math.max(0, Math.ceil(boss.hp));
    stats.bossMaxHp = boss.maxHp;
    stats.bossName = boss.name;
    stats.bossSkill = boss.skillName;
    stats.bossDefeated = bossDefeated;
    stats.goldEarned = goldEarned;
    stats.musicTrack = musicTrackIdx;
    stats.wave = wave;
    stats.combo = combo;
    stats.waveCard = time < waveCardUntil ? waveCardText : '';
    stats.pendingLevels = pendingLevelUps;
    stats.mutator = isDM
      ? time < bloodTideUntil
        ? '血潮來襲'
        : curMutator
          ? curMutator.name
          : ''
      : '';
    options.onStats?.(stats);
  }

  const clampArena = (v: number) => Math.max(-CONFIG.arenaHalf, Math.min(CONFIG.arenaHalf, v));

  function togglePause() {
    if (state === 'running') state = 'paused';
    else if (state === 'paused') state = 'running';
    else return;
    pushStats();
  }

  /** 補一組升級選項（不暫停遊戲）；全滿級（劇情）則清空待選 */
  function rollNextChoices() {
    const rolled = rollChoices(levels, 3, isDM); // 死鬥不設滿級上限
    if (rolled.length === 0) {
      pendingLevelUps = 0;
      choices = [];
      return;
    }
    choices = rolled;
  }

  /** 死鬥祝福／詛咒：隨機抽 2 個高風險高報酬選項，沿用升級彈窗 */
  function enterChoice() {
    const pool = [...BLESSINGS];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    choices = pool.slice(0, 2);
    state = 'levelup';
    sound.buff();
    pushStats();
  }

  function gameplay(dt: number) {
    const dir = input.getDirection();
    /** 清除過期增益，計算套用增益後的有效數值 */
    for (let i = activeBuffs.length - 1; i >= 0; i--) {
      if (time >= activeBuffs[i].until) activeBuffs.splice(i, 1);
    }
    const eff = effectiveRun();

    /** 依攝影機水平角度（alpha）將輸入轉為相機相對方向：
     *  前（+z）= 遠離攝影機，右（+x）= 畫面右側。預設角度下為恆等。 */
    const ca = Math.cos(camera.alpha);
    const sa = Math.sin(camera.alpha);
    const moveX = dir.x * -sa + dir.z * -ca;
    const moveZ = dir.x * ca + dir.z * -sa;

    player.position.x = clampArena(player.position.x + moveX * eff.moveSpeed * dt);
    player.position.z = clampArena(player.position.z + moveZ * eff.moveSpeed * dt);
    /** 障礙物阻擋 */
    if (obstacles.length > 0) {
      resolveObstacles(obstacles, player.position.x, player.position.z, CONFIG.player.radius, playerResolve);
      player.position.x = clampArena(playerResolve.x);
      player.position.z = clampArena(playerResolve.z);
    }

    /** 面向移動方向（模型前方為 +Z），平滑轉向 */
    const moving = dir.x !== 0 || dir.z !== 0;
    if (moving) {
      const targetAngle = Math.atan2(moveX, moveZ);
      player.rotation.y = lerpAngle(player.rotation.y, targetAngle, 0.25);
    }
    /** 移動時播放走路動畫，停下時回到 idle（僅在狀態改變時切換） */
    if (moving !== playerMoving) {
      playerMoving = moving;
      if (moving) {
        playerIdle?.stop();
        playerWalk?.start(true);
      } else {
        playerWalk?.stop();
        playerIdle?.start(true);
      }
    }

    /** 跳躍：地表高度之上的拋物線位移（jumpY 為離地高度） */
    if (jumpRequested && grounded) {
      vy = eff.jumpStrength;
      grounded = false;
    }
    jumpRequested = false;
    if (!grounded) {
      vy -= CONFIG.player.jump.gravity * dt;
      jumpY += vy * dt;
      if (jumpY <= 0) {
        jumpY = 0;
        vy = 0;
        grounded = true;
      }
    }
    const airborne = jumpY > CONFIG.player.jump.dodgeHeight;

    const px = player.position.x;
    const pz = player.position.z;
    /** 玩家貼地（地形高度）+ 跳躍離地高度 */
    const groundY = heightAt(px, pz);
    player.position.y = groundY + jumpY;
    camera.target.set(px, groundY + 1.2, pz);

    /** 死鬥本幀效果旗標：爆裂突變是否啟用、本幀玩家受到的爆裂傷害 */
    let explodeActive = false;
    let explodeAccrued = 0;

    /** 死鬥：波數推進（每 waveSec 秒一波），進新波時排程 Boss Rush／突變／血潮／祝福 */
    if (isDM) {
      wave = Math.floor(time / DEATHMATCH.waveSec) + 1;
      /** 撐過通關波數（100）→ 死鬥勝利 */
      if (wave > DEATHMATCH.clearWave) {
        wave = DEATHMATCH.clearWave;
        goldEarned = Math.floor((kills * 0.6 + time) * goldMul) + 1000;
        state = 'won';
        sound.levelUp();
        hazards.reset();
        pushStats();
        options.onGameOver?.({
          gold: goldEarned,
          kills,
          time,
          level,
          won: true,
          cheated,
          mode,
          wave: DEATHMATCH.clearWave,
          score: deathmatchScore(DEATHMATCH.clearWave, kills, time),
        });
        return;
      }
      if (wave !== lastWave) {
        lastWave = wave;
        /** 突變子：每 3 波換一個，其餘波清除 */
        curMutator = wave >= 3 && wave % 3 === 0 ? MUTATORS[Math.floor(Math.random() * MUTATORS.length)] : null;
        const milestone = wave % 10 === 0;
        const isBossWave = wave % DEATHMATCH.bossEveryWaves === 0;
        const isTideWave = wave >= 4 && wave % 5 === 4;
        waveCardText = isBossWave
          ? `第 ${wave} 波・王來了！`
          : isTideWave
            ? '血潮來襲！'
            : curMutator
              ? `突變：${curMutator.name}`
              : milestone
                ? `第 ${wave} 波！！`
                : `第 ${wave} 波`;
        waveCardUntil = time + (milestone || isBossWave || isTideWave ? 2.6 : 1.6);
        sound.buff();
        /** Boss Rush：每 bossEveryWaves 波一隻王（循環，血量隨波數加成） */
        if (isBossWave && !boss.active) {
          boss.setHpScale(diff.bossHp * (1 + wave * 0.12));
          boss.spawn(bossRush % BOSS_COUNT, px, pz);
          bossRush += 1;
          sound.bossSpawn();
        }
        /** 血潮：20 秒高密度狂暴時段 */
        if (isTideWave) bloodTideUntil = time + 20;
        /** 祝福／詛咒：二選一（暫停遊戲彈窗） */
        if (wave >= 2 && wave % 5 === 2) enterChoice();
      }
    }

    /** 死鬥效果：突變子 + 血潮，計算對怪物的額外倍率／菁英機率／密度 */
    let dmHpExtra = 1;
    let dmSpeedExtra = 1;
    let densityBoost = 0;
    let eliteChance = isDM ? Math.min(0.25, wave * 0.015) : 0;
    explodeActive = false;
    enemies.respawnAtDeath = false;
    enemies.forceCrawl = false;
    if (isDM && curMutator) {
      switch (curMutator.id) {
        case 'rage': dmSpeedExtra = 1.45; break;
        case 'frail': dmHpExtra = 0.5; densityBoost += 8; break;
        case 'giant': eliteChance = 1; dmHpExtra = 1.25; break;
        case 'explode': explodeActive = true; break;
        case 'split': enemies.respawnAtDeath = true; densityBoost += 8; break;
        case 'elite': eliteChance = Math.max(eliteChance, 0.5); break;
        case 'crawl': enemies.forceCrawl = true; dmSpeedExtra = 0.8; break;
      }
    }
    const inTide = isDM && time < bloodTideUntil;
    if (inTide) densityBoost += 20;
    /** 血潮進／出場：切畫面色 + 音樂；結束給寶箱獎勵 */
    if (inTide !== bloodTideActive) {
      bloodTideActive = inTide;
      if (inTide) {
        scene.clearColor = tideClear;
        musicTrackIdx = 2;
        sound.setMusicTrack(2);
      } else {
        scene.clearColor = baseClear;
        musicTrackIdx = stageTrack(bossDefeated);
        sound.setMusicTrack(musicTrackIdx);
        spawnItem('chest');
      }
    }
    enemies.eliteChance = eliteChance;

    /** 生成導演：隨時間升壓（死鬥再疊波數與突變倍率） */
    enemies.hpMul = (1 + time * CONFIG.director.hpGrowthPerSec * diff.growth) * diff.enemyHp * (isDM ? dmHpMul(wave) : 1) * dmHpExtra;
    /** 怪速含「時緩」倍率與難度 */
    enemies.speedMul =
      (1 + time * CONFIG.director.speedGrowthPerSec * diff.growth) *
      eff.enemySpeedMul *
      diff.enemySpeed *
      (isDM ? dmSpeedMul(wave) : 1) *
      dmSpeedExtra;
    enemies.tier = Math.min(1, time / 120);
    const target = isDM
      ? Math.min(CONFIG.director.maxCount, CONFIG.director.baseCount + wave * DEATHMATCH.countPerWave + densityBoost)
      : Math.min(
          CONFIG.director.maxCount,
          CONFIG.director.baseCount + Math.floor(time / CONFIG.director.stepIntervalSec) * CONFIG.director.addPerStep,
        );
    enemies.setCount(target, px, pz);

    grid.clear();
    enemies.insertAll(grid);
    enemies.update(dt, px, pz, grid, obstacles, eff.slowRadius, eff.slowFactor);
    /** 減速光環視覺 */
    if (eff.slowRadius > 0) {
      slowField.position.set(px, groundY + 0.06, pz);
      slowField.scaling.set(eff.slowRadius, eff.slowRadius, eff.slowRadius);
      if (!slowField.isEnabled()) slowField.setEnabled(true);
    } else if (slowField.isEnabled()) {
      slowField.setEnabled(false);
    }

    /** 劇情模式：王依序登場（共 BOSS_COUNT 隻）。死鬥模式改由波數觸發 Boss Rush */
    if (!isDM) {
      bossTimer += dt;
      if (!boss.active && bossCount < BOSS_COUNT && bossTimer >= CONFIG.boss.intervalSec) {
        bossTimer = 0;
        boss.spawn(bossCount, px, pz);
        sound.bossSpawn();
        bossCount += 1;
      }
    }

    /** 本幀累積的吸血量，於下方依「每秒上限」結算（避免高擊殺率無限回血） */
    let lifestealAccrued = 0;
    const onKill = (x: number, z: number) => {
      gems.spawn(x, z);
      const y = heightAt(x, z);
      enemyDeathBurst(scene, new Vector3(x, y + CONFIG.enemy.y, z));
      bloodDecals.spawn(x, z, y + 0.03);
      /** 吸血：先累積，稍後封頂結算 */
      if (eff.lifestealOnKill > 0) lifestealAccrued += eff.lifestealOnKill;
      combo += 1; // 連殺（受擊歸零）
      /** 菁英擊殺：額外噴經驗 + 較大爆裂 */
      if (enemies.lastKillWasElite) {
        for (let n = 0; n < 3; n++) gems.spawn(x + (Math.random() - 0.5) * 1.6, z + (Math.random() - 0.5) * 1.6);
        enemyDeathBurst(scene, new Vector3(x, y + CONFIG.enemy.y, z));
      }
      /** 爆裂突變：死亡點靠近玩家則造成傷害（稍後併入結算） */
      if (explodeActive) {
        const ex = px - x;
        const ez = pz - z;
        if (ex * ex + ez * ez < 9) explodeAccrued += 5;
      }
      sound.hit();
    };
    kills += weapon.update(dt, px, pz, enemies, boss, grid, eff, onKill, groundY);
    kills += extras.update(dt, px, pz, enemies, boss, eff, onKill, groundY);
    /** 吸血結算：每秒回血上限 = 1 + 1.6 × 每殺回血（與擊殺率脫鉤，殺再快也封頂） */
    if (lifestealAccrued > 0 && hp > 0) {
      const capPerSec = 1 + 1.6 * eff.lifestealOnKill;
      hp = Math.min(run.maxHp, hp + Math.min(lifestealAccrued, capPerSec * dt));
    }

    /** 王被擊敗：噴出大量經驗 + 爆炸特效 */
    if (boss.justDied) {
      boss.justDied = false;
      kills += 1;
      bossDefeated += 1;
      /** 依進度自動切歌（手動下拉仍可在里程碑之間覆蓋） */
      const nextTrack = stageTrack(bossDefeated);
      if (nextTrack !== musicTrackIdx) {
        musicTrackIdx = nextTrack;
        sound.setMusicTrack(musicTrackIdx);
      }
      bossDeathBurst(scene, new Vector3(boss.x, heightAt(boss.x, boss.z) + 1.5, boss.z));
      sound.bossDown();
      for (let n = 0; n < CONFIG.boss.xpGems; n++) {
        const a = Math.random() * Math.PI * 2;
        const d = Math.random() * 3;
        gems.spawn(boss.x + Math.cos(a) * d, boss.z + Math.sin(a) * d);
      }
      combo += 1; // 擊敗王也算連殺
      /** 擊敗最終王 → 破關（僅劇情模式；死鬥無破關，繼續無盡） */
      if (!isDM && bossDefeated >= BOSS_COUNT) {
        goldEarned = Math.floor((kills * 0.6 + time) * goldMul) + 500;
        state = 'won';
        sound.levelUp();
        hazards.reset();
        pushStats();
        options.onGameOver?.({ gold: goldEarned, kills, time, level, won: true, cheated, mode, wave, score: 0 });
        return;
      }
    }

    boss.update(dt, px, pz, obstacles, hazards);
    /** 王招式對玩家造成的傷害（彈幕／震波／毒池，無視騰空），統一於下方結算 */
    const hazardDmg = hazards.update(dt, px, pz, groundY);

    /** 道具：每 15 秒生成寶箱與回血，並更新拾取 */
    chestTimer += dt;
    /** 死鬥寶箱頻率加倍 */
    if (chestTimer >= (CONFIG.items.chestInterval / 1000) * (isDM ? 0.5 : 1)) {
      chestTimer = 0;
      spawnItem('chest');
    }
    healTimer += dt;
    if (healTimer >= CONFIG.items.healInterval / 1000) {
      healTimer = 0;
      spawnItem('heal');
    }
    updateItems(dt, px, pz);

    const collected = gems.update(dt, px, pz, eff.pickupRadius);
    if (collected > 0) {
      /** 死鬥等級上限：到頂不再獲得經驗/升級（戰力封頂，怪物續強→run 會結束） */
      const levelCap = isDM ? DEATHMATCH.levelCap : Infinity;
      if (level < levelCap) {
        /** 每顆寶石基礎經驗（預設 4）；死鬥連殺給經驗加成（最多 +20%） */
        const comboXp = isDM ? 1 + Math.min(combo, 50) * 0.004 : 1;
        xp += collected * 4 * eff.xpMultiplier * (xpDebug ? 10 : 1) * comboXp;
        /** 不暫停升級：累積待選次數，遊戲繼續跑；玩家用畫面下方選項列隨時挑 */
        let leveled = false;
        while (xp >= xpToNext && level < levelCap) {
          xp -= xpToNext;
          level += 1;
          xpToNext = xpForLevel(level);
          pendingLevelUps += 1;
          leveled = true;
        }
        if (leveled) {
          levelUpBurst(scene, new Vector3(px, player.position.y + 1, pz));
          sound.levelUp();
        }
        if (level >= levelCap) xp = xpToNext; // 滿等：經驗條顯示全滿
      }
    }
    /** 有待選但目前無選項（剛開始、或祝福彈窗用掉選項後）→ 補一組（不覆蓋玩家正在看的） */
    if (choices.length === 0 && pendingLevelUps > 0) rollNextChoices();

    /** 接觸傷害（小怪 + 王） */
    let touching = false;
    grid.query(px, pz, (j) => {
      if (touching || !enemies.isAlive(j)) return;
      const dx = enemies.getX(j) - px;
      const dz = enemies.getZ(j) - pz;
      if (dx * dx + dz * dz <= contactRange2) touching = true;
    });
    const contactDps =
      CONFIG.player.contactDps *
      (1 + time * CONFIG.director.contactGrowthPerSec * diff.growth) *
      diff.enemyContact *
      (isDM ? dmContactMul(wave) : 1);
    const bossTouch = boss.contactsPlayer(px, pz, CONFIG.player.radius);

    /** 護盾：定期生成，可擋下一次傷害 */
    if (eff.shieldInterval > 0) {
      if (!shieldReady) {
        shieldTimer += dt;
        if (shieldTimer >= eff.shieldInterval) {
          shieldReady = true;
          shieldTimer = 0;
        }
      }
    } else {
      shieldReady = false;
    }

    /** 統一結算本幀傷害：接觸（騰空可躲）+ 王招式；套用減傷與護盾 */
    let incoming = 0;
    const dmLethal = isDM ? dmContactMul(wave) : 1; // 死鬥後期致命性放大（接觸/王/招式）
    if (!airborne) {
      if (touching) incoming += contactDps * dt;
      if (bossTouch) incoming += boss.contactDps * diff.enemyContact * dmLethal * dt;
    }
    incoming += hazardDmg * dmLethal;
    incoming += explodeAccrued; // 爆裂突變傷害
    if (invincible) incoming = 0;
    incoming *= 1 - eff.damageReduction;
    if (incoming > 0 && shieldReady) {
      incoming = 0;
      shieldReady = false;
      shieldTimer = 0;
    }
    if (incoming > 0) {
      hp -= incoming;
      dmgAccum += incoming;
      combo = 0; // 受擊歸零連殺
    }

    /** 護盾視覺 */
    if (shieldReady) {
      shieldRing.position.set(px, groundY + 1.1, pz);
      if (!shieldRing.isEnabled()) shieldRing.setEnabled(true);
    } else if (shieldRing.isEnabled()) {
      shieldRing.setEnabled(false);
    }

    /** 生命再生 */
    if (eff.hpRegen > 0 && hp > 0) hp = Math.min(run.maxHp, hp + eff.hpRegen * dt);

    /** 受擊回饋：間歇火花 + 頭上飄出扣血數字 */
    hurtTimer -= dt;
    if (incoming > 0 && hurtTimer <= 0) {
      hurtTimer = 0.35;
      hurtBurst(scene, new Vector3(px, groundY + 1, pz));
      sound.hurt();
      if (dmgAccum >= 1) spawnText(scene, new Vector3(px, groundY + 2.4, pz), `-${Math.round(dmgAccum)}`, '#ff1818', 3);
      dmgAccum = 0;
    }

    if (hp <= 0) {
      hp = 0;
      goldEarned = Math.floor((kills * 0.6 + time) * goldMul);
      state = 'dead';
      sound.playerDeath();
      pushStats();
      const score = isDM ? deathmatchScore(wave, kills, time) : 0;
      options.onGameOver?.({ gold: goldEarned, kills, time, level, won: false, cheated, mode, wave, score });
    }

    time += dt;
  }

  let throttle = 0;
  engine.runRenderLoop(() => {
    const dt = Math.min(engine.getDeltaTime() / 1000, 0.05);
    if (state === 'running') gameplay(dt);
    scene.render();

    throttle += dt;
    if (throttle >= 0.1) {
      throttle = 0;
      pushStats();
    }
  });

  const onResize = () => engine.resize();
  window.addEventListener('resize', onResize);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') togglePause();
    else if (e.key === ' ' || e.code === 'Space') {
      e.preventDefault();
      requestJump();
    }
  };
  window.addEventListener('keydown', onKeyDown);

  /** ===== Debug 可調參數 ===== */
  interface DebugParam {
    label: string;
    group: string;
    type: 'range' | 'bool';
    min: number;
    max: number;
    step: number;
    get: () => number;
    set: (v: number) => void;
  }
  const cfgParam = (
    group: string,
    label: string,
    min: number,
    max: number,
    step: number,
    get: () => number,
    set: (v: number) => void,
  ): DebugParam => ({ group, label, type: 'range', min, max, step, get, set });
  const boolParam = (group: string, label: string, get: () => boolean, set: (v: boolean) => void): DebugParam => ({
    group,
    label,
    type: 'bool',
    min: 0,
    max: 1,
    step: 1,
    get: () => (get() ? 1 : 0),
    set: (v) => set(v > 0.5),
  });

  const debugSpec: DebugParam[] = [
    boolParam('玩家', '無敵', () => invincible, (v) => (invincible = v)),
    boolParam('玩家', 'EXP×10', () => xpDebug, (v) => (xpDebug = v)),
    cfgParam('玩家', '移動速度', 0, 40, 0.5, () => run.moveSpeed, (v) => (run.moveSpeed = v)),
    cfgParam('玩家', '生命上限', 10, 1000, 10, () => run.maxHp, (v) => (run.maxHp = v)),
    cfgParam('玩家', '接觸傷害/秒', 0, 100, 1, () => CONFIG.player.contactDps, (v) => (CONFIG.player.contactDps = v)),
    cfgParam('玩家', '跳躍力', 0, 20, 0.5, () => CONFIG.player.jump.strength, (v) => (CONFIG.player.jump.strength = v)),

    cfgParam('武器', '傷害', 1, 200, 1, () => run.damage, (v) => (run.damage = v)),
    cfgParam('武器', '發射間隔', 0.05, 2, 0.05, () => run.fireInterval, (v) => (run.fireInterval = v)),
    cfgParam('武器', '投射物數', 1, 20, 1, () => run.projectileCount, (v) => (run.projectileCount = v)),
    cfgParam('武器', '射程', 5, 120, 1, () => run.range, (v) => (run.range = v)),
    cfgParam('武器', '彈速', 5, 120, 1, () => run.projectileSpeed, (v) => (run.projectileSpeed = v)),

    cfgParam('額外武器', '環繞飛斧數', 0, 6, 1, () => run.orbitalCount, (v) => (run.orbitalCount = v)),
    cfgParam('額外武器', '飛斧傷害', 0, 100, 1, () => run.orbitalDamage, (v) => (run.orbitalDamage = v)),
    cfgParam('額外武器', '飛斧半徑', 1, 20, 0.5, () => run.orbitalRadius, (v) => (run.orbitalRadius = v)),
    cfgParam('額外武器', '光環半徑', 0, 30, 1, () => run.auraRadius, (v) => (run.auraRadius = v)),
    cfgParam('額外武器', '光環傷害', 0, 100, 1, () => run.auraDamage, (v) => (run.auraDamage = v)),
    cfgParam('額外武器', '閃電連鎖數', 0, 10, 1, () => run.lightningCount, (v) => (run.lightningCount = v)),
    cfgParam('額外武器', '閃電傷害', 0, 100, 1, () => run.lightningDamage, (v) => (run.lightningDamage = v)),
    cfgParam('額外武器', '新星半徑', 0, 30, 1, () => run.novaRadius, (v) => (run.novaRadius = v)),
    cfgParam('額外武器', '新星傷害', 0, 100, 1, () => run.novaDamage, (v) => (run.novaDamage = v)),
    cfgParam('額外武器', '回力鏢數', 0, 8, 1, () => run.boomerangCount, (v) => (run.boomerangCount = v)),
    cfgParam('額外武器', '回力鏢傷害', 0, 100, 1, () => run.boomerangDamage, (v) => (run.boomerangDamage = v)),
    cfgParam(
      '額外武器',
      '長矛大小',
      0.2,
      6,
      0.1,
      () => boomerangScale,
      (v) => {
        boomerangScale = v;
        extras.setBoomerangScale(v);
      },
    ),

    cfgParam('怪物', '數量上限', 0, 52, 1, () => CONFIG.director.maxCount, (v) => (CONFIG.director.maxCount = v)),
    cfgParam('怪物', '初始數量', 0, 52, 1, () => CONFIG.director.baseCount, (v) => (CONFIG.director.baseCount = v)),
    cfgParam('怪物', '每階增量', 0, 20, 1, () => CONFIG.director.addPerStep, (v) => (CONFIG.director.addPerStep = v)),
    cfgParam('怪物', '升壓間隔秒', 1, 30, 1, () => CONFIG.director.stepIntervalSec, (v) => (CONFIG.director.stepIntervalSec = v)),
    cfgParam('怪物', '分離力', 0, 30, 1, () => CONFIG.enemy.separationForce, (v) => (CONFIG.enemy.separationForce = v)),

    cfgParam('王/道具', '王間隔秒', 5, 120, 1, () => CONFIG.boss.intervalSec, (v) => (CONFIG.boss.intervalSec = v)),
    cfgParam('王/道具', '王基礎血', 50, 5000, 50, () => CONFIG.boss.hpBase, (v) => (CONFIG.boss.hpBase = v)),
    cfgParam('王/道具', '寶箱間隔ms', 2000, 60000, 1000, () => CONFIG.items.chestInterval, (v) => (CONFIG.items.chestInterval = v)),
    cfgParam('王/道具', '回血間隔ms', 2000, 60000, 1000, () => CONFIG.items.healInterval, (v) => (CONFIG.items.healInterval = v)),

    cfgParam('王招式', '彈幕傷害', 0, 100, 1, () => hazards.projDamage, (v) => (hazards.projDamage = v)),
    cfgParam('王招式', '震波傷害', 0, 100, 1, () => hazards.shockDamage, (v) => (hazards.shockDamage = v)),
    cfgParam('王招式', '毒池傷害/秒', 0, 100, 1, () => hazards.poisonDps, (v) => (hazards.poisonDps = v)),
  ];

  pushStats();

  return {
    dispose() {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onKeyDown);
      input.detach();
      sound.stopMusic();
      engine.dispose();
    },
    setJoystick(x: number, z: number) {
      input.setJoystick(x, z);
    },
    chooseUpgrade(index: number) {
      const upgrade = choices[index];
      if (!upgrade) return;
      upgrade.apply(run);
      levels[upgrade.id] = (levels[upgrade.id] ?? 0) + 1;
      /** 最大生命升級補滿，其餘升級回復 30% 最大生命 */
      if (upgrade.id === 'maxhp') hp = run.maxHp;
      else hp = Math.min(run.maxHp, hp + run.maxHp * 0.3);
      if (state === 'levelup') {
        /** 祝福／詛咒（暫停式）：選完恢復遊戲 */
        choices = [];
        state = 'running';
      } else {
        /** 一般升級（不暫停）：消化一次待選，還有就補下一組 */
        pendingLevelUps = Math.max(0, pendingLevelUps - 1);
        choices = pendingLevelUps > 0 ? rollChoices(levels, 3, isDM) : [];
      }
      pushStats();
    },
    restart() {
      run = { ...runTemplate };
      levels = {};
      level = 1;
      xp = 0;
      xpToNext = xpForLevel(level);
      hp = run.maxHp;
      kills = 0;
      time = 0;
      goldEarned = 0;
      hurtTimer = 0;
      choices = [];
      pendingLevelUps = 0;
      state = 'running';
      vy = 0;
      jumpY = 0;
      grounded = true;
      jumpRequested = false;
      shieldReady = false;
      shieldTimer = 0;
      shieldRing.setEnabled(false);
      slowField.setEnabled(false);
      playerMoving = false;
      playerWalk?.stop();
      playerIdle?.start(true);
      player.position.set(0, heightAt(0, 0), 0);
      enemies.reset(0, 0);
      gems.reset();
      weapon.reset();
      extras.reset();
      boss.reset();
      hazards.reset();
      bloodDecals.reset();
      bossTimer = 0;
      bossCount = 0;
      bossDefeated = 0;
      /** 死鬥狀態重置 */
      wave = 0;
      lastWave = 0;
      combo = 0;
      bossRush = 0;
      curMutator = null;
      waveCardText = '';
      waveCardUntil = 0;
      bloodTideUntil = 0;
      bloodTideActive = false;
      scene.clearColor = baseClear;
      activeBuffs.length = 0;
      for (const it of itemList) it.node.dispose();
      itemList.length = 0;
      chestTimer = 0;
      healTimer = 0;
      pushStats();
    },
    togglePause() {
      togglePause();
    },
    jump() {
      requestJump();
    },
    setXpDebug(on: boolean) {
      xpDebug = on;
      if (on) cheated = true;
    },
    markCheated() {
      cheated = true;
    },
    setMuted(on: boolean) {
      sound.setMuted(on);
    },
    setMusicTrack(i: number) {
      musicTrackIdx = i;
      sound.setMusicTrack(i);
    },
    setQuality(id: QualityId) {
      const q = getQuality(id);
      engine.setHardwareScalingLevel(q.hardwareScaling);
      glow.intensity = q.glow;
      glow.isEnabled = q.glow > 0;
      scene.fogEnd = q.fogEnd;
      /** 抗鋸齒需重建 Engine 才能改，於下次開局生效 */
    },
    getDebugParams() {
      return debugSpec.map((p) => ({
        label: p.label,
        group: p.group,
        type: p.type,
        min: p.min,
        max: p.max,
        step: p.step,
        value: p.get(),
      }));
    },
    setDebugParam(index: number, value: number) {
      debugSpec[index]?.set(value);
      cheated = true;
    },
    getUpgradeStatus() {
      return UPGRADES.map((u) => ({
        name: u.name,
        icon: u.icon,
        level: levels[u.id] ?? 0,
        maxLevel: u.maxLevel,
      }));
    },
    getBossNames() {
      return BOSS_INFO.map((b) => b.name);
    },
    summonBoss(index: number) {
      if (index < 0 || index >= BOSS_COUNT) return;
      boss.spawn(index, player.position.x, player.position.z);
      bossTimer = 0;
      cheated = true;
    },
  };
}

/** 角度插值（處理 ±π 環繞），用於平滑轉向 */
function lerpAngle(current: number, target: number, t: number): number {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * t;
}

/** 寶箱：金色發光箱 */
function createChestMesh(scene: Scene): Mesh {
  const box = MeshBuilder.CreateBox('chest', { width: 1.2, height: 0.9, depth: 0.9 }, scene);
  const m = new StandardMaterial('chest-mat', scene);
  m.diffuseColor = new Color3(0.9, 0.7, 0.2);
  m.emissiveColor = new Color3(0.5, 0.35, 0.05);
  m.specularColor = Color3.Black();
  box.material = m;
  box.isPickable = false;
  return box;
}

/** 回血：綠色十字（醫療包） */
function createHealMesh(scene: Scene): Mesh {
  const mat = new StandardMaterial('heal-mat', scene);
  mat.diffuseColor = new Color3(0.2, 0.85, 0.4);
  mat.emissiveColor = new Color3(0.15, 0.7, 0.3);
  mat.specularColor = Color3.Black();
  const v = MeshBuilder.CreateBox('heal', { width: 0.36, height: 1, depth: 0.36 }, scene);
  v.material = mat;
  v.isPickable = false;
  const h = MeshBuilder.CreateBox('heal-cross', { width: 1, height: 0.36, depth: 0.36 }, scene);
  h.parent = v;
  h.material = mat;
  h.isPickable = false;
  return v;
}

/**
 * 散布殭屍城鎮道具（油桶、貨櫃、三角錐、水塔），提供移動參考與氛圍。
 * solid 者登記為障礙物（半徑），阻擋玩家與怪物；三角錐為純裝飾。
 */
async function scatterProps(scene: Scene, obstacles: Obstacle[], heightAt: (x: number, z: number) => number) {
  const half = CONFIG.arenaHalf;
  const props: { path: string; height: number; count: number; solid?: number }[] = [
    { path: '/models/zombie/barrel.glb', height: 2.2, count: 10, solid: 1 },
    { path: '/models/zombie/container.glb', height: 4, count: 4, solid: 2.8 },
    { path: '/models/zombie/prop_container_red.glb', height: 4, count: 3, solid: 2.8 },
    { path: '/models/zombie/cone.glb', height: 1.5, count: 10 },
    { path: '/models/zombie/watertower.glb', height: 10, count: 2, solid: 2.2 },
    { path: '/models/zombie/prop_truck.glb', height: 4.5, count: 3, solid: 4 },
    { path: '/models/zombie/prop_couch.glb', height: 1.8, count: 5, solid: 2 },
    { path: '/models/zombie/prop_hydrant.glb', height: 1.8, count: 6, solid: 0.8 },
    { path: '/models/zombie/prop_barrier.glb', height: 1.6, count: 7, solid: 1.5 },
    { path: '/models/zombie/prop_wheels.glb', height: 1.6, count: 5, solid: 1 },
    { path: '/models/zombie/prop_pallet.glb', height: 0.9, count: 8 },
    { path: '/models/zombie/prop_trashbag.glb', height: 1.4, count: 10 },
    { path: '/models/zombie/prop_cinderblock.glb', height: 0.9, count: 8 },
  ];

  for (const p of props) {
    const base = await loadModel(scene, p.path, p.height);
    if (!base) continue;
    const place = (node: { position: { x: number; y: number; z: number }; rotation: { y: number } }) => {
      let x = 0;
      let z = 0;
      /** 避開玩家出生點（半徑 10 內）重試幾次 */
      for (let tries = 0; tries < 8; tries++) {
        x = (Math.random() * 2 - 1) * half;
        z = (Math.random() * 2 - 1) * half;
        if (x * x + z * z > 100) break;
      }
      node.position.x = x;
      node.position.z = z;
      node.position.y = heightAt(x, z);
      node.rotation.y = Math.random() * Math.PI * 2;
      if (p.solid) obstacles.push({ x, z, radius: p.solid });
    };
    place(base);
    for (let i = 1; i < p.count; i++) {
      const clone = base.clone(`${p.path}-${i}`, null);
      if (clone) place(clone);
    }
  }
}
