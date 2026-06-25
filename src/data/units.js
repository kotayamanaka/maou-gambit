const goblinSpriteSet = {
  idle: {
    front: 'assets/sprites/goblin/idle-front.png',
    back: 'assets/sprites/goblin/idle-back.png',
    left: 'assets/sprites/goblin/idle-left.png',
    right: 'assets/sprites/goblin/idle-right.png'
  },
  walk: {
    front: 'assets/sprites/goblin/walk-front.png',
    back: 'assets/sprites/goblin/walk-back.png',
    left: 'assets/sprites/goblin/walk-left.png',
    right: 'assets/sprites/goblin/walk-right.png'
  },
  attack: {
    front: 'assets/sprites/goblin/attack-front.png',
    back: 'assets/sprites/goblin/attack-back.png',
    left: 'assets/sprites/goblin/attack-left.png',
    right: 'assets/sprites/goblin/attack-right.png'
  },
  downed: {
    front: 'assets/sprites/goblin/downed.png',
    back: 'assets/sprites/goblin/downed-back.png',
    left: 'assets/sprites/goblin/downed-left.png',
    right: 'assets/sprites/goblin/downed-right.png'
  }
};

export const allyTemplates = {
  goblin: {
    id: 'goblin',
    name: 'ゴブリン',
    type: 'ally',
    role: 'balanced',
    sprite: 'assets/sprites/goblin/idle-front.png',
    spriteSet: goblinSpriteSet,
    stats: { hp: 48, atk: 9, spd: 1.0, int: 3, carry: 1, range: 1 },
    rarity: 'starter',
    skills: ['hasteOnHit'],
    traits: ['運搬可', '初期主力']
  },
  slime: {
    id: 'slime',
    name: 'スライム',
    type: 'ally',
    role: 'tank',
    sprite: 'assets/sprites/slime.png',
    stats: { hp: 68, atk: 5, spd: 0.65, int: 1, carry: 1, range: 1 },
    rarity: 'common',
    skills: ['slowTouch'],
    traits: ['運搬可', '鈍足付与']
  },
  poisonSlime: {
    id: 'poisonSlime',
    name: 'ポイズンスライム',
    type: 'ally',
    role: 'debuffer',
    sprite: 'assets/sprites/slime.png',
    stats: { hp: 60, atk: 4, spd: 0.62, int: 2, carry: 1, range: 1 },
    rarity: 'uncommon',
    skills: ['poisonTouch'],
    traits: ['運搬可', '毒付与', 'スライム亜種']
  },
  darkSlime: {
    id: 'darkSlime',
    name: 'ダークスライム',
    type: 'ally',
    role: 'bruiser',
    sprite: 'assets/sprites/slime.png',
    stats: { hp: 74, atk: 7, spd: 0.58, int: 2, carry: 1, range: 1 },
    rarity: 'rare',
    skills: ['poisonTouch', 'slowTouch'],
    traits: ['運搬可', '毒付与', '鈍足付与', 'スライム亜種']
  },
  bat: {
    id: 'bat',
    name: 'コウモリ',
    type: 'ally',
    role: 'scout',
    sprite: 'assets/sprites/bat.png',
    stats: { hp: 42, atk: 7, spd: 1.85, int: 1, carry: 0, range: 1 },
    rarity: 'common',
    skills: ['hasteOnHit'],
    traits: ['高速', '運搬不可']
  },
  fallenWarrior: {
    id: 'fallenWarrior',
    name: '堕ちた戦士',
    type: 'ally',
    role: 'bruiser',
    sprite: 'assets/sprites/fallen-warrior.png',
    stats: { hp: 54, atk: 8, spd: 0.75, int: 1, carry: 0, range: 1 },
    rarity: 'common',
    traits: ['高耐久']
  },
  shadeRunner: {
    id: 'shadeRunner',
    name: '影走り',
    type: 'ally',
    role: 'hunter',
    sprite: 'assets/sprites/shade-runner.png',
    stats: { hp: 26, atk: 5, spd: 1.7, int: 2, carry: 1, range: 1 },
    rarity: 'uncommon',
    traits: ['高速', '捕獲補助']
  },
  darkMage: {
    id: 'darkMage',
    name: '闇術師',
    type: 'ally',
    role: 'caster',
    sprite: 'assets/sprites/dark-mage.png',
    stats: { hp: 24, atk: 6, spd: 0.75, int: 2, carry: 0, range: 3 },
    rarity: 'uncommon',
    skills: ['poisonTouch'],
    traits: ['遠距離']
  },
  boneGuard: {
    id: 'boneGuard',
    name: '骨衛兵',
    type: 'ally',
    role: 'guard',
    sprite: 'assets/sprites/fallen-warrior.png',
    stats: { hp: 62, atk: 7, spd: 0.58, int: 1, carry: 0, range: 1 },
    rarity: 'common',
    skills: ['slowTouch'],
    traits: ['高耐久', '足止め']
  },
  goblinChief: {
    id: 'goblinChief',
    name: 'ゴブリン隊長',
    type: 'ally',
    role: 'commander',
    sprite: 'assets/sprites/goblin/idle-front.png',
    spriteSet: goblinSpriteSet,
    stats: { hp: 58, atk: 10, spd: 1.05, int: 3, carry: 1, range: 1 },
    rarity: 'rare',
    traits: ['運搬可', '多チップ']
  },
  plagueSlime: {
    id: 'plagueSlime',
    name: '瘴気スライム',
    type: 'ally',
    role: 'tank',
    sprite: 'assets/sprites/slime.png',
    stats: { hp: 86, atk: 6, spd: 0.5, int: 1, carry: 1, range: 1 },
    rarity: 'rare',
    skills: ['poisonTouch', 'slowTouch'],
    traits: ['高HP', '運搬可']
  },
  impArcher: {
    id: 'impArcher',
    name: '小悪魔射手',
    type: 'ally',
    role: 'ranged',
    sprite: 'assets/sprites/bat.png',
    stats: { hp: 34, atk: 7, spd: 1.35, int: 2, carry: 0, range: 3 },
    rarity: 'uncommon',
    traits: ['遠距離', '高速']
  },
  oracleShade: {
    id: 'oracleShade',
    name: '影託者',
    type: 'ally',
    role: 'tactician',
    sprite: 'assets/sprites/dark-mage.png',
    stats: { hp: 30, atk: 5, spd: 0.95, int: 4, carry: 0, range: 2 },
    rarity: 'epic',
    skills: ['inspireOnHit'],
    traits: ['高INT', '支援向き']
  }
};

export const enemyTemplates = {
  warrior: {
    id: 'warrior',
    name: '戦士',
    type: 'enemy',
    sprite: 'assets/sprites/warrior.png',
    stats: { hp: 34, atk: 5, spd: 0.72, range: 1 },
    chips: ['engageGuard', 'exploreUnknown', 'seekThrone'],
    convertTo: 'fallenWarrior',
    capture: { difficulty: 1, ttl: 12 },
    drop: { gold: 16, items: ['rustyBlade'] }
  },
  rogue: {
    id: 'rogue',
    name: '盗賊',
    type: 'enemy',
    sprite: 'assets/sprites/rogue.png',
    stats: { hp: 22, atk: 3, spd: 1.2, range: 1 },
    skills: ['hasteOnHit'],
    chips: ['engageGuard', 'exploreUnknown', 'seekThrone'],
    convertTo: 'shadeRunner',
    capture: { difficulty: 2, ttl: 10 },
    drop: { gold: 20, items: ['scoutBoots'] }
  },
  mage: {
    id: 'mage',
    name: '魔法使い',
    type: 'enemy',
    sprite: 'assets/sprites/mage.png',
    stats: { hp: 20, atk: 4, spd: 0.62, range: 3 },
    skills: ['poisonTouch'],
    chips: ['focusWeakAlly', 'exploreUnknown', 'seekThrone'],
    convertTo: 'darkMage',
    capture: { difficulty: 2, ttl: 10 },
    drop: { gold: 24, items: ['manaDust'] }
  },
  guard: {
    id: 'guard',
    name: '盾兵',
    type: 'enemy',
    sprite: 'assets/sprites/warrior.png',
    stats: { hp: 48, atk: 4, spd: 0.55, range: 1 },
    skills: ['slowTouch'],
    chips: ['engageGuard', 'exploreUnknown', 'seekThrone'],
    convertTo: 'boneGuard',
    capture: { difficulty: 1, ttl: 14 },
    drop: { gold: 18, items: ['silverChain'] }
  },
  ranger: {
    id: 'ranger',
    name: '弓兵',
    type: 'enemy',
    sprite: 'assets/sprites/rogue.png',
    stats: { hp: 24, atk: 4, spd: 0.92, range: 3 },
    chips: ['focusWeakAlly', 'exploreUnknown', 'seekThrone'],
    convertTo: 'impArcher',
    capture: { difficulty: 2, ttl: 10 },
    drop: { gold: 23, items: ['scoutBoots'] }
  },
  cleric: {
    id: 'cleric',
    name: '僧侶',
    type: 'enemy',
    sprite: 'assets/sprites/mage.png',
    stats: { hp: 26, atk: 3, spd: 0.7, range: 2 },
    chips: ['focusWeakAlly', 'exploreUnknown', 'seekThrone'],
    convertTo: 'oracleShade',
    capture: { difficulty: 3, ttl: 9 },
    drop: { gold: 26, items: ['manaDust', 'sageInk'] }
  },
  knight: {
    id: 'knight',
    name: '騎士',
    type: 'enemy',
    sprite: 'assets/sprites/warrior.png',
    stats: { hp: 58, atk: 7, spd: 0.75, range: 1 },
    chips: ['engageGuard', 'exploreUnknown', 'seekThrone'],
    convertTo: 'fallenWarrior',
    capture: { difficulty: 3, ttl: 9 },
    drop: { gold: 34, items: ['rustyBlade', 'silverChain'] }
  },
  alchemist: {
    id: 'alchemist',
    name: '錬金術師',
    type: 'enemy',
    sprite: 'assets/sprites/mage.png',
    stats: { hp: 28, atk: 5, spd: 0.68, range: 3 },
    skills: ['poisonTouch'],
    chips: ['focusWeakAlly', 'exploreUnknown', 'seekThrone'],
    convertTo: 'darkMage',
    capture: { difficulty: 3, ttl: 8 },
    drop: { gold: 38, items: ['manaDust', 'roomStone'] }
  },
  beastTamer: {
    id: 'beastTamer',
    name: '獣使い',
    type: 'enemy',
    sprite: 'assets/sprites/rogue.png',
    stats: { hp: 36, atk: 6, spd: 1.05, range: 1 },
    skills: ['inspireOnHit'],
    chips: ['engageGuard', 'exploreUnknown', 'seekThrone'],
    convertTo: 'goblinChief',
    capture: { difficulty: 3, ttl: 9 },
    drop: { gold: 36, items: ['scoutBoots'] }
  },
  paladin: {
    id: 'paladin',
    name: '聖騎士',
    type: 'enemy',
    sprite: 'assets/sprites/warrior.png',
    stats: { hp: 72, atk: 8, spd: 0.68, range: 1 },
    skills: ['slowTouch'],
    chips: ['engageGuard', 'exploreUnknown', 'seekThrone'],
    convertTo: 'boneGuard',
    capture: { difficulty: 4, ttl: 8 },
    drop: { gold: 48, items: ['silverChain', 'sageInk'] }
  },
  sage: {
    id: 'sage',
    name: '賢者',
    type: 'enemy',
    sprite: 'assets/sprites/mage.png',
    stats: { hp: 34, atk: 7, spd: 0.62, range: 4 },
    skills: ['poisonTouch', 'inspireOnHit'],
    chips: ['focusWeakAlly', 'exploreUnknown', 'seekThrone'],
    convertTo: 'oracleShade',
    capture: { difficulty: 5, ttl: 7 },
    drop: { gold: 55, items: ['sageInk', 'manaDust'] }
  },
  hero: {
    id: 'hero',
    name: '勇者',
    type: 'enemy',
    sprite: 'assets/sprites/warrior.png',
    stats: { hp: 96, atk: 10, spd: 0.9, range: 1 },
    skills: ['hasteOnHit', 'inspireOnHit'],
    chips: ['engageGuard', 'focusWeakAlly', 'exploreUnknown', 'seekThrone'],
    convertTo: 'goblinChief',
    capture: { difficulty: 6, ttl: 6 },
    drop: { gold: 90, items: ['rustyBlade', 'sageInk', 'roomStone'] }
  }
};

export const demonLord = {
  id: 'demonLord',
  name: '魔王',
  type: 'boss',
  sprite: 'assets/sprites/demon-lord.png',
  stats: { hp: 100, atk: 0, spd: 0, int: 0, carry: 0, range: 0 }
};
